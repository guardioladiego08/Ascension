begin;

create schema if not exists strength;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'activity_privacy'
      and n.nspname = 'strength'
  ) then
    create type strength.activity_privacy as enum ('private', 'followers', 'public');
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'strength'
      and table_name = 'strength_workouts'
      and column_name = 'privacy'
  ) then
    execute '
      alter table strength.strength_workouts
      alter column privacy drop default
    ';

    execute '
      alter table strength.strength_workouts
      alter column privacy type strength.activity_privacy
      using (privacy::text::strength.activity_privacy)
    ';

    execute '
      alter table strength.strength_workouts
      alter column privacy set default ''private''::strength.activity_privacy
    ';
  end if;
end $$;

alter table if exists strength.strength_workouts enable row level security;

grant select, insert, update, delete on table strength.strength_workouts to authenticated;

drop policy if exists strength_workouts_select_own on strength.strength_workouts;
create policy strength_workouts_select_own
on strength.strength_workouts
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists strength_workouts_insert_own on strength.strength_workouts;
create policy strength_workouts_insert_own
on strength.strength_workouts
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists strength_workouts_update_own on strength.strength_workouts;
create policy strength_workouts_update_own
on strength.strength_workouts
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists strength_workouts_delete_own on strength.strength_workouts;
create policy strength_workouts_delete_own
on strength.strength_workouts
for delete
to authenticated
using (auth.uid() = user_id);

drop function if exists public.list_strength_workouts_user(integer);
create function public.list_strength_workouts_user(
  p_limit integer default null
)
returns table (
  id uuid,
  started_at timestamptz,
  ended_at timestamptz,
  total_vol numeric,
  notes text,
  privacy strength.activity_privacy,
  name text
)
language plpgsql
security definer
set search_path = public, strength
as $$
declare
  v_me uuid := auth.uid();
begin
  if v_me is null then
    raise exception 'Not authenticated';
  end if;

  if p_limit is not null and p_limit > 0 then
    return query
    select
      w.id,
      w.started_at,
      w.ended_at,
      w.total_vol,
      w.notes,
      w.privacy,
      w.name
    from strength.strength_workouts w
    where w.user_id = v_me
    order by w.started_at desc
    limit p_limit;
  end if;

  return query
  select
    w.id,
    w.started_at,
    w.ended_at,
    w.total_vol,
    w.notes,
    w.privacy,
    w.name
  from strength.strength_workouts w
  where w.user_id = v_me
  order by w.started_at desc;
end;
$$;

grant execute on function public.list_strength_workouts_user(integer) to authenticated;

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
      '20260302_strength_privacy_and_history_access',
      'Moved strength workout privacy to strength.activity_privacy, added explicit own-row RLS policies, and added a strength history RPC for authenticated users.'
    )
    on conflict (change_key) do nothing;
  end if;
end $$;

commit;
