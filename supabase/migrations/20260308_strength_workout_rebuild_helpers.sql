begin;

create schema if not exists strength;

create or replace function strength.recompute_strength_workout_total_vol(
  p_workout_id uuid
)
returns numeric
language plpgsql
set search_path = public, strength
as $$
declare
  v_total_vol numeric(12, 2);
begin
  if p_workout_id is null then
    raise exception 'Workout ID is required';
  end if;

  if not exists (
    select 1
    from strength.strength_workouts
    where id = p_workout_id
  ) then
    raise exception 'Strength workout % not found', p_workout_id;
  end if;

  select coalesce(
    round(
      sum(
        case
          when ss.weight is null or ss.reps is null then 0::numeric
          when ss.weight_unit_csv::text = 'lb' then
            (ss.weight::numeric / 2.20462) * greatest(ss.reps, 0)
          else
            ss.weight::numeric * greatest(ss.reps, 0)
        end
      ),
      2
    ),
    0
  )
  into v_total_vol
  from strength.strength_sets ss
  where ss.strength_workout_id = p_workout_id;

  update strength.strength_workouts
  set total_vol = v_total_vol
  where id = p_workout_id;

  return v_total_vol;
end;
$$;

create or replace function strength.rebuild_exercise_summary_for_workout(
  p_workout_id uuid
)
returns integer
language plpgsql
set search_path = public, strength
as $$
declare
  v_user_id uuid;
  v_rows_inserted integer := 0;
begin
  if p_workout_id is null then
    raise exception 'Workout ID is required';
  end if;

  select w.user_id
  into v_user_id
  from strength.strength_workouts w
  where w.id = p_workout_id;

  if v_user_id is null then
    raise exception 'Strength workout % not found', p_workout_id;
  end if;

  delete from strength.exercise_summary
  where strength_workout_id = p_workout_id;

  with set_metrics as (
    select
      ss.exercise_id,
      case
        when ss.weight is null then null::numeric
        when ss.weight_unit_csv::text = 'lb' then ss.weight::numeric / 2.20462
        else ss.weight::numeric
      end as weight_kg,
      greatest(coalesce(ss.reps, 0), 0)::numeric as reps_value,
      case
        when ss.est_1rm is not null then ss.est_1rm::numeric
        when ss.weight is null or ss.reps is null then null::numeric
        when ss.weight_unit_csv::text = 'lb' then
          (ss.weight::numeric / 2.20462) * (1 + ss.reps::numeric / 30.0)
        else
          ss.weight::numeric * (1 + ss.reps::numeric / 30.0)
      end as est_1rm_kg,
      ss.performed_at
    from strength.strength_sets ss
    where ss.strength_workout_id = p_workout_id
  ),
  summary_rows as (
    select
      sm.exercise_id,
      round(sum(coalesce(sm.weight_kg, 0) * sm.reps_value), 2) as vol,
      round(max(coalesce(sm.weight_kg, 0)), 3) as strongest_set,
      round(max(coalesce(sm.est_1rm_kg, 0)), 3) as best_est_1rm,
      round(avg(sm.weight_kg), 3) as avg_set,
      coalesce(max(sm.performed_at), now()) as created_at
    from set_metrics sm
    group by sm.exercise_id
  )
  insert into strength.exercise_summary (
    user_id,
    exercise_id,
    strength_workout_id,
    vol,
    strongest_set,
    best_est_1rm,
    avg_set,
    created_at
  )
  select
    v_user_id,
    sr.exercise_id,
    p_workout_id,
    sr.vol,
    sr.strongest_set,
    sr.best_est_1rm,
    sr.avg_set,
    sr.created_at
  from summary_rows sr;

  get diagnostics v_rows_inserted = row_count;

  return v_rows_inserted;
end;
$$;

create or replace function strength.rebuild_strength_workout_aggregates(
  p_workout_id uuid
)
returns void
language plpgsql
set search_path = public, strength
as $$
begin
  perform strength.recompute_strength_workout_total_vol(p_workout_id);
  perform strength.rebuild_exercise_summary_for_workout(p_workout_id);
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
      '20260308_strength_workout_rebuild_helpers',
      'Added helper functions to rebuild strength workout total volume and per-exercise summaries from strength.strength_sets.'
    )
    on conflict (change_key) do nothing;
  end if;
end;
$$;

commit;
