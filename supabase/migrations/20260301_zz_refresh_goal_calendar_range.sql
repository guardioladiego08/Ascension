begin;

create or replace function "user".refresh_my_goal_calendar_range(
  p_start date,
  p_end date
)
returns setof "user".daily_goal_results
language plpgsql
security definer
set search_path = public, "user"
as $$
declare
  v_uid uuid := auth.uid();
  v_start date;
  v_end date;
  v_goal_date date;
  v_row "user".daily_goal_results%rowtype;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  if p_start is null or p_end is null then
    return;
  end if;

  v_start := least(p_start, p_end);
  v_end := greatest(p_start, p_end);
  v_goal_date := v_start;

  while v_goal_date <= v_end loop
    v_row := "user".recompute_daily_goal_results(v_uid, v_goal_date);
    if v_row is not null then
      return next v_row;
    end if;

    v_goal_date := v_goal_date + 1;
  end loop;

  return;
end;
$$;

grant execute on function "user".refresh_my_goal_calendar_range(date, date) to authenticated;

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
      '20260301_zz_refresh_goal_calendar_range',
      'Added a goal-calendar range refresh RPC so the profile calendar can recompute month rows before rendering.'
    )
    on conflict (change_key) do nothing;
  end if;
end;
$$;

commit;
