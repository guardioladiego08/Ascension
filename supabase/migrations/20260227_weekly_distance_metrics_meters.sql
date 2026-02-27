-- Normalize weekly_summary distance metrics to meters.
-- Keeps legacy mile columns for backward compatibility while writing canonical values in meters.

begin;

create schema if not exists "user";
create schema if not exists run_walk;

alter table if exists "user".weekly_summary
  add column if not exists total_distance_biked_m numeric(14, 2) not null default 0,
  add column if not exists total_distance_ran_m numeric(14, 2) not null default 0,
  add column if not exists total_distance_walked_m numeric(14, 2) not null default 0,
  add column if not exists total_distance_run_walk_m numeric(14, 2) not null default 0;

alter table if exists "user".lifetime_stats
  add column if not exists total_distance_walked_m numeric(14, 2) not null default 0,
  add column if not exists total_distance_run_walk_m numeric(14, 2) not null default 0;

do $$
declare
  v_has_miles_biked boolean := false;
  v_has_miles_ran boolean := false;
  v_has_miles_walked boolean := false;
  v_has_miles_run_walk boolean := false;
begin
  select exists (
    select 1 from information_schema.columns
    where table_schema = 'user'
      and table_name = 'weekly_summary'
      and column_name = 'total_miles_biked'
  ) into v_has_miles_biked;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'user'
      and table_name = 'weekly_summary'
      and column_name = 'total_miles_ran'
  ) into v_has_miles_ran;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'user'
      and table_name = 'weekly_summary'
      and column_name = 'total_miles_walked'
  ) into v_has_miles_walked;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'user'
      and table_name = 'weekly_summary'
      and column_name = 'total_miles_run_walk'
  ) into v_has_miles_run_walk;

  if v_has_miles_biked then
    execute '
      update "user".weekly_summary
      set total_distance_biked_m = round((coalesce(total_miles_biked, 0)::numeric * 1609.344), 2)
      where coalesce(total_distance_biked_m, 0) = 0
        and coalesce(total_miles_biked, 0) <> 0
    ';
  end if;

  if v_has_miles_ran then
    execute '
      update "user".weekly_summary
      set total_distance_ran_m = round((coalesce(total_miles_ran, 0)::numeric * 1609.344), 2)
      where coalesce(total_distance_ran_m, 0) = 0
        and coalesce(total_miles_ran, 0) <> 0
    ';
  end if;

  if v_has_miles_walked then
    execute '
      update "user".weekly_summary
      set total_distance_walked_m = round((coalesce(total_miles_walked, 0)::numeric * 1609.344), 2)
      where coalesce(total_distance_walked_m, 0) = 0
        and coalesce(total_miles_walked, 0) <> 0
    ';
  end if;

  if v_has_miles_run_walk and v_has_miles_ran and v_has_miles_walked then
    execute '
      update "user".weekly_summary
      set total_distance_run_walk_m = round(
        (
          coalesce(
            nullif(total_miles_run_walk, 0),
            coalesce(total_miles_ran, 0) + coalesce(total_miles_walked, 0)
          )::numeric * 1609.344
        ),
        2
      )
      where coalesce(total_distance_run_walk_m, 0) = 0
        and (
          coalesce(total_miles_run_walk, 0) <> 0
          or coalesce(total_miles_ran, 0) <> 0
          or coalesce(total_miles_walked, 0) <> 0
        )
    ';
  elsif v_has_miles_run_walk then
    execute '
      update "user".weekly_summary
      set total_distance_run_walk_m = round((coalesce(total_miles_run_walk, 0)::numeric * 1609.344), 2)
      where coalesce(total_distance_run_walk_m, 0) = 0
        and coalesce(total_miles_run_walk, 0) <> 0
    ';
  elsif v_has_miles_ran and v_has_miles_walked then
    execute '
      update "user".weekly_summary
      set total_distance_run_walk_m = round(
        ((coalesce(total_miles_ran, 0) + coalesce(total_miles_walked, 0))::numeric * 1609.344),
        2
      )
      where coalesce(total_distance_run_walk_m, 0) = 0
        and (coalesce(total_miles_ran, 0) <> 0 or coalesce(total_miles_walked, 0) <> 0)
    ';
  elsif v_has_miles_ran then
    execute '
      update "user".weekly_summary
      set total_distance_run_walk_m = round((coalesce(total_miles_ran, 0)::numeric * 1609.344), 2)
      where coalesce(total_distance_run_walk_m, 0) = 0
        and coalesce(total_miles_ran, 0) <> 0
    ';
  elsif v_has_miles_walked then
    execute '
      update "user".weekly_summary
      set total_distance_run_walk_m = round((coalesce(total_miles_walked, 0)::numeric * 1609.344), 2)
      where coalesce(total_distance_run_walk_m, 0) = 0
        and coalesce(total_miles_walked, 0) <> 0
    ';
  end if;
end;
$$;

update "user".lifetime_stats
set total_distance_run_walk_m = coalesce(total_distance_ran_m, 0)
where coalesce(total_distance_run_walk_m, 0) = 0
  and coalesce(total_distance_ran_m, 0) <> 0;

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
  v_is_indoor boolean := v_type in ('indoor_run', 'indoor_walk', 'run', 'walk');
  v_is_run boolean := v_type in ('indoor_run', 'run');
  v_is_walk boolean := v_type in ('indoor_walk', 'walk');

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
  v_dist_run_walk_m_delta numeric := 0;
begin
  if p_user_id is null then
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
      total_distance_run_walk_m = greatest(0, coalesce(total_distance_run_walk_m, 0) + v_dist_run_walk_m_delta)
  where user_id = p_user_id;
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
      '20260227_weekly_distance_metrics_meters',
      'Added meter-based weekly_summary distance columns and switched indoor run/walk stats updates to meters.'
    )
    on conflict (change_key) do nothing;
  end if;
end;
$$;

commit;
