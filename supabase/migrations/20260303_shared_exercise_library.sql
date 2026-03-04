begin;

alter table if exists public.exercises enable row level security;

grant select, insert, update, delete on table public.exercises to authenticated;

drop policy if exists exercises_select_visible on public.exercises;
create policy exercises_select_visible
on public.exercises
for select
to authenticated
using (
  user_id is null
  or user_id = auth.uid()
);

drop policy if exists exercises_insert_own on public.exercises;
create policy exercises_insert_own
on public.exercises
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists exercises_update_own on public.exercises;
create policy exercises_update_own
on public.exercises
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists exercises_delete_own on public.exercises;
create policy exercises_delete_own
on public.exercises
for delete
to authenticated
using (user_id = auth.uid());

create index if not exists idx_exercises_global_exercise_name
  on public.exercises (exercise_name)
  where user_id is null;

create index if not exists idx_exercises_user_exercise_name
  on public.exercises (user_id, exercise_name)
  where user_id is not null;

create unique index if not exists exercises_global_name_ci_idx
  on public.exercises (lower(exercise_name))
  where user_id is null;

create unique index if not exists exercises_user_name_ci_idx
  on public.exercises (user_id, lower(exercise_name))
  where user_id is not null;

drop function if exists public.get_strength_workout_summary_user(uuid);
drop function if exists public.get_strength_workout_summary_user(uuid, uuid);
create function public.get_strength_workout_summary_user(
  p_workout_id uuid,
  p_post_id uuid default null
)
returns table (
  workout jsonb,
  exercise_summary jsonb,
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
        select jsonb_agg(
          to_jsonb(es) || jsonb_build_object('exercise_name', ex.exercise_name)
          order by es.exercise_id
        )
        from strength.exercise_summary es
        left join public.exercises ex
          on ex.id = es.exercise_id
        where es.strength_workout_id = p_workout_id
      ),
      '[]'::jsonb
    ),
    coalesce(
      (
        select jsonb_agg(to_jsonb(ss) order by ss.exercise_id, ss.set_index)
        from strength.strength_sets ss
        where ss.strength_workout_id = p_workout_id
      ),
      '[]'::jsonb
    ),
    (v_workout.user_id = v_me);
end;
$$;

grant execute on function public.get_strength_workout_summary_user(uuid, uuid) to authenticated;

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
      '20260303_shared_exercise_library',
      'Enabled visible-scope exercise RLS, added supporting indexes for shared-plus-private exercises, and included exercise names in shared strength workout summaries.'
    )
    on conflict (change_key) do nothing;
  end if;
end $$;

commit;
