do $$
begin
  if to_regclass('public.foods') is not null then
    execute 'create index if not exists foods_ean_13_idx on public.foods (ean_13) where ean_13 is not null';
  end if;
end;
$$;
