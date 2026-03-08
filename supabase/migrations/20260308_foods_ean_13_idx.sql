create index if not exists foods_ean_13_idx
  on public.foods (ean_13)
  where ean_13 is not null;
