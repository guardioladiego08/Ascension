begin;

alter table "user".user_preferences
  add column if not exists health_provider text,
  add column if not exists health_sync_enabled boolean,
  add column if not exists health_authorization_status text,
  add column if not exists health_last_connected_at timestamptz,
  add column if not exists health_last_sync_at timestamptz,
  add column if not exists health_last_error text;

alter table "user".user_preferences
  alter column health_sync_enabled set default false,
  alter column health_authorization_status set default 'not_determined';

update "user".user_preferences
set health_provider = case
      when health_provider in ('apple_health', 'health_connect') then health_provider
      when apple_health_sync_enabled is not null
        or apple_health_authorization_status is not null
        or apple_health_last_connected_at is not null
        or apple_health_last_sync_at is not null
        or apple_health_last_error is not null
      then 'apple_health'
      else health_provider
    end,
    health_sync_enabled = coalesce(health_sync_enabled, apple_health_sync_enabled, false),
    health_authorization_status = case
      when health_authorization_status in (
        'authorized',
        'denied',
        'not_determined',
        'unavailable'
      ) then health_authorization_status
      when apple_health_authorization_status in (
        'authorized',
        'denied',
        'not_determined',
        'unavailable'
      ) then apple_health_authorization_status
      else 'not_determined'
    end,
    health_last_connected_at = coalesce(health_last_connected_at, apple_health_last_connected_at),
    health_last_sync_at = coalesce(health_last_sync_at, apple_health_last_sync_at),
    health_last_error = coalesce(health_last_error, apple_health_last_error)
where health_provider is null
   or health_provider not in ('apple_health', 'health_connect')
   or health_sync_enabled is null
   or health_authorization_status is null
   or health_authorization_status not in (
     'authorized',
     'denied',
     'not_determined',
     'unavailable'
   );

alter table "user".user_preferences
  alter column health_sync_enabled set not null,
  alter column health_authorization_status set not null;

alter table "user".user_preferences
  drop constraint if exists user_preferences_health_authorization_status_check;

alter table "user".user_preferences
  add constraint user_preferences_health_authorization_status_check
  check (
    health_authorization_status in (
      'authorized',
      'denied',
      'not_determined',
      'unavailable'
    )
  );

alter table "user".user_preferences
  drop constraint if exists user_preferences_health_provider_check;

alter table "user".user_preferences
  add constraint user_preferences_health_provider_check
  check (
    health_provider is null
    or health_provider in ('apple_health', 'health_connect')
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
      '20260308_health_provider_preferences',
      'Added provider-agnostic health preference columns and backfilled existing Apple Health settings.'
    )
    on conflict (change_key) do nothing;
  end if;
end $$;

commit;
