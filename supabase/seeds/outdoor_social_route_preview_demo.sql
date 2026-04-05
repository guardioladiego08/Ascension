-- Outdoor social route preview demo seed
-- Creates two rerunnable outdoor sessions plus linked social posts for:
--   8e97a18c-d549-424c-8aa2-aed32961de70
--
-- How to use:
-- 1) Run this file in the Supabase SQL Editor.
-- 2) Open the seeded user's profile Activity tab to verify route-outline cards.
-- 3) Open the seeded user's Posts tab, or follow this user from another account to see the feed card version.

begin;

do $$
declare
  v_user_id uuid := '8e97a18c-d549-424c-8aa2-aed32961de70';
  v_timezone text := 'America/Los_Angeles';

  v_run_session_id uuid := '0db9cf62-0ba4-4f55-8db8-8dfd5d67a7da';
  v_walk_session_id uuid := 'fd3b68cf-26ef-43aa-a9d8-915ae7658f80';

  v_now_local_ts timestamp without time zone;
  v_run_local_start timestamp without time zone;
  v_walk_local_start timestamp without time zone;
  v_run_started_at timestamptz;
  v_walk_started_at timestamptz;
  v_run_ended_at timestamptz;
  v_walk_ended_at timestamptz;

  v_run_duration_s integer := 2925;
  v_walk_duration_s integer := 2610;
  v_run_distance_m double precision := 8420;
  v_walk_distance_m double precision := 4360;
  v_run_avg_speed_mps double precision := 2.879;
  v_walk_avg_speed_mps double precision := 1.670;
  v_run_avg_pace_km_s double precision := 347.4;
  v_walk_avg_pace_km_s double precision := 598.6;
  v_run_elev_gain_m double precision := 92;
  v_walk_elev_gain_m double precision := 34;

  v_sample_count integer;
  v_index integer;
  v_fraction numeric;
  v_elapsed_s integer;
  v_sample_distance_m double precision;
  v_lat double precision;
  v_lon double precision;
  v_altitude_m double precision;
  v_speed_mps double precision;
  v_bearing_deg double precision;
  v_sample_ts timestamptz;
begin
  if not exists (
    select 1
    from auth.users
    where id = v_user_id
  ) then
    raise exception 'User % not found in auth.users', v_user_id;
  end if;

  if to_regclass('run_walk.outdoor_sessions') is null
    or to_regclass('run_walk.outdoor_samples') is null
    or to_regclass('social.posts') is null then
    raise exception 'Run the run_walk and social migrations before seeding outdoor route preview data.';
  end if;

  v_now_local_ts := timezone(v_timezone, now());
  v_run_local_start := date_trunc('day', v_now_local_ts) - interval '2 day' + interval '6 hours 18 minutes';
  v_walk_local_start := date_trunc('day', v_now_local_ts) - interval '1 day' + interval '18 hours 5 minutes';

  v_run_started_at := v_run_local_start at time zone v_timezone;
  v_walk_started_at := v_walk_local_start at time zone v_timezone;
  v_run_ended_at := v_run_started_at + make_interval(secs => v_run_duration_s);
  v_walk_ended_at := v_walk_started_at + make_interval(secs => v_walk_duration_s);

  insert into run_walk.outdoor_sessions (
    id,
    user_id,
    activity_type,
    status,
    started_at,
    ended_at,
    duration_s,
    distance_m,
    avg_speed_mps,
    avg_pace_s_per_km,
    elev_gain_m,
    timezone_str
  )
  values
    (
      v_run_session_id,
      v_user_id,
      'run',
      'completed',
      v_run_started_at,
      v_run_ended_at,
      v_run_duration_s,
      v_run_distance_m,
      v_run_avg_speed_mps,
      v_run_avg_pace_km_s,
      v_run_elev_gain_m,
      v_timezone
    ),
    (
      v_walk_session_id,
      v_user_id,
      'walk',
      'completed',
      v_walk_started_at,
      v_walk_ended_at,
      v_walk_duration_s,
      v_walk_distance_m,
      v_walk_avg_speed_mps,
      v_walk_avg_pace_km_s,
      v_walk_elev_gain_m,
      v_timezone
    )
  on conflict (id) do update
  set user_id = excluded.user_id,
      activity_type = excluded.activity_type,
      status = excluded.status,
      started_at = excluded.started_at,
      ended_at = excluded.ended_at,
      duration_s = excluded.duration_s,
      distance_m = excluded.distance_m,
      avg_speed_mps = excluded.avg_speed_mps,
      avg_pace_s_per_km = excluded.avg_pace_s_per_km,
      elev_gain_m = excluded.elev_gain_m,
      timezone_str = excluded.timezone_str;

  delete from run_walk.outdoor_samples
  where session_id in (v_run_session_id, v_walk_session_id);

  v_sample_count := 22;
  for v_index in 0..(v_sample_count - 1) loop
    v_fraction := v_index::numeric / greatest(v_sample_count - 1, 1);
    v_elapsed_s := round(v_run_duration_s * v_fraction)::integer;
    v_sample_distance_m := round((v_run_distance_m * v_fraction)::numeric, 2)::double precision;
    v_sample_ts := v_run_started_at + make_interval(secs => v_elapsed_s);
    v_lat := round((34.052180 + 0.0180 * v_fraction + 0.0032 * sin(v_fraction * pi() * 2.40))::numeric, 6)::double precision;
    v_lon := round((-118.257410 + 0.0064 * cos(v_fraction * pi() * 1.55) - 0.0118 * v_fraction)::numeric, 6)::double precision;
    v_altitude_m := round((112 + 14 * sin(v_fraction * pi() * 1.8) + 3 * cos(v_fraction * pi() * 5.4))::numeric, 2)::double precision;
    v_speed_mps := round((v_run_avg_speed_mps * (0.96 + 0.07 * sin(v_fraction * pi() * 3.1)))::numeric, 6)::double precision;
    v_bearing_deg := round((42 + 138 * v_fraction + 18 * sin(v_fraction * pi() * 2.0))::numeric, 2)::double precision;

    insert into run_walk.outdoor_samples (
      session_id,
      user_id,
      ts,
      elapsed_s,
      lat,
      lon,
      altitude_m,
      accuracy_m,
      speed_mps,
      bearing_deg,
      hr_bpm,
      cadence_spm,
      grade_pct,
      distance_m,
      is_moving,
      source
    )
    values (
      v_run_session_id,
      v_user_id,
      v_sample_ts,
      v_elapsed_s,
      v_lat,
      v_lon,
      v_altitude_m,
      4.2,
      v_speed_mps,
      v_bearing_deg,
      154,
      171,
      1.1,
      v_sample_distance_m,
      true,
      'fg'
    );
  end loop;

  v_sample_count := 18;
  for v_index in 0..(v_sample_count - 1) loop
    v_fraction := v_index::numeric / greatest(v_sample_count - 1, 1);
    v_elapsed_s := round(v_walk_duration_s * v_fraction)::integer;
    v_sample_distance_m := round((v_walk_distance_m * v_fraction)::numeric, 2)::double precision;
    v_sample_ts := v_walk_started_at + make_interval(secs => v_elapsed_s);
    v_lat := round((34.069820 + 0.0062 * sin(v_fraction * pi() * 2.25) + 0.0024 * sin(v_fraction * pi() * 5.2))::numeric, 6)::double precision;
    v_lon := round((-118.240540 - 0.0046 * cos(v_fraction * pi() * 2.05) + 0.0038 * v_fraction)::numeric, 6)::double precision;
    v_altitude_m := round((88 + 5 * sin(v_fraction * pi() * 3.4))::numeric, 2)::double precision;
    v_speed_mps := round((v_walk_avg_speed_mps * (0.97 + 0.05 * sin(v_fraction * pi() * 2.6)))::numeric, 6)::double precision;
    v_bearing_deg := round((96 + 104 * v_fraction + 24 * cos(v_fraction * pi() * 1.9))::numeric, 2)::double precision;

    insert into run_walk.outdoor_samples (
      session_id,
      user_id,
      ts,
      elapsed_s,
      lat,
      lon,
      altitude_m,
      accuracy_m,
      speed_mps,
      bearing_deg,
      hr_bpm,
      cadence_spm,
      grade_pct,
      distance_m,
      is_moving,
      source
    )
    values (
      v_walk_session_id,
      v_user_id,
      v_sample_ts,
      v_elapsed_s,
      v_lat,
      v_lon,
      v_altitude_m,
      5.1,
      v_speed_mps,
      v_bearing_deg,
      118,
      102,
      0.3,
      v_sample_distance_m,
      true,
      'fg'
    );
  end loop;

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
      'run_walk_session',
      v_run_session_id,
      v_run_session_id,
      'run',
      'Outdoor Run',
      'Outdoor Session',
      'Harbor tempo loop with a clean route preview for feed testing.',
      jsonb_build_object(
        'distance_m', v_run_distance_m,
        'total_time_s', v_run_duration_s,
        'avg_pace_s_per_km', v_run_avg_pace_km_s,
        'avg_pace_s_per_mi', round((v_run_avg_pace_km_s * 1.609344)::numeric, 2)
      ),
      'followers',
      v_run_ended_at + interval '8 minutes',
      v_run_ended_at + interval '8 minutes'
    ),
    (
      v_user_id,
      'run_walk_session',
      v_walk_session_id,
      v_walk_session_id,
      'walk',
      'Outdoor Walk',
      'Outdoor Session',
      'Evening walk seed to validate the compact route-outline card on profile and feed.',
      jsonb_build_object(
        'distance_m', v_walk_distance_m,
        'total_time_s', v_walk_duration_s,
        'avg_pace_s_per_km', v_walk_avg_pace_km_s,
        'avg_pace_s_per_mi', round((v_walk_avg_pace_km_s * 1.609344)::numeric, 2)
      ),
      'followers',
      v_walk_ended_at + interval '6 minutes',
      v_walk_ended_at + interval '6 minutes'
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
    'Outdoor social route preview demo ready for user % with sessions % and %.',
    v_user_id,
    v_run_session_id,
    v_walk_session_id;
end;
$$;

commit;
