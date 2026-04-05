# Supabase Schema Context

Use this file for durable schema context that should not live only in chat.

## 2026-04-04 - Hosted nutrition food foreign keys can still point at legacy foods tables

- Some hosted projects still have live `food_id` foreign keys on nutrition tables pointing at a legacy `foods` table even when `nutrition.food_items` already exists.
- The confirmed drift path so far is `nutrition.recipe_ingredients.food_id`, and `nutrition.diary_items.food_id` or `nutrition.user_favorite_foods.food_id` may lag the same way on partially migrated projects.
- Compatibility seeds should inspect the live FK target and mirror demo food rows into that referenced table, otherwise ingredient or diary inserts can fail with `23503` even though the same ids were inserted into `nutrition.food_items`.
- App runtime should still treat `nutrition.food_items` as the canonical catalog; this note is specifically for hosted-schema troubleshooting, migrations, and seeds.

## 2026-04-04 - Hosted nutrition diary columns may still use enums instead of text

- Some hosted projects have `nutrition.diary_items.meal_type` and possibly `nutrition.diary_items.meal_slot` stored as enum types even though the local 2026-03-22 migration path defines those columns as `text` plus a check constraint.
- Compatibility seeds should look up the live column types and cast staged string values into those types during insert, otherwise demo diary inserts can fail with `42804` on stricter hosted schemas.
- Keep the seed values aligned with the existing allowed labels:
  - `breakfast`
  - `lunch`
  - `dinner`
  - `snack`
  - `pre-workout`
  - `post-workout`

## 2026-04-04 - Hosted nutrition diary food references may still use legacy numeric IDs

- Some hosted projects still store `nutrition.diary_items.food_id` as a numeric type such as `bigint` instead of the UUID shape used by the newer `nutrition.food_items` catalog.
- Compatibility seeds should maintain a logical-food to live-food-id map per target table, because different nutrition tables on the same hosted project can disagree about which food table and key type they still use.
- When `nutrition.diary_items.food_id` is not UUID-backed, the seed should resolve each staged food entry through the live mapped target table before insert rather than writing the logical demo UUID directly.


## 2026-04-02 - Strength radar previews depend on normalized muscle profiles plus workout-level visibility fallback

- `strength.get_workout_muscle_profile(workout_id)` is now the shared aggregation helper for compact strength radar previews on social cards and profile activity cards.
- The helper must derive its payload from `public.exercises.body_part_weights`, not the legacy `body_parts` array.
- Per-workout aggregation rules are:
  - weight each exercise by `strength.exercise_summary.vol` when volume is positive
  - fall back to per-exercise set counts from `strength.strength_sets` when summary volume is missing or zero
  - collapse raw muscles into these 8 display axes: `chest`, `back`, `shoulders`, `arms`, `core`, `quads`, `posterior_chain`, `calves`
  - distribute `full_body` evenly across all 8 axes
  - normalize the final profile to `0..1` by each workout's strongest axis so small card radars stay visually comparable
- `public.get_strength_workout_summary_user(...)` now has two valid visibility paths for non-owners:
  - a shared `social.posts` row with viewable post visibility
  - direct workout visibility via `strength.strength_workouts.privacy`, gated by profile privacy and accepted-follow checks
- `public.list_visible_strength_activity_cards_user(...)` is the canonical path for strength cards on profile activity grids because direct `strength.strength_workouts` reads remain own-row only under RLS.

## 2026-04-02 - user.user_preferences is the canonical cross-device settings row

- `user.user_preferences` should hold account-level settings that must follow the user across device installs and sign-ins.
- The current canonical settings in that row are:
  - `weight_unit`
  - `distance_unit`
  - health provider sync/auth fields
  - `theme_palette_id`
  - `strength_rest_timer_seconds`
- When a setting is meant to restore automatically on a newly logged-in device, prefer extending this table instead of keeping it only in `AsyncStorage`.
- Device-local storage can still be used as a cache or offline fallback, but the Supabase row is the source of truth for signed-in users.

## 2026-03-31 - Indoor run/walk summary rollups must stay on meter columns even after trigger hardening

- `user.weekly_summary` no longer guarantees legacy distance columns like `total_miles_ran`, `total_miles_walked`, or `total_miles_run_walk`.
- Indoor run/walk trigger helpers must update:
  - `total_distance_ran_m`
  - `total_distance_walked_m`
  - `total_distance_run_walk_m`
- The 2026-03-29 auth-delete-safe trigger migration can regress signup/delete safety fixes into stats helpers if it redefines those functions from older source text.
- When a completed indoor session insert fails with Postgres `42703` against `total_miles_ran`, the authoritative fix is to replace `user.apply_indoor_run_walk_stats_delta(...)` on the hosted project with the meter-based version rather than changing the client payload.

## 2026-04-01 - Strength template table DDL must be followed by a PostgREST schema cache reload

- The strength template feature depends on PostgREST seeing these relations in the exposed `strength` schema:
  - `strength.workout_templates`
  - `strength.workout_template_blocks`
  - `strength.workout_template_block_exercises`
- A hosted project can still return `PGRST205` for `strength.workout_templates` even after the DDL exists if the API schema cache has not been reloaded yet.
- The compatibility fix is to apply the cache-refresh migration `20260401_strength_template_schema_cache_refresh.sql` after the template-table migration so template reads and writes stop failing on schema-cache misses.

## 2026-03-31 - Strength templates should stay private now but preserve share and fork metadata for future feed reuse

- Strength workout templates now mirror the normalized workout structure instead of storing a flat JSON blob:
  - `strength.workout_templates`
  - `strength.workout_template_blocks`
  - `strength.workout_template_block_exercises`
- Template exercise rows store `target_set_count` only; weight and rep targets remain intentionally unset so the workout composer can keep using recent performance placeholders from `strength.strength_sets`.
- Templates are currently user-owned and private by policy, but the schema already includes:
  - `visibility` using the existing strength privacy enum (`private`, `followers`, `public`)
  - `source_strength_workout_id` for "saved from workout" provenance
  - `forked_from_template_id` for future follower reuse and template cloning flows
- Template block exercise references use a deferred `public.exercises` foreign key just like workout block exercises so future account-deletion or cascade operations do not become order-dependent.

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
