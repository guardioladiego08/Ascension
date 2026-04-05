-- Strength exercise detail tabs demo seed
-- Seeds a few exercises with rich set history for the Overview, History, and Trends tabs.
-- Safe to rerun: it rewrites only demo workouts created by this file.
--
-- How to use:
-- 1) Run migration `20260308_strength_workout_rebuild_helpers.sql` if it is not already applied.
-- 2) Run this file in the Supabase SQL Editor.
-- 3) Open Progress -> Strength -> Exercises and choose one of the seeded demo exercises.

begin;

do $$
declare
  v_user_id uuid := '8e97a18c-d549-424c-8aa2-aed32961de70';
  v_timezone text := 'America/Los_Angeles';
  v_session_count integer := 20;

  v_now_local_ts timestamp without time zone;
  v_started_local_ts timestamp without time zone;
  v_started_at timestamptz;
  v_ended_at timestamptz;
  v_duration_min integer;

  v_exercise_ids uuid[];
  v_exercise_names text[];
  v_exercise_idx integer;
  v_session_idx integer;
  v_set_idx integer;

  v_exercise_id uuid;
  v_exercise_name text;
  v_seed_tag text;
  v_workout_id uuid;
  v_peak_weight_kg numeric;
  v_set_weights numeric[];
  v_set_reps integer[];

  v_inserted integer := 0;
  v_updated integer := 0;
begin
  if not exists (
    select 1
    from auth.users
    where id = v_user_id
  ) then
    raise exception 'User % not found in auth.users', v_user_id;
  end if;

  if to_regclass('strength.strength_workouts') is null
    or to_regclass('strength.strength_sets') is null
    or to_regclass('strength.exercise_summary') is null then
    raise exception 'Run the strength schema migrations before seeding exercise detail demo data.';
  end if;

  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'strength'
      and p.proname = 'rebuild_strength_workout_aggregates'
  ) then
    raise exception 'Run migration 20260308_strength_workout_rebuild_helpers.sql before seeding exercise detail demo data.';
  end if;

  with preferred_exercises as (
    select id, exercise_name
    from public.exercises
    where lower(exercise_name) in (
      'bench press',
      'barbell bench press',
      'barbell back squat',
      'back squat',
      'deadlift',
      'romanian deadlift',
      'lat pulldown',
      'barbell row',
      'overhead press',
      'dumbbell shoulder press'
    )
    order by exercise_name
    limit 4
  ),
  fallback_exercises as (
    select id, exercise_name
    from public.exercises
    where id not in (select id from preferred_exercises)
    order by exercise_name
    limit greatest(0, 4 - (select count(*) from preferred_exercises))
  ),
  chosen_exercises as (
    select id, exercise_name from preferred_exercises
    union all
    select id, exercise_name from fallback_exercises
  )
  select
    array_agg(id order by exercise_name),
    array_agg(exercise_name order by exercise_name)
  into
    v_exercise_ids,
    v_exercise_names
  from chosen_exercises;

  if coalesce(array_length(v_exercise_ids, 1), 0) < 3 then
    raise exception 'Not enough exercises available in public.exercises to seed exercise detail demo data.';
  end if;

  v_now_local_ts := timezone(v_timezone, now());

  for v_exercise_idx in 1..array_length(v_exercise_ids, 1) loop
    v_exercise_id := v_exercise_ids[v_exercise_idx];
    v_exercise_name := v_exercise_names[v_exercise_idx];

    for v_session_idx in 1..v_session_count loop
      v_started_local_ts :=
        date_trunc('day', v_now_local_ts)
        - make_interval(days => ((v_session_count - v_session_idx) * 9) + ((v_exercise_idx - 1) * 2))
        + make_interval(hours => 17 + mod(v_exercise_idx, 2), mins => 8 + mod(v_session_idx * 3, 22));

      if v_started_local_ts >= v_now_local_ts then
        continue;
      end if;

      v_duration_min := 40 + (v_exercise_idx * 4) + (mod(v_session_idx, 4) * 5);
      v_started_at := (v_started_local_ts at time zone v_timezone);
      v_ended_at := v_started_at + make_interval(mins => v_duration_min);

      v_seed_tag := format(
        'demo_seed:strength_exercise_detail_tabs:v1:exercise-%s:session-%s',
        lpad(v_exercise_idx::text, 2, '0'),
        lpad(v_session_idx::text, 2, '0')
      );

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
          format('[demo] %s detail %s', v_exercise_name, lpad(v_session_idx::text, 2, '0'))
        )
        returning id into v_workout_id;

        v_inserted := v_inserted + 1;
      else
        update strength.strength_workouts
        set started_at = v_started_at,
            ended_at = null,
            total_vol = 0,
            notes = v_seed_tag,
            privacy = 'private',
            name = format('[demo] %s detail %s', v_exercise_name, lpad(v_session_idx::text, 2, '0'))
        where id = v_workout_id;

        delete from strength.exercise_summary
        where strength_workout_id = v_workout_id;

        delete from strength.strength_sets
        where strength_workout_id = v_workout_id;

        v_updated := v_updated + 1;
      end if;

      v_peak_weight_kg := round(
        (
          34
          + (v_exercise_idx * 17)
          + least(v_session_idx - 1, 15) * 1.85
          - case when mod(v_session_idx, 5) = 0 then 4.5 else 0 end
          + case when mod(v_session_idx, 7) = 0 then 1.5 else 0 end
        )::numeric,
        2
      );

      v_set_weights := array[
        greatest(10::numeric, round((v_peak_weight_kg - 14)::numeric, 2)),
        greatest(12::numeric, round((v_peak_weight_kg - 8)::numeric, 2)),
        greatest(14::numeric, round((v_peak_weight_kg - 3)::numeric, 2)),
        v_peak_weight_kg,
        greatest(12::numeric, round((v_peak_weight_kg - 10)::numeric, 2))
      ];

      v_set_reps := array[
        10 - mod(v_session_idx, 2),
        8,
        6,
        greatest(3, 8 - mod(v_session_idx + v_exercise_idx, 5)),
        10 - mod(v_session_idx + v_exercise_idx, 3)
      ];

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
          case
            when v_set_idx = 1 then 'warmup'
            when v_set_idx = 5 then 'dropset'
            else 'normal'
          end::set_type,
          v_set_weights[v_set_idx],
          'kg'::unit_mass,
          v_set_reps[v_set_idx],
          round(
            (
              v_set_weights[v_set_idx]
              * (1 + v_set_reps[v_set_idx]::numeric / 30.0)
            )::numeric,
            3
          ),
          format('demo seed %s set %s', v_exercise_name, v_set_idx),
          v_started_at + make_interval(mins => v_set_idx * 6)
        );
      end loop;

      perform strength.rebuild_strength_workout_aggregates(v_workout_id);

      update strength.strength_workouts
      set ended_at = v_ended_at
      where id = v_workout_id;
    end loop;
  end loop;

  raise notice 'Seeded % new and refreshed % existing strength exercise detail demo workouts for user %.',
    v_inserted,
    v_updated,
    v_user_id;
end;
$$;

commit;
