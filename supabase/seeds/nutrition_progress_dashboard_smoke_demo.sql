-- Nutrition progress dashboard smoke seed
-- Generates a lightweight 14-day nutrition history intended for hosted SQL editors.
-- This is the fast-path alternative when the larger nutrition progress demo times out.
--
-- How to use:
-- 1) Set `v_user_id` to your test account.
-- 2) Leave `v_replace_existing_days = true` only for a dedicated demo user.
-- 3) Run this file in the Supabase SQL Editor.
-- 4) Open Progress -> Nutrition to validate trends, adherence, timing, repeat behavior,
--    source mix, and recent consistency cards.

begin;

do $$
declare
  v_user_id uuid := '8e97a18c-d549-424c-8aa2-aed32961de70';
  v_timezone text := 'America/Los_Angeles';
  v_day_count integer := 14;
  v_replace_existing_days boolean := true;
  v_food_seeded_at timestamptz := timezone('utc', now());
  v_today_local date := timezone(v_timezone, now())::date;
  v_start_date date := (timezone(v_timezone, now())::date - 14);
  v_end_date date := (timezone(v_timezone, now())::date - 1);

  v_food_oats uuid := '11111111-1111-4111-8111-111111111101';
  v_food_greek_yogurt uuid := '11111111-1111-4111-8111-111111111102';
  v_food_banana uuid := '11111111-1111-4111-8111-111111111103';
  v_food_blueberries uuid := '11111111-1111-4111-8111-111111111104';
  v_food_whey uuid := '11111111-1111-4111-8111-111111111105';
  v_food_sports_drink uuid := '11111111-1111-4111-8111-111111111106';
  v_food_chicken uuid := '11111111-1111-4111-8111-111111111107';
  v_food_rice uuid := '11111111-1111-4111-8111-111111111108';
  v_food_avocado uuid := '11111111-1111-4111-8111-111111111109';
  v_food_protein_bar uuid := '11111111-1111-4111-8111-111111111110';
  v_food_trail_mix uuid := '11111111-1111-4111-8111-111111111111';
  v_food_sourdough uuid := '11111111-1111-4111-8111-111111111112';
  v_food_almond_butter uuid := '11111111-1111-4111-8111-111111111113';
  v_food_salmon uuid := '11111111-1111-4111-8111-111111111114';
  v_food_sweet_potato uuid := '11111111-1111-4111-8111-111111111115';

  v_recipe_oats uuid := '22222222-2222-4222-8222-222222222201';
  v_recipe_yogurt uuid := '22222222-2222-4222-8222-222222222202';
  v_recipe_chicken_bowl uuid := '22222222-2222-4222-8222-222222222203';
  v_recipe_smoothie uuid := '22222222-2222-4222-8222-222222222204';
  v_recipe_salmon_plate uuid := '22222222-2222-4222-8222-222222222205';

  v_has_favorite_foods boolean := false;
  v_has_favorite_meals boolean := false;

  v_seeded_days integer := 0;
  v_existing_days integer := 0;
  v_replaced_days integer := 0;
  v_upserted_days integer := 0;
  v_inserted_items integer := 0;
  v_food_target record;
  v_food_row record;
  v_food_target_column_list text;
  v_food_target_select_list text;
  v_food_target_select_with_aliases text;
  v_food_target_update_list text;
  v_food_target_update_list_from_row text;
  v_food_target_column_list_without_id text;
  v_food_target_select_list_without_id text;
  v_food_target_missing_required text;
  v_food_target_id_type text;
  v_food_target_name_column text;
  v_food_target_brand_column text;
  v_food_target_barcode_column text;
  v_live_food_id_text text;
  v_diary_item_meal_type_type text := 'text';
  v_diary_item_meal_slot_type text := 'text';
  v_diary_item_food_id_type text := 'uuid';
  v_diary_food_target_schema text := 'nutrition';
  v_diary_food_target_table text := 'food_items';
  v_diary_item_meal_type_expr text := 'e.meal_type';
  v_diary_item_meal_slot_expr text := 'e.meal_slot';
  v_diary_item_food_id_expr text := 'e.food_id';
  v_recipe_ingredient_food_id_type text := 'uuid';
  v_recipe_food_target_schema text := 'nutrition';
  v_recipe_food_target_table text := 'food_items';
  v_recipe_ingredient_food_id_expr text := 's.logical_food_id';
  v_favorite_food_id_type text := 'uuid';
  v_favorite_food_target_schema text := 'nutrition';
  v_favorite_food_target_table text := 'food_items';
  v_favorite_food_id_expr text := 'f.logical_food_id';
begin
  if not exists (
    select 1
    from auth.users
    where id = v_user_id
  ) then
    raise exception 'User % not found in auth.users', v_user_id;
  end if;

  if to_regclass('nutrition.food_items') is null
    or to_regclass('nutrition.recipes') is null
    or to_regclass('nutrition.recipe_ingredients') is null
    or to_regclass('nutrition.diary_days') is null
    or to_regclass('nutrition.diary_items') is null then
    raise exception 'Run the nutrition schema migrations before seeding nutrition progress demo data.';
  end if;

  select to_regclass('nutrition.user_favorite_foods') is not null
  into v_has_favorite_foods;

  select to_regclass('nutrition.user_favorite_meals') is not null
  into v_has_favorite_meals;

  create temporary table tmp_nutrition_seed_entries (
    diary_date date not null,
    consumed_at timestamptz not null,
    meal_type text not null,
    meal_slot text not null,
    food_id uuid null,
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

  create temporary table tmp_nutrition_seed_days (
    diary_date date primary key,
    timezone_str text not null,
    kcal_target numeric(10, 2) not null,
    protein_target numeric(10, 2) not null,
    carbs_target numeric(10, 2) not null,
    fat_target numeric(10, 2) not null
  ) on commit drop;

  create temporary table tmp_nutrition_seed_pattern (
    diary_date date primary key,
    day_index integer not null,
    iso_dow integer not null,
    is_training_day boolean not null,
    is_underfueled boolean not null
  ) on commit drop;

  create temporary table tmp_seed_food_catalog (
    id uuid primary key,
    food_kind text not null,
    name text not null,
    brand text null,
    barcode text null,
    ean_13 text null,
    serving_reference jsonb null,
    serving_size text null,
    serving_qty numeric(10, 3) null,
    serving_unit text null,
    serving_grams numeric(10, 2) null,
    calories numeric(10, 2) null,
    protein numeric(10, 2) null,
    carbs numeric(10, 2) null,
    fat numeric(10, 2) null,
    fiber numeric(10, 2) null,
    sodium_mg numeric(10, 2) null,
    ingredients_text text null,
    source text not null,
    image_urls text[] not null default '{}',
    created_by uuid null,
    is_verified boolean not null,
    verification_status text null,
    created_at timestamptz not null,
    updated_at timestamptz not null
  ) on commit drop;

  create temporary table tmp_seed_food_targets (
    target_schema text not null,
    target_table text not null,
    primary key (target_schema, target_table)
  ) on commit drop;

  create temporary table tmp_seed_food_fk_targets (
    source_table text primary key,
    target_schema text not null,
    target_table text not null
  ) on commit drop;

  create temporary table tmp_seed_food_id_map (
    logical_food_id uuid not null,
    target_schema text not null,
    target_table text not null,
    live_food_id_text text not null,
    primary key (logical_food_id, target_schema, target_table)
  ) on commit drop;

  create temporary table tmp_seed_recipe_ingredients (
    recipe_id uuid not null,
    logical_food_id uuid not null,
    quantity numeric(10, 3) not null,
    unit text not null,
    grams numeric(10, 2) null,
    kcal numeric(10, 2) not null,
    protein numeric(10, 2) not null,
    carbs numeric(10, 2) not null,
    fat numeric(10, 2) not null,
    fiber numeric(10, 2) null,
    sodium numeric(10, 2) null,
    position integer not null,
    note text null,
    created_by uuid not null
  ) on commit drop;

  create temporary table tmp_seed_favorite_foods (
    logical_food_id uuid primary key
  ) on commit drop;

  insert into tmp_seed_food_catalog (
    id,
    food_kind,
    name,
    brand,
    barcode,
    ean_13,
    serving_reference,
    serving_size,
    serving_qty,
    serving_unit,
    serving_grams,
    calories,
    protein,
    carbs,
    fat,
    fiber,
    sodium_mg,
    ingredients_text,
    source,
    created_by,
    is_verified,
    verification_status,
    created_at,
    updated_at
  )
  values
    (v_food_oats, 'ingredient', 'Rolled Oats', 'Ascension Demo Pantry', '9902600000101', '9902600000101', '{"common":{"label":"serving","quantity":1},"metric":{"label":"g","quantity":40}}'::jsonb, '1 serving', 1, 'serving', 40, 150, 5, 27, 3, 4, 0, 'whole grain rolled oats', 'manual', v_user_id, true, 'verified', v_food_seeded_at, v_food_seeded_at),
    (v_food_greek_yogurt, 'ingredient', 'Greek Yogurt', 'Ascension Demo Pantry', '9902600000102', '9902600000102', '{"common":{"label":"cup","quantity":1},"metric":{"label":"g","quantity":170}}'::jsonb, '1 cup', 1, 'cup', 170, 120, 18, 6, 0, 0, 65, 'cultured nonfat milk', 'barcode', v_user_id, true, 'verified', v_food_seeded_at, v_food_seeded_at),
    (v_food_banana, 'ingredient', 'Banana', null, null, null, '{"common":{"label":"medium","quantity":1},"metric":{"label":"g","quantity":118}}'::jsonb, '1 medium', 1, 'medium', 118, 105, 1.3, 27, 0.4, 3.1, 1, 'banana', 'import', v_user_id, true, 'verified', v_food_seeded_at, v_food_seeded_at),
    (v_food_blueberries, 'ingredient', 'Blueberries', null, null, null, '{"common":{"label":"serving","quantity":1},"metric":{"label":"g","quantity":70}}'::jsonb, '1 serving', 1, 'serving', 70, 40, 0.5, 10, 0.2, 2, 0, 'blueberries', 'ocr', v_user_id, true, 'verified', v_food_seeded_at, v_food_seeded_at),
    (v_food_whey, 'packaged', 'Whey Isolate', 'Ascension Demo Pantry', '9902600000105', '9902600000105', '{"common":{"label":"scoop","quantity":1},"metric":{"label":"g","quantity":30}}'::jsonb, '1 scoop', 1, 'scoop', 30, 120, 25, 3, 1, 0, 95, 'whey isolate, natural flavor', 'barcode', v_user_id, true, 'verified', v_food_seeded_at, v_food_seeded_at),
    (v_food_sports_drink, 'packaged', 'Sports Drink', 'Ascension Demo Pantry', '9902600000106', '9902600000106', '{"common":{"label":"bottle","quantity":1},"metric":{"label":"ml","quantity":500}}'::jsonb, '1 bottle', 1, 'bottle', 500, 90, 0, 22, 0, 0, 150, 'water, sugar, electrolytes', 'import', v_user_id, true, 'verified', v_food_seeded_at, v_food_seeded_at),
    (v_food_chicken, 'ingredient', 'Chicken Breast', null, null, null, '{"common":{"label":"portion","quantity":1},"metric":{"label":"g","quantity":140}}'::jsonb, '1 portion', 1, 'portion', 140, 180, 35, 0, 4, 0, 95, 'cooked chicken breast', 'manual', v_user_id, true, 'verified', v_food_seeded_at, v_food_seeded_at),
    (v_food_rice, 'ingredient', 'Jasmine Rice', null, null, null, '{"common":{"label":"cup","quantity":1},"metric":{"label":"g","quantity":150}}'::jsonb, '1 cup', 1, 'cup', 150, 205, 4, 45, 0.4, 0.5, 5, 'cooked jasmine rice', 'import', v_user_id, true, 'verified', v_food_seeded_at, v_food_seeded_at),
    (v_food_avocado, 'ingredient', 'Avocado', null, null, null, '{"common":{"label":"half","quantity":1},"metric":{"label":"g","quantity":50}}'::jsonb, '1 half', 1, 'half', 50, 80, 1, 4, 7, 3, 3, 'avocado', 'user', v_user_id, false, 'user_confirmed', v_food_seeded_at, v_food_seeded_at),
    (v_food_protein_bar, 'packaged', 'Protein Bar', 'Ascension Demo Pantry', '9902600000110', '9902600000110', '{"common":{"label":"bar","quantity":1},"metric":{"label":"g","quantity":60}}'::jsonb, '1 bar', 1, 'bar', 60, 210, 20, 23, 7, 5, 180, 'protein blend, oats, peanut butter', 'barcode', v_user_id, true, 'verified', v_food_seeded_at, v_food_seeded_at),
    (v_food_trail_mix, 'packaged', 'Trail Mix', 'Ascension Demo Pantry', '9902600000111', '9902600000111', '{"common":{"label":"packet","quantity":1},"metric":{"label":"g","quantity":28}}'::jsonb, '1 packet', 1, 'packet', 28, 170, 5, 15, 11, 2, 75, 'nuts, dried fruit, seeds', 'user', v_user_id, false, 'user_confirmed', v_food_seeded_at, v_food_seeded_at),
    (v_food_sourdough, 'packaged', 'Sourdough Bread', 'Ascension Demo Pantry', '9902600000112', '9902600000112', '{"common":{"label":"slice","quantity":1},"metric":{"label":"g","quantity":45}}'::jsonb, '1 slice', 1, 'slice', 45, 120, 4, 24, 1, 1, 220, 'sourdough bread', 'ocr', v_user_id, true, 'verified', v_food_seeded_at, v_food_seeded_at),
    (v_food_almond_butter, 'packaged', 'Almond Butter', 'Ascension Demo Pantry', '9902600000113', '9902600000113', '{"common":{"label":"tbsp","quantity":1},"metric":{"label":"g","quantity":16}}'::jsonb, '1 tbsp', 1, 'tbsp', 16, 100, 3.5, 3.5, 9, 2, 55, 'almonds, sea salt', 'manual', v_user_id, true, 'verified', v_food_seeded_at, v_food_seeded_at),
    (v_food_salmon, 'ingredient', 'Salmon Fillet', null, null, null, '{"common":{"label":"portion","quantity":1},"metric":{"label":"g","quantity":150}}'::jsonb, '1 portion', 1, 'portion', 150, 280, 32, 0, 17, 0, 95, 'cooked salmon fillet', 'manual', v_user_id, true, 'verified', v_food_seeded_at, v_food_seeded_at),
    (v_food_sweet_potato, 'ingredient', 'Sweet Potato', null, null, null, '{"common":{"label":"medium","quantity":1},"metric":{"label":"g","quantity":180}}'::jsonb, '1 medium', 1, 'medium', 180, 160, 3, 37, 0.2, 5, 70, 'roasted sweet potato', 'import', v_user_id, true, 'verified', v_food_seeded_at, v_food_seeded_at);

  insert into tmp_seed_food_targets (target_schema, target_table)
  values ('nutrition', 'food_items')
  on conflict do nothing;

  if to_regclass('nutrition.foods') is not null then
    insert into tmp_seed_food_targets (target_schema, target_table)
    values ('nutrition', 'foods')
    on conflict do nothing;
  end if;

  if to_regclass('public.foods') is not null then
    insert into tmp_seed_food_targets (target_schema, target_table)
    values ('public', 'foods')
    on conflict do nothing;
  end if;

  insert into tmp_seed_food_targets (target_schema, target_table)
  select distinct
    target_ns.nspname,
    target_rel.relname
  from pg_constraint con
  join pg_class source_rel
    on source_rel.oid = con.conrelid
  join pg_namespace source_ns
    on source_ns.oid = source_rel.relnamespace
  join pg_class target_rel
    on target_rel.oid = con.confrelid
  join pg_namespace target_ns
    on target_ns.oid = target_rel.relnamespace
  join pg_attribute source_attr
    on source_attr.attrelid = source_rel.oid
   and source_attr.attnum = any(con.conkey)
  where con.contype = 'f'
    and source_ns.nspname = 'nutrition'
    and source_rel.relname in ('recipe_ingredients', 'diary_items', 'user_favorite_foods')
    and source_attr.attname = 'food_id'
  on conflict do nothing;

  insert into tmp_seed_food_fk_targets (source_table, target_schema, target_table)
  select
    source_rel.relname,
    target_ns.nspname,
    target_rel.relname
  from pg_constraint con
  join pg_class source_rel
    on source_rel.oid = con.conrelid
  join pg_namespace source_ns
    on source_ns.oid = source_rel.relnamespace
  join pg_class target_rel
    on target_rel.oid = con.confrelid
  join pg_namespace target_ns
    on target_ns.oid = target_rel.relnamespace
  join pg_attribute source_attr
    on source_attr.attrelid = source_rel.oid
   and source_attr.attnum = any(con.conkey)
  where con.contype = 'f'
    and source_ns.nspname = 'nutrition'
    and source_rel.relname in ('recipe_ingredients', 'diary_items', 'user_favorite_foods')
    and source_attr.attname = 'food_id'
  on conflict (source_table) do update
  set
    target_schema = excluded.target_schema,
    target_table = excluded.target_table;

  for v_food_target in
    select
      target_schema,
      target_table
    from tmp_seed_food_targets
    order by
      case when target_schema = 'nutrition' and target_table = 'food_items' then 0 else 1 end,
      target_schema,
      target_table
  loop
    select format_type(a.atttypid, a.atttypmod)
    into v_food_target_id_type
    from pg_attribute a
    where a.attrelid = format('%I.%I', v_food_target.target_schema, v_food_target.target_table)::regclass
      and a.attname = 'id'
      and a.attnum > 0
      and not a.attisdropped;

    select c.column_name
    into v_food_target_name_column
    from information_schema.columns c
    where c.table_schema = v_food_target.target_schema
      and c.table_name = v_food_target.target_table
      and c.column_name in ('name', 'food_name', 'product_name', 'title')
    order by
      case c.column_name
        when 'name' then 0
        when 'food_name' then 1
        when 'product_name' then 2
        else 3
      end
    limit 1;

    select c.column_name
    into v_food_target_brand_column
    from information_schema.columns c
    where c.table_schema = v_food_target.target_schema
      and c.table_name = v_food_target.target_table
      and c.column_name in ('brand', 'brand_name')
    order by
      case c.column_name
        when 'brand' then 0
        else 1
      end
    limit 1;

    select c.column_name
    into v_food_target_barcode_column
    from information_schema.columns c
    where c.table_schema = v_food_target.target_schema
      and c.table_name = v_food_target.target_table
      and c.column_name = 'barcode'
    limit 1;

    select
      string_agg(format('%I', mapped.column_name), ', ' order by mapped.ordinal_position),
      string_agg(mapped.select_expression, ', ' order by mapped.ordinal_position),
      string_agg(
        format('%s as %I', mapped.select_expression, mapped.column_name),
        ', ' order by mapped.ordinal_position
      ),
      string_agg(
        format('%1$I = excluded.%1$I', mapped.column_name),
        ', ' order by mapped.ordinal_position
      ) filter (where mapped.column_name <> 'id'),
      string_agg(
        format('%1$I = f.%1$I', mapped.column_name),
        ', ' order by mapped.ordinal_position
      ) filter (where mapped.column_name <> 'id'),
      string_agg(
        format('%I', mapped.column_name),
        ', ' order by mapped.ordinal_position
      ) filter (where mapped.column_name <> 'id'),
      string_agg(
        mapped.select_expression,
        ', ' order by mapped.ordinal_position
      ) filter (where mapped.column_name <> 'id')
    into
      v_food_target_column_list,
      v_food_target_select_list,
      v_food_target_select_with_aliases,
      v_food_target_update_list,
      v_food_target_update_list_from_row,
      v_food_target_column_list_without_id,
      v_food_target_select_list_without_id
    from (
      select
        c.column_name,
        c.ordinal_position,
        case
          when c.column_name = 'id' then
            case
              when v_food_target_id_type in ('text', 'character varying', 'character') then 'f.id::text'
              else 'f.id'
            end
          when c.column_name = 'food_kind' then 'f.food_kind'
          when c.column_name in ('name', 'food_name', 'product_name', 'title') then 'f.name'
          when c.column_name in ('brand', 'brand_name') then 'f.brand'
          when c.column_name = 'barcode' then 'f.barcode'
          when c.column_name = 'ean_13' then
            case
              when c.data_type in ('smallint', 'integer', 'bigint', 'numeric', 'decimal') then
                'nullif(regexp_replace(coalesce(f.ean_13, ''''), ''[^0-9]'', '''', ''g''), '''')::numeric'
              else 'f.ean_13'
            end
          when c.column_name = 'serving_reference' then 'f.serving_reference'
          when c.column_name in ('serving_size', 'serving_label', 'serving_description') then 'f.serving_size'
          when c.column_name in ('serving_qty', 'serving_amount') then 'f.serving_qty'
          when c.column_name in ('serving_unit', 'unit') then 'f.serving_unit'
          when c.column_name in ('serving_grams', 'grams_per_serving') then 'f.serving_grams'
          when c.column_name in ('calories', 'kcal') then 'f.calories'
          when c.column_name = 'protein' then 'f.protein'
          when c.column_name = 'carbs' then 'f.carbs'
          when c.column_name = 'fat' then 'f.fat'
          when c.column_name = 'fiber' then 'f.fiber'
          when c.column_name in ('sodium_mg', 'sodium') then 'f.sodium_mg'
          when c.column_name in ('ingredients_text', 'description') then 'f.ingredients_text'
          when c.column_name = 'source' then 'f.source'
          when c.column_name in ('created_by', 'user_id') then 'f.created_by'
          when c.column_name = 'is_verified' then 'f.is_verified'
          when c.column_name = 'verification_status' then 'f.verification_status'
          when c.column_name = 'image_urls' then
            case
              when c.data_type = 'ARRAY' then 'f.image_urls'
              when c.udt_name = 'jsonb' then 'to_jsonb(f.image_urls)'
              else null
            end
          when c.column_name in ('created_at', 'updated_at') then format('f.%I', c.column_name)
          else null
        end as select_expression
      from information_schema.columns c
      where c.table_schema = v_food_target.target_schema
        and c.table_name = v_food_target.target_table
        and coalesce(c.is_generated, 'NEVER') = 'NEVER'
    ) mapped
    where mapped.select_expression is not null;

    select
      string_agg(format('%I', c.column_name), ', ' order by c.ordinal_position)
    into v_food_target_missing_required
    from information_schema.columns c
    left join (
      values
        ('id'),
        ('food_kind'),
        ('name'),
        ('food_name'),
        ('product_name'),
        ('title'),
        ('brand'),
        ('brand_name'),
        ('barcode'),
        ('ean_13'),
        ('serving_reference'),
        ('serving_size'),
        ('serving_label'),
        ('serving_description'),
        ('serving_qty'),
        ('serving_amount'),
        ('serving_unit'),
        ('unit'),
        ('serving_grams'),
        ('grams_per_serving'),
        ('calories'),
        ('kcal'),
        ('protein'),
        ('carbs'),
        ('fat'),
        ('fiber'),
        ('sodium_mg'),
        ('sodium'),
        ('ingredients_text'),
        ('description'),
        ('source'),
        ('created_by'),
        ('user_id'),
        ('is_verified'),
        ('verification_status'),
        ('image_urls'),
        ('created_at'),
        ('updated_at')
    ) as supported(column_name)
      on supported.column_name = c.column_name
    where c.table_schema = v_food_target.target_schema
      and c.table_name = v_food_target.target_table
      and c.is_nullable = 'NO'
      and c.column_default is null
      and c.is_identity = 'NO'
      and coalesce(c.is_generated, 'NEVER') = 'NEVER'
      and supported.column_name is null;

    if v_food_target_missing_required is not null then
      raise exception
        'Nutrition smoke seed cannot populate %.% because required columns are not mapped: %',
        v_food_target.target_schema,
        v_food_target.target_table,
        v_food_target_missing_required;
    end if;

    if coalesce(v_food_target_column_list, '') = '' or coalesce(v_food_target_select_list, '') = '' then
      raise exception
        'Nutrition smoke seed found no compatible mapped columns for %.%',
        v_food_target.target_schema,
        v_food_target.target_table;
    end if;

    if v_food_target_id_type = 'uuid' then
      if coalesce(v_food_target_update_list, '') = '' then
        execute format(
          'insert into %I.%I (%s) select %s from tmp_seed_food_catalog f on conflict (id) do nothing',
          v_food_target.target_schema,
          v_food_target.target_table,
          v_food_target_column_list,
          v_food_target_select_list
        );
      else
        execute format(
          'insert into %I.%I (%s) select %s from tmp_seed_food_catalog f on conflict (id) do update set %s',
          v_food_target.target_schema,
          v_food_target.target_table,
          v_food_target_column_list,
          v_food_target_select_list,
          v_food_target_update_list
        );
      end if;

      insert into tmp_seed_food_id_map (
        logical_food_id,
        target_schema,
        target_table,
        live_food_id_text
      )
      select
        f.id,
        v_food_target.target_schema,
        v_food_target.target_table,
        f.id::text
      from tmp_seed_food_catalog f
      on conflict (logical_food_id, target_schema, target_table) do update
      set live_food_id_text = excluded.live_food_id_text;
    elsif v_food_target_id_type in ('text', 'character varying', 'character') then
      for v_food_row in
        select id, name, brand, barcode
        from tmp_seed_food_catalog
      loop
        v_live_food_id_text := null;

        if v_food_target_barcode_column is not null and v_food_row.barcode is not null then
          execute format(
            'select id::text from %I.%I where %I = $1 order by id desc limit 1',
            v_food_target.target_schema,
            v_food_target.target_table,
            v_food_target_barcode_column
          )
          into v_live_food_id_text
          using v_food_row.barcode;
        end if;

        if v_live_food_id_text is null and v_food_target_name_column is not null then
          if v_food_target_brand_column is not null then
            execute format(
              'select id::text from %I.%I where %I = $1 and %I is not distinct from $2 order by id desc limit 1',
              v_food_target.target_schema,
              v_food_target.target_table,
              v_food_target_name_column,
              v_food_target_brand_column
            )
            into v_live_food_id_text
            using v_food_row.name, v_food_row.brand;
          else
            execute format(
              'select id::text from %I.%I where %I = $1 order by id desc limit 1',
              v_food_target.target_schema,
              v_food_target.target_table,
              v_food_target_name_column
            )
            into v_live_food_id_text
            using v_food_row.name;
          end if;
        end if;

        if v_live_food_id_text is null then
          execute format(
            'insert into %I.%I (%s) select %s from tmp_seed_food_catalog f where f.id = $1 returning id::text',
            v_food_target.target_schema,
            v_food_target.target_table,
            v_food_target_column_list,
            v_food_target_select_list
          )
          into v_live_food_id_text
          using v_food_row.id;
        elsif coalesce(v_food_target_update_list_from_row, '') <> '' then
          execute format(
            'update %I.%I as t set %s from (select %s from tmp_seed_food_catalog f where f.id = $1) as f where t.id::text = $2',
            v_food_target.target_schema,
            v_food_target.target_table,
            v_food_target_update_list_from_row,
            v_food_target_select_with_aliases
          )
          using v_food_row.id, v_live_food_id_text;
        end if;

        insert into tmp_seed_food_id_map (
          logical_food_id,
          target_schema,
          target_table,
          live_food_id_text
        )
        values (
          v_food_row.id,
          v_food_target.target_schema,
          v_food_target.target_table,
          v_live_food_id_text
        )
        on conflict (logical_food_id, target_schema, target_table) do update
        set live_food_id_text = excluded.live_food_id_text;
      end loop;
    elsif v_food_target_id_type in ('bigint', 'integer', 'smallint') then
      if coalesce(v_food_target_column_list_without_id, '') = '' or coalesce(v_food_target_select_list_without_id, '') = '' then
        raise exception
          'Nutrition smoke seed cannot insert into %.% because non-uuid ids require insert columns other than id',
          v_food_target.target_schema,
          v_food_target.target_table;
      end if;

      for v_food_row in
        select id, name, brand, barcode
        from tmp_seed_food_catalog
      loop
        v_live_food_id_text := null;

        if v_food_target_barcode_column is not null and v_food_row.barcode is not null then
          execute format(
            'select id::text from %I.%I where %I = $1 order by id desc limit 1',
            v_food_target.target_schema,
            v_food_target.target_table,
            v_food_target_barcode_column
          )
          into v_live_food_id_text
          using v_food_row.barcode;
        end if;

        if v_live_food_id_text is null and v_food_target_name_column is not null then
          if v_food_target_brand_column is not null then
            execute format(
              'select id::text from %I.%I where %I = $1 and %I is not distinct from $2 order by id desc limit 1',
              v_food_target.target_schema,
              v_food_target.target_table,
              v_food_target_name_column,
              v_food_target_brand_column
            )
            into v_live_food_id_text
            using v_food_row.name, v_food_row.brand;
          else
            execute format(
              'select id::text from %I.%I where %I = $1 order by id desc limit 1',
              v_food_target.target_schema,
              v_food_target.target_table,
              v_food_target_name_column
            )
            into v_live_food_id_text
            using v_food_row.name;
          end if;
        end if;

        if v_live_food_id_text is null then
          execute format(
            'insert into %I.%I (%s) select %s from tmp_seed_food_catalog f where f.id = $1 returning id::text',
            v_food_target.target_schema,
            v_food_target.target_table,
            v_food_target_column_list_without_id,
            v_food_target_select_list_without_id
          )
          into v_live_food_id_text
          using v_food_row.id;
        elsif coalesce(v_food_target_update_list_from_row, '') <> '' then
          execute format(
            'update %I.%I as t set %s from (select %s from tmp_seed_food_catalog f where f.id = $1) as f where t.id::text = $2',
            v_food_target.target_schema,
            v_food_target.target_table,
            v_food_target_update_list_from_row,
            v_food_target_select_with_aliases
          )
          using v_food_row.id, v_live_food_id_text;
        end if;

        insert into tmp_seed_food_id_map (
          logical_food_id,
          target_schema,
          target_table,
          live_food_id_text
        )
        values (
          v_food_row.id,
          v_food_target.target_schema,
          v_food_target.target_table,
          v_live_food_id_text
        )
        on conflict (logical_food_id, target_schema, target_table) do update
        set live_food_id_text = excluded.live_food_id_text;
      end loop;
    else
      raise exception
        'Nutrition smoke seed does not yet support %.% id type % for compatibility food seeding',
        v_food_target.target_schema,
        v_food_target.target_table,
        v_food_target_id_type;
    end if;
  end loop;

  select format_type(a.atttypid, a.atttypmod)
  into v_recipe_ingredient_food_id_type
  from pg_attribute a
  where a.attrelid = 'nutrition.recipe_ingredients'::regclass
    and a.attname = 'food_id'
    and a.attnum > 0
    and not a.attisdropped;

  select target_schema, target_table
  into v_recipe_food_target_schema, v_recipe_food_target_table
  from tmp_seed_food_fk_targets
  where source_table = 'recipe_ingredients';

  if v_recipe_food_target_schema is null or v_recipe_food_target_table is null then
    if coalesce(v_recipe_ingredient_food_id_type, 'uuid') = 'uuid' then
      v_recipe_food_target_schema := 'nutrition';
      v_recipe_food_target_table := 'food_items';
    else
      select
        t.target_schema,
        t.target_table
      into
        v_recipe_food_target_schema,
        v_recipe_food_target_table
      from tmp_seed_food_targets t
      join pg_attribute a
        on a.attrelid = format('%I.%I', t.target_schema, t.target_table)::regclass
       and a.attname = 'id'
       and a.attnum > 0
       and not a.attisdropped
      where format_type(a.atttypid, a.atttypmod) = v_recipe_ingredient_food_id_type
      order by
        case
          when t.target_schema = 'nutrition' and t.target_table = 'foods' then 0
          when t.target_schema = 'public' and t.target_table = 'foods' then 1
          when t.target_schema = 'nutrition' and t.target_table = 'food_items' then 2
          else 3
        end
      limit 1;
    end if;
  end if;

  if v_recipe_food_target_schema is null or v_recipe_food_target_table is null then
    raise exception
      'Nutrition smoke seed could not determine a compatible live food table for nutrition.recipe_ingredients.food_id type %',
      v_recipe_ingredient_food_id_type;
  end if;

  v_recipe_ingredient_food_id_expr := format(
    '(select m.live_food_id_text::%s from tmp_seed_food_id_map m where m.logical_food_id = s.logical_food_id and m.target_schema = %L and m.target_table = %L)',
    v_recipe_ingredient_food_id_type,
    v_recipe_food_target_schema,
    v_recipe_food_target_table
  );

  if v_has_favorite_foods then
    select format_type(a.atttypid, a.atttypmod)
    into v_favorite_food_id_type
    from pg_attribute a
    where a.attrelid = 'nutrition.user_favorite_foods'::regclass
      and a.attname = 'food_id'
      and a.attnum > 0
      and not a.attisdropped;

    select target_schema, target_table
    into v_favorite_food_target_schema, v_favorite_food_target_table
    from tmp_seed_food_fk_targets
    where source_table = 'user_favorite_foods';

    if v_favorite_food_target_schema is null or v_favorite_food_target_table is null then
      if coalesce(v_favorite_food_id_type, 'uuid') = 'uuid' then
        v_favorite_food_target_schema := 'nutrition';
        v_favorite_food_target_table := 'food_items';
      else
        select
          t.target_schema,
          t.target_table
        into
          v_favorite_food_target_schema,
          v_favorite_food_target_table
        from tmp_seed_food_targets t
        join pg_attribute a
          on a.attrelid = format('%I.%I', t.target_schema, t.target_table)::regclass
         and a.attname = 'id'
         and a.attnum > 0
         and not a.attisdropped
        where format_type(a.atttypid, a.atttypmod) = v_favorite_food_id_type
        order by
          case
            when t.target_schema = 'nutrition' and t.target_table = 'foods' then 0
            when t.target_schema = 'public' and t.target_table = 'foods' then 1
            when t.target_schema = 'nutrition' and t.target_table = 'food_items' then 2
            else 3
          end
        limit 1;
      end if;
    end if;

    if v_favorite_food_target_schema is null or v_favorite_food_target_table is null then
      raise exception
        'Nutrition smoke seed could not determine a compatible live food table for nutrition.user_favorite_foods.food_id type %',
        v_favorite_food_id_type;
    end if;

    v_favorite_food_id_expr := format(
      '(select m.live_food_id_text::%s from tmp_seed_food_id_map m where m.logical_food_id = f.logical_food_id and m.target_schema = %L and m.target_table = %L)',
      v_favorite_food_id_type,
      v_favorite_food_target_schema,
      v_favorite_food_target_table
    );
  end if;

  select format_type(a.atttypid, a.atttypmod)
  into v_diary_item_meal_type_type
  from pg_attribute a
  where a.attrelid = 'nutrition.diary_items'::regclass
    and a.attname = 'meal_type'
    and a.attnum > 0
    and not a.attisdropped;

  select format_type(a.atttypid, a.atttypmod)
  into v_diary_item_meal_slot_type
  from pg_attribute a
  where a.attrelid = 'nutrition.diary_items'::regclass
    and a.attname = 'meal_slot'
    and a.attnum > 0
    and not a.attisdropped;

  if coalesce(v_diary_item_meal_type_type, 'text') <> 'text' then
    v_diary_item_meal_type_expr := format('e.meal_type::%s', v_diary_item_meal_type_type);
  end if;

  if coalesce(v_diary_item_meal_slot_type, 'text') <> 'text' then
    v_diary_item_meal_slot_expr := format('e.meal_slot::%s', v_diary_item_meal_slot_type);
  end if;

  select format_type(a.atttypid, a.atttypmod)
  into v_diary_item_food_id_type
  from pg_attribute a
  where a.attrelid = 'nutrition.diary_items'::regclass
    and a.attname = 'food_id'
    and a.attnum > 0
    and not a.attisdropped;

  select target_schema, target_table
  into v_diary_food_target_schema, v_diary_food_target_table
  from tmp_seed_food_fk_targets
  where source_table = 'diary_items';

  if v_diary_food_target_schema is null or v_diary_food_target_table is null then
    if coalesce(v_diary_item_food_id_type, 'uuid') = 'uuid' then
      v_diary_food_target_schema := 'nutrition';
      v_diary_food_target_table := 'food_items';
    else
      select
        t.target_schema,
        t.target_table
      into
        v_diary_food_target_schema,
        v_diary_food_target_table
      from tmp_seed_food_targets t
      join pg_attribute a
        on a.attrelid = format('%I.%I', t.target_schema, t.target_table)::regclass
       and a.attname = 'id'
       and a.attnum > 0
       and not a.attisdropped
      where format_type(a.atttypid, a.atttypmod) = v_diary_item_food_id_type
      order by
        case
          when t.target_schema = 'nutrition' and t.target_table = 'foods' then 0
          when t.target_schema = 'public' and t.target_table = 'foods' then 1
          when t.target_schema = 'nutrition' and t.target_table = 'food_items' then 2
          else 3
        end
      limit 1;
    end if;
  end if;

  if v_diary_food_target_schema is null or v_diary_food_target_table is null then
    raise exception
      'Nutrition smoke seed could not determine a compatible live food table for nutrition.diary_items.food_id type %',
      v_diary_item_food_id_type;
  end if;

  v_diary_item_food_id_expr := format(
    '(select m.live_food_id_text::%s from tmp_seed_food_id_map m where m.logical_food_id = e.food_id and m.target_schema = %L and m.target_table = %L)',
    v_diary_item_food_id_type,
    v_diary_food_target_schema,
    v_diary_food_target_table
  );

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
    (v_recipe_oats, v_user_id, 'Power Oats Bowl', 'High-carb breakfast bowl for training mornings.', 'demo_seed:nutrition_progress_smoke:v1', 515, 35.3, 70.5, 13.6, 11.1, 23, 151, 274, true),
    (v_recipe_yogurt, v_user_id, 'Greek Yogurt Crunch', 'Balanced yogurt bowl with berries and crunch.', 'demo_seed:nutrition_progress_smoke:v1', 363, 24.8, 40.3, 10.0, 5.5, 18, 121, 281, true),
    (v_recipe_chicken_bowl, v_user_id, 'Chicken Rice Bowl', 'Reliable lunch and dinner prep bowl.', 'demo_seed:nutrition_progress_smoke:v1', 516, 41.0, 60.3, 11.5, 4.3, 3, 104, 377, true),
    (v_recipe_smoothie, v_user_id, 'Recovery Smoothie', 'Quick post-workout protein and carb refill.', 'demo_seed:nutrition_progress_smoke:v1', 337, 26.8, 57.6, 1.6, 5.1, 34, 216, 274, true),
    (v_recipe_salmon_plate, v_user_id, 'Salmon Sweet Potato Plate', 'Higher-fat dinner with steady carbs.', 'demo_seed:nutrition_progress_smoke:v1', 480, 35.5, 39.0, 20.7, 6.5, 6, 167, 355, true)
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

  delete from nutrition.recipe_ingredients
  where recipe_id in (
    v_recipe_oats,
    v_recipe_yogurt,
    v_recipe_chicken_bowl,
    v_recipe_smoothie,
    v_recipe_salmon_plate
  );

  insert into tmp_seed_recipe_ingredients (
    recipe_id,
    logical_food_id,
    quantity,
    unit,
    grams,
    kcal,
    protein,
    carbs,
    fat,
    fiber,
    sodium,
    position,
    note,
    created_by
  )
  values
    (v_recipe_oats, v_food_oats, 1.0, 'serving', 40, 150, 5.0, 27.0, 3.0, 4.0, 0, 0, null, v_user_id),
    (v_recipe_oats, v_food_whey, 1.0, 'scoop', 30, 120, 25.0, 3.0, 1.0, 0, 95, 1, null, v_user_id),
    (v_recipe_oats, v_food_banana, 1.0, 'medium', 118, 105, 1.3, 27.0, 0.4, 3.1, 1, 2, null, v_user_id),
    (v_recipe_oats, v_food_blueberries, 1.0, 'serving', 70, 40, 0.5, 10.0, 0.2, 2.0, 0, 3, null, v_user_id),
    (v_recipe_oats, v_food_almond_butter, 1.0, 'tbsp', 16, 100, 3.5, 3.5, 9.0, 2.0, 55, 4, null, v_user_id),
    (v_recipe_yogurt, v_food_greek_yogurt, 1.0, 'cup', 170, 120, 18.0, 6.0, 0.0, 0, 65, 0, null, v_user_id),
    (v_recipe_yogurt, v_food_blueberries, 1.0, 'serving', 70, 40, 0.5, 10.0, 0.2, 2.0, 0, 1, null, v_user_id),
    (v_recipe_yogurt, v_food_oats, 0.5, 'serving', 20, 75, 2.5, 13.5, 1.5, 2.0, 0, 2, null, v_user_id),
    (v_recipe_yogurt, v_food_trail_mix, 0.75, 'packet', 21, 128, 3.8, 11.3, 8.3, 1.5, 56, 3, null, v_user_id),
    (v_recipe_chicken_bowl, v_food_chicken, 1.0, 'portion', 140, 180, 35.0, 0.0, 4.0, 0, 95, 0, null, v_user_id),
    (v_recipe_chicken_bowl, v_food_rice, 1.15, 'cup', 173, 236, 4.6, 51.8, 0.5, 0.6, 6, 1, null, v_user_id),
    (v_recipe_chicken_bowl, v_food_avocado, 1.25, 'half', 62.5, 100, 1.3, 5.0, 8.8, 3.8, 4, 2, null, v_user_id),
    (v_recipe_smoothie, v_food_whey, 1.0, 'scoop', 30, 120, 25.0, 3.0, 1.0, 0, 95, 0, null, v_user_id),
    (v_recipe_smoothie, v_food_banana, 1.0, 'medium', 118, 105, 1.3, 27.0, 0.4, 3.1, 1, 1, null, v_user_id),
    (v_recipe_smoothie, v_food_blueberries, 1.0, 'serving', 70, 40, 0.5, 10.0, 0.2, 2.0, 0, 2, null, v_user_id),
    (v_recipe_smoothie, v_food_sports_drink, 0.8, 'bottle', 400, 72, 0.0, 17.6, 0.0, 0, 120, 3, null, v_user_id),
    (v_recipe_salmon_plate, v_food_salmon, 1.0, 'portion', 150, 280, 32.0, 0.0, 17.0, 0, 95, 0, null, v_user_id),
    (v_recipe_salmon_plate, v_food_sweet_potato, 1.0, 'medium', 180, 160, 3.0, 37.0, 0.2, 5.0, 70, 1, null, v_user_id),
    (v_recipe_salmon_plate, v_food_avocado, 0.5, 'half', 25, 40, 0.5, 2.0, 3.5, 1.5, 2, 2, null, v_user_id);

  execute format(
    'insert into nutrition.recipe_ingredients (
       recipe_id,
       food_id,
       quantity,
       unit,
       grams,
       kcal,
       protein,
       carbs,
       fat,
       fiber,
       sodium,
       position,
       note,
       created_by
     )
     select
       s.recipe_id,
       %s,
       s.quantity,
       s.unit,
       s.grams,
       s.kcal,
       s.protein,
       s.carbs,
       s.fat,
       s.fiber,
       s.sodium,
       s.position,
       s.note,
       s.created_by
     from tmp_seed_recipe_ingredients s
     order by s.recipe_id, s.position',
    v_recipe_ingredient_food_id_expr
  );

  if v_has_favorite_meals then
    insert into nutrition.user_favorite_meals (user_id, meal_id)
    values
      (v_user_id, v_recipe_oats),
      (v_user_id, v_recipe_chicken_bowl),
      (v_user_id, v_recipe_smoothie)
    on conflict (user_id, meal_id) do nothing;
  end if;

  if v_has_favorite_foods then
    insert into tmp_seed_favorite_foods (logical_food_id)
    values
      (v_food_banana),
      (v_food_protein_bar),
      (v_food_greek_yogurt)
    on conflict (logical_food_id) do nothing;

    execute format(
      'insert into nutrition.user_favorite_foods (user_id, food_id)
       select $1, %s
       from tmp_seed_favorite_foods f
       on conflict (user_id, food_id) do nothing',
      v_favorite_food_id_expr
    )
    using v_user_id;
  end if;

  insert into tmp_nutrition_seed_pattern (
    diary_date,
    day_index,
    iso_dow,
    is_training_day,
    is_underfueled
  )
  select
    d::date,
    row_number() over (order by d) - 1,
    extract(isodow from d)::integer,
    extract(isodow from d)::integer in (2, 4, 6),
    (extract(isodow from d)::integer = 6 and d >= v_end_date - 6)
  from generate_series(v_start_date, v_end_date, interval '1 day') as d;

  insert into tmp_nutrition_seed_days (
    diary_date,
    timezone_str,
    kcal_target,
    protein_target,
    carbs_target,
    fat_target
  )
  select
    p.diary_date,
    v_timezone,
    case
      when p.is_training_day then 2450 + (mod(p.day_index, 2) * 60)
      when p.iso_dow in (6, 7) then 2300
      else 2200 + (mod(p.day_index, 3) * 40)
    end,
    case when p.is_training_day then 180 else 170 end,
    case
      when p.is_training_day then 280 + (mod(p.day_index, 2) * 12)
      else 210 + (mod(p.day_index, 3) * 8)
    end,
    case when p.is_training_day then 70 else 72 end
  from tmp_nutrition_seed_pattern p;

  insert into tmp_nutrition_seed_entries
  select
    p.diary_date,
    (p.diary_date::timestamp + time '07:15') at time zone v_timezone,
    'breakfast',
    'breakfast',
    null,
    v_recipe_oats,
    round((0.92::numeric + mod(p.day_index, 3) * 0.04::numeric), 3),
    'portion',
    round(274 * (0.92::numeric + mod(p.day_index, 3) * 0.04::numeric), 2),
    round(515 * (0.92::numeric + mod(p.day_index, 3) * 0.04::numeric), 2),
    round(35.3 * (0.92::numeric + mod(p.day_index, 3) * 0.04::numeric), 2),
    round(70.5 * (0.92::numeric + mod(p.day_index, 3) * 0.04::numeric), 2),
    round(13.6 * (0.92::numeric + mod(p.day_index, 3) * 0.04::numeric), 2),
    round(11.1 * (0.92::numeric + mod(p.day_index, 3) * 0.04::numeric), 2),
    round(23 * (0.92::numeric + mod(p.day_index, 3) * 0.04::numeric), 2),
    round(151 * (0.92::numeric + mod(p.day_index, 3) * 0.04::numeric), 2),
    'demo oats breakfast'
  from tmp_nutrition_seed_pattern p
  where mod(p.day_index, 2) = 0;

  insert into tmp_nutrition_seed_entries
  select
    p.diary_date,
    (p.diary_date::timestamp + time '07:20') at time zone v_timezone,
    'breakfast',
    'breakfast',
    null,
    v_recipe_yogurt,
    round((0.94::numeric + mod(p.day_index, 2) * 0.05::numeric), 3),
    'portion',
    round(281 * (0.94::numeric + mod(p.day_index, 2) * 0.05::numeric), 2),
    round(363 * (0.94::numeric + mod(p.day_index, 2) * 0.05::numeric), 2),
    round(24.8 * (0.94::numeric + mod(p.day_index, 2) * 0.05::numeric), 2),
    round(40.3 * (0.94::numeric + mod(p.day_index, 2) * 0.05::numeric), 2),
    round(10.0 * (0.94::numeric + mod(p.day_index, 2) * 0.05::numeric), 2),
    round(5.5 * (0.94::numeric + mod(p.day_index, 2) * 0.05::numeric), 2),
    round(18 * (0.94::numeric + mod(p.day_index, 2) * 0.05::numeric), 2),
    round(121 * (0.94::numeric + mod(p.day_index, 2) * 0.05::numeric), 2),
    'demo yogurt breakfast'
  from tmp_nutrition_seed_pattern p
  where mod(p.day_index, 2) = 1;

  insert into tmp_nutrition_seed_entries
  select
    p.diary_date,
    (p.diary_date::timestamp + time '12:30') at time zone v_timezone,
    'lunch',
    'lunch',
    null,
    v_recipe_chicken_bowl,
    round((0.88::numeric + mod(p.day_index, 3) * 0.05::numeric), 3),
    'portion',
    round(377 * (0.88::numeric + mod(p.day_index, 3) * 0.05::numeric), 2),
    round(516 * (0.88::numeric + mod(p.day_index, 3) * 0.05::numeric), 2),
    round(41.0 * (0.88::numeric + mod(p.day_index, 3) * 0.05::numeric), 2),
    round(60.3 * (0.88::numeric + mod(p.day_index, 3) * 0.05::numeric), 2),
    round(11.5 * (0.88::numeric + mod(p.day_index, 3) * 0.05::numeric), 2),
    round(4.3 * (0.88::numeric + mod(p.day_index, 3) * 0.05::numeric), 2),
    round(3 * (0.88::numeric + mod(p.day_index, 3) * 0.05::numeric), 2),
    round(104 * (0.88::numeric + mod(p.day_index, 3) * 0.05::numeric), 2),
    'demo lunch bowl'
  from tmp_nutrition_seed_pattern p;

  insert into tmp_nutrition_seed_entries
  select
    p.diary_date,
    (p.diary_date::timestamp + time '19:00') at time zone v_timezone,
    'dinner',
    'dinner',
    null,
    v_recipe_salmon_plate,
    round((0.92::numeric + mod(p.day_index, 2) * 0.06::numeric), 3),
    'portion',
    round(355 * (0.92::numeric + mod(p.day_index, 2) * 0.06::numeric), 2),
    round(480 * (0.92::numeric + mod(p.day_index, 2) * 0.06::numeric), 2),
    round(35.5 * (0.92::numeric + mod(p.day_index, 2) * 0.06::numeric), 2),
    round(39.0 * (0.92::numeric + mod(p.day_index, 2) * 0.06::numeric), 2),
    round(20.7 * (0.92::numeric + mod(p.day_index, 2) * 0.06::numeric), 2),
    round(6.5 * (0.92::numeric + mod(p.day_index, 2) * 0.06::numeric), 2),
    round(6 * (0.92::numeric + mod(p.day_index, 2) * 0.06::numeric), 2),
    round(167 * (0.92::numeric + mod(p.day_index, 2) * 0.06::numeric), 2),
    'demo salmon dinner'
  from tmp_nutrition_seed_pattern p
  where mod(p.day_index, 2) = 0;

  insert into tmp_nutrition_seed_entries
  select
    p.diary_date,
    (p.diary_date::timestamp + time '19:05') at time zone v_timezone,
    'dinner',
    'dinner',
    null,
    v_recipe_chicken_bowl,
    round((0.96::numeric + mod(p.day_index, 2) * 0.05::numeric), 3),
    'portion',
    round(377 * (0.96::numeric + mod(p.day_index, 2) * 0.05::numeric), 2),
    round(516 * (0.96::numeric + mod(p.day_index, 2) * 0.05::numeric), 2),
    round(41.0 * (0.96::numeric + mod(p.day_index, 2) * 0.05::numeric), 2),
    round(60.3 * (0.96::numeric + mod(p.day_index, 2) * 0.05::numeric), 2),
    round(11.5 * (0.96::numeric + mod(p.day_index, 2) * 0.05::numeric), 2),
    round(4.3 * (0.96::numeric + mod(p.day_index, 2) * 0.05::numeric), 2),
    round(3 * (0.96::numeric + mod(p.day_index, 2) * 0.05::numeric), 2),
    round(104 * (0.96::numeric + mod(p.day_index, 2) * 0.05::numeric), 2),
    'demo chicken dinner'
  from tmp_nutrition_seed_pattern p
  where mod(p.day_index, 2) = 1;

  insert into tmp_nutrition_seed_entries
  select
    p.diary_date,
    (p.diary_date::timestamp + time '16:35') at time zone v_timezone,
    'pre-workout',
    'pre-workout',
    v_food_banana,
    null,
    case when p.is_underfueled then 0.5 else 1.0 end,
    'medium',
    case when p.is_underfueled then 59 else 118 end,
    case when p.is_underfueled then 52.5 else 105 end,
    case when p.is_underfueled then 0.65 else 1.3 end,
    case when p.is_underfueled then 13.5 else 27.0 end,
    case when p.is_underfueled then 0.2 else 0.4 end,
    case when p.is_underfueled then 1.55 else 3.1 end,
    case when p.is_underfueled then 7.0 else 14.0 end,
    case when p.is_underfueled then 0.5 else 1.0 end,
    'demo pre-workout banana'
  from tmp_nutrition_seed_pattern p
  where p.is_training_day;

  insert into tmp_nutrition_seed_entries
  select
    p.diary_date,
    (p.diary_date::timestamp + time '16:50') at time zone v_timezone,
    'pre-workout',
    'pre-workout',
    v_food_sports_drink,
    null,
    case when p.is_underfueled then 0.5 else 1.0 end,
    'bottle',
    case when p.is_underfueled then 250 else 500 end,
    case when p.is_underfueled then 45 else 90 end,
    0,
    case when p.is_underfueled then 11 else 22 end,
    0,
    0,
    case when p.is_underfueled then 11 else 22 end,
    case when p.is_underfueled then 75 else 150 end,
    'demo pre-workout hydration'
  from tmp_nutrition_seed_pattern p
  where p.is_training_day;

  insert into tmp_nutrition_seed_entries
  select
    p.diary_date,
    (p.diary_date::timestamp + time '18:45') at time zone v_timezone,
    'post-workout',
    'post-workout',
    null,
    v_recipe_smoothie,
    case when p.is_underfueled then 0.80 else 1.00 end,
    'portion',
    round(274 * case when p.is_underfueled then 0.80 else 1.00 end, 2),
    round(337 * case when p.is_underfueled then 0.80 else 1.00 end, 2),
    round(26.8 * case when p.is_underfueled then 0.80 else 1.00 end, 2),
    round(57.6 * case when p.is_underfueled then 0.80 else 1.00 end, 2),
    round(1.6 * case when p.is_underfueled then 0.80 else 1.00 end, 2),
    round(5.1 * case when p.is_underfueled then 0.80 else 1.00 end, 2),
    round(34 * case when p.is_underfueled then 0.80 else 1.00 end, 2),
    round(216 * case when p.is_underfueled then 0.80 else 1.00 end, 2),
    'demo recovery smoothie'
  from tmp_nutrition_seed_pattern p
  where p.is_training_day;

  insert into tmp_nutrition_seed_entries
  select
    p.diary_date,
    (p.diary_date::timestamp + time '15:10') at time zone v_timezone,
    'snack',
    'snack',
    v_food_protein_bar,
    null,
    1.0,
    'bar',
    60,
    210,
    20.0,
    23.0,
    7.0,
    5.0,
    6.0,
    180,
    'demo protein snack'
  from tmp_nutrition_seed_pattern p
  where p.iso_dow in (3, 7);

  insert into tmp_nutrition_seed_entries
  select
    p.diary_date,
    (p.diary_date::timestamp + time '21:00') at time zone v_timezone,
    'snack',
    'snack',
    v_food_trail_mix,
    null,
    case when p.is_underfueled then 0.75 else 1.0 end,
    'packet',
    round(28 * case when p.is_underfueled then 0.75 else 1.0 end, 2),
    round(170 * case when p.is_underfueled then 0.75 else 1.0 end, 2),
    round(5 * case when p.is_underfueled then 0.75 else 1.0 end, 2),
    round(15 * case when p.is_underfueled then 0.75 else 1.0 end, 2),
    round(11 * case when p.is_underfueled then 0.75 else 1.0 end, 2),
    round(2 * case when p.is_underfueled then 0.75 else 1.0 end, 2),
    round(12 * case when p.is_underfueled then 0.75 else 1.0 end, 2),
    round(75 * case when p.is_underfueled then 0.75 else 1.0 end, 2),
    'demo late snack'
  from tmp_nutrition_seed_pattern p
  where p.iso_dow in (1, 5);

  insert into tmp_nutrition_seed_entries
  select
    p.diary_date,
    (p.diary_date::timestamp + time '09:30') at time zone v_timezone,
    'snack',
    'snack',
    v_food_sourdough,
    null,
    2.0,
    'slice',
    90,
    240,
    8.0,
    48.0,
    2.0,
    2.0,
    4.0,
    440,
    'demo weekend toast'
  from tmp_nutrition_seed_pattern p
  where p.iso_dow = 7;

  insert into tmp_nutrition_seed_entries
  select
    p.diary_date,
    (p.diary_date::timestamp + time '09:32') at time zone v_timezone,
    'snack',
    'snack',
    v_food_almond_butter,
    null,
    1.0,
    'tbsp',
    16,
    100,
    3.5,
    3.5,
    9.0,
    2.0,
    1.5,
    55,
    'demo weekend toast topping'
  from tmp_nutrition_seed_pattern p
  where p.iso_dow = 7;

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
      abs(rollup.kcal_total - rollup.kcal_target) <= (rollup.kcal_target * 0.10)
      and abs(rollup.protein_total - rollup.protein_target) <= (rollup.protein_target * 0.10)
      and abs(rollup.carbs_total - rollup.carbs_target) <= (rollup.carbs_target * 0.10)
      and abs(rollup.fat_total - rollup.fat_target) <= (rollup.fat_target * 0.10)
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
      %s,
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
    v_diary_item_meal_type_expr,
    v_diary_item_meal_slot_expr,
    v_diary_item_food_id_expr
  )
  using v_user_id;

  get diagnostics v_inserted_items = row_count;

  raise notice
    'Nutrition smoke demo ready for user %: % days generated, % existing days matched, % days replaced, % days upserted, % diary items inserted, range % -> %.',
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
