begin;

drop function if exists public.get_profile_feed_user(uuid, integer, integer, text);
create function public.get_profile_feed_user(
  p_user_id uuid,
  p_limit integer default 20,
  p_offset integer default 0,
  p_activity_type text default null
)
returns table (
  id uuid,
  user_id uuid,
  activity_type text,
  source_type text,
  source_id uuid,
  session_id uuid,
  title text,
  subtitle text,
  caption text,
  metrics jsonb,
  media_urls text[],
  visibility text,
  created_at timestamptz,
  like_count integer,
  comment_count integer
)
language sql
stable
security definer
set search_path = public, social
as $$
  with me as (
    select auth.uid() as uid
  )
  select
    p.id,
    p.user_id,
    p.activity_type,
    p.source_type,
    p.source_id,
    p.session_id,
    p.title,
    p.subtitle,
    p.caption,
    p.metrics,
    p.media_urls,
    p.visibility,
    p.created_at,
    p.like_count,
    p.comment_count
  from social.posts p
  where p.user_id = p_user_id
    and (p_activity_type is null or p.activity_type = p_activity_type)
    and social.can_view_post((select uid from me), p.user_id, p.visibility)
  order by p.created_at desc
  limit greatest(coalesce(p_limit, 20), 1)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

grant execute on function public.get_profile_feed_user(uuid, integer, integer, text) to authenticated;

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
      '20260410_profile_feed_visibility_rpc',
      'Added visibility-safe profile feed RPC that returns posts for a specific user even when social schema is not client-exposed.'
    )
    on conflict (change_key) do nothing;
  end if;
end;
$$;

commit;
