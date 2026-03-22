create schema if not exists nutrition;
create extension if not exists pg_trgm;

create or replace function nutrition.normalize_barcode(p_value text)
returns text
language sql
immutable
as $$
  select nullif(regexp_replace(coalesce(p_value, ''), '\D', '', 'g'), '');
$$;

create or replace function nutrition.normalize_food_name(p_value text)
returns text
language sql
immutable
as $$
  select nullif(
    btrim(
      regexp_replace(
        lower(regexp_replace(coalesce(p_value, ''), '[^[:alnum:]]+', ' ', 'g')),
        '\s+',
        ' ',
        'g'
      )
    ),
    ''
  );
$$;

alter table nutrition.food_items
  add column if not exists verification_status text,
  add column if not exists barcode_normalized text,
  add column if not exists normalized_name text,
  add column if not exists search_vector tsvector;

update nutrition.food_items
set verification_status = case
  when coalesce(is_verified, false) then 'verified'
  else 'user_confirmed'
end
where verification_status is null;

update nutrition.food_items
set
  barcode_normalized = nutrition.normalize_barcode(barcode),
  normalized_name = nutrition.normalize_food_name(concat_ws(' ', coalesce(name, ''), coalesce(brand, ''))),
  search_vector =
    setweight(to_tsvector('simple', coalesce(nutrition.normalize_food_name(name), '')), 'A')
    || setweight(to_tsvector('simple', coalesce(nutrition.normalize_food_name(brand), '')), 'B')
    || setweight(to_tsvector('simple', coalesce(nutrition.normalize_food_name(ingredients_text), '')), 'C')
where
  barcode_normalized is null
  or normalized_name is null
  or search_vector is null;

alter table nutrition.food_items
  alter column verification_status set default 'pending';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'food_items_verification_status_check'
      and conrelid = 'nutrition.food_items'::regclass
  ) then
    alter table nutrition.food_items
      add constraint food_items_verification_status_check
      check (
        verification_status in ('pending', 'user_confirmed', 'verified', 'rejected')
      ) not valid;
  end if;
end $$;

alter table nutrition.food_items
  alter column verification_status set not null;

create or replace function nutrition.food_items_sync_verification_flags()
returns trigger
language plpgsql
as $$
begin
  if new.verification_status is null then
    new.verification_status := case
      when coalesce(new.is_verified, false) then 'verified'
      else 'pending'
    end;
  end if;

  if coalesce(new.is_verified, false) and new.verification_status <> 'verified' then
    new.verification_status := 'verified';
  end if;

  new.is_verified := (new.verification_status = 'verified');
  return new;
end;
$$;

drop trigger if exists trg_food_items_sync_verification_flags on nutrition.food_items;
create trigger trg_food_items_sync_verification_flags
before insert or update of verification_status, is_verified
on nutrition.food_items
for each row
execute function nutrition.food_items_sync_verification_flags();

create index if not exists food_items_public_verification_idx
  on nutrition.food_items (verification_status, updated_at desc)
  where verification_status in ('user_confirmed', 'verified');

drop policy if exists food_items_select_public on nutrition.food_items;
create policy food_items_select_public
on nutrition.food_items
for select
to anon, authenticated
using (
  verification_status in ('user_confirmed', 'verified')
  or (created_by = (select auth.uid()))
);

create or replace function nutrition.search_food_items(
  p_query text,
  p_limit integer default 25
)
returns setof nutrition.food_items
language sql
stable
security invoker
set search_path = nutrition, public
as $$
  with input as (
    select
      nullif(btrim(coalesce(p_query, '')), '') as raw_query,
      nutrition.normalize_barcode(p_query) as barcode_query,
      nutrition.normalize_food_name(p_query) as name_query,
      case
        when nutrition.normalize_food_name(p_query) is null then null::tsquery
        else websearch_to_tsquery('simple', nutrition.normalize_food_name(p_query))
      end as ts_query,
      greatest(1, least(coalesce(p_limit, 25), 100)) as lim
  ),
  ranked as (
    select
      f as food_item,
      case
        when i.barcode_query is not null and f.barcode_normalized = i.barcode_query then 1
        else 0
      end as barcode_rank,
      case
        when i.name_query is null then 0
        when f.normalized_name = i.name_query then 1.0
        when f.normalized_name like i.name_query || '%' then 0.8
        else 0
      end as exact_rank,
      case
        when i.name_query is null then 0
        else similarity(f.normalized_name, i.name_query)
      end as trigram_rank,
      case
        when i.ts_query is null then 0
        else ts_rank_cd(f.search_vector, i.ts_query)
      end as fts_rank
    from nutrition.food_items f
    cross join input i
    where
      i.raw_query is not null
      and f.verification_status in ('user_confirmed', 'verified')
      and (
        (i.barcode_query is not null and f.barcode_normalized = i.barcode_query)
        or (
          i.name_query is not null
          and (
            (i.ts_query is not null and f.search_vector @@ i.ts_query)
            or f.normalized_name % i.name_query
            or f.normalized_name like i.name_query || '%'
          )
        )
      )
  )
  select (r.food_item).*
  from ranked r
  order by
    r.barcode_rank desc,
    r.exact_rank desc,
    greatest(r.fts_rank, r.trigram_rank) desc,
    (r.food_item).name asc
  limit (select lim from input);
$$;

grant execute on function nutrition.search_food_items(text, integer) to anon, authenticated;

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
      '20260322_nutrition_food_verification_status',
      'Added food_items.verification_status lifecycle, synced legacy is_verified compatibility, and filtered public food search to user_confirmed/verified rows.'
    )
    on conflict (change_key) do nothing;
  end if;
end $$;
