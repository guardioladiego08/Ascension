-- Strength workout completion stats propagation to user.weekly_summary + user.lifetime_stats.
-- Moves stats updates into DB triggers so every completed workout is counted consistently.

begin;

create schema if not exists "user";
create schema if not exists strength;

create or replace function "user".apply_strength_workout_to_summary_delta(
  p_user_id uuid,
  p_started_at timestamptz,
  p_ended_at timestamptz,
  p_timezone_str text,
  p_total_weight_lifted_kg numeric,
  p_direction integer
)
returns void
language plpgsql
security definer
set search_path = public, "user", strength
as $$
declare
  v_tz text := nullif(trim(coalesce(p_timezone_str, '')), '');
  v_local_day date;
  v_week_start date;
  v_workouts_delta integer := case when p_direction < 0 then -1 else 1 end;
  v_dir numeric := case when p_direction < 0 then -1 else 1 end;
  v_hours_delta numeric := 0;
  v_weight_delta numeric := coalesce(p_total_weight_lifted_kg, 0) * v_dir;
begin
  if p_user_id is null then
    return;
  end if;

  -- Only completed workouts (ended_at present) are counted.
  if p_ended_at is null then
    return;
  end if;

  if v_tz is null then
    v_tz := 'UTC';
  end if;

  begin
    v_local_day := (p_ended_at at time zone v_tz)::date;
  exception
    when others then
      v_tz := 'UTC';
      v_local_day := (p_ended_at at time zone 'UTC')::date;
  end;

  v_week_start := v_local_day - ((extract(dow from v_local_day)::int + 6) % 7);

  if p_started_at is not null then
    v_hours_delta := greatest(0, extract(epoch from (p_ended_at - p_started_at))::numeric / 3600.0) * v_dir;
  end if;

  insert into "user".weekly_summary (user_id, week_start, timezone_str)
  values (p_user_id, v_week_start, v_tz)
  on conflict (user_id, week_start) do update
  set timezone_str = coalesce(excluded.timezone_str, "user".weekly_summary.timezone_str);

  update "user".weekly_summary
  set workouts_count = greatest(0, coalesce(workouts_count, 0) + v_workouts_delta),
      total_hours = greatest(0, coalesce(total_hours, 0) + v_hours_delta),
      total_weight_lifted_kg = greatest(0, coalesce(total_weight_lifted_kg, 0) + v_weight_delta)
  where user_id = p_user_id
    and week_start = v_week_start;

  insert into "user".lifetime_stats (user_id, timezone_str)
  values (p_user_id, v_tz)
  on conflict (user_id) do update
  set timezone_str = coalesce(excluded.timezone_str, "user".lifetime_stats.timezone_str);

  update "user".lifetime_stats
  set workouts_count = greatest(0, coalesce(workouts_count, 0) + v_workouts_delta),
      total_hours = greatest(0, coalesce(total_hours, 0) + v_hours_delta),
      total_weight_lifted_kg = greatest(0, coalesce(total_weight_lifted_kg, 0) + v_weight_delta)
  where user_id = p_user_id;
end;
$$;

create or replace function "user".apply_strength_workout_to_stats()
returns trigger
language plpgsql
security definer
set search_path = public, "user", strength
as $$
declare
  v_old_completed boolean := false;
  v_new_completed boolean := false;
  v_old_tz text := null;
  v_new_tz text := null;
begin
  if tg_op = 'INSERT' then
    v_new_tz := nullif(trim(coalesce(to_jsonb(new)->>'timezone_str', '')), '');
    if new.ended_at is not null then
      perform "user".apply_strength_workout_to_summary_delta(
        new.user_id,
        new.started_at,
        new.ended_at,
        v_new_tz,
        new.total_vol,
        1
      );
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' then
    v_old_completed := old.ended_at is not null;
    v_new_completed := new.ended_at is not null;
    v_old_tz := nullif(trim(coalesce(to_jsonb(old)->>'timezone_str', '')), '');
    v_new_tz := nullif(trim(coalesce(to_jsonb(new)->>'timezone_str', '')), '');

    if v_old_completed then
      perform "user".apply_strength_workout_to_summary_delta(
        old.user_id,
        old.started_at,
        old.ended_at,
        v_old_tz,
        old.total_vol,
        -1
      );
    end if;

    if v_new_completed then
      perform "user".apply_strength_workout_to_summary_delta(
        new.user_id,
        new.started_at,
        new.ended_at,
        v_new_tz,
        new.total_vol,
        1
      );
    end if;

    return new;
  end if;

  return new;
end;
$$;

create or replace function strength.revert_strength_workout_from_stats()
returns trigger
language plpgsql
security definer
set search_path = public, "user", strength
as $$
declare
  v_old_tz text := nullif(trim(coalesce(to_jsonb(old)->>'timezone_str', '')), '');
begin
  if old.ended_at is not null then
    perform "user".apply_strength_workout_to_summary_delta(
      old.user_id,
      old.started_at,
      old.ended_at,
      v_old_tz,
      old.total_vol,
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
    where table_schema = 'strength'
      and table_name = 'strength_workouts'
  ) then
    execute 'drop trigger if exists trg_apply_strength_to_user_stats on strength.strength_workouts';
    execute 'create trigger trg_apply_strength_to_user_stats
      after insert or update of ended_at, started_at, total_vol
      on strength.strength_workouts
      for each row
      execute function "user".apply_strength_workout_to_stats()';

    execute 'drop trigger if exists trg_revert_strength_stats on strength.strength_workouts';
    execute 'create trigger trg_revert_strength_stats
      after delete on strength.strength_workouts
      for each row
      execute function strength.revert_strength_workout_from_stats()';
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
      '20260227_strength_stats_triggers',
      'Added DB triggers to sync completed strength workouts into user.weekly_summary and user.lifetime_stats.'
    )
    on conflict (change_key) do nothing;
  end if;
end;
$$;

commit;
