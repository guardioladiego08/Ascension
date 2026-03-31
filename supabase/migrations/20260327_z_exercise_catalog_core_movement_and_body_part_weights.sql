begin;

create or replace function public.normalize_exercise_core_movement(p_value text)
returns text
language plpgsql
immutable
as $$
declare
  v_normalized text;
begin
  v_normalized := regexp_replace(lower(trim(coalesce(p_value, ''))), '[^a-z0-9]+', ' ', 'g');
  v_normalized := regexp_replace(v_normalized, '\s+', ' ', 'g');
  v_normalized := nullif(v_normalized, '');

  if v_normalized is null then
    return null;
  end if;

  case v_normalized
    when 'chest push' then return 'chest_push';
    when 'overhead push' then return 'overhead_push';
    when 'row' then return 'row';
    when 'pull down' then return 'pull_down';
    when 'pulldown' then return 'pull_down';
    when 'squat' then return 'squat';
    when 'hinge' then return 'hinge';
    when 'lunge' then return 'lunge';
    when 'carry' then return 'carry';
    when 'rotation' then return 'rotation';
    when 'anti rotation' then return 'anti_rotation';
    when 'hang' then return 'hang';
    when 'chest fly' then return 'chest_fly';
    when 'bicep curl' then return 'bicep_curl';
    when 'hammer curl' then return 'hammer_curl';
    when 'leg curl' then return 'leg_curl';
    when 'leg extension' then return 'leg_extension';
    when 'calf raise' then return 'calf_raise';
    when 'tricep extension' then return 'tricep_extension';
    when 'tricep dip' then return 'tricep_dip';
    when 'shoulder raise' then return 'shoulder_raise';
    when 'front raise' then return 'front_raise';
    when 'rear delt fly' then return 'rear_delt_fly';
    when 'ab crunch' then return 'ab_crunch';
    when 'glute bridge' then return 'glute_bridge';
    when 'glute kickback' then return 'glute_kickback';
    when 'hip abduction adduction' then return 'hip_abduction_adduction';
    when 'shrug' then return 'shrug';
    when 'wrist curl' then return 'wrist_curl';
    when 'face pull' then return 'face_pull';
    when 'core' then return 'core';
    when 'leg press' then return 'leg_press';
    when 'hip abduction' then return 'hip_abduction';
    when 'hip adduction' then return 'hip_adduction';
    when 'tricep pushdown' then return 'tricep_pushdown';
    when 'other' then return 'other';
    else
      return null;
  end case;
end;
$$;

create or replace function public.normalize_exercise_body_part(p_value text)
returns public.body_part
language plpgsql
immutable
as $$
declare
  v_normalized text;
begin
  v_normalized := regexp_replace(lower(trim(coalesce(p_value, ''))), '[^a-z0-9]+', '_', 'g');
  v_normalized := trim(both '_' from v_normalized);

  if v_normalized = '' then
    return null;
  end if;

  return v_normalized::public.body_part;
exception
  when invalid_text_representation then
    return null;
end;
$$;

create or replace function public.parse_exercise_body_part_weight(p_value jsonb)
returns numeric
language plpgsql
immutable
as $$
declare
  v_text text;
begin
  if p_value is null or p_value = 'null'::jsonb then
    return null;
  end if;

  if jsonb_typeof(p_value) not in ('number', 'string') then
    return null;
  end if;

  v_text := trim(coalesce(p_value #>> '{}', ''));
  if v_text = '' or v_text !~ '^[0-9]+(\.[0-9]+)?$' then
    return null;
  end if;

  return v_text::numeric;
exception
  when others then
    return null;
end;
$$;

create or replace function public.exercise_body_part_weights_are_valid(p_weights jsonb)
returns boolean
language plpgsql
immutable
as $$
declare
  v_item jsonb;
  v_muscle public.body_part;
  v_weight numeric;
  v_seen text[] := array[]::text[];
begin
  if p_weights is null or jsonb_typeof(p_weights) <> 'array' then
    return false;
  end if;

  for v_item in
    select value
    from jsonb_array_elements(p_weights)
  loop
    if jsonb_typeof(v_item) <> 'object' then
      return false;
    end if;

    v_muscle := public.normalize_exercise_body_part(v_item ->> 'muscle');
    v_weight := public.parse_exercise_body_part_weight(v_item -> 'weight');

    if v_muscle is null or v_weight is null or v_weight <= 0 then
      return false;
    end if;

    if v_muscle::text = any(v_seen) then
      return false;
    end if;

    v_seen := array_append(v_seen, v_muscle::text);
  end loop;

  return true;
end;
$$;

create or replace function public.normalize_exercise_body_part_weights(p_weights jsonb)
returns jsonb
language plpgsql
immutable
as $$
declare
  v_item jsonb;
  v_muscle public.body_part;
  v_weight numeric;
  v_result jsonb := '[]'::jsonb;
begin
  if p_weights is null then
    return null;
  end if;

  if not public.exercise_body_part_weights_are_valid(p_weights) then
    raise exception 'body_part_weights must be a JSON array of unique {muscle, weight} objects with positive numeric weights and valid body_part values'
      using errcode = '23514';
  end if;

  for v_item in
    select value
    from jsonb_array_elements(p_weights)
  loop
    v_muscle := public.normalize_exercise_body_part(v_item ->> 'muscle');
    v_weight := public.parse_exercise_body_part_weight(v_item -> 'weight');

    v_result := v_result || jsonb_build_array(
      jsonb_build_object(
        'muscle', v_muscle::text,
        'weight', round(v_weight, 4)
      )
    );
  end loop;

  return v_result;
end;
$$;

create or replace function public.exercise_body_part_weights_from_body_parts(p_body_parts public.body_part[])
returns jsonb
language plpgsql
immutable
as $$
declare
  v_body_part public.body_part;
  v_result jsonb := '[]'::jsonb;
  v_count integer := coalesce(array_length(p_body_parts, 1), 0);
  v_weight numeric;
begin
  if v_count = 0 then
    return v_result;
  end if;

  v_weight := round((1::numeric / v_count::numeric), 4);

  foreach v_body_part in array p_body_parts
  loop
    v_result := v_result || jsonb_build_array(
      jsonb_build_object(
        'muscle', v_body_part::text,
        'weight', v_weight
      )
    );
  end loop;

  return v_result;
end;
$$;

create or replace function public.exercise_body_parts_from_weights(p_weights jsonb)
returns public.body_part[]
language plpgsql
immutable
as $$
declare
  v_item jsonb;
  v_muscle public.body_part;
  v_result public.body_part[] := array[]::public.body_part[];
begin
  if p_weights is null or jsonb_typeof(p_weights) <> 'array' then
    return v_result;
  end if;

  for v_item in
    select value
    from jsonb_array_elements(p_weights)
  loop
    v_muscle := public.normalize_exercise_body_part(v_item ->> 'muscle');

    if v_muscle is not null and not (v_muscle = any(v_result)) then
      v_result := array_append(v_result, v_muscle);
    end if;
  end loop;

  return v_result;
end;
$$;

create or replace function public.sync_exercise_catalog_fields()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_core_movement_input text := trim(coalesce(new.core_movement, ''));
  v_normalized_core_movement text;
begin
  if v_core_movement_input = '' then
    new.core_movement := 'other';
  else
    v_normalized_core_movement := public.normalize_exercise_core_movement(v_core_movement_input);

    if v_normalized_core_movement is null then
      raise exception 'Invalid core movement: %', new.core_movement
        using errcode = '23514';
    end if;

    new.core_movement := v_normalized_core_movement;
  end if;

  if new.body_part_weights is null then
    new.body_part_weights := public.exercise_body_part_weights_from_body_parts(
      coalesce(new.body_parts, array[]::public.body_part[])
    );
  else
    new.body_part_weights := public.normalize_exercise_body_part_weights(new.body_part_weights);
  end if;

  new.body_parts := public.exercise_body_parts_from_weights(new.body_part_weights);

  return new;
end;
$$;

alter table if exists public.exercises
  add column if not exists core_movement text,
  add column if not exists body_part_weights jsonb;

update public.exercises
set core_movement = coalesce(public.normalize_exercise_core_movement(core_movement), 'other'),
    body_part_weights = case
      when public.exercise_body_part_weights_are_valid(body_part_weights)
        then public.normalize_exercise_body_part_weights(body_part_weights)
      else public.exercise_body_part_weights_from_body_parts(
        coalesce(body_parts, array[]::public.body_part[])
      )
    end,
    body_parts = case
      when public.exercise_body_part_weights_are_valid(body_part_weights)
        then public.exercise_body_parts_from_weights(
          public.normalize_exercise_body_part_weights(body_part_weights)
        )
      else coalesce(body_parts, array[]::public.body_part[])
    end
where core_movement is null
   or public.normalize_exercise_core_movement(core_movement) is distinct from core_movement
   or body_part_weights is null
   or not public.exercise_body_part_weights_are_valid(body_part_weights)
   or body_parts is distinct from public.exercise_body_parts_from_weights(body_part_weights);

alter table public.exercises
  alter column core_movement set default 'other';

alter table public.exercises
  alter column core_movement set not null,
  alter column body_part_weights set not null;

alter table public.exercises
  drop constraint if exists exercises_core_movement_check,
  drop constraint if exists exercises_body_part_weights_check;

alter table public.exercises
  add constraint exercises_core_movement_check
    check (
      public.normalize_exercise_core_movement(core_movement) is not null
      and core_movement = public.normalize_exercise_core_movement(core_movement)
    ),
  add constraint exercises_body_part_weights_check
    check (public.exercise_body_part_weights_are_valid(body_part_weights));

drop trigger if exists trg_exercises_sync_catalog_fields on public.exercises;
create trigger trg_exercises_sync_catalog_fields
before insert or update of core_movement, body_parts, body_part_weights
on public.exercises
for each row
execute function public.sync_exercise_catalog_fields();

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
      '20260327_z_exercise_catalog_core_movement_and_body_part_weights',
      'Added canonical core_movement plus weighted muscle activation JSON to public.exercises, while preserving the legacy body_parts array as a derived compatibility column.'
    )
    on conflict (change_key) do nothing;
  end if;
end $$;

commit;

