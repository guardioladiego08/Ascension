-- Allow account-deletion cascades to remove user-owned exercises and workout structures
-- in one transaction without weakening normal referential integrity for exercise history.

begin;

create schema if not exists strength;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'workout_block_exercises_exercise_id_fkey'
      and conrelid = 'strength.workout_block_exercises'::regclass
  ) then
    alter table strength.workout_block_exercises
      drop constraint workout_block_exercises_exercise_id_fkey;
  end if;

  alter table strength.workout_block_exercises
    add constraint workout_block_exercises_exercise_id_fkey
    foreign key (exercise_id)
    references public.exercises (id)
    on delete no action
    deferrable initially deferred;
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
      '20260329_workout_block_exercises_exercise_fk_deferrable',
      'Changed strength.workout_block_exercises.exercise_id to a deferred NO ACTION foreign key so auth-user deletes can remove exercises and workout blocks in one transaction.'
    )
    on conflict (change_key) do nothing;
  end if;
end;
$$;

commit;
