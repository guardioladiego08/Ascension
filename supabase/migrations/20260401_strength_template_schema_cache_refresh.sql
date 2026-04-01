begin;

notify pgrst, 'reload schema';

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
      '20260401_strength_template_schema_cache_refresh',
      'Reloaded PostgREST schema cache after adding strength workout template tables so the strength schema exposes the new template relations.'
    )
    on conflict (change_key) do nothing;
  end if;
end;
$$;

commit;
