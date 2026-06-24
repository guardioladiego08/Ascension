begin;

create or replace function "user".on_indoor_interval_session_completed()
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
        new.total_distance_m::numeric,
        new.total_elevation_m::numeric,
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
        old.total_distance_m::numeric,
        old.total_elevation_m::numeric,
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
        new.total_distance_m::numeric,
        new.total_elevation_m::numeric,
        1
      );
    end if;
  end if;

  return new;
end;
$$;

create or replace function run_walk.revert_indoor_interval_session_from_stats()
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
      old.total_distance_m::numeric,
      old.total_elevation_m::numeric,
      -1
    );
  end if;

  return old;
end;
$$;

do $$
begin
  perform pg_notify('pgrst', 'reload schema');
exception
  when undefined_function then
    null;
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
      '20260623_fix_indoor_interval_stats_numeric_cast',
      'Fixed indoor interval stat trigger functions to cast distance and elevation doubles into the numeric argument types expected by user.apply_indoor_run_walk_stats_delta(...).'
    )
    on conflict (change_key) do nothing;
  end if;
end;
$$;

commit;
