begin;

create or replace function public.normalize_auth_bootstrap_username(p_username text)
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

create or replace function public.resolve_auth_bootstrap_username(
  p_user_id uuid,
  p_email text,
  p_requested_username text
)
returns text
language plpgsql
security definer
set search_path = public, "user"
as $$
declare
  v_base text;
  v_candidate text;
  v_suffix text;
  v_taken boolean;
begin
  v_base := public.normalize_auth_bootstrap_username(p_requested_username);

  if v_base is null then
    v_base := public.normalize_auth_bootstrap_username(split_part(coalesce(p_email, ''), '@', 1));
  end if;

  if v_base is null or char_length(v_base) < 3 then
    v_base := 'user_' || substr(replace(p_user_id::text, '-', ''), 1, 6);
  end if;

  if char_length(v_base) > 30 then
    v_base := left(v_base, 30);
  end if;

  v_candidate := v_base;

  v_taken := false;

  if to_regclass('"user".users') is not null then
    execute $sql$
      select exists (
        select 1
        from "user".users u
        where public.normalize_auth_bootstrap_username(u.username) = $1
      )
    $sql$
    into v_taken
    using v_candidate;
  end if;

  if not coalesce(v_taken, false) and to_regclass('public.profiles') is not null then
    execute $sql$
      select exists (
        select 1
        from public.profiles p
        where public.normalize_auth_bootstrap_username(p.username) = $1
      )
    $sql$
    into v_taken
    using v_candidate;
  end if;

  if not coalesce(v_taken, false) and to_regclass('public.profiles_stub') is not null then
    execute $sql$
      select exists (
        select 1
        from public.profiles_stub ps
        where public.normalize_auth_bootstrap_username(ps.username) = $1
      )
    $sql$
    into v_taken
    using v_candidate;
  end if;

  if coalesce(v_taken, false) then
    v_suffix := '_' || substr(replace(p_user_id::text, '-', ''), 1, 6);
    v_candidate := left(v_base, greatest(3, 30 - char_length(v_suffix))) || v_suffix;
  end if;

  return v_candidate;
end;
$$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth, "user"
as $$
declare
  v_username text;
  v_display_name text;
begin
  v_username := public.resolve_auth_bootstrap_username(
    new.id,
    new.email,
    new.raw_user_meta_data->>'username'
  );

  v_display_name := nullif(
    trim(
      coalesce(
        new.raw_user_meta_data->>'display_name',
        new.raw_user_meta_data->>'displayName',
        new.raw_user_meta_data->>'full_name',
        v_username
      )
    ),
    ''
  );

  begin
    if to_regclass('public.profiles_stub') is not null then
      insert into public.profiles_stub (user_id, username)
      values (new.id, v_username)
      on conflict (user_id) do update
        set username = coalesce(public.profiles_stub.username, excluded.username);
    end if;
  exception
    when others then
      raise warning 'handle_new_auth_user profiles_stub bootstrap failed for %: [%] %',
        new.id, sqlstate, sqlerrm;
  end;

  begin
    if to_regclass('"user".users') is not null then
      insert into "user".users (
        user_id,
        username,
        onboarding_completed,
        is_private
      )
      values (
        new.id,
        v_username,
        false,
        true
      )
      on conflict (user_id) do update
        set username = coalesce("user".users.username, excluded.username);
    end if;
  exception
    when others then
      raise warning 'handle_new_auth_user user.users bootstrap failed for %: [%] %',
        new.id, sqlstate, sqlerrm;
  end;

  begin
    if to_regclass('public.profiles') is not null then
      begin
        insert into public.profiles (
          id,
          username,
          display_name,
          is_private,
          onboarding_completed,
          has_accepted_privacy_policy
        )
        values (
          new.id,
          v_username,
          v_display_name,
          false,
          false,
          false
        )
        on conflict (id) do update
          set username = coalesce(public.profiles.username, excluded.username),
              display_name = coalesce(public.profiles.display_name, excluded.display_name);
      exception
        when undefined_column then
          insert into public.profiles (
            id,
            username,
            display_name,
            is_private
          )
          values (
            new.id,
            v_username,
            v_display_name,
            false
          )
          on conflict (id) do update
            set username = coalesce(public.profiles.username, excluded.username),
                display_name = coalesce(public.profiles.display_name, excluded.display_name);
      end;
    end if;
  exception
    when others then
      raise warning 'handle_new_auth_user public.profiles bootstrap failed for %: [%] %',
        new.id, sqlstate, sqlerrm;
  end;

  return new;
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
      '20260329_signup_auth_trigger_hardening',
      'Hardened handle_new_auth_user so signup derives a safe fallback username, seeds public.profiles when possible, and no longer fails auth user creation when legacy bootstrap table writes error.'
    )
    on conflict (change_key) do nothing;
  end if;
end $$;

commit;
