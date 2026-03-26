begin;

create schema if not exists strength;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'workout_block_kind'
      and n.nspname = 'strength'
  ) then
    create type strength.workout_block_kind as enum ('exercise', 'superset');
  end if;
end $$;

create table if not exists strength.workout_blocks (
  id uuid primary key default gen_random_uuid(),
  strength_workout_id uuid not null references strength.strength_workouts (id) on delete cascade,
  block_kind strength.workout_block_kind not null,
  sequence_index integer not null check (sequence_index > 0),
  label text null,
  rest_interval_seconds integer null check (rest_interval_seconds is null or rest_interval_seconds > 0),
  configuration jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint workout_blocks_workout_sequence_unique unique (strength_workout_id, sequence_index),
  constraint workout_blocks_superset_rest_required check (
    (block_kind = 'exercise' and rest_interval_seconds is null)
    or (block_kind = 'superset' and rest_interval_seconds is not null)
  )
);

create table if not exists strength.workout_block_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_block_id uuid not null references strength.workout_blocks (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete restrict,
  exercise_order integer not null check (exercise_order > 0),
  created_at timestamptz not null default timezone('utc', now()),
  constraint workout_block_exercises_block_order_unique unique (workout_block_id, exercise_order)
);

alter table if exists strength.strength_sets
  add column if not exists workout_block_id uuid null,
  add column if not exists workout_block_exercise_id uuid null,
  add column if not exists block_round_index integer null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'strength_sets_workout_block_id_fkey'
      and conrelid = 'strength.strength_sets'::regclass
  ) then
    alter table strength.strength_sets
      add constraint strength_sets_workout_block_id_fkey
      foreign key (workout_block_id)
      references strength.workout_blocks (id)
      on delete set null;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'strength_sets_workout_block_exercise_id_fkey'
      and conrelid = 'strength.strength_sets'::regclass
  ) then
    alter table strength.strength_sets
      add constraint strength_sets_workout_block_exercise_id_fkey
      foreign key (workout_block_exercise_id)
      references strength.workout_block_exercises (id)
      on delete set null;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'strength_sets_block_round_index_positive'
      and conrelid = 'strength.strength_sets'::regclass
  ) then
    alter table strength.strength_sets
      add constraint strength_sets_block_round_index_positive
      check (block_round_index is null or block_round_index > 0);
  end if;
end $$;

update strength.strength_sets
set block_round_index = set_index
where block_round_index is null
  and set_index is not null;

create index if not exists workout_blocks_workout_sequence_idx
  on strength.workout_blocks (strength_workout_id, sequence_index);

create index if not exists workout_block_exercises_block_order_idx
  on strength.workout_block_exercises (workout_block_id, exercise_order);

create index if not exists workout_block_exercises_exercise_idx
  on strength.workout_block_exercises (exercise_id);

create index if not exists strength_sets_workout_block_round_idx
  on strength.strength_sets (workout_block_id, block_round_index, workout_block_exercise_id)
  where workout_block_id is not null;

create index if not exists strength_sets_workout_block_exercise_round_idx
  on strength.strength_sets (workout_block_exercise_id, block_round_index)
  where workout_block_exercise_id is not null;

alter table if exists strength.workout_blocks enable row level security;
alter table if exists strength.workout_block_exercises enable row level security;

grant select, insert, update, delete on table strength.workout_blocks to authenticated;
grant select, insert, update, delete on table strength.workout_block_exercises to authenticated;

drop policy if exists workout_blocks_select_own on strength.workout_blocks;
create policy workout_blocks_select_own
on strength.workout_blocks
for select
to authenticated
using (
  exists (
    select 1
    from strength.strength_workouts w
    where w.id = strength_workout_id
      and w.user_id = auth.uid()
  )
);

drop policy if exists workout_blocks_insert_own on strength.workout_blocks;
create policy workout_blocks_insert_own
on strength.workout_blocks
for insert
to authenticated
with check (
  exists (
    select 1
    from strength.strength_workouts w
    where w.id = strength_workout_id
      and w.user_id = auth.uid()
  )
);

drop policy if exists workout_blocks_update_own on strength.workout_blocks;
create policy workout_blocks_update_own
on strength.workout_blocks
for update
to authenticated
using (
  exists (
    select 1
    from strength.strength_workouts w
    where w.id = strength_workout_id
      and w.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from strength.strength_workouts w
    where w.id = strength_workout_id
      and w.user_id = auth.uid()
  )
);

drop policy if exists workout_blocks_delete_own on strength.workout_blocks;
create policy workout_blocks_delete_own
on strength.workout_blocks
for delete
to authenticated
using (
  exists (
    select 1
    from strength.strength_workouts w
    where w.id = strength_workout_id
      and w.user_id = auth.uid()
  )
);

drop policy if exists workout_block_exercises_select_own on strength.workout_block_exercises;
create policy workout_block_exercises_select_own
on strength.workout_block_exercises
for select
to authenticated
using (
  exists (
    select 1
    from strength.workout_blocks wb
    join strength.strength_workouts w on w.id = wb.strength_workout_id
    where wb.id = workout_block_id
      and w.user_id = auth.uid()
  )
);

drop policy if exists workout_block_exercises_insert_own on strength.workout_block_exercises;
create policy workout_block_exercises_insert_own
on strength.workout_block_exercises
for insert
to authenticated
with check (
  exists (
    select 1
    from strength.workout_blocks wb
    join strength.strength_workouts w on w.id = wb.strength_workout_id
    where wb.id = workout_block_id
      and w.user_id = auth.uid()
  )
);

drop policy if exists workout_block_exercises_update_own on strength.workout_block_exercises;
create policy workout_block_exercises_update_own
on strength.workout_block_exercises
for update
to authenticated
using (
  exists (
    select 1
    from strength.workout_blocks wb
    join strength.strength_workouts w on w.id = wb.strength_workout_id
    where wb.id = workout_block_id
      and w.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from strength.workout_blocks wb
    join strength.strength_workouts w on w.id = wb.strength_workout_id
    where wb.id = workout_block_id
      and w.user_id = auth.uid()
  )
);

drop policy if exists workout_block_exercises_delete_own on strength.workout_block_exercises;
create policy workout_block_exercises_delete_own
on strength.workout_block_exercises
for delete
to authenticated
using (
  exists (
    select 1
    from strength.workout_blocks wb
    join strength.strength_workouts w on w.id = wb.strength_workout_id
    where wb.id = workout_block_id
      and w.user_id = auth.uid()
  )
);

drop function if exists public.get_strength_workout_structure_user(uuid);
drop function if exists public.get_strength_workout_structure_user(uuid, uuid);
create function public.get_strength_workout_structure_user(
  p_workout_id uuid,
  p_post_id uuid default null
)
returns table (
  workout jsonb,
  blocks jsonb,
  block_exercises jsonb,
  sets jsonb,
  can_delete boolean
)
language plpgsql
security definer
set search_path = public, social, strength
as $$
declare
  v_me uuid := auth.uid();
  v_workout strength.strength_workouts%rowtype;
  v_visibility text;
begin
  if v_me is null then
    raise exception 'Not authenticated';
  end if;

  if p_workout_id is null then
    raise exception 'Workout ID is required';
  end if;

  select w.*
  into v_workout
  from strength.strength_workouts w
  where w.id = p_workout_id
  limit 1;

  if v_workout.id is null then
    raise exception 'Workout not found';
  end if;

  if v_workout.user_id <> v_me then
    if p_post_id is not null then
      select p.visibility
      into v_visibility
      from social.posts p
      where p.id = p_post_id
        and p.user_id = v_workout.user_id
        and p.session_id = p_workout_id
      limit 1;
    end if;

    if v_visibility is null then
      select p.visibility
      into v_visibility
      from social.posts p
      where p.user_id = v_workout.user_id
        and p.session_id = p_workout_id
        and p.activity_type = 'strength'
      order by p.created_at desc
      limit 1;
    end if;

    if v_visibility is null or not social.can_view_post(v_me, v_workout.user_id, v_visibility) then
      raise exception 'Not allowed';
    end if;
  end if;

  return query
  select
    to_jsonb(v_workout),
    coalesce(
      (
        select jsonb_agg(to_jsonb(wb) order by wb.sequence_index)
        from strength.workout_blocks wb
        where wb.strength_workout_id = p_workout_id
      ),
      '[]'::jsonb
    ),
    coalesce(
      (
        select jsonb_agg(to_jsonb(wbe) order by wb.sequence_index, wbe.exercise_order)
        from strength.workout_block_exercises wbe
        join strength.workout_blocks wb on wb.id = wbe.workout_block_id
        where wb.strength_workout_id = p_workout_id
      ),
      '[]'::jsonb
    ),
    coalesce(
      (
        select jsonb_agg(
          to_jsonb(ss)
          order by coalesce(wb.sequence_index, 2147483647),
                   coalesce(ss.block_round_index, ss.set_index, 2147483647),
                   coalesce(wbe.exercise_order, 2147483647),
                   ss.exercise_id,
                   ss.set_index
        )
        from strength.strength_sets ss
        left join strength.workout_blocks wb on wb.id = ss.workout_block_id
        left join strength.workout_block_exercises wbe
          on wbe.id = ss.workout_block_exercise_id
        where ss.strength_workout_id = p_workout_id
      ),
      '[]'::jsonb
    ),
    (v_workout.user_id = v_me);
end;
$$;

grant execute on function public.get_strength_workout_structure_user(uuid, uuid) to authenticated;

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
      '20260322_strength_workout_blocks_and_supersets',
      'Added normalized workout blocks and block exercises for ordered strength supersets, plus block-aware set metadata and a structure RPC.'
    )
    on conflict (change_key) do nothing;
  end if;
end $$;

commit;
