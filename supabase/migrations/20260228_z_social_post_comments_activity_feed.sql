begin;

create or replace function social.notify_like_event()
returns trigger
language plpgsql
security definer
set search_path = public, social
as $$
declare
  v_owner uuid;
begin
  select p.user_id into v_owner
  from social.posts p
  where p.id = new.post_id;

  if v_owner is not null and v_owner <> new.user_id then
    insert into social.notifications (recipient_id, actor_id, kind, entity_type, entity_id, message)
    values (v_owner, new.user_id, 'post_like', 'post', new.post_id, 'liked your post');
  end if;

  return new;
end;
$$;

create or replace function social.cleanup_like_event()
returns trigger
language plpgsql
security definer
set search_path = public, social
as $$
declare
  v_owner uuid;
begin
  select p.user_id into v_owner
  from social.posts p
  where p.id = old.post_id;

  if v_owner is not null then
    delete from social.notifications
    where recipient_id = v_owner
      and actor_id = old.user_id
      and kind = 'post_like'
      and entity_type = 'post'
      and entity_id = old.post_id;
  end if;

  return old;
end;
$$;

create or replace function social.notify_comment_event()
returns trigger
language plpgsql
security definer
set search_path = public, social
as $$
declare
  v_owner uuid;
begin
  select p.user_id into v_owner
  from social.posts p
  where p.id = new.post_id;

  if v_owner is not null and v_owner <> new.user_id then
    insert into social.notifications (recipient_id, actor_id, kind, entity_type, entity_id, message)
    values (
      v_owner,
      new.user_id,
      'post_comment',
      'comment',
      new.id,
      coalesce('commented: ' || left(nullif(trim(new.body), ''), 160), 'commented on your post')
    );
  end if;

  return new;
end;
$$;

create or replace function social.cleanup_comment_event()
returns trigger
language plpgsql
security definer
set search_path = public, social
as $$
begin
  delete from social.notifications
  where kind = 'post_comment'
    and entity_type = 'comment'
    and entity_id = old.id;

  return old;
end;
$$;

drop function if exists public.list_post_likes_user(uuid, integer);
create function public.list_post_likes_user(
  p_post_id uuid,
  p_limit integer default 20
)
returns table (
  user_id uuid,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public, social
as $$
  select
    pl.user_id,
    pl.created_at
  from social.post_likes pl
  join social.posts p on p.id = pl.post_id
  where pl.post_id = p_post_id
    and social.can_view_post(auth.uid(), p.user_id, p.visibility)
  order by pl.created_at desc
  limit greatest(1, least(coalesce(p_limit, 20), 100));
$$;

drop function if exists public.list_post_comments_user(uuid, integer, integer);
create function public.list_post_comments_user(
  p_post_id uuid,
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  id uuid,
  post_id uuid,
  user_id uuid,
  parent_comment_id uuid,
  body text,
  created_at timestamptz,
  updated_at timestamptz,
  can_delete boolean
)
language sql
stable
security definer
set search_path = public, social
as $$
  select
    c.id,
    c.post_id,
    c.user_id,
    c.parent_comment_id,
    c.body,
    c.created_at,
    c.updated_at,
    (auth.uid() = c.user_id or auth.uid() = p.user_id) as can_delete
  from social.post_comments c
  join social.posts p on p.id = c.post_id
  where c.post_id = p_post_id
    and social.can_view_post(auth.uid(), p.user_id, p.visibility)
  order by c.created_at asc, c.id asc
  limit greatest(1, least(coalesce(p_limit, 50), 200))
  offset greatest(coalesce(p_offset, 0), 0);
$$;

drop function if exists public.create_post_comment_user(uuid, text, uuid);
create function public.create_post_comment_user(
  p_post_id uuid,
  p_body text,
  p_parent_comment_id uuid default null
)
returns table (
  id uuid,
  post_id uuid,
  user_id uuid,
  parent_comment_id uuid,
  body text,
  created_at timestamptz,
  updated_at timestamptz,
  can_delete boolean
)
language plpgsql
security definer
set search_path = public, social
as $$
declare
  v_me uuid := auth.uid();
  v_post social.posts%rowtype;
  v_comment social.post_comments%rowtype;
  v_body text := nullif(trim(coalesce(p_body, '')), '');
begin
  if v_me is null then
    raise exception 'Not authenticated';
  end if;

  if p_post_id is null then
    raise exception 'Post ID is required';
  end if;

  if v_body is null then
    raise exception 'Comment cannot be empty';
  end if;

  select *
  into v_post
  from social.posts p
  where p.id = p_post_id
  limit 1;

  if v_post.id is null then
    raise exception 'Post not found';
  end if;

  if not social.can_view_post(v_me, v_post.user_id, v_post.visibility) then
    raise exception 'Not allowed';
  end if;

  if p_parent_comment_id is not null and not exists (
    select 1
    from social.post_comments c
    where c.id = p_parent_comment_id
      and c.post_id = p_post_id
  ) then
    raise exception 'Parent comment not found';
  end if;

  insert into social.post_comments (post_id, user_id, parent_comment_id, body)
  values (p_post_id, v_me, p_parent_comment_id, v_body)
  returning * into v_comment;

  return query
  select
    v_comment.id,
    v_comment.post_id,
    v_comment.user_id,
    v_comment.parent_comment_id,
    v_comment.body,
    v_comment.created_at,
    v_comment.updated_at,
    true;
end;
$$;

drop function if exists public.delete_post_comment_user(uuid);
create function public.delete_post_comment_user(
  p_comment_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public, social
as $$
declare
  v_me uuid := auth.uid();
  v_comment_user_id uuid;
  v_post_owner_id uuid;
  v_deleted boolean := false;
begin
  if v_me is null then
    raise exception 'Not authenticated';
  end if;

  if p_comment_id is null then
    return false;
  end if;

  select c.user_id, p.user_id
  into v_comment_user_id, v_post_owner_id
  from social.post_comments c
  join social.posts p on p.id = c.post_id
  where c.id = p_comment_id
  limit 1;

  if v_comment_user_id is null then
    return false;
  end if;

  if v_me <> v_comment_user_id and v_me <> v_post_owner_id then
    raise exception 'Not allowed';
  end if;

  delete from social.post_comments
  where social.post_comments.id = p_comment_id
  returning true into v_deleted;

  return coalesce(v_deleted, false);
end;
$$;

drop policy if exists post_comments_delete on social.post_comments;
create policy post_comments_delete on social.post_comments
for delete to authenticated
using (
  auth.uid() = user_id
  or exists (
    select 1
    from social.posts p
    where p.id = post_comments.post_id
      and p.user_id = auth.uid()
  )
);

drop trigger if exists post_likes_notifications_insert on social.post_likes;
create trigger post_likes_notifications_insert
after insert on social.post_likes
for each row execute function social.notify_like_event();

drop trigger if exists post_likes_notifications_delete on social.post_likes;
create trigger post_likes_notifications_delete
after delete on social.post_likes
for each row execute function social.cleanup_like_event();

drop trigger if exists post_comments_notifications_insert on social.post_comments;
create trigger post_comments_notifications_insert
after insert on social.post_comments
for each row execute function social.notify_comment_event();

drop trigger if exists post_comments_notifications_delete on social.post_comments;
create trigger post_comments_notifications_delete
after delete on social.post_comments
for each row execute function social.cleanup_comment_event();

grant execute on function public.list_post_likes_user(uuid, integer) to authenticated;
grant execute on function public.list_post_comments_user(uuid, integer, integer) to authenticated;
grant execute on function public.create_post_comment_user(uuid, text, uuid) to authenticated;
grant execute on function public.delete_post_comment_user(uuid) to authenticated;

commit;
