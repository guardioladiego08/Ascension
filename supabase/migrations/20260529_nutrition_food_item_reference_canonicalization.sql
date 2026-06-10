begin;

create schema if not exists nutrition;

create or replace function nutrition.try_parse_uuid(p_value text)
returns uuid
language plpgsql
immutable
as $$
declare
  v_uuid uuid;
begin
  if p_value is null or btrim(p_value) = '' then
    return null;
  end if;

  begin
    v_uuid := btrim(p_value)::uuid;
  exception
    when others then
      return null;
  end;

  return v_uuid;
end;
$$;

create or replace function nutrition.try_parse_numeric(p_value text)
returns numeric
language plpgsql
immutable
as $$
declare
  v_clean text;
begin
  if p_value is null or btrim(p_value) = '' then
    return null;
  end if;

  v_clean := nullif(regexp_replace(p_value, '[^0-9.\-]+', '', 'g'), '');
  if v_clean is null then
    return null;
  end if;

  begin
    return v_clean::numeric;
  exception
    when others then
      return null;
  end;
end;
$$;

create or replace function nutrition.pick_existing_column(
  p_table_schema text,
  p_table_name text,
  p_candidates text[]
)
returns text
language sql
stable
as $$
  select c.column_name
  from information_schema.columns c
  where c.table_schema = p_table_schema
    and c.table_name = p_table_name
    and c.column_name = any (p_candidates)
  order by array_position(p_candidates, c.column_name)
  limit 1;
$$;

create or replace function nutrition.build_serving_reference_from_legacy(
  p_serving_label text,
  p_serving_qty numeric,
  p_serving_unit text,
  p_serving_grams numeric
)
returns jsonb
language plpgsql
immutable
as $$
declare
  v_common_label text := nullif(btrim(coalesce(p_serving_unit, p_serving_label, '')), '');
  v_common_qty numeric := case
    when p_serving_qty is not null and p_serving_qty > 0 then p_serving_qty
    else 1
  end;
begin
  if v_common_label is null and (p_serving_grams is null or p_serving_grams <= 0) then
    return null;
  end if;

  return jsonb_strip_nulls(
    jsonb_build_object(
      'common',
      case
        when v_common_label is null then null
        else jsonb_build_object('label', v_common_label, 'quantity', v_common_qty)
      end,
      'metric',
      case
        when p_serving_grams is null or p_serving_grams <= 0 then null
        else jsonb_build_object('label', 'g', 'quantity', p_serving_grams)
      end
    )
  );
end;
$$;

do $$
declare
  v_source record;
  v_target_schema text;
  v_target_table text;
  v_id_column text := 'id';
  v_name_column text;
  v_brand_column text;
  v_barcode_column text;
  v_ean_column text;
  v_food_kind_column text;
  v_serving_label_column text;
  v_serving_qty_column text;
  v_serving_unit_column text;
  v_serving_grams_column text;
  v_calories_column text;
  v_protein_column text;
  v_carbs_column text;
  v_fat_column text;
  v_fiber_column text;
  v_sodium_column text;
  v_ingredients_column text;
  v_created_by_column text;
  v_user_id_column text;
  v_is_verified_column text;
  v_verification_status_column text;
  v_created_at_column text;
  v_updated_at_column text;
  v_name_expr text;
  v_brand_expr text;
  v_barcode_expr text;
  v_food_kind_expr text;
  v_serving_label_expr text;
  v_serving_qty_expr text;
  v_serving_unit_expr text;
  v_serving_grams_expr text;
  v_calories_expr text;
  v_protein_expr text;
  v_carbs_expr text;
  v_fat_expr text;
  v_fiber_expr text;
  v_sodium_expr text;
  v_ingredients_expr text;
  v_created_by_expr text;
  v_is_verified_expr text;
  v_verification_status_expr text;
  v_created_at_expr text;
  v_updated_at_expr text;
  v_sql text;
  v_legacy_row record;
  v_resolved_food_id uuid;
  v_has_unmapped boolean;
begin
  create temporary table tmp_nutrition_food_id_map (
    source_table text not null,
    legacy_id text not null,
    canonical_food_id uuid not null,
    primary key (source_table, legacy_id)
  ) on commit drop;

  for v_source in
    select *
    from (
      values
        ('recipe_ingredients', 'food_id'),
        ('diary_items', 'food_id'),
        ('user_favorite_foods', 'food_id'),
        ('food_submissions', 'canonical_food_id')
    ) as source_tables(source_table, source_column)
  loop
    if to_regclass(format('nutrition.%I', v_source.source_table)) is null then
      continue;
    end if;

    select
      target_ns.nspname,
      target_rel.relname
    into v_target_schema, v_target_table
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
     and source_attr.attnum = any (con.conkey)
    where con.contype = 'f'
      and source_ns.nspname = 'nutrition'
      and source_rel.relname = v_source.source_table
      and source_attr.attname = v_source.source_column
    order by con.oid desc
    limit 1;

    v_target_schema := coalesce(v_target_schema, 'nutrition');
    v_target_table := coalesce(v_target_table, 'food_items');

    execute format(
      'insert into tmp_nutrition_food_id_map (source_table, legacy_id, canonical_food_id)
       select %L, t.%I::text, nutrition.try_parse_uuid(t.%I::text)
       from nutrition.%I t
       where t.%I is not null
         and nutrition.try_parse_uuid(t.%I::text) is not null
         and exists (
           select 1
           from nutrition.food_items fi
           where fi.id = nutrition.try_parse_uuid(t.%I::text)
         )
       on conflict (source_table, legacy_id) do nothing',
      v_source.source_table,
      v_source.source_column,
      v_source.source_column,
      v_source.source_table,
      v_source.source_column,
      v_source.source_column,
      v_source.source_column
    );

    if v_target_schema = 'nutrition' and v_target_table = 'food_items' then
      continue;
    end if;

    if to_regclass(format('%I.%I', v_target_schema, v_target_table)) is null then
      continue;
    end if;

    v_name_column := nutrition.pick_existing_column(v_target_schema, v_target_table, array['name', 'food_name', 'product_name', 'title']);
    v_brand_column := nutrition.pick_existing_column(v_target_schema, v_target_table, array['brand', 'brand_name']);
    v_barcode_column := nutrition.pick_existing_column(v_target_schema, v_target_table, array['barcode']);
    v_ean_column := nutrition.pick_existing_column(v_target_schema, v_target_table, array['ean_13']);
    v_food_kind_column := nutrition.pick_existing_column(v_target_schema, v_target_table, array['food_kind']);
    v_serving_label_column := nutrition.pick_existing_column(v_target_schema, v_target_table, array['serving_size', 'serving_label', 'serving_description']);
    v_serving_qty_column := nutrition.pick_existing_column(v_target_schema, v_target_table, array['serving_qty', 'serving_amount']);
    v_serving_unit_column := nutrition.pick_existing_column(v_target_schema, v_target_table, array['serving_unit', 'unit']);
    v_serving_grams_column := nutrition.pick_existing_column(v_target_schema, v_target_table, array['serving_grams', 'grams_per_serving']);
    v_calories_column := nutrition.pick_existing_column(v_target_schema, v_target_table, array['calories', 'kcal']);
    v_protein_column := nutrition.pick_existing_column(v_target_schema, v_target_table, array['protein']);
    v_carbs_column := nutrition.pick_existing_column(v_target_schema, v_target_table, array['carbs']);
    v_fat_column := nutrition.pick_existing_column(v_target_schema, v_target_table, array['fat', 'fats']);
    v_fiber_column := nutrition.pick_existing_column(v_target_schema, v_target_table, array['fiber']);
    v_sodium_column := nutrition.pick_existing_column(v_target_schema, v_target_table, array['sodium_mg', 'sodium']);
    v_ingredients_column := nutrition.pick_existing_column(v_target_schema, v_target_table, array['ingredients_text', 'description']);
    v_created_by_column := nutrition.pick_existing_column(v_target_schema, v_target_table, array['created_by']);
    v_user_id_column := nutrition.pick_existing_column(v_target_schema, v_target_table, array['user_id']);
    v_is_verified_column := nutrition.pick_existing_column(v_target_schema, v_target_table, array['is_verified']);
    v_verification_status_column := nutrition.pick_existing_column(v_target_schema, v_target_table, array['verification_status']);
    v_created_at_column := nutrition.pick_existing_column(v_target_schema, v_target_table, array['created_at']);
    v_updated_at_column := nutrition.pick_existing_column(v_target_schema, v_target_table, array['updated_at']);

    v_name_expr := case when v_name_column is null then 'null::text' else format('src.%I::text', v_name_column) end;
    v_brand_expr := case when v_brand_column is null then 'null::text' else format('src.%I::text', v_brand_column) end;
    v_barcode_expr := case
      when v_barcode_column is not null and v_ean_column is not null then format('coalesce(src.%I::text, src.%I::text)', v_barcode_column, v_ean_column)
      when v_barcode_column is not null then format('src.%I::text', v_barcode_column)
      when v_ean_column is not null then format('src.%I::text', v_ean_column)
      else 'null::text'
    end;
    v_food_kind_expr := case when v_food_kind_column is null then 'null::text' else format('src.%I::text', v_food_kind_column) end;
    v_serving_label_expr := case when v_serving_label_column is null then 'null::text' else format('src.%I::text', v_serving_label_column) end;
    v_serving_qty_expr := case when v_serving_qty_column is null then 'null::numeric' else format('nutrition.try_parse_numeric(src.%I::text)', v_serving_qty_column) end;
    v_serving_unit_expr := case when v_serving_unit_column is null then 'null::text' else format('src.%I::text', v_serving_unit_column) end;
    v_serving_grams_expr := case when v_serving_grams_column is null then 'null::numeric' else format('nutrition.try_parse_numeric(src.%I::text)', v_serving_grams_column) end;
    v_calories_expr := case when v_calories_column is null then 'null::numeric' else format('nutrition.try_parse_numeric(src.%I::text)', v_calories_column) end;
    v_protein_expr := case when v_protein_column is null then 'null::numeric' else format('nutrition.try_parse_numeric(src.%I::text)', v_protein_column) end;
    v_carbs_expr := case when v_carbs_column is null then 'null::numeric' else format('nutrition.try_parse_numeric(src.%I::text)', v_carbs_column) end;
    v_fat_expr := case when v_fat_column is null then 'null::numeric' else format('nutrition.try_parse_numeric(src.%I::text)', v_fat_column) end;
    v_fiber_expr := case when v_fiber_column is null then 'null::numeric' else format('nutrition.try_parse_numeric(src.%I::text)', v_fiber_column) end;
    v_sodium_expr := case when v_sodium_column is null then 'null::numeric' else format('nutrition.try_parse_numeric(src.%I::text)', v_sodium_column) end;
    v_ingredients_expr := case when v_ingredients_column is null then 'null::text' else format('src.%I::text', v_ingredients_column) end;
    v_created_by_expr := case
      when v_created_by_column is not null then format('nutrition.try_parse_uuid(src.%I::text)', v_created_by_column)
      when v_user_id_column is not null then format('nutrition.try_parse_uuid(src.%I::text)', v_user_id_column)
      else 'null::uuid'
    end;
    v_is_verified_expr := case when v_is_verified_column is null then 'null::boolean' else format('src.%I::boolean', v_is_verified_column) end;
    v_verification_status_expr := case when v_verification_status_column is null then 'null::text' else format('src.%I::text', v_verification_status_column) end;
    v_created_at_expr := case when v_created_at_column is null then 'null::timestamptz' else format('src.%I::timestamptz', v_created_at_column) end;
    v_updated_at_expr := case when v_updated_at_column is null then 'null::timestamptz' else format('src.%I::timestamptz', v_updated_at_column) end;

    v_sql := format(
      'select
         src.%1$I::text as legacy_id,
         %2$s as name,
         %3$s as brand,
         %4$s as barcode,
         %5$s as food_kind,
         %6$s as serving_label,
         %7$s as serving_qty,
         %8$s as serving_unit,
         %9$s as serving_grams,
         %10$s as calories,
         %11$s as protein,
         %12$s as carbs,
         %13$s as fat,
         %14$s as fiber,
         %15$s as sodium_mg,
         %16$s as ingredients_text,
         %17$s as created_by,
         %18$s as is_verified,
         %19$s as verification_status,
         %20$s as created_at,
         %21$s as updated_at
       from %22$I.%23$I src
       join (
         select distinct t.%24$I::text as legacy_id
         from nutrition.%25$I t
         where t.%24$I is not null
       ) refs
         on refs.legacy_id = src.%1$I::text
       where not exists (
         select 1
         from tmp_nutrition_food_id_map m
         where m.source_table = %26$L
           and m.legacy_id = src.%1$I::text
       )',
      v_id_column,
      v_name_expr,
      v_brand_expr,
      v_barcode_expr,
      v_food_kind_expr,
      v_serving_label_expr,
      v_serving_qty_expr,
      v_serving_unit_expr,
      v_serving_grams_expr,
      v_calories_expr,
      v_protein_expr,
      v_carbs_expr,
      v_fat_expr,
      v_fiber_expr,
      v_sodium_expr,
      v_ingredients_expr,
      v_created_by_expr,
      v_is_verified_expr,
      v_verification_status_expr,
      v_created_at_expr,
      v_updated_at_expr,
      v_target_schema,
      v_target_table,
      v_source.source_column,
      v_source.source_table,
      v_source.source_table
    );

    for v_legacy_row in execute v_sql
    loop
      v_resolved_food_id := null;

      v_resolved_food_id := nutrition.try_parse_uuid(v_legacy_row.legacy_id);
      if v_resolved_food_id is not null and not exists (
        select 1
        from nutrition.food_items fi
        where fi.id = v_resolved_food_id
      ) then
        v_resolved_food_id := null;
      end if;

      if v_resolved_food_id is null and nullif(btrim(coalesce(v_legacy_row.barcode, '')), '') is not null then
        select fi.id
        into v_resolved_food_id
        from nutrition.food_items fi
        where nutrition.normalize_barcode(fi.barcode) = nutrition.normalize_barcode(v_legacy_row.barcode)
        order by
          case when coalesce(fi.is_verified, false) then 0 else 1 end,
          fi.updated_at desc,
          fi.created_at desc
        limit 1;
      end if;

      if v_resolved_food_id is null and nullif(btrim(coalesce(v_legacy_row.name, '')), '') is not null then
        select fi.id
        into v_resolved_food_id
        from nutrition.food_items fi
        where nutrition.normalize_food_name(concat_ws(' ', fi.name, coalesce(fi.brand, ''))) = nutrition.normalize_food_name(
          concat_ws(' ', v_legacy_row.name, coalesce(v_legacy_row.brand, ''))
        )
        order by
          case when coalesce(fi.is_verified, false) then 0 else 1 end,
          fi.updated_at desc,
          fi.created_at desc
        limit 1;
      end if;

      if v_resolved_food_id is null then
        insert into nutrition.food_items (
          food_kind,
          name,
          brand,
          barcode,
          serving_reference,
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
        values (
          case
            when lower(coalesce(v_legacy_row.food_kind, '')) in ('packaged', 'ingredient') then lower(v_legacy_row.food_kind)
            when nullif(btrim(coalesce(v_legacy_row.barcode, '')), '') is not null then 'packaged'
            else 'ingredient'
          end,
          coalesce(nullif(btrim(coalesce(v_legacy_row.name, '')), ''), format('Legacy Food %s', v_legacy_row.legacy_id)),
          nullif(btrim(coalesce(v_legacy_row.brand, '')), ''),
          nullif(btrim(coalesce(v_legacy_row.barcode, '')), ''),
          nutrition.build_serving_reference_from_legacy(
            v_legacy_row.serving_label,
            v_legacy_row.serving_qty,
            v_legacy_row.serving_unit,
            v_legacy_row.serving_grams
          ),
          v_legacy_row.calories,
          v_legacy_row.protein,
          v_legacy_row.carbs,
          v_legacy_row.fat,
          v_legacy_row.fiber,
          v_legacy_row.sodium_mg,
          nullif(btrim(coalesce(v_legacy_row.ingredients_text, '')), ''),
          'import',
          v_legacy_row.created_by,
          coalesce(v_legacy_row.is_verified, false),
          case
            when v_legacy_row.verification_status in ('pending', 'user_confirmed', 'verified', 'rejected') then v_legacy_row.verification_status
            when coalesce(v_legacy_row.is_verified, false) then 'verified'
            else 'user_confirmed'
          end,
          coalesce(v_legacy_row.created_at, timezone('utc', now())),
          coalesce(v_legacy_row.updated_at, v_legacy_row.created_at, timezone('utc', now()))
        )
        returning id into v_resolved_food_id;
      end if;

      insert into tmp_nutrition_food_id_map (source_table, legacy_id, canonical_food_id)
      values (v_source.source_table, v_legacy_row.legacy_id, v_resolved_food_id)
      on conflict (source_table, legacy_id) do update
      set canonical_food_id = excluded.canonical_food_id;
    end loop;
  end loop;

  if to_regclass('nutrition.recipe_ingredients') is not null then
    alter table nutrition.recipe_ingredients
      add column if not exists food_id_uuid uuid;

    update nutrition.recipe_ingredients ri
    set food_id_uuid = m.canonical_food_id
    from tmp_nutrition_food_id_map m
    where m.source_table = 'recipe_ingredients'
      and ri.food_id is not null
      and ri.food_id::text = m.legacy_id
      and ri.food_id_uuid is distinct from m.canonical_food_id;

    select exists (
      select 1
      from nutrition.recipe_ingredients
      where food_id is not null
        and food_id_uuid is null
    ) into v_has_unmapped;

    if v_has_unmapped then
      raise exception 'Could not map every nutrition.recipe_ingredients.food_id row onto nutrition.food_items.id';
    end if;

    alter table nutrition.recipe_ingredients
      drop constraint if exists recipe_ingredients_food_id_fkey,
      drop constraint if exists recipe_ingredients_recipe_food_position_key;

    drop index if exists recipe_ingredients_food_idx;

    alter table nutrition.recipe_ingredients rename column food_id to food_id_legacy;
    alter table nutrition.recipe_ingredients rename column food_id_uuid to food_id;
    alter table nutrition.recipe_ingredients alter column food_id set not null;
    alter table nutrition.recipe_ingredients drop column food_id_legacy;

    alter table nutrition.recipe_ingredients
      add constraint recipe_ingredients_food_id_fkey
      foreign key (food_id) references nutrition.food_items(id) on delete restrict;

    alter table nutrition.recipe_ingredients
      add constraint recipe_ingredients_recipe_food_position_key
      unique (recipe_id, food_id, position);

    create index if not exists recipe_ingredients_food_idx
      on nutrition.recipe_ingredients (food_id);
  end if;

  if to_regclass('nutrition.user_favorite_foods') is not null then
    alter table nutrition.user_favorite_foods
      add column if not exists food_id_uuid uuid;

    update nutrition.user_favorite_foods uff
    set food_id_uuid = m.canonical_food_id
    from tmp_nutrition_food_id_map m
    where m.source_table = 'user_favorite_foods'
      and uff.food_id is not null
      and uff.food_id::text = m.legacy_id
      and uff.food_id_uuid is distinct from m.canonical_food_id;

    delete from nutrition.user_favorite_foods older
    using nutrition.user_favorite_foods newer
    where older.user_id = newer.user_id
      and older.food_id_uuid is not null
      and older.food_id_uuid = newer.food_id_uuid
      and older.ctid < newer.ctid;

    select exists (
      select 1
      from nutrition.user_favorite_foods
      where food_id is not null
        and food_id_uuid is null
    ) into v_has_unmapped;

    if v_has_unmapped then
      raise exception 'Could not map every nutrition.user_favorite_foods.food_id row onto nutrition.food_items.id';
    end if;

    alter table nutrition.user_favorite_foods
      drop constraint if exists user_favorite_foods_food_id_fkey,
      drop constraint if exists user_favorite_foods_user_food_key;

    drop index if exists user_favorite_foods_food_idx;

    alter table nutrition.user_favorite_foods rename column food_id to food_id_legacy;
    alter table nutrition.user_favorite_foods rename column food_id_uuid to food_id;
    alter table nutrition.user_favorite_foods alter column food_id set not null;
    alter table nutrition.user_favorite_foods drop column food_id_legacy;

    alter table nutrition.user_favorite_foods
      add constraint user_favorite_foods_food_id_fkey
      foreign key (food_id) references nutrition.food_items(id) on delete cascade;

    alter table nutrition.user_favorite_foods
      add constraint user_favorite_foods_user_food_key
      unique (user_id, food_id);

    create index if not exists user_favorite_foods_food_idx
      on nutrition.user_favorite_foods (food_id);
  end if;

  if to_regclass('nutrition.diary_items') is not null then
    alter table nutrition.diary_items
      add column if not exists food_id_uuid uuid;

    update nutrition.diary_items di
    set food_id_uuid = m.canonical_food_id
    from tmp_nutrition_food_id_map m
    where m.source_table = 'diary_items'
      and di.food_id is not null
      and di.food_id::text = m.legacy_id
      and di.food_id_uuid is distinct from m.canonical_food_id;

    select exists (
      select 1
      from nutrition.diary_items
      where food_id is not null
        and food_id_uuid is null
    ) into v_has_unmapped;

    if v_has_unmapped then
      raise exception 'Could not map every nutrition.diary_items.food_id row onto nutrition.food_items.id';
    end if;

    alter table nutrition.diary_items
      drop constraint if exists diary_items_food_id_fkey,
      drop constraint if exists diary_items_food_or_recipe_check;

    drop index if exists diary_items_food_idx;
    drop index if exists diary_items_recent_food_lookup_idx;

    alter table nutrition.diary_items rename column food_id to food_id_legacy;
    alter table nutrition.diary_items rename column food_id_uuid to food_id;
    alter table nutrition.diary_items drop column food_id_legacy;

    alter table nutrition.diary_items
      add constraint diary_items_food_id_fkey
      foreign key (food_id) references nutrition.food_items(id) on delete set null;

    alter table nutrition.diary_items
      add constraint diary_items_food_or_recipe_check
      check (
        (food_id is not null and recipe_id is null)
        or (food_id is null and recipe_id is not null)
      ) not valid;

    create index if not exists diary_items_food_idx
      on nutrition.diary_items (food_id);

    create index if not exists diary_items_recent_food_lookup_idx
      on nutrition.diary_items (user_id, consumed_at desc, created_at desc, food_id)
      where food_id is not null;
  end if;

  if to_regclass('nutrition.food_submissions') is not null then
    alter table nutrition.food_submissions
      add column if not exists canonical_food_id_uuid uuid;

    update nutrition.food_submissions fs
    set canonical_food_id_uuid = m.canonical_food_id
    from tmp_nutrition_food_id_map m
    where m.source_table = 'food_submissions'
      and fs.canonical_food_id is not null
      and fs.canonical_food_id::text = m.legacy_id
      and fs.canonical_food_id_uuid is distinct from m.canonical_food_id;

    select exists (
      select 1
      from nutrition.food_submissions
      where canonical_food_id is not null
        and canonical_food_id_uuid is null
    ) into v_has_unmapped;

    if v_has_unmapped then
      raise exception 'Could not map every nutrition.food_submissions.canonical_food_id row onto nutrition.food_items.id';
    end if;

    alter table nutrition.food_submissions
      drop constraint if exists food_submissions_canonical_food_id_fkey;

    drop index if exists food_submissions_food_idx;

    alter table nutrition.food_submissions rename column canonical_food_id to canonical_food_id_legacy;
    alter table nutrition.food_submissions rename column canonical_food_id_uuid to canonical_food_id;
    alter table nutrition.food_submissions drop column canonical_food_id_legacy;

    alter table nutrition.food_submissions
      add constraint food_submissions_canonical_food_id_fkey
      foreign key (canonical_food_id) references nutrition.food_items(id) on delete set null;

    create index if not exists food_submissions_food_idx
      on nutrition.food_submissions (canonical_food_id);
  end if;
end;
$$;

notify pgrst, 'reload schema';

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
      '20260529_nutrition_food_item_reference_canonicalization',
      'Canonicalized nutrition food references onto nutrition.food_items.id UUIDs so diary items, recipe ingredients, favorites, and food submissions no longer depend on legacy foods tables.'
    )
    on conflict (change_key) do nothing;
  end if;
end;
$$;

commit;
