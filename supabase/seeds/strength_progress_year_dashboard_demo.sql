-- Strength progress dashboard demo seed
-- Generates a deterministic mix of completed strength workouts spanning 56 weeks.
-- Safe to rerun within the same week: workouts are matched by exact started_at timestamps and updated.
--
-- How to use:
-- 1) Replace v_user_id with a real auth.users id from your project.
-- 2) Run migration `20260308_strength_workout_rebuild_helpers.sql` if it is not already applied.
-- 3) Run this file in the Supabase SQL Editor.
-- 4) Open Progress -> Strength to test the dashboard timelines and exercise entry button.

begin;

do $$
declare
  v_user_id uuid := '8e97a18c-d549-424c-8aa2-aed32961de70';
  v_timezone text := 'America/Los_Angeles';
  v_week_count integer := 56;

  v_now_local_ts timestamp without time zone;
  v_current_week_start date;
  v_start_week date;
  v_week_start date;
  v_session_day date;
  v_local_start time;
  v_candidate_local_ts timestamp without time zone;

  v_week_idx integer;
  v_session_slot integer;
  v_set_idx integer;

  v_duration_min integer;
  v_started_at timestamptz;
  v_ended_at timestamptz;
  v_workout_id uuid;
  v_workout_name text;
  v_seed_tag text;

  v_inserted integer := 0;
  v_updated integer := 0;
  v_total_workouts integer := 0;

  v_exercise_ids uuid[];
  v_exercise_names text[];
  v_exercise_id uuid;
  v_exercise_name text;
  v_exercise_offset integer;
  v_rounds integer;
  v_base_weight_kg numeric;
  v_weight_kg numeric;
  v_reps integer;
  v_est_1rm numeric;
  v_workout_total_vol numeric;
  v_weight_unit text := 'kg';
begin
  if not exists (
    select 1
    from auth.users
    where id = v_user_id
  ) then
    raise exception 'User % not found in auth.users', v_user_id;
  end if;

  if to_regclass('strength.strength_workouts') is null
    or to_regclass('strength.strength_sets') is null then
    raise exception 'Run the strength schema migrations before seeding strength progress demo data.';
  end if;

  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'strength'
      and p.proname = 'rebuild_strength_workout_aggregates'
  ) then
    raise exception 'Run migration 20260308_strength_workout_rebuild_helpers.sql before seeding strength progress demo data.';
  end if;

  with preferred_exercises as (
    select *
    from public.exercises
    where lower(exercise_name) in (
      'barbell back squat',
      'back squat',
      'bench press',
      'barbell bench press',
      'deadlift',
      'romanian deadlift',
      'overhead press',
      'lat pulldown',
      'barbell row',
      'leg press',
      'dumbbell shoulder press',
      'cable row'
    )
    order by exercise_name
    limit 8
  ),
  fallback_exercises as (
    select *
    from public.exercises
    where id not in (select id from preferred_exercises)
    order by exercise_name
    limit greatest(0, 8 - (select count(*) from preferred_exercises))
  ),
  chosen_exercises as (
    select id, exercise_name
    from preferred_exercises
    union all
    select id, exercise_name
    from fallback_exercises
  )
  select
    array_agg(id order by exercise_name),
    array_agg(exercise_name order by exercise_name)
  into
    v_exercise_ids,
    v_exercise_names
  from chosen_exercises;

  if coalesce(array_length(v_exercise_ids, 1), 0) < 4 then
    raise exception 'Not enough exercises available in public.exercises to seed strength dashboard data.';
  end if;

  v_now_local_ts := timezone(v_timezone, now());
  v_current_week_start := date_trunc('week', v_now_local_ts)::date;
  v_start_week := v_current_week_start - ((v_week_count - 1) * 7);

  for v_week_idx in 0..(v_week_count - 1) loop
    v_week_start := v_start_week + (v_week_idx * 7);

    for v_session_slot in 1..3 loop
      v_session_day := v_week_start
        + case v_session_slot
            when 1 then 1
            when 2 then 3
            else 5
          end;
      v_local_start := case v_session_slot
        when 1 then time '06:10'
        when 2 then time '17:45'
        else time '08:05'
      end;
      v_candidate_local_ts := v_session_day::timestamp + v_local_start;

      if v_candidate_local_ts >= v_now_local_ts then
        continue;
      end if;

      if v_session_slot = 3 and mod(v_week_idx, 5) = 2 then
        continue;
      end if;

      v_duration_min := case v_session_slot
        when 1 then 46 + mod(v_week_idx, 4) * 4
        when 2 then 58 + mod(v_week_idx, 5) * 5
        else 72 + mod(v_week_idx, 6) * 4
      end;

      v_started_at := (v_candidate_local_ts at time zone v_timezone);
      v_ended_at := v_started_at + make_interval(mins => v_duration_min);
      v_workout_name := case v_session_slot
        when 1 then 'Lower Body Focus'
        when 2 then 'Upper Body Focus'
        else 'Full Body Strength'
      end;
      v_seed_tag := format(
        'demo_seed:strength_progress_year:v1:week-%s:session-%s',
        lpad((v_week_idx + 1)::text, 2, '0'),
        v_session_slot
      );

      select w.id
      into v_workout_id
      from strength.strength_workouts w
      where w.user_id = v_user_id
        and w.started_at = v_started_at
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
          format('[demo] %s', v_workout_name)
        )
        returning id into v_workout_id;

        v_inserted := v_inserted + 1;
      else
        update strength.strength_workouts
        set ended_at = null,
            total_vol = 0,
            notes = v_seed_tag,
            privacy = 'private',
            name = format('[demo] %s', v_workout_name)
        where id = v_workout_id;

        delete from strength.exercise_summary
        where strength_workout_id = v_workout_id;

        delete from strength.strength_sets
        where strength_workout_id = v_workout_id;

        v_updated := v_updated + 1;
      end if;

      v_workout_total_vol := 0;

      for v_exercise_offset in 0..2 loop
        v_exercise_id :=
          v_exercise_ids[
            1
            + mod((v_week_idx * 2) + (v_session_slot * 3) + v_exercise_offset, array_length(v_exercise_ids, 1))
          ];
        v_exercise_name :=
          v_exercise_names[
            1
            + mod((v_week_idx * 2) + (v_session_slot * 3) + v_exercise_offset, array_length(v_exercise_names, 1))
          ];
        v_rounds := case when v_session_slot = 3 then 5 else 4 end;
        v_base_weight_kg := round(
          (
            26
            + (v_session_slot * 8)
            + (v_exercise_offset * 6)
            + least(v_week_idx, 40) * 0.85
            - case when mod(v_week_idx + 1, 4) = 0 then 6 else 0 end
          )::numeric,
          2
        );

        for v_set_idx in 1..v_rounds loop
          v_weight_kg := round(
            (
              v_base_weight_kg
              + (v_set_idx - 1) * 2.5
              + case when mod(v_week_idx, 6) = 0 and v_set_idx = v_rounds then 1.25 else 0 end
            )::numeric,
            2
          );
          v_reps := greatest(
            5,
            case v_session_slot
              when 1 then 10 - (v_set_idx - 1) - mod(v_week_idx, 2)
              when 2 then 9 - (v_set_idx - 1)
              else 8 - (v_set_idx - 1)
            end
          );
          v_est_1rm := round((v_weight_kg * (1 + v_reps::numeric / 30.0))::numeric, 3);
          v_workout_total_vol := v_workout_total_vol + (v_weight_kg * v_reps);

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
            (v_exercise_offset * 10) + v_set_idx,
            'normal',
            v_weight_kg,
            v_weight_unit::unit_mass,
            v_reps,
            v_est_1rm,
            format('demo seed %s set %s', v_exercise_name, v_set_idx),
            v_started_at + make_interval(mins => (v_exercise_offset * 18) + (v_set_idx * 4))
          );
        end loop;
      end loop;

      update strength.strength_workouts
      set total_vol = round(v_workout_total_vol::numeric, 2)
      where id = v_workout_id;

      perform strength.rebuild_strength_workout_aggregates(v_workout_id);

      update strength.strength_workouts
      set ended_at = v_ended_at
      where id = v_workout_id;

      v_total_workouts := v_total_workouts + 1;
    end loop;
  end loop;

  raise notice
    'Strength progress demo ready for user %: % workouts inserted, % workouts updated, % total workouts seeded, range % -> %.',
    v_user_id,
    v_inserted,
    v_updated,
    v_total_workouts,
    v_start_week,
    v_now_local_ts::date;
end;
$$;

commit;
