-- User preferences hardening + schema tracking
-- Safe to run multiple times.

begin;

create schema if not exists "user";

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'weight_unit'
      and n.nspname = 'public'
  ) then
    create type public.weight_unit as enum ('lb', 'kg');
  end if;
end $$;

create table if not exists "user".user_preferences (
  user_id uuid primary key default auth.uid(),
  weight_unit public.weight_unit not null default 'kg'::public.weight_unit,
  distance_unit text not null default 'km',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint user_preferences_user_id_fkey
    foreign key (user_id) references auth.users (id) on delete cascade
);

alter table "user".user_preferences add column if not exists weight_unit public.weight_unit;
alter table "user".user_preferences add column if not exists distance_unit text;
alter table "user".user_preferences add column if not exists created_at timestamptz;
alter table "user".user_preferences add column if not exists updated_at timestamptz;

alter table "user".user_preferences
  alter column weight_unit set default 'kg'::public.weight_unit,
  alter column distance_unit set default 'km',
  alter column created_at set default timezone('utc', now()),
  alter column updated_at set default timezone('utc', now());

update "user".user_preferences
set weight_unit = coalesce(weight_unit, 'kg'::public.weight_unit),
    distance_unit = case
      when lower(distance_unit) in ('mi', 'km') then lower(distance_unit)
      else 'km'
    end,
    created_at = coalesce(created_at, timezone('utc', now())),
    updated_at = coalesce(updated_at, timezone('utc', now()));

alter table "user".user_preferences
  alter column weight_unit set not null,
  alter column distance_unit set not null,
  alter column created_at set not null,
  alter column updated_at set not null;

alter table "user".user_preferences
  drop constraint if exists user_preferences_distance_unit_check;

alter table "user".user_preferences
  add constraint user_preferences_distance_unit_check
  check (distance_unit in ('mi', 'km'));

create or replace function "user".set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists user_preferences_set_updated_at on "user".user_preferences;
create trigger user_preferences_set_updated_at
before update on "user".user_preferences
for each row execute function "user".set_updated_at();

alter table "user".user_preferences enable row level security;

drop policy if exists user_preferences_select_own on "user".user_preferences;
create policy user_preferences_select_own
on "user".user_preferences
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists user_preferences_insert_own on "user".user_preferences;
create policy user_preferences_insert_own
on "user".user_preferences
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists user_preferences_update_own on "user".user_preferences;
create policy user_preferences_update_own
on "user".user_preferences
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

grant select, insert, update on "user".user_preferences to authenticated;

-- Schema inventory snapshot (existing schemas)
create table if not exists public.schema_registry (
  schema_name text primary key,
  captured_at timestamptz not null default timezone('utc', now())
);

insert into public.schema_registry (schema_name, captured_at)
select n.nspname, timezone('utc', now())
from pg_namespace n
where n.nspname not like 'pg_%'
  and n.nspname <> 'information_schema'
on conflict (schema_name)
do update set captured_at = excluded.captured_at;

-- Applied schema changes log
create table if not exists public.schema_change_log (
  change_key text primary key,
  description text not null,
  changed_at timestamptz not null default timezone('utc', now())
);

insert into public.schema_change_log (change_key, description)
values (
  '20260226_user_preferences_units_and_schema_tracking',
  'Normalized user.user_preferences defaults/constraints/rls and added schema inventory + schema change tracking tables.'
)
on conflict (change_key) do nothing;

commit;
