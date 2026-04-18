begin;

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
  started_at timestamptz,
  ended_at timestamptz,
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
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if p_session_id is null then
    raise exception 'Session ID is required';
  end if;

  if not exists (
    select 1
    from run_walk.sessions s
    where s.id = p_session_id
  ) then
    raise exception 'Session not found';
  end if;

  if not exists (
    select 1
    from run_walk.sessions s
    left join lateral (
      select coalesce(
        (
          select p.visibility
          from social.posts p
          where p_post_id is not null
            and p.id = p_post_id
            and p.user_id = s.user_id
            and p.session_id = s.id
          limit 1
        ),
        (
          select p.visibility
          from social.posts p
          where p.user_id = s.user_id
            and p.session_id = s.id
            and p.activity_type in ('run', 'walk', 'ride')
          order by p.created_at desc
          limit 1
        )
      ) as visibility
    ) pv on true
    where s.id = p_session_id
      and (
        s.user_id = auth.uid()
        or (
          pv.visibility is not null
          and social.can_view_post(auth.uid(), s.user_id, pv.visibility)
        )
      )
  ) then
    raise exception 'Not allowed';
  end if;

  return query
  select
    s.id::uuid as session_id,
    s.user_id::uuid as owner_id,
    s.exercise_type::text as exercise_type,
    s.started_at::timestamptz as started_at,
    s.ended_at::timestamptz as ended_at,
    coalesce(s.total_time_s, 0)::integer as total_time_s,
    coalesce(s.total_distance_m, 0)::double precision as total_distance_m,
    coalesce(s.total_elevation_m, 0)::double precision as total_elevation_m,
    s.avg_pace_s_per_mi::double precision as avg_pace_s_per_mi,
    s.avg_pace_s_per_km::double precision as avg_pace_s_per_km,
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
    (s.user_id = auth.uid())::boolean as can_delete
  from run_walk.sessions s
  where s.id = p_session_id
  limit 1;
end;
$$;

drop function if exists public.get_outdoor_session_summary_user(uuid);
drop function if exists public.get_outdoor_session_summary_user(uuid, uuid);
create function public.get_outdoor_session_summary_user(
  p_session_id uuid,
  p_post_id uuid default null
)
returns table (
  session_id uuid,
  owner_id uuid,
  activity_type text,
  started_at timestamptz,
  ended_at timestamptz,
  duration_s integer,
  distance_m double precision,
  elev_gain_m double precision,
  avg_pace_s_per_km double precision,
  avg_speed_mps double precision,
  samples jsonb,
  can_delete boolean
)
language plpgsql
security definer
set search_path = public, social, run_walk
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if p_session_id is null then
    raise exception 'Session ID is required';
  end if;

  if not exists (
    select 1
    from run_walk.outdoor_sessions s
    where s.id = p_session_id
  ) then
    raise exception 'Session not found';
  end if;

  if not exists (
    select 1
    from run_walk.outdoor_sessions s
    left join lateral (
      select coalesce(
        (
          select p.visibility
          from social.posts p
          where p_post_id is not null
            and p.id = p_post_id
            and p.user_id = s.user_id
            and p.session_id = s.id
          limit 1
        ),
        (
          select p.visibility
          from social.posts p
          where p.user_id = s.user_id
            and p.session_id = s.id
            and p.activity_type in ('run', 'walk', 'ride')
          order by p.created_at desc
          limit 1
        )
      ) as visibility
    ) pv on true
    where s.id = p_session_id
      and (
        s.user_id = auth.uid()
        or social.can_view_post(
          auth.uid(),
          s.user_id,
          coalesce(pv.visibility, coalesce(s.privacy::text, 'private'))
        )
      )
  ) then
    raise exception 'Not allowed';
  end if;

  return query
  select
    s.id::uuid as session_id,
    s.user_id::uuid as owner_id,
    s.activity_type::text as activity_type,
    s.started_at::timestamptz as started_at,
    s.ended_at::timestamptz as ended_at,
    coalesce(s.duration_s, 0)::integer as duration_s,
    coalesce(s.distance_m, 0)::double precision as distance_m,
    coalesce(s.elev_gain_m, 0)::double precision as elev_gain_m,
    s.avg_pace_s_per_km::double precision as avg_pace_s_per_km,
    s.avg_speed_mps::double precision as avg_speed_mps,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'ts', sm.ts,
            'elapsed_s', sm.elapsed_s,
            'lat', sm.lat,
            'lon', sm.lon,
            'altitude_m', sm.altitude_m,
            'accuracy_m', sm.accuracy_m,
            'speed_mps', sm.speed_mps,
            'bearing_deg', sm.bearing_deg,
            'hr_bpm', sm.hr_bpm,
            'cadence_spm', sm.cadence_spm,
            'grade_pct', sm.grade_pct,
            'distance_m', sm.distance_m,
            'is_moving', sm.is_moving,
            'source', sm.source
          )
          order by sm.ts
        )
        from run_walk.outdoor_samples sm
        where sm.session_id = p_session_id
      ),
      '[]'::jsonb
    )::jsonb as samples,
    (s.user_id = auth.uid())::boolean as can_delete
  from run_walk.outdoor_sessions s
  where s.id = p_session_id
  limit 1;
end;
$$;

grant execute on function public.get_run_walk_session_summary_user(uuid, uuid) to authenticated;
grant execute on function public.get_outdoor_session_summary_user(uuid, uuid) to authenticated;

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
      '20260410_run_walk_summary_source_parity',
      'Aligned indoor and outdoor run/walk summary RPCs for visibility-safe shared viewing and parity with own-session summary sources.'
    )
    on conflict (change_key) do nothing;
  end if;
end;
$$;

commit;
