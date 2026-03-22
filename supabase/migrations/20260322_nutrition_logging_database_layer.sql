create schema if not exists nutrition;
create extension if not exists pgcrypto;

create or replace function nutrition.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- A) Canonical public food catalog (new table to avoid legacy public.foods drift)
-- -----------------------------------------------------------------------------
create table if not exists nutrition.food_items (
  id uuid primary key default gen_random_uuid(),
  food_kind text not null default 'ingredient',
  name text not null,
  brand text null,
  barcode text null,
  serving_reference jsonb null,
  calories numeric(10, 2) null,
  protein numeric(10, 2) null,
  carbs numeric(10, 2) null,
  fat numeric(10, 2) null,
  fiber numeric(10, 2) null,
  sodium_mg numeric(10, 2) null,
  ingredients_text text null,
  source text not null default 'manual',
  image_urls text[] not null default '{}',
  created_by uuid null references auth.users(id) on delete set null default auth.uid(),
  is_verified boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table nutrition.food_items
  add column if not exists food_kind text,
  add column if not exists name text,
  add column if not exists brand text,
  add column if not exists barcode text,
  add column if not exists serving_reference jsonb,
  add column if not exists calories numeric(10, 2),
  add column if not exists protein numeric(10, 2),
  add column if not exists carbs numeric(10, 2),
  add column if not exists fat numeric(10, 2),
  add column if not exists fiber numeric(10, 2),
  add column if not exists sodium_mg numeric(10, 2),
  add column if not exists ingredients_text text,
  add column if not exists source text,
  add column if not exists image_urls text[],
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists is_verified boolean,
  add column if not exists created_at timestamptz,
  add column if not exists updated_at timestamptz;

alter table nutrition.food_items
  alter column food_kind set default 'ingredient',
  alter column source set default 'manual',
  alter column image_urls set default '{}',
  alter column is_verified set default false,
  alter column created_at set default timezone('utc', now()),
  alter column updated_at set default timezone('utc', now()),
  alter column created_by set default auth.uid();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'food_items_food_kind_check'
      and conrelid = 'nutrition.food_items'::regclass
  ) then
    alter table nutrition.food_items
      add constraint food_items_food_kind_check
      check (food_kind in ('packaged', 'ingredient')) not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'food_items_source_check'
      and conrelid = 'nutrition.food_items'::regclass
  ) then
    alter table nutrition.food_items
      add constraint food_items_source_check
      check (source in ('manual', 'barcode', 'ocr', 'import', 'user')) not valid;
  end if;
end $$;

create index if not exists food_items_barcode_idx
  on nutrition.food_items (barcode)
  where barcode is not null;

create index if not exists food_items_lower_name_idx
  on nutrition.food_items (lower(name));

create index if not exists food_items_filter_idx
  on nutrition.food_items (food_kind, is_verified, created_at desc);

create index if not exists food_items_created_by_idx
  on nutrition.food_items (created_by);

alter table nutrition.food_items enable row level security;

grant select on table nutrition.food_items to anon, authenticated;
grant insert, update, delete on table nutrition.food_items to authenticated;

drop policy if exists food_items_select_public on nutrition.food_items;
create policy food_items_select_public
on nutrition.food_items
for select
to anon, authenticated
using (true);

drop policy if exists food_items_insert_authenticated on nutrition.food_items;
create policy food_items_insert_authenticated
on nutrition.food_items
for insert
to authenticated
with check (
  (select auth.uid()) is not null
  and coalesce(created_by, (select auth.uid())) = (select auth.uid())
);

drop policy if exists food_items_update_own on nutrition.food_items;
create policy food_items_update_own
on nutrition.food_items
for update
to authenticated
using ((select auth.uid()) = created_by)
with check ((select auth.uid()) = created_by);

drop policy if exists food_items_delete_own on nutrition.food_items;
create policy food_items_delete_own
on nutrition.food_items
for delete
to authenticated
using ((select auth.uid()) = created_by);

drop trigger if exists trg_food_items_touch_updated_at on nutrition.food_items;
create trigger trg_food_items_touch_updated_at
before update on nutrition.food_items
for each row
execute function nutrition.touch_updated_at();

-- -----------------------------------------------------------------------------
-- B) User meals and normalized meal ingredients
-- -----------------------------------------------------------------------------
do $$
begin
  if to_regclass('nutrition.recipes') is null then
    create table nutrition.recipes (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references auth.users(id) on delete cascade,
      name text not null,
      description text null,
      notes text null,
      kcal numeric(10, 2) not null default 0,
      protein numeric(10, 2) not null default 0,
      carbs numeric(10, 2) not null default 0,
      fat numeric(10, 2) not null default 0,
      fiber numeric(10, 2) null,
      sugar numeric(10, 2) null,
      sodium numeric(10, 2) null,
      default_portion_grams numeric(10, 2) null,
      ingredients jsonb null,
      is_private boolean not null default true,
      created_at timestamptz not null default timezone('utc', now()),
      updated_at timestamptz not null default timezone('utc', now())
    );
  else
    alter table nutrition.recipes
      add column if not exists description text,
      add column if not exists notes text,
      add column if not exists fiber numeric(10, 2),
      add column if not exists sugar numeric(10, 2),
      add column if not exists sodium numeric(10, 2),
      add column if not exists created_at timestamptz,
      add column if not exists updated_at timestamptz;
  end if;
end $$;

alter table nutrition.recipes
  alter column created_at set default timezone('utc', now()),
  alter column updated_at set default timezone('utc', now());

create index if not exists recipes_user_updated_idx
  on nutrition.recipes (user_id, updated_at desc);

create index if not exists recipes_user_name_idx
  on nutrition.recipes (user_id, lower(name));

do $$
declare
  v_recipe_id_type text := 'uuid';
  v_food_id_type text := 'uuid';
begin
  if to_regclass('nutrition.recipes') is not null then
    select format_type(a.atttypid, a.atttypmod)
    into v_recipe_id_type
    from pg_attribute a
    where a.attrelid = 'nutrition.recipes'::regclass
      and a.attname = 'id'
      and a.attnum > 0
      and not a.attisdropped;
  end if;

  if to_regclass('nutrition.food_items') is not null then
    select format_type(a.atttypid, a.atttypmod)
    into v_food_id_type
    from pg_attribute a
    where a.attrelid = 'nutrition.food_items'::regclass
      and a.attname = 'id'
      and a.attnum > 0
      and not a.attisdropped;
  end if;

  if to_regclass('nutrition.recipe_ingredients') is null then
    execute format($fmt$
      create table nutrition.recipe_ingredients (
        id uuid primary key default gen_random_uuid(),
        recipe_id %s not null,
        food_id %s not null,
        quantity numeric(10, 3) not null default 1,
        unit text not null default 'serving',
        grams numeric(10, 2) null,
        kcal numeric(10, 2) null,
        protein numeric(10, 2) null,
        carbs numeric(10, 2) null,
        fat numeric(10, 2) null,
        fiber numeric(10, 2) null,
        sodium numeric(10, 2) null,
        position integer not null default 0,
        note text null,
        created_by uuid null references auth.users(id) on delete set null default auth.uid(),
        created_at timestamptz not null default timezone('utc', now()),
        updated_at timestamptz not null default timezone('utc', now())
      )
    $fmt$, v_recipe_id_type, v_food_id_type);
  else
    execute format(
      'alter table nutrition.recipe_ingredients add column if not exists recipe_id %s',
      v_recipe_id_type
    );
    execute format(
      'alter table nutrition.recipe_ingredients add column if not exists food_id %s',
      v_food_id_type
    );
    alter table nutrition.recipe_ingredients
      add column if not exists quantity numeric(10, 3),
      add column if not exists unit text,
      add column if not exists grams numeric(10, 2),
      add column if not exists kcal numeric(10, 2),
      add column if not exists protein numeric(10, 2),
      add column if not exists carbs numeric(10, 2),
      add column if not exists fat numeric(10, 2),
      add column if not exists fiber numeric(10, 2),
      add column if not exists sodium numeric(10, 2),
      add column if not exists position integer,
      add column if not exists note text,
      add column if not exists created_by uuid references auth.users(id) on delete set null,
      add column if not exists created_at timestamptz,
      add column if not exists updated_at timestamptz;
  end if;

  begin
    if not exists (
      select 1
      from pg_constraint
      where conname = 'recipe_ingredients_recipe_id_fkey'
        and conrelid = 'nutrition.recipe_ingredients'::regclass
    ) then
      execute 'alter table nutrition.recipe_ingredients add constraint recipe_ingredients_recipe_id_fkey foreign key (recipe_id) references nutrition.recipes(id) on delete cascade';
    end if;
  exception
    when others then
      raise notice 'Skipping recipe_ingredients -> recipes foreign key: %', sqlerrm;
  end;

  begin
    if not exists (
      select 1
      from pg_constraint
      where conname = 'recipe_ingredients_food_id_fkey'
        and conrelid = 'nutrition.recipe_ingredients'::regclass
    ) then
      execute 'alter table nutrition.recipe_ingredients add constraint recipe_ingredients_food_id_fkey foreign key (food_id) references nutrition.food_items(id) on delete restrict';
    end if;
  exception
    when others then
      raise notice 'Skipping recipe_ingredients -> food_items foreign key: %', sqlerrm;
  end;
end $$;

alter table nutrition.recipe_ingredients
  alter column created_at set default timezone('utc', now()),
  alter column quantity set default 1,
  alter column unit set default 'serving',
  alter column position set default 0,
  alter column updated_at set default timezone('utc', now());

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'recipe_ingredients_recipe_food_position_key'
      and conrelid = 'nutrition.recipe_ingredients'::regclass
  ) then
    alter table nutrition.recipe_ingredients
      add constraint recipe_ingredients_recipe_food_position_key
      unique (recipe_id, food_id, position);
  end if;
end $$;

create index if not exists recipe_ingredients_recipe_idx
  on nutrition.recipe_ingredients (recipe_id, position);

create index if not exists recipe_ingredients_food_idx
  on nutrition.recipe_ingredients (food_id);

create index if not exists recipe_ingredients_creator_idx
  on nutrition.recipe_ingredients (created_by);

alter table nutrition.recipes enable row level security;
alter table nutrition.recipe_ingredients enable row level security;

grant select, insert, update, delete on table nutrition.recipes to authenticated;
grant select, insert, update, delete on table nutrition.recipe_ingredients to authenticated;

drop policy if exists recipes_select_own on nutrition.recipes;
create policy recipes_select_own
on nutrition.recipes
for select
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists recipes_insert_own on nutrition.recipes;
create policy recipes_insert_own
on nutrition.recipes
for insert
to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists recipes_update_own on nutrition.recipes;
create policy recipes_update_own
on nutrition.recipes
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists recipes_delete_own on nutrition.recipes;
create policy recipes_delete_own
on nutrition.recipes
for delete
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists recipe_ingredients_select_own on nutrition.recipe_ingredients;
create policy recipe_ingredients_select_own
on nutrition.recipe_ingredients
for select
to authenticated
using (
  exists (
    select 1
    from nutrition.recipes r
    where r.id = recipe_ingredients.recipe_id
      and r.user_id = (select auth.uid())
  )
);

drop policy if exists recipe_ingredients_insert_own on nutrition.recipe_ingredients;
create policy recipe_ingredients_insert_own
on nutrition.recipe_ingredients
for insert
to authenticated
with check (
  exists (
    select 1
    from nutrition.recipes r
    where r.id = recipe_ingredients.recipe_id
      and r.user_id = (select auth.uid())
  )
);

drop policy if exists recipe_ingredients_update_own on nutrition.recipe_ingredients;
create policy recipe_ingredients_update_own
on nutrition.recipe_ingredients
for update
to authenticated
using (
  exists (
    select 1
    from nutrition.recipes r
    where r.id = recipe_ingredients.recipe_id
      and r.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from nutrition.recipes r
    where r.id = recipe_ingredients.recipe_id
      and r.user_id = (select auth.uid())
  )
);

drop policy if exists recipe_ingredients_delete_own on nutrition.recipe_ingredients;
create policy recipe_ingredients_delete_own
on nutrition.recipe_ingredients
for delete
to authenticated
using (
  exists (
    select 1
    from nutrition.recipes r
    where r.id = recipe_ingredients.recipe_id
      and r.user_id = (select auth.uid())
  )
);

drop trigger if exists trg_recipes_touch_updated_at on nutrition.recipes;
create trigger trg_recipes_touch_updated_at
before update on nutrition.recipes
for each row
execute function nutrition.touch_updated_at();

drop trigger if exists trg_recipe_ingredients_touch_updated_at on nutrition.recipe_ingredients;
create trigger trg_recipe_ingredients_touch_updated_at
before update on nutrition.recipe_ingredients
for each row
execute function nutrition.touch_updated_at();

-- -----------------------------------------------------------------------------
-- C) Diary logging tables (create if absent, adapt if present)
-- -----------------------------------------------------------------------------
do $$
begin
  if to_regclass('nutrition.diary_days') is null then
    create table nutrition.diary_days (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references auth.users(id) on delete cascade,
      date date not null,
      timezone_str text not null default 'UTC',
      kcal_total numeric(10, 2) not null default 0,
      protein_g_total numeric(10, 2) not null default 0,
      carbs_g_total numeric(10, 2) not null default 0,
      fat_g_total numeric(10, 2) not null default 0,
      fiber_g_total numeric(10, 2) not null default 0,
      sodium_mg_total numeric(10, 2) not null default 0,
      kcal_target numeric(10, 2) null,
      protein_g_target numeric(10, 2) null,
      carbs_g_target numeric(10, 2) null,
      fat_g_target numeric(10, 2) null,
      goal_hit boolean not null default false,
      created_at timestamptz not null default timezone('utc', now()),
      updated_at timestamptz not null default timezone('utc', now()),
      unique (user_id, date)
    );
  else
    alter table nutrition.diary_days
      add column if not exists fiber_g_total numeric(10, 2),
      add column if not exists sodium_mg_total numeric(10, 2),
      add column if not exists created_at timestamptz,
      add column if not exists updated_at timestamptz;
  end if;
end $$;

alter table nutrition.diary_days
  alter column fiber_g_total set default 0,
  alter column sodium_mg_total set default 0,
  alter column created_at set default timezone('utc', now()),
  alter column updated_at set default timezone('utc', now());

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'diary_days_user_date_key'
      and conrelid = 'nutrition.diary_days'::regclass
  ) then
    alter table nutrition.diary_days
      add constraint diary_days_user_date_key
      unique (user_id, date);
  end if;
end $$;

create index if not exists diary_days_user_date_idx
  on nutrition.diary_days (user_id, date desc);

do $$
declare
  v_diary_day_id_type text := 'uuid';
  v_food_id_type text := 'uuid';
  v_recipe_id_type text := 'uuid';
begin
  if to_regclass('nutrition.diary_days') is not null then
    select format_type(a.atttypid, a.atttypmod)
    into v_diary_day_id_type
    from pg_attribute a
    where a.attrelid = 'nutrition.diary_days'::regclass
      and a.attname = 'id'
      and a.attnum > 0
      and not a.attisdropped;
  end if;

  if to_regclass('nutrition.food_items') is not null then
    select format_type(a.atttypid, a.atttypmod)
    into v_food_id_type
    from pg_attribute a
    where a.attrelid = 'nutrition.food_items'::regclass
      and a.attname = 'id'
      and a.attnum > 0
      and not a.attisdropped;
  end if;

  if to_regclass('nutrition.recipes') is not null then
    select format_type(a.atttypid, a.atttypmod)
    into v_recipe_id_type
    from pg_attribute a
    where a.attrelid = 'nutrition.recipes'::regclass
      and a.attname = 'id'
      and a.attnum > 0
      and not a.attisdropped;
  end if;

  if to_regclass('nutrition.diary_items') is null then
    execute format($fmt$
      create table nutrition.diary_items (
        id uuid primary key default gen_random_uuid(),
        user_id uuid not null references auth.users(id) on delete cascade,
        diary_day_id %s not null,
        meal_type text not null default 'custom',
        meal_slot text not null default 'custom',
        food_id %s null,
        recipe_id %s null,
        quantity numeric(10, 3) not null default 1,
        unit_label text not null default 'serving',
        consumed_at timestamptz not null default timezone('utc', now()),
        grams numeric(10, 2) null,
        kcal numeric(10, 2) not null default 0,
        protein numeric(10, 2) not null default 0,
        carbs numeric(10, 2) not null default 0,
        fat numeric(10, 2) not null default 0,
        fiber numeric(10, 2) null,
        sugar numeric(10, 2) null,
        sodium numeric(10, 2) null,
        note text null,
        created_at timestamptz not null default timezone('utc', now()),
        updated_at timestamptz not null default timezone('utc', now())
      )
    $fmt$, v_diary_day_id_type, v_food_id_type, v_recipe_id_type);
  else
    alter table nutrition.diary_items
      add column if not exists meal_slot text,
      add column if not exists consumed_at timestamptz,
      add column if not exists created_at timestamptz,
      add column if not exists updated_at timestamptz;
  end if;

  begin
    if not exists (
      select 1
      from pg_constraint
      where conname = 'diary_items_diary_day_id_fkey'
        and conrelid = 'nutrition.diary_items'::regclass
    ) then
      execute 'alter table nutrition.diary_items add constraint diary_items_diary_day_id_fkey foreign key (diary_day_id) references nutrition.diary_days(id) on delete cascade';
    end if;
  exception
    when others then
      raise notice 'Skipping diary_items -> diary_days foreign key: %', sqlerrm;
  end;

  begin
    if not exists (
      select 1
      from pg_constraint
      where conname = 'diary_items_food_id_fkey'
        and conrelid = 'nutrition.diary_items'::regclass
    ) then
      execute 'alter table nutrition.diary_items add constraint diary_items_food_id_fkey foreign key (food_id) references nutrition.food_items(id) on delete set null';
    end if;
  exception
    when others then
      raise notice 'Skipping diary_items -> food_items foreign key: %', sqlerrm;
  end;

  begin
    if not exists (
      select 1
      from pg_constraint
      where conname = 'diary_items_recipe_id_fkey'
        and conrelid = 'nutrition.diary_items'::regclass
    ) then
      execute 'alter table nutrition.diary_items add constraint diary_items_recipe_id_fkey foreign key (recipe_id) references nutrition.recipes(id) on delete set null';
    end if;
  exception
    when others then
      raise notice 'Skipping diary_items -> recipes foreign key: %', sqlerrm;
  end;
end $$;

alter table nutrition.diary_items
  alter column created_at set default timezone('utc', now()),
  alter column meal_slot set default 'custom',
  alter column consumed_at set default timezone('utc', now()),
  alter column updated_at set default timezone('utc', now());

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'diary_items_meal_slot_check'
      and conrelid = 'nutrition.diary_items'::regclass
  ) then
    alter table nutrition.diary_items
      add constraint diary_items_meal_slot_check
      check (
        meal_slot in (
          'breakfast',
          'lunch',
          'dinner',
          'snack',
          'pre-workout',
          'post-workout',
          'custom'
        )
      ) not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'diary_items_food_or_recipe_check'
      and conrelid = 'nutrition.diary_items'::regclass
  ) then
    alter table nutrition.diary_items
      add constraint diary_items_food_or_recipe_check
      check (
        (food_id is not null and recipe_id is null)
        or (food_id is null and recipe_id is not null)
      ) not valid;
  end if;
end $$;

create index if not exists diary_items_user_consumed_idx
  on nutrition.diary_items (user_id, consumed_at desc);

create index if not exists diary_items_day_slot_idx
  on nutrition.diary_items (diary_day_id, meal_slot);

create index if not exists diary_items_food_idx
  on nutrition.diary_items (food_id);

create index if not exists diary_items_recipe_idx
  on nutrition.diary_items (recipe_id);

alter table nutrition.diary_days enable row level security;
alter table nutrition.diary_items enable row level security;

grant select, insert, update, delete on table nutrition.diary_days to authenticated;
grant select, insert, update, delete on table nutrition.diary_items to authenticated;

drop policy if exists diary_days_select_own on nutrition.diary_days;
create policy diary_days_select_own
on nutrition.diary_days
for select
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists diary_days_insert_own on nutrition.diary_days;
create policy diary_days_insert_own
on nutrition.diary_days
for insert
to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists diary_days_update_own on nutrition.diary_days;
create policy diary_days_update_own
on nutrition.diary_days
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists diary_days_delete_own on nutrition.diary_days;
create policy diary_days_delete_own
on nutrition.diary_days
for delete
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists diary_items_select_own on nutrition.diary_items;
create policy diary_items_select_own
on nutrition.diary_items
for select
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists diary_items_insert_own on nutrition.diary_items;
create policy diary_items_insert_own
on nutrition.diary_items
for insert
to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists diary_items_update_own on nutrition.diary_items;
create policy diary_items_update_own
on nutrition.diary_items
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists diary_items_delete_own on nutrition.diary_items;
create policy diary_items_delete_own
on nutrition.diary_items
for delete
to authenticated
using (user_id = (select auth.uid()));

drop trigger if exists trg_diary_days_touch_updated_at on nutrition.diary_days;
create trigger trg_diary_days_touch_updated_at
before update on nutrition.diary_days
for each row
execute function nutrition.touch_updated_at();

drop trigger if exists trg_diary_items_touch_updated_at on nutrition.diary_items;
create trigger trg_diary_items_touch_updated_at
before update on nutrition.diary_items
for each row
execute function nutrition.touch_updated_at();

-- -----------------------------------------------------------------------------
-- D) Barcode fallback submissions when no canonical match exists
-- -----------------------------------------------------------------------------
do $$
declare
  v_food_id_type text := 'uuid';
begin
  if to_regclass('nutrition.food_items') is not null then
    select format_type(a.atttypid, a.atttypmod)
    into v_food_id_type
    from pg_attribute a
    where a.attrelid = 'nutrition.food_items'::regclass
      and a.attname = 'id'
      and a.attnum > 0
      and not a.attisdropped;
  end if;

  if to_regclass('nutrition.food_submissions') is null then
    execute format($fmt$
      create table nutrition.food_submissions (
        id uuid primary key default gen_random_uuid(),
        created_by uuid not null references auth.users(id) on delete cascade,
        barcode text null,
        barcode_normalized text null,
        label_image_urls text[] not null default '{}',
        ocr_raw_text text null,
        ocr_payload jsonb null,
        confirmation_status text not null default 'pending',
        canonical_food_id %s null,
        notes text null,
        reviewed_by uuid null references auth.users(id) on delete set null,
        reviewed_at timestamptz null,
        created_at timestamptz not null default timezone('utc', now()),
        updated_at timestamptz not null default timezone('utc', now())
      )
    $fmt$, v_food_id_type);
  else
    alter table nutrition.food_submissions
      add column if not exists barcode_normalized text,
      add column if not exists label_image_urls text[],
      add column if not exists ocr_raw_text text,
      add column if not exists ocr_payload jsonb,
      add column if not exists confirmation_status text,
      add column if not exists notes text,
      add column if not exists reviewed_by uuid references auth.users(id) on delete set null,
      add column if not exists reviewed_at timestamptz,
      add column if not exists created_at timestamptz,
      add column if not exists updated_at timestamptz;
    execute format(
      'alter table nutrition.food_submissions add column if not exists canonical_food_id %s',
      v_food_id_type
    );
  end if;

  begin
    if not exists (
      select 1
      from pg_constraint
      where conname = 'food_submissions_canonical_food_id_fkey'
        and conrelid = 'nutrition.food_submissions'::regclass
    ) then
      execute 'alter table nutrition.food_submissions add constraint food_submissions_canonical_food_id_fkey foreign key (canonical_food_id) references nutrition.food_items(id) on delete set null';
    end if;
  exception
    when others then
      raise notice 'Skipping food_submissions -> food_items foreign key: %', sqlerrm;
  end;
end $$;

alter table nutrition.food_submissions
  alter column created_at set default timezone('utc', now()),
  alter column label_image_urls set default '{}',
  alter column confirmation_status set default 'pending',
  alter column updated_at set default timezone('utc', now());

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'food_submissions_confirmation_status_check'
      and conrelid = 'nutrition.food_submissions'::regclass
  ) then
    alter table nutrition.food_submissions
      add constraint food_submissions_confirmation_status_check
      check (
        confirmation_status in (
          'pending',
          'confirmed',
          'approved',
          'rejected',
          'needs_review'
        )
      ) not valid;
  end if;
end $$;

create index if not exists food_submissions_barcode_norm_idx
  on nutrition.food_submissions (barcode_normalized)
  where barcode_normalized is not null;

create index if not exists food_submissions_status_created_idx
  on nutrition.food_submissions (confirmation_status, created_at desc);

create index if not exists food_submissions_user_created_idx
  on nutrition.food_submissions (created_by, created_at desc);

create index if not exists food_submissions_food_idx
  on nutrition.food_submissions (canonical_food_id);

alter table nutrition.food_submissions enable row level security;

grant select, insert, update, delete on table nutrition.food_submissions to authenticated;

drop policy if exists food_submissions_select_own on nutrition.food_submissions;
create policy food_submissions_select_own
on nutrition.food_submissions
for select
to authenticated
using (created_by = (select auth.uid()));

drop policy if exists food_submissions_insert_own on nutrition.food_submissions;
create policy food_submissions_insert_own
on nutrition.food_submissions
for insert
to authenticated
with check (created_by = (select auth.uid()));

drop policy if exists food_submissions_update_own on nutrition.food_submissions;
create policy food_submissions_update_own
on nutrition.food_submissions
for update
to authenticated
using (created_by = (select auth.uid()))
with check (created_by = (select auth.uid()));

drop policy if exists food_submissions_delete_own on nutrition.food_submissions;
create policy food_submissions_delete_own
on nutrition.food_submissions
for delete
to authenticated
using (created_by = (select auth.uid()));

drop trigger if exists trg_food_submissions_touch_updated_at on nutrition.food_submissions;
create trigger trg_food_submissions_touch_updated_at
before update on nutrition.food_submissions
for each row
execute function nutrition.touch_updated_at();

-- Keep schema change log in sync when available.
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
      '20260322_nutrition_logging_database_layer',
      'Added nutrition.food_items public catalog, recipe ingredients, diary logging fields, and barcode fallback submissions with RLS and indexes.'
    )
    on conflict (change_key) do nothing;
  end if;
end $$;
