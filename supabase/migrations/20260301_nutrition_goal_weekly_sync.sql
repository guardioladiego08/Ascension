begin;

create schema if not exists "user";
create schema if not exists nutrition;
create schema if not exists auth;

alter table if exists "user".weekly_summary
  add column if not exists strength_goal_days_met integer not null default 0,
  add column if not exists cardio_goal_days_met integer not null default 0,
  add column if not exists nutrition_goal_days_met integer not null default 0,
  add column if not exists all_goals_days_met integer not null default 0;

drop function if exists "user".week_start_monday(date);

create function "user".week_start_monday(p_day date)
returns date
language sql
immutable
as $$
  select
    case
      when p_day is null then null
      else p_day - ((extract(dow from p_day)::int + 6) % 7)
    end
$$;

create or replace function "user".ensure_weekly_summary_row(
  p_user_id uuid,
  p_week_start date,
  p_timezone_str text default null
)
returns void
language plpgsql
security definer
set search_path = public, "user"
as $$
declare
  v_tz text := nullif(trim(coalesce(p_timezone_str, '')), '');
  v_user_exists boolean := false;
begin
  if p_user_id is null or p_week_start is null then
    return;
  end if;

  select exists(
    select 1
    from auth.users u
    where u.id = p_user_id
  )
  into v_user_exists;

  if not v_user_exists then
    return;
  end if;

  insert into "user".weekly_summary (user_id, week_start, timezone_str)
  values (p_user_id, p_week_start, coalesce(v_tz, 'UTC'))
  on conflict (user_id, week_start) do update
  set timezone_str = coalesce(excluded.timezone_str, "user".weekly_summary.timezone_str);
end;
$$;

create or replace function "user".sync_weekly_goal_summary(
  p_user_id uuid,
  p_goal_date date,
  p_timezone_str text default null
)
returns void
language plpgsql
security definer
set search_path = public, "user", nutrition
as $$
declare
  v_week_start date := "user".week_start_monday(p_goal_date);
  v_week_end date := v_week_start + 6;
  v_tz text := nullif(trim(coalesce(p_timezone_str, '')), '');
  v_strength_goal_days_met integer := 0;
  v_cardio_goal_days_met integer := 0;
  v_nutrition_goal_days_met integer := 0;
  v_all_goals_days_met integer := 0;
begin
  if p_user_id is null or p_goal_date is null or v_week_start is null then
    return;
  end if;

  if v_tz is null then
    select coalesce(
      (
        select nullif(trim(coalesce(r.timezone_str, '')), '')
        from "user".daily_goal_results r
        where r.user_id = p_user_id
          and r.date >= v_week_start
          and r.date <= v_week_end
          and nullif(trim(coalesce(r.timezone_str, '')), '') is not null
        order by r.date desc
        limit 1
      ),
      (
        select nullif(trim(coalesce(d.timezone_str, '')), '')
        from nutrition.diary_days d
        where d.user_id = p_user_id
          and d.date >= v_week_start
          and d.date <= v_week_end
          and nullif(trim(coalesce(d.timezone_str, '')), '') is not null
        order by d.date desc
        limit 1
      ),
      'UTC'
    )
    into v_tz;
  end if;

  perform "user".ensure_weekly_summary_row(p_user_id, v_week_start, v_tz);

  select
    count(*) filter (where coalesce(r.strength_met, false))::integer,
    count(*) filter (where coalesce(r.cardio_met, false))::integer,
    count(*) filter (where coalesce(r.nutrition_met, false))::integer,
    count(*) filter (where coalesce(r.met_all, false))::integer
  into
    v_strength_goal_days_met,
    v_cardio_goal_days_met,
    v_nutrition_goal_days_met,
    v_all_goals_days_met
  from "user".daily_goal_results r
  where r.user_id = p_user_id
    and r.date >= v_week_start
    and r.date <= v_week_end;

  update "user".weekly_summary
  set strength_goal_days_met = coalesce(v_strength_goal_days_met, 0),
      cardio_goal_days_met = coalesce(v_cardio_goal_days_met, 0),
      nutrition_goal_days_met = coalesce(v_nutrition_goal_days_met, 0),
      all_goals_days_met = coalesce(v_all_goals_days_met, 0)
  where user_id = p_user_id
    and week_start = v_week_start;
end;
$$;

create or replace function "user".sync_nutrition_summaries(
  p_user_id uuid,
  p_goal_date date,
  p_timezone_str text default null
)
returns void
language plpgsql
security definer
set search_path = public, "user", nutrition
as $$
declare
  v_week_start date := "user".week_start_monday(p_goal_date);
  v_week_end date := v_week_start + 6;
  v_tz text := nullif(trim(coalesce(p_timezone_str, '')), '');
  v_week_kcal integer := 0;
begin
  if p_user_id is null or p_goal_date is null or v_week_start is null then
    return;
  end if;

  if v_tz is null then
    select coalesce(
      (
        select nullif(trim(coalesce(d.timezone_str, '')), '')
        from nutrition.diary_days d
        where d.user_id = p_user_id
          and d.date >= v_week_start
          and d.date <= v_week_end
          and nullif(trim(coalesce(d.timezone_str, '')), '') is not null
        order by d.date desc
        limit 1
      ),
      (
        select timezone_str
        from "user".weekly_summary ws
        where ws.user_id = p_user_id
          and ws.week_start = v_week_start
        limit 1
      ),
      'UTC'
    )
    into v_tz;
  end if;

  perform "user".ensure_weekly_summary_row(p_user_id, v_week_start, v_tz);

  select coalesce(sum(coalesce(d.kcal_total, 0)), 0)::integer
  into v_week_kcal
  from nutrition.diary_days d
  where d.user_id = p_user_id
    and d.date >= v_week_start
    and d.date <= v_week_end;

  update "user".weekly_summary
  set total_kcal_consumed = coalesce(v_week_kcal, 0)
  where user_id = p_user_id
    and week_start = v_week_start;

  if to_regclass('"user".lifetime_stats') is not null then
    execute '
      insert into "user".lifetime_stats (user_id, timezone_str)
      values ($1, $2)
      on conflict (user_id) do update
      set timezone_str = coalesce(excluded.timezone_str, "user".lifetime_stats.timezone_str)
    '
    using p_user_id, v_tz;

    execute '
      update "user".lifetime_stats
      set total_kcal_consumed = (
        select coalesce(sum(coalesce(d.kcal_total, 0)), 0)::integer
        from nutrition.diary_days d
        where d.user_id = $1
      )
      where user_id = $1
    '
    using p_user_id;
  end if;
end;
$$;

create or replace function "user".sync_weekly_goal_summary_from_daily_goal_results()
returns trigger
language plpgsql
security definer
set search_path = public, "user", nutrition
as $$
begin
  if tg_op = 'DELETE' then
    if old.user_id is not null and old.date is not null then
      update nutrition.diary_days
      set goal_hit = false
      where user_id = old.user_id
        and date = old.date;

      perform "user".sync_weekly_goal_summary(old.user_id, old.date, old.timezone_str);
    end if;
    return old;
  end if;

  if tg_op = 'UPDATE'
     and old.user_id is not null
     and old.date is not null
     and (old.user_id <> new.user_id or old.date <> new.date) then
    update nutrition.diary_days
    set goal_hit = false
    where user_id = old.user_id
      and date = old.date;

    perform "user".sync_weekly_goal_summary(old.user_id, old.date, old.timezone_str);
  end if;

  if new.user_id is not null and new.date is not null then
    update nutrition.diary_days
    set goal_hit = coalesce(new.nutrition_met, false)
    where user_id = new.user_id
      and date = new.date;

    perform "user".sync_weekly_goal_summary(new.user_id, new.date, new.timezone_str);
  end if;

  return new;
end;
$$;

create or replace function "user".sync_weekly_nutrition_summary_from_diary_day()
returns trigger
language plpgsql
security definer
set search_path = public, "user", nutrition
as $$
begin
  if tg_op = 'DELETE' then
    if old.user_id is not null and old.date is not null then
      perform "user".sync_nutrition_summaries(old.user_id, old.date, old.timezone_str);
    end if;
    return old;
  end if;

  if tg_op = 'UPDATE'
     and old.user_id is not null
     and old.date is not null
     and (old.user_id <> new.user_id or old.date <> new.date) then
    perform "user".sync_nutrition_summaries(old.user_id, old.date, old.timezone_str);
  end if;

  if new.user_id is not null and new.date is not null then
    perform "user".sync_nutrition_summaries(new.user_id, new.date, new.timezone_str);
  end if;

  return new;
end;
$$;

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'user'
      and table_name = 'daily_goal_results'
  ) then
    execute 'drop trigger if exists trg_sync_weekly_goal_summary_from_daily_goal_results on "user".daily_goal_results';
    execute 'create trigger trg_sync_weekly_goal_summary_from_daily_goal_results
      after insert or update of user_id, date, timezone_str, strength_met, cardio_met, nutrition_met, met_all
      on "user".daily_goal_results
      for each row
      execute function "user".sync_weekly_goal_summary_from_daily_goal_results()';

    execute 'drop trigger if exists trg_sync_weekly_goal_summary_after_daily_goal_results_delete on "user".daily_goal_results';
    execute 'create trigger trg_sync_weekly_goal_summary_after_daily_goal_results_delete
      after delete on "user".daily_goal_results
      for each row
      execute function "user".sync_weekly_goal_summary_from_daily_goal_results()';
  end if;

  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'nutrition'
      and table_name = 'diary_days'
  ) then
    execute 'drop trigger if exists trg_sync_weekly_nutrition_summary_from_diary_day on nutrition.diary_days';
    execute 'create trigger trg_sync_weekly_nutrition_summary_from_diary_day
      after insert or update of user_id, date, timezone_str, kcal_total
      on nutrition.diary_days
      for each row
      execute function "user".sync_weekly_nutrition_summary_from_diary_day()';

    execute 'drop trigger if exists trg_sync_weekly_nutrition_summary_after_diary_day_delete on nutrition.diary_days';
    execute 'create trigger trg_sync_weekly_nutrition_summary_after_diary_day_delete
      after delete on nutrition.diary_days
      for each row
      execute function "user".sync_weekly_nutrition_summary_from_diary_day()';
  end if;
end;
$$;

insert into "user".weekly_summary (
  user_id,
  week_start,
  timezone_str
)
select distinct
  src.user_id,
  src.week_start,
  src.timezone_str
from (
  select
    d.user_id,
    "user".week_start_monday(d.date) as week_start,
    coalesce(nullif(trim(coalesce(d.timezone_str, '')), ''), 'UTC') as timezone_str
  from nutrition.diary_days d

  union

  select
    r.user_id,
    "user".week_start_monday(r.date) as week_start,
    coalesce(nullif(trim(coalesce(r.timezone_str, '')), ''), 'UTC') as timezone_str
  from "user".daily_goal_results r
) src
join auth.users u
  on u.id = src.user_id
where src.user_id is not null
  and src.week_start is not null
on conflict (user_id, week_start) do update
set timezone_str = coalesce(excluded.timezone_str, "user".weekly_summary.timezone_str);

update nutrition.diary_days d
set goal_hit = coalesce((
  select r.nutrition_met
  from "user".daily_goal_results r
  where r.user_id = d.user_id
    and r.date = d.date
  limit 1
), false);

update "user".weekly_summary ws
set total_kcal_consumed = coalesce((
      select sum(coalesce(d.kcal_total, 0))::integer
      from nutrition.diary_days d
      where d.user_id = ws.user_id
        and d.date >= ws.week_start
        and d.date <= ws.week_start + 6
    ), 0),
    strength_goal_days_met = coalesce((
      select count(*)::integer
      from "user".daily_goal_results r
      where r.user_id = ws.user_id
        and r.date >= ws.week_start
        and r.date <= ws.week_start + 6
        and coalesce(r.strength_met, false)
    ), 0),
    cardio_goal_days_met = coalesce((
      select count(*)::integer
      from "user".daily_goal_results r
      where r.user_id = ws.user_id
        and r.date >= ws.week_start
        and r.date <= ws.week_start + 6
        and coalesce(r.cardio_met, false)
    ), 0),
    nutrition_goal_days_met = coalesce((
      select count(*)::integer
      from "user".daily_goal_results r
      where r.user_id = ws.user_id
        and r.date >= ws.week_start
        and r.date <= ws.week_start + 6
        and coalesce(r.nutrition_met, false)
    ), 0),
    all_goals_days_met = coalesce((
      select count(*)::integer
      from "user".daily_goal_results r
      where r.user_id = ws.user_id
        and r.date >= ws.week_start
        and r.date <= ws.week_start + 6
        and coalesce(r.met_all, false)
    ), 0);

do $$
begin
  if to_regclass('"user".lifetime_stats') is not null then
    execute '
      insert into "user".lifetime_stats (user_id, timezone_str)
      select
        d.user_id,
        max(coalesce(nullif(trim(coalesce(d.timezone_str, '''')), ''''), ''UTC''))
      from nutrition.diary_days d
      join auth.users u
        on u.id = d.user_id
      group by d.user_id
      on conflict (user_id) do update
      set timezone_str = coalesce(excluded.timezone_str, "user".lifetime_stats.timezone_str)
    ';

    execute '
      update "user".lifetime_stats ls
      set total_kcal_consumed = coalesce((
        select sum(coalesce(d.kcal_total, 0))::integer
        from nutrition.diary_days d
        where d.user_id = ls.user_id
      ), 0)
    ';
  end if;
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
      '20260301_nutrition_goal_weekly_sync',
      'Synced nutrition diary changes into weekly and lifetime calorie summaries, weekly goal counts, and diary goal-hit flags.'
    )
    on conflict (change_key) do nothing;
  end if;
end;
$$;

commit;
