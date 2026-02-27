-- Fix legacy strength stats RPCs that reference removed columns
-- (e.g. lifetime_stats.total_miles_biked).
-- Safe to run multiple times.

begin;

create schema if not exists "user";

create or replace function "user".apply_strength_workout_stats_delta(
  p_date date,
  p_timezone_str text default null,
  p_delta_workouts integer default 0,
  p_delta_hours double precision default 0,
  p_delta_weight_kg double precision default 0
)
returns void
language plpgsql
security definer
set search_path = public, "user"
as $$
declare
  v_uid uuid := auth.uid();
  v_week_start date;

  v_has_weekly boolean;
  v_has_lifetime boolean;

  v_has_weekly_user_id boolean;
  v_has_weekly_week_start boolean;
  v_has_weekly_workouts boolean;
  v_has_weekly_hours boolean;
  v_has_weekly_weight boolean;
  v_has_weekly_updated_at boolean;

  v_has_lifetime_user_id boolean;
  v_has_lifetime_workouts boolean;
  v_has_lifetime_hours boolean;
  v_has_lifetime_weight boolean;
  v_has_lifetime_updated_at boolean;

  v_set_parts text[];
  v_sql text;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  -- Monday-start week from provided local date
  v_week_start := p_date - ((extract(dow from p_date)::int + 6) % 7);

  select exists (
    select 1
    from information_schema.tables
    where table_schema = 'user'
      and table_name = 'weekly_summary'
  ) into v_has_weekly;

  select exists (
    select 1
    from information_schema.tables
    where table_schema = 'user'
      and table_name = 'lifetime_stats'
  ) into v_has_lifetime;

  if v_has_weekly then
    select exists (
      select 1 from information_schema.columns
      where table_schema = 'user' and table_name = 'weekly_summary' and column_name = 'user_id'
    ) into v_has_weekly_user_id;
    select exists (
      select 1 from information_schema.columns
      where table_schema = 'user' and table_name = 'weekly_summary' and column_name = 'week_start'
    ) into v_has_weekly_week_start;
    select exists (
      select 1 from information_schema.columns
      where table_schema = 'user' and table_name = 'weekly_summary' and column_name = 'workouts_count'
    ) into v_has_weekly_workouts;
    select exists (
      select 1 from information_schema.columns
      where table_schema = 'user' and table_name = 'weekly_summary' and column_name = 'total_hours'
    ) into v_has_weekly_hours;
    select exists (
      select 1 from information_schema.columns
      where table_schema = 'user' and table_name = 'weekly_summary' and column_name = 'total_weight_lifted_kg'
    ) into v_has_weekly_weight;
    select exists (
      select 1 from information_schema.columns
      where table_schema = 'user' and table_name = 'weekly_summary' and column_name = 'updated_at'
    ) into v_has_weekly_updated_at;

    if v_has_weekly_user_id and v_has_weekly_week_start then
      begin
        execute
          'insert into "user".weekly_summary (user_id, week_start)
           values ($1, $2)
           on conflict do nothing'
        using v_uid, v_week_start;
      exception
        when others then
          null;
      end;

      v_set_parts := array[]::text[];
      if v_has_weekly_workouts then
        v_set_parts := array_append(
          v_set_parts,
          format(
            'workouts_count = greatest(0, coalesce(workouts_count, 0) + %s)',
            p_delta_workouts
          )
        );
      end if;
      if v_has_weekly_hours then
        v_set_parts := array_append(
          v_set_parts,
          format(
            'total_hours = greatest(0, coalesce(total_hours, 0) + (%L)::double precision)',
            p_delta_hours
          )
        );
      end if;
      if v_has_weekly_weight then
        v_set_parts := array_append(
          v_set_parts,
          format(
            'total_weight_lifted_kg = greatest(0, coalesce(total_weight_lifted_kg, 0) + (%L)::double precision)',
            p_delta_weight_kg
          )
        );
      end if;
      if v_has_weekly_updated_at then
        v_set_parts := array_append(v_set_parts, 'updated_at = timezone(''utc'', now())');
      end if;

      if array_length(v_set_parts, 1) > 0 then
        v_sql := format(
          'update "user".weekly_summary set %s where user_id = $1 and week_start = $2',
          array_to_string(v_set_parts, ', ')
        );
        execute v_sql using v_uid, v_week_start;
      end if;
    end if;
  end if;

  if v_has_lifetime then
    select exists (
      select 1 from information_schema.columns
      where table_schema = 'user' and table_name = 'lifetime_stats' and column_name = 'user_id'
    ) into v_has_lifetime_user_id;
    select exists (
      select 1 from information_schema.columns
      where table_schema = 'user' and table_name = 'lifetime_stats' and column_name = 'workouts_count'
    ) into v_has_lifetime_workouts;
    select exists (
      select 1 from information_schema.columns
      where table_schema = 'user' and table_name = 'lifetime_stats' and column_name = 'total_hours'
    ) into v_has_lifetime_hours;
    select exists (
      select 1 from information_schema.columns
      where table_schema = 'user' and table_name = 'lifetime_stats' and column_name = 'total_weight_lifted_kg'
    ) into v_has_lifetime_weight;
    select exists (
      select 1 from information_schema.columns
      where table_schema = 'user' and table_name = 'lifetime_stats' and column_name = 'updated_at'
    ) into v_has_lifetime_updated_at;

    if v_has_lifetime_user_id then
      begin
        execute
          'insert into "user".lifetime_stats (user_id)
           values ($1)
           on conflict do nothing'
        using v_uid;
      exception
        when others then
          null;
      end;

      v_set_parts := array[]::text[];
      if v_has_lifetime_workouts then
        v_set_parts := array_append(
          v_set_parts,
          format(
            'workouts_count = greatest(0, coalesce(workouts_count, 0) + %s)',
            p_delta_workouts
          )
        );
      end if;
      if v_has_lifetime_hours then
        v_set_parts := array_append(
          v_set_parts,
          format(
            'total_hours = greatest(0, coalesce(total_hours, 0) + (%L)::double precision)',
            p_delta_hours
          )
        );
      end if;
      if v_has_lifetime_weight then
        v_set_parts := array_append(
          v_set_parts,
          format(
            'total_weight_lifted_kg = greatest(0, coalesce(total_weight_lifted_kg, 0) + (%L)::double precision)',
            p_delta_weight_kg
          )
        );
      end if;
      if v_has_lifetime_updated_at then
        v_set_parts := array_append(v_set_parts, 'updated_at = timezone(''utc'', now())');
      end if;

      if array_length(v_set_parts, 1) > 0 then
        v_sql := format(
          'update "user".lifetime_stats set %s where user_id = $1',
          array_to_string(v_set_parts, ', ')
        );
        execute v_sql using v_uid;
      end if;
    end if;
  end if;
end;
$$;

create or replace function "user".increment_strength_workout_stats(
  p_date date,
  p_timezone_str text default null,
  p_duration_hours double precision default 0,
  p_total_weight_lifted_kg double precision default 0
)
returns void
language plpgsql
security definer
set search_path = public, "user"
as $$
begin
  perform "user".apply_strength_workout_stats_delta(
    p_date => p_date,
    p_timezone_str => p_timezone_str,
    p_delta_workouts => 1,
    p_delta_hours => greatest(0, coalesce(p_duration_hours, 0)),
    p_delta_weight_kg => greatest(0, coalesce(p_total_weight_lifted_kg, 0))
  );
end;
$$;

create or replace function "user".decrement_strength_workout_stats(
  p_date date,
  p_timezone_str text default null,
  p_duration_hours double precision default 0,
  p_total_weight_lifted_kg double precision default 0
)
returns void
language plpgsql
security definer
set search_path = public, "user"
as $$
begin
  perform "user".apply_strength_workout_stats_delta(
    p_date => p_date,
    p_timezone_str => p_timezone_str,
    p_delta_workouts => -1,
    p_delta_hours => -greatest(0, coalesce(p_duration_hours, 0)),
    p_delta_weight_kg => -greatest(0, coalesce(p_total_weight_lifted_kg, 0))
  );
end;
$$;

grant execute on function "user".apply_strength_workout_stats_delta(date, text, integer, double precision, double precision) to authenticated;
grant execute on function "user".increment_strength_workout_stats(date, text, double precision, double precision) to authenticated;
grant execute on function "user".decrement_strength_workout_stats(date, text, double precision, double precision) to authenticated;

create table if not exists public.schema_change_log (
  change_key text primary key,
  description text not null,
  changed_at timestamptz not null default timezone('utc', now())
);

insert into public.schema_change_log (change_key, description)
values (
  '20260226_fix_strength_stats_rpc_legacy_columns',
  'Replaced increment/decrement_strength_workout_stats with schema-safe versions that do not reference legacy lifetime_stats columns.'
)
on conflict (change_key) do nothing;

commit;
