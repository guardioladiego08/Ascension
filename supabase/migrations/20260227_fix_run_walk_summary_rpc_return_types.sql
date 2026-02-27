-- Compatibility copy for clients still referencing this filename in error prompts.
-- Fix 42804: ensure SELECT output types match RETURNS TABLE exactly.

drop function if exists public.get_run_walk_session_summary_user(uuid);
drop function if exists public.get_run_walk_session_summary_user(uuid, uuid);
create function public.get_run_walk_session_summary_user(
  p_session_id uuid,
  p_post_id uuid default null
)
returns table (
  session_id uuid,
  owner_id uuid,
  exercise_type text,
  total_time_s integer,
  total_distance_m double precision,
  total_elevation_m double precision,
  avg_pace_s_per_mi double precision,
  avg_pace_s_per_km double precision,
  samples jsonb,
  can_delete boolean
)
language plpgsql
security definer
set search_path = public, social, run_walk
as $$
declare
  v_me uuid := auth.uid();
  v_session run_walk.sessions%rowtype;
  v_visibility text;
begin
  if v_me is null then
    raise exception 'Not authenticated';
  end if;

  if p_session_id is null then
    raise exception 'Session ID is required';
  end if;

  select s.*
  into v_session
  from run_walk.sessions s
  where s.id = p_session_id
  limit 1;

  if v_session.id is null then
    raise exception 'Session not found';
  end if;

  if v_session.user_id <> v_me then
    if p_post_id is not null then
      select p.visibility
      into v_visibility
      from social.posts p
      where p.id = p_post_id
        and p.user_id = v_session.user_id
        and p.session_id = p_session_id
      limit 1;
    end if;

    if v_visibility is null then
      select p.visibility
      into v_visibility
      from social.posts p
      where p.user_id = v_session.user_id
        and p.session_id = p_session_id
        and p.activity_type in ('run', 'walk', 'ride')
      order by p.created_at desc
      limit 1;
    end if;

    if v_visibility is null or not social.can_view_post(v_me, v_session.user_id, v_visibility) then
      raise exception 'Not allowed';
    end if;
  end if;

  return query
  select
    v_session.id::uuid as session_id,
    v_session.user_id::uuid as owner_id,
    v_session.exercise_type::text as exercise_type,
    coalesce(v_session.total_time_s, 0)::integer as total_time_s,
    coalesce(v_session.total_distance_m, 0)::double precision as total_distance_m,
    coalesce(v_session.total_elevation_m, 0)::double precision as total_elevation_m,
    v_session.avg_pace_s_per_mi::double precision as avg_pace_s_per_mi,
    v_session.avg_pace_s_per_km::double precision as avg_pace_s_per_km,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'elapsed_s', sm.elapsed_s,
            'pace_s_per_mi', sm.pace_s_per_mi,
            'pace_s_per_km', sm.pace_s_per_km,
            'speed_mps', sm.speed_mps,
            'elevation_m', sm.elevation_m,
            'incline_deg', sm.incline_deg
          )
          order by sm.elapsed_s
        )
        from run_walk.samples sm
        where sm.session_id = p_session_id
      ),
      '[]'::jsonb
    )::jsonb as samples,
    (v_session.user_id = v_me)::boolean as can_delete;
end;
$$;

grant execute on function public.get_run_walk_session_summary_user(uuid, uuid) to authenticated;
