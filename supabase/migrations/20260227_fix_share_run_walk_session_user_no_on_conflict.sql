-- Fix share RPC failing with:
-- "there is no unique or exclusion constraint matching the ON CONFLICT specification (42P10)"
-- by removing ON CONFLICT dependency and doing a manual update-then-insert upsert.

drop function if exists public.share_run_walk_session_user(uuid, text, text, text, text, text, jsonb);

create function public.share_run_walk_session_user(
  p_session_id uuid,
  p_activity_type text,
  p_title text,
  p_subtitle text,
  p_caption text,
  p_visibility text,
  p_metrics jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, social
as $$
declare
  v_me uuid := auth.uid();
  v_post_id uuid;
  v_activity_type text := coalesce(nullif(trim(p_activity_type), ''), 'run');
  v_source_type text := case
    when coalesce(nullif(trim(p_activity_type), ''), 'run') = 'strength' then 'strength_workout'
    else 'run_walk_session'
  end;
  v_title text := nullif(trim(coalesce(p_title, '')), '');
  v_subtitle text := nullif(trim(coalesce(p_subtitle, '')), '');
  v_caption text := nullif(trim(coalesce(p_caption, '')), '');
  v_visibility text := coalesce(nullif(trim(p_visibility), ''), 'followers');
  v_metrics jsonb := coalesce(p_metrics, '{}'::jsonb);
begin
  if v_me is null then
    raise exception 'Not authenticated';
  end if;

  if p_session_id is null then
    raise exception 'Session ID is required';
  end if;

  update social.posts p
  set session_id = p_session_id,
      activity_type = v_activity_type,
      title = v_title,
      subtitle = v_subtitle,
      caption = v_caption,
      metrics = v_metrics,
      visibility = v_visibility,
      updated_at = timezone('utc', now())
  where p.user_id = v_me
    and p.source_type = v_source_type
    and p.source_id = p_session_id
  returning p.id into v_post_id;

  if v_post_id is not null then
    return v_post_id;
  end if;

  insert into social.posts (
    user_id,
    source_type,
    source_id,
    session_id,
    activity_type,
    title,
    subtitle,
    caption,
    metrics,
    visibility
  )
  values (
    v_me,
    v_source_type,
    p_session_id,
    p_session_id,
    v_activity_type,
    v_title,
    v_subtitle,
    v_caption,
    v_metrics,
    v_visibility
  )
  returning id into v_post_id;

  return v_post_id;
exception
  when unique_violation then
    -- Handles concurrent inserts if a unique index exists.
    update social.posts p
    set session_id = p_session_id,
        activity_type = v_activity_type,
        title = v_title,
        subtitle = v_subtitle,
        caption = v_caption,
        metrics = v_metrics,
        visibility = v_visibility,
        updated_at = timezone('utc', now())
    where p.user_id = v_me
      and p.source_type = v_source_type
      and p.source_id = p_session_id
    returning p.id into v_post_id;

    if v_post_id is not null then
      return v_post_id;
    end if;

    raise;
end;
$$;

grant execute on function public.share_run_walk_session_user(uuid, text, text, text, text, text, jsonb) to authenticated;
