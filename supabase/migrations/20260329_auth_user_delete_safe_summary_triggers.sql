-- Prevent auth-user deletion cascades from recreating summary or goal rows.
-- During auth.admin.deleteUser(...), child-table delete triggers can fire while the auth row
-- is already gone in-transaction. Guard those trigger paths so they stop before upserting rows
-- back into user-owned summary tables.

begin;

create schema if not exists "user";
create schema if not exists auth;

create or replace function "user".auth_user_exists(p_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = auth, pg_catalog
as $$
  select p_user_id is not null
    and exists (
      select 1
      from auth.users u
      where u.id = p_user_id
    );
$$;

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

  if not "user".auth_user_exists(p_user_id) then
    return;
  end if;

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

  if not "user".auth_user_exists(p_user_id) then
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

create or replace function "user".apply_outdoor_session_stats_delta(
  p_user_id uuid,
  p_ended_at timestamptz,
  p_timezone_str text,
  p_activity_type text,
  p_duration_s integer,
  p_distance_m double precision,
  p_elev_gain_m double precision,
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

  if not "user".auth_user_exists(p_user_id) then
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

create or replace function "user".sync_goal_results_from_strength_workout()
returns trigger
language plpgsql
security definer
set search_path = public, "user", strength
as $$
declare
  v_old_date date;
  v_new_date date;
begin
  if tg_op = 'DELETE' then
    if not "user".auth_user_exists(old.user_id) then
      return old;
    end if;

    v_old_date := "user".goal_local_date(coalesce(old.ended_at, old.started_at), to_jsonb(old)->>'timezone_str');
    if old.user_id is not null and v_old_date is not null then
      perform "user".recompute_daily_goal_results(old.user_id, v_old_date);
    end if;
    return old;
  end if;

  v_new_date := "user".goal_local_date(coalesce(new.ended_at, new.started_at), to_jsonb(new)->>'timezone_str');

  if tg_op = 'UPDATE' then
    v_old_date := "user".goal_local_date(coalesce(old.ended_at, old.started_at), to_jsonb(old)->>'timezone_str');
    if old.user_id is not null
       and "user".auth_user_exists(old.user_id)
       and v_old_date is not null
       and (v_old_date <> v_new_date or old.user_id <> new.user_id) then
      perform "user".recompute_daily_goal_results(old.user_id, v_old_date);
    end if;
  end if;

  if new.user_id is not null and "user".auth_user_exists(new.user_id) and v_new_date is not null then
    perform "user".recompute_daily_goal_results(new.user_id, v_new_date);
  end if;

  return new;
end;
$$;

create or replace function "user".sync_goal_results_from_run_walk_session()
returns trigger
language plpgsql
security definer
set search_path = public, "user", run_walk
as $$
declare
  v_old_date date;
  v_new_date date;
begin
  if tg_op = 'DELETE' then
    if not "user".auth_user_exists(old.user_id) then
      return old;
    end if;

    v_old_date := "user".goal_local_date(old.ended_at, to_jsonb(old)->>'timezone_str');
    if old.user_id is not null and v_old_date is not null then
      perform "user".recompute_daily_goal_results(old.user_id, v_old_date);
    end if;
    return old;
  end if;

  v_new_date := "user".goal_local_date(new.ended_at, to_jsonb(new)->>'timezone_str');

  if tg_op = 'UPDATE' then
    v_old_date := "user".goal_local_date(old.ended_at, to_jsonb(old)->>'timezone_str');
    if old.user_id is not null
       and "user".auth_user_exists(old.user_id)
       and v_old_date is not null
       and (v_old_date <> v_new_date or old.user_id <> new.user_id) then
      perform "user".recompute_daily_goal_results(old.user_id, v_old_date);
    end if;
  end if;

  if new.user_id is not null and "user".auth_user_exists(new.user_id) and v_new_date is not null then
    perform "user".recompute_daily_goal_results(new.user_id, v_new_date);
  end if;

  return new;
end;
$$;

create or replace function "user".sync_goal_results_from_outdoor_session()
returns trigger
language plpgsql
security definer
set search_path = public, "user", run_walk
as $$
declare
  v_old_date date;
  v_new_date date;
begin
  if tg_op = 'DELETE' then
    if not "user".auth_user_exists(old.user_id) then
      return old;
    end if;

    v_old_date := "user".goal_local_date(coalesce(old.ended_at, old.started_at), to_jsonb(old)->>'timezone_str');
    if old.user_id is not null and v_old_date is not null then
      perform "user".recompute_daily_goal_results(old.user_id, v_old_date);
    end if;
    return old;
  end if;

  v_new_date := "user".goal_local_date(coalesce(new.ended_at, new.started_at), to_jsonb(new)->>'timezone_str');

  if tg_op = 'UPDATE' then
    v_old_date := "user".goal_local_date(coalesce(old.ended_at, old.started_at), to_jsonb(old)->>'timezone_str');
    if old.user_id is not null
       and "user".auth_user_exists(old.user_id)
       and v_old_date is not null
       and (v_old_date <> v_new_date or old.user_id <> new.user_id) then
      perform "user".recompute_daily_goal_results(old.user_id, v_old_date);
    end if;
  end if;

  if new.user_id is not null and "user".auth_user_exists(new.user_id) and v_new_date is not null then
    perform "user".recompute_daily_goal_results(new.user_id, v_new_date);
  end if;

  return new;
end;
$$;

create or replace function "user".sync_goal_results_from_nutrition_day()
returns trigger
language plpgsql
security definer
set search_path = public, "user", nutrition
as $$
begin
  if tg_op = 'DELETE' then
    if not "user".auth_user_exists(old.user_id) then
      return old;
    end if;

    if old.user_id is not null and old.date is not null then
      perform "user".recompute_daily_goal_results(old.user_id, old.date);
    end if;
    return old;
  end if;

  if tg_op = 'UPDATE'
     and old.user_id is not null
     and "user".auth_user_exists(old.user_id)
     and old.date is not null
     and (old.user_id <> new.user_id or old.date <> new.date) then
    perform "user".recompute_daily_goal_results(old.user_id, old.date);
  end if;

  if new.user_id is not null and "user".auth_user_exists(new.user_id) and new.date is not null then
    perform "user".recompute_daily_goal_results(new.user_id, new.date);
  end if;

  return new;
end;
$$;

create or replace function "user".sync_weekly_goal_summary_from_daily_goal_results()
returns trigger
language plpgsql
security definer
set search_path = public, "user", nutrition
as $$
begin
  if tg_op = 'DELETE' then
    if not "user".auth_user_exists(old.user_id) then
      return old;
    end if;

    if old.user_id is not null and old.date is not null then
      update nutrition.diary_days
      set goal_hit = false
      where user_id = old.user_id
        and date = old.date;

      perform "user".sync_weekly_goal_summary(old.user_id, old.date, old.timezone_str);
    end if;
    return old;
  end if;

  if tg_op = 'UPDATE'
     and old.user_id is not null
     and "user".auth_user_exists(old.user_id)
     and old.date is not null
     and (old.user_id <> new.user_id or old.date <> new.date) then
    update nutrition.diary_days
    set goal_hit = false
    where user_id = old.user_id
      and date = old.date;

    perform "user".sync_weekly_goal_summary(old.user_id, old.date, old.timezone_str);
  end if;

  if new.user_id is not null and "user".auth_user_exists(new.user_id) and new.date is not null then
    update nutrition.diary_days
    set goal_hit = coalesce(new.nutrition_met, false)
    where user_id = new.user_id
      and date = new.date;

    perform "user".sync_weekly_goal_summary(new.user_id, new.date, new.timezone_str);
  end if;

  return new;
end;
$$;

create or replace function "user".sync_weekly_nutrition_summary_from_diary_day()
returns trigger
language plpgsql
security definer
set search_path = public, "user", nutrition
as $$
begin
  if tg_op = 'DELETE' then
    if not "user".auth_user_exists(old.user_id) then
      return old;
    end if;

    if old.user_id is not null and old.date is not null then
      perform "user".sync_nutrition_summaries(old.user_id, old.date, old.timezone_str);
    end if;
    return old;
  end if;

  if tg_op = 'UPDATE'
     and old.user_id is not null
     and "user".auth_user_exists(old.user_id)
     and old.date is not null
     and (old.user_id <> new.user_id or old.date <> new.date) then
    perform "user".sync_nutrition_summaries(old.user_id, old.date, old.timezone_str);
  end if;

  if new.user_id is not null and "user".auth_user_exists(new.user_id) and new.date is not null then
    perform "user".sync_nutrition_summaries(new.user_id, new.date, new.timezone_str);
  end if;

  return new;
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
      '20260329_auth_user_delete_safe_summary_triggers',
      'Guarded summary and goal trigger functions so auth-user deletion cascades do not recreate user-owned rows during delete.'
    )
    on conflict (change_key) do nothing;
  end if;
end;
$$;

commit;
