# Supabase Schema Changes

## 2026-04-04 - Nutrition demo seed now mirrors foods into live FK targets

- What changed: Updated `supabase/seeds/nutrition_progress_year_dashboard_demo.sql` so it stages demo foods once, inspects the live `food_id` foreign-key targets used by `nutrition.recipe_ingredients`, `nutrition.diary_items`, and `nutrition.user_favorite_foods`, and upserts those rows into each referenced food table instead of assuming every hosted project already points at `nutrition.food_items`.
- Why: The hosted project raised `23503` on `nutrition.recipe_ingredients.food_id` because that foreign key still referenced a legacy `foods` table, so seeding only `nutrition.food_items` was not enough for partially migrated environments.
- Follow-up: Keep nutrition seeds compatibility-aware until hosted foreign keys are fully aligned with `nutrition.food_items`, and prefer documenting exact remote FK drift in this folder whenever a hosted project disagrees with the local migrations.

## 2026-04-04 - Nutrition demo seed now casts diary meal fields into live column types

- What changed: Updated `supabase/seeds/nutrition_progress_year_dashboard_demo.sql` to inspect the live types of `nutrition.diary_items.meal_type` and `nutrition.diary_items.meal_slot`, then insert staged string values through explicit casts when the hosted project still uses enums instead of text columns.
- Why: The hosted project raised `42804` because `nutrition.diary_items.meal_type` was typed as `meal_type`, while the seed was inserting raw text values that only match the newer local migration path.
- Follow-up: Keep nutrition demo seeds tolerant of both enum-backed and text-backed diary schemas until hosted projects are fully aligned with the 2026-03-22 logging migration.

## 2026-04-04 - Nutrition demo seed now maps logical foods to live diary food IDs

- What changed: Updated `supabase/seeds/nutrition_progress_year_dashboard_demo.sql` to seed compatible food tables with either UUID or numeric primary keys, record a per-target live food-id map, and use that map when inserting `nutrition.diary_items` rows on hosted projects where `food_id` is still numeric.
- Why: The hosted project raised `42804` because `nutrition.diary_items.food_id` expected `bigint`, while the seed was still passing the logical UUIDs used by the newer nutrition catalog.
- Follow-up: Keep nutrition seeds table-aware until hosted projects stop mixing UUID-backed `food_items` paths with older numeric `foods` references.

## 2026-04-02 - Strength workouts now expose normalized muscle-profile RPCs for radar previews

- What changed: Added migration `20260402_strength_muscle_profile_radar_support.sql` to create `strength.get_workout_muscle_profile(...)`, add `public.get_strength_workout_muscle_profile_user(...)`, extend `public.get_strength_workout_summary_user(...)` with `muscle_profile`, and add `public.list_visible_strength_activity_cards_user(...)` for profile grids.
- Why: Compact strength radar cards need a server-derived body-part profile that can be reused in social posts, summary screens, and other-user profile activity grids without client-side N+1 joins or direct-own-row table reads.
- Follow-up: Keep `public.exercises.body_part_weights` as the only source of truth for future strength visualizations, and treat catalog misclassifications in imported exercise rows as data-quality issues rather than charting bugs.

## 2026-04-02 - user_preferences now stores account-synced theme and strength rest timer settings

- What changed: Added migration `20260402_user_preferences_account_synced_settings.sql` to extend `user.user_preferences` with nullable `theme_palette_id` and `strength_rest_timer_seconds` columns, add validation constraints, and reload the PostgREST schema cache after the column rollout.
- Why: Units were already backend-backed, but advanced theme selection and the strength rest timer were still device-local, so users would lose those settings when signing into a new device.
- Follow-up: Keep future account-level settings in `user.user_preferences` when they need cross-device restore behavior, and use local storage only as a cache/offline fallback.

## 2026-04-01 - Strength template tables now force a PostgREST schema cache reload

- What changed: Added migration `20260401_strength_template_schema_cache_refresh.sql` to issue `notify pgrst, 'reload schema'` after the strength template rollout and record the compatibility step in `public.schema_change_log` when available.
- Why: Hosted projects can still raise `PGRST205` for `strength.workout_templates` if the template DDL has landed but the PostgREST schema cache has not refreshed yet.
- Follow-up: Apply this migration on the hosted project together with `20260331_strength_workout_templates.sql` before retesting template save/load flows.

## 2026-03-31 - Indoor run/walk summary triggers are back on meter-only weekly stats columns

- What changed: Added migration `20260331_fix_indoor_run_walk_stats_meter_columns.sql` to replace `user.apply_indoor_run_walk_stats_delta(...)`, restore `user.weekly_summary` writes to `total_distance_ran_m`, `total_distance_walked_m`, and `total_distance_run_walk_m`, and keep the newer `auth_user_exists(...)` delete-safety guard in place.
- Why: Saving a completed indoor session was failing with Postgres `42703` because a later trigger-hardening migration had reintroduced writes to removed legacy columns such as `total_miles_ran`.
- Follow-up: Apply this migration on the hosted project before retesting indoor summaries, and treat any future edits to summary-trigger helpers as regression-prone if they are copied from pre-meter migrations.

## 2026-03-31 - Strength templates now use normalized block tables with future share metadata

- What changed: Added migration `20260331_strength_workout_templates.sql` creating `strength.workout_templates`, `strength.workout_template_blocks`, and `strength.workout_template_block_exercises` with ordered block membership, per-exercise target set counts, future-facing `visibility`, `source_strength_workout_id`, and `forked_from_template_id`, plus indexes and own-row RLS policies.
- Why: The app needs reusable strength workout templates that can launch a session with preset exercise order and set counts today, while leaving a clean path for future social sharing and follower reuse.
- Follow-up: Keep initial mobile reads and writes user-owned/private for now, and add a visibility-aware RPC or policy expansion later when template sharing is actually exposed in the social feed.

## 2026-03-29 - Signup auth trigger is now hardened against legacy bootstrap failures

- What changed: Added migration `20260329_signup_auth_trigger_hardening.sql` to replace `public.handle_new_auth_user()` with a safer version that derives a normalized fallback username from metadata/email/id, seeds `public.profiles` when possible, and treats `profiles_stub` / `"user".users` bootstrap writes as best-effort warning paths instead of aborting the auth insert.
- Why: The hosted project showed a compatible `auth.users` trigger body but signup was still failing at database-save time, which means any downstream bootstrap insert error was still rolling back the whole auth-user creation.
- Follow-up: Apply this migration on the hosted project before retrying signup. After it is live, the app can self-heal any missing bootstrap rows during login and onboarding instead of losing the account at signup time.

## 2026-03-29 - Signup bootstrap compatibility for hosted auth triggers

- What changed: Added migration `20260329_signup_bootstrap_schema_compat.sql` to add `onboarding_completed`, `has_accepted_privacy_policy`, and `privacy_accepted_at` to `public.profiles`, grant authenticated users insert/update access to their own profile row, and set bootstrap-safe defaults on `"user".users` for `is_private`, `onboarding_completed`, and `app_usage_reasons`.
- Why: Hosted signup was still failing with `Database error saving new user` even for fresh usernames, and the live schema inspection showed the hosted `public.profiles` table was still missing onboarding/privacy columns while hidden auth bootstrap logic may also rely on defaults in `"user".users`.
- Follow-up: Apply this migration together with `20260329_signup_username_availability_rpc.sql` on the hosted project before retesting signup. If signup still fails afterward, inspect the live `auth.users` trigger SQL and compare it against the new defaults/columns.

## 2026-03-29 - Signup username availability is now canonicalized in an RPC

- What changed: Added migration `20260329_signup_username_availability_rpc.sql` creating `public.normalize_username_lookup(...)` and replacing `public.is_username_available(...)` so it checks `"user".users`, `public.profiles`, and legacy `public.profiles_stub`.
- Why: Signup UI checks and hosted auth-user bootstrap can disagree when username uniqueness is enforced in a table that the old lookup path did not query, which surfaces as Supabase Auth's generic `Database error saving new user`.
- Follow-up: Apply this migration to the hosted project before retesting signup, and prefer the RPC over ad hoc client-side table checks anywhere username availability is needed before auth.

## 2026-03-29 - Workout block exercise FK is now deferred so auth-user deletes can complete

- What changed: Added migration `20260329_workout_block_exercises_exercise_fk_deferrable.sql` to replace `strength.workout_block_exercises.exercise_id -> public.exercises(id) on delete restrict` with a deferred `on delete no action` foreign key.
- Why: Postgres was blocking auth-user deletion with `workout_block_exercises_exercise_id_fkey` because user-owned exercises and user-owned workout-block rows were being removed through different cascade paths in the same transaction.
- Follow-up: Apply this migration to the hosted project before retrying account deletion. Keep the FK deferred rather than switching to `on delete cascade` so standalone exercise deletes still fail unless dependent workout-block rows are removed in the same transaction.

## 2026-03-29 - Auth-user deletion no longer allows summary and goal triggers to recreate child rows

- What changed: Added migration `20260329_auth_user_delete_safe_summary_triggers.sql` with an `auth_user_exists(...)` helper and guarded the strength/cardio summary delta helpers plus goal and nutrition delete-trigger functions so they stop before upserting summary rows when the auth user is already gone in the current transaction.
- Why: Account deletion was reaching `auth.admin.deleteUser(...)` but still failing with `Database error deleting user` because cascade-triggered recomputations could recreate rows in `"user".weekly_summary`, `"user".lifetime_stats`, `"user".daily_goal_results`, or `"user".daily_goal_status` during the delete.
- Follow-up: Apply this migration to the hosted project before retrying account deletion, and if deletion still fails after that, inspect Supabase function logs for the exact Auth/database detail emitted by the edge function.

## 2026-03-27 - Exercise catalog now supports canonical core movement and weighted body-part data

- What changed: Added migration `20260327_z_exercise_catalog_core_movement_and_body_part_weights.sql` to add `public.exercises.core_movement` plus `body_part_weights`, normalize the new core movement vocabulary into canonical snake_case text, backfill existing rows, and keep the legacy `body_parts` array synchronized as a compatibility projection.
- Why: The new master exercise import requires a required movement classifier and weighted muscle-activation metadata, but the current app still reads and writes the older `body_parts` array shape.
- Follow-up: When app surfaces start using `core_movement` or weighted activations directly, read `body_part_weights` as the source of truth and keep `body_parts` only as a fallback/compatibility field.

## 2026-03-27 - Exercise library visible-scope duplicates are now blocked

- What changed: Added migration `20260327_exercise_library_visibility_guard.sql` to normalize exercise names, reject inserts or updates that would create a shared-vs-user name collision in a viewer's visible exercise scope, and add a trigger so future writes cannot recreate these duplicates.
- Why: New accounts were surfacing duplicate exercise names because users could end up with a private copy of the same movement that already existed in the shared library, even though custom exercises should only be created explicitly.
- Follow-up: Existing duplicate rows may still need a careful merge or relink plan before deletion because historical workouts reference exercise ids directly.

## 2026-03-22 - Strength workout blocks and normalized superset structure

- What changed: Added migration `20260322_strength_workout_blocks_and_supersets.sql` to create `strength.workout_blocks` and `strength.workout_block_exercises`, add block references plus `block_round_index` to `strength.strength_sets`, apply ownership-safe RLS policies and indexes, and expose `public.get_strength_workout_structure_user(...)`.
- Why: Strength sessions needed a normalized way to persist ordered supersets with group-level rest intervals without breaking existing `strength_workouts`, `strength_sets`, or `exercise_summary` flows.
- Follow-up: If strength history/detail screens start rendering structured workouts, prefer the new block tables or the structure RPC over trying to reconstruct superset order from `exercise_summary` or the legacy `superset_group` field.

## 2026-03-22 - Fixed nutrition.search_food_items return-shape mismatch

- What changed: Updated `search_food_items` SQL bodies in `20260322_nutrition_food_search_performance.sql` and `20260322_nutrition_food_verification_status.sql` so ranked CTEs keep scoring columns internal while the final select returns only `nutrition.food_items` rows.
- Why: Postgres raised `42P13` because the function is declared `RETURNS SETOF nutrition.food_items` but `SELECT r.*` returned additional rank columns.
- Follow-up: Keep ranking metadata inside CTEs or switch to `RETURNS TABLE(...)` explicitly if result shapes change again.

## 2026-03-22 - Nutrition food verification lifecycle

- What changed: Added migration `20260322_nutrition_food_verification_status.sql` introducing `nutrition.food_items.verification_status`, sync trigger for `is_verified` compatibility, public-status index, a status-aware `food_items_select_public` policy, and updated `nutrition.search_food_items` to include only `user_confirmed` and `verified` rows.
- Why: User-submitted foods needed a safer trust gate so public catalog visibility happens after explicit confirmation, while preserving submission traceability for future moderation/admin review tooling.
- Follow-up: Add admin tooling to transition `user_confirmed -> verified/rejected` and audit rejections with optional reviewer notes.

## 2026-03-22 - Nutrition food search performance pass

- What changed: Added migration `20260322_nutrition_food_search_performance.sql` to introduce normalized search columns on `nutrition.food_items`, trigger-based maintenance, trigram + FTS indexes, and a ranked `nutrition.search_food_items` RPC.
- Why: Mobile nutrition logging needed faster barcode resolution and typo-tolerant food search without broad schema rewrites.
- Follow-up: If the conditional unique barcode index falls back to non-unique due existing duplicate barcodes, run a cleanup migration later and convert to the unique index variant.

## 2026-03-22 - Nutrition favorites and recency indexes

- What changed: Added migration `20260322_nutrition_favorites_and_recency.sql` with `nutrition.user_favorite_foods` and `nutrition.user_favorite_meals`, ownership RLS policies, and recency-focused diary indexes for food/meal history and meal-slot copy workflows.
- Why: Repeat logging needed low-friction pinning and fast retrieval for recent/frequent behaviors without altering canonical public food ownership boundaries.
- Follow-up: Monitor query plans for `nutrition.diary_items` recency queries in production once data volume grows, and tune partial index definitions if dominant filter patterns shift.

## 2026-03-22 - Nutrition logging database layer

- What changed: Added migration `20260322_nutrition_logging_database_layer.sql` to create `nutrition.food_items` as a canonical public catalog, add normalized `nutrition.recipe_ingredients`, harden `nutrition.diary_days`/`nutrition.diary_items` for meal-slot and consumed-at snapshots, and add `nutrition.food_submissions` for barcode-miss OCR fallback intake.
- Why: Nutrition logging needed shared searchable foods, reusable meals with ingredient joins, historical diary snapshots, and a moderation-style submission queue when barcode lookup fails.
- Follow-up: Wire app flows to use normalized meal ingredients and fallback submissions table, then validate existing production data against the new `NOT VALID` constraints before optional `VALIDATE CONSTRAINT`.

## 2026-03-14 - Documentation scaffold created

- What changed: Added a dedicated schema documentation folder for Supabase plus a central schema index.
- Why: Make schema context easier to find without scanning migrations or past chat.
- Follow-up: Add domain-specific notes here whenever schema behavior or structure changes.
