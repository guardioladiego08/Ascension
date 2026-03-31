begin;

create or replace function public.normalize_username_lookup(p_username text)
returns text
language sql
immutable
as $$
  select nullif(
    trim(
      both '_' from regexp_replace(
        regexp_replace(lower(trim(coalesce(p_username, ''))), '[^a-z0-9_]', '_', 'g'),
        '_+',
        '_',
        'g'
      )
    ),
    ''
  );
$$;

create or replace function public.is_username_available(desired_username text)
returns boolean
language plpgsql
security definer
set search_path = public, "user"
as $$
declare
  v_username text;
  v_taken boolean;
begin
  v_username := public.normalize_username_lookup(desired_username);

  if v_username is null or char_length(v_username) < 3 then
    return false;
  end if;

  if to_regclass('"user".users') is not null then
    execute $sql$
      select exists (
        select 1
        from "user".users u
        where public.normalize_username_lookup(u.username) = $1
      )
    $sql$
    into v_taken
    using v_username;

    if coalesce(v_taken, false) then
      return false;
    end if;
  end if;

  if to_regclass('public.profiles') is not null then
    execute $sql$
      select exists (
        select 1
        from public.profiles p
        where public.normalize_username_lookup(p.username) = $1
      )
    $sql$
    into v_taken
    using v_username;

    if coalesce(v_taken, false) then
      return false;
    end if;
  end if;

  if to_regclass('public.profiles_stub') is not null then
    execute $sql$
      select exists (
        select 1
        from public.profiles_stub ps
        where public.normalize_username_lookup(ps.username) = $1
      )
    $sql$
    into v_taken
    using v_username;

    if coalesce(v_taken, false) then
      return false;
    end if;
  end if;

  return true;
end;
$$;

grant execute on function public.is_username_available(text) to anon, authenticated, service_role;

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
      '20260329_signup_username_availability_rpc',
      'Added a canonical username-availability RPC that checks user.users, public.profiles, and legacy public.profiles_stub so signup prechecks match auth bootstrap uniqueness.'
    )
    on conflict (change_key) do nothing;
  end if;
end $$;

commit;
