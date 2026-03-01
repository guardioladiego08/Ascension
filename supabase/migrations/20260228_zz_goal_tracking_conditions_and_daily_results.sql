-- Goal condition modes + daily goal aggregation.
-- Stores at most one goal-results row per user/date and recomputes it from source activity data.

begin;

create schema if not exists "user";
create schema if not exists strength;
create schema if not exists run_walk;
create schema if not exists nutrition;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'goal_condition_mode'
      and n.nspname = 'public'
  ) then
    create type public.goal_condition_mode as enum ('and', 'or');
  end if;
end $$;

alter table if exists "user".user_goal_snapshots
  add column if not exists strength_condition_mode public.goal_condition_mode,
  add column if not exists cardio_condition_mode public.goal_condition_mode,
  add column if not exists nutrition_condition_mode public.goal_condition_mode,
  add column if not exists strength_volume_unit text,
  add column if not exists cardio_distance_unit text;

update "user".user_goal_snapshots
set strength_condition_mode = coalesce(strength_condition_mode, 'and'::public.goal_condition_mode),
    cardio_condition_mode = coalesce(cardio_condition_mode, 'and'::public.goal_condition_mode),
    nutrition_condition_mode = coalesce(nutrition_condition_mode, 'and'::public.goal_condition_mode),
    strength_volume_unit = case
      when lower(coalesce(strength_volume_unit, '')) = 'lb' then 'lb'
      else 'kg'
    end,
    cardio_distance_unit = case
      when lower(coalesce(cardio_distance_unit, '')) = 'mi' then 'mi'
      else 'km'
    end;

alter table if exists "user".user_goal_snapshots
  alter column strength_condition_mode set default 'and'::public.goal_condition_mode,
  alter column cardio_condition_mode set default 'and'::public.goal_condition_mode,
  alter column nutrition_condition_mode set default 'and'::public.goal_condition_mode,
  alter column strength_volume_unit set default 'kg',
  alter column cardio_distance_unit set default 'km';

alter table if exists "user".user_goal_snapshots
  alter column strength_condition_mode set not null,
  alter column cardio_condition_mode set not null,
  alter column nutrition_condition_mode set not null,
  alter column strength_volume_unit set not null,
  alter column cardio_distance_unit set not null;

alter table if exists "user".user_goal_snapshots
  drop constraint if exists user_goal_snapshots_strength_volume_unit_check,
  drop constraint if exists user_goal_snapshots_cardio_distance_unit_check;

alter table if exists "user".user_goal_snapshots
  add constraint user_goal_snapshots_strength_volume_unit_check
    check (strength_volume_unit in ('kg', 'lb')),
  add constraint user_goal_snapshots_cardio_distance_unit_check
    check (cardio_distance_unit in ('km', 'mi'));

alter table if exists "user".daily_goal_results
  add column if not exists strength_condition_mode public.goal_condition_mode,
  add column if not exists cardio_condition_mode public.goal_condition_mode,
  add column if not exists nutrition_condition_mode public.goal_condition_mode,
  add column if not exists strength_volume_unit text,
  add column if not exists strength_met boolean not null default false,
  add column if not exists cardio_met boolean not null default false,
  add column if not exists nutrition_met boolean not null default false;

update "user".daily_goal_results
set strength_condition_mode = coalesce(strength_condition_mode, 'and'::public.goal_condition_mode),
    cardio_condition_mode = coalesce(cardio_condition_mode, 'and'::public.goal_condition_mode),
    nutrition_condition_mode = coalesce(nutrition_condition_mode, 'and'::public.goal_condition_mode),
    strength_volume_unit = case
      when lower(coalesce(strength_volume_unit, '')) = 'lb' then 'lb'
      else 'kg'
    end,
    distance_unit = case
      when lower(coalesce(distance_unit, '')) = 'mi' then 'mi'
      else 'km'
    end,
    strength_met = coalesce(strength_met, false),
    cardio_met = coalesce(cardio_met, false),
    nutrition_met = coalesce(nutrition_met, false);

alter table if exists "user".daily_goal_results
  alter column strength_condition_mode set default 'and'::public.goal_condition_mode,
  alter column cardio_condition_mode set default 'and'::public.goal_condition_mode,
  alter column nutrition_condition_mode set default 'and'::public.goal_condition_mode,
  alter column strength_volume_unit set default 'kg',
  alter column distance_unit set default 'km';

alter table if exists "user".daily_goal_results
  alter column strength_condition_mode set not null,
  alter column cardio_condition_mode set not null,
  alter column nutrition_condition_mode set not null,
  alter column strength_volume_unit set not null;

alter table if exists "user".daily_goal_results
  drop constraint if exists daily_goal_results_strength_volume_unit_check,
  drop constraint if exists daily_goal_results_distance_unit_check;

alter table if exists "user".daily_goal_results
  add constraint daily_goal_results_strength_volume_unit_check
    check (strength_volume_unit in ('kg', 'lb')),
  add constraint daily_goal_results_distance_unit_check
    check (distance_unit in ('km', 'mi'));

create or replace function "user".goal_local_date(
  p_ts timestamptz,
  p_timezone_str text default null
)
returns date
language plpgsql
immutable
as $$
declare
  v_tz text := nullif(trim(coalesce(p_timezone_str, '')), '');
begin
  if p_ts is null then
    return null;
  end if;

  if v_tz is null then
    v_tz := 'UTC';
  end if;

  begin
    return (p_ts at time zone v_tz)::date;
  exception
    when others then
      return (p_ts at time zone 'UTC')::date;
  end;
end;
$$;

create or replace function "user".goal_category_met(
  p_mode public.goal_condition_mode,
  p_enabled boolean[],
  p_met boolean[]
)
returns boolean
language plpgsql
immutable
as $$
declare
  v_mode public.goal_condition_mode := coalesce(p_mode, 'and'::public.goal_condition_mode);
  v_has_enabled boolean := false;
  v_any_met boolean := false;
  i integer;
begin
  if coalesce(array_length(p_enabled, 1), 0) = 0 then
    return false;
  end if;

  for i in 1 .. array_length(p_enabled, 1) loop
    if coalesce(p_enabled[i], false) then
      v_has_enabled := true;

      if coalesce(p_met[i], false) then
        v_any_met := true;
      elsif v_mode = 'and'::public.goal_condition_mode then
        return false;
      end if;
    end if;
  end loop;

  if not v_has_enabled then
    return false;
  end if;

  if v_mode = 'or'::public.goal_condition_mode then
    return v_any_met;
  end if;

  return true;
end;
$$;

create or replace function "user".recompute_daily_goal_results(
  p_user_id uuid,
  p_goal_date date
)
returns "user".daily_goal_results
language plpgsql
security definer
set search_path = public, "user", strength, run_walk, nutrition
as $$
declare
  v_snapshot "user".user_goal_snapshots%rowtype;
  v_pref_weight text := 'kg';
  v_pref_distance text := 'km';

  v_strength_condition_mode public.goal_condition_mode := 'and'::public.goal_condition_mode;
  v_cardio_condition_mode public.goal_condition_mode := 'and'::public.goal_condition_mode;
  v_nutrition_condition_mode public.goal_condition_mode := 'and'::public.goal_condition_mode;

  v_strength_volume_unit text := 'kg';
  v_distance_unit text := 'km';

  v_strength_time_enabled boolean := false;
  v_strength_volume_enabled boolean := false;
  v_cardio_time_enabled boolean := false;
  v_cardio_distance_enabled boolean := false;
  v_protein_enabled boolean := false;
  v_carbs_enabled boolean := false;
  v_fats_enabled boolean := false;
  v_calories_enabled boolean := false;

  v_strength_time_actual numeric(12, 2) := 0;
  v_strength_volume_actual numeric(12, 2) := 0;
  v_cardio_time_actual numeric(12, 2) := 0;
  v_cardio_distance_actual numeric(12, 2) := 0;
  v_cardio_time_sessions_actual numeric(12, 2) := 0;
  v_cardio_distance_sessions_actual numeric(12, 2) := 0;
  v_cardio_time_outdoor_actual numeric(12, 2) := 0;
  v_cardio_distance_outdoor_actual numeric(12, 2) := 0;

  v_kcal_actual integer := 0;
  v_protein_actual numeric(10, 2) := 0;
  v_carbs_actual numeric(10, 2) := 0;
  v_fats_actual numeric(10, 2) := 0;
  v_has_nutrition_row boolean := false;

  v_met_strength_time boolean := null;
  v_met_strength_volume boolean := null;
  v_met_cardio_time boolean := null;
  v_met_cardio_distance boolean := null;
  v_met_calories boolean := null;
  v_met_protein boolean := null;
  v_met_carbs boolean := null;
  v_met_fats boolean := null;

  v_strength_active boolean := false;
  v_cardio_active boolean := false;
  v_nutrition_active boolean := false;

  v_strength_met boolean := false;
  v_cardio_met boolean := false;
  v_nutrition_met boolean := false;
  v_met_all boolean := false;

  v_active_metrics_count integer := 0;
  v_has_any_activity boolean := false;
  v_active_goal_types_count integer := 0;

  v_goal_tz text := 'UTC';
  v_row "user".daily_goal_results%rowtype;
begin
  if p_user_id is null or p_goal_date is null then
    return null;
  end if;

  select *
  into v_snapshot
  from "user".user_goal_snapshots s
  where s.user_id = p_user_id
    and s.effective_from <= p_goal_date
  order by s.effective_from desc, s.created_at desc
  limit 1;

  if not found then
    delete from "user".daily_goal_results
    where user_id = p_user_id
      and date = p_goal_date;

    delete from "user".daily_goal_status
    where user_id = p_user_id
      and goal_date = p_goal_date;

    return null;
  end if;

  select
    case
      when lower(coalesce(up.weight_unit::text, '')) = 'lb' then 'lb'
      else 'kg'
    end,
    case
      when lower(coalesce(up.distance_unit, '')) = 'mi' then 'mi'
      else 'km'
    end
  into v_pref_weight, v_pref_distance
  from "user".user_preferences up
  where up.user_id = p_user_id;

  v_strength_condition_mode := coalesce(v_snapshot.strength_condition_mode, 'and'::public.goal_condition_mode);
  v_cardio_condition_mode := coalesce(v_snapshot.cardio_condition_mode, 'and'::public.goal_condition_mode);
  v_nutrition_condition_mode := coalesce(v_snapshot.nutrition_condition_mode, 'and'::public.goal_condition_mode);

  v_strength_volume_unit := case
    when lower(coalesce(v_snapshot.strength_volume_unit, v_pref_weight, 'kg')) = 'lb' then 'lb'
    else 'kg'
  end;

  v_distance_unit := case
    when lower(coalesce(v_snapshot.cardio_distance_unit, v_pref_distance, 'km')) = 'mi' then 'mi'
    else 'km'
  end;

  v_strength_time_enabled := coalesce(v_snapshot.strength_use_time, false) and coalesce(v_snapshot.strength_time_min, 0) > 0;
  v_strength_volume_enabled := coalesce(v_snapshot.strength_use_volume, false) and coalesce(v_snapshot.strength_volume_min, 0) > 0;
  v_cardio_time_enabled := coalesce(v_snapshot.cardio_use_time, false) and coalesce(v_snapshot.cardio_time_min, 0) > 0;
  v_cardio_distance_enabled := coalesce(v_snapshot.cardio_use_distance, false) and coalesce(v_snapshot.cardio_distance, 0) > 0;
  v_protein_enabled := coalesce(v_snapshot.protein_enabled, false) and coalesce(v_snapshot.protein_target_g, 0) > 0;
  v_carbs_enabled := coalesce(v_snapshot.carbs_enabled, false) and coalesce(v_snapshot.carbs_target_g, 0) > 0;
  v_fats_enabled := coalesce(v_snapshot.fats_enabled, false) and coalesce(v_snapshot.fats_target_g, 0) > 0;
  v_calories_enabled := coalesce(v_snapshot.calorie_goal_mode::text, 'disabled') <> 'disabled' and coalesce(v_snapshot.calorie_target_kcal, 0) > 0;

  v_strength_active := v_strength_time_enabled or v_strength_volume_enabled;
  v_cardio_active := v_cardio_time_enabled or v_cardio_distance_enabled;
  v_nutrition_active := v_protein_enabled or v_carbs_enabled or v_fats_enabled or v_calories_enabled;

  v_active_metrics_count :=
    (case when v_strength_time_enabled then 1 else 0 end) +
    (case when v_strength_volume_enabled then 1 else 0 end) +
    (case when v_cardio_time_enabled then 1 else 0 end) +
    (case when v_cardio_distance_enabled then 1 else 0 end) +
    (case when v_protein_enabled then 1 else 0 end) +
    (case when v_carbs_enabled then 1 else 0 end) +
    (case when v_fats_enabled then 1 else 0 end) +
    (case when v_calories_enabled then 1 else 0 end);

  v_active_goal_types_count :=
    (case when v_strength_active then 1 else 0 end) +
    (case when v_cardio_active then 1 else 0 end) +
    (case when v_nutrition_active then 1 else 0 end);

  select
    coalesce(sum(greatest(extract(epoch from (coalesce(w.ended_at, w.started_at) - w.started_at))::numeric / 60.0, 0)), 0)::numeric(12, 2),
    coalesce(
      sum(
        case
          when v_strength_volume_unit = 'lb' then coalesce(w.total_vol, 0)::numeric * 2.20462262185
          else coalesce(w.total_vol, 0)::numeric
        end
      ),
      0
    )::numeric(12, 2)
  into v_strength_time_actual, v_strength_volume_actual
  from strength.strength_workouts w
  where w.user_id = p_user_id
    and w.ended_at is not null
    and "user".goal_local_date(coalesce(w.ended_at, w.started_at), to_jsonb(w)->>'timezone_str') = p_goal_date;

  select
    coalesce(sum(coalesce(s.total_time_s, 0)::numeric / 60.0), 0)::numeric(12, 2),
    coalesce(
      sum(
        case
          when v_distance_unit = 'mi' then coalesce(s.total_distance_m, 0)::numeric / 1609.344
          else coalesce(s.total_distance_m, 0)::numeric / 1000.0
        end
      ),
      0
    )::numeric(12, 2)
  into v_cardio_time_actual, v_cardio_distance_actual
  from run_walk.sessions s
  where s.user_id = p_user_id
    and s.status = 'completed'
    and "user".goal_local_date(s.ended_at, to_jsonb(s)->>'timezone_str') = p_goal_date;

  select
    coalesce(sum(coalesce(s.duration_s, 0)::numeric / 60.0), 0)::numeric(12, 2),
    coalesce(
      sum(
        case
          when v_distance_unit = 'mi' then coalesce(s.distance_m, 0)::numeric / 1609.344
          else coalesce(s.distance_m, 0)::numeric / 1000.0
        end
      ),
      0
    )::numeric(12, 2)
  into v_cardio_time_outdoor_actual, v_cardio_distance_outdoor_actual
  from run_walk.outdoor_sessions s
  where s.user_id = p_user_id
    and s.status = 'completed'
    and "user".goal_local_date(coalesce(s.ended_at, s.started_at), to_jsonb(s)->>'timezone_str') = p_goal_date;

  v_cardio_time_sessions_actual := coalesce(v_cardio_time_actual, 0);
  v_cardio_distance_sessions_actual := coalesce(v_cardio_distance_actual, 0);
  v_cardio_time_actual := v_cardio_time_sessions_actual + coalesce(v_cardio_time_outdoor_actual, 0);
  v_cardio_distance_actual := v_cardio_distance_sessions_actual + coalesce(v_cardio_distance_outdoor_actual, 0);

  select
    true,
    coalesce(d.kcal_total, 0)::integer,
    coalesce(d.protein_g_total, 0)::numeric(10, 2),
    coalesce(d.carbs_g_total, 0)::numeric(10, 2),
    coalesce(d.fat_g_total, 0)::numeric(10, 2),
    coalesce(nullif(trim(coalesce(d.timezone_str, '')), ''), 'UTC')
  into v_has_nutrition_row, v_kcal_actual, v_protein_actual, v_carbs_actual, v_fats_actual, v_goal_tz
  from nutrition.diary_days d
  where d.user_id = p_user_id
    and d.date = p_goal_date
  limit 1;

  if not found then
    v_has_nutrition_row := false;
    v_kcal_actual := 0;
    v_protein_actual := 0;
    v_carbs_actual := 0;
    v_fats_actual := 0;
    v_goal_tz := 'UTC';
  end if;

  if v_goal_tz = 'UTC' then
    select coalesce((
      select nullif(trim(coalesce(to_jsonb(w)->>'timezone_str', '')), '')
      from strength.strength_workouts w
      where w.user_id = p_user_id
        and w.ended_at is not null
        and "user".goal_local_date(coalesce(w.ended_at, w.started_at), to_jsonb(w)->>'timezone_str') = p_goal_date
      order by w.ended_at desc
      limit 1
    ), v_goal_tz)
    into v_goal_tz;
  end if;

  if v_goal_tz = 'UTC' then
    select coalesce((
      select nullif(trim(coalesce(to_jsonb(s)->>'timezone_str', '')), '')
      from run_walk.sessions s
      where s.user_id = p_user_id
        and s.status = 'completed'
        and "user".goal_local_date(s.ended_at, to_jsonb(s)->>'timezone_str') = p_goal_date
      order by s.ended_at desc
      limit 1
    ), v_goal_tz)
    into v_goal_tz;
  end if;

  if v_goal_tz = 'UTC' then
    select coalesce((
      select nullif(trim(coalesce(to_jsonb(s)->>'timezone_str', '')), '')
      from run_walk.outdoor_sessions s
      where s.user_id = p_user_id
        and s.status = 'completed'
        and "user".goal_local_date(coalesce(s.ended_at, s.started_at), to_jsonb(s)->>'timezone_str') = p_goal_date
      order by coalesce(s.ended_at, s.started_at) desc
      limit 1
    ), v_goal_tz)
    into v_goal_tz;
  end if;

  if v_strength_time_enabled then
    v_met_strength_time := v_strength_time_actual >= v_snapshot.strength_time_min::numeric;
  end if;

  if v_strength_volume_enabled then
    v_met_strength_volume := v_strength_volume_actual >= v_snapshot.strength_volume_min::numeric;
  end if;

  if v_cardio_time_enabled then
    v_met_cardio_time := v_cardio_time_actual >= v_snapshot.cardio_time_min::numeric;
  end if;

  if v_cardio_distance_enabled then
    v_met_cardio_distance := v_cardio_distance_actual >= v_snapshot.cardio_distance::numeric;
  end if;

  if v_protein_enabled then
    v_met_protein := v_protein_actual >= v_snapshot.protein_target_g::numeric;
  end if;

  if v_carbs_enabled then
    v_met_carbs := v_carbs_actual >= v_snapshot.carbs_target_g::numeric;
  end if;

  if v_fats_enabled then
    v_met_fats := v_fats_actual >= v_snapshot.fats_target_g::numeric;
  end if;

  if v_calories_enabled then
    if not v_has_nutrition_row then
      v_met_calories := false;
    elsif v_snapshot.calorie_goal_mode = 'gain'::public.calorie_goal_mode then
      v_met_calories := v_kcal_actual >= v_snapshot.calorie_target_kcal;
    elsif v_snapshot.calorie_goal_mode = 'lose'::public.calorie_goal_mode then
      v_met_calories := v_kcal_actual <= v_snapshot.calorie_target_kcal;
    elsif v_snapshot.calorie_goal_mode = 'maintain'::public.calorie_goal_mode then
      v_met_calories := abs(v_kcal_actual - v_snapshot.calorie_target_kcal) <= greatest(100, round(v_snapshot.calorie_target_kcal * 0.05));
    else
      v_met_calories := false;
    end if;
  end if;

  v_strength_met := "user".goal_category_met(
    v_strength_condition_mode,
    array[v_strength_time_enabled, v_strength_volume_enabled],
    array[coalesce(v_met_strength_time, false), coalesce(v_met_strength_volume, false)]
  );

  v_cardio_met := "user".goal_category_met(
    v_cardio_condition_mode,
    array[v_cardio_time_enabled, v_cardio_distance_enabled],
    array[coalesce(v_met_cardio_time, false), coalesce(v_met_cardio_distance, false)]
  );

  v_nutrition_met := "user".goal_category_met(
    v_nutrition_condition_mode,
    array[v_protein_enabled, v_carbs_enabled, v_fats_enabled, v_calories_enabled],
    array[
      coalesce(v_met_protein, false),
      coalesce(v_met_carbs, false),
      coalesce(v_met_fats, false),
      coalesce(v_met_calories, false)
    ]
  );

  v_met_all :=
    v_active_goal_types_count > 0
    and (not v_strength_active or v_strength_met)
    and (not v_cardio_active or v_cardio_met)
    and (not v_nutrition_active or v_nutrition_met);

  v_has_any_activity :=
    coalesce(v_strength_time_actual, 0) > 0
    or coalesce(v_strength_volume_actual, 0) > 0
    or coalesce(v_cardio_time_actual, 0) > 0
    or coalesce(v_cardio_distance_actual, 0) > 0
    or v_has_nutrition_row;

  if v_active_metrics_count = 0 or not v_has_any_activity then
    delete from "user".daily_goal_results
    where user_id = p_user_id
      and date = p_goal_date;

    delete from "user".daily_goal_status
    where user_id = p_user_id
      and goal_date = p_goal_date;

    return null;
  end if;

  insert into "user".daily_goal_results (
    user_id,
    date,
    goal_snapshot_id,
    timezone_str,
    distance_unit,
    strength_volume_unit,
    strength_time_min_actual,
    strength_volume_actual,
    cardio_time_min_actual,
    cardio_distance_actual,
    kcal_actual,
    protein_g_actual,
    carbs_g_actual,
    fats_g_actual,
    strength_time_min_target,
    strength_volume_target,
    cardio_time_min_target,
    cardio_distance_target,
    calorie_goal_mode,
    calorie_target_kcal,
    protein_target_g,
    carbs_target_g,
    fats_target_g,
    strength_use_time,
    strength_use_volume,
    cardio_use_time,
    cardio_use_distance,
    protein_enabled,
    carbs_enabled,
    fats_enabled,
    strength_condition_mode,
    cardio_condition_mode,
    nutrition_condition_mode,
    active_metrics_count,
    met_strength_time,
    met_strength_volume,
    met_cardio_time,
    met_cardio_distance,
    met_calories,
    met_protein,
    met_carbs,
    met_fats,
    strength_met,
    cardio_met,
    nutrition_met,
    met_all,
    computed_at
  )
  values (
    p_user_id,
    p_goal_date,
    v_snapshot.id,
    coalesce(v_goal_tz, 'UTC'),
    v_distance_unit,
    v_strength_volume_unit,
    v_strength_time_actual,
    v_strength_volume_actual,
    v_cardio_time_actual,
    v_cardio_distance_actual,
    v_kcal_actual,
    v_protein_actual,
    v_carbs_actual,
    v_fats_actual,
    case when v_strength_time_enabled then v_snapshot.strength_time_min else null end,
    case when v_strength_volume_enabled then v_snapshot.strength_volume_min else null end,
    case when v_cardio_time_enabled then v_snapshot.cardio_time_min else null end,
    case when v_cardio_distance_enabled then v_snapshot.cardio_distance else null end,
    case when v_calories_enabled then v_snapshot.calorie_goal_mode else 'disabled'::public.calorie_goal_mode end,
    case when v_calories_enabled then v_snapshot.calorie_target_kcal else null end,
    case when v_protein_enabled then v_snapshot.protein_target_g else null end,
    case when v_carbs_enabled then v_snapshot.carbs_target_g else null end,
    case when v_fats_enabled then v_snapshot.fats_target_g else null end,
    v_strength_time_enabled,
    v_strength_volume_enabled,
    v_cardio_time_enabled,
    v_cardio_distance_enabled,
    v_protein_enabled,
    v_carbs_enabled,
    v_fats_enabled,
    v_strength_condition_mode,
    v_cardio_condition_mode,
    v_nutrition_condition_mode,
    v_active_metrics_count,
    v_met_strength_time,
    v_met_strength_volume,
    v_met_cardio_time,
    v_met_cardio_distance,
    v_met_calories,
    v_met_protein,
    v_met_carbs,
    v_met_fats,
    v_strength_met,
    v_cardio_met,
    v_nutrition_met,
    v_met_all,
    now()
  )
  on conflict (user_id, date) do update
  set goal_snapshot_id = excluded.goal_snapshot_id,
      timezone_str = excluded.timezone_str,
      distance_unit = excluded.distance_unit,
      strength_volume_unit = excluded.strength_volume_unit,
      strength_time_min_actual = excluded.strength_time_min_actual,
      strength_volume_actual = excluded.strength_volume_actual,
      cardio_time_min_actual = excluded.cardio_time_min_actual,
      cardio_distance_actual = excluded.cardio_distance_actual,
      kcal_actual = excluded.kcal_actual,
      protein_g_actual = excluded.protein_g_actual,
      carbs_g_actual = excluded.carbs_g_actual,
      fats_g_actual = excluded.fats_g_actual,
      strength_time_min_target = excluded.strength_time_min_target,
      strength_volume_target = excluded.strength_volume_target,
      cardio_time_min_target = excluded.cardio_time_min_target,
      cardio_distance_target = excluded.cardio_distance_target,
      calorie_goal_mode = excluded.calorie_goal_mode,
      calorie_target_kcal = excluded.calorie_target_kcal,
      protein_target_g = excluded.protein_target_g,
      carbs_target_g = excluded.carbs_target_g,
      fats_target_g = excluded.fats_target_g,
      strength_use_time = excluded.strength_use_time,
      strength_use_volume = excluded.strength_use_volume,
      cardio_use_time = excluded.cardio_use_time,
      cardio_use_distance = excluded.cardio_use_distance,
      protein_enabled = excluded.protein_enabled,
      carbs_enabled = excluded.carbs_enabled,
      fats_enabled = excluded.fats_enabled,
      strength_condition_mode = excluded.strength_condition_mode,
      cardio_condition_mode = excluded.cardio_condition_mode,
      nutrition_condition_mode = excluded.nutrition_condition_mode,
      active_metrics_count = excluded.active_metrics_count,
      met_strength_time = excluded.met_strength_time,
      met_strength_volume = excluded.met_strength_volume,
      met_cardio_time = excluded.met_cardio_time,
      met_cardio_distance = excluded.met_cardio_distance,
      met_calories = excluded.met_calories,
      met_protein = excluded.met_protein,
      met_carbs = excluded.met_carbs,
      met_fats = excluded.met_fats,
      strength_met = excluded.strength_met,
      cardio_met = excluded.cardio_met,
      nutrition_met = excluded.nutrition_met,
      met_all = excluded.met_all,
      computed_at = excluded.computed_at
  returning * into v_row;

  insert into "user".daily_goal_status (
    user_id,
    goal_date,
    strength_met,
    cardio_met,
    nutrition_met,
    inserted_at,
    updated_at
  )
  values (
    p_user_id,
    p_goal_date,
    v_strength_met,
    v_cardio_met,
    v_nutrition_met,
    now(),
    now()
  )
  on conflict (user_id, goal_date) do update
  set strength_met = excluded.strength_met,
      cardio_met = excluded.cardio_met,
      nutrition_met = excluded.nutrition_met,
      updated_at = now();

  return v_row;
end;
$$;

create or replace function "user".refresh_my_goal_results(
  p_goal_date date default null
)
returns setof "user".daily_goal_results
language plpgsql
security definer
set search_path = public, "user"
as $$
declare
  v_uid uuid := auth.uid();
  v_row "user".daily_goal_results%rowtype;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  v_row := "user".recompute_daily_goal_results(v_uid, coalesce(p_goal_date, current_date));
  if v_row is null then
    return;
  end if;

  return next v_row;
end;
$$;

grant execute on function "user".refresh_my_goal_results(date) to authenticated;

create or replace function "user".list_visible_goal_calendar_user(
  p_user_id uuid,
  p_start date,
  p_end date
)
returns setof "user".daily_goal_results
language plpgsql
security definer
set search_path = public, "user", social
as $$
declare
  v_me uuid := auth.uid();
begin
  if p_user_id is null or p_start is null or p_end is null then
    return;
  end if;

  if v_me is not null and v_me = p_user_id then
    return query
    select *
    from "user".daily_goal_results
    where user_id = p_user_id
      and date >= p_start
      and date <= p_end
    order by date asc;
    return;
  end if;

  if v_me is not null and social.is_blocked(v_me, p_user_id) then
    return;
  end if;

  if social.profile_is_private(p_user_id)
     and (v_me is null or not social.is_following(v_me, p_user_id)) then
    return;
  end if;

  return query
  select *
  from "user".daily_goal_results
  where user_id = p_user_id
    and date >= p_start
    and date <= p_end
  order by date asc;
end;
$$;

grant execute on function "user".list_visible_goal_calendar_user(uuid, date, date) to authenticated;

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
    v_old_date := "user".goal_local_date(coalesce(old.ended_at, old.started_at), to_jsonb(old)->>'timezone_str');
    if old.user_id is not null and v_old_date is not null then
      perform "user".recompute_daily_goal_results(old.user_id, v_old_date);
    end if;
    return old;
  end if;

  v_new_date := "user".goal_local_date(coalesce(new.ended_at, new.started_at), to_jsonb(new)->>'timezone_str');

  if tg_op = 'UPDATE' then
    v_old_date := "user".goal_local_date(coalesce(old.ended_at, old.started_at), to_jsonb(old)->>'timezone_str');
    if old.user_id is not null and v_old_date is not null and (v_old_date <> v_new_date or old.user_id <> new.user_id) then
      perform "user".recompute_daily_goal_results(old.user_id, v_old_date);
    end if;
  end if;

  if new.user_id is not null and v_new_date is not null then
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
    v_old_date := "user".goal_local_date(old.ended_at, to_jsonb(old)->>'timezone_str');
    if old.user_id is not null and v_old_date is not null then
      perform "user".recompute_daily_goal_results(old.user_id, v_old_date);
    end if;
    return old;
  end if;

  v_new_date := "user".goal_local_date(new.ended_at, to_jsonb(new)->>'timezone_str');

  if tg_op = 'UPDATE' then
    v_old_date := "user".goal_local_date(old.ended_at, to_jsonb(old)->>'timezone_str');
    if old.user_id is not null and v_old_date is not null and (v_old_date <> v_new_date or old.user_id <> new.user_id) then
      perform "user".recompute_daily_goal_results(old.user_id, v_old_date);
    end if;
  end if;

  if new.user_id is not null and v_new_date is not null then
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
    v_old_date := "user".goal_local_date(coalesce(old.ended_at, old.started_at), to_jsonb(old)->>'timezone_str');
    if old.user_id is not null and v_old_date is not null then
      perform "user".recompute_daily_goal_results(old.user_id, v_old_date);
    end if;
    return old;
  end if;

  v_new_date := "user".goal_local_date(coalesce(new.ended_at, new.started_at), to_jsonb(new)->>'timezone_str');

  if tg_op = 'UPDATE' then
    v_old_date := "user".goal_local_date(coalesce(old.ended_at, old.started_at), to_jsonb(old)->>'timezone_str');
    if old.user_id is not null and v_old_date is not null and (v_old_date <> v_new_date or old.user_id <> new.user_id) then
      perform "user".recompute_daily_goal_results(old.user_id, v_old_date);
    end if;
  end if;

  if new.user_id is not null and v_new_date is not null then
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
    if old.user_id is not null and old.date is not null then
      perform "user".recompute_daily_goal_results(old.user_id, old.date);
    end if;
    return old;
  end if;

  if tg_op = 'UPDATE' and old.user_id is not null and old.date is not null and (old.user_id <> new.user_id or old.date <> new.date) then
    perform "user".recompute_daily_goal_results(old.user_id, old.date);
  end if;

  if new.user_id is not null and new.date is not null then
    perform "user".recompute_daily_goal_results(new.user_id, new.date);
  end if;

  return new;
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
    execute 'drop trigger if exists trg_sync_goal_results_from_strength_workout on strength.strength_workouts';
    execute 'create trigger trg_sync_goal_results_from_strength_workout
      after insert or update of user_id, started_at, ended_at, total_vol
      on strength.strength_workouts
      for each row
      execute function "user".sync_goal_results_from_strength_workout()';

    execute 'drop trigger if exists trg_recompute_goal_results_after_strength_delete on strength.strength_workouts';
    execute 'create trigger trg_recompute_goal_results_after_strength_delete
      after delete on strength.strength_workouts
      for each row
      execute function "user".sync_goal_results_from_strength_workout()';
  end if;

  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'run_walk'
      and table_name = 'sessions'
  ) then
    execute 'drop trigger if exists trg_sync_goal_results_from_run_walk_session on run_walk.sessions';
    execute 'create trigger trg_sync_goal_results_from_run_walk_session
      after insert or update of user_id, status, ended_at, total_time_s, total_distance_m
      on run_walk.sessions
      for each row
      execute function "user".sync_goal_results_from_run_walk_session()';

    execute 'drop trigger if exists trg_recompute_goal_results_after_run_walk_delete on run_walk.sessions';
    execute 'create trigger trg_recompute_goal_results_after_run_walk_delete
      after delete on run_walk.sessions
      for each row
      execute function "user".sync_goal_results_from_run_walk_session()';
  end if;

  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'run_walk'
      and table_name = 'outdoor_sessions'
  ) then
    execute 'drop trigger if exists trg_sync_goal_results_from_outdoor_session on run_walk.outdoor_sessions';
    execute 'create trigger trg_sync_goal_results_from_outdoor_session
      after insert or update of user_id, status, started_at, ended_at, duration_s, distance_m
      on run_walk.outdoor_sessions
      for each row
      execute function "user".sync_goal_results_from_outdoor_session()';

    execute 'drop trigger if exists trg_recompute_goal_results_after_outdoor_delete on run_walk.outdoor_sessions';
    execute 'create trigger trg_recompute_goal_results_after_outdoor_delete
      after delete on run_walk.outdoor_sessions
      for each row
      execute function "user".sync_goal_results_from_outdoor_session()';
  end if;

  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'nutrition'
      and table_name = 'diary_days'
  ) then
    execute 'drop trigger if exists trg_sync_goal_results_from_nutrition_day on nutrition.diary_days';
    execute 'create trigger trg_sync_goal_results_from_nutrition_day
      after insert or update of user_id, date, timezone_str, kcal_total, protein_g_total, carbs_g_total, fat_g_total
      on nutrition.diary_days
      for each row
      execute function "user".sync_goal_results_from_nutrition_day()';

    execute 'drop trigger if exists trg_recompute_goal_results_after_nutrition_delete on nutrition.diary_days';
    execute 'create trigger trg_recompute_goal_results_after_nutrition_delete
      after delete on nutrition.diary_days
      for each row
      execute function "user".sync_goal_results_from_nutrition_day()';
  end if;
end;
$$;

alter table if exists "user".user_goal_snapshots enable row level security;
alter table if exists "user".daily_goal_results enable row level security;
alter table if exists "user".daily_goal_status enable row level security;

drop policy if exists user_goal_snapshots_select_own on "user".user_goal_snapshots;
create policy user_goal_snapshots_select_own
on "user".user_goal_snapshots
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists user_goal_snapshots_insert_own on "user".user_goal_snapshots;
create policy user_goal_snapshots_insert_own
on "user".user_goal_snapshots
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists user_goal_snapshots_update_own on "user".user_goal_snapshots;
create policy user_goal_snapshots_update_own
on "user".user_goal_snapshots
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists daily_goal_results_select_own on "user".daily_goal_results;
create policy daily_goal_results_select_own
on "user".daily_goal_results
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists daily_goal_status_select_own on "user".daily_goal_status;
create policy daily_goal_status_select_own
on "user".daily_goal_status
for select
to authenticated
using (auth.uid() = user_id);

grant select, insert, update on "user".user_goal_snapshots to authenticated;
grant select on "user".daily_goal_results to authenticated;
grant select on "user".daily_goal_status to authenticated;

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
      '20260228_zz_goal_tracking_conditions_and_daily_results',
      'Added AND/OR goal modes, goal-result aggregation, and DB triggers that keep one per-day goal row in sync with strength, cardio, and nutrition activity.'
    )
    on conflict (change_key) do nothing;
  end if;
end;
$$;

commit;
