-- Rename weekly_summary distance columns from miles naming to meter naming.
-- If both legacy and canonical columns exist, merge values and drop legacy mile columns.

begin;

create schema if not exists "user";

do $$
declare
  v_has_miles_biked boolean := false;
  v_has_miles_ran boolean := false;
  v_has_miles_walked boolean := false;
  v_has_miles_run_walk boolean := false;

  v_has_m_biked boolean := false;
  v_has_m_ran boolean := false;
  v_has_m_walked boolean := false;
  v_has_m_run_walk boolean := false;
begin
  select exists (
    select 1 from information_schema.columns
    where table_schema = 'user' and table_name = 'weekly_summary' and column_name = 'total_miles_biked'
  ) into v_has_miles_biked;
  select exists (
    select 1 from information_schema.columns
    where table_schema = 'user' and table_name = 'weekly_summary' and column_name = 'total_miles_ran'
  ) into v_has_miles_ran;
  select exists (
    select 1 from information_schema.columns
    where table_schema = 'user' and table_name = 'weekly_summary' and column_name = 'total_miles_walked'
  ) into v_has_miles_walked;
  select exists (
    select 1 from information_schema.columns
    where table_schema = 'user' and table_name = 'weekly_summary' and column_name = 'total_miles_run_walk'
  ) into v_has_miles_run_walk;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'user' and table_name = 'weekly_summary' and column_name = 'total_distance_biked_m'
  ) into v_has_m_biked;
  select exists (
    select 1 from information_schema.columns
    where table_schema = 'user' and table_name = 'weekly_summary' and column_name = 'total_distance_ran_m'
  ) into v_has_m_ran;
  select exists (
    select 1 from information_schema.columns
    where table_schema = 'user' and table_name = 'weekly_summary' and column_name = 'total_distance_walked_m'
  ) into v_has_m_walked;
  select exists (
    select 1 from information_schema.columns
    where table_schema = 'user' and table_name = 'weekly_summary' and column_name = 'total_distance_run_walk_m'
  ) into v_has_m_run_walk;

  if v_has_miles_biked then
    if v_has_m_biked then
      execute '
        update "user".weekly_summary
        set total_distance_biked_m = round(
          greatest(coalesce(total_distance_biked_m, 0), coalesce(total_miles_biked, 0) * 1609.344),
          2
        )
      ';
      execute 'alter table "user".weekly_summary drop column total_miles_biked';
    else
      execute 'alter table "user".weekly_summary rename column total_miles_biked to total_distance_biked_m';
    end if;
  end if;

  if v_has_miles_ran then
    if v_has_m_ran then
      execute '
        update "user".weekly_summary
        set total_distance_ran_m = round(
          greatest(coalesce(total_distance_ran_m, 0), coalesce(total_miles_ran, 0) * 1609.344),
          2
        )
      ';
      execute 'alter table "user".weekly_summary drop column total_miles_ran';
    else
      execute 'alter table "user".weekly_summary rename column total_miles_ran to total_distance_ran_m';
    end if;
  end if;

  if v_has_miles_walked then
    if v_has_m_walked then
      execute '
        update "user".weekly_summary
        set total_distance_walked_m = round(
          greatest(coalesce(total_distance_walked_m, 0), coalesce(total_miles_walked, 0) * 1609.344),
          2
        )
      ';
      execute 'alter table "user".weekly_summary drop column total_miles_walked';
    else
      execute 'alter table "user".weekly_summary rename column total_miles_walked to total_distance_walked_m';
    end if;
  end if;

  if v_has_miles_run_walk then
    if v_has_m_run_walk then
      execute '
        update "user".weekly_summary
        set total_distance_run_walk_m = round(
          greatest(coalesce(total_distance_run_walk_m, 0), coalesce(total_miles_run_walk, 0) * 1609.344),
          2
        )
      ';
      execute 'alter table "user".weekly_summary drop column total_miles_run_walk';
    else
      execute 'alter table "user".weekly_summary rename column total_miles_run_walk to total_distance_run_walk_m';
    end if;
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
      '20260227_rename_weekly_distance_columns_to_meters',
      'Removed weekly_summary mile-named distance columns and standardized meter naming with *_m suffix.'
    )
    on conflict (change_key) do nothing;
  end if;
end;
$$;

commit;
