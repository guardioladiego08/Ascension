-- Running progress dashboard demo seed
-- Generates a deterministic mix of indoor and outdoor completed runs spanning 56 weeks.
-- Safe to rerun within the same week: rows are matched by exact started_at timestamps and updated.
--
-- How to use:
-- 1) Replace v_user_id with a real auth.users id from your project.
-- 2) Run this file in the Supabase SQL Editor.
-- 3) Open Progress -> Running to test the chart and summary cards across every timeline.

begin;

do $$
declare
  v_user_id uuid := '8e97a18c-d549-424c-8aa2-aed32961de70';
  v_timezone text := 'America/Los_Angeles';
  v_week_count integer := 56;
  v_indoor_exercise_type text := 'indoor_run';

  v_now_local_ts timestamp without time zone;
  v_current_week_start date;
  v_start_week date;
  v_week_start date;
  v_session_day date;
  v_local_start time;
  v_candidate_local_ts timestamp without time zone;

  v_week_idx integer;
  v_session_slot integer;
  v_sample_idx integer;
  v_sample_count integer;

  v_skip_slot boolean;
  v_deload_factor numeric;
  v_progress_km numeric;
  v_distance_km numeric;
  v_pace_km_s numeric;
  v_total_elev_m numeric;

  v_distance_m double precision;
  v_duration_s integer;
  v_avg_speed_mps double precision;
  v_pace_mi_s double precision;
  v_started_at timestamptz;
  v_ended_at timestamptz;
  v_session_id uuid;

  v_fraction numeric;
  v_sample_elapsed integer;
  v_sample_distance_m double precision;
  v_sample_pace_km_s double precision;
  v_sample_pace_mi_s double precision;
  v_sample_speed_mps double precision;
  v_sample_elev_m double precision;
  v_sample_ts timestamptz;

  v_base_lat double precision;
  v_base_lon double precision;
  v_lat double precision;
  v_lon double precision;
  v_altitude_m double precision;
  v_bearing_deg double precision;

  v_inserted integer := 0;
  v_updated integer := 0;
  v_indoor_count integer := 0;
  v_outdoor_count integer := 0;
begin
  if v_user_id = '00000000-0000-0000-0000-000000000000'::uuid then
    raise exception 'Set v_user_id at the top of running_progress_year_dashboard_demo.sql before running it.';
  end if;

  if not exists (
    select 1
    from auth.users
    where id = v_user_id
  ) then
    raise exception 'User % not found in auth.users', v_user_id;
  end if;

  if to_regclass('run_walk.sessions') is null
    or to_regclass('run_walk.samples') is null
    or to_regclass('run_walk.outdoor_sessions') is null
    or to_regclass('run_walk.outdoor_samples') is null then
    raise exception 'Run the run_walk schema migrations before seeding running progress demo data.';
  end if;

  if not exists (
    select 1
    from pg_enum e
    join pg_type t
      on t.oid = e.enumtypid
    join pg_namespace n
      on n.oid = t.typnamespace
    where n.nspname = 'run_walk'
      and t.typname = 'exercise_type'
      and e.enumlabel = 'indoor_run'
  ) then
    v_indoor_exercise_type := 'run';
  end if;

  v_now_local_ts := timezone(v_timezone, now());
  v_current_week_start := date_trunc('week', v_now_local_ts)::date;
  v_start_week := v_current_week_start - ((v_week_count - 1) * 7);

  for v_week_idx in 0..(v_week_count - 1) loop
    v_week_start := v_start_week + (v_week_idx * 7);
    v_deload_factor := case when mod(v_week_idx + 1, 4) = 0 then 0.82 else 1.00 end;
    v_progress_km := least((v_week_idx * 0.11)::numeric, 5.20);

    for v_session_slot in 1..3 loop
      v_skip_slot := false;

      case v_session_slot
        when 1 then
          v_session_day := v_week_start + 1;
          v_local_start := time '06:12';
          v_distance_km := round(
            (
              (5.20 + v_progress_km + (mod(v_week_idx, 3) * 0.35))
              * v_deload_factor
            )::numeric,
            2
          );
          v_pace_km_s := greatest(
            292::numeric,
            round(
              (
                352
                - least(v_week_idx, 44) * 1.10
                + mod(v_week_idx, 5) * 3
              )::numeric,
              2
            )
          );
          v_total_elev_m := round(
            (
              34
              + mod(v_week_idx, 6) * 7
              + (1 - v_deload_factor) * 28
            )::numeric,
            2
          );

          if mod(v_week_idx, 9) = 4 then
            v_skip_slot := true;
          end if;
        when 2 then
          v_session_day := v_week_start + 3;
          v_local_start := time '18:18';
          v_distance_km := round(
            (
              (7.10 + (v_progress_km * 1.10) + (mod(v_week_idx, 4) * 0.45))
              * v_deload_factor
            )::numeric,
            2
          );
          v_pace_km_s := greatest(
            310::numeric,
            round(
              (
                370
                - least(v_week_idx, 48) * 1.05
                + mod(v_week_idx, 7) * 3
              )::numeric,
              2
            )
          );
          v_total_elev_m := round(
            (
              82
              + mod(v_week_idx, 6) * 15
              + floor(v_week_idx / 6.0) * 4
            )::numeric,
            2
          );

          if mod(v_week_idx, 14) = 10 then
            v_skip_slot := true;
          end if;
        else
          v_session_day := v_week_start + 6;
          v_local_start := time '07:06';
          v_distance_km := round(
            (
              (
                10.80
                + (v_progress_km * 1.65)
                + (mod(v_week_idx, 5) * 0.80)
                + case when mod(v_week_idx, 12) = 10 then 2.40 else 0 end
              )
              * v_deload_factor
            )::numeric,
            2
          );
          v_pace_km_s := greatest(
            330::numeric,
            round(
              (
                395
                - least(v_week_idx, 52) * 0.90
                + mod(v_week_idx, 6) * 4
              )::numeric,
              2
            )
          );
          v_total_elev_m := round(
            (
              (
                128
                + mod(v_week_idx, 8) * 20
                + floor(v_week_idx / 4.0) * 6
              )
              * (case when mod(v_week_idx + 1, 6) = 0 then 0.92 else 1.00 end)
            )::numeric,
            2
          );

          if mod(v_week_idx, 11) = 7 then
            v_skip_slot := true;
          end if;
      end case;

      v_candidate_local_ts := v_session_day::timestamp + v_local_start;
      if v_skip_slot or v_candidate_local_ts >= v_now_local_ts then
        continue;
      end if;

      v_distance_m := round((v_distance_km * 1000)::numeric, 2)::double precision;
      v_duration_s := greatest(1200, round(v_distance_km * v_pace_km_s)::integer);
      v_pace_km_s := round((v_duration_s::numeric / nullif(v_distance_km, 0))::numeric, 2);
      v_pace_mi_s := round((v_pace_km_s * 1.609344)::numeric, 2)::double precision;
      v_avg_speed_mps := round((v_distance_m / nullif(v_duration_s, 0))::numeric, 6)::double precision;
      v_started_at := (v_candidate_local_ts at time zone v_timezone);
      v_ended_at := v_started_at + make_interval(secs => v_duration_s);

      if v_session_slot = 1 then
        select s.id
        into v_session_id
        from run_walk.sessions s
        where s.user_id = v_user_id
          and s.started_at = v_started_at
          and lower(coalesce(s.exercise_type::text, '')) in ('indoor_run', 'run')
        order by case when lower(coalesce(s.exercise_type::text, '')) = 'indoor_run' then 0 else 1 end
        limit 1;

        if v_session_id is null then
          insert into run_walk.sessions (
            user_id,
            status,
            started_at,
            ended_at,
            exercise_type,
            total_time_s,
            total_distance_m,
            total_elevation_m,
            avg_speed_mps,
            avg_pace_s_per_km,
            avg_pace_s_per_mi,
            timezone_str
          )
          values (
            v_user_id,
            'completed',
            v_started_at,
            v_ended_at,
            v_indoor_exercise_type::run_walk.exercise_type,
            v_duration_s,
            v_distance_m,
            v_total_elev_m::double precision,
            v_avg_speed_mps,
            v_pace_km_s::double precision,
            v_pace_mi_s,
            v_timezone
          )
          returning id into v_session_id;

          v_inserted := v_inserted + 1;
        else
          update run_walk.sessions
          set status = 'completed',
              ended_at = v_ended_at,
              exercise_type = v_indoor_exercise_type::run_walk.exercise_type,
              total_time_s = v_duration_s,
              total_distance_m = v_distance_m,
              total_elevation_m = v_total_elev_m::double precision,
              avg_speed_mps = v_avg_speed_mps,
              avg_pace_s_per_km = v_pace_km_s::double precision,
              avg_pace_s_per_mi = v_pace_mi_s,
              timezone_str = v_timezone
          where id = v_session_id;

          delete from run_walk.samples
          where session_id = v_session_id;

          v_updated := v_updated + 1;
        end if;

        v_indoor_count := v_indoor_count + 1;
        v_sample_count := greatest(10, least(36, greatest(1, v_duration_s / 120)));

        for v_sample_idx in 1..v_sample_count loop
          v_fraction := v_sample_idx::numeric / v_sample_count;
          v_sample_elapsed := least(v_duration_s, greatest(1, round(v_duration_s * v_fraction)::integer));
          v_sample_distance_m := round((v_distance_m * v_fraction)::numeric, 2)::double precision;
          v_sample_pace_km_s := round(
            (
              v_pace_km_s
              * (
                0.97
                + mod(v_sample_idx + v_week_idx, 5) * 0.015
              )
            )::numeric,
            2
          )::double precision;
          v_sample_pace_mi_s := round((v_sample_pace_km_s * 1.609344)::numeric, 2)::double precision;
          v_sample_speed_mps := round((1000 / nullif(v_sample_pace_km_s, 0))::numeric, 6)::double precision;
          v_sample_elev_m := round((v_total_elev_m * v_fraction)::numeric, 2)::double precision;

          insert into run_walk.samples (
            session_id,
            seq,
            elapsed_s,
            distance_m,
            speed_mps,
            pace_s_per_km,
            pace_s_per_mi,
            incline_deg,
            elevation_m
          )
          values (
            v_session_id,
            v_sample_idx,
            v_sample_elapsed,
            v_sample_distance_m,
            v_sample_speed_mps,
            v_sample_pace_km_s,
            v_sample_pace_mi_s,
            round((0.8 + mod(v_week_idx + v_sample_idx, 5) * 0.5)::numeric, 2)::double precision,
            v_sample_elev_m
          );
        end loop;
      else
        select s.id
        into v_session_id
        from run_walk.outdoor_sessions s
        where s.user_id = v_user_id
          and s.started_at = v_started_at
          and lower(coalesce(s.activity_type::text, '')) = 'run'
        limit 1;

        if v_session_id is null then
          insert into run_walk.outdoor_sessions (
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
          values (
            v_user_id,
            'run',
            'completed',
            v_started_at,
            v_ended_at,
            v_duration_s,
            v_distance_m,
            v_avg_speed_mps,
            v_pace_km_s::double precision,
            v_total_elev_m::double precision,
            v_timezone
          )
          returning id into v_session_id;

          v_inserted := v_inserted + 1;
        else
          update run_walk.outdoor_sessions
          set activity_type = 'run',
              status = 'completed',
              ended_at = v_ended_at,
              duration_s = v_duration_s,
              distance_m = v_distance_m,
              avg_speed_mps = v_avg_speed_mps,
              avg_pace_s_per_km = v_pace_km_s::double precision,
              elev_gain_m = v_total_elev_m::double precision,
              timezone_str = v_timezone
          where id = v_session_id;

          delete from run_walk.outdoor_samples
          where session_id = v_session_id;

          v_updated := v_updated + 1;
        end if;

        v_outdoor_count := v_outdoor_count + 1;
        v_sample_count := greatest(8, least(24, greatest(1, v_duration_s / 240)));
        v_base_lat :=
          37.6900
          + (mod(v_week_idx, 10) * 0.011)
          + case when v_session_slot = 3 then 0.028 else 0.010 end;
        v_base_lon :=
          -122.5200
          + (mod(v_week_idx, 7) * 0.009)
          + case when v_session_slot = 2 then 0.022 else 0.008 end;

        for v_sample_idx in 1..v_sample_count loop
          v_fraction := v_sample_idx::numeric / v_sample_count;
          v_sample_elapsed := least(v_duration_s, greatest(1, round(v_duration_s * v_fraction)::integer));
          v_sample_ts := v_started_at + make_interval(secs => v_sample_elapsed);
          v_sample_distance_m := round((v_distance_m * v_fraction)::numeric, 2)::double precision;
          v_sample_speed_mps := round(
            (
              v_avg_speed_mps
              * (
                0.94
                + mod(v_sample_idx + v_week_idx, 6) * 0.018
              )
            )::numeric,
            6
          )::double precision;
          v_bearing_deg := round(
            (
              25
              + (v_fraction * 165)
              + (v_session_slot * 9)
            )::numeric,
            2
          )::double precision;
          v_lat := round(
            (
              v_base_lat
              + (0.014 + (v_distance_m / 1000.0) * 0.00045) * v_fraction
            )::numeric,
            6
          )::double precision;
          v_lon := round(
            (
              v_base_lon
              + (
                0.010
                + mod(v_week_idx + v_session_slot, 5) * 0.0013
              ) * sin(v_fraction * pi() * case when v_session_slot = 2 then 1.60 else 2.20 end)
            )::numeric,
            6
          )::double precision;
          v_altitude_m := round(
            (
              22
              + (v_total_elev_m * v_fraction)
              + 5 * sin(v_fraction * pi() * 3)
            )::numeric,
            2
          )::double precision;

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
            v_session_id,
            v_user_id,
            v_sample_ts,
            v_sample_elapsed,
            v_lat,
            v_lon,
            v_altitude_m,
            4.5,
            v_sample_speed_mps,
            v_bearing_deg,
            null,
            null,
            null,
            v_sample_distance_m,
            true,
            'fg'
          );
        end loop;
      end if;
    end loop;
  end loop;

  raise notice
    'Running progress demo ready for user %: % sessions inserted, % sessions updated, % indoor runs, % outdoor runs, range % -> %.',
    v_user_id,
    v_inserted,
    v_updated,
    v_indoor_count,
    v_outdoor_count,
    v_start_week,
    v_now_local_ts::date;
end;
$$;

commit;
