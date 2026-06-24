begin;

create schema if not exists run_walk;

create table if not exists run_walk.interval_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  description text null,
  benefit text null,
  source text not null default 'custom' check (source in ('custom', 'preset')),
  tags text[] not null default '{}'::text[],
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists run_walk.interval_template_steps (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references run_walk.interval_templates (id) on delete cascade,
  sequence_index integer not null check (sequence_index >= 0),
  phase_kind text not null check (phase_kind in ('warmup', 'work', 'recovery', 'rest', 'cooldown')),
  phase_label text not null check (char_length(btrim(phase_label)) between 1 and 80),
  duration_s integer not null check (duration_s > 0),
  cue_text text null,
  interval_index integer null check (interval_index is null or interval_index > 0),
  created_at timestamptz not null default timezone('utc', now()),
  constraint interval_template_steps_unique_sequence unique (template_id, sequence_index)
);

create table if not exists run_walk.interval_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  template_id uuid null references run_walk.interval_templates (id) on delete set null,
  template_name_snapshot text not null check (char_length(btrim(template_name_snapshot)) between 1 and 120),
  template_description_snapshot text null,
  template_benefit_snapshot text null,
  template_source text not null default 'custom' check (template_source in ('custom', 'preset')),
  activity_type text not null default 'run' check (lower(activity_type) = 'run'),
  status text not null default 'in_progress' check (status in ('in_progress', 'completed', 'canceled')),
  started_at timestamptz not null,
  ended_at timestamptz null,
  duration_s integer not null default 0 check (duration_s >= 0),
  distance_m double precision not null default 0 check (distance_m >= 0),
  elev_gain_m double precision not null default 0 check (elev_gain_m >= 0),
  avg_pace_s_per_km double precision null check (avg_pace_s_per_km is null or avg_pace_s_per_km > 0),
  timezone_str text null,
  total_steps_count integer not null default 0 check (total_steps_count >= 0),
  completed_steps_count integer not null default 0 check (completed_steps_count >= 0),
  total_intervals_count integer not null default 0 check (total_intervals_count >= 0),
  completed_intervals_count integer not null default 0 check (completed_intervals_count >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists run_walk.interval_session_steps (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references run_walk.interval_sessions (id) on delete cascade,
  sequence_index integer not null check (sequence_index >= 0),
  phase_kind text not null check (phase_kind in ('warmup', 'work', 'recovery', 'rest', 'cooldown')),
  phase_label text not null check (char_length(btrim(phase_label)) between 1 and 80),
  planned_duration_s integer not null check (planned_duration_s > 0),
  actual_duration_s integer not null default 0 check (actual_duration_s >= 0),
  started_elapsed_s integer not null default 0 check (started_elapsed_s >= 0),
  ended_elapsed_s integer not null default 0 check (ended_elapsed_s >= 0),
  interval_index integer null check (interval_index is null or interval_index > 0),
  completed boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  constraint interval_session_steps_unique_sequence unique (session_id, sequence_index)
);

create table if not exists run_walk.interval_samples (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references run_walk.interval_sessions (id) on delete cascade,
  ts timestamptz not null,
  elapsed_s integer not null check (elapsed_s >= 0),
  lat double precision null,
  lon double precision null,
  altitude_m double precision null,
  accuracy_m double precision null,
  speed_mps double precision null,
  bearing_deg double precision null,
  hr_bpm integer null,
  cadence_spm integer null,
  grade_pct double precision null,
  distance_m double precision null,
  is_moving boolean null,
  source text not null check (source in ('fg', 'bg')),
  phase_kind text null check (phase_kind is null or phase_kind in ('warmup', 'work', 'recovery', 'rest', 'cooldown')),
  session_step_index integer null check (session_step_index is null or session_step_index >= 0),
  interval_index integer null check (interval_index is null or interval_index > 0),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists interval_templates_user_created_idx
  on run_walk.interval_templates (user_id, created_at desc);

create index if not exists interval_template_steps_template_sequence_idx
  on run_walk.interval_template_steps (template_id, sequence_index);

create index if not exists interval_sessions_user_started_idx
  on run_walk.interval_sessions (user_id, started_at desc);

create index if not exists interval_sessions_status_ended_idx
  on run_walk.interval_sessions (status, ended_at desc nulls last);

create index if not exists interval_session_steps_session_sequence_idx
  on run_walk.interval_session_steps (session_id, sequence_index);

create index if not exists interval_samples_session_ts_idx
  on run_walk.interval_samples (session_id, ts);

create index if not exists interval_samples_session_step_idx
  on run_walk.interval_samples (session_id, session_step_index);

alter table if exists run_walk.interval_templates enable row level security;
alter table if exists run_walk.interval_template_steps enable row level security;
alter table if exists run_walk.interval_sessions enable row level security;
alter table if exists run_walk.interval_session_steps enable row level security;
alter table if exists run_walk.interval_samples enable row level security;

grant select, insert, update, delete on table run_walk.interval_templates to authenticated;
grant select, insert, update, delete on table run_walk.interval_template_steps to authenticated;
grant select, insert, update, delete on table run_walk.interval_sessions to authenticated;
grant select, insert, update, delete on table run_walk.interval_session_steps to authenticated;
grant select, insert, update, delete on table run_walk.interval_samples to authenticated;

drop policy if exists interval_templates_select_own on run_walk.interval_templates;
create policy interval_templates_select_own
on run_walk.interval_templates
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists interval_templates_insert_own on run_walk.interval_templates;
create policy interval_templates_insert_own
on run_walk.interval_templates
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists interval_templates_update_own on run_walk.interval_templates;
create policy interval_templates_update_own
on run_walk.interval_templates
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists interval_templates_delete_own on run_walk.interval_templates;
create policy interval_templates_delete_own
on run_walk.interval_templates
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists interval_template_steps_select_own on run_walk.interval_template_steps;
create policy interval_template_steps_select_own
on run_walk.interval_template_steps
for select
to authenticated
using (
  exists (
    select 1
    from run_walk.interval_templates t
    where t.id = template_id
      and t.user_id = auth.uid()
  )
);

drop policy if exists interval_template_steps_insert_own on run_walk.interval_template_steps;
create policy interval_template_steps_insert_own
on run_walk.interval_template_steps
for insert
to authenticated
with check (
  exists (
    select 1
    from run_walk.interval_templates t
    where t.id = template_id
      and t.user_id = auth.uid()
  )
);

drop policy if exists interval_template_steps_update_own on run_walk.interval_template_steps;
create policy interval_template_steps_update_own
on run_walk.interval_template_steps
for update
to authenticated
using (
  exists (
    select 1
    from run_walk.interval_templates t
    where t.id = template_id
      and t.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from run_walk.interval_templates t
    where t.id = template_id
      and t.user_id = auth.uid()
  )
);

drop policy if exists interval_template_steps_delete_own on run_walk.interval_template_steps;
create policy interval_template_steps_delete_own
on run_walk.interval_template_steps
for delete
to authenticated
using (
  exists (
    select 1
    from run_walk.interval_templates t
    where t.id = template_id
      and t.user_id = auth.uid()
  )
);

drop policy if exists interval_sessions_select_own on run_walk.interval_sessions;
create policy interval_sessions_select_own
on run_walk.interval_sessions
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists interval_sessions_insert_own on run_walk.interval_sessions;
create policy interval_sessions_insert_own
on run_walk.interval_sessions
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists interval_sessions_update_own on run_walk.interval_sessions;
create policy interval_sessions_update_own
on run_walk.interval_sessions
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists interval_sessions_delete_own on run_walk.interval_sessions;
create policy interval_sessions_delete_own
on run_walk.interval_sessions
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists interval_session_steps_select_own on run_walk.interval_session_steps;
create policy interval_session_steps_select_own
on run_walk.interval_session_steps
for select
to authenticated
using (
  exists (
    select 1
    from run_walk.interval_sessions s
    where s.id = session_id
      and s.user_id = auth.uid()
  )
);

drop policy if exists interval_session_steps_insert_own on run_walk.interval_session_steps;
create policy interval_session_steps_insert_own
on run_walk.interval_session_steps
for insert
to authenticated
with check (
  exists (
    select 1
    from run_walk.interval_sessions s
    where s.id = session_id
      and s.user_id = auth.uid()
  )
);

drop policy if exists interval_session_steps_update_own on run_walk.interval_session_steps;
create policy interval_session_steps_update_own
on run_walk.interval_session_steps
for update
to authenticated
using (
  exists (
    select 1
    from run_walk.interval_sessions s
    where s.id = session_id
      and s.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from run_walk.interval_sessions s
    where s.id = session_id
      and s.user_id = auth.uid()
  )
);

drop policy if exists interval_session_steps_delete_own on run_walk.interval_session_steps;
create policy interval_session_steps_delete_own
on run_walk.interval_session_steps
for delete
to authenticated
using (
  exists (
    select 1
    from run_walk.interval_sessions s
    where s.id = session_id
      and s.user_id = auth.uid()
  )
);

drop policy if exists interval_samples_select_own on run_walk.interval_samples;
create policy interval_samples_select_own
on run_walk.interval_samples
for select
to authenticated
using (
  exists (
    select 1
    from run_walk.interval_sessions s
    where s.id = session_id
      and s.user_id = auth.uid()
  )
);

drop policy if exists interval_samples_insert_own on run_walk.interval_samples;
create policy interval_samples_insert_own
on run_walk.interval_samples
for insert
to authenticated
with check (
  exists (
    select 1
    from run_walk.interval_sessions s
    where s.id = session_id
      and s.user_id = auth.uid()
  )
);

drop policy if exists interval_samples_update_own on run_walk.interval_samples;
create policy interval_samples_update_own
on run_walk.interval_samples
for update
to authenticated
using (
  exists (
    select 1
    from run_walk.interval_sessions s
    where s.id = session_id
      and s.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from run_walk.interval_sessions s
    where s.id = session_id
      and s.user_id = auth.uid()
  )
);

drop policy if exists interval_samples_delete_own on run_walk.interval_samples;
create policy interval_samples_delete_own
on run_walk.interval_samples
for delete
to authenticated
using (
  exists (
    select 1
    from run_walk.interval_sessions s
    where s.id = session_id
      and s.user_id = auth.uid()
  )
);

do $$
begin
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'user'
      and p.proname = 'on_outdoor_session_completed'
  ) then
    execute 'drop trigger if exists trg_interval_session_completed on run_walk.interval_sessions';
    execute 'create trigger trg_interval_session_completed
      after insert or update of status, ended_at, duration_s, distance_m, elev_gain_m, activity_type, timezone_str
      on run_walk.interval_sessions
      for each row
      execute function "user".on_outdoor_session_completed()';

    execute 'drop trigger if exists trg_revert_interval_session_stats on run_walk.interval_sessions';
    execute 'create trigger trg_revert_interval_session_stats
      after delete on run_walk.interval_sessions
      for each row
      execute function run_walk.revert_outdoor_session_from_stats()';
  end if;
end;
$$;

do $$
begin
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'user'
      and p.proname = 'sync_goal_results_from_outdoor_session'
  ) then
    execute 'drop trigger if exists trg_sync_goal_results_from_interval_session on run_walk.interval_sessions';
    execute 'create trigger trg_sync_goal_results_from_interval_session
      after insert or update of user_id, status, started_at, ended_at, duration_s, distance_m
      on run_walk.interval_sessions
      for each row
      execute function "user".sync_goal_results_from_outdoor_session()';

    execute 'drop trigger if exists trg_recompute_goal_results_after_interval_delete on run_walk.interval_sessions';
    execute 'create trigger trg_recompute_goal_results_after_interval_delete
      after delete on run_walk.interval_sessions
      for each row
      execute function "user".sync_goal_results_from_outdoor_session()';
  end if;
end;
$$;

do $$
begin
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'badges'
      and p.proname = 'apply_outdoor_run_badges'
  ) then
    execute 'drop trigger if exists trg_apply_interval_run_badges on run_walk.interval_sessions';
    execute 'create trigger trg_apply_interval_run_badges
      after insert or update of status, ended_at, duration_s, distance_m, elev_gain_m, avg_pace_s_per_km, activity_type, timezone_str
      on run_walk.interval_sessions
      for each row
      execute function badges.apply_outdoor_run_badges()';
  end if;
end;
$$;

do $$
begin
  perform pg_notify('pgrst', 'reload schema');
exception
  when undefined_function then
    null;
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
      '20260622_interval_runs',
      'Added interval run templates, step breakdowns, interval session storage, sampled phase tagging, and reused outdoor stats/goal/badge triggers for completed interval runs.'
    )
    on conflict (change_key) do nothing;
  end if;
end;
$$;

commit;
