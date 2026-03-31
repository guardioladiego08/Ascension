begin;

alter table public.profiles
  add column if not exists onboarding_completed boolean not null default false,
  add column if not exists has_accepted_privacy_policy boolean not null default false,
  add column if not exists privacy_accepted_at timestamptz null;

update public.profiles
set
  onboarding_completed = coalesce(onboarding_completed, false),
  has_accepted_privacy_policy = coalesce(has_accepted_privacy_policy, false)
where onboarding_completed is null
   or has_accepted_privacy_policy is null;

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

grant insert, update on public.profiles to authenticated;

do $$
declare
  v_app_usage_reasons_type regtype;
begin
  if to_regclass('"user".users') is null then
    return;
  end if;

  execute '
    update "user".users
    set is_private = true
    where is_private is null
  ';

  execute '
    update "user".users
    set onboarding_completed = false
    where onboarding_completed is null
  ';

  execute '
    alter table "user".users
    alter column is_private set default true
  ';

  execute '
    alter table "user".users
    alter column onboarding_completed set default false
  ';

  select a.atttypid::regtype
  into v_app_usage_reasons_type
  from pg_attribute a
  where a.attrelid = '"user".users'::regclass
    and a.attname = 'app_usage_reasons'
    and not a.attisdropped
    and a.attnum > 0;

  if v_app_usage_reasons_type is not null then
    execute format(
      'update "user".users set app_usage_reasons = %L::%s where app_usage_reasons is null',
      '{}',
      v_app_usage_reasons_type::text
    );

    execute format(
      'alter table "user".users alter column app_usage_reasons set default %L::%s',
      '{}',
      v_app_usage_reasons_type::text
    );
  end if;
end $$;

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
      '20260329_signup_bootstrap_schema_compat',
      'Added early-onboarding columns and own-row write policies to public.profiles, and set safe bootstrap defaults on user.users for signup/auth compatibility.'
    )
    on conflict (change_key) do nothing;
  end if;
end $$;

commit;
