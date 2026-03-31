-- Run this in the hosted Supabase SQL editor when signup fails with:
--   "Database error saving new user"
--
-- Change the username literal in the DO blocks below if needed.
-- Output order:
--   1) meta flags
--   2) username collisions
--   3) auth.users trigger list
--   4) auth.users trigger function SQL
--   5) downstream table trigger list
--   6) downstream table trigger function SQL
--   7) target table columns + defaults/nullability
--   8) target table constraints
--   9) target table indexes
--   10) signup-related schema_change_log rows

create temporary table if not exists tmp_signup_diag_meta (
  key text primary key,
  value text
) on commit drop;

create temporary table if not exists tmp_signup_diag_username_hits (
  source text,
  row_id text,
  username text
) on commit drop;

create temporary table if not exists tmp_signup_diag_change_log (
  change_key text,
  description text
) on commit drop;

truncate tmp_signup_diag_meta;
truncate tmp_signup_diag_username_hits;
truncate tmp_signup_diag_change_log;

do $$
declare
  v_username text := 'diego';
  v_rpc_signature regprocedure;
  v_rpc_result boolean;
begin
  insert into tmp_signup_diag_meta (key, value)
  values ('username_checked', v_username)
  on conflict (key) do update set value = excluded.value;

  v_rpc_signature := to_regprocedure('public.is_username_available(text)');

  insert into tmp_signup_diag_meta (key, value)
  values ('is_username_available_signature', coalesce(v_rpc_signature::text, 'missing'))
  on conflict (key) do update set value = excluded.value;

  if v_rpc_signature is not null then
    execute format('select public.is_username_available(%L)', v_username) into v_rpc_result;

    insert into tmp_signup_diag_meta (key, value)
    values ('is_username_available_result', coalesce(v_rpc_result::text, 'null'))
    on conflict (key) do update set value = excluded.value;
  end if;

  insert into tmp_signup_diag_meta (key, value)
  values
    (
      'profiles_has_full_name',
      case
        when exists (
          select 1
          from information_schema.columns c
          where c.table_schema = 'public'
            and c.table_name = 'profiles'
            and c.column_name = 'full_name'
        ) then 'true'
        else 'false'
      end
    ),
    (
      'profiles_has_avatar_url',
      case
        when exists (
          select 1
          from information_schema.columns c
          where c.table_schema = 'public'
            and c.table_name = 'profiles'
            and c.column_name = 'avatar_url'
        ) then 'true'
        else 'false'
      end
    ),
    (
      'profiles_has_first_name',
      case
        when exists (
          select 1
          from information_schema.columns c
          where c.table_schema = 'public'
            and c.table_name = 'profiles'
            and c.column_name = 'first_name'
        ) then 'true'
        else 'false'
      end
    ),
    (
      'profiles_has_last_name',
      case
        when exists (
          select 1
          from information_schema.columns c
          where c.table_schema = 'public'
            and c.table_name = 'profiles'
            and c.column_name = 'last_name'
        ) then 'true'
        else 'false'
      end
    )
  on conflict (key) do update set value = excluded.value;
end $$;

do $$
declare
  v_username text := 'diego';
  v_norm_expr text :=
    $expr$nullif(trim(both '_' from regexp_replace(regexp_replace(lower(trim(coalesce(%s, ''))), '[^a-z0-9_]', '_', 'g'), '_+', '_', 'g')), '')$expr$;
begin
  if to_regclass('"user".users') is not null then
    execute format(
      'insert into tmp_signup_diag_username_hits (source, row_id, username)
       select %L, u.user_id::text, u.username
       from "user".users u
       where %s = %L',
      'user.users',
      format(v_norm_expr, 'u.username'),
      v_username
    );
  end if;

  if to_regclass('public.profiles') is not null then
    execute format(
      'insert into tmp_signup_diag_username_hits (source, row_id, username)
       select %L, p.id::text, p.username
       from public.profiles p
       where %s = %L',
      'public.profiles',
      format(v_norm_expr, 'p.username'),
      v_username
    );
  end if;

  if to_regclass('public.profiles_stub') is not null then
    execute format(
      'insert into tmp_signup_diag_username_hits (source, row_id, username)
       select %L, ps.user_id::text, ps.username
       from public.profiles_stub ps
       where %s = %L',
      'public.profiles_stub',
      format(v_norm_expr, 'ps.username'),
      v_username
    );
  end if;
end $$;

do $$
begin
  if to_regclass('public.schema_change_log') is not null then
    insert into tmp_signup_diag_change_log (change_key, description)
    select scl.change_key, scl.description
    from public.schema_change_log scl
    where scl.change_key in (
      '20260329_signup_bootstrap_schema_compat',
      '20260329_signup_username_availability_rpc'
    );
  end if;
end $$;

select key, value
from tmp_signup_diag_meta
order by key;

select source, row_id, username
from tmp_signup_diag_username_hits
order by source, row_id;

select
  t.tgname as trigger_name,
  ns.nspname as function_schema,
  p.proname as function_name,
  pg_get_triggerdef(t.oid) as trigger_definition
from pg_trigger t
join pg_proc p
  on p.oid = t.tgfoid
join pg_namespace ns
  on ns.oid = p.pronamespace
where t.tgrelid = 'auth.users'::regclass
  and not t.tgisinternal
order by t.tgname;

select
  t.tgname as trigger_name,
  ns.nspname as function_schema,
  p.proname as function_name,
  pg_get_functiondef(p.oid) as function_sql
from pg_trigger t
join pg_proc p
  on p.oid = t.tgfoid
join pg_namespace ns
  on ns.oid = p.pronamespace
where t.tgrelid = 'auth.users'::regclass
  and not t.tgisinternal
order by t.tgname;

select
  rel_ns.nspname as table_schema,
  rel_cls.relname as table_name,
  t.tgname as trigger_name,
  fn_ns.nspname as function_schema,
  p.proname as function_name,
  pg_get_triggerdef(t.oid) as trigger_definition
from pg_trigger t
join pg_class rel_cls
  on rel_cls.oid = t.tgrelid
join pg_namespace rel_ns
  on rel_ns.oid = rel_cls.relnamespace
join pg_proc p
  on p.oid = t.tgfoid
join pg_namespace fn_ns
  on fn_ns.oid = p.pronamespace
where (rel_ns.nspname, rel_cls.relname) in (
  ('public', 'profiles_stub'),
  ('user', 'users')
)
  and not t.tgisinternal
order by rel_ns.nspname, rel_cls.relname, t.tgname;

select
  rel_ns.nspname as table_schema,
  rel_cls.relname as table_name,
  t.tgname as trigger_name,
  fn_ns.nspname as function_schema,
  p.proname as function_name,
  pg_get_functiondef(p.oid) as function_sql
from pg_trigger t
join pg_class rel_cls
  on rel_cls.oid = t.tgrelid
join pg_namespace rel_ns
  on rel_ns.oid = rel_cls.relnamespace
join pg_proc p
  on p.oid = t.tgfoid
join pg_namespace fn_ns
  on fn_ns.oid = p.pronamespace
where (rel_ns.nspname, rel_cls.relname) in (
  ('public', 'profiles_stub'),
  ('user', 'users')
)
  and not t.tgisinternal
order by rel_ns.nspname, rel_cls.relname, t.tgname;

select
  c.table_schema,
  c.table_name,
  c.column_name,
  c.data_type,
  c.is_nullable,
  c.column_default,
  c.udt_schema,
  c.udt_name
from information_schema.columns c
where (c.table_schema, c.table_name) in (
  ('user', 'users'),
  ('public', 'profiles'),
  ('public', 'profiles_stub')
)
order by c.table_schema, c.table_name, c.ordinal_position;

select
  ns.nspname as table_schema,
  cls.relname as table_name,
  con.conname as constraint_name,
  case con.contype
    when 'p' then 'primary_key'
    when 'u' then 'unique'
    when 'f' then 'foreign_key'
    when 'c' then 'check'
    when 'x' then 'exclusion'
    else con.contype::text
  end as constraint_type,
  pg_get_constraintdef(con.oid) as constraint_definition
from pg_constraint con
join pg_class cls
  on cls.oid = con.conrelid
join pg_namespace ns
  on ns.oid = cls.relnamespace
where (ns.nspname, cls.relname) in (
  ('user', 'users'),
  ('public', 'profiles'),
  ('public', 'profiles_stub')
)
order by ns.nspname, cls.relname, con.conname;

select
  i.schemaname as table_schema,
  i.tablename as table_name,
  i.indexname,
  i.indexdef
from pg_indexes i
where (i.schemaname, i.tablename) in (
  ('user', 'users'),
  ('public', 'profiles'),
  ('public', 'profiles_stub')
)
order by i.schemaname, i.tablename, i.indexname;

select change_key, description
from tmp_signup_diag_change_log;
