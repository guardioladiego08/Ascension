# Social Integration Plan

## High-Level Changes

1. Add a dedicated `social` schema in Supabase with core social tables:
- `follows`, `blocks`
- `posts`, `media_files`
- `post_likes`, `post_comments`
- `notifications`
- `user_feed_cache`

2. Enforce data access and privacy with RLS and helper functions:
- Post visibility checks (`public`, `followers`, `private`)
- Follow/block guard rails
- Per-user access for notifications and feed cache

3. Add social automation in SQL:
- Follow normalization trigger
- Like/comment counters on posts
- Notification triggers for follows, likes, comments

4. Replace mock social feed with live Supabase data:
- Fetch feed from `social.posts` for self + accepted followees
- Filter by activity type
- Pull-to-refresh and pagination
- Like/unlike interactions

5. Connect profile stats to real social counts:
- Posts/followers/following now computed from `social.posts` + `social.follows`

6. Connect session completion to social sharing:
- Indoor run/walk summary now has a `Share to social feed` option
- Save session and (optionally) create/update a social post

## Execution Steps

1. Run the SQL migration:
- File: `supabase/social_foundation.sql`
- Run in Supabase SQL Editor as a single script.

2. Validate DB objects after migration:
- Confirm tables exist in `social` schema.
- Confirm RLS is enabled and policies are attached.
- Confirm triggers exist on `follows`, `post_likes`, and `post_comments`.

3. Validate app flows end-to-end:
- Search users and open a profile.
- Follow/unfollow and approve/decline requests.
- Save an indoor session with `Share to social feed` enabled.
- Open Social tab and verify post appears in feed.
- Like/unlike a post and verify counts update.

4. Production rollout recommendation:
- Deploy DB migration first.
- Deploy app update second.
- Monitor PostgREST errors for missing tables/policies.

## Files Updated

- `supabase/social_foundation.sql`
- `lib/social/feed.ts`
- `lib/social/api.ts`
- `lib/social/index.ts`
- `lib/profile/social.ts`
- `app/(tabs)/social.tsx`
- `app/(tabs)/social/components/ActivityTab.tsx`
- `app/(tabs)/profile.tsx`
- `app/(tabs)/social/[userId].tsx`
- `app/(tabs)/add/Cardio/indoor/IndoorSessionSummary.tsx`
