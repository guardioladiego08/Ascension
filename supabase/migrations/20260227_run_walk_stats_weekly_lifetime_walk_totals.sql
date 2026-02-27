-- Indoor run/walk stats propagation to user.weekly_summary + user.lifetime_stats
-- Adds walk + run/walk distance aggregates and keeps weekly rows unique by (user_id, week_start).

begin;

create schema if not exists "user";
create schema if not exists run_walk;

-- Ensure updated_at trigger function exists.
create or replace function "user".set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

-- New distance columns requested.
alter table if exists "user".weekly_summary
  add column if not exists total_miles_walked numeric(10, 2) not null default 0,
  add column if not exists total_miles_run_walk numeric(10, 2) not null default 0;

alter table if exists "user".lifetime_stats
  add column if not exists total_distance_walked_m numeric(14, 2) not null default 0,
  add column if not exists total_distance_run_walk_m numeric(14, 2) not null default 0;

-- Backfill combined columns from existing run values when they are still zero.
update "user".weekly_summary
set total_miles_run_walk = coalesce(total_miles_ran, 0)
where coalesce(total_miles_run_walk, 0) = 0
  and coalesce(total_miles_ran, 0) <> 0;

update "user".lifetime_stats
set total_distance_run_walk_m = coalesce(total_distance_ran_m, 0)
where coalesce(total_distance_run_walk_m, 0) = 0
  and coalesce(total_distance_ran_m, 0) <> 0;

-- Core delta applier used by insert/update/delete session triggers.
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
  v_dist_miles_delta numeric := (coalesce(p_total_distance_m, 0)::numeric / 1609.344) * v_dir;
  v_elev_m_delta numeric := coalesce(p_total_elevation_m, 0)::numeric * v_dir;

  v_miles_ran_delta numeric := 0;
  v_miles_walked_delta numeric := 0;
  v_miles_run_walk_delta numeric := 0;

  v_dist_ran_m_delta numeric := 0;
  v_dist_walked_m_delta numeric := 0;
  v_dist_run_walk_m_delta numeric := 0;
begin
  if p_user_id is null then
    return;
  end if;

  -- This migration tracks indoor sessions only.
  if not v_is_indoor then
    return;
  end if;

  if v_tz is null then
    v_tz := 'UTC';
  end if;

  v_local_day := (v_anchor at time zone v_tz)::date;
  v_week_start := v_local_day - ((extract(dow from v_local_day)::int + 6) % 7);

  if v_is_run then
    v_miles_ran_delta := v_dist_miles_delta;
    v_dist_ran_m_delta := v_dist_m_delta;
  end if;

  if v_is_walk then
    v_miles_walked_delta := v_dist_miles_delta;
    v_dist_walked_m_delta := v_dist_m_delta;
  end if;

  if v_is_run or v_is_walk then
    v_miles_run_walk_delta := v_dist_miles_delta;
    v_dist_run_walk_m_delta := v_dist_m_delta;
  end if;

  insert into "user".weekly_summary (user_id, week_start, timezone_str)
  values (p_user_id, v_week_start, v_tz)
  on conflict (user_id, week_start) do update
  set timezone_str = coalesce(excluded.timezone_str, "user".weekly_summary.timezone_str);

  update "user".weekly_summary
  set workouts_count = greatest(0, coalesce(workouts_count, 0) + v_workouts_delta),
      total_hours = greatest(0, coalesce(total_hours, 0) + v_hours_delta),
      total_miles_ran = greatest(0, coalesce(total_miles_ran, 0) + v_miles_ran_delta),
      total_miles_walked = greatest(0, coalesce(total_miles_walked, 0) + v_miles_walked_delta),
      total_miles_run_walk = greatest(0, coalesce(total_miles_run_walk, 0) + v_miles_run_walk_delta),
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

create or replace function "user".apply_run_walk_session_to_stats()
returns trigger
language plpgsql
security definer
set search_path = public, "user", run_walk
as $$
declare
  v_old_completed boolean := false;
  v_new_completed boolean := false;
begin
  if tg_op = 'INSERT' then
    if new.status = 'completed' then
      perform "user".apply_indoor_run_walk_stats_delta(
        new.user_id,
        new.ended_at,
        new.timezone_str,
        new.exercise_type::text,
        new.total_time_s,
        new.total_distance_m,
        new.total_elevation_m,
        1
      );
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' then
    v_old_completed := old.status = 'completed';
    v_new_completed := new.status = 'completed';

    if v_old_completed then
      perform "user".apply_indoor_run_walk_stats_delta(
        old.user_id,
        old.ended_at,
        old.timezone_str,
        old.exercise_type::text,
        old.total_time_s,
        old.total_distance_m,
        old.total_elevation_m,
        -1
      );
    end if;

    if v_new_completed then
      perform "user".apply_indoor_run_walk_stats_delta(
        new.user_id,
        new.ended_at,
        new.timezone_str,
        new.exercise_type::text,
        new.total_time_s,
        new.total_distance_m,
        new.total_elevation_m,
        1
      );
    end if;

    return new;
  end if;

  return new;
end;
$$;

create or replace function run_walk.revert_run_walk_session_from_stats()
returns trigger
language plpgsql
security definer
set search_path = public, "user", run_walk
as $$
begin
  if old.status = 'completed' then
    perform "user".apply_indoor_run_walk_stats_delta(
      old.user_id,
      old.ended_at,
      old.timezone_str,
      old.exercise_type::text,
      old.total_time_s,
      old.total_distance_m,
      old.total_elevation_m,
      -1
    );
  end if;

  return old;
end;
$$;

-- Keep triggers present/updated.
do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'run_walk'
      and table_name = 'sessions'
  ) then
    execute 'drop trigger if exists trg_apply_run_walk_to_user_stats on run_walk.sessions';
    execute 'create trigger trg_apply_run_walk_to_user_stats
      after insert or update of status, ended_at, total_time_s, total_distance_m, total_elevation_m, exercise_type, timezone_str
      on run_walk.sessions
      for each row
      execute function "user".apply_run_walk_session_to_stats()';

    execute 'drop trigger if exists trg_revert_run_walk_stats on run_walk.sessions';
    execute 'create trigger trg_revert_run_walk_stats
      after delete on run_walk.sessions
      for each row
      execute function run_walk.revert_run_walk_session_from_stats()';
  end if;
end;
$$;

-- Ensure updated_at triggers on summary tables.
do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'user'
      and table_name = 'weekly_summary'
  ) then
    execute 'drop trigger if exists trg_weekly_summary_updated_at on "user".weekly_summary';
    execute 'create trigger trg_weekly_summary_updated_at
      before update on "user".weekly_summary
      for each row
      execute function "user".set_updated_at()';
  end if;

  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'user'
      and table_name = 'lifetime_stats'
  ) then
    execute 'drop trigger if exists trg_lifetime_stats_updated_at on "user".lifetime_stats';
    execute 'create trigger trg_lifetime_stats_updated_at
      before update on "user".lifetime_stats
      for each row
      execute function "user".set_updated_at()';
  end if;
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
      '20260227_run_walk_stats_weekly_lifetime_walk_totals',
      'Added indoor run/walk stat propagation into weekly_summary + lifetime_stats with walk/run_walk totals and resilient triggers.'
    )
    on conflict (change_key) do nothing;
  end if;
end;
$$;

commit;
