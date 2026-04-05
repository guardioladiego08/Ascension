-- Nutrition progress dashboard UI smoke seed
-- Generates a lightweight 14-day nutrition history using recipe-based diary items only.
-- This is the fastest hosted-editor option when compatibility-heavy food seeding times out.
--
-- Notes:
-- - This seed is intended to validate the nutrition progress UI quickly.
-- - Source breakdown will skew heavily toward recipes because diary food_id is left null on purpose.
-- - Repeat behavior for meals will populate; repeat-food insights will be sparse by design.
--
-- How to use:
-- 1) Set `v_user_id` to your test account.
-- 2) Run this file in the Supabase SQL Editor.
-- 3) Open Progress -> Nutrition.

begin;

do $$
declare
  v_user_id uuid := '8e97a18c-d549-424c-8aa2-aed32961de70';
  v_timezone text := 'America/Los_Angeles';
  v_day_count integer := 14;
  v_replace_existing_days boolean := true;
  v_now_local date := timezone(v_timezone, now())::date;
  v_start_date date := (timezone(v_timezone, now())::date - 14);
  v_end_date date := (timezone(v_timezone, now())::date - 1);

  v_recipe_oats uuid := '33333333-3333-4333-8333-333333333301';
  v_recipe_yogurt uuid := '33333333-3333-4333-8333-333333333302';
  v_recipe_chicken_bowl uuid := '33333333-3333-4333-8333-333333333303';
  v_recipe_smoothie uuid := '33333333-3333-4333-8333-333333333304';
  v_recipe_salmon_plate uuid := '33333333-3333-4333-8333-333333333305';

  v_has_favorite_meals boolean := false;
  v_meal_type_type text := 'text';
  v_meal_slot_type text := 'text';
  v_meal_type_expr text := 'e.meal_type';
  v_meal_slot_expr text := 'e.meal_slot';

  v_seeded_days integer := 0;
  v_existing_days integer := 0;
  v_replaced_days integer := 0;
  v_upserted_days integer := 0;
  v_inserted_items integer := 0;
begin
  if not exists (
    select 1
    from auth.users
    where id = v_user_id
  ) then
    raise exception 'User % not found in auth.users', v_user_id;
  end if;

  if to_regclass('nutrition.recipes') is null
    or to_regclass('nutrition.diary_days') is null
    or to_regclass('nutrition.diary_items') is null then
    raise exception 'Run the nutrition schema migrations before seeding nutrition progress demo data.';
  end if;

  select to_regclass('nutrition.user_favorite_meals') is not null
  into v_has_favorite_meals;

  select format_type(a.atttypid, a.atttypmod)
  into v_meal_type_type
  from pg_attribute a
  where a.attrelid = 'nutrition.diary_items'::regclass
    and a.attname = 'meal_type'
    and a.attnum > 0
    and not a.attisdropped;

  select format_type(a.atttypid, a.atttypmod)
  into v_meal_slot_type
  from pg_attribute a
  where a.attrelid = 'nutrition.diary_items'::regclass
    and a.attname = 'meal_slot'
    and a.attnum > 0
    and not a.attisdropped;

  if coalesce(v_meal_type_type, 'text') <> 'text' then
    v_meal_type_expr := format('e.meal_type::%s', v_meal_type_type);
  end if;

  if coalesce(v_meal_slot_type, 'text') <> 'text' then
    v_meal_slot_expr := format('e.meal_slot::%s', v_meal_slot_type);
  end if;

  create temporary table tmp_nutrition_seed_days (
    diary_date date primary key,
    timezone_str text not null,
    kcal_target numeric(10, 2) not null,
    protein_target numeric(10, 2) not null,
    carbs_target numeric(10, 2) not null,
    fat_target numeric(10, 2) not null
  ) on commit drop;

  create temporary table tmp_nutrition_seed_entries (
    diary_date date not null,
    consumed_at timestamptz not null,
    meal_type text not null,
    meal_slot text not null,
    recipe_id uuid null,
    quantity numeric(10, 3) not null,
    unit_label text not null,
    grams numeric(10, 2) null,
    kcal numeric(10, 2) not null,
    protein numeric(10, 2) not null,
    carbs numeric(10, 2) not null,
    fat numeric(10, 2) not null,
    fiber numeric(10, 2) null,
    sugar numeric(10, 2) null,
    sodium numeric(10, 2) null,
    note text null
  ) on commit drop;

  insert into nutrition.recipes (
    id,
    user_id,
    name,
    description,
    notes,
    kcal,
    protein,
    carbs,
    fat,
    fiber,
    sugar,
    sodium,
    default_portion_grams,
    is_private
  )
  values
    (v_recipe_oats, v_user_id, 'Power Oats Bowl', 'High-carb breakfast bowl for training mornings.', 'demo_seed:nutrition_progress_ui_smoke:v1', 515, 35.3, 70.5, 13.6, 11.1, 23, 151, 274, true),
    (v_recipe_yogurt, v_user_id, 'Greek Yogurt Crunch', 'Balanced yogurt bowl with berries and crunch.', 'demo_seed:nutrition_progress_ui_smoke:v1', 363, 24.8, 40.3, 10.0, 5.5, 18, 121, 281, true),
    (v_recipe_chicken_bowl, v_user_id, 'Chicken Rice Bowl', 'Reliable lunch and dinner prep bowl.', 'demo_seed:nutrition_progress_ui_smoke:v1', 516, 41.0, 60.3, 11.5, 4.3, 3, 104, 377, true),
    (v_recipe_smoothie, v_user_id, 'Recovery Smoothie', 'Quick post-workout protein and carb refill.', 'demo_seed:nutrition_progress_ui_smoke:v1', 337, 26.8, 57.6, 1.6, 5.1, 34, 216, 274, true),
    (v_recipe_salmon_plate, v_user_id, 'Salmon Sweet Potato Plate', 'Higher-fat dinner with steady carbs.', 'demo_seed:nutrition_progress_ui_smoke:v1', 480, 35.5, 39.0, 20.7, 6.5, 6, 167, 355, true)
  on conflict (id) do update
  set
    user_id = excluded.user_id,
    name = excluded.name,
    description = excluded.description,
    notes = excluded.notes,
    kcal = excluded.kcal,
    protein = excluded.protein,
    carbs = excluded.carbs,
    fat = excluded.fat,
    fiber = excluded.fiber,
    sugar = excluded.sugar,
    sodium = excluded.sodium,
    default_portion_grams = excluded.default_portion_grams,
    is_private = excluded.is_private;

  if v_has_favorite_meals then
    insert into nutrition.user_favorite_meals (user_id, meal_id)
    values
      (v_user_id, v_recipe_oats),
      (v_user_id, v_recipe_chicken_bowl),
      (v_user_id, v_recipe_smoothie)
    on conflict (user_id, meal_id) do nothing;
  end if;

  insert into tmp_nutrition_seed_days (
    diary_date,
    timezone_str,
    kcal_target,
    protein_target,
    carbs_target,
    fat_target
  )
  select
    d::date,
    v_timezone,
    case
      when extract(isodow from d)::integer in (2, 4, 6) then 2450
      when extract(isodow from d)::integer in (6, 7) then 2300
      else 2200
    end,
    case
      when extract(isodow from d)::integer in (2, 4, 6) then 180
      else 170
    end,
    case
      when extract(isodow from d)::integer in (2, 4, 6) then 285
      else 220
    end,
    case
      when extract(isodow from d)::integer in (2, 4, 6) then 70
      else 72
    end
  from generate_series(v_start_date, v_end_date, interval '1 day') as d;

  insert into tmp_nutrition_seed_entries
  select
    d.diary_date,
    (d.diary_date::timestamp + time '07:15') at time zone v_timezone,
    'breakfast',
    'breakfast',
    case when mod(extract(day from d.diary_date)::integer, 2) = 0 then v_recipe_oats else v_recipe_yogurt end,
    case when mod(extract(day from d.diary_date)::integer, 2) = 0 then 0.96 else 1.00 end,
    'portion',
    case when mod(extract(day from d.diary_date)::integer, 2) = 0 then 263.04 else 281.00 end,
    case when mod(extract(day from d.diary_date)::integer, 2) = 0 then 494.40 else 363.00 end,
    case when mod(extract(day from d.diary_date)::integer, 2) = 0 then 33.89 else 24.80 end,
    case when mod(extract(day from d.diary_date)::integer, 2) = 0 then 67.68 else 40.30 end,
    case when mod(extract(day from d.diary_date)::integer, 2) = 0 then 13.06 else 10.00 end,
    case when mod(extract(day from d.diary_date)::integer, 2) = 0 then 10.66 else 5.50 end,
    case when mod(extract(day from d.diary_date)::integer, 2) = 0 then 22.08 else 18.00 end,
    case when mod(extract(day from d.diary_date)::integer, 2) = 0 then 144.96 else 121.00 end,
    'demo breakfast'
  from tmp_nutrition_seed_days d;

  insert into tmp_nutrition_seed_entries
  select
    d.diary_date,
    (d.diary_date::timestamp + time '12:30') at time zone v_timezone,
    'lunch',
    'lunch',
    v_recipe_chicken_bowl,
    case when extract(isodow from d.diary_date)::integer in (6, 7) then 0.90 else 0.98 end,
    'portion',
    case when extract(isodow from d.diary_date)::integer in (6, 7) then 339.30 else 369.46 end,
    case when extract(isodow from d.diary_date)::integer in (6, 7) then 464.40 else 505.68 end,
    case when extract(isodow from d.diary_date)::integer in (6, 7) then 36.90 else 40.18 end,
    case when extract(isodow from d.diary_date)::integer in (6, 7) then 54.27 else 59.09 end,
    case when extract(isodow from d.diary_date)::integer in (6, 7) then 10.35 else 11.27 end,
    case when extract(isodow from d.diary_date)::integer in (6, 7) then 3.87 else 4.21 end,
    case when extract(isodow from d.diary_date)::integer in (6, 7) then 2.70 else 2.94 end,
    case when extract(isodow from d.diary_date)::integer in (6, 7) then 93.60 else 101.92 end,
    'demo lunch'
  from tmp_nutrition_seed_days d;

  insert into tmp_nutrition_seed_entries
  select
    d.diary_date,
    (d.diary_date::timestamp + time '18:55') at time zone v_timezone,
    case when extract(isodow from d.diary_date)::integer in (2, 4, 6) then 'snack' else 'dinner' end,
    case when extract(isodow from d.diary_date)::integer in (2, 4, 6) then 'post-workout' else 'dinner' end,
    case when extract(isodow from d.diary_date)::integer in (2, 4, 6) then v_recipe_smoothie else v_recipe_salmon_plate end,
    case when extract(isodow from d.diary_date)::integer in (2, 4, 6) then 1.0 else 0.96 end,
    'portion',
    case when extract(isodow from d.diary_date)::integer in (2, 4, 6) then 274.00 else 340.80 end,
    case when extract(isodow from d.diary_date)::integer in (2, 4, 6) then 337.00 else 460.80 end,
    case when extract(isodow from d.diary_date)::integer in (2, 4, 6) then 26.80 else 34.08 end,
    case when extract(isodow from d.diary_date)::integer in (2, 4, 6) then 57.60 else 37.44 end,
    case when extract(isodow from d.diary_date)::integer in (2, 4, 6) then 1.60 else 19.87 end,
    case when extract(isodow from d.diary_date)::integer in (2, 4, 6) then 5.10 else 6.24 end,
    case when extract(isodow from d.diary_date)::integer in (2, 4, 6) then 34.00 else 5.76 end,
    case when extract(isodow from d.diary_date)::integer in (2, 4, 6) then 216.00 else 160.32 end,
    case when extract(isodow from d.diary_date)::integer in (2, 4, 6) then 'demo recovery meal' else 'demo dinner' end
  from tmp_nutrition_seed_days d;

  insert into tmp_nutrition_seed_entries
  select
    d.diary_date,
    (d.diary_date::timestamp + time '20:10') at time zone v_timezone,
    'dinner',
    'dinner',
    v_recipe_chicken_bowl,
    0.82,
    'portion',
    309.14,
    423.12,
    33.62,
    49.45,
    9.43,
    3.53,
    2.46,
    85.28,
    'demo training dinner'
  from tmp_nutrition_seed_days d
  where extract(isodow from d.diary_date)::integer in (2, 4, 6);

  insert into tmp_nutrition_seed_entries
  select
    d.diary_date,
    (d.diary_date::timestamp + time '15:10') at time zone v_timezone,
    'snack',
    'snack',
    case when mod(extract(day from d.diary_date)::integer, 3) = 0 then v_recipe_yogurt else v_recipe_smoothie end,
    case when mod(extract(day from d.diary_date)::integer, 3) = 0 then 0.55 else 0.50 end,
    'portion',
    case when mod(extract(day from d.diary_date)::integer, 3) = 0 then 154.55 else 137.00 end,
    case when mod(extract(day from d.diary_date)::integer, 3) = 0 then 199.65 else 168.50 end,
    case when mod(extract(day from d.diary_date)::integer, 3) = 0 then 13.64 else 13.40 end,
    case when mod(extract(day from d.diary_date)::integer, 3) = 0 then 22.17 else 28.80 end,
    case when mod(extract(day from d.diary_date)::integer, 3) = 0 then 5.50 else 0.80 end,
    case when mod(extract(day from d.diary_date)::integer, 3) = 0 then 3.03 else 2.55 end,
    case when mod(extract(day from d.diary_date)::integer, 3) = 0 then 9.90 else 17.00 end,
    case when mod(extract(day from d.diary_date)::integer, 3) = 0 then 66.55 else 108.00 end,
    'demo snack'
  from tmp_nutrition_seed_days d
  where extract(isodow from d.diary_date)::integer in (3, 5, 7);

  select count(*)
  into v_seeded_days
  from tmp_nutrition_seed_days;

  select count(*)
  into v_existing_days
  from nutrition.diary_days d
  join tmp_nutrition_seed_days s
    on s.diary_date = d.date
  where d.user_id = v_user_id;

  if not v_replace_existing_days then
    delete from tmp_nutrition_seed_entries e
    using nutrition.diary_days d
    where d.user_id = v_user_id
      and d.date = e.diary_date;

    delete from tmp_nutrition_seed_days s
    using nutrition.diary_days d
    where d.user_id = v_user_id
      and d.date = s.diary_date;
  else
    delete from nutrition.diary_items i
    using nutrition.diary_days d, tmp_nutrition_seed_days s
    where i.diary_day_id = d.id
      and d.user_id = v_user_id
      and d.date = s.diary_date;

    v_replaced_days := v_existing_days;
  end if;

  insert into nutrition.diary_days (
    user_id,
    date,
    timezone_str,
    kcal_total,
    protein_g_total,
    carbs_g_total,
    fat_g_total,
    fiber_g_total,
    sodium_mg_total,
    kcal_target,
    protein_g_target,
    carbs_g_target,
    fat_g_target,
    goal_hit
  )
  select
    v_user_id,
    rollup.diary_date,
    rollup.timezone_str,
    rollup.kcal_total,
    rollup.protein_total,
    rollup.carbs_total,
    rollup.fat_total,
    rollup.fiber_total,
    rollup.sodium_total,
    rollup.kcal_target,
    rollup.protein_target,
    rollup.carbs_target,
    rollup.fat_target,
    (
      abs(rollup.kcal_total - rollup.kcal_target) <= (rollup.kcal_target * 0.12)
      and abs(rollup.protein_total - rollup.protein_target) <= (rollup.protein_target * 0.15)
      and abs(rollup.carbs_total - rollup.carbs_target) <= (rollup.carbs_target * 0.15)
      and abs(rollup.fat_total - rollup.fat_target) <= (rollup.fat_target * 0.15)
    )
  from (
    select
      d.diary_date,
      d.timezone_str,
      d.kcal_target,
      d.protein_target,
      d.carbs_target,
      d.fat_target,
      round(coalesce(sum(e.kcal), 0), 2) as kcal_total,
      round(coalesce(sum(e.protein), 0), 2) as protein_total,
      round(coalesce(sum(e.carbs), 0), 2) as carbs_total,
      round(coalesce(sum(e.fat), 0), 2) as fat_total,
      round(coalesce(sum(coalesce(e.fiber, 0)), 0), 2) as fiber_total,
      round(coalesce(sum(coalesce(e.sodium, 0)), 0), 2) as sodium_total
    from tmp_nutrition_seed_days d
    left join tmp_nutrition_seed_entries e
      on e.diary_date = d.diary_date
    group by
      d.diary_date,
      d.timezone_str,
      d.kcal_target,
      d.protein_target,
      d.carbs_target,
      d.fat_target
  ) as rollup
  order by rollup.diary_date
  on conflict (user_id, date) do update
  set
    timezone_str = excluded.timezone_str,
    kcal_total = excluded.kcal_total,
    protein_g_total = excluded.protein_g_total,
    carbs_g_total = excluded.carbs_g_total,
    fat_g_total = excluded.fat_g_total,
    fiber_g_total = excluded.fiber_g_total,
    sodium_mg_total = excluded.sodium_mg_total,
    kcal_target = excluded.kcal_target,
    protein_g_target = excluded.protein_g_target,
    carbs_g_target = excluded.carbs_g_target,
    fat_g_target = excluded.fat_g_target,
    goal_hit = excluded.goal_hit;

  get diagnostics v_upserted_days = row_count;

  execute format(
    $fmt$
    insert into nutrition.diary_items (
      user_id,
      diary_day_id,
      meal_type,
      meal_slot,
      food_id,
      recipe_id,
      quantity,
      unit_label,
      consumed_at,
      grams,
      kcal,
      protein,
      carbs,
      fat,
      fiber,
      sugar,
      sodium,
      note,
      created_at,
      updated_at
    )
    select
      $1,
      d.id,
      %s,
      %s,
      null,
      e.recipe_id,
      e.quantity,
      e.unit_label,
      e.consumed_at,
      e.grams,
      e.kcal,
      e.protein,
      e.carbs,
      e.fat,
      e.fiber,
      e.sugar,
      e.sodium,
      e.note,
      e.consumed_at,
      e.consumed_at
    from tmp_nutrition_seed_entries e
    join nutrition.diary_days d
      on d.user_id = $1
     and d.date = e.diary_date
    order by e.consumed_at
    $fmt$,
    v_meal_type_expr,
    v_meal_slot_expr
  )
  using v_user_id;

  get diagnostics v_inserted_items = row_count;

  raise notice
    'Nutrition UI smoke demo ready for user %: % days generated, % existing days matched, % days replaced, % days upserted, % diary items inserted, range % -> %.',
    v_user_id,
    v_seeded_days,
    v_existing_days,
    v_replaced_days,
    v_upserted_days,
    v_inserted_items,
    v_start_date,
    v_end_date;
end;
$$;

commit;
