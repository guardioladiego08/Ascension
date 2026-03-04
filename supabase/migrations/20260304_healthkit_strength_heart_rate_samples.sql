begin;

create schema if not exists health;

grant usage on schema health to authenticated;

create table if not exists health.strength_workout_heart_rate_samples (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null
    references auth.users (id) on delete cascade,
  strength_workout_id uuid not null
    references strength.strength_workouts (id) on delete cascade,
  source text not null default 'apple_healthkit',
  sample_uuid text,
  sample_start_at timestamptz not null,
  sample_end_at timestamptz not null,
  bpm numeric(6, 2) not null,
  source_name text,
  source_bundle_id text,
  device_name text,
  device_model text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

alter table health.strength_workout_heart_rate_samples
  add column if not exists user_id uuid,
  add column if not exists strength_workout_id uuid,
  add column if not exists source text,
  add column if not exists sample_uuid text,
  add column if not exists sample_start_at timestamptz,
  add column if not exists sample_end_at timestamptz,
  add column if not exists bpm numeric(6, 2),
  add column if not exists source_name text,
  add column if not exists source_bundle_id text,
  add column if not exists device_name text,
  add column if not exists device_model text,
  add column if not exists metadata jsonb,
  add column if not exists created_at timestamptz;

alter table health.strength_workout_heart_rate_samples
  alter column source set default 'apple_healthkit',
  alter column metadata set default '{}'::jsonb,
  alter column created_at set default timezone('utc', now());

update health.strength_workout_heart_rate_samples
set source = coalesce(nullif(source, ''), 'apple_healthkit'),
    metadata = coalesce(metadata, '{}'::jsonb),
    created_at = coalesce(created_at, timezone('utc', now()))
where source is null
   or source = ''
   or metadata is null
   or created_at is null;

alter table health.strength_workout_heart_rate_samples
  alter column user_id set not null,
  alter column strength_workout_id set not null,
  alter column source set not null,
  alter column sample_start_at set not null,
  alter column sample_end_at set not null,
  alter column bpm set not null,
  alter column metadata set not null,
  alter column created_at set not null;

alter table health.strength_workout_heart_rate_samples
  drop constraint if exists strength_workout_heart_rate_samples_bpm_check;

alter table health.strength_workout_heart_rate_samples
  add constraint strength_workout_heart_rate_samples_bpm_check
  check (bpm >= 0::numeric);

create unique index if not exists strength_workout_heart_rate_samples_session_sample_key
  on health.strength_workout_heart_rate_samples (
    strength_workout_id,
    sample_start_at,
    sample_end_at,
    bpm
  );

create index if not exists strength_workout_heart_rate_samples_workout_start_idx
  on health.strength_workout_heart_rate_samples (strength_workout_id, sample_start_at);

create index if not exists strength_workout_heart_rate_samples_user_workout_idx
  on health.strength_workout_heart_rate_samples (user_id, strength_workout_id);

alter table health.strength_workout_heart_rate_samples enable row level security;

grant select, insert, delete on table health.strength_workout_heart_rate_samples to authenticated;

alter default privileges in schema health
  grant select, insert, delete on tables to authenticated;

drop policy if exists strength_workout_heart_rate_samples_select_own
  on health.strength_workout_heart_rate_samples;
create policy strength_workout_heart_rate_samples_select_own
on health.strength_workout_heart_rate_samples
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists strength_workout_heart_rate_samples_insert_own
  on health.strength_workout_heart_rate_samples;
create policy strength_workout_heart_rate_samples_insert_own
on health.strength_workout_heart_rate_samples
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists strength_workout_heart_rate_samples_delete_own
  on health.strength_workout_heart_rate_samples;
create policy strength_workout_heart_rate_samples_delete_own
on health.strength_workout_heart_rate_samples
for delete
to authenticated
using (auth.uid() = user_id);

alter table "user".user_preferences
  add column if not exists apple_health_sync_enabled boolean,
  add column if not exists apple_health_authorization_status text,
  add column if not exists apple_health_last_connected_at timestamptz,
  add column if not exists apple_health_last_sync_at timestamptz,
  add column if not exists apple_health_last_error text;

alter table "user".user_preferences
  alter column apple_health_sync_enabled set default false,
  alter column apple_health_authorization_status set default 'not_determined';

update "user".user_preferences
set apple_health_sync_enabled = coalesce(apple_health_sync_enabled, false),
    apple_health_authorization_status = case
      when apple_health_authorization_status in (
        'authorized',
        'denied',
        'not_determined',
        'unavailable'
      ) then apple_health_authorization_status
      else 'not_determined'
    end
where apple_health_sync_enabled is null
   or apple_health_authorization_status is null
   or apple_health_authorization_status not in (
     'authorized',
     'denied',
     'not_determined',
     'unavailable'
   );

alter table "user".user_preferences
  alter column apple_health_sync_enabled set not null,
  alter column apple_health_authorization_status set not null;

alter table "user".user_preferences
  drop constraint if exists user_preferences_apple_health_authorization_status_check;

alter table "user".user_preferences
  add constraint user_preferences_apple_health_authorization_status_check
  check (
    apple_health_authorization_status in (
      'authorized',
      'denied',
      'not_determined',
      'unavailable'
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
      '20260304_healthkit_strength_heart_rate_samples',
      'Added health.strength_workout_heart_rate_samples and Apple Health sync columns on user.user_preferences.'
    )
    on conflict (change_key) do nothing;
  end if;
end $$;

commit;
