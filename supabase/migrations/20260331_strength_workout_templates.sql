begin;

create schema if not exists strength;

create table if not exists strength.workout_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  description text null,
  visibility strength.activity_privacy not null default 'private'::strength.activity_privacy,
  source_strength_workout_id uuid null references strength.strength_workouts (id) on delete set null,
  forked_from_template_id uuid null references strength.workout_templates (id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists strength.workout_template_blocks (
  id uuid primary key default gen_random_uuid(),
  workout_template_id uuid not null references strength.workout_templates (id) on delete cascade,
  block_kind strength.workout_block_kind not null,
  sequence_index integer not null check (sequence_index > 0),
  label text null,
  rest_interval_seconds integer null check (rest_interval_seconds is null or rest_interval_seconds > 0),
  configuration jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint workout_template_blocks_sequence_unique unique (workout_template_id, sequence_index),
  constraint workout_template_blocks_superset_rest_required check (
    (block_kind = 'exercise' and rest_interval_seconds is null)
    or (block_kind = 'superset' and rest_interval_seconds is not null)
  )
);

create table if not exists strength.workout_template_block_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_template_block_id uuid not null references strength.workout_template_blocks (id) on delete cascade,
  exercise_id uuid not null,
  exercise_order integer not null check (exercise_order > 0),
  target_set_count integer not null check (target_set_count > 0),
  configuration jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  constraint workout_template_block_exercises_order_unique unique (workout_template_block_id, exercise_order)
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'workout_template_block_exercises_exercise_id_fkey'
      and conrelid = 'strength.workout_template_block_exercises'::regclass
  ) then
    alter table strength.workout_template_block_exercises
      add constraint workout_template_block_exercises_exercise_id_fkey
      foreign key (exercise_id)
      references public.exercises (id)
      on delete no action
      deferrable initially deferred;
  end if;
end;
$$;

create index if not exists workout_templates_user_created_idx
  on strength.workout_templates (user_id, created_at desc);

create index if not exists workout_templates_visibility_created_idx
  on strength.workout_templates (visibility, created_at desc);

create index if not exists workout_template_blocks_template_sequence_idx
  on strength.workout_template_blocks (workout_template_id, sequence_index);

create index if not exists workout_template_block_exercises_block_order_idx
  on strength.workout_template_block_exercises (workout_template_block_id, exercise_order);

create index if not exists workout_template_block_exercises_exercise_idx
  on strength.workout_template_block_exercises (exercise_id);

alter table if exists strength.workout_templates enable row level security;
alter table if exists strength.workout_template_blocks enable row level security;
alter table if exists strength.workout_template_block_exercises enable row level security;

grant select, insert, update, delete on table strength.workout_templates to authenticated;
grant select, insert, update, delete on table strength.workout_template_blocks to authenticated;
grant select, insert, update, delete on table strength.workout_template_block_exercises to authenticated;

drop policy if exists workout_templates_select_own on strength.workout_templates;
create policy workout_templates_select_own
on strength.workout_templates
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists workout_templates_insert_own on strength.workout_templates;
create policy workout_templates_insert_own
on strength.workout_templates
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists workout_templates_update_own on strength.workout_templates;
create policy workout_templates_update_own
on strength.workout_templates
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists workout_templates_delete_own on strength.workout_templates;
create policy workout_templates_delete_own
on strength.workout_templates
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists workout_template_blocks_select_own on strength.workout_template_blocks;
create policy workout_template_blocks_select_own
on strength.workout_template_blocks
for select
to authenticated
using (
  exists (
    select 1
    from strength.workout_templates wt
    where wt.id = workout_template_id
      and wt.user_id = auth.uid()
  )
);

drop policy if exists workout_template_blocks_insert_own on strength.workout_template_blocks;
create policy workout_template_blocks_insert_own
on strength.workout_template_blocks
for insert
to authenticated
with check (
  exists (
    select 1
    from strength.workout_templates wt
    where wt.id = workout_template_id
      and wt.user_id = auth.uid()
  )
);

drop policy if exists workout_template_blocks_update_own on strength.workout_template_blocks;
create policy workout_template_blocks_update_own
on strength.workout_template_blocks
for update
to authenticated
using (
  exists (
    select 1
    from strength.workout_templates wt
    where wt.id = workout_template_id
      and wt.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from strength.workout_templates wt
    where wt.id = workout_template_id
      and wt.user_id = auth.uid()
  )
);

drop policy if exists workout_template_blocks_delete_own on strength.workout_template_blocks;
create policy workout_template_blocks_delete_own
on strength.workout_template_blocks
for delete
to authenticated
using (
  exists (
    select 1
    from strength.workout_templates wt
    where wt.id = workout_template_id
      and wt.user_id = auth.uid()
  )
);

drop policy if exists workout_template_block_exercises_select_own on strength.workout_template_block_exercises;
create policy workout_template_block_exercises_select_own
on strength.workout_template_block_exercises
for select
to authenticated
using (
  exists (
    select 1
    from strength.workout_template_blocks wtb
    join strength.workout_templates wt on wt.id = wtb.workout_template_id
    where wtb.id = workout_template_block_id
      and wt.user_id = auth.uid()
  )
);

drop policy if exists workout_template_block_exercises_insert_own on strength.workout_template_block_exercises;
create policy workout_template_block_exercises_insert_own
on strength.workout_template_block_exercises
for insert
to authenticated
with check (
  exists (
    select 1
    from strength.workout_template_blocks wtb
    join strength.workout_templates wt on wt.id = wtb.workout_template_id
    where wtb.id = workout_template_block_id
      and wt.user_id = auth.uid()
  )
);

drop policy if exists workout_template_block_exercises_update_own on strength.workout_template_block_exercises;
create policy workout_template_block_exercises_update_own
on strength.workout_template_block_exercises
for update
to authenticated
using (
  exists (
    select 1
    from strength.workout_template_blocks wtb
    join strength.workout_templates wt on wt.id = wtb.workout_template_id
    where wtb.id = workout_template_block_id
      and wt.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from strength.workout_template_blocks wtb
    join strength.workout_templates wt on wt.id = wtb.workout_template_id
    where wtb.id = workout_template_block_id
      and wt.user_id = auth.uid()
  )
);

drop policy if exists workout_template_block_exercises_delete_own on strength.workout_template_block_exercises;
create policy workout_template_block_exercises_delete_own
on strength.workout_template_block_exercises
for delete
to authenticated
using (
  exists (
    select 1
    from strength.workout_template_blocks wtb
    join strength.workout_templates wt on wt.id = wtb.workout_template_id
    where wtb.id = workout_template_block_id
      and wt.user_id = auth.uid()
  )
);

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
      '20260331_strength_workout_templates',
      'Added private strength workout templates with normalized block exercise structure, future share metadata, and own-row RLS policies.'
    )
    on conflict (change_key) do nothing;
  end if;
end;
$$;

commit;
