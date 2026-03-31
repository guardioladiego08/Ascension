begin;

create or replace function public.normalize_exercise_name(p_name text)
returns text
language sql
immutable
as $$
  select nullif(
    regexp_replace(lower(trim(coalesce(p_name, ''))), '\s+', ' ', 'g'),
    ''
  );
$$;

create or replace function public.enforce_visible_exercise_name_uniqueness()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_normalized_name text;
  v_conflicting_exercise public.exercises%rowtype;
begin
  new.exercise_name := regexp_replace(trim(coalesce(new.exercise_name, '')), '\s+', ' ', 'g');
  v_normalized_name := public.normalize_exercise_name(new.exercise_name);

  if v_normalized_name is null then
    raise exception 'Exercise name is required'
      using errcode = '23514';
  end if;

  select e.*
  into v_conflicting_exercise
  from public.exercises e
  where public.normalize_exercise_name(e.exercise_name) = v_normalized_name
    and (tg_op <> 'UPDATE' or e.id <> new.id)
    and (
      new.user_id is null
      or e.user_id is null
      or e.user_id = new.user_id
    )
  order by
    case when e.user_id is null then 0 else 1 end,
    e.created_at,
    e.id
  limit 1;

  if v_conflicting_exercise.id is not null then
    if v_conflicting_exercise.user_id is null then
      raise exception 'Exercise "%" already exists in the shared library', new.exercise_name
        using errcode = '23505';
    end if;

    if new.user_id is not distinct from v_conflicting_exercise.user_id then
      raise exception 'Exercise "%" already exists for this user', new.exercise_name
        using errcode = '23505';
    end if;

    raise exception 'Exercise "%" conflicts with an existing visible exercise', new.exercise_name
      using errcode = '23505';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_exercises_enforce_visible_name_uniqueness on public.exercises;
create trigger trg_exercises_enforce_visible_name_uniqueness
before insert or update of exercise_name, user_id
on public.exercises
for each row
execute function public.enforce_visible_exercise_name_uniqueness();

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
      '20260327_exercise_library_visibility_guard',
      'Normalized exercise names, blocked shared-vs-user duplicate exercise names in visible scope, and added a trigger guard for future exercise-library inserts and updates.'
    )
    on conflict (change_key) do nothing;
  end if;
end $$;

commit;
