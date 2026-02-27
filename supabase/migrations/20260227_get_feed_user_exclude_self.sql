-- Ensure feed only returns posts from accepted followees, not the viewer's own posts.

drop function if exists public.get_feed_user(integer, integer, text);

create function public.get_feed_user(
  p_limit integer default 20,
  p_offset integer default 0,
  p_activity_type text default null
)
returns table (
  id uuid,
  user_id uuid,
  activity_type text,
  title text,
  subtitle text,
  caption text,
  metrics jsonb,
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
  ),
  author_set as (
    select f.followee_id as user_id
    from social.follows f
    join me on me.uid = f.follower_id
    where f.status = 'accepted'
  )
  select
    p.id,
    p.user_id,
    p.activity_type,
    p.title,
    p.subtitle,
    p.caption,
    p.metrics,
    p.visibility,
    p.created_at,
    p.like_count,
    p.comment_count
  from social.posts p
  join author_set a on a.user_id = p.user_id
  where (p_activity_type is null or p.activity_type = p_activity_type)
    and social.can_view_post((select uid from me), p.user_id, p.visibility)
  order by p.created_at desc
  limit greatest(coalesce(p_limit, 20), 1)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

grant execute on function public.get_feed_user(integer, integer, text) to authenticated;
