-- Strength social radar preview demo seed
-- Creates three rerunnable shared-strength workouts plus linked social posts for:
--   8e97a18c-d549-424c-8aa2-aed32961de70
--
-- How to use:
-- 1) Run migrations `20260308_strength_workout_rebuild_helpers.sql` and
--    `20260402_strength_muscle_profile_radar_support.sql` first.
-- 2) Run this file in the Supabase SQL Editor.
-- 3) Open the seeded user's profile Activity tab to verify compact strength radar cards.
-- 4) Open the seeded user's Posts tab, or follow this user from another account to see the feed-card version.

begin;

do $$
declare
  v_user_id uuid := '8e97a18c-d549-424c-8aa2-aed32961de70';
  v_timezone text := 'America/Los_Angeles';

  v_ex_incline_press_id uuid := '8b385d50-3ad4-46c7-bda8-2645e49ef2aa';
  v_ex_seated_press_id uuid := 'c86a1c30-d93b-47af-94ec-96b5c88f8805';
  v_ex_pushdown_id uuid := 'e2fcb29e-fcb4-4ca1-b2b1-53cccd22f00a';
  v_ex_rdl_id uuid := '8452e5d4-a434-4120-9994-fef6ec6ad911';
  v_ex_row_id uuid := 'ab766de8-4adc-4bd4-a62c-dc41528062d5';
  v_ex_split_squat_id uuid := '295a9643-6856-430b-b18f-cf2264ccbc0c';
  v_ex_sandbag_complex_id uuid := '5b53d373-b981-4f87-b299-f2a284065e6e';

  v_push_workout_id uuid := '36738fdd-a803-4712-812e-1137c37b0d2c';
  v_posterior_workout_id uuid := 'ed411230-1120-4462-a4c3-2328b3856a4f';
  v_circuit_workout_id uuid := '3aa33ec4-f22d-449d-a7f5-6bd7a5e8d124';

  v_now_local_ts timestamp without time zone;

  v_push_local_start timestamp without time zone;
  v_posterior_local_start timestamp without time zone;
  v_circuit_local_start timestamp without time zone;

  v_push_started_at timestamptz;
  v_posterior_started_at timestamptz;
  v_circuit_started_at timestamptz;

  v_push_ended_at timestamptz;
  v_posterior_ended_at timestamptz;
  v_circuit_ended_at timestamptz;

  v_push_duration_s integer := 4200;
  v_posterior_duration_s integer := 5100;
  v_circuit_duration_s integer := 3720;

  v_push_muscle_profile jsonb;
  v_posterior_muscle_profile jsonb;
  v_circuit_muscle_profile jsonb;
begin
  if not exists (
    select 1
    from auth.users
    where id = v_user_id
  ) then
    raise exception 'User % not found in auth.users', v_user_id;
  end if;

  if to_regclass('public.exercises') is null
    or to_regclass('strength.strength_workouts') is null
    or to_regclass('strength.strength_sets') is null
    or to_regclass('strength.exercise_summary') is null
    or to_regclass('social.posts') is null then
    raise exception 'Run the exercise, strength, and social migrations before seeding strength radar preview data.';
  end if;

  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'strength'
      and p.proname = 'rebuild_strength_workout_aggregates'
  ) then
    raise exception 'Run migration 20260308_strength_workout_rebuild_helpers.sql before seeding strength radar preview data.';
  end if;

  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'strength'
      and p.proname = 'get_workout_muscle_profile'
  ) then
    raise exception 'Run migration 20260402_strength_muscle_profile_radar_support.sql before seeding strength radar preview data.';
  end if;

  insert into public.exercises (
    id,
    user_id,
    exercise_name,
    body_parts,
    body_part_weights,
    core_movement,
    workout_category,
    info
  )
  values
    (
      v_ex_incline_press_id,
      null,
      'Demo Radar Incline Press',
      array['chest', 'shoulders', 'triceps']::public.body_part[],
      jsonb_build_array(
        jsonb_build_object('muscle', 'chest', 'weight', 0.6),
        jsonb_build_object('muscle', 'shoulders', 'weight', 0.25),
        jsonb_build_object('muscle', 'triceps', 'weight', 0.15)
      ),
      'chest_push',
      'upper_body',
      'Shared demo exercise for testing chest-dominant radar cards.'
    ),
    (
      v_ex_seated_press_id,
      null,
      'Demo Radar Seated Press',
      array['shoulders', 'triceps', 'chest']::public.body_part[],
      jsonb_build_array(
        jsonb_build_object('muscle', 'shoulders', 'weight', 0.55),
        jsonb_build_object('muscle', 'triceps', 'weight', 0.25),
        jsonb_build_object('muscle', 'chest', 'weight', 0.2)
      ),
      'overhead_push',
      'upper_body',
      'Shared demo exercise for testing shoulder-heavy radar cards.'
    ),
    (
      v_ex_pushdown_id,
      null,
      'Demo Radar Rope Pushdown',
      array['triceps', 'forearms', 'shoulders']::public.body_part[],
      jsonb_build_array(
        jsonb_build_object('muscle', 'triceps', 'weight', 0.72),
        jsonb_build_object('muscle', 'forearms', 'weight', 0.18),
        jsonb_build_object('muscle', 'shoulders', 'weight', 0.1)
      ),
      'tricep_pushdown',
      'upper_body',
      'Shared demo exercise for testing arm-emphasis radar cards.'
    ),
    (
      v_ex_rdl_id,
      null,
      'Demo Radar Romanian Deadlift',
      array['hamstrings', 'glutes', 'core', 'back']::public.body_part[],
      jsonb_build_array(
        jsonb_build_object('muscle', 'hamstrings', 'weight', 0.4),
        jsonb_build_object('muscle', 'glutes', 'weight', 0.3),
        jsonb_build_object('muscle', 'core', 'weight', 0.15),
        jsonb_build_object('muscle', 'back', 'weight', 0.15)
      ),
      'hinge',
      'lower_body',
      'Shared demo exercise for testing posterior-chain radar cards.'
    ),
    (
      v_ex_row_id,
      null,
      'Demo Radar Chest-Supported Row',
      array['back', 'biceps', 'forearms', 'shoulders']::public.body_part[],
      jsonb_build_array(
        jsonb_build_object('muscle', 'back', 'weight', 0.62),
        jsonb_build_object('muscle', 'biceps', 'weight', 0.18),
        jsonb_build_object('muscle', 'forearms', 'weight', 0.12),
        jsonb_build_object('muscle', 'shoulders', 'weight', 0.08)
      ),
      'row',
      'upper_body',
      'Shared demo exercise for testing back-dominant radar cards.'
    ),
    (
      v_ex_split_squat_id,
      null,
      'Demo Radar Rear-Foot Split Squat',
      array['quads', 'glutes', 'hamstrings', 'core', 'calves']::public.body_part[],
      jsonb_build_array(
        jsonb_build_object('muscle', 'quads', 'weight', 0.45),
        jsonb_build_object('muscle', 'glutes', 'weight', 0.23),
        jsonb_build_object('muscle', 'hamstrings', 'weight', 0.12),
        jsonb_build_object('muscle', 'core', 'weight', 0.1),
        jsonb_build_object('muscle', 'calves', 'weight', 0.1)
      ),
      'lunge',
      'lower_body',
      'Shared demo exercise for testing quad and posterior-chain blend radar cards.'
    ),
    (
      v_ex_sandbag_complex_id,
      null,
      'Demo Radar Sandbag Complex',
      array['full_body', 'core', 'shoulders', 'quads']::public.body_part[],
      jsonb_build_array(
        jsonb_build_object('muscle', 'full_body', 'weight', 0.6),
        jsonb_build_object('muscle', 'core', 'weight', 0.2),
        jsonb_build_object('muscle', 'shoulders', 'weight', 0.1),
        jsonb_build_object('muscle', 'quads', 'weight', 0.1)
      ),
      'carry',
      'full_body',
      'Shared demo exercise for testing full-body distribution in radar cards.'
    )
  on conflict (id) do update
  set user_id = excluded.user_id,
      exercise_name = excluded.exercise_name,
      body_parts = excluded.body_parts,
      body_part_weights = excluded.body_part_weights,
      core_movement = excluded.core_movement,
      workout_category = excluded.workout_category,
      info = excluded.info;

  v_now_local_ts := timezone(v_timezone, now());

  v_push_local_start := date_trunc('day', v_now_local_ts) - interval '3 day' + interval '7 hours 12 minutes';
  v_posterior_local_start := date_trunc('day', v_now_local_ts) - interval '2 day' + interval '18 hours 5 minutes';
  v_circuit_local_start := date_trunc('day', v_now_local_ts) - interval '1 day' + interval '6 hours 28 minutes';

  v_push_started_at := v_push_local_start at time zone v_timezone;
  v_posterior_started_at := v_posterior_local_start at time zone v_timezone;
  v_circuit_started_at := v_circuit_local_start at time zone v_timezone;

  v_push_ended_at := v_push_started_at + make_interval(secs => v_push_duration_s);
  v_posterior_ended_at := v_posterior_started_at + make_interval(secs => v_posterior_duration_s);
  v_circuit_ended_at := v_circuit_started_at + make_interval(secs => v_circuit_duration_s);

  insert into strength.strength_workouts (
    id,
    user_id,
    started_at,
    ended_at,
    total_vol,
    notes,
    privacy,
    name
  )
  values
    (
      v_push_workout_id,
      v_user_id,
      v_push_started_at,
      null,
      0,
      'demo_seed:strength_social_radar_preview:v1:push',
      'public',
      '[demo] Upper Push Radar Session'
    ),
    (
      v_posterior_workout_id,
      v_user_id,
      v_posterior_started_at,
      null,
      0,
      'demo_seed:strength_social_radar_preview:v1:posterior',
      'public',
      '[demo] Posterior Chain Radar Session'
    ),
    (
      v_circuit_workout_id,
      v_user_id,
      v_circuit_started_at,
      null,
      0,
      'demo_seed:strength_social_radar_preview:v1:circuit',
      'public',
      '[demo] Full Body Radar Circuit'
    )
  on conflict (id) do update
  set user_id = excluded.user_id,
      started_at = excluded.started_at,
      ended_at = excluded.ended_at,
      total_vol = excluded.total_vol,
      notes = excluded.notes,
      privacy = excluded.privacy,
      name = excluded.name;

  delete from strength.exercise_summary
  where strength_workout_id in (v_push_workout_id, v_posterior_workout_id, v_circuit_workout_id);

  delete from strength.strength_sets
  where strength_workout_id in (v_push_workout_id, v_posterior_workout_id, v_circuit_workout_id);

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
  values
    (
      v_ex_incline_press_id,
      v_push_workout_id,
      1,
      'warmup'::set_type,
      24,
      'kg'::unit_mass,
      12,
      round((24 * (1 + 12::numeric / 30.0))::numeric, 3),
      'Demo radar incline press warmup',
      v_push_started_at + interval '4 minutes'
    ),
    (
      v_ex_incline_press_id,
      v_push_workout_id,
      2,
      'normal'::set_type,
      30,
      'kg'::unit_mass,
      10,
      round((30 * (1 + 10::numeric / 30.0))::numeric, 3),
      'Demo radar incline press set 2',
      v_push_started_at + interval '10 minutes'
    ),
    (
      v_ex_incline_press_id,
      v_push_workout_id,
      3,
      'normal'::set_type,
      34,
      'kg'::unit_mass,
      8,
      round((34 * (1 + 8::numeric / 30.0))::numeric, 3),
      'Demo radar incline press set 3',
      v_push_started_at + interval '16 minutes'
    ),
    (
      v_ex_incline_press_id,
      v_push_workout_id,
      4,
      'normal'::set_type,
      38,
      'kg'::unit_mass,
      6,
      round((38 * (1 + 6::numeric / 30.0))::numeric, 3),
      'Demo radar incline press top set',
      v_push_started_at + interval '22 minutes'
    ),
    (
      v_ex_seated_press_id,
      v_push_workout_id,
      5,
      'warmup'::set_type,
      18,
      'kg'::unit_mass,
      12,
      round((18 * (1 + 12::numeric / 30.0))::numeric, 3),
      'Demo radar seated press warmup',
      v_push_started_at + interval '28 minutes'
    ),
    (
      v_ex_seated_press_id,
      v_push_workout_id,
      6,
      'normal'::set_type,
      22,
      'kg'::unit_mass,
      10,
      round((22 * (1 + 10::numeric / 30.0))::numeric, 3),
      'Demo radar seated press set 2',
      v_push_started_at + interval '34 minutes'
    ),
    (
      v_ex_seated_press_id,
      v_push_workout_id,
      7,
      'normal'::set_type,
      24,
      'kg'::unit_mass,
      8,
      round((24 * (1 + 8::numeric / 30.0))::numeric, 3),
      'Demo radar seated press set 3',
      v_push_started_at + interval '40 minutes'
    ),
    (
      v_ex_seated_press_id,
      v_push_workout_id,
      8,
      'normal'::set_type,
      26,
      'kg'::unit_mass,
      6,
      round((26 * (1 + 6::numeric / 30.0))::numeric, 3),
      'Demo radar seated press top set',
      v_push_started_at + interval '45 minutes'
    ),
    (
      v_ex_pushdown_id,
      v_push_workout_id,
      9,
      'normal'::set_type,
      16,
      'kg'::unit_mass,
      15,
      round((16 * (1 + 15::numeric / 30.0))::numeric, 3),
      'Demo radar pushdown set 1',
      v_push_started_at + interval '49 minutes'
    ),
    (
      v_ex_pushdown_id,
      v_push_workout_id,
      10,
      'normal'::set_type,
      18,
      'kg'::unit_mass,
      12,
      round((18 * (1 + 12::numeric / 30.0))::numeric, 3),
      'Demo radar pushdown set 2',
      v_push_started_at + interval '53 minutes'
    ),
    (
      v_ex_pushdown_id,
      v_push_workout_id,
      11,
      'normal'::set_type,
      20,
      'kg'::unit_mass,
      10,
      round((20 * (1 + 10::numeric / 30.0))::numeric, 3),
      'Demo radar pushdown set 3',
      v_push_started_at + interval '57 minutes'
    ),
    (
      v_ex_pushdown_id,
      v_push_workout_id,
      12,
      'dropset'::set_type,
      22,
      'kg'::unit_mass,
      8,
      round((22 * (1 + 8::numeric / 30.0))::numeric, 3),
      'Demo radar pushdown finisher',
      v_push_started_at + interval '61 minutes'
    ),
    (
      v_ex_rdl_id,
      v_posterior_workout_id,
      1,
      'warmup'::set_type,
      50,
      'kg'::unit_mass,
      10,
      round((50 * (1 + 10::numeric / 30.0))::numeric, 3),
      'Demo radar RDL warmup',
      v_posterior_started_at + interval '5 minutes'
    ),
    (
      v_ex_rdl_id,
      v_posterior_workout_id,
      2,
      'normal'::set_type,
      62,
      'kg'::unit_mass,
      8,
      round((62 * (1 + 8::numeric / 30.0))::numeric, 3),
      'Demo radar RDL set 2',
      v_posterior_started_at + interval '12 minutes'
    ),
    (
      v_ex_rdl_id,
      v_posterior_workout_id,
      3,
      'normal'::set_type,
      68,
      'kg'::unit_mass,
      6,
      round((68 * (1 + 6::numeric / 30.0))::numeric, 3),
      'Demo radar RDL set 3',
      v_posterior_started_at + interval '19 minutes'
    ),
    (
      v_ex_rdl_id,
      v_posterior_workout_id,
      4,
      'normal'::set_type,
      72,
      'kg'::unit_mass,
      6,
      round((72 * (1 + 6::numeric / 30.0))::numeric, 3),
      'Demo radar RDL top set',
      v_posterior_started_at + interval '26 minutes'
    ),
    (
      v_ex_row_id,
      v_posterior_workout_id,
      5,
      'normal'::set_type,
      26,
      'kg'::unit_mass,
      12,
      round((26 * (1 + 12::numeric / 30.0))::numeric, 3),
      'Demo radar row set 1',
      v_posterior_started_at + interval '32 minutes'
    ),
    (
      v_ex_row_id,
      v_posterior_workout_id,
      6,
      'normal'::set_type,
      30,
      'kg'::unit_mass,
      10,
      round((30 * (1 + 10::numeric / 30.0))::numeric, 3),
      'Demo radar row set 2',
      v_posterior_started_at + interval '39 minutes'
    ),
    (
      v_ex_row_id,
      v_posterior_workout_id,
      7,
      'normal'::set_type,
      34,
      'kg'::unit_mass,
      8,
      round((34 * (1 + 8::numeric / 30.0))::numeric, 3),
      'Demo radar row set 3',
      v_posterior_started_at + interval '46 minutes'
    ),
    (
      v_ex_row_id,
      v_posterior_workout_id,
      8,
      'normal'::set_type,
      36,
      'kg'::unit_mass,
      8,
      round((36 * (1 + 8::numeric / 30.0))::numeric, 3),
      'Demo radar row top set',
      v_posterior_started_at + interval '53 minutes'
    ),
    (
      v_ex_split_squat_id,
      v_posterior_workout_id,
      9,
      'normal'::set_type,
      18,
      'kg'::unit_mass,
      12,
      round((18 * (1 + 12::numeric / 30.0))::numeric, 3),
      'Demo radar split squat set 1',
      v_posterior_started_at + interval '59 minutes'
    ),
    (
      v_ex_split_squat_id,
      v_posterior_workout_id,
      10,
      'normal'::set_type,
      20,
      'kg'::unit_mass,
      10,
      round((20 * (1 + 10::numeric / 30.0))::numeric, 3),
      'Demo radar split squat set 2',
      v_posterior_started_at + interval '65 minutes'
    ),
    (
      v_ex_split_squat_id,
      v_posterior_workout_id,
      11,
      'normal'::set_type,
      22,
      'kg'::unit_mass,
      10,
      round((22 * (1 + 10::numeric / 30.0))::numeric, 3),
      'Demo radar split squat set 3',
      v_posterior_started_at + interval '71 minutes'
    ),
    (
      v_ex_split_squat_id,
      v_posterior_workout_id,
      12,
      'normal'::set_type,
      24,
      'kg'::unit_mass,
      8,
      round((24 * (1 + 8::numeric / 30.0))::numeric, 3),
      'Demo radar split squat top set',
      v_posterior_started_at + interval '77 minutes'
    ),
    (
      v_ex_sandbag_complex_id,
      v_circuit_workout_id,
      1,
      'normal'::set_type,
      28,
      'kg'::unit_mass,
      12,
      round((28 * (1 + 12::numeric / 30.0))::numeric, 3),
      'Demo radar sandbag circuit set 1',
      v_circuit_started_at + interval '4 minutes'
    ),
    (
      v_ex_sandbag_complex_id,
      v_circuit_workout_id,
      2,
      'normal'::set_type,
      32,
      'kg'::unit_mass,
      10,
      round((32 * (1 + 10::numeric / 30.0))::numeric, 3),
      'Demo radar sandbag circuit set 2',
      v_circuit_started_at + interval '10 minutes'
    ),
    (
      v_ex_sandbag_complex_id,
      v_circuit_workout_id,
      3,
      'normal'::set_type,
      36,
      'kg'::unit_mass,
      8,
      round((36 * (1 + 8::numeric / 30.0))::numeric, 3),
      'Demo radar sandbag circuit set 3',
      v_circuit_started_at + interval '16 minutes'
    ),
    (
      v_ex_sandbag_complex_id,
      v_circuit_workout_id,
      4,
      'normal'::set_type,
      36,
      'kg'::unit_mass,
      8,
      round((36 * (1 + 8::numeric / 30.0))::numeric, 3),
      'Demo radar sandbag circuit set 4',
      v_circuit_started_at + interval '22 minutes'
    ),
    (
      v_ex_incline_press_id,
      v_circuit_workout_id,
      5,
      'normal'::set_type,
      28,
      'kg'::unit_mass,
      10,
      round((28 * (1 + 10::numeric / 30.0))::numeric, 3),
      'Demo radar incline press circuit set 1',
      v_circuit_started_at + interval '28 minutes'
    ),
    (
      v_ex_incline_press_id,
      v_circuit_workout_id,
      6,
      'normal'::set_type,
      32,
      'kg'::unit_mass,
      8,
      round((32 * (1 + 8::numeric / 30.0))::numeric, 3),
      'Demo radar incline press circuit set 2',
      v_circuit_started_at + interval '34 minutes'
    ),
    (
      v_ex_incline_press_id,
      v_circuit_workout_id,
      7,
      'normal'::set_type,
      34,
      'kg'::unit_mass,
      8,
      round((34 * (1 + 8::numeric / 30.0))::numeric, 3),
      'Demo radar incline press circuit set 3',
      v_circuit_started_at + interval '39 minutes'
    ),
    (
      v_ex_row_id,
      v_circuit_workout_id,
      8,
      'normal'::set_type,
      28,
      'kg'::unit_mass,
      10,
      round((28 * (1 + 10::numeric / 30.0))::numeric, 3),
      'Demo radar row circuit set 1',
      v_circuit_started_at + interval '45 minutes'
    ),
    (
      v_ex_row_id,
      v_circuit_workout_id,
      9,
      'normal'::set_type,
      32,
      'kg'::unit_mass,
      8,
      round((32 * (1 + 8::numeric / 30.0))::numeric, 3),
      'Demo radar row circuit set 2',
      v_circuit_started_at + interval '50 minutes'
    ),
    (
      v_ex_row_id,
      v_circuit_workout_id,
      10,
      'normal'::set_type,
      34,
      'kg'::unit_mass,
      8,
      round((34 * (1 + 8::numeric / 30.0))::numeric, 3),
      'Demo radar row circuit set 3',
      v_circuit_started_at + interval '55 minutes'
    );

  perform strength.rebuild_strength_workout_aggregates(v_push_workout_id);
  perform strength.rebuild_strength_workout_aggregates(v_posterior_workout_id);
  perform strength.rebuild_strength_workout_aggregates(v_circuit_workout_id);

  update strength.strength_workouts
  set ended_at = case id
    when v_push_workout_id then v_push_ended_at
    when v_posterior_workout_id then v_posterior_ended_at
    when v_circuit_workout_id then v_circuit_ended_at
    else ended_at
  end
  where id in (v_push_workout_id, v_posterior_workout_id, v_circuit_workout_id);

  v_push_muscle_profile := strength.get_workout_muscle_profile(v_push_workout_id);
  v_posterior_muscle_profile := strength.get_workout_muscle_profile(v_posterior_workout_id);
  v_circuit_muscle_profile := strength.get_workout_muscle_profile(v_circuit_workout_id);

  insert into social.posts (
    user_id,
    source_type,
    source_id,
    session_id,
    activity_type,
    title,
    subtitle,
    caption,
    metrics,
    visibility,
    created_at,
    updated_at
  )
  values
    (
      v_user_id,
      'strength_workout',
      v_push_workout_id,
      v_push_workout_id,
      'strength',
      'Upper Push Radar Session',
      'Strength Session',
      'Seeded push workout to test chest, shoulders, and arms radar emphasis in the social feed.',
      jsonb_build_object(
        'total_volume_kg', (select total_vol from strength.strength_workouts where id = v_push_workout_id),
        'total_sets', 12,
        'exercise_count', 3,
        'total_time_s', v_push_duration_s,
        'muscle_profile', v_push_muscle_profile
      ),
      'public',
      v_push_ended_at + interval '4 minutes',
      v_push_ended_at + interval '4 minutes'
    ),
    (
      v_user_id,
      'strength_workout',
      v_posterior_workout_id,
      v_posterior_workout_id,
      'strength',
      'Posterior Chain Radar Session',
      'Strength Session',
      'Seeded lower-body workout to validate back, posterior chain, and quad balance in the radar card.',
      jsonb_build_object(
        'total_volume_kg', (select total_vol from strength.strength_workouts where id = v_posterior_workout_id),
        'total_sets', 12,
        'exercise_count', 3,
        'total_time_s', v_posterior_duration_s,
        'muscle_profile', v_posterior_muscle_profile
      ),
      'public',
      v_posterior_ended_at + interval '5 minutes',
      v_posterior_ended_at + interval '5 minutes'
    ),
    (
      v_user_id,
      'strength_workout',
      v_circuit_workout_id,
      v_circuit_workout_id,
      'strength',
      'Full Body Radar Circuit',
      'Strength Session',
      'Seeded mixed circuit workout to validate full-body muscle distribution in the compact radar.',
      jsonb_build_object(
        'total_volume_kg', (select total_vol from strength.strength_workouts where id = v_circuit_workout_id),
        'total_sets', 10,
        'exercise_count', 3,
        'total_time_s', v_circuit_duration_s,
        'muscle_profile', v_circuit_muscle_profile
      ),
      'public',
      v_circuit_ended_at + interval '6 minutes',
      v_circuit_ended_at + interval '6 minutes'
    )
  on conflict (user_id, source_type, source_id) do update
  set session_id = excluded.session_id,
      activity_type = excluded.activity_type,
      title = excluded.title,
      subtitle = excluded.subtitle,
      caption = excluded.caption,
      metrics = excluded.metrics,
      visibility = excluded.visibility,
      created_at = excluded.created_at,
      updated_at = excluded.updated_at;

  raise notice
    'Strength social radar preview demo ready for user % with workouts %, %, and %.',
    v_user_id,
    v_push_workout_id,
    v_posterior_workout_id,
    v_circuit_workout_id;
end;
$$;

commit;
