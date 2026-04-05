begin;

alter table "user".user_preferences
  add column if not exists theme_palette_id text,
  add column if not exists strength_rest_timer_seconds integer;

update "user".user_preferences
set theme_palette_id = case
      when theme_palette_id in (
        'neon_performance',
        'aurora_gradient',
        'solar_activity',
        'cyber_fitness',
        'nature_athlete'
      ) then theme_palette_id
      else null
    end,
    strength_rest_timer_seconds = case
      when strength_rest_timer_seconds is null then null
      else greatest(
        15,
        least(
          300,
          (
            round(
              greatest(15, least(300, strength_rest_timer_seconds))::numeric / 15
            )::integer * 15
          )
        )
      )
    end
where theme_palette_id is not null
   or strength_rest_timer_seconds is not null;

alter table "user".user_preferences
  drop constraint if exists user_preferences_theme_palette_id_check;

alter table "user".user_preferences
  add constraint user_preferences_theme_palette_id_check
  check (
    theme_palette_id is null
    or theme_palette_id in (
      'neon_performance',
      'aurora_gradient',
      'solar_activity',
      'cyber_fitness',
      'nature_athlete'
    )
  );

alter table "user".user_preferences
  drop constraint if exists user_preferences_strength_rest_timer_seconds_check;

alter table "user".user_preferences
  add constraint user_preferences_strength_rest_timer_seconds_check
  check (
    strength_rest_timer_seconds is null
    or (
      strength_rest_timer_seconds between 15 and 300
      and mod(strength_rest_timer_seconds, 15) = 0
    )
  );

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
      '20260402_user_preferences_account_synced_settings',
      'Extended user.user_preferences with account-synced theme palette and strength rest timer settings plus validation constraints.'
    )
    on conflict (change_key) do nothing;
  end if;
end;
$$;

commit;
