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
  add column if not exists barcode_normalized text,
  add column if not exists normalized_name text,
  add column if not exists search_vector tsvector;

create or replace function nutrition.food_items_set_search_fields()
returns trigger
language plpgsql
as $$
begin
  new.barcode_normalized := nutrition.normalize_barcode(new.barcode);
  new.normalized_name := nutrition.normalize_food_name(
    concat_ws(' ', coalesce(new.name, ''), coalesce(new.brand, ''))
  );
  new.search_vector :=
    setweight(to_tsvector('simple', coalesce(nutrition.normalize_food_name(new.name), '')), 'A')
    || setweight(to_tsvector('simple', coalesce(nutrition.normalize_food_name(new.brand), '')), 'B')
    || setweight(to_tsvector('simple', coalesce(nutrition.normalize_food_name(new.ingredients_text), '')), 'C');
  return new;
end;
$$;

update nutrition.food_items
set
  barcode_normalized = nutrition.normalize_barcode(barcode),
  normalized_name = nutrition.normalize_food_name(concat_ws(' ', coalesce(name, ''), coalesce(brand, ''))),
  search_vector =
    setweight(to_tsvector('simple', coalesce(nutrition.normalize_food_name(name), '')), 'A')
    || setweight(to_tsvector('simple', coalesce(nutrition.normalize_food_name(brand), '')), 'B')
    || setweight(to_tsvector('simple', coalesce(nutrition.normalize_food_name(ingredients_text), '')), 'C')
where
  barcode_normalized is distinct from nutrition.normalize_barcode(barcode)
  or normalized_name is distinct from nutrition.normalize_food_name(concat_ws(' ', coalesce(name, ''), coalesce(brand, '')))
  or search_vector is null;

drop trigger if exists trg_food_items_set_search_fields on nutrition.food_items;
create trigger trg_food_items_set_search_fields
before insert or update of name, brand, barcode, ingredients_text
on nutrition.food_items
for each row
execute function nutrition.food_items_set_search_fields();

do $$
begin
  if exists (
    select 1
    from nutrition.food_items
    where barcode_normalized is not null
    group by barcode_normalized
    having count(*) > 1
  ) then
    execute 'create index if not exists food_items_barcode_normalized_idx on nutrition.food_items (barcode_normalized) where barcode_normalized is not null';
  else
    execute 'create unique index if not exists food_items_barcode_normalized_uidx on nutrition.food_items (barcode_normalized) where barcode_normalized is not null';
  end if;
end $$;

create index if not exists food_items_normalized_name_trgm_idx
  on nutrition.food_items
  using gin (normalized_name gin_trgm_ops);

create index if not exists food_items_search_vector_idx
  on nutrition.food_items
  using gin (search_vector);

create index if not exists food_items_normalized_name_prefix_idx
  on nutrition.food_items (normalized_name text_pattern_ops);

create or replace function nutrition.search_food_items(
  p_query text,y
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
    (r.food_item).is_verified desc,
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
      '20260322_nutrition_food_search_performance',
      'Added normalized barcode/name search fields, trigram and FTS indexes, and ranked nutrition.search_food_items RPC for fast typo-tolerant food discovery.'
    )
    on conflict (change_key) do nothing;
  end if;
end $$;
