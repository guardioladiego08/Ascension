begin;

create or replace function badges.is_within_target_range(
  p_total numeric,
  p_target numeric,
  p_tolerance_ratio numeric default 0.10
)
returns boolean
language sql
immutable
as $$
  select case
    when coalesce(p_target, 0) <= 0 then false
    else abs(coalesce(p_total, 0) - p_target) <= (p_target * greatest(coalesce(p_tolerance_ratio, 0), 0))
  end;
$$;

create or replace function badges.nutrition_logged_days(
  p_user_id uuid
)
returns table (
  day_id uuid,
  logged_date date,
  timezone_str text,
  item_count integer,
  breakfast_count integer,
  lunch_count integer,
  dinner_count integer,
  snack_count integer,
  kcal_total numeric,
  protein_g_total numeric,
  carbs_g_total numeric,
  fat_g_total numeric,
  kcal_target numeric,
  protein_g_target numeric,
  carbs_g_target numeric,
  fat_g_target numeric,
  goal_hit boolean
)
language sql
stable
security definer
set search_path = public, badges, nutrition
as $$
  select
    d.id as day_id,
    d.date as logged_date,
    d.timezone_str,
    count(di.id)::integer as item_count,
    count(*) filter (where di.meal_slot = 'breakfast')::integer as breakfast_count,
    count(*) filter (where di.meal_slot = 'lunch')::integer as lunch_count,
    count(*) filter (where di.meal_slot = 'dinner')::integer as dinner_count,
    count(*) filter (where di.meal_slot = 'snack')::integer as snack_count,
    coalesce(d.kcal_total, 0)::numeric as kcal_total,
    coalesce(d.protein_g_total, 0)::numeric as protein_g_total,
    coalesce(d.carbs_g_total, 0)::numeric as carbs_g_total,
    coalesce(d.fat_g_total, 0)::numeric as fat_g_total,
    d.kcal_target::numeric as kcal_target,
    d.protein_g_target::numeric as protein_g_target,
    d.carbs_g_target::numeric as carbs_g_target,
    d.fat_g_target::numeric as fat_g_target,
    coalesce(d.goal_hit, false) as goal_hit
  from nutrition.diary_days d
  left join nutrition.diary_items di
    on di.diary_day_id = d.id
  where d.user_id = p_user_id
  group by
    d.id,
    d.date,
    d.timezone_str,
    d.kcal_total,
    d.protein_g_total,
    d.carbs_g_total,
    d.fat_g_total,
    d.kcal_target,
    d.protein_g_target,
    d.carbs_g_target,
    d.fat_g_target,
    d.goal_hit
  having count(di.id) > 0;
$$;

create or replace function badges.evaluate_nutrition_badges_for_user(
  p_user_id uuid,
  p_source_type text default 'nutrition_day',
  p_source_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public, badges, nutrition
as $$
declare
  v_user_id uuid := p_user_id;
  v_source_type text := nullif(trim(coalesce(p_source_type, '')), '');
  v_source_id uuid := p_source_id;
  v_current_date date := null;
  v_current_item_count integer := 0;
  v_current_protein_g numeric := 0;
  v_total_logged_days integer := 0;
  v_best_logging_streak integer := 0;
  v_current_logging_streak integer := 0;
  v_goal_hit_days integer := 0;
  v_best_goal_hit_streak integer := 0;
  v_current_goal_hit_streak integer := 0;
  v_protein_target_days integer := 0;
  v_calorie_consistency_days integer := 0;
  v_macro_consistency_days integer := 0;
  v_breakfast_days integer := 0;
  v_lunch_days integer := 0;
  v_dinner_days integer := 0;
  v_full_day_logging_days integer := 0;
  v_weekly_consistency_weeks integer := 0;
  v_best_daily_protein_g numeric := 0;
  v_best_daily_item_count integer := 0;
begin
  if v_user_id is null then
    return;
  end if;

  if v_source_type is null then
    v_source_type := 'nutrition_day';
  end if;

  if v_source_id is null then
    select d.day_id
    into v_source_id
    from badges.nutrition_logged_days(v_user_id) d
    order by d.logged_date desc, d.day_id desc
    limit 1;
  end if;

  if v_source_id is not null then
    select
      d.logged_date,
      coalesce(d.item_count, 0),
      coalesce(d.protein_g_total, 0)
    into
      v_current_date,
      v_current_item_count,
      v_current_protein_g
    from badges.nutrition_logged_days(v_user_id) d
    where d.day_id = v_source_id
    limit 1;
  end if;

  select
    coalesce(count(*), 0)::integer,
    coalesce(sum(case when d.goal_hit then 1 else 0 end), 0)::integer,
    coalesce(sum(case when d.protein_g_target is not null and d.protein_g_total >= d.protein_g_target then 1 else 0 end), 0)::integer,
    coalesce(sum(case when badges.is_within_target_range(d.kcal_total, d.kcal_target, 0.10) then 1 else 0 end), 0)::integer,
    coalesce(sum(case when
      badges.is_within_target_range(d.protein_g_total, d.protein_g_target, 0.10)
      and badges.is_within_target_range(d.carbs_g_total, d.carbs_g_target, 0.10)
      and badges.is_within_target_range(d.fat_g_total, d.fat_g_target, 0.10)
      then 1 else 0 end), 0)::integer,
    coalesce(sum(case when d.breakfast_count > 0 then 1 else 0 end), 0)::integer,
    coalesce(sum(case when d.lunch_count > 0 then 1 else 0 end), 0)::integer,
    coalesce(sum(case when d.dinner_count > 0 then 1 else 0 end), 0)::integer,
    coalesce(sum(case when d.breakfast_count > 0 and d.lunch_count > 0 and d.dinner_count > 0 then 1 else 0 end), 0)::integer,
    coalesce(max(d.protein_g_total), 0)::numeric,
    coalesce(max(d.item_count), 0)::integer
  into
    v_total_logged_days,
    v_goal_hit_days,
    v_protein_target_days,
    v_calorie_consistency_days,
    v_macro_consistency_days,
    v_breakfast_days,
    v_lunch_days,
    v_dinner_days,
    v_full_day_logging_days,
    v_best_daily_protein_g,
    v_best_daily_item_count
  from badges.nutrition_logged_days(v_user_id) d;

  with ordered_days as (
    select
      d.logged_date,
      row_number() over (order by d.logged_date) as rn
    from badges.nutrition_logged_days(v_user_id) d
  ),
  grouped_days as (
    select
      logged_date,
      logged_date - rn::integer as grp
    from ordered_days
  ),
  streaks as (
    select
      max(logged_date) as streak_end,
      count(*)::integer as streak_len
    from grouped_days
    group by grp
  )
  select
    coalesce(max(streak_len), 0),
    coalesce(max(case when streak_end = v_current_date then streak_len else 0 end), 0)
  into
    v_best_logging_streak,
    v_current_logging_streak
  from streaks;

  with goal_days as (
    select d.logged_date
    from badges.nutrition_logged_days(v_user_id) d
    where d.goal_hit
  ),
  ordered_days as (
    select
      logged_date,
      row_number() over (order by logged_date) as rn
    from goal_days
  ),
  grouped_days as (
    select
      logged_date,
      logged_date - rn::integer as grp
    from ordered_days
  ),
  streaks as (
    select
      max(logged_date) as streak_end,
      count(*)::integer as streak_len
    from grouped_days
    group by grp
  )
  select
    coalesce(max(streak_len), 0),
    coalesce(max(case when streak_end = v_current_date then streak_len else 0 end), 0)
  into
    v_best_goal_hit_streak,
    v_current_goal_hit_streak
  from streaks;

  with day_weeks as (
    select
      d.logged_date - ((extract(dow from d.logged_date)::integer + 6) % 7) as week_start,
      count(*)::integer as logged_day_count
    from badges.nutrition_logged_days(v_user_id) d
    group by 1
  )
  select
    coalesce(count(*) filter (where logged_day_count >= 5), 0)::integer
  into
    v_weekly_consistency_weeks
  from day_weeks;

  perform badges.apply_progress_snapshot(
    v_user_id,
    'nutrition',
    'first_logged_day',
    v_total_logged_days,
    v_total_logged_days,
    v_total_logged_days,
    v_source_type,
    v_source_id
  );

  perform badges.apply_progress_snapshot(
    v_user_id,
    'nutrition',
    'total_logged_days',
    v_total_logged_days,
    v_total_logged_days,
    v_total_logged_days,
    v_source_type,
    v_source_id
  );

  perform badges.apply_progress_snapshot(
    v_user_id,
    'nutrition',
    'logging_streak',
    v_current_logging_streak,
    v_best_logging_streak,
    v_best_logging_streak,
    v_source_type,
    v_source_id
  );

  perform badges.apply_progress_snapshot(
    v_user_id,
    'nutrition',
    'goal_hit_days',
    v_goal_hit_days,
    v_goal_hit_days,
    v_goal_hit_days,
    v_source_type,
    v_source_id
  );

  perform badges.apply_progress_snapshot(
    v_user_id,
    'nutrition',
    'goal_hit_streak',
    v_current_goal_hit_streak,
    v_best_goal_hit_streak,
    v_best_goal_hit_streak,
    v_source_type,
    v_source_id
  );

  perform badges.apply_progress_snapshot(
    v_user_id,
    'nutrition',
    'protein_target_days',
    v_protein_target_days,
    v_protein_target_days,
    v_protein_target_days,
    v_source_type,
    v_source_id
  );

  perform badges.apply_progress_snapshot(
    v_user_id,
    'nutrition',
    'calorie_consistency_days',
    v_calorie_consistency_days,
    v_calorie_consistency_days,
    v_calorie_consistency_days,
    v_source_type,
    v_source_id
  );

  perform badges.apply_progress_snapshot(
    v_user_id,
    'nutrition',
    'macro_consistency_days',
    v_macro_consistency_days,
    v_macro_consistency_days,
    v_macro_consistency_days,
    v_source_type,
    v_source_id
  );

  perform badges.apply_progress_snapshot(
    v_user_id,
    'nutrition',
    'breakfast_coverage',
    v_breakfast_days,
    v_breakfast_days,
    v_breakfast_days,
    v_source_type,
    v_source_id
  );

  perform badges.apply_progress_snapshot(
    v_user_id,
    'nutrition',
    'lunch_coverage',
    v_lunch_days,
    v_lunch_days,
    v_lunch_days,
    v_source_type,
    v_source_id
  );

  perform badges.apply_progress_snapshot(
    v_user_id,
    'nutrition',
    'dinner_coverage',
    v_dinner_days,
    v_dinner_days,
    v_dinner_days,
    v_source_type,
    v_source_id
  );

  perform badges.apply_progress_snapshot(
    v_user_id,
    'nutrition',
    'full_day_logging_days',
    v_full_day_logging_days,
    v_full_day_logging_days,
    v_full_day_logging_days,
    v_source_type,
    v_source_id
  );

  perform badges.apply_progress_snapshot(
    v_user_id,
    'nutrition',
    'weekly_consistency_weeks',
    v_weekly_consistency_weeks,
    v_weekly_consistency_weeks,
    v_weekly_consistency_weeks,
    v_source_type,
    v_source_id
  );

  perform badges.apply_progress_snapshot(
    v_user_id,
    'nutrition',
    'protein_day_record',
    v_current_protein_g,
    v_best_daily_protein_g,
    v_best_daily_protein_g,
    v_source_type,
    v_source_id
  );

  perform badges.apply_progress_snapshot(
    v_user_id,
    'nutrition',
    'meal_entry_record',
    v_current_item_count,
    v_best_daily_item_count,
    v_best_daily_item_count,
    v_source_type,
    v_source_id
  );
end;
$$;

create or replace function badges.apply_nutrition_day_badges()
returns trigger
language plpgsql
security definer
set search_path = public, badges, nutrition
as $$
begin
  if tg_op = 'DELETE' then
    return old;
  end if;

  if new.user_id is null or new.date is null then
    return new;
  end if;

  perform badges.evaluate_nutrition_badges_for_user(
    new.user_id,
    'nutrition_day',
    new.id
  );

  return new;
end;
$$;

drop trigger if exists trg_apply_nutrition_day_badges on nutrition.diary_days;
create trigger trg_apply_nutrition_day_badges
after insert or update of date, timezone_str, kcal_total, protein_g_total, carbs_g_total, fat_g_total, kcal_target, protein_g_target, carbs_g_target, fat_g_target, goal_hit
on nutrition.diary_days
for each row
execute function badges.apply_nutrition_day_badges();

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
    ('nutrition', 'first_logged_day', 'First Log', 'Log your first nutrition day with at least one diary item.', 'milestone', 'logged_days', 'count', 'badge-nutrition-first-log', 410, '{"unit":"days"}'::jsonb),
    ('nutrition', 'total_logged_days', 'Tracking Habit', 'Build your total logged nutrition day count.', 'milestone', 'logged_days', 'count', 'badge-nutrition-total-days', 420, '{"unit":"days"}'::jsonb),
    ('nutrition', 'logging_streak', 'Logging Streak', 'Log nutrition on consecutive days.', 'streak', 'logging_streak_days', 'streak', 'badge-nutrition-logging-streak', 430, '{"unit":"days"}'::jsonb),
    ('nutrition', 'goal_hit_days', 'Goal-Hit Days', 'Accumulate days where your nutrition goal closed.', 'consistency', 'goal_hit_days', 'count', 'badge-nutrition-goal-hit-days', 440, '{"unit":"days"}'::jsonb),
    ('nutrition', 'goal_hit_streak', 'Goal-Hit Streak', 'Stack consecutive days where your nutrition goal closed.', 'streak', 'goal_hit_streak_days', 'streak', 'badge-nutrition-goal-hit-streak', 450, '{"unit":"days"}'::jsonb),
    ('nutrition', 'protein_target_days', 'Protein Target Days', 'Accumulate logged days where protein met or beat the stored target.', 'consistency', 'protein_target_days', 'count', 'badge-nutrition-protein-target-days', 460, '{"unit":"days"}'::jsonb),
    ('nutrition', 'calorie_consistency_days', 'Calorie Consistency', 'Accumulate logged days within 10 percent of the stored calorie target.', 'consistency', 'calorie_consistency_days', 'count', 'badge-nutrition-calorie-consistency', 470, '{"unit":"days","tolerance_ratio":0.10}'::jsonb),
    ('nutrition', 'macro_consistency_days', 'Macro Consistency', 'Accumulate logged days where protein, carbs, and fat all land within 10 percent of their stored targets.', 'consistency', 'macro_consistency_days', 'count', 'badge-nutrition-macro-consistency', 480, '{"unit":"days","tolerance_ratio":0.10}'::jsonb),
    ('nutrition', 'breakfast_coverage', 'Breakfast Coverage', 'Log breakfast on more nutrition days.', 'milestone', 'breakfast_logged_days', 'count', 'badge-nutrition-breakfast-coverage', 490, '{"unit":"days"}'::jsonb),
    ('nutrition', 'lunch_coverage', 'Lunch Coverage', 'Log lunch on more nutrition days.', 'milestone', 'lunch_logged_days', 'count', 'badge-nutrition-lunch-coverage', 500, '{"unit":"days"}'::jsonb),
    ('nutrition', 'dinner_coverage', 'Dinner Coverage', 'Log dinner on more nutrition days.', 'milestone', 'dinner_logged_days', 'count', 'badge-nutrition-dinner-coverage', 510, '{"unit":"days"}'::jsonb),
    ('nutrition', 'full_day_logging_days', 'Full-Day Logging', 'Log breakfast, lunch, and dinner on the same day.', 'consistency', 'full_day_logging_days', 'count', 'badge-nutrition-full-day-logging', 520, '{"unit":"days"}'::jsonb),
    ('nutrition', 'weekly_consistency_weeks', 'Weekly Consistency', 'Accumulate weeks with at least 5 logged nutrition days.', 'consistency', 'consistent_weeks_total', 'count', 'badge-nutrition-weekly-consistency', 530, '{"unit":"weeks","qualifier":"5_logged_days_per_week"}'::jsonb),
    ('nutrition', 'protein_day_record', 'Protein Day Record', 'Raise your highest single-day protein total.', 'record', 'single_day_protein_g', 'record', 'badge-nutrition-protein-day-record', 540, '{"unit":"g"}'::jsonb),
    ('nutrition', 'meal_entry_record', 'Meal Entry Record', 'Raise your highest number of logged diary entries in a single day.', 'record', 'single_day_entry_count', 'record', 'badge-nutrition-meal-entry-record', 550, '{"unit":"entries"}'::jsonb)
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
    ('first_logged_day', 'starter', 'Starter', 1, 'Logged your first nutrition day.', 1, 'badge-nutrition-first-log-starter'),

    ('total_logged_days', 'bronze', 'Bronze', 7, 'Logged 7 nutrition days.', 1, 'badge-nutrition-total-days-bronze'),
    ('total_logged_days', 'silver', 'Silver', 30, 'Logged 30 nutrition days.', 2, 'badge-nutrition-total-days-silver'),
    ('total_logged_days', 'gold', 'Gold', 60, 'Logged 60 nutrition days.', 3, 'badge-nutrition-total-days-gold'),
    ('total_logged_days', 'elite', 'Elite', 100, 'Logged 100 nutrition days.', 4, 'badge-nutrition-total-days-elite'),
    ('total_logged_days', 'legend', 'Legend', 250, 'Logged 250 nutrition days.', 5, 'badge-nutrition-total-days-legend'),

    ('logging_streak', '3-days', '3 Days', 3, 'Logged nutrition on 3 consecutive days.', 1, 'badge-nutrition-logging-streak-3'),
    ('logging_streak', '7-days', '7 Days', 7, 'Logged nutrition on 7 consecutive days.', 2, 'badge-nutrition-logging-streak-7'),
    ('logging_streak', '14-days', '14 Days', 14, 'Logged nutrition on 14 consecutive days.', 3, 'badge-nutrition-logging-streak-14'),
    ('logging_streak', '30-days', '30 Days', 30, 'Logged nutrition on 30 consecutive days.', 4, 'badge-nutrition-logging-streak-30'),
    ('logging_streak', '60-days', '60 Days', 60, 'Logged nutrition on 60 consecutive days.', 5, 'badge-nutrition-logging-streak-60'),

    ('goal_hit_days', '3-days', '3 Days', 3, 'Closed your nutrition goal on 3 days.', 1, 'badge-nutrition-goal-hit-days-3'),
    ('goal_hit_days', '7-days', '7 Days', 7, 'Closed your nutrition goal on 7 days.', 2, 'badge-nutrition-goal-hit-days-7'),
    ('goal_hit_days', '14-days', '14 Days', 14, 'Closed your nutrition goal on 14 days.', 3, 'badge-nutrition-goal-hit-days-14'),
    ('goal_hit_days', '30-days', '30 Days', 30, 'Closed your nutrition goal on 30 days.', 4, 'badge-nutrition-goal-hit-days-30'),
    ('goal_hit_days', '60-days', '60 Days', 60, 'Closed your nutrition goal on 60 days.', 5, 'badge-nutrition-goal-hit-days-60'),

    ('goal_hit_streak', '2-days', '2 Days', 2, 'Closed your nutrition goal on 2 consecutive days.', 1, 'badge-nutrition-goal-hit-streak-2'),
    ('goal_hit_streak', '5-days', '5 Days', 5, 'Closed your nutrition goal on 5 consecutive days.', 2, 'badge-nutrition-goal-hit-streak-5'),
    ('goal_hit_streak', '7-days', '7 Days', 7, 'Closed your nutrition goal on 7 consecutive days.', 3, 'badge-nutrition-goal-hit-streak-7'),
    ('goal_hit_streak', '14-days', '14 Days', 14, 'Closed your nutrition goal on 14 consecutive days.', 4, 'badge-nutrition-goal-hit-streak-14'),
    ('goal_hit_streak', '30-days', '30 Days', 30, 'Closed your nutrition goal on 30 consecutive days.', 5, 'badge-nutrition-goal-hit-streak-30'),

    ('protein_target_days', '3-days', '3 Days', 3, 'Hit your protein target on 3 logged days.', 1, 'badge-nutrition-protein-target-days-3'),
    ('protein_target_days', '7-days', '7 Days', 7, 'Hit your protein target on 7 logged days.', 2, 'badge-nutrition-protein-target-days-7'),
    ('protein_target_days', '14-days', '14 Days', 14, 'Hit your protein target on 14 logged days.', 3, 'badge-nutrition-protein-target-days-14'),
    ('protein_target_days', '30-days', '30 Days', 30, 'Hit your protein target on 30 logged days.', 4, 'badge-nutrition-protein-target-days-30'),
    ('protein_target_days', '60-days', '60 Days', 60, 'Hit your protein target on 60 logged days.', 5, 'badge-nutrition-protein-target-days-60'),

    ('calorie_consistency_days', '3-days', '3 Days', 3, 'Stayed within 10 percent of your calorie target on 3 days.', 1, 'badge-nutrition-calorie-consistency-3'),
    ('calorie_consistency_days', '7-days', '7 Days', 7, 'Stayed within 10 percent of your calorie target on 7 days.', 2, 'badge-nutrition-calorie-consistency-7'),
    ('calorie_consistency_days', '14-days', '14 Days', 14, 'Stayed within 10 percent of your calorie target on 14 days.', 3, 'badge-nutrition-calorie-consistency-14'),
    ('calorie_consistency_days', '30-days', '30 Days', 30, 'Stayed within 10 percent of your calorie target on 30 days.', 4, 'badge-nutrition-calorie-consistency-30'),
    ('calorie_consistency_days', '60-days', '60 Days', 60, 'Stayed within 10 percent of your calorie target on 60 days.', 5, 'badge-nutrition-calorie-consistency-60'),

    ('macro_consistency_days', '3-days', '3 Days', 3, 'Landed within 10 percent of all stored macro targets on 3 days.', 1, 'badge-nutrition-macro-consistency-3'),
    ('macro_consistency_days', '7-days', '7 Days', 7, 'Landed within 10 percent of all stored macro targets on 7 days.', 2, 'badge-nutrition-macro-consistency-7'),
    ('macro_consistency_days', '14-days', '14 Days', 14, 'Landed within 10 percent of all stored macro targets on 14 days.', 3, 'badge-nutrition-macro-consistency-14'),
    ('macro_consistency_days', '30-days', '30 Days', 30, 'Landed within 10 percent of all stored macro targets on 30 days.', 4, 'badge-nutrition-macro-consistency-30'),
    ('macro_consistency_days', '60-days', '60 Days', 60, 'Landed within 10 percent of all stored macro targets on 60 days.', 5, 'badge-nutrition-macro-consistency-60'),

    ('breakfast_coverage', '3-days', '3 Days', 3, 'Logged breakfast on 3 days.', 1, 'badge-nutrition-breakfast-3'),
    ('breakfast_coverage', '7-days', '7 Days', 7, 'Logged breakfast on 7 days.', 2, 'badge-nutrition-breakfast-7'),
    ('breakfast_coverage', '14-days', '14 Days', 14, 'Logged breakfast on 14 days.', 3, 'badge-nutrition-breakfast-14'),
    ('breakfast_coverage', '30-days', '30 Days', 30, 'Logged breakfast on 30 days.', 4, 'badge-nutrition-breakfast-30'),
    ('breakfast_coverage', '60-days', '60 Days', 60, 'Logged breakfast on 60 days.', 5, 'badge-nutrition-breakfast-60'),

    ('lunch_coverage', '3-days', '3 Days', 3, 'Logged lunch on 3 days.', 1, 'badge-nutrition-lunch-3'),
    ('lunch_coverage', '7-days', '7 Days', 7, 'Logged lunch on 7 days.', 2, 'badge-nutrition-lunch-7'),
    ('lunch_coverage', '14-days', '14 Days', 14, 'Logged lunch on 14 days.', 3, 'badge-nutrition-lunch-14'),
    ('lunch_coverage', '30-days', '30 Days', 30, 'Logged lunch on 30 days.', 4, 'badge-nutrition-lunch-30'),
    ('lunch_coverage', '60-days', '60 Days', 60, 'Logged lunch on 60 days.', 5, 'badge-nutrition-lunch-60'),

    ('dinner_coverage', '3-days', '3 Days', 3, 'Logged dinner on 3 days.', 1, 'badge-nutrition-dinner-3'),
    ('dinner_coverage', '7-days', '7 Days', 7, 'Logged dinner on 7 days.', 2, 'badge-nutrition-dinner-7'),
    ('dinner_coverage', '14-days', '14 Days', 14, 'Logged dinner on 14 days.', 3, 'badge-nutrition-dinner-14'),
    ('dinner_coverage', '30-days', '30 Days', 30, 'Logged dinner on 30 days.', 4, 'badge-nutrition-dinner-30'),
    ('dinner_coverage', '60-days', '60 Days', 60, 'Logged dinner on 60 days.', 5, 'badge-nutrition-dinner-60'),

    ('full_day_logging_days', '1-day', '1 Day', 1, 'Logged breakfast, lunch, and dinner on the same day.', 1, 'badge-nutrition-full-day-1'),
    ('full_day_logging_days', '3-days', '3 Days', 3, 'Logged full-day coverage on 3 days.', 2, 'badge-nutrition-full-day-3'),
    ('full_day_logging_days', '7-days', '7 Days', 7, 'Logged full-day coverage on 7 days.', 3, 'badge-nutrition-full-day-7'),
    ('full_day_logging_days', '14-days', '14 Days', 14, 'Logged full-day coverage on 14 days.', 4, 'badge-nutrition-full-day-14'),
    ('full_day_logging_days', '30-days', '30 Days', 30, 'Logged full-day coverage on 30 days.', 5, 'badge-nutrition-full-day-30'),

    ('weekly_consistency_weeks', '1-week', '1 Week', 1, 'Completed your first week with 5 logged nutrition days.', 1, 'badge-nutrition-weekly-consistency-1'),
    ('weekly_consistency_weeks', '2-weeks', '2 Weeks', 2, 'Completed 2 weeks with 5 logged nutrition days.', 2, 'badge-nutrition-weekly-consistency-2'),
    ('weekly_consistency_weeks', '4-weeks', '4 Weeks', 4, 'Completed 4 weeks with 5 logged nutrition days.', 3, 'badge-nutrition-weekly-consistency-4'),
    ('weekly_consistency_weeks', '8-weeks', '8 Weeks', 8, 'Completed 8 weeks with 5 logged nutrition days.', 4, 'badge-nutrition-weekly-consistency-8'),
    ('weekly_consistency_weeks', '12-weeks', '12 Weeks', 12, 'Completed 12 weeks with 5 logged nutrition days.', 5, 'badge-nutrition-weekly-consistency-12'),

    ('protein_day_record', '75g', '75 g', 75, 'Logged a 75 g protein day.', 1, 'badge-nutrition-protein-record-75'),
    ('protein_day_record', '100g', '100 g', 100, 'Logged a 100 g protein day.', 2, 'badge-nutrition-protein-record-100'),
    ('protein_day_record', '130g', '130 g', 130, 'Logged a 130 g protein day.', 3, 'badge-nutrition-protein-record-130'),
    ('protein_day_record', '160g', '160 g', 160, 'Logged a 160 g protein day.', 4, 'badge-nutrition-protein-record-160'),
    ('protein_day_record', '200g', '200 g', 200, 'Logged a 200 g protein day.', 5, 'badge-nutrition-protein-record-200'),

    ('meal_entry_record', '3-items', '3 Items', 3, 'Logged 3 diary entries in a day.', 1, 'badge-nutrition-meal-record-3'),
    ('meal_entry_record', '5-items', '5 Items', 5, 'Logged 5 diary entries in a day.', 2, 'badge-nutrition-meal-record-5'),
    ('meal_entry_record', '7-items', '7 Items', 7, 'Logged 7 diary entries in a day.', 3, 'badge-nutrition-meal-record-7'),
    ('meal_entry_record', '10-items', '10 Items', 10, 'Logged 10 diary entries in a day.', 4, 'badge-nutrition-meal-record-10'),
    ('meal_entry_record', '12-items', '12 Items', 12, 'Logged 12 diary entries in a day.', 5, 'badge-nutrition-meal-record-12')
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
  on s.domain = 'nutrition'
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
set search_path = public, badges, social, strength, run_walk, nutrition
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
  elsif v_source_type = 'nutrition_day' then
    select exists (
      select 1
      from nutrition.diary_days d
      where d.id = p_source_id
        and d.user_id = p_owner_id
        and exists (
          select 1
          from nutrition.diary_items di
          where di.diary_day_id = d.id
        )
        and exists (
          select 1
          from social.posts p
          where p.user_id = p_owner_id
            and p.source_id = p_source_id
            and (p.source_type = v_source_type or p.activity_type = 'nutrition')
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
    select distinct d.user_id
    from nutrition.diary_days d
    where d.user_id is not null
      and exists (
        select 1
        from nutrition.diary_items di
        where di.diary_day_id = d.id
      )
  loop
    perform badges.evaluate_nutrition_badges_for_user(v_owner_id, 'nutrition_day', null);
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
      '20260402_badges_nutrition_rollout',
      'Extended the shared badges schema with nutrition badge series and tiers, added diary-day nutrition badge evaluation triggers, and enabled nutrition-day source lookups for summary and social badge surfaces.'
    )
    on conflict (change_key) do nothing;
  end if;
end;
$$;

commit;
