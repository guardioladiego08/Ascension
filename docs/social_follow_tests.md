# Social Follow Workflow Tests

This test suite validates your social follow/request/unfollow behavior at the database layer.

## File

- [`supabase/tests/social_follow_workflow.sql`](/Users/diegoguardiola/Desktop/Ascension-main/supabase/tests/social_follow_workflow.sql)

## Scope Covered

The script covers:

1. `follow_user` on a **public** target:
- relationship is `accepted`
- `new_follower` notification is created

2. `get_follow_status_user` returns expected status.

3. `follow_user` on a **private** target:
- relationship is `pending/requested`
- `follow_request` notification is created

4. `list_inbound_follow_requests_user` includes the requester.

5. `accept_follow_request_user`:
- sets relationship to `accepted`
- creates `follow_accepted` notification for requester

6. `list_following_user` includes accepted follows.

7. `get_profile_stats_user` reflects following count.

8. `unfollow_user`:
- relationship is removed (`none` status)
- `unfollowed` notification is created

9. `list_outbound_follow_requests_user` shows pending outbound requests.

10. `decline_follow_request_user` removes pending request.

11. `list_notifications_user` returns follow-related notification kinds.

## How To Run

1. Make sure your latest social schema/functions are applied first:
- Run [`supabase/social_foundation.sql`](/Users/diegoguardiola/Desktop/Ascension-main/supabase/social_foundation.sql)

2. Open [`supabase/tests/social_follow_workflow.sql`](/Users/diegoguardiola/Desktop/Ascension-main/supabase/tests/social_follow_workflow.sql)

3. Replace these 3 UUIDs at the top of the script with real `auth.users.id` values:
- `v_actor`
- `v_public_target`
- `v_private_target`

4. Run the full script in Supabase SQL Editor.

5. Confirm output contains `PASS TEST ...` notices and ends with:
- `ALL SOCIAL FOLLOW WORKFLOW TESTS PASSED`

## Safety / Data Impact

- The test runs inside `BEGIN ... ROLLBACK`.
- No persistent rows are kept after execution.
- Temporary privacy overrides and created follow/notification rows are rolled back.

## Troubleshooting

1. If you see `"not found in auth.users"`:
- Use valid UUIDs from `auth.users`.

2. If you see permission/function errors:
- Re-run [`supabase/social_foundation.sql`](/Users/diegoguardiola/Desktop/Ascension-main/supabase/social_foundation.sql) first.

3. If app-side errors mention `PGRST106` and schema restrictions:
- That is API schema exposure related.
- The tests here run in SQL Editor and still validate backend behavior independently.

