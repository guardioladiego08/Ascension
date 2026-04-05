begin;

create or replace function badges.is_running_activity(p_activity_type text)
returns boolean
language sql
immutable
as $$
  select case
    when nullif(trim(coalesce(p_activity_type, '')), '') is null then false
    when lower(trim(p_activity_type)) in ('run', 'indoor_run', 'outdoor_run') then true
    when lower(trim(p_activity_type)) like '%run%'
      and lower(trim(p_activity_type)) not like '%walk%'
      and lower(trim(p_activity_type)) not like '%ride%'
      and lower(trim(p_activity_type)) not like '%bike%'
      and lower(trim(p_activity_type)) not like '%cycle%'
    then true
    else false
  end;
$$;

create or replace function badges.local_day(
  p_anchor timestamptz,
  p_timezone text default null
)
returns date
language plpgsql
stable
as $$
declare
  v_tz text := nullif(trim(coalesce(p_timezone, '')), '');
  v_local_day date;
begin
  if p_anchor is null then
    return null;
  end if;

  if v_tz is null then
    v_tz := 'UTC';
  end if;

  begin
    v_local_day := (p_anchor at time zone v_tz)::date;
  exception
    when others then
      v_local_day := (p_anchor at time zone 'UTC')::date;
  end;

  return v_local_day;
end;
$$;

create or replace function badges.running_completed_sessions(
  p_user_id uuid
)
returns table (
  source_id uuid,
  source_type text,
  ended_at timestamptz,
  local_day date,
  week_start date,
  duration_s integer,
  distance_m numeric,
  elevation_m numeric,
  avg_speed_mps numeric
)
language sql
stable
security definer
set search_path = public, badges, run_walk
as $$
  with indoor_rows as (
    select
      s.id as source_id,
      'run_walk_session'::text as source_type,
      s.ended_at,
      badges.local_day(s.ended_at, s.timezone_str) as local_day,
      badges.local_week_start(s.ended_at, s.timezone_str) as week_start,
      coalesce(s.total_time_s, 0)::integer as duration_s,
      coalesce(s.total_distance_m, 0)::numeric as distance_m,
      coalesce(s.total_elevation_m, 0)::numeric as elevation_m,
      case
        when coalesce(s.total_time_s, 0) > 0 and coalesce(s.total_distance_m, 0) > 0
          then coalesce(s.total_distance_m, 0)::numeric / coalesce(s.total_time_s, 0)::numeric
        else 0::numeric
      end as avg_speed_mps
    from run_walk.sessions s
    where s.user_id = p_user_id
      and s.status = 'completed'
      and s.ended_at is not null
      and badges.is_running_activity(s.exercise_type::text)
  ),
  outdoor_rows as (
    select
      s.id as source_id,
      'run_walk_session'::text as source_type,
      s.ended_at,
      badges.local_day(s.ended_at, s.timezone_str) as local_day,
      badges.local_week_start(s.ended_at, s.timezone_str) as week_start,
      coalesce(s.duration_s, 0)::integer as duration_s,
      coalesce(s.distance_m, 0)::numeric as distance_m,
      coalesce(s.elev_gain_m, 0)::numeric as elevation_m,
      case
        when coalesce(s.duration_s, 0) > 0 and coalesce(s.distance_m, 0) > 0
          then coalesce(s.distance_m, 0)::numeric / coalesce(s.duration_s, 0)::numeric
        else 0::numeric
      end as avg_speed_mps
    from run_walk.outdoor_sessions s
    where s.user_id = p_user_id
      and s.status = 'completed'
      and s.ended_at is not null
      and badges.is_running_activity(s.activity_type::text)
  )
  select *
  from indoor_rows
  union all
  select *
  from outdoor_rows;
$$;

create or replace function badges.evaluate_running_badges_for_user(
  p_user_id uuid,
  p_source_type text default 'run_walk_session',
  p_source_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public, badges, run_walk
as $$
declare
  v_user_id uuid := p_user_id;
  v_source_type text := nullif(trim(coalesce(p_source_type, '')), '');
  v_source_id uuid := p_source_id;
  v_current_day date := null;
  v_current_week_start date := null;
  v_current_distance_m numeric := 0;
  v_current_duration_s integer := 0;
  v_current_elevation_m numeric := 0;
  v_current_speed_mps numeric := 0;
  v_total_runs integer := 0;
  v_total_distance_m numeric := 0;
  v_total_duration_s numeric := 0;
  v_total_elevation_m numeric := 0;
  v_best_distance_m numeric := 0;
  v_best_week_count integer := 0;
  v_current_week_count integer := 0;
  v_best_day_streak integer := 0;
  v_current_day_streak integer := 0;
  v_best_week_streak integer := 0;
  v_current_week_streak integer := 0;
  v_best_pace_record_speed numeric := 0;
  v_best_mile_speed numeric := 0;
  v_best_5k_speed numeric := 0;
  v_best_10k_speed numeric := 0;
  v_best_half_speed numeric := 0;
  v_best_marathon_speed numeric := 0;
begin
  if v_user_id is null then
    return;
  end if;

  if v_source_type is null then
    v_source_type := 'run_walk_session';
  end if;

  if v_source_id is null then
    select s.source_id
    into v_source_id
    from badges.running_completed_sessions(v_user_id) s
    order by s.ended_at desc, s.source_id desc
    limit 1;
  end if;

  if v_source_id is not null then
    select
      s.local_day,
      s.week_start,
      coalesce(s.distance_m, 0),
      coalesce(s.duration_s, 0),
      coalesce(s.elevation_m, 0),
      coalesce(s.avg_speed_mps, 0)
    into
      v_current_day,
      v_current_week_start,
      v_current_distance_m,
      v_current_duration_s,
      v_current_elevation_m,
      v_current_speed_mps
    from badges.running_completed_sessions(v_user_id) s
    where s.source_id = v_source_id
    order by s.ended_at desc
    limit 1;
  end if;

  select
    coalesce(count(*), 0)::integer,
    coalesce(sum(s.distance_m), 0)::numeric,
    coalesce(sum(s.duration_s), 0)::numeric,
    coalesce(sum(s.elevation_m), 0)::numeric,
    coalesce(max(s.distance_m), 0)::numeric,
    coalesce(max(s.avg_speed_mps) filter (where s.distance_m >= 1000 and s.duration_s > 0), 0)::numeric,
    coalesce(max(s.avg_speed_mps) filter (where s.distance_m >= 1609.34 and s.duration_s > 0), 0)::numeric,
    coalesce(max(s.avg_speed_mps) filter (where s.distance_m >= 5000 and s.duration_s > 0), 0)::numeric,
    coalesce(max(s.avg_speed_mps) filter (where s.distance_m >= 10000 and s.duration_s > 0), 0)::numeric,
    coalesce(max(s.avg_speed_mps) filter (where s.distance_m >= 21097.50 and s.duration_s > 0), 0)::numeric,
    coalesce(max(s.avg_speed_mps) filter (where s.distance_m >= 42195 and s.duration_s > 0), 0)::numeric
  into
    v_total_runs,
    v_total_distance_m,
    v_total_duration_s,
    v_total_elevation_m,
    v_best_distance_m,
    v_best_pace_record_speed,
    v_best_mile_speed,
    v_best_5k_speed,
    v_best_10k_speed,
    v_best_half_speed,
    v_best_marathon_speed
  from badges.running_completed_sessions(v_user_id) s;

  with run_weeks as (
    select
      s.week_start,
      count(*)::integer as run_count
    from badges.running_completed_sessions(v_user_id) s
    group by s.week_start
  )
  select
    coalesce(max(run_count), 0),
    coalesce(max(case when week_start = v_current_week_start then run_count else 0 end), 0)
  into
    v_best_week_count,
    v_current_week_count
  from run_weeks;

  with run_days as (
    select distinct s.local_day
    from badges.running_completed_sessions(v_user_id) s
    where s.local_day is not null
  ),
  ordered_days as (
    select
      local_day,
      row_number() over (order by local_day) as rn
    from run_days
  ),
  grouped_days as (
    select
      local_day,
      local_day - rn::integer as grp
    from ordered_days
  ),
  streaks as (
    select
      max(local_day) as streak_end,
      count(*)::integer as streak_len
    from grouped_days
    group by grp
  )
  select
    coalesce(max(streak_len), 0),
    coalesce(max(case when streak_end = v_current_day then streak_len else 0 end), 0)
  into
    v_best_day_streak,
    v_current_day_streak
  from streaks;

  with run_weeks as (
    select
      s.week_start,
      count(*)::integer as run_count
    from badges.running_completed_sessions(v_user_id) s
    group by s.week_start
  ),
  qualified_weeks as (
    select
      week_start,
      row_number() over (order by week_start) as rn
    from run_weeks
    where run_count >= 3
  ),
  grouped_weeks as (
    select
      week_start,
      week_start - (rn::integer * 7) as grp
    from qualified_weeks
  ),
  streaks as (
    select
      max(week_start) as streak_end,
      count(*)::integer as streak_len
    from grouped_weeks
    group by grp
  )
  select
    coalesce(max(streak_len), 0),
    coalesce(max(case when streak_end = v_current_week_start then streak_len else 0 end), 0)
  into
    v_best_week_streak,
    v_current_week_streak
  from streaks;

  perform badges.apply_progress_snapshot(
    v_user_id,
    'running',
    'first_run',
    v_total_runs,
    v_total_runs,
    v_total_runs,
    v_source_type,
    v_source_id
  );

  perform badges.apply_progress_snapshot(
    v_user_id,
    'running',
    'total_runs',
    v_total_runs,
    v_total_runs,
    v_total_runs,
    v_source_type,
    v_source_id
  );

  perform badges.apply_progress_snapshot(
    v_user_id,
    'running',
    'run_streak_days',
    v_current_day_streak,
    v_best_day_streak,
    v_best_day_streak,
    v_source_type,
    v_source_id
  );

  perform badges.apply_progress_snapshot(
    v_user_id,
    'running',
    'weekly_run_count',
    v_current_week_count,
    v_best_week_count,
    v_best_week_count,
    v_source_type,
    v_source_id
  );

  perform badges.apply_progress_snapshot(
    v_user_id,
    'running',
    'weekly_run_streak',
    v_current_week_streak,
    v_best_week_streak,
    v_best_week_streak,
    v_source_type,
    v_source_id
  );

  perform badges.apply_progress_snapshot(
    v_user_id,
    'running',
    'lifetime_distance',
    v_total_distance_m,
    v_total_distance_m,
    v_total_distance_m,
    v_source_type,
    v_source_id
  );

  perform badges.apply_progress_snapshot(
    v_user_id,
    'running',
    'longest_run',
    v_current_distance_m,
    v_best_distance_m,
    v_best_distance_m,
    v_source_type,
    v_source_id
  );

  perform badges.apply_progress_snapshot(
    v_user_id,
    'running',
    'distance_milestones',
    v_current_distance_m,
    v_best_distance_m,
    v_best_distance_m,
    v_source_type,
    v_source_id
  );

  perform badges.apply_progress_snapshot(
    v_user_id,
    'running',
    'total_time',
    v_total_duration_s,
    v_total_duration_s,
    v_total_duration_s,
    v_source_type,
    v_source_id
  );

  perform badges.apply_progress_snapshot(
    v_user_id,
    'running',
    'elevation_gain',
    v_total_elevation_m,
    v_total_elevation_m,
    v_total_elevation_m,
    v_source_type,
    v_source_id
  );

  perform badges.apply_progress_snapshot(
    v_user_id,
    'running',
    'pace_record',
    case
      when v_current_distance_m >= 1000 and v_current_duration_s > 0 then v_current_speed_mps
      else 0
    end,
    v_best_pace_record_speed,
    v_best_pace_record_speed,
    v_source_type,
    v_source_id
  );

  perform badges.apply_progress_snapshot(
    v_user_id,
    'running',
    'fastest_mile',
    case
      when v_current_distance_m >= 1609.34 and v_current_duration_s > 0 then v_current_speed_mps
      else 0
    end,
    v_best_mile_speed,
    v_best_mile_speed,
    v_source_type,
    v_source_id
  );

  perform badges.apply_progress_snapshot(
    v_user_id,
    'running',
    'fastest_5k',
    case
      when v_current_distance_m >= 5000 and v_current_duration_s > 0 then v_current_speed_mps
      else 0
    end,
    v_best_5k_speed,
    v_best_5k_speed,
    v_source_type,
    v_source_id
  );

  perform badges.apply_progress_snapshot(
    v_user_id,
    'running',
    'fastest_10k',
    case
      when v_current_distance_m >= 10000 and v_current_duration_s > 0 then v_current_speed_mps
      else 0
    end,
    v_best_10k_speed,
    v_best_10k_speed,
    v_source_type,
    v_source_id
  );

  perform badges.apply_progress_snapshot(
    v_user_id,
    'running',
    'fastest_half',
    case
      when v_current_distance_m >= 21097.50 and v_current_duration_s > 0 then v_current_speed_mps
      else 0
    end,
    v_best_half_speed,
    v_best_half_speed,
    v_source_type,
    v_source_id
  );

  perform badges.apply_progress_snapshot(
    v_user_id,
    'running',
    'fastest_marathon',
    case
      when v_current_distance_m >= 42195 and v_current_duration_s > 0 then v_current_speed_mps
      else 0
    end,
    v_best_marathon_speed,
    v_best_marathon_speed,
    v_source_type,
    v_source_id
  );
end;
$$;

create or replace function badges.apply_run_walk_session_badges()
returns trigger
language plpgsql
security definer
set search_path = public, badges, run_walk
as $$
begin
  if tg_op = 'DELETE' then
    return old;
  end if;

  if new.user_id is null
    or new.ended_at is null
    or coalesce(new.status, '') <> 'completed'
    or not badges.is_running_activity(new.exercise_type::text)
  then
    return new;
  end if;

  perform badges.evaluate_running_badges_for_user(
    new.user_id,
    'run_walk_session',
    new.id
  );

  return new;
end;
$$;

drop trigger if exists trg_apply_run_walk_session_badges on run_walk.sessions;
create trigger trg_apply_run_walk_session_badges
after insert or update of status, ended_at, total_time_s, total_distance_m, total_elevation_m, avg_pace_s_per_km, exercise_type, timezone_str
on run_walk.sessions
for each row
execute function badges.apply_run_walk_session_badges();

create or replace function badges.apply_outdoor_run_badges()
returns trigger
language plpgsql
security definer
set search_path = public, badges, run_walk
as $$
begin
  if tg_op = 'DELETE' then
    return old;
  end if;

  if new.user_id is null
    or new.ended_at is null
    or coalesce(new.status, '') <> 'completed'
    or not badges.is_running_activity(new.activity_type::text)
  then
    return new;
  end if;

  perform badges.evaluate_running_badges_for_user(
    new.user_id,
    'run_walk_session',
    new.id
  );

  return new;
end;
$$;

drop trigger if exists trg_apply_outdoor_run_badges on run_walk.outdoor_sessions;
create trigger trg_apply_outdoor_run_badges
after insert or update of status, ended_at, duration_s, distance_m, elev_gain_m, avg_pace_s_per_km, activity_type, timezone_str
on run_walk.outdoor_sessions
for each row
execute function badges.apply_outdoor_run_badges();

with series_seed (
  domain,
  code,
  name,
  description,
  badge_kind,
  metric_key,
  progress_mode,
  icon_placeholder,
  display_order,
  metadata
) as (
  values
    ('running', 'first_run', 'First Run', 'Complete your first saved run.', 'milestone', 'completed_runs', 'count', 'badge-running-first-run', 210, '{"unit":"runs"}'::jsonb),
    ('running', 'total_runs', 'Run Habit', 'Build your total completed run count over time.', 'milestone', 'completed_runs', 'count', 'badge-running-total-runs', 220, '{"unit":"runs"}'::jsonb),
    ('running', 'run_streak_days', 'Run Streak', 'Stack consecutive days with at least one saved run.', 'streak', 'run_day_streak', 'streak', 'badge-running-streak-days', 230, '{"unit":"days"}'::jsonb),
    ('running', 'weekly_run_count', 'Weekly Run Count', 'Hit bigger run totals inside a single week.', 'consistency', 'weekly_run_count', 'current_best', 'badge-running-weekly-count', 240, '{"unit":"runs"}'::jsonb),
    ('running', 'weekly_run_streak', 'Weekly Run Streak', 'Stack consecutive weeks with at least three runs.', 'streak', 'qualified_week_streak', 'streak', 'badge-running-weekly-streak', 250, '{"unit":"weeks","qualifier":"3_runs_per_week"}'::jsonb),
    ('running', 'lifetime_distance', 'Lifetime Distance', 'Accumulate total distance across all completed runs.', 'milestone', 'lifetime_distance_m', 'count', 'badge-running-lifetime-distance', 260, '{"unit":"m"}'::jsonb),
    ('running', 'longest_run', 'Longest Run Record', 'Push your farthest completed run distance higher.', 'record', 'single_run_distance_m', 'record', 'badge-running-longest-run', 270, '{"unit":"m"}'::jsonb),
    ('running', 'distance_milestones', 'Distance Milestones', 'Reach classic single-run distance landmarks.', 'milestone', 'single_run_distance_m', 'current_best', 'badge-running-distance-milestones', 280, '{"unit":"m"}'::jsonb),
    ('running', 'total_time', 'Time On Feet', 'Accumulate total running time across saved runs.', 'milestone', 'lifetime_duration_s', 'count', 'badge-running-total-time', 290, '{"unit":"s"}'::jsonb),
    ('running', 'elevation_gain', 'Elevation Climb', 'Accumulate total elevation gain across saved runs.', 'milestone', 'lifetime_elevation_m', 'count', 'badge-running-elevation', 300, '{"unit":"m"}'::jsonb),
    ('running', 'pace_record', 'Pace Record', 'Raise your best average run speed on qualifying runs.', 'record', 'best_avg_speed_mps', 'record', 'badge-running-pace-record', 310, '{"unit":"mps","qualifier":"distance_at_least_1km"}'::jsonb),
    ('running', 'fastest_mile', 'Fastest Mile', 'Set faster equivalent mile performances from saved runs.', 'record', 'best_mile_equivalent_speed_mps', 'record', 'badge-running-fastest-mile', 320, '{"unit":"mps","target_distance_m":1609.34}'::jsonb),
    ('running', 'fastest_5k', 'Fastest 5K', 'Set faster equivalent 5K performances from saved runs.', 'record', 'best_5k_equivalent_speed_mps', 'record', 'badge-running-fastest-5k', 330, '{"unit":"mps","target_distance_m":5000}'::jsonb),
    ('running', 'fastest_10k', 'Fastest 10K', 'Set faster equivalent 10K performances from saved runs.', 'record', 'best_10k_equivalent_speed_mps', 'record', 'badge-running-fastest-10k', 340, '{"unit":"mps","target_distance_m":10000}'::jsonb),
    ('running', 'fastest_half', 'Fastest Half', 'Set faster equivalent half-marathon performances from saved runs.', 'record', 'best_half_equivalent_speed_mps', 'record', 'badge-running-fastest-half', 350, '{"unit":"mps","target_distance_m":21097.5}'::jsonb),
    ('running', 'fastest_marathon', 'Fastest Marathon', 'Set faster equivalent marathon performances when your saved distance supports it.', 'record', 'best_marathon_equivalent_speed_mps', 'record', 'badge-running-fastest-marathon', 360, '{"unit":"mps","target_distance_m":42195}'::jsonb)
)
insert into badges.badge_series (
  domain,
  code,
  name,
  description,
  badge_kind,
  metric_key,
  progress_mode,
  icon_placeholder,
  display_order,
  metadata
)
select
  domain,
  code,
  name,
  description,
  badge_kind,
  metric_key,
  progress_mode,
  icon_placeholder,
  display_order,
  metadata
from series_seed
on conflict (domain, code) do update
set name = excluded.name,
    description = excluded.description,
    badge_kind = excluded.badge_kind,
    metric_key = excluded.metric_key,
    progress_mode = excluded.progress_mode,
    icon_placeholder = excluded.icon_placeholder,
    display_order = excluded.display_order,
    metadata = excluded.metadata;

with tier_seed (
  badge_code,
  tier_code,
  tier_name,
  threshold_value,
  unlock_copy,
  display_order,
  icon_placeholder
) as (
  values
    ('first_run', 'starter', 'Starter', 1, 'Completed your first saved run.', 1, 'badge-running-first-run-starter'),

    ('total_runs', 'bronze', 'Bronze', 5, 'Completed 5 runs.', 1, 'badge-running-total-runs-bronze'),
    ('total_runs', 'silver', 'Silver', 10, 'Completed 10 runs.', 2, 'badge-running-total-runs-silver'),
    ('total_runs', 'gold', 'Gold', 25, 'Completed 25 runs.', 3, 'badge-running-total-runs-gold'),
    ('total_runs', 'elite', 'Elite', 50, 'Completed 50 runs.', 4, 'badge-running-total-runs-elite'),
    ('total_runs', 'legend', 'Legend', 100, 'Completed 100 runs.', 5, 'badge-running-total-runs-legend'),

    ('run_streak_days', '3-days', '3 Days', 3, 'Logged runs on 3 consecutive days.', 1, 'badge-running-streak-days-3'),
    ('run_streak_days', '7-days', '7 Days', 7, 'Logged runs on 7 consecutive days.', 2, 'badge-running-streak-days-7'),
    ('run_streak_days', '14-days', '14 Days', 14, 'Logged runs on 14 consecutive days.', 3, 'badge-running-streak-days-14'),
    ('run_streak_days', '30-days', '30 Days', 30, 'Logged runs on 30 consecutive days.', 4, 'badge-running-streak-days-30'),
    ('run_streak_days', '60-days', '60 Days', 60, 'Logged runs on 60 consecutive days.', 5, 'badge-running-streak-days-60'),

    ('weekly_run_count', 'double', 'Double', 2, 'Completed 2 runs in a single week.', 1, 'badge-running-weekly-count-2'),
    ('weekly_run_count', 'triple', 'Triple', 3, 'Completed 3 runs in a single week.', 2, 'badge-running-weekly-count-3'),
    ('weekly_run_count', 'quad', 'Quad', 4, 'Completed 4 runs in a single week.', 3, 'badge-running-weekly-count-4'),
    ('weekly_run_count', 'five', 'Five', 5, 'Completed 5 runs in a single week.', 4, 'badge-running-weekly-count-5'),
    ('weekly_run_count', 'six', 'Six', 6, 'Completed 6 runs in a single week.', 5, 'badge-running-weekly-count-6'),

    ('weekly_run_streak', '2-weeks', '2 Weeks', 2, 'Held a 2-week run streak with at least 3 runs per week.', 1, 'badge-running-weekly-streak-2'),
    ('weekly_run_streak', '4-weeks', '4 Weeks', 4, 'Held a 4-week run streak with at least 3 runs per week.', 2, 'badge-running-weekly-streak-4'),
    ('weekly_run_streak', '8-weeks', '8 Weeks', 8, 'Held an 8-week run streak with at least 3 runs per week.', 3, 'badge-running-weekly-streak-8'),
    ('weekly_run_streak', '12-weeks', '12 Weeks', 12, 'Held a 12-week run streak with at least 3 runs per week.', 4, 'badge-running-weekly-streak-12'),
    ('weekly_run_streak', '24-weeks', '24 Weeks', 24, 'Held a 24-week run streak with at least 3 runs per week.', 5, 'badge-running-weekly-streak-24'),

    ('lifetime_distance', '50km', '50 km', 50000, 'Reached 50 km of lifetime running distance.', 1, 'badge-running-lifetime-distance-50k'),
    ('lifetime_distance', '100km', '100 km', 100000, 'Reached 100 km of lifetime running distance.', 2, 'badge-running-lifetime-distance-100k'),
    ('lifetime_distance', '250km', '250 km', 250000, 'Reached 250 km of lifetime running distance.', 3, 'badge-running-lifetime-distance-250k'),
    ('lifetime_distance', '500km', '500 km', 500000, 'Reached 500 km of lifetime running distance.', 4, 'badge-running-lifetime-distance-500k'),
    ('lifetime_distance', '1000km', '1000 km', 1000000, 'Reached 1,000 km of lifetime running distance.', 5, 'badge-running-lifetime-distance-1000k'),

    ('longest_run', '5k', '5K', 5000, 'Set a 5K longest run record.', 1, 'badge-running-longest-run-5k'),
    ('longest_run', '10k', '10K', 10000, 'Set a 10K longest run record.', 2, 'badge-running-longest-run-10k'),
    ('longest_run', '15k', '15K', 15000, 'Set a 15K longest run record.', 3, 'badge-running-longest-run-15k'),
    ('longest_run', 'half', 'Half', 21097.50, 'Set a half-marathon longest run record.', 4, 'badge-running-longest-run-half'),
    ('longest_run', 'marathon', 'Marathon', 42195, 'Set a marathon-distance longest run record.', 5, 'badge-running-longest-run-marathon'),

    ('distance_milestones', 'mile', 'Mile', 1609.34, 'Completed a run at least 1 mile long.', 1, 'badge-running-distance-milestone-mile'),
    ('distance_milestones', '5k', '5K', 5000, 'Completed a run at least 5K long.', 2, 'badge-running-distance-milestone-5k'),
    ('distance_milestones', '10k', '10K', 10000, 'Completed a run at least 10K long.', 3, 'badge-running-distance-milestone-10k'),
    ('distance_milestones', 'half', 'Half', 21097.50, 'Completed a run at least half-marathon distance.', 4, 'badge-running-distance-milestone-half'),
    ('distance_milestones', 'marathon', 'Marathon', 42195, 'Completed a run at least marathon distance.', 5, 'badge-running-distance-milestone-marathon'),

    ('total_time', '5h', '5 Hours', 18000, 'Accumulated 5 hours of running time.', 1, 'badge-running-total-time-5h'),
    ('total_time', '10h', '10 Hours', 36000, 'Accumulated 10 hours of running time.', 2, 'badge-running-total-time-10h'),
    ('total_time', '25h', '25 Hours', 90000, 'Accumulated 25 hours of running time.', 3, 'badge-running-total-time-25h'),
    ('total_time', '50h', '50 Hours', 180000, 'Accumulated 50 hours of running time.', 4, 'badge-running-total-time-50h'),
    ('total_time', '100h', '100 Hours', 360000, 'Accumulated 100 hours of running time.', 5, 'badge-running-total-time-100h'),

    ('elevation_gain', '100m', '100 m', 100, 'Climbed 100 m of cumulative run elevation.', 1, 'badge-running-elevation-100'),
    ('elevation_gain', '500m', '500 m', 500, 'Climbed 500 m of cumulative run elevation.', 2, 'badge-running-elevation-500'),
    ('elevation_gain', '1000m', '1000 m', 1000, 'Climbed 1,000 m of cumulative run elevation.', 3, 'badge-running-elevation-1000'),
    ('elevation_gain', '2500m', '2500 m', 2500, 'Climbed 2,500 m of cumulative run elevation.', 4, 'badge-running-elevation-2500'),
    ('elevation_gain', '5000m', '5000 m', 5000, 'Climbed 5,000 m of cumulative run elevation.', 5, 'badge-running-elevation-5000'),

    ('pace_record', '830-pace', '8:30/km', 1.9608, 'Hit an average pace equivalent to 8:30 per km or faster.', 1, 'badge-running-pace-record-830'),
    ('pace_record', '700-pace', '7:00/km', 2.3810, 'Hit an average pace equivalent to 7:00 per km or faster.', 2, 'badge-running-pace-record-700'),
    ('pace_record', '600-pace', '6:00/km', 2.7778, 'Hit an average pace equivalent to 6:00 per km or faster.', 3, 'badge-running-pace-record-600'),
    ('pace_record', '500-pace', '5:00/km', 3.3333, 'Hit an average pace equivalent to 5:00 per km or faster.', 4, 'badge-running-pace-record-500'),
    ('pace_record', '415-pace', '4:15/km', 3.9216, 'Hit an average pace equivalent to 4:15 per km or faster.', 5, 'badge-running-pace-record-415'),

    ('fastest_mile', '10-min', '10:00', 2.6822, 'Recorded an equivalent mile performance of 10:00 or faster.', 1, 'badge-running-fastest-mile-10'),
    ('fastest_mile', '8-min', '8:00', 3.3528, 'Recorded an equivalent mile performance of 8:00 or faster.', 2, 'badge-running-fastest-mile-8'),
    ('fastest_mile', '7-min', '7:00', 3.8318, 'Recorded an equivalent mile performance of 7:00 or faster.', 3, 'badge-running-fastest-mile-7'),
    ('fastest_mile', '6-min', '6:00', 4.4704, 'Recorded an equivalent mile performance of 6:00 or faster.', 4, 'badge-running-fastest-mile-6'),
    ('fastest_mile', '5-min', '5:00', 5.3645, 'Recorded an equivalent mile performance of 5:00 or faster.', 5, 'badge-running-fastest-mile-5'),

    ('fastest_5k', '35-min', '35:00', 2.3810, 'Recorded an equivalent 5K performance of 35:00 or faster.', 1, 'badge-running-fastest-5k-35'),
    ('fastest_5k', '30-min', '30:00', 2.7778, 'Recorded an equivalent 5K performance of 30:00 or faster.', 2, 'badge-running-fastest-5k-30'),
    ('fastest_5k', '25-min', '25:00', 3.3333, 'Recorded an equivalent 5K performance of 25:00 or faster.', 3, 'badge-running-fastest-5k-25'),
    ('fastest_5k', '2230', '22:30', 3.7037, 'Recorded an equivalent 5K performance of 22:30 or faster.', 4, 'badge-running-fastest-5k-2230'),
    ('fastest_5k', '20-min', '20:00', 4.1667, 'Recorded an equivalent 5K performance of 20:00 or faster.', 5, 'badge-running-fastest-5k-20'),

    ('fastest_10k', '70-min', '70:00', 2.3810, 'Recorded an equivalent 10K performance of 70:00 or faster.', 1, 'badge-running-fastest-10k-70'),
    ('fastest_10k', '60-min', '60:00', 2.7778, 'Recorded an equivalent 10K performance of 60:00 or faster.', 2, 'badge-running-fastest-10k-60'),
    ('fastest_10k', '50-min', '50:00', 3.3333, 'Recorded an equivalent 10K performance of 50:00 or faster.', 3, 'badge-running-fastest-10k-50'),
    ('fastest_10k', '45-min', '45:00', 3.7037, 'Recorded an equivalent 10K performance of 45:00 or faster.', 4, 'badge-running-fastest-10k-45'),
    ('fastest_10k', '40-min', '40:00', 4.1667, 'Recorded an equivalent 10K performance of 40:00 or faster.', 5, 'badge-running-fastest-10k-40'),

    ('fastest_half', '230', '2:30', 2.3442, 'Recorded an equivalent half-marathon performance of 2:30 or faster.', 1, 'badge-running-fastest-half-230'),
    ('fastest_half', '200', '2:00', 2.9302, 'Recorded an equivalent half-marathon performance of 2:00 or faster.', 2, 'badge-running-fastest-half-200'),
    ('fastest_half', '145', '1:45', 3.3488, 'Recorded an equivalent half-marathon performance of 1:45 or faster.', 3, 'badge-running-fastest-half-145'),
    ('fastest_half', '135', '1:35', 3.7013, 'Recorded an equivalent half-marathon performance of 1:35 or faster.', 4, 'badge-running-fastest-half-135'),
    ('fastest_half', '125', '1:25', 4.1368, 'Recorded an equivalent half-marathon performance of 1:25 or faster.', 5, 'badge-running-fastest-half-125'),

    ('fastest_marathon', '530', '5:30', 2.1311, 'Recorded an equivalent marathon performance of 5:30 or faster.', 1, 'badge-running-fastest-marathon-530'),
    ('fastest_marathon', '430', '4:30', 2.6034, 'Recorded an equivalent marathon performance of 4:30 or faster.', 2, 'badge-running-fastest-marathon-430'),
    ('fastest_marathon', '400', '4:00', 2.9299, 'Recorded an equivalent marathon performance of 4:00 or faster.', 3, 'badge-running-fastest-marathon-400'),
    ('fastest_marathon', '330', '3:30', 3.3496, 'Recorded an equivalent marathon performance of 3:30 or faster.', 4, 'badge-running-fastest-marathon-330'),
    ('fastest_marathon', '300', '3:00', 3.9083, 'Recorded an equivalent marathon performance of 3:00 or faster.', 5, 'badge-running-fastest-marathon-300')
)
insert into badges.badge_tiers (
  badge_series_id,
  tier_code,
  tier_name,
  threshold_value,
  unlock_copy,
  display_order,
  icon_placeholder
)
select
  s.id,
  t.tier_code,
  t.tier_name,
  t.threshold_value,
  t.unlock_copy,
  t.display_order,
  t.icon_placeholder
from tier_seed t
join badges.badge_series s
  on s.domain = 'running'
 and s.code = t.badge_code
on conflict (badge_series_id, tier_code) do update
set tier_name = excluded.tier_name,
    threshold_value = excluded.threshold_value,
    unlock_copy = excluded.unlock_copy,
    display_order = excluded.display_order,
    icon_placeholder = excluded.icon_placeholder;

create or replace function public.get_badge_unlocks_for_source_user(
  p_owner_id uuid,
  p_source_type text,
  p_source_id uuid,
  p_domain text default null,
  p_limit integer default 6
)
returns table (
  unlock_id uuid,
  user_id uuid,
  badge_series_id uuid,
  badge_tier_id uuid,
  domain text,
  code text,
  name text,
  description text,
  badge_kind text,
  metric_key text,
  progress_mode text,
  series_icon_placeholder text,
  tier_code text,
  tier_name text,
  threshold_value numeric,
  tier_icon_placeholder text,
  unlock_copy text,
  source_type text,
  source_id uuid,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, badges, social, strength, run_walk
as $$
declare
  v_me uuid := auth.uid();
  v_source_type text := nullif(trim(coalesce(p_source_type, '')), '');
  v_domain text := nullif(trim(coalesce(p_domain, '')), '');
  v_limit integer := greatest(1, least(coalesce(p_limit, 6), 20));
  v_has_visible_source boolean := false;
begin
  if p_owner_id is null or p_source_id is null or v_source_type is null then
    return;
  end if;

  if v_me is not null and v_me = p_owner_id then
    v_has_visible_source := true;
  elsif v_source_type = 'strength_workout' then
    select exists (
      select 1
      from strength.strength_workouts w
      where w.id = p_source_id
        and w.user_id = p_owner_id
        and (
          social.can_view_post(v_me, w.user_id, coalesce(w.privacy::text, 'private'))
          or exists (
            select 1
            from social.posts p
            where p.user_id = p_owner_id
              and p.source_type = v_source_type
              and p.source_id = p_source_id
              and social.can_view_post(v_me, p.user_id, p.visibility)
          )
        )
    )
    into v_has_visible_source;
  elsif v_source_type = 'run_walk_session' then
    select exists (
      select 1
      from (
        select s.id
        from run_walk.sessions s
        where s.id = p_source_id
          and s.user_id = p_owner_id
          and s.status = 'completed'
          and s.ended_at is not null
          and badges.is_running_activity(s.exercise_type::text)

        union all

        select s.id
        from run_walk.outdoor_sessions s
        where s.id = p_source_id
          and s.user_id = p_owner_id
          and s.status = 'completed'
          and s.ended_at is not null
          and badges.is_running_activity(s.activity_type::text)
      ) visible_run
      where exists (
        select 1
        from social.posts p
        where p.user_id = p_owner_id
          and p.session_id = p_source_id
          and p.activity_type = 'run'
          and social.can_view_post(v_me, p.user_id, p.visibility)
      )
    )
    into v_has_visible_source;
  else
    v_has_visible_source := badges.can_view_user_badges(v_me, p_owner_id);
  end if;

  if not coalesce(v_has_visible_source, false) then
    return;
  end if;

  return query
  select
    u.id as unlock_id,
    u.user_id,
    s.id as badge_series_id,
    t.id as badge_tier_id,
    s.domain,
    s.code,
    s.name,
    s.description,
    s.badge_kind,
    s.metric_key,
    s.progress_mode,
    s.icon_placeholder as series_icon_placeholder,
    t.tier_code,
    t.tier_name,
    t.threshold_value,
    t.icon_placeholder as tier_icon_placeholder,
    t.unlock_copy,
    u.source_type,
    u.source_id,
    u.created_at
  from badges.user_badge_unlocks u
  join badges.badge_series s
    on s.id = u.badge_series_id
  join badges.badge_tiers t
    on t.id = u.badge_tier_id
  where u.user_id = p_owner_id
    and u.source_type = v_source_type
    and u.source_id = p_source_id
    and (v_domain is null or s.domain = v_domain)
  order by u.created_at desc
  limit v_limit;
end;
$$;

grant execute on function public.get_badge_unlocks_for_source_user(uuid, text, uuid, text, integer) to authenticated;

do $$
declare
  v_owner_id uuid;
begin
  for v_owner_id in
    select distinct user_id
    from (
      select s.user_id
      from run_walk.sessions s
      where s.user_id is not null
        and s.status = 'completed'
        and s.ended_at is not null
        and badges.is_running_activity(s.exercise_type::text)

      union

      select s.user_id
      from run_walk.outdoor_sessions s
      where s.user_id is not null
        and s.status = 'completed'
        and s.ended_at is not null
        and badges.is_running_activity(s.activity_type::text)
    ) running_owners
  loop
    perform badges.evaluate_running_badges_for_user(v_owner_id, 'run_walk_session', null);
  end loop;
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
      '20260402_badges_running_rollout',
      'Extended the shared badges schema with running badge series and tiers, added unified indoor and outdoor running badge evaluation triggers, and enabled running badge source lookups for summary and social surfaces.'
    )
    on conflict (change_key) do nothing;
  end if;
end;
$$;

commit;
