create schema if not exists nutrition;
create extension if not exists pgcrypto;

do $$
declare
  v_food_id_type text := 'uuid';
  v_recipe_id_type text := 'uuid';
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

  if to_regclass('nutrition.recipes') is not null then
    select format_type(a.atttypid, a.atttypmod)
    into v_recipe_id_type
    from pg_attribute a
    where a.attrelid = 'nutrition.recipes'::regclass
      and a.attname = 'id'
      and a.attnum > 0
      and not a.attisdropped;
  end if;

  if to_regclass('nutrition.user_favorite_foods') is null then
    execute format($fmt$
      create table nutrition.user_favorite_foods (
        id uuid primary key default gen_random_uuid(),
        user_id uuid not null references auth.users(id) on delete cascade,
        food_id %s not null,
        created_at timestamptz not null default timezone('utc', now())
      )
    $fmt$, v_food_id_type);
  else
    alter table nutrition.user_favorite_foods
      add column if not exists user_id uuid references auth.users(id) on delete cascade,
      add column if not exists created_at timestamptz;
    execute format(
      'alter table nutrition.user_favorite_foods add column if not exists food_id %s',
      v_food_id_type
    );
  end if;

  if to_regclass('nutrition.user_favorite_meals') is null then
    execute format($fmt$
      create table nutrition.user_favorite_meals (
        id uuid primary key default gen_random_uuid(),
        user_id uuid not null references auth.users(id) on delete cascade,
        meal_id %s not null,
        created_at timestamptz not null default timezone('utc', now())
      )
    $fmt$, v_recipe_id_type);
  else
    alter table nutrition.user_favorite_meals
      add column if not exists user_id uuid references auth.users(id) on delete cascade,
      add column if not exists created_at timestamptz;
    execute format(
      'alter table nutrition.user_favorite_meals add column if not exists meal_id %s',
      v_recipe_id_type
    );
  end if;

  begin
    if not exists (
      select 1
      from pg_constraint
      where conname = 'user_favorite_foods_food_id_fkey'
        and conrelid = 'nutrition.user_favorite_foods'::regclass
    ) then
      execute 'alter table nutrition.user_favorite_foods add constraint user_favorite_foods_food_id_fkey foreign key (food_id) references nutrition.food_items(id) on delete cascade';
    end if;
  exception
    when others then
      raise notice 'Skipping user_favorite_foods -> food_items foreign key: %', sqlerrm;
  end;

  begin
    if not exists (
      select 1
      from pg_constraint
      where conname = 'user_favorite_meals_meal_id_fkey'
        and conrelid = 'nutrition.user_favorite_meals'::regclass
    ) then
      execute 'alter table nutrition.user_favorite_meals add constraint user_favorite_meals_meal_id_fkey foreign key (meal_id) references nutrition.recipes(id) on delete cascade';
    end if;
  exception
    when others then
      raise notice 'Skipping user_favorite_meals -> recipes foreign key: %', sqlerrm;
  end;
end $$;

alter table nutrition.user_favorite_foods
  alter column created_at set default timezone('utc', now());

alter table nutrition.user_favorite_meals
  alter column created_at set default timezone('utc', now());

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_favorite_foods_user_food_key'
      and conrelid = 'nutrition.user_favorite_foods'::regclass
  ) then
    alter table nutrition.user_favorite_foods
      add constraint user_favorite_foods_user_food_key
      unique (user_id, food_id);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_favorite_meals_user_meal_key'
      and conrelid = 'nutrition.user_favorite_meals'::regclass
  ) then
    alter table nutrition.user_favorite_meals
      add constraint user_favorite_meals_user_meal_key
      unique (user_id, meal_id);
  end if;
end $$;

create index if not exists user_favorite_foods_user_created_idx
  on nutrition.user_favorite_foods (user_id, created_at desc);

create index if not exists user_favorite_foods_food_idx
  on nutrition.user_favorite_foods (food_id);

create index if not exists user_favorite_meals_user_created_idx
  on nutrition.user_favorite_meals (user_id, created_at desc);

create index if not exists user_favorite_meals_meal_idx
  on nutrition.user_favorite_meals (meal_id);

create index if not exists diary_items_recent_food_lookup_idx
  on nutrition.diary_items (user_id, consumed_at desc, created_at desc, food_id)
  where food_id is not null;

create index if not exists diary_items_recent_recipe_lookup_idx
  on nutrition.diary_items (user_id, consumed_at desc, created_at desc, recipe_id)
  where recipe_id is not null;

create index if not exists diary_items_day_slot_consumed_idx
  on nutrition.diary_items (diary_day_id, meal_slot, consumed_at);

alter table nutrition.user_favorite_foods enable row level security;
alter table nutrition.user_favorite_meals enable row level security;

grant select, insert, delete on table nutrition.user_favorite_foods to authenticated;
grant select, insert, delete on table nutrition.user_favorite_meals to authenticated;

drop policy if exists user_favorite_foods_select_own on nutrition.user_favorite_foods;
create policy user_favorite_foods_select_own
on nutrition.user_favorite_foods
for select
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists user_favorite_foods_insert_own on nutrition.user_favorite_foods;
create policy user_favorite_foods_insert_own
on nutrition.user_favorite_foods
for insert
to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists user_favorite_foods_delete_own on nutrition.user_favorite_foods;
create policy user_favorite_foods_delete_own
on nutrition.user_favorite_foods
for delete
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists user_favorite_meals_select_own on nutrition.user_favorite_meals;
create policy user_favorite_meals_select_own
on nutrition.user_favorite_meals
for select
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists user_favorite_meals_insert_own on nutrition.user_favorite_meals;
create policy user_favorite_meals_insert_own
on nutrition.user_favorite_meals
for insert
to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists user_favorite_meals_delete_own on nutrition.user_favorite_meals;
create policy user_favorite_meals_delete_own
on nutrition.user_favorite_meals
for delete
to authenticated
using (user_id = (select auth.uid()));

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
      '20260322_nutrition_favorites_and_recency',
      'Added user favorite foods/meals tables with ownership RLS and indexes; added diary recency indexes for recent foods/meals and meal-slot copy workflows.'
    )
    on conflict (change_key) do nothing;
  end if;
end $$;
