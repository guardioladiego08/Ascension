-- Social follow workflow test suite
-- Safe by default: runs in a transaction and rolls back at the end.
--
-- How to use:
-- 1) Replace the 3 UUIDs below with real users from your project.
-- 2) Run this file in Supabase SQL Editor.
-- 3) Read NOTICE lines for PASS markers.

begin;

do $$
declare
  -- Replace with real auth.users IDs before running.
  v_actor uuid := '00000000-0000-0000-0000-000000000001';
  v_public_target uuid := '00000000-0000-0000-0000-000000000002';
  v_private_target uuid := '00000000-0000-0000-0000-000000000003';

  v_status text;
  v_bool boolean;
  v_count bigint;
  v_baseline bigint;
  v_has_user_users boolean;
begin
  if v_actor::text like '00000000-%'
     or v_public_target::text like '00000000-%'
     or v_private_target::text like '00000000-%'
  then
    raise exception 'Set v_actor, v_public_target, and v_private_target UUIDs before running this test.';
  end if;

  if v_actor = v_public_target
     or v_actor = v_private_target
     or v_public_target = v_private_target
  then
    raise exception 'Test users must be distinct.';
  end if;

  -- Validate required users exist.
  if not exists (select 1 from auth.users where id = v_actor) then
    raise exception 'v_actor % not found in auth.users', v_actor;
  end if;
  if not exists (select 1 from auth.users where id = v_public_target) then
    raise exception 'v_public_target % not found in auth.users', v_public_target;
  end if;
  if not exists (select 1 from auth.users where id = v_private_target) then
    raise exception 'v_private_target % not found in auth.users', v_private_target;
  end if;

  -- Make privacy deterministic for the test.
  select exists (
    select 1
    from information_schema.tables
    where table_schema = 'user'
      and table_name = 'users'
  ) into v_has_user_users;

  if v_has_user_users then
    update "user".users set is_private = false where user_id = v_public_target;
    if not found then
      raise exception '"user".users row missing for v_public_target %', v_public_target;
    end if;

    update "user".users set is_private = true where user_id = v_private_target;
    if not found then
      raise exception '"user".users row missing for v_private_target %', v_private_target;
    end if;
  end if;

  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'profiles'
  ) then
    update public.profiles set is_private = false where id = v_public_target;
    update public.profiles set is_private = true where id = v_private_target;
  end if;

  -- Baseline cleanup for deterministic assertions.
  delete from social.follows
  where follower_id = v_actor
    and followee_id in (v_public_target, v_private_target);

  perform set_config('request.jwt.claim.role', 'authenticated', true);

  -- TEST 1: Follow public user -> accepted + new_follower notification.
  perform set_config('request.jwt.claim.sub', v_actor::text, true);
  select count(*) into v_baseline
  from social.notifications
  where recipient_id = v_public_target
    and actor_id = v_actor
    and kind = 'new_follower';

  select public.follow_user(v_public_target) into v_status;
  if v_status <> 'accepted' then
    raise exception 'TEST 1 failed: expected accepted, got %', coalesce(v_status, '<null>');
  end if;

  if not exists (
    select 1
    from social.follows
    where follower_id = v_actor
      and followee_id = v_public_target
      and status = 'accepted'
  ) then
    raise exception 'TEST 1 failed: social.follows missing accepted row for actor->public target';
  end if;

  select count(*) into v_count
  from social.notifications
  where recipient_id = v_public_target
    and actor_id = v_actor
    and kind = 'new_follower';

  if v_count <= v_baseline then
    raise exception 'TEST 1 failed: new_follower notification not created';
  end if;
  raise notice 'PASS TEST 1: follow public -> accepted + new_follower notification';

  -- TEST 2: get_follow_status_user for public target.
  select public.get_follow_status_user(v_public_target) into v_status;
  if v_status <> 'accepted' then
    raise exception 'TEST 2 failed: expected accepted status, got %', coalesce(v_status, '<null>');
  end if;
  raise notice 'PASS TEST 2: get_follow_status_user returns accepted';

  -- TEST 3: Follow private user -> pending/requested + follow_request notification.
  select count(*) into v_baseline
  from social.notifications
  where recipient_id = v_private_target
    and actor_id = v_actor
    and kind = 'follow_request';

  select public.follow_user(v_private_target) into v_status;
  if v_status not in ('pending', 'requested') then
    raise exception 'TEST 3 failed: expected pending/requested, got %', coalesce(v_status, '<null>');
  end if;

  if not exists (
    select 1
    from social.follows
    where follower_id = v_actor
      and followee_id = v_private_target
      and status in ('pending', 'requested')
  ) then
    raise exception 'TEST 3 failed: pending/requested row missing for actor->private target';
  end if;

  select count(*) into v_count
  from social.notifications
  where recipient_id = v_private_target
    and actor_id = v_actor
    and kind = 'follow_request';

  if v_count <= v_baseline then
    raise exception 'TEST 3 failed: follow_request notification not created';
  end if;
  raise notice 'PASS TEST 3: follow private -> pending/requested + follow_request notification';

  -- TEST 4: Inbound requests list for private target includes actor.
  perform set_config('request.jwt.claim.sub', v_private_target::text, true);
  select count(*) into v_count
  from public.list_inbound_follow_requests_user(100, 0) r
  where r.follower_id = v_actor;

  if v_count <> 1 then
    raise exception 'TEST 4 failed: expected 1 inbound request from actor, got %', v_count;
  end if;
  raise notice 'PASS TEST 4: list_inbound_follow_requests_user includes actor';

  -- TEST 5: Accept request -> actor gets follow_accepted notification + accepted status.
  select count(*) into v_baseline
  from social.notifications
  where recipient_id = v_actor
    and actor_id = v_private_target
    and kind = 'follow_accepted';

  select public.accept_follow_request_user(v_actor) into v_bool;
  if coalesce(v_bool, false) is not true then
    raise exception 'TEST 5 failed: accept_follow_request_user returned false';
  end if;

  perform set_config('request.jwt.claim.sub', v_actor::text, true);
  select public.get_follow_status_user(v_private_target) into v_status;
  if v_status <> 'accepted' then
    raise exception 'TEST 5 failed: expected accepted after approval, got %', coalesce(v_status, '<null>');
  end if;

  select count(*) into v_count
  from social.notifications
  where recipient_id = v_actor
    and actor_id = v_private_target
    and kind = 'follow_accepted';

  if v_count <= v_baseline then
    raise exception 'TEST 5 failed: follow_accepted notification not created';
  end if;
  raise notice 'PASS TEST 5: accept request -> accepted + follow_accepted notification';

  -- TEST 6: Following list should include both targets.
  select count(*) into v_count
  from public.list_following_user(v_actor, 200, 0) f
  where f.user_id in (v_public_target, v_private_target);

  if v_count < 2 then
    raise exception 'TEST 6 failed: expected actor following both targets, got % matches', v_count;
  end if;
  raise notice 'PASS TEST 6: list_following_user includes both followed users';

  -- TEST 7: Profile stats wrapper reflects current following count.
  select following into v_count
  from public.get_profile_stats_user(v_actor)
  limit 1;

  if v_count < 2 then
    raise exception 'TEST 7 failed: expected following >= 2, got %', coalesce(v_count, 0);
  end if;
  raise notice 'PASS TEST 7: get_profile_stats_user returns expected following count';

  -- TEST 8: Unfollow private target -> status none + unfollowed notification.
  select count(*) into v_baseline
  from social.notifications
  where recipient_id = v_private_target
    and actor_id = v_actor
    and kind = 'unfollowed';

  select public.unfollow_user(v_private_target) into v_bool;
  if coalesce(v_bool, false) is not true then
    raise exception 'TEST 8 failed: unfollow_user returned false';
  end if;

  select public.get_follow_status_user(v_private_target) into v_status;
  if v_status <> 'none' then
    raise exception 'TEST 8 failed: expected status none after unfollow, got %', coalesce(v_status, '<null>');
  end if;

  select count(*) into v_count
  from social.notifications
  where recipient_id = v_private_target
    and actor_id = v_actor
    and kind = 'unfollowed';

  if v_count <= v_baseline then
    raise exception 'TEST 8 failed: unfollowed notification not created';
  end if;
  raise notice 'PASS TEST 8: unfollow private -> none + unfollowed notification';

  -- TEST 9: Re-request private + outbound list contains pending request.
  select public.follow_user(v_private_target) into v_status;
  if v_status not in ('pending', 'requested') then
    raise exception 'TEST 9 failed: expected pending/requested on re-request, got %', coalesce(v_status, '<null>');
  end if;

  select count(*) into v_count
  from public.list_outbound_follow_requests_user(100, 0) r
  where r.followee_id = v_private_target;

  if v_count <> 1 then
    raise exception 'TEST 9 failed: expected 1 outbound request to private target, got %', v_count;
  end if;
  raise notice 'PASS TEST 9: list_outbound_follow_requests_user shows pending request';

  -- TEST 10: Decline request -> actor status returns none.
  perform set_config('request.jwt.claim.sub', v_private_target::text, true);
  select public.decline_follow_request_user(v_actor) into v_bool;
  if coalesce(v_bool, false) is not true then
    raise exception 'TEST 10 failed: decline_follow_request_user returned false';
  end if;

  perform set_config('request.jwt.claim.sub', v_actor::text, true);
  select public.get_follow_status_user(v_private_target) into v_status;
  if v_status <> 'none' then
    raise exception 'TEST 10 failed: expected status none after decline, got %', coalesce(v_status, '<null>');
  end if;
  raise notice 'PASS TEST 10: decline request -> status none';

  -- TEST 11: Alerts function includes follow kinds.
  select count(*) into v_count
  from public.list_notifications_user(200, 0) n
  where n.kind in ('follow_request', 'follow_accepted', 'new_follower', 'unfollowed');

  if v_count = 0 then
    raise exception 'TEST 11 failed: list_notifications_user returned no follow-related notifications';
  end if;
  raise notice 'PASS TEST 11: list_notifications_user returns follow-related events';

  raise notice 'ALL SOCIAL FOLLOW WORKFLOW TESTS PASSED';
end;
$$;

-- Safety: no persistent data changes.
rollback;

