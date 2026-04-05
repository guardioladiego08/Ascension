begin;

create schema if not exists strength;

create or replace function social.can_view_strength_workout(
  p_viewer uuid,
  p_owner uuid,
  p_privacy text
)
returns boolean
language plpgsql
stable
security definer
set search_path = public, social, strength
as $$
begin
  if p_owner is null then
    return false;
  end if;

  if p_viewer is not null and p_viewer = p_owner then
    return true;
  end if;

  if p_viewer is not null and social.is_blocked(p_viewer, p_owner) then
    return false;
  end if;

  if social.profile_is_private(p_owner)
     and (p_viewer is null or not social.is_following(p_viewer, p_owner)) then
    return false;
  end if;

  if coalesce(nullif(trim(p_privacy), ''), 'private') = 'public' then
    return true;
  end if;

  if p_viewer is null then
    return false;
  end if;

  if coalesce(nullif(trim(p_privacy), ''), 'private') = 'followers' then
    return social.is_following(p_viewer, p_owner);
  end if;

  return false;
end;
$$;

create or replace function strength.get_workout_muscle_profile(
  p_workout_id uuid
)
returns jsonb
language sql
stable
set search_path = public, strength
as $$
  with axes(axis_key) as (
    values
      ('chest'::text),
      ('back'::text),
      ('shoulders'::text),
      ('arms'::text),
      ('core'::text),
      ('quads'::text),
      ('posterior_chain'::text),
      ('calves'::text)
  ),
  exercise_inputs as (
    select
      source.exercise_id,
      coalesce(
        max(case when source.volume_weight > 0 then source.volume_weight end),
        max(case when source.set_count > 0 then source.set_count end),
        1::numeric
      ) as contribution_weight
    from (
      select
        es.exercise_id,
        coalesce(es.vol, 0)::numeric as volume_weight,
        null::numeric as set_count
      from strength.exercise_summary es
      where es.strength_workout_id = p_workout_id

      union all

      select
        ss.exercise_id,
        null::numeric as volume_weight,
        count(*)::numeric as set_count
      from strength.strength_sets ss
      where ss.strength_workout_id = p_workout_id
      group by ss.exercise_id
    ) source
    where source.exercise_id is not null
    group by source.exercise_id
  ),
  exercise_profiles as (
    select
      ei.exercise_id,
      ei.contribution_weight,
      coalesce(e.body_part_weights, '[]'::jsonb) as body_part_weights
    from exercise_inputs ei
    join public.exercises e
      on e.id = ei.exercise_id
  ),
  exploded as (
    select
      ep.contribution_weight,
      lower(trim(coalesce(weight_row.value ->> 'muscle', ''))) as muscle_key,
      case
        when jsonb_typeof(weight_row.value -> 'weight') = 'number' then
          greatest((weight_row.value ->> 'weight')::numeric, 0::numeric)
        else 0::numeric
      end as muscle_weight
    from exercise_profiles ep
    cross join lateral jsonb_array_elements(ep.body_part_weights) as weight_row(value)
  ),
  mapped as (
    select
      case
        when e.muscle_key = 'chest' then 'chest'
        when e.muscle_key = 'back' then 'back'
        when e.muscle_key = 'shoulders' then 'shoulders'
        when e.muscle_key in ('biceps', 'triceps', 'forearms') then 'arms'
        when e.muscle_key = 'core' then 'core'
        when e.muscle_key = 'quads' then 'quads'
        when e.muscle_key in ('glutes', 'hamstrings') then 'posterior_chain'
        when e.muscle_key = 'calves' then 'calves'
        else null
      end as axis_key,
      e.contribution_weight * e.muscle_weight as contribution
    from exploded e
    where e.muscle_key <> 'full_body'
      and e.muscle_weight > 0

    union all

    select
      axes.axis_key,
      e.contribution_weight * e.muscle_weight / 8::numeric as contribution
    from exploded e
    join axes on true
    where e.muscle_key = 'full_body'
      and e.muscle_weight > 0
  ),
  axis_totals as (
    select
      axes.axis_key,
      coalesce(sum(mapped.contribution), 0::numeric) as axis_total
    from axes
    left join mapped
      on mapped.axis_key = axes.axis_key
    group by axes.axis_key
  ),
  normalized as (
    select
      axis_totals.axis_key,
      case
        when max(axis_totals.axis_total) over () > 0 then
          round(axis_totals.axis_total / max(axis_totals.axis_total) over (), 4)
        else 0::numeric
      end as axis_value
    from axis_totals
  )
  select jsonb_build_object(
    'chest', coalesce((select axis_value from normalized where axis_key = 'chest'), 0::numeric),
    'back', coalesce((select axis_value from normalized where axis_key = 'back'), 0::numeric),
    'shoulders', coalesce((select axis_value from normalized where axis_key = 'shoulders'), 0::numeric),
    'arms', coalesce((select axis_value from normalized where axis_key = 'arms'), 0::numeric),
    'core', coalesce((select axis_value from normalized where axis_key = 'core'), 0::numeric),
    'quads', coalesce((select axis_value from normalized where axis_key = 'quads'), 0::numeric),
    'posterior_chain', coalesce((select axis_value from normalized where axis_key = 'posterior_chain'), 0::numeric),
    'calves', coalesce((select axis_value from normalized where axis_key = 'calves'), 0::numeric)
  );
$$;

drop function if exists public.get_strength_workout_muscle_profile_user(uuid);
drop function if exists public.get_strength_workout_muscle_profile_user(uuid, uuid);
create function public.get_strength_workout_muscle_profile_user(
  p_workout_id uuid,
  p_post_id uuid default null
)
returns table (
  workout_id uuid,
  muscle_profile jsonb,
  can_delete boolean
)
language plpgsql
security definer
set search_path = public, social, strength
as $$
declare
  v_me uuid := auth.uid();
  v_workout strength.strength_workouts%rowtype;
  v_visibility text;
begin
  if v_me is null then
    raise exception 'Not authenticated';
  end if;

  if p_workout_id is null then
    raise exception 'Workout ID is required';
  end if;

  select w.*
  into v_workout
  from strength.strength_workouts w
  where w.id = p_workout_id
  limit 1;

  if v_workout.id is null then
    raise exception 'Workout not found';
  end if;

  if v_workout.user_id <> v_me then
    if p_post_id is not null then
      select p.visibility
      into v_visibility
      from social.posts p
      where p.id = p_post_id
        and p.user_id = v_workout.user_id
        and p.session_id = p_workout_id
      limit 1;
    end if;

    if v_visibility is null then
      select p.visibility
      into v_visibility
      from social.posts p
      where p.user_id = v_workout.user_id
        and p.session_id = p_workout_id
        and p.activity_type = 'strength'
      order by p.created_at desc
      limit 1;
    end if;

    if v_visibility is not null and social.can_view_post(v_me, v_workout.user_id, v_visibility) then
      null;
    elsif not social.can_view_strength_workout(
      v_me,
      v_workout.user_id,
      coalesce(v_workout.privacy::text, 'private')
    ) then
      raise exception 'Not allowed';
    end if;
  end if;

  return query
  select
    v_workout.id,
    strength.get_workout_muscle_profile(p_workout_id),
    (v_workout.user_id = v_me);
end;
$$;

drop function if exists public.get_strength_workout_summary_user(uuid);
drop function if exists public.get_strength_workout_summary_user(uuid, uuid);
create function public.get_strength_workout_summary_user(
  p_workout_id uuid,
  p_post_id uuid default null
)
returns table (
  workout jsonb,
  exercise_summary jsonb,
  sets jsonb,
  muscle_profile jsonb,
  can_delete boolean
)
language plpgsql
security definer
set search_path = public, social, strength
as $$
declare
  v_me uuid := auth.uid();
  v_workout strength.strength_workouts%rowtype;
  v_visibility text;
begin
  if v_me is null then
    raise exception 'Not authenticated';
  end if;

  if p_workout_id is null then
    raise exception 'Workout ID is required';
  end if;

  select w.*
  into v_workout
  from strength.strength_workouts w
  where w.id = p_workout_id
  limit 1;

  if v_workout.id is null then
    raise exception 'Workout not found';
  end if;

  if v_workout.user_id <> v_me then
    if p_post_id is not null then
      select p.visibility
      into v_visibility
      from social.posts p
      where p.id = p_post_id
        and p.user_id = v_workout.user_id
        and p.session_id = p_workout_id
      limit 1;
    end if;

    if v_visibility is null then
      select p.visibility
      into v_visibility
      from social.posts p
      where p.user_id = v_workout.user_id
        and p.session_id = p_workout_id
        and p.activity_type = 'strength'
      order by p.created_at desc
      limit 1;
    end if;

    if v_visibility is not null and social.can_view_post(v_me, v_workout.user_id, v_visibility) then
      null;
    elsif not social.can_view_strength_workout(
      v_me,
      v_workout.user_id,
      coalesce(v_workout.privacy::text, 'private')
    ) then
      raise exception 'Not allowed';
    end if;
  end if;

  return query
  select
    to_jsonb(v_workout),
    coalesce(
      (
        select jsonb_agg(to_jsonb(es) order by es.exercise_id)
        from strength.exercise_summary es
        where es.strength_workout_id = p_workout_id
      ),
      '[]'::jsonb
    ),
    coalesce(
      (
        select jsonb_agg(to_jsonb(ss) order by ss.exercise_id, ss.set_index)
        from strength.strength_sets ss
        where ss.strength_workout_id = p_workout_id
      ),
      '[]'::jsonb
    ),
    strength.get_workout_muscle_profile(p_workout_id),
    (v_workout.user_id = v_me);
end;
$$;

drop function if exists public.list_visible_strength_activity_cards_user(uuid, integer, integer);
create function public.list_visible_strength_activity_cards_user(
  p_user_id uuid,
  p_limit integer default 24,
  p_offset integer default 0
)
returns table (
  id uuid,
  started_at timestamptz,
  duration_s integer,
  total_volume_kg numeric,
  muscle_profile jsonb
)
language plpgsql
security definer
set search_path = public, social, strength
as $$
declare
  v_me uuid := auth.uid();
begin
  if v_me is null then
    raise exception 'Not authenticated';
  end if;

  if p_user_id is null then
    return;
  end if;

  if social.is_blocked(v_me, p_user_id) then
    return;
  end if;

  if social.profile_is_private(p_user_id)
     and v_me <> p_user_id
     and not social.is_following(v_me, p_user_id) then
    return;
  end if;

  return query
  select
    w.id,
    w.started_at,
    case
      when w.started_at is not null
        and w.ended_at is not null
        and w.ended_at >= w.started_at
      then extract(epoch from (w.ended_at - w.started_at))::integer
      else null::integer
    end as duration_s,
    coalesce(w.total_vol, 0)::numeric as total_volume_kg,
    strength.get_workout_muscle_profile(w.id) as muscle_profile
  from strength.strength_workouts w
  where w.user_id = p_user_id
    and (
      v_me = p_user_id
      or social.can_view_strength_workout(
        v_me,
        p_user_id,
        coalesce(w.privacy::text, 'private')
      )
    )
  order by w.started_at desc nulls last, w.id desc
  limit greatest(1, least(coalesce(p_limit, 24), 100))
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

grant execute on function public.get_strength_workout_muscle_profile_user(uuid, uuid) to authenticated;
grant execute on function public.get_strength_workout_summary_user(uuid, uuid) to authenticated;
grant execute on function public.list_visible_strength_activity_cards_user(uuid, integer, integer) to authenticated;

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
      '20260402_strength_muscle_profile_radar_support',
      'Added strength workout muscle-profile aggregation plus visibility-safe summary and activity-card RPCs for radar-style social and profile previews.'
    )
    on conflict (change_key) do nothing;
  end if;
end;
$$;

commit;
