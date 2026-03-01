-- Replace stale outdoor session stats triggers that still reference legacy mile columns
-- such as user.lifetime_stats.total_miles_biked.

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

create or replace function "user".apply_outdoor_session_stats_delta(
  p_user_id uuid,
  p_ended_at timestamptz,
  p_timezone_str text,
  p_activity_type text,
  p_duration_s integer,
  p_distance_m numeric,
  p_elev_gain_m numeric,
  p_direction integer
)
returns void
language plpgsql
security definer
set search_path = public, "user", run_walk
as $$
declare
  v_type text := lower(coalesce(p_activity_type, ''));
  v_is_run boolean := v_type = 'run';
  v_is_walk boolean := v_type = 'walk';
  v_is_bike boolean := v_type in ('bike', 'ride', 'cycle', 'cycling');

  v_tz text := nullif(trim(coalesce(p_timezone_str, '')), '');
  v_anchor timestamptz := coalesce(p_ended_at, timezone('utc', now()));
  v_local_day date;
  v_week_start date;

  v_workouts_delta integer := case when p_direction < 0 then -1 else 1 end;
  v_dir numeric := case when p_direction < 0 then -1 else 1 end;

  v_hours_delta numeric := (coalesce(p_duration_s, 0)::numeric / 3600.0) * v_dir;
  v_dist_m_delta numeric := coalesce(p_distance_m, 0)::numeric * v_dir;
  v_elev_gain_delta numeric := coalesce(p_elev_gain_m, 0)::numeric * v_dir;

  v_dist_ran_m_delta numeric := 0;
  v_dist_walked_m_delta numeric := 0;
  v_dist_biked_m_delta numeric := 0;
  v_dist_run_walk_m_delta numeric := 0;
begin
  if p_user_id is null then
    return;
  end if;

  if v_tz is null then
    v_tz := 'UTC';
  end if;

  v_local_day := (v_anchor at time zone v_tz)::date;
  v_week_start := v_local_day - ((extract(dow from v_local_day)::int + 6) % 7);

  if v_is_run then
    v_dist_ran_m_delta := v_dist_m_delta;
    v_dist_run_walk_m_delta := v_dist_m_delta;
  elsif v_is_walk then
    v_dist_walked_m_delta := v_dist_m_delta;
    v_dist_run_walk_m_delta := v_dist_m_delta;
  elsif v_is_bike then
    v_dist_biked_m_delta := v_dist_m_delta;
  end if;

  insert into "user".weekly_summary (user_id, week_start, timezone_str)
  values (p_user_id, v_week_start, v_tz)
  on conflict (user_id, week_start) do update
  set timezone_str = coalesce(excluded.timezone_str, "user".weekly_summary.timezone_str);

  update "user".weekly_summary
  set workouts_count = greatest(0, coalesce(workouts_count, 0) + v_workouts_delta),
      total_hours = greatest(0, coalesce(total_hours, 0) + v_hours_delta),
      total_elev_gain_m = greatest(0, coalesce(total_elev_gain_m, 0) + v_elev_gain_delta),
      total_distance_ran_m = greatest(0, coalesce(total_distance_ran_m, 0) + v_dist_ran_m_delta),
      total_distance_walked_m = greatest(0, coalesce(total_distance_walked_m, 0) + v_dist_walked_m_delta),
      total_distance_biked_m = greatest(0, coalesce(total_distance_biked_m, 0) + v_dist_biked_m_delta),
      total_distance_run_walk_m = greatest(0, coalesce(total_distance_run_walk_m, 0) + v_dist_run_walk_m_delta)
  where user_id = p_user_id
    and week_start = v_week_start;

  insert into "user".lifetime_stats (user_id, timezone_str)
  values (p_user_id, v_tz)
  on conflict (user_id) do update
  set timezone_str = coalesce(excluded.timezone_str, "user".lifetime_stats.timezone_str);

  update "user".lifetime_stats
  set workouts_count = greatest(0, coalesce(workouts_count, 0) + v_workouts_delta),
      total_hours = greatest(0, coalesce(total_hours, 0) + v_hours_delta),
      total_elev_gain_m = greatest(0, coalesce(total_elev_gain_m, 0) + v_elev_gain_delta),
      total_distance_ran_m = greatest(0, coalesce(total_distance_ran_m, 0) + v_dist_ran_m_delta),
      total_distance_walked_m = greatest(0, coalesce(total_distance_walked_m, 0) + v_dist_walked_m_delta),
      total_distance_biked_m = greatest(0, coalesce(total_distance_biked_m, 0) + v_dist_biked_m_delta),
      total_distance_run_walk_m = greatest(0, coalesce(total_distance_run_walk_m, 0) + v_dist_run_walk_m_delta)
  where user_id = p_user_id;
end;
$$;

create or replace function "user".on_outdoor_session_completed()
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
      perform "user".apply_outdoor_session_stats_delta(
        new.user_id,
        new.ended_at,
        new.timezone_str,
        new.activity_type::text,
        new.duration_s,
        new.distance_m,
        new.elev_gain_m,
        1
      );
    end if;

    return new;
  end if;

  if tg_op = 'UPDATE' then
    v_old_completed := old.status = 'completed';
    v_new_completed := new.status = 'completed';

    if v_old_completed then
      perform "user".apply_outdoor_session_stats_delta(
        old.user_id,
        old.ended_at,
        old.timezone_str,
        old.activity_type::text,
        old.duration_s,
        old.distance_m,
        old.elev_gain_m,
        -1
      );
    end if;

    if v_new_completed then
      perform "user".apply_outdoor_session_stats_delta(
        new.user_id,
        new.ended_at,
        new.timezone_str,
        new.activity_type::text,
        new.duration_s,
        new.distance_m,
        new.elev_gain_m,
        1
      );
    end if;

    return new;
  end if;

  return coalesce(new, old);
end;
$$;

create or replace function run_walk.revert_outdoor_session_from_stats()
returns trigger
language plpgsql
security definer
set search_path = public, "user", run_walk
as $$
begin
  if old.status = 'completed' then
    perform "user".apply_outdoor_session_stats_delta(
      old.user_id,
      old.ended_at,
      old.timezone_str,
      old.activity_type::text,
      old.duration_s,
      old.distance_m,
      old.elev_gain_m,
      -1
    );
  end if;

  return old;
end;
$$;

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'run_walk'
      and table_name = 'outdoor_sessions'
  ) then
    execute 'drop trigger if exists trg_outdoor_session_completed on run_walk.outdoor_sessions';
    execute 'create trigger trg_outdoor_session_completed
      after insert or update of status, ended_at, duration_s, distance_m, elev_gain_m, activity_type, timezone_str
      on run_walk.outdoor_sessions
      for each row
      execute function "user".on_outdoor_session_completed()';

    execute 'drop trigger if exists trg_revert_outdoor_session_stats on run_walk.outdoor_sessions';
    execute 'create trigger trg_revert_outdoor_session_stats
      after delete on run_walk.outdoor_sessions
      for each row
      execute function run_walk.revert_outdoor_session_from_stats()';
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
      '20260301_fix_outdoor_session_stats_legacy_columns',
      'Replaced stale outdoor session stats trigger functions that referenced legacy mile columns with meter-based lifetime and weekly stat updates.'
    )
    on conflict (change_key) do nothing;
  end if;
end;
$$;

commit;
