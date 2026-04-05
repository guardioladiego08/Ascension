begin;

create schema if not exists badges;

grant usage on schema badges to authenticated;

create table if not exists badges.badge_series (
  id uuid primary key default gen_random_uuid(),
  domain text not null,
  code text not null,
  name text not null,
  description text null,
  badge_kind text not null default 'milestone',
  metric_key text not null,
  progress_mode text not null default 'count',
  icon_placeholder text not null default 'badge-placeholder',
  display_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint badge_series_domain_check
    check (domain in ('strength', 'running', 'nutrition')),
  constraint badge_series_kind_check
    check (badge_kind in ('milestone', 'streak', 'record', 'consistency')),
  constraint badge_series_progress_mode_check
    check (progress_mode in ('count', 'current_best', 'record', 'streak')),
  constraint badge_series_domain_code_key unique (domain, code)
);

create table if not exists badges.badge_tiers (
  id uuid primary key default gen_random_uuid(),
  badge_series_id uuid not null references badges.badge_series(id) on delete cascade,
  tier_code text not null,
  tier_name text not null,
  threshold_value numeric(12, 2) not null,
  unlock_copy text null,
  display_order integer not null default 0,
  icon_placeholder text not null default 'badge-placeholder',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint badge_tiers_threshold_positive check (threshold_value >= 0),
  constraint badge_tiers_series_tier_code_key unique (badge_series_id, tier_code)
);

create table if not exists badges.user_badge_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  badge_series_id uuid not null references badges.badge_series(id) on delete cascade,
  current_value numeric(12, 2) not null default 0,
  best_value numeric(12, 2) not null default 0,
  highest_tier_id uuid null references badges.badge_tiers(id) on delete set null,
  last_source_type text null,
  last_source_id uuid null,
  last_evaluated_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, badge_series_id)
);

create table if not exists badges.user_badge_unlocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  badge_series_id uuid not null references badges.badge_series(id) on delete cascade,
  badge_tier_id uuid not null references badges.badge_tiers(id) on delete cascade,
  source_type text null,
  source_id uuid null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint user_badge_unlocks_user_tier_key unique (user_id, badge_tier_id)
);

create index if not exists badge_series_domain_order_idx
  on badges.badge_series (domain, display_order asc, created_at asc);

create index if not exists badge_tiers_series_display_idx
  on badges.badge_tiers (badge_series_id, display_order asc);

create index if not exists badge_tiers_series_threshold_idx
  on badges.badge_tiers (badge_series_id, threshold_value asc);

create index if not exists user_badge_progress_user_idx
  on badges.user_badge_progress (user_id, updated_at desc);

create index if not exists user_badge_unlocks_user_created_idx
  on badges.user_badge_unlocks (user_id, created_at desc);

create index if not exists user_badge_unlocks_source_idx
  on badges.user_badge_unlocks (source_type, source_id, created_at desc)
  where source_id is not null;

create index if not exists user_badge_unlocks_series_created_idx
  on badges.user_badge_unlocks (badge_series_id, created_at desc);

create or replace function badges.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists badge_series_set_updated_at on badges.badge_series;
create trigger badge_series_set_updated_at
before update on badges.badge_series
for each row execute function badges.set_updated_at();

drop trigger if exists badge_tiers_set_updated_at on badges.badge_tiers;
create trigger badge_tiers_set_updated_at
before update on badges.badge_tiers
for each row execute function badges.set_updated_at();

drop trigger if exists user_badge_progress_set_updated_at on badges.user_badge_progress;
create trigger user_badge_progress_set_updated_at
before update on badges.user_badge_progress
for each row execute function badges.set_updated_at();

alter table badges.badge_series enable row level security;
alter table badges.badge_tiers enable row level security;
alter table badges.user_badge_progress enable row level security;
alter table badges.user_badge_unlocks enable row level security;

grant select on badges.badge_series to authenticated;
grant select on badges.badge_tiers to authenticated;
grant select on badges.user_badge_progress to authenticated;
grant select on badges.user_badge_unlocks to authenticated;

drop policy if exists badge_series_select_authenticated on badges.badge_series;
create policy badge_series_select_authenticated
on badges.badge_series
for select
to authenticated
using (true);

drop policy if exists badge_tiers_select_authenticated on badges.badge_tiers;
create policy badge_tiers_select_authenticated
on badges.badge_tiers
for select
to authenticated
using (true);

drop policy if exists user_badge_progress_select_own on badges.user_badge_progress;
create policy user_badge_progress_select_own
on badges.user_badge_progress
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists user_badge_unlocks_select_own on badges.user_badge_unlocks;
create policy user_badge_unlocks_select_own
on badges.user_badge_unlocks
for select
to authenticated
using (auth.uid() = user_id);

create or replace function badges.local_week_start(
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
      v_tz := 'UTC';
      v_local_day := (p_anchor at time zone 'UTC')::date;
  end;

  return v_local_day - ((extract(dow from v_local_day)::int + 6) % 7);
end;
$$;

create or replace function badges.strength_exercise_matches_lift(
  p_lift_key text,
  p_exercise_name text,
  p_core_movement text
)
returns boolean
language plpgsql
immutable
as $$
declare
  v_lift_key text := lower(trim(coalesce(p_lift_key, '')));
  v_name text := lower(trim(coalesce(p_exercise_name, '')));
  v_core text := lower(trim(coalesce(p_core_movement, '')));
begin
  if v_lift_key = '' then
    return false;
  end if;

  case v_lift_key
    when 'squat' then
      return v_core = 'squat' or v_name like '%squat%';
    when 'bench' then
      return v_name like '%bench%';
    when 'deadlift' then
      return v_name like '%deadlift%';
    when 'overhead' then
      return v_core = 'overhead_push'
        or v_name like '%overhead%'
        or v_name like '%shoulder press%'
        or v_name like '%push press%';
    when 'pull_up' then
      return v_core = 'pull_down'
        and (
          v_name ~ 'pull[\s-]*up'
          or v_name ~ 'chin[\s-]*up'
        );
    else
      return false;
  end case;
end;
$$;

create or replace function badges.best_strength_lift_value(
  p_user_id uuid,
  p_lift_key text,
  p_workout_id uuid default null
)
returns numeric
language sql
stable
security definer
set search_path = public, badges, strength
as $$
  select coalesce(max(es.best_est_1rm), 0)::numeric
  from strength.exercise_summary es
  join strength.strength_workouts w
    on w.id = es.strength_workout_id
  join public.exercises ex
    on ex.id = es.exercise_id
  where w.user_id = p_user_id
    and w.ended_at is not null
    and (p_workout_id is null or w.id = p_workout_id)
    and coalesce(es.best_est_1rm, 0) > 0
    and badges.strength_exercise_matches_lift(
      p_lift_key,
      ex.exercise_name,
      ex.core_movement
    );
$$;

create or replace function badges.best_strength_pull_up_reps(
  p_user_id uuid,
  p_workout_id uuid default null
)
returns integer
language sql
stable
security definer
set search_path = public, badges, strength
as $$
  select coalesce(max(greatest(coalesce(ss.reps, 0), 0)), 0)::integer
  from strength.strength_sets ss
  join strength.strength_workouts w
    on w.id = ss.strength_workout_id
  join public.exercises ex
    on ex.id = ss.exercise_id
  where w.user_id = p_user_id
    and w.ended_at is not null
    and (p_workout_id is null or w.id = p_workout_id)
    and badges.strength_exercise_matches_lift(
      'pull_up',
      ex.exercise_name,
      ex.core_movement
    );
$$;

create or replace function badges.can_view_user_badges(
  p_viewer uuid,
  p_owner uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = public, badges, social
as $$
begin
  if p_owner is null then
    return false;
  end if;

  if p_viewer is not null and p_viewer = p_owner then
    return true;
  end if;

  if p_viewer is not null and social.is_blocked(p_viewer, p_owner) then
    return false;
  end if;

  if not social.profile_is_private(p_owner) then
    return true;
  end if;

  if p_viewer is null then
    return false;
  end if;

  return social.is_following(p_viewer, p_owner);
end;
$$;

create or replace function badges.apply_progress_snapshot(
  p_user_id uuid,
  p_domain text,
  p_badge_code text,
  p_current_value numeric,
  p_best_value numeric,
  p_unlock_value numeric,
  p_source_type text default null,
  p_source_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public, badges
as $$
declare
  v_badge_series_id uuid;
  v_existing_best numeric := 0;
  v_current_value numeric := greatest(coalesce(p_current_value, 0), 0);
  v_best_value numeric;
  v_unlock_value numeric;
  v_highest_tier_id uuid;
begin
  select s.id
  into v_badge_series_id
  from badges.badge_series s
  where s.domain = p_domain
    and s.code = p_badge_code;

  if v_badge_series_id is null then
    raise exception 'Badge series %.% not found', p_domain, p_badge_code;
  end if;

  select coalesce(p.best_value, 0)
  into v_existing_best
  from badges.user_badge_progress p
  where p.user_id = p_user_id
    and p.badge_series_id = v_badge_series_id;

  v_best_value := greatest(
    v_current_value,
    coalesce(p_best_value, 0),
    coalesce(p_unlock_value, 0),
    coalesce(v_existing_best, 0)
  );

  v_unlock_value := greatest(v_best_value, coalesce(p_unlock_value, 0));

  select bt.id
  into v_highest_tier_id
  from badges.badge_tiers bt
  where bt.badge_series_id = v_badge_series_id
    and bt.threshold_value <= v_unlock_value
  order by bt.threshold_value desc, bt.display_order desc
  limit 1;

  insert into badges.user_badge_progress (
    user_id,
    badge_series_id,
    current_value,
    best_value,
    highest_tier_id,
    last_source_type,
    last_source_id,
    last_evaluated_at
  )
  values (
    p_user_id,
    v_badge_series_id,
    v_current_value,
    v_best_value,
    v_highest_tier_id,
    nullif(trim(coalesce(p_source_type, '')), ''),
    p_source_id,
    timezone('utc', now())
  )
  on conflict (user_id, badge_series_id) do update
  set current_value = excluded.current_value,
      best_value = greatest(
        badges.user_badge_progress.best_value,
        excluded.best_value,
        excluded.current_value
      ),
      highest_tier_id = coalesce(v_highest_tier_id, badges.user_badge_progress.highest_tier_id),
      last_source_type = excluded.last_source_type,
      last_source_id = excluded.last_source_id,
      last_evaluated_at = excluded.last_evaluated_at;

  insert into badges.user_badge_unlocks (
    user_id,
    badge_series_id,
    badge_tier_id,
    source_type,
    source_id
  )
  select
    p_user_id,
    v_badge_series_id,
    bt.id,
    nullif(trim(coalesce(p_source_type, '')), ''),
    p_source_id
  from badges.badge_tiers bt
  where bt.badge_series_id = v_badge_series_id
    and bt.threshold_value <= v_unlock_value
  on conflict (user_id, badge_tier_id) do nothing;
end;
$$;

create or replace function badges.evaluate_strength_badges_for_user(
  p_user_id uuid,
  p_source_type text default 'strength_workout',
  p_source_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public, badges, strength
as $$
declare
  v_user_id uuid := p_user_id;
  v_source_type text := nullif(trim(coalesce(p_source_type, '')), '');
  v_source_id uuid := p_source_id;
  v_current_workout_id uuid := p_source_id;
  v_current_week_start date := null;
  v_total_workouts integer := 0;
  v_current_week_count integer := 0;
  v_best_week_count integer := 0;
  v_current_streak integer := 0;
  v_best_streak integer := 0;
  v_perfect_weeks integer := 0;
  v_lifetime_volume numeric := 0;
  v_current_workout_volume numeric := 0;
  v_best_workout_volume numeric := 0;
  v_current_workout_exercise_count integer := 0;
  v_best_workout_exercise_count integer := 0;
  v_current_workout_pr_count integer := 0;
  v_total_pr_count integer := 0;
  v_current_squat numeric := 0;
  v_best_squat numeric := 0;
  v_current_bench numeric := 0;
  v_best_bench numeric := 0;
  v_current_deadlift numeric := 0;
  v_best_deadlift numeric := 0;
  v_current_overhead numeric := 0;
  v_best_overhead numeric := 0;
  v_current_pull_up_reps integer := 0;
  v_best_pull_up_reps integer := 0;
  v_big_three_total numeric := 0;
begin
  if v_user_id is null then
    return;
  end if;

  if v_source_type is null then
    v_source_type := 'strength_workout';
  end if;

  if v_current_workout_id is null then
    select w.id
    into v_current_workout_id
    from strength.strength_workouts w
    where w.user_id = v_user_id
      and w.ended_at is not null
    order by coalesce(w.ended_at, w.started_at) desc, w.id desc
    limit 1;
  end if;

  if v_current_workout_id is not null then
    select
      badges.local_week_start(
        coalesce(w.ended_at, w.started_at),
        to_jsonb(w)->>'timezone_str'
      ),
      coalesce(w.total_vol, 0),
      coalesce(count(distinct es.exercise_id), 0)::integer
    into
      v_current_week_start,
      v_current_workout_volume,
      v_current_workout_exercise_count
    from strength.strength_workouts w
    left join strength.exercise_summary es
      on es.strength_workout_id = w.id
    where w.id = v_current_workout_id
      and w.user_id = v_user_id
      and w.ended_at is not null
    group by w.id;
  end if;

  select
    coalesce(count(*), 0)::integer,
    coalesce(sum(coalesce(w.total_vol, 0)), 0)::numeric,
    coalesce(max(coalesce(w.total_vol, 0)), 0)::numeric
  into
    v_total_workouts,
    v_lifetime_volume,
    v_best_workout_volume
  from strength.strength_workouts w
  where w.user_id = v_user_id
    and w.ended_at is not null;

  with workout_counts as (
    select
      w.id,
      count(distinct ss.exercise_id)::integer as exercise_count
    from strength.strength_workouts w
    left join strength.strength_sets ss
      on ss.strength_workout_id = w.id
    where w.user_id = v_user_id
      and w.ended_at is not null
    group by w.id
  )
  select coalesce(max(exercise_count), 0)
  into v_best_workout_exercise_count
  from workout_counts;

  with workout_weeks as (
    select
      badges.local_week_start(
        coalesce(w.ended_at, w.started_at),
        to_jsonb(w)->>'timezone_str'
      ) as week_start,
      count(*)::integer as workout_count
    from strength.strength_workouts w
    where w.user_id = v_user_id
      and w.ended_at is not null
    group by 1
  )
  select
    coalesce(max(workout_count), 0),
    coalesce(max(case when week_start = v_current_week_start then workout_count else 0 end), 0),
    coalesce(count(*) filter (where workout_count >= 4), 0)
  into
    v_best_week_count,
    v_current_week_count,
    v_perfect_weeks
  from workout_weeks;

  with workout_weeks as (
    select
      badges.local_week_start(
        coalesce(w.ended_at, w.started_at),
        to_jsonb(w)->>'timezone_str'
      ) as week_start,
      count(*)::integer as workout_count
    from strength.strength_workouts w
    where w.user_id = v_user_id
      and w.ended_at is not null
    group by 1
  ),
  qualified_weeks as (
    select
      week_start,
      row_number() over (order by week_start) as rn
    from workout_weeks
    where workout_count >= 2
  ),
  grouped_streaks as (
    select
      week_start,
      week_start - (rn::integer * 7) as grp
    from qualified_weeks
  ),
  streaks as (
    select
      max(week_start) as streak_end,
      count(*)::integer as streak_len
    from grouped_streaks
    group by grp
  )
  select
    coalesce(max(streak_len), 0),
    coalesce(max(case when streak_end = v_current_week_start then streak_len else 0 end), 0)
  into
    v_best_streak,
    v_current_streak
  from streaks;

  with ordered_records as (
    select
      es.strength_workout_id,
      es.exercise_id,
      es.best_est_1rm::numeric as best_est_1rm,
      max(es.best_est_1rm::numeric) over (
        partition by es.exercise_id
        order by coalesce(w.ended_at, w.started_at), w.id
        rows between unbounded preceding and 1 preceding
      ) as prev_best
    from strength.exercise_summary es
    join strength.strength_workouts w
      on w.id = es.strength_workout_id
    where w.user_id = v_user_id
      and w.ended_at is not null
      and coalesce(es.best_est_1rm, 0) > 0
  )
  select
    coalesce(count(*) filter (
      where best_est_1rm > coalesce(prev_best, -1)
    ), 0),
    coalesce(count(*) filter (
      where strength_workout_id = v_current_workout_id
        and best_est_1rm > coalesce(prev_best, -1)
    ), 0)
  into
    v_total_pr_count,
    v_current_workout_pr_count
  from ordered_records;

  v_current_squat := badges.best_strength_lift_value(v_user_id, 'squat', v_current_workout_id);
  v_best_squat := badges.best_strength_lift_value(v_user_id, 'squat', null);
  v_current_bench := badges.best_strength_lift_value(v_user_id, 'bench', v_current_workout_id);
  v_best_bench := badges.best_strength_lift_value(v_user_id, 'bench', null);
  v_current_deadlift := badges.best_strength_lift_value(v_user_id, 'deadlift', v_current_workout_id);
  v_best_deadlift := badges.best_strength_lift_value(v_user_id, 'deadlift', null);
  v_current_overhead := badges.best_strength_lift_value(v_user_id, 'overhead', v_current_workout_id);
  v_best_overhead := badges.best_strength_lift_value(v_user_id, 'overhead', null);
  v_current_pull_up_reps := badges.best_strength_pull_up_reps(v_user_id, v_current_workout_id);
  v_best_pull_up_reps := badges.best_strength_pull_up_reps(v_user_id, null);
  v_big_three_total := coalesce(v_best_squat, 0) + coalesce(v_best_bench, 0) + coalesce(v_best_deadlift, 0);

  perform badges.apply_progress_snapshot(
    v_user_id,
    'strength',
    'first_workout',
    v_total_workouts,
    v_total_workouts,
    v_total_workouts,
    v_source_type,
    v_source_id
  );

  perform badges.apply_progress_snapshot(
    v_user_id,
    'strength',
    'total_workouts',
    v_total_workouts,
    v_total_workouts,
    v_total_workouts,
    v_source_type,
    v_source_id
  );

  perform badges.apply_progress_snapshot(
    v_user_id,
    'strength',
    'weekly_workout_count',
    v_current_week_count,
    v_best_week_count,
    v_best_week_count,
    v_source_type,
    v_source_id
  );

  perform badges.apply_progress_snapshot(
    v_user_id,
    'strength',
    'workout_streak',
    v_current_streak,
    v_best_streak,
    v_best_streak,
    v_source_type,
    v_source_id
  );

  perform badges.apply_progress_snapshot(
    v_user_id,
    'strength',
    'perfect_weeks',
    v_perfect_weeks,
    v_perfect_weeks,
    v_perfect_weeks,
    v_source_type,
    v_source_id
  );

  perform badges.apply_progress_snapshot(
    v_user_id,
    'strength',
    'lifetime_volume',
    v_lifetime_volume,
    v_lifetime_volume,
    v_lifetime_volume,
    v_source_type,
    v_source_id
  );

  perform badges.apply_progress_snapshot(
    v_user_id,
    'strength',
    'single_workout_volume_record',
    v_current_workout_volume,
    v_best_workout_volume,
    v_best_workout_volume,
    v_source_type,
    v_source_id
  );

  perform badges.apply_progress_snapshot(
    v_user_id,
    'strength',
    'pr_count',
    v_current_workout_pr_count,
    v_total_pr_count,
    v_total_pr_count,
    v_source_type,
    v_source_id
  );

  perform badges.apply_progress_snapshot(
    v_user_id,
    'strength',
    'squat_pr',
    v_current_squat,
    v_best_squat,
    v_best_squat,
    v_source_type,
    v_source_id
  );

  perform badges.apply_progress_snapshot(
    v_user_id,
    'strength',
    'bench_pr',
    v_current_bench,
    v_best_bench,
    v_best_bench,
    v_source_type,
    v_source_id
  );

  perform badges.apply_progress_snapshot(
    v_user_id,
    'strength',
    'deadlift_pr',
    v_current_deadlift,
    v_best_deadlift,
    v_best_deadlift,
    v_source_type,
    v_source_id
  );

  perform badges.apply_progress_snapshot(
    v_user_id,
    'strength',
    'overhead_pr',
    v_current_overhead,
    v_best_overhead,
    v_best_overhead,
    v_source_type,
    v_source_id
  );

  perform badges.apply_progress_snapshot(
    v_user_id,
    'strength',
    'pull_up_reps',
    v_current_pull_up_reps,
    v_best_pull_up_reps,
    v_best_pull_up_reps,
    v_source_type,
    v_source_id
  );

  perform badges.apply_progress_snapshot(
    v_user_id,
    'strength',
    'big_three_total',
    v_big_three_total,
    v_big_three_total,
    v_big_three_total,
    v_source_type,
    v_source_id
  );

  perform badges.apply_progress_snapshot(
    v_user_id,
    'strength',
    'exercise_count',
    v_current_workout_exercise_count,
    v_best_workout_exercise_count,
    v_best_workout_exercise_count,
    v_source_type,
    v_source_id
  );
end;
$$;

create or replace function badges.apply_strength_workout_badges()
returns trigger
language plpgsql
security definer
set search_path = public, badges, strength
as $$
begin
  if tg_op = 'DELETE' then
    return old;
  end if;

  if new.user_id is null or new.ended_at is null then
    return new;
  end if;

  perform badges.evaluate_strength_badges_for_user(
    new.user_id,
    'strength_workout',
    new.id
  );

  return new;
end;
$$;

drop trigger if exists trg_apply_strength_badges on strength.strength_workouts;
create trigger trg_apply_strength_badges
after insert or update of ended_at, total_vol
on strength.strength_workouts
for each row
execute function badges.apply_strength_workout_badges();

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
    ('strength', 'first_workout', 'First Rep', 'Complete your first strength workout.', 'milestone', 'completed_workouts', 'count', 'badge-strength-first-workout', 10, '{"unit":"workouts"}'::jsonb),
    ('strength', 'total_workouts', 'Iron Habit', 'Build your long-term lifting volume through completed workouts.', 'milestone', 'completed_workouts', 'count', 'badge-strength-total-workouts', 20, '{"unit":"workouts"}'::jsonb),
    ('strength', 'weekly_workout_count', 'Weekly Lift Count', 'Hit higher completed workout counts inside a single week.', 'consistency', 'weekly_workout_count', 'current_best', 'badge-strength-weekly-count', 30, '{"unit":"workouts"}'::jsonb),
    ('strength', 'workout_streak', 'Strength Streak', 'Stack consecutive weeks with at least two completed strength workouts.', 'streak', 'qualified_week_streak', 'streak', 'badge-strength-streak', 40, '{"unit":"weeks","qualifier":"2_workouts_per_week"}'::jsonb),
    ('strength', 'perfect_weeks', 'Perfect Weeks', 'Accumulate weeks with four or more completed strength workouts.', 'consistency', 'perfect_weeks_total', 'count', 'badge-strength-perfect-weeks', 50, '{"unit":"weeks","qualifier":"4_workouts_per_week"}'::jsonb),
    ('strength', 'lifetime_volume', 'Lifetime Volume', 'Accumulate total weight lifted across all completed strength workouts.', 'milestone', 'lifetime_volume_kg', 'count', 'badge-strength-lifetime-volume', 60, '{"unit":"kg"}'::jsonb),
    ('strength', 'single_workout_volume_record', 'Big Day Record', 'Set higher single-workout volume records.', 'record', 'single_workout_volume_kg', 'record', 'badge-strength-volume-record', 70, '{"unit":"kg"}'::jsonb),
    ('strength', 'pr_count', 'PR Hunter', 'Set new estimated 1RM records across your strength exercise history.', 'record', 'pr_event_count', 'count', 'badge-strength-pr-count', 80, '{"unit":"prs"}'::jsonb),
    ('strength', 'squat_pr', 'Squat Record', 'Raise your best squat estimated 1RM.', 'record', 'squat_best_est_1rm_kg', 'record', 'badge-strength-squat-pr', 90, '{"unit":"kg"}'::jsonb),
    ('strength', 'bench_pr', 'Bench Record', 'Raise your best bench estimated 1RM.', 'record', 'bench_best_est_1rm_kg', 'record', 'badge-strength-bench-pr', 100, '{"unit":"kg"}'::jsonb),
    ('strength', 'deadlift_pr', 'Deadlift Record', 'Raise your best deadlift estimated 1RM.', 'record', 'deadlift_best_est_1rm_kg', 'record', 'badge-strength-deadlift-pr', 110, '{"unit":"kg"}'::jsonb),
    ('strength', 'overhead_pr', 'Overhead Record', 'Raise your best overhead press estimated 1RM.', 'record', 'overhead_best_est_1rm_kg', 'record', 'badge-strength-overhead-pr', 120, '{"unit":"kg"}'::jsonb),
    ('strength', 'pull_up_reps', 'Pull-Up Milestones', 'Hit higher rep counts on pull-up and chin-up variations.', 'record', 'pull_up_best_reps', 'record', 'badge-strength-pull-up', 130, '{"unit":"reps"}'::jsonb),
    ('strength', 'big_three_total', 'Big Three Total', 'Combine your best squat, bench, and deadlift records into one total.', 'record', 'big_three_total_kg', 'record', 'badge-strength-big-three', 140, '{"unit":"kg"}'::jsonb),
    ('strength', 'exercise_count', 'Exercise Builder', 'Complete workouts with more unique exercises.', 'milestone', 'single_workout_exercise_count', 'current_best', 'badge-strength-exercise-count', 150, '{"unit":"exercises"}'::jsonb)
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
    ('first_workout', 'starter', 'Starter', 1, 'Completed your first strength workout.', 1, 'badge-strength-first-workout-starter'),

    ('total_workouts', 'bronze', 'Bronze', 10, 'Completed 10 strength workouts.', 1, 'badge-strength-total-workouts-bronze'),
    ('total_workouts', 'silver', 'Silver', 25, 'Completed 25 strength workouts.', 2, 'badge-strength-total-workouts-silver'),
    ('total_workouts', 'gold', 'Gold', 50, 'Completed 50 strength workouts.', 3, 'badge-strength-total-workouts-gold'),
    ('total_workouts', 'elite', 'Elite', 100, 'Completed 100 strength workouts.', 4, 'badge-strength-total-workouts-elite'),
    ('total_workouts', 'legend', 'Legend', 250, 'Completed 250 strength workouts.', 5, 'badge-strength-total-workouts-legend'),

    ('weekly_workout_count', 'double', 'Double', 2, 'Completed 2 strength workouts in a single week.', 1, 'badge-strength-weekly-count-double'),
    ('weekly_workout_count', 'triple', 'Triple', 3, 'Completed 3 strength workouts in a single week.', 2, 'badge-strength-weekly-count-triple'),
    ('weekly_workout_count', 'quad', 'Quad', 4, 'Completed 4 strength workouts in a single week.', 3, 'badge-strength-weekly-count-quad'),
    ('weekly_workout_count', 'five', 'Five', 5, 'Completed 5 strength workouts in a single week.', 4, 'badge-strength-weekly-count-five'),
    ('weekly_workout_count', 'six', 'Six', 6, 'Completed 6 strength workouts in a single week.', 5, 'badge-strength-weekly-count-six'),

    ('workout_streak', '2-weeks', '2 Weeks', 2, 'Held a 2-week qualifying workout streak.', 1, 'badge-strength-streak-2-weeks'),
    ('workout_streak', '4-weeks', '4 Weeks', 4, 'Held a 4-week qualifying workout streak.', 2, 'badge-strength-streak-4-weeks'),
    ('workout_streak', '8-weeks', '8 Weeks', 8, 'Held an 8-week qualifying workout streak.', 3, 'badge-strength-streak-8-weeks'),
    ('workout_streak', '12-weeks', '12 Weeks', 12, 'Held a 12-week qualifying workout streak.', 4, 'badge-strength-streak-12-weeks'),
    ('workout_streak', '24-weeks', '24 Weeks', 24, 'Held a 24-week qualifying workout streak.', 5, 'badge-strength-streak-24-weeks'),

    ('perfect_weeks', '1-week', '1 Week', 1, 'Completed your first perfect strength week.', 1, 'badge-strength-perfect-weeks-1'),
    ('perfect_weeks', '4-weeks', '4 Weeks', 4, 'Completed four perfect strength weeks.', 2, 'badge-strength-perfect-weeks-4'),
    ('perfect_weeks', '8-weeks', '8 Weeks', 8, 'Completed eight perfect strength weeks.', 3, 'badge-strength-perfect-weeks-8'),
    ('perfect_weeks', '12-weeks', '12 Weeks', 12, 'Completed 12 perfect strength weeks.', 4, 'badge-strength-perfect-weeks-12'),
    ('perfect_weeks', '24-weeks', '24 Weeks', 24, 'Completed 24 perfect strength weeks.', 5, 'badge-strength-perfect-weeks-24'),

    ('lifetime_volume', '10k', '10K', 10000, 'Lifted 10,000 kg in lifetime volume.', 1, 'badge-strength-lifetime-volume-10k'),
    ('lifetime_volume', '50k', '50K', 50000, 'Lifted 50,000 kg in lifetime volume.', 2, 'badge-strength-lifetime-volume-50k'),
    ('lifetime_volume', '100k', '100K', 100000, 'Lifted 100,000 kg in lifetime volume.', 3, 'badge-strength-lifetime-volume-100k'),
    ('lifetime_volume', '500k', '500K', 500000, 'Lifted 500,000 kg in lifetime volume.', 4, 'badge-strength-lifetime-volume-500k'),
    ('lifetime_volume', '1m', '1M', 1000000, 'Lifted 1,000,000 kg in lifetime volume.', 5, 'badge-strength-lifetime-volume-1m'),

    ('single_workout_volume_record', '1k', '1K', 1000, 'Set a 1,000 kg single-workout volume record.', 1, 'badge-strength-volume-record-1k'),
    ('single_workout_volume_record', '2500', '2.5K', 2500, 'Set a 2,500 kg single-workout volume record.', 2, 'badge-strength-volume-record-2500'),
    ('single_workout_volume_record', '5k', '5K', 5000, 'Set a 5,000 kg single-workout volume record.', 3, 'badge-strength-volume-record-5k'),
    ('single_workout_volume_record', '10k', '10K', 10000, 'Set a 10,000 kg single-workout volume record.', 4, 'badge-strength-volume-record-10k'),
    ('single_workout_volume_record', '20k', '20K', 20000, 'Set a 20,000 kg single-workout volume record.', 5, 'badge-strength-volume-record-20k'),

    ('pr_count', '1-pr', '1 PR', 1, 'Set your first estimated 1RM record.', 1, 'badge-strength-pr-count-1'),
    ('pr_count', '5-prs', '5 PRs', 5, 'Set five estimated 1RM records.', 2, 'badge-strength-pr-count-5'),
    ('pr_count', '10-prs', '10 PRs', 10, 'Set ten estimated 1RM records.', 3, 'badge-strength-pr-count-10'),
    ('pr_count', '25-prs', '25 PRs', 25, 'Set twenty-five estimated 1RM records.', 4, 'badge-strength-pr-count-25'),
    ('pr_count', '50-prs', '50 PRs', 50, 'Set fifty estimated 1RM records.', 5, 'badge-strength-pr-count-50'),

    ('squat_pr', '60kg', '60 kg', 60, 'Hit a 60 kg squat record.', 1, 'badge-strength-squat-pr-60'),
    ('squat_pr', '100kg', '100 kg', 100, 'Hit a 100 kg squat record.', 2, 'badge-strength-squat-pr-100'),
    ('squat_pr', '140kg', '140 kg', 140, 'Hit a 140 kg squat record.', 3, 'badge-strength-squat-pr-140'),
    ('squat_pr', '180kg', '180 kg', 180, 'Hit a 180 kg squat record.', 4, 'badge-strength-squat-pr-180'),
    ('squat_pr', '220kg', '220 kg', 220, 'Hit a 220 kg squat record.', 5, 'badge-strength-squat-pr-220'),

    ('bench_pr', '40kg', '40 kg', 40, 'Hit a 40 kg bench record.', 1, 'badge-strength-bench-pr-40'),
    ('bench_pr', '80kg', '80 kg', 80, 'Hit an 80 kg bench record.', 2, 'badge-strength-bench-pr-80'),
    ('bench_pr', '100kg', '100 kg', 100, 'Hit a 100 kg bench record.', 3, 'badge-strength-bench-pr-100'),
    ('bench_pr', '140kg', '140 kg', 140, 'Hit a 140 kg bench record.', 4, 'badge-strength-bench-pr-140'),
    ('bench_pr', '180kg', '180 kg', 180, 'Hit a 180 kg bench record.', 5, 'badge-strength-bench-pr-180'),

    ('deadlift_pr', '80kg', '80 kg', 80, 'Hit an 80 kg deadlift record.', 1, 'badge-strength-deadlift-pr-80'),
    ('deadlift_pr', '140kg', '140 kg', 140, 'Hit a 140 kg deadlift record.', 2, 'badge-strength-deadlift-pr-140'),
    ('deadlift_pr', '180kg', '180 kg', 180, 'Hit a 180 kg deadlift record.', 3, 'badge-strength-deadlift-pr-180'),
    ('deadlift_pr', '220kg', '220 kg', 220, 'Hit a 220 kg deadlift record.', 4, 'badge-strength-deadlift-pr-220'),
    ('deadlift_pr', '260kg', '260 kg', 260, 'Hit a 260 kg deadlift record.', 5, 'badge-strength-deadlift-pr-260'),

    ('overhead_pr', '30kg', '30 kg', 30, 'Hit a 30 kg overhead record.', 1, 'badge-strength-overhead-pr-30'),
    ('overhead_pr', '50kg', '50 kg', 50, 'Hit a 50 kg overhead record.', 2, 'badge-strength-overhead-pr-50'),
    ('overhead_pr', '70kg', '70 kg', 70, 'Hit a 70 kg overhead record.', 3, 'badge-strength-overhead-pr-70'),
    ('overhead_pr', '90kg', '90 kg', 90, 'Hit a 90 kg overhead record.', 4, 'badge-strength-overhead-pr-90'),
    ('overhead_pr', '110kg', '110 kg', 110, 'Hit a 110 kg overhead record.', 5, 'badge-strength-overhead-pr-110'),

    ('pull_up_reps', '1-rep', '1 Rep', 1, 'Complete your first pull-up or chin-up rep.', 1, 'badge-strength-pull-up-1'),
    ('pull_up_reps', '5-reps', '5 Reps', 5, 'Complete 5 pull-up or chin-up reps.', 2, 'badge-strength-pull-up-5'),
    ('pull_up_reps', '10-reps', '10 Reps', 10, 'Complete 10 pull-up or chin-up reps.', 3, 'badge-strength-pull-up-10'),
    ('pull_up_reps', '15-reps', '15 Reps', 15, 'Complete 15 pull-up or chin-up reps.', 4, 'badge-strength-pull-up-15'),
    ('pull_up_reps', '20-reps', '20 Reps', 20, 'Complete 20 pull-up or chin-up reps.', 5, 'badge-strength-pull-up-20'),

    ('big_three_total', '200kg', '200 kg', 200, 'Reach a 200 kg big three total.', 1, 'badge-strength-big-three-200'),
    ('big_three_total', '300kg', '300 kg', 300, 'Reach a 300 kg big three total.', 2, 'badge-strength-big-three-300'),
    ('big_three_total', '400kg', '400 kg', 400, 'Reach a 400 kg big three total.', 3, 'badge-strength-big-three-400'),
    ('big_three_total', '500kg', '500 kg', 500, 'Reach a 500 kg big three total.', 4, 'badge-strength-big-three-500'),
    ('big_three_total', '600kg', '600 kg', 600, 'Reach a 600 kg big three total.', 5, 'badge-strength-big-three-600'),

    ('exercise_count', '3-exercises', '3 Exercises', 3, 'Complete a workout with 3 exercises.', 1, 'badge-strength-exercise-count-3'),
    ('exercise_count', '5-exercises', '5 Exercises', 5, 'Complete a workout with 5 exercises.', 2, 'badge-strength-exercise-count-5'),
    ('exercise_count', '8-exercises', '8 Exercises', 8, 'Complete a workout with 8 exercises.', 3, 'badge-strength-exercise-count-8'),
    ('exercise_count', '10-exercises', '10 Exercises', 10, 'Complete a workout with 10 exercises.', 4, 'badge-strength-exercise-count-10'),
    ('exercise_count', '12-exercises', '12 Exercises', 12, 'Complete a workout with 12 exercises.', 5, 'badge-strength-exercise-count-12')
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
  on s.domain = 'strength'
 and s.code = t.badge_code
on conflict (badge_series_id, tier_code) do update
set tier_name = excluded.tier_name,
    threshold_value = excluded.threshold_value,
    unlock_copy = excluded.unlock_copy,
    display_order = excluded.display_order,
    icon_placeholder = excluded.icon_placeholder;

create or replace function public.get_badge_progress_user(
  p_user_id uuid default null,
  p_domain text default null,
  p_limit integer default 100
)
returns table (
  badge_series_id uuid,
  domain text,
  code text,
  name text,
  description text,
  badge_kind text,
  metric_key text,
  progress_mode text,
  series_icon_placeholder text,
  display_order integer,
  current_value numeric,
  best_value numeric,
  progress_value numeric,
  highest_tier_id uuid,
  highest_tier_code text,
  highest_tier_name text,
  highest_threshold_value numeric,
  highest_icon_placeholder text,
  next_tier_id uuid,
  next_tier_code text,
  next_tier_name text,
  next_threshold_value numeric,
  next_icon_placeholder text,
  remaining_to_next numeric,
  last_source_type text,
  last_source_id uuid,
  last_evaluated_at timestamptz
)
language plpgsql
security definer
set search_path = public, badges, social
as $$
declare
  v_me uuid := auth.uid();
  v_target_user uuid := coalesce(p_user_id, v_me);
  v_domain text := nullif(trim(coalesce(p_domain, '')), '');
  v_limit integer := greatest(1, least(coalesce(p_limit, 100), 200));
begin
  if v_target_user is null then
    raise exception 'Not authenticated';
  end if;

  if not badges.can_view_user_badges(v_me, v_target_user) then
    return;
  end if;

  return query
  with series_rows as (
    select s.*
    from badges.badge_series s
    where v_domain is null or s.domain = v_domain
    order by s.display_order asc, s.created_at asc
    limit v_limit
  ),
  progress_rows as (
    select p.*
    from badges.user_badge_progress p
    where p.user_id = v_target_user
  )
  select
    s.id as badge_series_id,
    s.domain,
    s.code,
    s.name,
    s.description,
    s.badge_kind,
    s.metric_key,
    s.progress_mode,
    s.icon_placeholder as series_icon_placeholder,
    s.display_order,
    coalesce(p.current_value, 0) as current_value,
    coalesce(p.best_value, 0) as best_value,
    greatest(coalesce(p.best_value, 0), coalesce(p.current_value, 0)) as progress_value,
    ht.id as highest_tier_id,
    ht.tier_code as highest_tier_code,
    ht.tier_name as highest_tier_name,
    ht.threshold_value as highest_threshold_value,
    ht.icon_placeholder as highest_icon_placeholder,
    nt.id as next_tier_id,
    nt.tier_code as next_tier_code,
    nt.tier_name as next_tier_name,
    nt.threshold_value as next_threshold_value,
    nt.icon_placeholder as next_icon_placeholder,
    case
      when nt.threshold_value is null then null
      else greatest(
        nt.threshold_value - greatest(coalesce(p.best_value, 0), coalesce(p.current_value, 0)),
        0
      )
    end as remaining_to_next,
    p.last_source_type,
    p.last_source_id,
    p.last_evaluated_at
  from series_rows s
  left join progress_rows p
    on p.badge_series_id = s.id
  left join badges.badge_tiers ht
    on ht.id = p.highest_tier_id
  left join lateral (
    select bt.*
    from badges.badge_tiers bt
    where bt.badge_series_id = s.id
      and bt.threshold_value > greatest(coalesce(p.best_value, 0), coalesce(p.current_value, 0))
    order by bt.threshold_value asc, bt.display_order asc
    limit 1
  ) nt
    on true
  order by s.display_order asc, s.created_at asc;
end;
$$;

create or replace function public.get_recent_badge_unlocks_user(
  p_user_id uuid default null,
  p_domain text default null,
  p_limit integer default 12
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
set search_path = public, badges, social
as $$
declare
  v_me uuid := auth.uid();
  v_target_user uuid := coalesce(p_user_id, v_me);
  v_domain text := nullif(trim(coalesce(p_domain, '')), '');
  v_limit integer := greatest(1, least(coalesce(p_limit, 12), 50));
begin
  if v_target_user is null then
    raise exception 'Not authenticated';
  end if;

  if not badges.can_view_user_badges(v_me, v_target_user) then
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
  where u.user_id = v_target_user
    and (v_domain is null or s.domain = v_domain)
  order by u.created_at desc
  limit v_limit;
end;
$$;

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
set search_path = public, badges, social, strength
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

grant execute on function public.get_badge_progress_user(uuid, text, integer) to authenticated;
grant execute on function public.get_recent_badge_unlocks_user(uuid, text, integer) to authenticated;
grant execute on function public.get_badge_unlocks_for_source_user(uuid, text, uuid, text, integer) to authenticated;

do $$
declare
  v_owner_id uuid;
begin
  for v_owner_id in
    select distinct w.user_id
    from strength.strength_workouts w
    where w.user_id is not null
      and w.ended_at is not null
  loop
    perform badges.evaluate_strength_badges_for_user(v_owner_id, 'strength_workout', null);
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
      '20260402_badges_strength_foundation',
      'Added the shared badges schema, seeded strength badge series and tiers, added strength badge evaluation triggers, and exposed badge progress/unlock RPCs for summary, progress, and social surfaces.'
    )
    on conflict (change_key) do nothing;
  end if;
end;
$$;

commit;
