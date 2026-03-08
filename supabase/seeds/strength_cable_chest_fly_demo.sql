-- Cable Chest Fly demo seed
-- Persists data for exercise-progress testing. Safe to rerun:
-- it only rewrites demo workouts created by this script.
--
-- How to use:
-- 1) Run migration `20260308_strength_workout_rebuild_helpers.sql`.
-- 2) Run this file in Supabase SQL Editor.
-- 3) Open Strength Progress -> Exercises -> Cable Chest Fly.

begin;

do $$
declare
  v_user_id uuid := '21d718b6-0ab8-4367-9e5b-88bf3ec159da';
  v_exercise_id uuid := '1c6647c2-e3b9-4ca1-9d81-c7176fac346b';
  v_exercise_name text := 'Cable Chest Fly';
  v_session_count integer := 12;
  v_idx integer;
  v_set_idx integer;
  v_workout_id uuid;
  v_seed_tag text;
  v_started_at timestamptz;
  v_ended_at timestamptz;
  v_base_weight numeric;
  v_set_weights numeric[];
  v_set_reps integer[];
begin
  if not exists (
    select 1
    from auth.users
    where id = v_user_id
  ) then
    raise exception 'User % not found in auth.users', v_user_id;
  end if;

  if not exists (
    select 1
    from public.exercises
    where id = v_exercise_id
  ) then
    raise exception 'Exercise % not found in public.exercises', v_exercise_id;
  end if;

  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'strength'
      and p.proname = 'rebuild_strength_workout_aggregates'
  ) then
    raise exception 'Run migration 20260308_strength_workout_rebuild_helpers.sql before seeding.';
  end if;

  for v_idx in 1..v_session_count loop
    v_seed_tag := format(
      'demo_seed:cable_chest_fly_overview:v1:session-%s',
      lpad(v_idx::text, 2, '0')
    );

    v_started_at :=
      date_trunc('day', now())
      - make_interval(days => (v_session_count - v_idx) * 7)
      + interval '18 hours';
    v_ended_at := v_started_at + make_interval(mins => 34 + v_idx);

    if v_idx <= 4 then
      v_base_weight := 14 + v_idx;
      v_set_weights := array[
        v_base_weight,
        v_base_weight + 2,
        v_base_weight + 2,
        v_base_weight + 4
      ];
      v_set_reps := array[15, 14, 12, 10];
    elsif v_idx <= 8 then
      v_base_weight := 18 + (v_idx - 4);
      v_set_weights := array[
        v_base_weight,
        v_base_weight + 2,
        v_base_weight + 4,
        v_base_weight + 4
      ];
      v_set_reps := array[12, 10, 10, 8];
    else
      v_base_weight := 22 + (v_idx - 8);
      v_set_weights := array[
        v_base_weight,
        v_base_weight + 2,
        v_base_weight + 4,
        v_base_weight + 4
      ];
      v_set_reps := array[10, 8, 8, 6];
    end if;

    select w.id
    into v_workout_id
    from strength.strength_workouts w
    where w.user_id = v_user_id
      and w.notes = v_seed_tag
    limit 1;

    if v_workout_id is null then
      insert into strength.strength_workouts (
        user_id,
        started_at,
        ended_at,
        total_vol,
        notes,
        privacy,
        name
      )
      values (
        v_user_id,
        v_started_at,
        null,
        0,
        v_seed_tag,
        'private',
        format('[demo] %s %s', v_exercise_name, lpad(v_idx::text, 2, '0'))
      )
      returning id into v_workout_id;
    else
      update strength.strength_workouts
      set started_at = v_started_at,
          ended_at = null,
          total_vol = 0,
          notes = v_seed_tag,
          privacy = 'private',
          name = format('[demo] %s %s', v_exercise_name, lpad(v_idx::text, 2, '0'))
      where id = v_workout_id;

      delete from strength.exercise_summary
      where strength_workout_id = v_workout_id;

      delete from strength.strength_sets
      where strength_workout_id = v_workout_id;
    end if;

    for v_set_idx in 1..array_length(v_set_weights, 1) loop
      insert into strength.strength_sets (
        exercise_id,
        strength_workout_id,
        set_index,
        set_type,
        weight,
        weight_unit_csv,
        reps,
        est_1rm,
        notes,
        performed_at
      )
      values (
        v_exercise_id,
        v_workout_id,
        v_set_idx,
        'normal',
        v_set_weights[v_set_idx],
        'kg',
        v_set_reps[v_set_idx],
        round(
          (
            v_set_weights[v_set_idx]
            * (1 + v_set_reps[v_set_idx]::numeric / 30.0)
          )::numeric,
          3
        ),
        format('demo set %s', v_set_idx),
        v_started_at + make_interval(mins => v_set_idx * 6)
      );
    end loop;

    perform strength.rebuild_strength_workout_aggregates(v_workout_id);

    update strength.strength_workouts
    set ended_at = v_ended_at
    where id = v_workout_id;
  end loop;

  raise notice 'Seeded % demo Cable Chest Fly workouts for user %', v_session_count, v_user_id;
end;
$$;

commit;
