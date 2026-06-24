begin;

create schema if not exists "user";
create schema if not exists run_walk;

alter table if exists "user".weekly_summary
  add column if not exists total_distance_biked_m numeric(14, 2) not null default 0,
  add column if not exists total_distance_ran_m numeric(14, 2) not null default 0,
  add column if not exists total_distance_walked_m numeric(14, 2) not null default 0,
  add column if not exists total_distance_run_walk_m numeric(14, 2) not null default 0;

alter table if exists "user".lifetime_stats
  add column if not exists total_distance_biked_m numeric(14, 2) not null default 0,
  add column if not exists total_distance_ran_m numeric(14, 2) not null default 0,
  add column if not exists total_distance_walked_m numeric(14, 2) not null default 0,
  add column if not exists total_distance_run_walk_m numeric(14, 2) not null default 0;

alter table if exists run_walk.samples
  add column if not exists cadence_rpm numeric(8, 2);

do $$
declare
  v_udt_schema text;
  v_udt_name text;
  v_has_enum boolean := false;
  v_replaced_constraint boolean := false;
  v_constraint record;
begin
  select c.udt_schema, c.udt_name
  into v_udt_schema, v_udt_name
  from information_schema.columns c
  where c.table_schema = 'run_walk'
    and c.table_name = 'sessions'
    and c.column_name = 'exercise_type';

  if v_udt_name is null then
    return;
  end if;

  select exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = v_udt_schema
      and t.typname = v_udt_name
      and t.typtype = 'e'
  )
  into v_has_enum;

  if v_has_enum then
    if not exists (
      select 1
      from pg_enum e
      join pg_type t on t.oid = e.enumtypid
      join pg_namespace n on n.oid = t.typnamespace
      where n.nspname = v_udt_schema
        and t.typname = v_udt_name
        and e.enumlabel = 'indoor_cycle'
    ) then
      execute format('alter type %I.%I add value %L', v_udt_schema, v_udt_name, 'indoor_cycle');
    end if;
  else
    for v_constraint in
      select con.conname
      from pg_constraint con
      join pg_class rel on rel.oid = con.conrelid
      join pg_namespace nsp on nsp.oid = rel.relnamespace
      where nsp.nspname = 'run_walk'
        and rel.relname = 'sessions'
        and con.contype = 'c'
        and pg_get_constraintdef(con.oid) ilike '%exercise_type%'
        and pg_get_constraintdef(con.oid) not ilike '%indoor_cycle%'
    loop
      execute format('alter table run_walk.sessions drop constraint %I', v_constraint.conname);
      v_replaced_constraint := true;
    end loop;

    if v_replaced_constraint and not exists (
      select 1
      from pg_constraint con
      join pg_class rel on rel.oid = con.conrelid
      join pg_namespace nsp on nsp.oid = rel.relnamespace
      where nsp.nspname = 'run_walk'
        and rel.relname = 'sessions'
        and con.conname = 'run_walk_sessions_exercise_type_check'
    ) then
      alter table run_walk.sessions
        add constraint run_walk_sessions_exercise_type_check
        check (
          lower(exercise_type::text) in (
            'run',
            'walk',
            'indoor_run',
            'indoor_walk',
            'indoor_cycle'
          )
        );
    end if;
  end if;
end;
$$;

create or replace function "user".apply_indoor_run_walk_stats_delta(
  p_user_id uuid,
  p_ended_at timestamptz,
  p_timezone_str text,
  p_exercise_type text,
  p_total_time_s integer,
  p_total_distance_m numeric,
  p_total_elevation_m numeric,
  p_direction integer
)
returns void
language plpgsql
security definer
set search_path = public, "user", run_walk
as $$
declare
  v_type text := lower(coalesce(p_exercise_type, ''));
  v_is_run boolean := v_type in ('indoor_run', 'run');
  v_is_walk boolean := v_type in ('indoor_walk', 'walk');
  v_is_cycle boolean := v_type in ('indoor_cycle', 'ride', 'bike', 'cycle', 'cycling');
  v_is_indoor boolean := v_is_run or v_is_walk or v_is_cycle;

  v_tz text := nullif(trim(coalesce(p_timezone_str, '')), '');
  v_anchor timestamptz := coalesce(p_ended_at, timezone('utc', now()));
  v_local_day date;
  v_week_start date;

  v_workouts_delta integer := case when p_direction < 0 then -1 else 1 end;
  v_dir numeric := case when p_direction < 0 then -1 else 1 end;

  v_hours_delta numeric := (coalesce(p_total_time_s, 0)::numeric / 3600.0) * v_dir;
  v_dist_m_delta numeric := coalesce(p_total_distance_m, 0)::numeric * v_dir;
  v_elev_m_delta numeric := coalesce(p_total_elevation_m, 0)::numeric * v_dir;

  v_dist_ran_m_delta numeric := 0;
  v_dist_walked_m_delta numeric := 0;
  v_dist_biked_m_delta numeric := 0;
  v_dist_run_walk_m_delta numeric := 0;
begin
  if p_user_id is null then
    return;
  end if;

  if not "user".auth_user_exists(p_user_id) then
    return;
  end if;

  if not v_is_indoor then
    return;
  end if;

  if v_tz is null then
    v_tz := 'UTC';
  end if;

  v_local_day := (v_anchor at time zone v_tz)::date;
  v_week_start := v_local_day - ((extract(dow from v_local_day)::int + 6) % 7);

  if v_is_run then
    v_dist_ran_m_delta := v_dist_m_delta;
  end if;

  if v_is_walk then
    v_dist_walked_m_delta := v_dist_m_delta;
  end if;

  if v_is_cycle then
    v_dist_biked_m_delta := v_dist_m_delta;
  end if;

  if v_is_run or v_is_walk then
    v_dist_run_walk_m_delta := v_dist_m_delta;
  end if;

  insert into "user".weekly_summary (user_id, week_start, timezone_str)
  values (p_user_id, v_week_start, v_tz)
  on conflict (user_id, week_start) do update
  set timezone_str = coalesce(excluded.timezone_str, "user".weekly_summary.timezone_str);

  update "user".weekly_summary
  set workouts_count = greatest(0, coalesce(workouts_count, 0) + v_workouts_delta),
      total_hours = greatest(0, coalesce(total_hours, 0) + v_hours_delta),
      total_distance_ran_m = greatest(0, coalesce(total_distance_ran_m, 0) + v_dist_ran_m_delta),
      total_distance_walked_m = greatest(0, coalesce(total_distance_walked_m, 0) + v_dist_walked_m_delta),
      total_distance_biked_m = greatest(0, coalesce(total_distance_biked_m, 0) + v_dist_biked_m_delta),
      total_distance_run_walk_m = greatest(0, coalesce(total_distance_run_walk_m, 0) + v_dist_run_walk_m_delta),
      total_elev_gain_m = greatest(0, coalesce(total_elev_gain_m, 0) + v_elev_m_delta)
  where user_id = p_user_id
    and week_start = v_week_start;

  insert into "user".lifetime_stats (user_id, timezone_str)
  values (p_user_id, v_tz)
  on conflict (user_id) do update
  set timezone_str = coalesce(excluded.timezone_str, "user".lifetime_stats.timezone_str);

  update "user".lifetime_stats
  set workouts_count = greatest(0, coalesce(workouts_count, 0) + v_workouts_delta),
      total_hours = greatest(0, coalesce(total_hours, 0) + v_hours_delta),
      total_elev_gain_m = greatest(0, coalesce(total_elev_gain_m, 0) + v_elev_m_delta),
      total_distance_ran_m = greatest(0, coalesce(total_distance_ran_m, 0) + v_dist_ran_m_delta),
      total_distance_walked_m = greatest(0, coalesce(total_distance_walked_m, 0) + v_dist_walked_m_delta),
      total_distance_biked_m = greatest(0, coalesce(total_distance_biked_m, 0) + v_dist_biked_m_delta),
      total_distance_run_walk_m = greatest(0, coalesce(total_distance_run_walk_m, 0) + v_dist_run_walk_m_delta)
  where user_id = p_user_id;
end;
$$;

create or replace function public.get_run_walk_session_summary_user(
  p_session_id uuid,
  p_post_id uuid default null
)
returns table (
  session_id uuid,
  owner_id uuid,
  exercise_type text,
  started_at timestamptz,
  ended_at timestamptz,
  total_time_s integer,
  total_distance_m double precision,
  total_elevation_m double precision,
  avg_pace_s_per_mi double precision,
  avg_pace_s_per_km double precision,
  samples jsonb,
  can_delete boolean
)
language plpgsql
security definer
set search_path = public, social, run_walk
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if p_session_id is null then
    raise exception 'Session ID is required';
  end if;

  if not exists (
    select 1
    from run_walk.sessions s
    where s.id = p_session_id
  ) then
    raise exception 'Session not found';
  end if;

  if not exists (
    select 1
    from run_walk.sessions s
    left join lateral (
      select coalesce(
        (
          select p.visibility
          from social.posts p
          where p_post_id is not null
            and p.id = p_post_id
            and p.user_id = s.user_id
            and p.session_id = s.id
          limit 1
        ),
        (
          select p.visibility
          from social.posts p
          where p.user_id = s.user_id
            and p.session_id = s.id
            and p.activity_type in ('run', 'walk', 'ride')
          order by p.created_at desc
          limit 1
        )
      ) as visibility
    ) pv on true
    where s.id = p_session_id
      and (
        s.user_id = auth.uid()
        or (
          pv.visibility is not null
          and social.can_view_post(auth.uid(), s.user_id, pv.visibility)
        )
      )
  ) then
    raise exception 'Not allowed';
  end if;

  return query
  select
    s.id::uuid as session_id,
    s.user_id::uuid as owner_id,
    s.exercise_type::text as exercise_type,
    s.started_at::timestamptz as started_at,
    s.ended_at::timestamptz as ended_at,
    coalesce(s.total_time_s, 0)::integer as total_time_s,
    coalesce(s.total_distance_m, 0)::double precision as total_distance_m,
    coalesce(s.total_elevation_m, 0)::double precision as total_elevation_m,
    s.avg_pace_s_per_mi::double precision as avg_pace_s_per_mi,
    s.avg_pace_s_per_km::double precision as avg_pace_s_per_km,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'elapsed_s', sm.elapsed_s,
            'pace_s_per_mi', sm.pace_s_per_mi,
            'pace_s_per_km', sm.pace_s_per_km,
            'speed_mps', sm.speed_mps,
            'cadence_rpm', sm.cadence_rpm,
            'elevation_m', sm.elevation_m,
            'incline_deg', sm.incline_deg
          )
          order by sm.elapsed_s
        )
        from run_walk.samples sm
        where sm.session_id = p_session_id
      ),
      '[]'::jsonb
    )::jsonb as samples,
    (s.user_id = auth.uid())::boolean as can_delete
  from run_walk.sessions s
  where s.id = p_session_id
  limit 1;
end;
$$;

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'schema_change_log'
  ) then
    insert into public.schema_change_log (change_key, description)
    values (
      '20260623_indoor_cycle_support',
      'Added indoor cycling compatibility for run_walk.sessions, persisted cadence samples for saved indoor rides, and rolled indoor cycling distance into bike totals in weekly and lifetime user stats.'
    )
    on conflict (change_key) do nothing;
  end if;
end;
$$;

commit;
