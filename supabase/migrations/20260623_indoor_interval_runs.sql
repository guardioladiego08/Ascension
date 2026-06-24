begin;

create schema if not exists run_walk;

create table if not exists run_walk.indoor_interval_templates (
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

create table if not exists run_walk.indoor_interval_template_steps (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references run_walk.indoor_interval_templates (id) on delete cascade,
  sequence_index integer not null check (sequence_index >= 0),
  phase_kind text not null check (phase_kind in ('warmup', 'work', 'recovery', 'rest', 'cooldown')),
  phase_label text not null check (char_length(btrim(phase_label)) between 1 and 80),
  duration_s integer not null check (duration_s > 0),
  cue_text text null,
  interval_index integer null check (interval_index is null or interval_index > 0),
  created_at timestamptz not null default timezone('utc', now()),
  constraint indoor_interval_template_steps_unique_sequence unique (template_id, sequence_index)
);

create table if not exists run_walk.indoor_interval_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  template_id uuid null references run_walk.indoor_interval_templates (id) on delete set null,
  template_name_snapshot text not null check (char_length(btrim(template_name_snapshot)) between 1 and 120),
  template_description_snapshot text null,
  template_benefit_snapshot text null,
  template_source text not null default 'custom' check (template_source in ('custom', 'preset')),
  exercise_type text not null default 'indoor_run' check (lower(exercise_type) = 'indoor_run'),
  status text not null default 'in_progress' check (status in ('in_progress', 'completed', 'canceled')),
  started_at timestamptz not null,
  ended_at timestamptz null,
  total_time_s integer not null default 0 check (total_time_s >= 0),
  total_distance_m double precision not null default 0 check (total_distance_m >= 0),
  total_elevation_m double precision not null default 0 check (total_elevation_m >= 0),
  avg_speed_mps double precision null check (avg_speed_mps is null or avg_speed_mps >= 0),
  avg_pace_s_per_km double precision null check (avg_pace_s_per_km is null or avg_pace_s_per_km > 0),
  avg_pace_s_per_mi double precision null check (avg_pace_s_per_mi is null or avg_pace_s_per_mi > 0),
  timezone_str text null,
  total_steps_count integer not null default 0 check (total_steps_count >= 0),
  completed_steps_count integer not null default 0 check (completed_steps_count >= 0),
  total_intervals_count integer not null default 0 check (total_intervals_count >= 0),
  completed_intervals_count integer not null default 0 check (completed_intervals_count >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists run_walk.indoor_interval_session_steps (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references run_walk.indoor_interval_sessions (id) on delete cascade,
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
  constraint indoor_interval_session_steps_unique_sequence unique (session_id, sequence_index)
);

create table if not exists run_walk.indoor_interval_samples (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references run_walk.indoor_interval_sessions (id) on delete cascade,
  recorded_at timestamptz not null,
  elapsed_s integer not null check (elapsed_s >= 0),
  distance_m double precision null,
  speed_mps double precision null,
  pace_s_per_km double precision null,
  pace_s_per_mi double precision null,
  incline_deg double precision null,
  elevation_m double precision null,
  hr_bpm integer null,
  phase_kind text null check (phase_kind is null or phase_kind in ('warmup', 'work', 'recovery', 'rest', 'cooldown')),
  session_step_index integer null check (session_step_index is null or session_step_index >= 0),
  interval_index integer null check (interval_index is null or interval_index > 0),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists indoor_interval_templates_user_created_idx
  on run_walk.indoor_interval_templates (user_id, created_at desc);

create index if not exists indoor_interval_template_steps_template_sequence_idx
  on run_walk.indoor_interval_template_steps (template_id, sequence_index);

create index if not exists indoor_interval_sessions_user_started_idx
  on run_walk.indoor_interval_sessions (user_id, started_at desc);

create index if not exists indoor_interval_sessions_status_ended_idx
  on run_walk.indoor_interval_sessions (status, ended_at desc nulls last);

create index if not exists indoor_interval_session_steps_session_sequence_idx
  on run_walk.indoor_interval_session_steps (session_id, sequence_index);

create index if not exists indoor_interval_samples_session_elapsed_idx
  on run_walk.indoor_interval_samples (session_id, elapsed_s);

alter table if exists run_walk.indoor_interval_templates enable row level security;
alter table if exists run_walk.indoor_interval_template_steps enable row level security;
alter table if exists run_walk.indoor_interval_sessions enable row level security;
alter table if exists run_walk.indoor_interval_session_steps enable row level security;
alter table if exists run_walk.indoor_interval_samples enable row level security;

grant select, insert, update, delete on table run_walk.indoor_interval_templates to authenticated;
grant select, insert, update, delete on table run_walk.indoor_interval_template_steps to authenticated;
grant select, insert, update, delete on table run_walk.indoor_interval_sessions to authenticated;
grant select, insert, update, delete on table run_walk.indoor_interval_session_steps to authenticated;
grant select, insert, update, delete on table run_walk.indoor_interval_samples to authenticated;

drop policy if exists indoor_interval_templates_select_own on run_walk.indoor_interval_templates;
create policy indoor_interval_templates_select_own
on run_walk.indoor_interval_templates
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists indoor_interval_templates_insert_own on run_walk.indoor_interval_templates;
create policy indoor_interval_templates_insert_own
on run_walk.indoor_interval_templates
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists indoor_interval_templates_update_own on run_walk.indoor_interval_templates;
create policy indoor_interval_templates_update_own
on run_walk.indoor_interval_templates
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists indoor_interval_templates_delete_own on run_walk.indoor_interval_templates;
create policy indoor_interval_templates_delete_own
on run_walk.indoor_interval_templates
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists indoor_interval_template_steps_select_own on run_walk.indoor_interval_template_steps;
create policy indoor_interval_template_steps_select_own
on run_walk.indoor_interval_template_steps
for select
to authenticated
using (
  exists (
    select 1
    from run_walk.indoor_interval_templates t
    where t.id = template_id
      and t.user_id = auth.uid()
  )
);

drop policy if exists indoor_interval_template_steps_insert_own on run_walk.indoor_interval_template_steps;
create policy indoor_interval_template_steps_insert_own
on run_walk.indoor_interval_template_steps
for insert
to authenticated
with check (
  exists (
    select 1
    from run_walk.indoor_interval_templates t
    where t.id = template_id
      and t.user_id = auth.uid()
  )
);

drop policy if exists indoor_interval_template_steps_update_own on run_walk.indoor_interval_template_steps;
create policy indoor_interval_template_steps_update_own
on run_walk.indoor_interval_template_steps
for update
to authenticated
using (
  exists (
    select 1
    from run_walk.indoor_interval_templates t
    where t.id = template_id
      and t.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from run_walk.indoor_interval_templates t
    where t.id = template_id
      and t.user_id = auth.uid()
  )
);

drop policy if exists indoor_interval_template_steps_delete_own on run_walk.indoor_interval_template_steps;
create policy indoor_interval_template_steps_delete_own
on run_walk.indoor_interval_template_steps
for delete
to authenticated
using (
  exists (
    select 1
    from run_walk.indoor_interval_templates t
    where t.id = template_id
      and t.user_id = auth.uid()
  )
);

drop policy if exists indoor_interval_sessions_select_own on run_walk.indoor_interval_sessions;
create policy indoor_interval_sessions_select_own
on run_walk.indoor_interval_sessions
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists indoor_interval_sessions_insert_own on run_walk.indoor_interval_sessions;
create policy indoor_interval_sessions_insert_own
on run_walk.indoor_interval_sessions
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists indoor_interval_sessions_update_own on run_walk.indoor_interval_sessions;
create policy indoor_interval_sessions_update_own
on run_walk.indoor_interval_sessions
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists indoor_interval_sessions_delete_own on run_walk.indoor_interval_sessions;
create policy indoor_interval_sessions_delete_own
on run_walk.indoor_interval_sessions
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists indoor_interval_session_steps_select_own on run_walk.indoor_interval_session_steps;
create policy indoor_interval_session_steps_select_own
on run_walk.indoor_interval_session_steps
for select
to authenticated
using (
  exists (
    select 1
    from run_walk.indoor_interval_sessions s
    where s.id = session_id
      and s.user_id = auth.uid()
  )
);

drop policy if exists indoor_interval_session_steps_insert_own on run_walk.indoor_interval_session_steps;
create policy indoor_interval_session_steps_insert_own
on run_walk.indoor_interval_session_steps
for insert
to authenticated
with check (
  exists (
    select 1
    from run_walk.indoor_interval_sessions s
    where s.id = session_id
      and s.user_id = auth.uid()
  )
);

drop policy if exists indoor_interval_session_steps_update_own on run_walk.indoor_interval_session_steps;
create policy indoor_interval_session_steps_update_own
on run_walk.indoor_interval_session_steps
for update
to authenticated
using (
  exists (
    select 1
    from run_walk.indoor_interval_sessions s
    where s.id = session_id
      and s.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from run_walk.indoor_interval_sessions s
    where s.id = session_id
      and s.user_id = auth.uid()
  )
);

drop policy if exists indoor_interval_session_steps_delete_own on run_walk.indoor_interval_session_steps;
create policy indoor_interval_session_steps_delete_own
on run_walk.indoor_interval_session_steps
for delete
to authenticated
using (
  exists (
    select 1
    from run_walk.indoor_interval_sessions s
    where s.id = session_id
      and s.user_id = auth.uid()
  )
);

drop policy if exists indoor_interval_samples_select_own on run_walk.indoor_interval_samples;
create policy indoor_interval_samples_select_own
on run_walk.indoor_interval_samples
for select
to authenticated
using (
  exists (
    select 1
    from run_walk.indoor_interval_sessions s
    where s.id = session_id
      and s.user_id = auth.uid()
  )
);

drop policy if exists indoor_interval_samples_insert_own on run_walk.indoor_interval_samples;
create policy indoor_interval_samples_insert_own
on run_walk.indoor_interval_samples
for insert
to authenticated
with check (
  exists (
    select 1
    from run_walk.indoor_interval_sessions s
    where s.id = session_id
      and s.user_id = auth.uid()
  )
);

drop policy if exists indoor_interval_samples_update_own on run_walk.indoor_interval_samples;
create policy indoor_interval_samples_update_own
on run_walk.indoor_interval_samples
for update
to authenticated
using (
  exists (
    select 1
    from run_walk.indoor_interval_sessions s
    where s.id = session_id
      and s.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from run_walk.indoor_interval_sessions s
    where s.id = session_id
      and s.user_id = auth.uid()
  )
);

drop policy if exists indoor_interval_samples_delete_own on run_walk.indoor_interval_samples;
create policy indoor_interval_samples_delete_own
on run_walk.indoor_interval_samples
for delete
to authenticated
using (
  exists (
    select 1
    from run_walk.indoor_interval_sessions s
    where s.id = session_id
      and s.user_id = auth.uid()
  )
);

create or replace function "user".on_indoor_interval_session_completed()
returns trigger
language plpgsql
security definer
set search_path = public, "user", run_walk
as $$
declare
  v_old_completed boolean := false;
  v_new_completed boolean := false;
begin
  if tg_op = 'INSERT' then
    if new.status = 'completed' then
      perform "user".apply_indoor_run_walk_stats_delta(
        new.user_id,
        new.ended_at,
        new.timezone_str,
        new.exercise_type::text,
        new.total_time_s,
        new.total_distance_m,
        new.total_elevation_m,
        1
      );
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' then
    v_old_completed := old.status = 'completed';
    v_new_completed := new.status = 'completed';

    if v_old_completed then
      perform "user".apply_indoor_run_walk_stats_delta(
        old.user_id,
        old.ended_at,
        old.timezone_str,
        old.exercise_type::text,
        old.total_time_s,
        old.total_distance_m,
        old.total_elevation_m,
        -1
      );
    end if;

    if v_new_completed then
      perform "user".apply_indoor_run_walk_stats_delta(
        new.user_id,
        new.ended_at,
        new.timezone_str,
        new.exercise_type::text,
        new.total_time_s,
        new.total_distance_m,
        new.total_elevation_m,
        1
      );
    end if;
  end if;

  return new;
end;
$$;

create or replace function run_walk.revert_indoor_interval_session_from_stats()
returns trigger
language plpgsql
security definer
set search_path = public, "user", run_walk
as $$
begin
  if old.status = 'completed' then
    perform "user".apply_indoor_run_walk_stats_delta(
      old.user_id,
      old.ended_at,
      old.timezone_str,
      old.exercise_type::text,
      old.total_time_s,
      old.total_distance_m,
      old.total_elevation_m,
      -1
    );
  end if;

  return old;
end;
$$;

drop trigger if exists trg_indoor_interval_session_completed on run_walk.indoor_interval_sessions;
create trigger trg_indoor_interval_session_completed
after insert or update of status, ended_at, total_time_s, total_distance_m, total_elevation_m, exercise_type, timezone_str
on run_walk.indoor_interval_sessions
for each row
execute function "user".on_indoor_interval_session_completed();

drop trigger if exists trg_revert_indoor_interval_session_stats on run_walk.indoor_interval_sessions;
create trigger trg_revert_indoor_interval_session_stats
after delete on run_walk.indoor_interval_sessions
for each row
execute function run_walk.revert_indoor_interval_session_from_stats();

do $$
begin
  if exists (
    select 1
    from pg_namespace n
    where n.nspname = 'badges'
  )
  and exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'badges'
      and p.proname = 'local_day'
  )
  and exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'badges'
      and p.proname = 'local_week_start'
  )
  and exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'badges'
      and p.proname = 'is_running_activity'
  ) then
    execute $badge_fn$
      create or replace function badges.running_completed_sessions(
        p_user_id uuid
      )
      returns table (
        source_id uuid,
        source_type text,
        ended_at timestamptz,
        local_day date,
        week_start date,
        duration_s integer,
        distance_m numeric,
        elevation_m numeric,
        avg_speed_mps numeric
      )
      language sql
      stable
      security definer
      set search_path = public, badges, run_walk
      as $running_completed_sessions$
        with indoor_rows as (
          select
            s.id as source_id,
            'run_walk_session'::text as source_type,
            s.ended_at,
            badges.local_day(s.ended_at, s.timezone_str) as local_day,
            badges.local_week_start(s.ended_at, s.timezone_str) as week_start,
            coalesce(s.total_time_s, 0)::integer as duration_s,
            coalesce(s.total_distance_m, 0)::numeric as distance_m,
            coalesce(s.total_elevation_m, 0)::numeric as elevation_m,
            case
              when coalesce(s.total_time_s, 0) > 0 and coalesce(s.total_distance_m, 0) > 0
                then coalesce(s.total_distance_m, 0)::numeric / coalesce(s.total_time_s, 0)::numeric
              else 0::numeric
            end as avg_speed_mps
          from run_walk.sessions s
          where s.user_id = p_user_id
            and s.status = 'completed'
            and s.ended_at is not null
            and badges.is_running_activity(s.exercise_type::text)
        ),
        indoor_interval_rows as (
          select
            s.id as source_id,
            'run_walk_session'::text as source_type,
            s.ended_at,
            badges.local_day(s.ended_at, s.timezone_str) as local_day,
            badges.local_week_start(s.ended_at, s.timezone_str) as week_start,
            coalesce(s.total_time_s, 0)::integer as duration_s,
            coalesce(s.total_distance_m, 0)::numeric as distance_m,
            coalesce(s.total_elevation_m, 0)::numeric as elevation_m,
            case
              when coalesce(s.total_time_s, 0) > 0 and coalesce(s.total_distance_m, 0) > 0
                then coalesce(s.total_distance_m, 0)::numeric / coalesce(s.total_time_s, 0)::numeric
              else 0::numeric
            end as avg_speed_mps
          from run_walk.indoor_interval_sessions s
          where s.user_id = p_user_id
            and s.status = 'completed'
            and s.ended_at is not null
            and badges.is_running_activity(s.exercise_type::text)
        ),
        outdoor_rows as (
          select
            s.id as source_id,
            'run_walk_session'::text as source_type,
            s.ended_at,
            badges.local_day(s.ended_at, s.timezone_str) as local_day,
            badges.local_week_start(s.ended_at, s.timezone_str) as week_start,
            coalesce(s.duration_s, 0)::integer as duration_s,
            coalesce(s.distance_m, 0)::numeric as distance_m,
            coalesce(s.elev_gain_m, 0)::numeric as elevation_m,
            case
              when coalesce(s.duration_s, 0) > 0 and coalesce(s.distance_m, 0) > 0
                then coalesce(s.distance_m, 0)::numeric / coalesce(s.duration_s, 0)::numeric
              else 0::numeric
            end as avg_speed_mps
          from run_walk.outdoor_sessions s
          where s.user_id = p_user_id
            and s.status = 'completed'
            and s.ended_at is not null
            and badges.is_running_activity(s.activity_type::text)
        )
        select *
        from indoor_rows
        union all
        select *
        from indoor_interval_rows
        union all
        select *
        from outdoor_rows;
      $running_completed_sessions$;
    $badge_fn$;
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
      and p.proname = 'apply_run_walk_session_badges'
  ) then
    execute 'drop trigger if exists trg_apply_indoor_interval_run_badges on run_walk.indoor_interval_sessions';
    execute 'create trigger trg_apply_indoor_interval_run_badges
      after insert or update of status, ended_at, total_time_s, total_distance_m, total_elevation_m, avg_pace_s_per_km, exercise_type, timezone_str
      on run_walk.indoor_interval_sessions
      for each row
      execute function badges.apply_run_walk_session_badges()';
  end if;
end;
$$;

do $$
declare
  v_owner_id uuid;
begin
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'badges'
      and p.proname = 'evaluate_running_badges_for_user'
  ) then
    for v_owner_id in
      select distinct s.user_id
      from run_walk.indoor_interval_sessions s
      where s.user_id is not null
        and s.status = 'completed'
        and s.ended_at is not null
    loop
      perform badges.evaluate_running_badges_for_user(v_owner_id, 'run_walk_session', null);
    end loop;
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
      '20260623_indoor_interval_runs',
      'Added dedicated indoor interval template/session/sample tables plus indoor run stat and running badge hooks without changing the existing open indoor session tables.'
    )
    on conflict (change_key) do nothing;
  end if;
end;
$$;

commit;
