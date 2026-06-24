begin;

create schema if not exists "user";

create table if not exists "user".body_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null
    references auth.users (id) on delete cascade,
  logged_for_date date not null default (timezone('utc', now()))::date,
  weight_kg numeric(6, 2),
  body_fat_pct numeric(5, 2),
  muscle_pct numeric(5, 2),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint body_metrics_has_measurement_check check (
    weight_kg is not null
    or body_fat_pct is not null
    or muscle_pct is not null
  ),
  constraint body_metrics_weight_kg_check check (
    weight_kg is null or weight_kg > 0::numeric
  ),
  constraint body_metrics_body_fat_pct_check check (
    body_fat_pct is null or (body_fat_pct >= 0::numeric and body_fat_pct <= 100::numeric)
  ),
  constraint body_metrics_muscle_pct_check check (
    muscle_pct is null or (muscle_pct >= 0::numeric and muscle_pct <= 100::numeric)
  ),
  constraint body_metrics_user_day_key unique (user_id, logged_for_date)
);

create index if not exists body_metrics_user_date_idx
  on "user".body_metrics (user_id, logged_for_date desc);

drop trigger if exists body_metrics_set_updated_at on "user".body_metrics;
create trigger body_metrics_set_updated_at
before update on "user".body_metrics
for each row
execute function "user".set_updated_at();

alter table "user".body_metrics enable row level security;

drop policy if exists body_metrics_select_own on "user".body_metrics;
create policy body_metrics_select_own
on "user".body_metrics
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists body_metrics_insert_own on "user".body_metrics;
create policy body_metrics_insert_own
on "user".body_metrics
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists body_metrics_update_own on "user".body_metrics;
create policy body_metrics_update_own
on "user".body_metrics
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists body_metrics_delete_own on "user".body_metrics;
create policy body_metrics_delete_own
on "user".body_metrics
for delete
to authenticated
using (auth.uid() = user_id);

grant select, insert, update, delete on "user".body_metrics to authenticated;

insert into public.schema_change_log (change_key, description)
values (
  '20260623_user_body_metrics',
  'Added user.body_metrics for daily biometrics logging and body-composition progress charts.'
)
on conflict (change_key) do nothing;

commit;
