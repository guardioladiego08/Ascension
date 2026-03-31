# Supabase Schema Context

Use this file for durable schema context that should not live only in chat.

## 2026-03-29 - Signup auth bootstrap should never hard-fail auth user creation on auxiliary table writes

- Hosted email signup currently depends on `public.handle_new_auth_user()` running successfully during `auth.users` insert.
- Auxiliary bootstrap writes into `public.profiles_stub`, `"user".users`, or even `public.profiles` should be treated as best-effort seed paths because the mobile app already has post-login logic to backfill those rows.
- The auth trigger should therefore:
  - derive a safe username from metadata, email, or user id
  - avoid null/legacy-shape assumptions
  - catch downstream insert failures and return `new` so Auth signup succeeds
- App startup should also not depend exclusively on `public.profiles.onboarding_completed`; it should fall back to `"user".users.onboarding_completed` when the public profile row is missing.

## 2026-03-29 - Signup username availability must match every user bootstrap store

- The app still has historical username reads and writes across:
  - `"user".users`
  - `public.profiles`
  - legacy `public.profiles_stub`
- Hosted signup can fail at the Auth layer with `Database error saving new user` if availability checks only query one store but the connected project still bootstraps another during `auth.users` creation.
- The canonical `public.is_username_available(...)` RPC should therefore treat `"user".users` and `public.profiles` as primary sources of truth and optionally check `public.profiles_stub` for backward compatibility.

## 2026-03-29 - If both signup compatibility migrations are live and signup still fails, the hosted auth trigger SQL is the next source of truth

- A hosted project can still fail signup after both `20260329_signup_username_availability_rpc` and `20260329_signup_bootstrap_schema_compat` are present in `public.schema_change_log`.
- The local repo does not contain the live hosted `auth.users` bootstrap trigger, so the next authoritative inspection point is remote `pg_trigger` and `pg_proc` output for `auth.users`.
- A common remaining mismatch is a stock Supabase-style `handle_new_user()` trigger that still writes legacy `public.profiles` columns such as `full_name` or `avatar_url` that are not present in this repo's current profile table.
- If the `auth.users` trigger body itself is compatible, inspect triggers on the tables it inserts into next, especially `public.profiles_stub` and `"user".users`, because the failure can occur one level downstream of `auth.users` creation.

## 2026-03-29 - Hosted signup bootstrap needs profile compatibility columns plus safe user.users defaults

- The current app uses `public.profiles` immediately after signup for:
  - `onboarding_completed`
  - `has_accepted_privacy_policy`
  - `privacy_accepted_at`
- Hosted projects that still have the older social-only `public.profiles` shape can fail during signup if a live `auth.users` trigger or post-signup flow writes those columns before the schema is updated.
- Hosted projects that auto-bootstrap `"user".users` rows during `auth.users` creation also need safe defaults for:
  - `is_private`
  - `onboarding_completed`
  - `app_usage_reasons`
- Without those defaults, an older auth trigger that inserts only `user_id` and `username` can fail for every signup regardless of which username is chosen.

## 2026-03-29 - Auth-user deletion must not let summary triggers recreate child rows

- Hosted account deletion currently reaches `auth.admin.deleteUser(...)`, but the database can still fail with `Database error deleting user` even when all direct foreign keys to `auth.users` are `on delete cascade` or `set null`.
- The remaining risk is delete-trigger side effects on child tables such as:
  - strength workout stat rollups
  - indoor/outdoor cardio stat rollups
  - goal recomputation
  - weekly nutrition summary sync
- Those trigger paths can upsert into `"user".weekly_summary`, `"user".lifetime_stats`, `"user".daily_goal_results`, or `"user".daily_goal_status` while the auth row is already deleted in-transaction.
- Delete-safe trigger functions therefore need an explicit `auth.users` existence guard before they perform summary or goal writes.

## 2026-03-29 - Workout block exercise FK must be deferred for account deletion

- `strength.workout_block_exercises.exercise_id` currently points at `public.exercises.id`.
- If that FK uses `ON DELETE RESTRICT`, deleting an auth user can fail even when both the user's exercises and the user's workout blocks should disappear in the same top-level delete.
- The failure shows up as:
  - `update or delete on table "exercises" violates foreign key constraint "workout_block_exercises_exercise_id_fkey"`
- The safe fix is not `ON DELETE CASCADE`; that would weaken ordinary history protection for standalone exercise deletes.
- Instead, use `ON DELETE NO ACTION DEFERRABLE INITIALLY DEFERRED` so:
  - normal transactions still fail if workout-block rows survive
  - account-deletion cascades can remove both sides in one transaction without order-dependent failure

## 2026-03-27 - Exercise catalog now stores canonical core movements plus weighted body-part JSON

- `public.exercises.core_movement` is now the canonical movement classifier for exercise-library rows.
- The stored value is normalized text in snake_case rather than display labels, and the allowed set intentionally preserves distinctions such as:
  - `chest_push` vs `overhead_push`
  - `row` vs `pull_down`
- `public.exercises.body_part_weights` is now the source-of-truth muscle activation payload, stored as a JSON array of `{muscle, weight}` objects.
- `public.exercises.body_parts` remains in place as a compatibility column and should be treated as a derived projection of the muscles present in `body_part_weights`.
- Legacy writes that still send only `body_parts` should continue to work; the database derives equal-weight `body_part_weights` for those rows and defaults missing `core_movement` to `other`.
- Shared exercise-library rows must still use `user_id is null`, while user-created exercises continue to use a non-null owner id.

## 2026-03-27 - Shared exercise rows are the canonical visible library

- `public.exercises` now treats shared rows (`user_id is null`) as the canonical library source when a shared row and a user-owned row would otherwise collide by normalized display name.
- Custom exercises should only be created from the explicit user action in the strength custom-exercise flow, not as part of account creation or generic user bootstrap.
- Future inserts and updates must reject visible-scope name collisions after whitespace/case normalization so one user never sees both a shared exercise and a user-owned clone with the same name.
- Historical workout tables still reference exercise ids directly, so existing duplicate cleanup must preserve or relink referenced ids before any delete pass.

## 2026-03-22 - Strength supersets use workout blocks plus ordered block exercises

- Strength workout structure is now modeled separately from raw set rows:
  - `strength.workout_blocks` stores ordered workout units such as standalone exercises and supersets
  - `strength.workout_block_exercises` stores the ordered exercise membership inside each block
  - `strength.strength_sets` keeps the per-set performance data and now optionally references the block and member exercise it belongs to
- Supersets are represented as:
  - one `workout_blocks` row with `block_kind = 'superset'`
  - `rest_interval_seconds` on that block
  - two or more `workout_block_exercises` rows in the exact execution order
- Standalone exercises remain compatible with existing flows by using:
  - one `workout_blocks` row with `block_kind = 'exercise'`
  - one `workout_block_exercises` row for the exercise membership
- `exercise_summary` remains an exercise-level aggregate table and should not be repurposed to store superset structure.
- The legacy `strength_sets.superset_group` column can remain populated for compatibility, but the normalized workout-block references are now the source of truth for group order and rest ownership.

## 2026-03-22 - Hosted nutrition schema may lag local migrations

- The current hosted project can still be missing `nutrition.food_items.verification_status` plus the `nutrition.user_favorite_foods` and `nutrition.user_favorite_meals` tables even though the local repo now expects them.
- Mobile nutrition queries therefore need compatibility fallbacks:
  - fall back to legacy food row selects when `verification_status` is absent
  - treat missing favorite tables as empty-state/no-op behavior instead of fatal load errors
- This compatibility should remain until the hosted project applies the 2026-03-22 nutrition migrations and PostgREST schema cache is refreshed.

## 2026-03-22 - Public food trust lifecycle for user submissions

- Canonical foods in `nutrition.food_items` now use `verification_status`:
  - `pending`
  - `user_confirmed`
  - `verified`
  - `rejected`
- Unknown-barcode submission flow creates canonical food rows only after the user reviews and confirms extracted fields; that confirmed publish path sets `verification_status = 'user_confirmed'`.
- The original `nutrition.food_submissions` row is never replaced; it remains linked via `canonical_food_id` for traceability and future moderation tooling.
- Public visibility is status-gated at both query and policy layers: anonymous/public reads only see `user_confirmed` and `verified` rows, while creators can still read their own rows for traceability/debugging.

## 2026-03-22 - Nutrition food search normalization and ranking

- `nutrition.food_items` now supports fast lookup/search fields:
  - `barcode_normalized` for digit-only barcode matching
  - `normalized_name` for punctuation/case-insensitive matching
  - `search_vector` for weighted FTS across name, brand, and ingredients
- Search behavior uses a ranked SQL function (`nutrition.search_food_items`) that combines:
  - exact barcode hit
  - normalized prefix/equality
  - trigram similarity for minor spelling differences
  - full-text rank for multi-word relevance
- Public readability is unchanged; food catalog search remains compatible with anonymous and authenticated readers.

## 2026-03-22 - Nutrition recency and favorites acceleration

- Added user-owned favorite joins for foods and meals (`nutrition.user_favorite_foods`, `nutrition.user_favorite_meals`) so repeat logging can be pinned without exposing private user preferences.
- Added partial diary-item recency indexes for food and meal lookups, plus day-slot ordering support for fast "copy slot to today" workflows.
- Logging UX now depends on fast indexed access for:
  - recent distinct foods by user
  - recent distinct meals by user
  - previous-day meal-slot copy actions (breakfast/lunch/dinner shortcuts)

## 2026-03-22 - Nutrition ownership and public catalog boundaries

- `nutrition.food_items` is treated as the canonical cross-user food catalog and is publicly readable by policy.
- User-authored meal templates remain user-owned (`nutrition.recipes`) with normalized ingredient rows in `nutrition.recipe_ingredients`.
- Diary logs (`nutrition.diary_days`, `nutrition.diary_items`) are strictly user-owned and store nutrition snapshots to preserve history when foods or recipes change later.
- Barcode misses should create `nutrition.food_submissions` rows tied to the submitting user; approved submissions can optionally link back to a canonical food row.

## 2026-03-14 - SQL guidance workflow

- For Supabase SQL work, combine the local skill in `.agents/skills/supabase-postgres-best-practices/`, this schema documentation folder, and the actual SQL under `supabase/`.
- The skill should guide query quality, indexing, pagination, RPC design, and RLS performance patterns.
- Project-specific rules still come from this repo's schema docs and migrations, not from the generic skill examples.

Capture information such as:

1. Domain rules
2. Naming decisions
3. Data ownership boundaries
4. Assumptions behind tables, views, RPCs, triggers, and policies
5. User-provided constraints or edge cases

Add new notes at the top when they materially affect future schema work.
