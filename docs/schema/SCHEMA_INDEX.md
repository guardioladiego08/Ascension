# Schema Index

This directory is the navigation layer for schema knowledge in this repo.

Use it to find:

1. The schema-specific documentation folder
2. User-provided context and assumptions
3. Canonical source locations such as migrations, tests, seeds, and generated types
4. A lightweight change trail for schema-level decisions

## Schemas

### Supabase

- Docs folder: `docs/schema/supabase/`
- Summary: `docs/schema/supabase/README.md`
- Context: `docs/schema/supabase/context.md`
- Current nutrition note: `nutrition.food_items` is now the only supported food catalog source, and `20260529_nutrition_food_item_reference_canonicalization.sql` must be applied before removing legacy tables such as `public.foods`; after that migration, nutrition food references should stay UUID-backed on `nutrition.food_items.id` and the client should not carry legacy-ID translation logic.
- Current settings note: `user.user_preferences` is the canonical cross-device settings row for units, health-provider sync state, theme palette selection, and the default strength rest timer.
- Current strength library note: shared exercise rows are the canonical visible library, and the 2026-03-27 exercise guard migration blocks future shared-vs-user name collisions after normalization.
- Current strength template note: templates now live in normalized `strength.workout_templates*` tables with private-by-default ownership, per-exercise target set counts, and future-ready `visibility` / fork provenance for later feed sharing.
- Current strength template compatibility note: hosted projects also need `20260401_strength_template_schema_cache_refresh.sql` after the template-table rollout so PostgREST reloads the `strength.workout_templates*` relations into its schema cache and the app stops hitting `PGRST205`.
- Current exercise catalog note: `public.exercises.core_movement` stores canonical snake_case movement families, while `body_part_weights` is the source-of-truth muscle activation JSON and `body_parts` remains a derived compatibility column.
- Current strength social note: strength social/profile previews now derive an 8-axis normalized `muscle_profile` from `public.exercises.body_part_weights`, and other-user profile activity cards should page through `public.list_visible_strength_activity_cards_user(...)` instead of direct `strength.strength_workouts` reads.
- Current profile feed visibility note: hosted projects that do not expose the `social` schema need `public.get_profile_feed_user(...)` so non-followed public profiles can still return visible posts; `get_feed_user(...)` remains follow-feed scoped.
- Current run/walk summary note: indoor and outdoor detail screens should prefer visibility-safe RPCs (`get_run_walk_session_summary_user`, `get_outdoor_session_summary_user`) so own and shared session views use aligned summary sources even when direct `run_walk` table reads are owner-only.
- Current account-deletion note: hosted projects need the 2026-03-29 delete-safety trigger migration plus the deferred `workout_block_exercises.exercise_id` FK migration so account deletion can remove user-owned exercises and workout structures in one transaction.
- Current signup note: username availability must be checked against the canonical bootstrap stores (`"user".users` and `public.profiles`) rather than only legacy lookup tables, otherwise Auth signup can fail with a generic database-save error.
- Current signup bootstrap note: hosted projects also need `public.profiles` onboarding/privacy compatibility columns plus safe defaults on `"user".users` for auth-trigger bootstrap rows, otherwise signup can fail before the app ever gets a session.
- Current signup hardening note: the hosted `public.handle_new_auth_user()` path should be best-effort and self-heal friendly; downstream bootstrap insert failures should not abort `auth.users` creation because the app can backfill rows after login.
- Current signup trigger note: if both 2026-03-29 signup migrations are already present and signup still fails, inspect the live hosted `auth.users` trigger/function SQL because the repo does not currently contain that remote bootstrap source.
- Current run/walk stats note: `user.weekly_summary` distance rollups are meter-based now, so indoor summary trigger helpers must not write legacy `total_miles_*` columns or completed session inserts will fail with `42703`.
- Source locations: `docs/schema/supabase/locations.md`
- Change notes: `docs/schema/supabase/changes.md`
- SQL guidance skill: `.agents/skills/supabase-postgres-best-practices/`
- Latest nutrition migrations:
  - `supabase/migrations/20260322_nutrition_logging_database_layer.sql`
  - `supabase/migrations/20260322_nutrition_favorites_and_recency.sql`
  - `supabase/migrations/20260322_nutrition_food_search_performance.sql`
  - `supabase/migrations/20260322_nutrition_food_verification_status.sql`
  - `supabase/migrations/20260322_strength_workout_blocks_and_supersets.sql`
  - `supabase/migrations/20260327_exercise_library_visibility_guard.sql`
  - `supabase/migrations/20260327_z_exercise_catalog_core_movement_and_body_part_weights.sql`
  - `supabase/migrations/20260329_signup_auth_trigger_hardening.sql`
  - `supabase/migrations/20260329_signup_bootstrap_schema_compat.sql`
  - `supabase/migrations/20260329_signup_username_availability_rpc.sql`
  - `supabase/migrations/20260331_fix_indoor_run_walk_stats_meter_columns.sql`
  - `supabase/migrations/20260331_strength_workout_templates.sql`
  - `supabase/migrations/20260401_strength_template_schema_cache_refresh.sql`
  - `supabase/migrations/20260402_strength_muscle_profile_radar_support.sql`
  - `supabase/migrations/20260402_user_preferences_account_synced_settings.sql`
  - `supabase/migrations/20260410_profile_feed_visibility_rpc.sql`
  - `supabase/migrations/20260410_run_walk_summary_source_parity.sql`
  - `supabase/migrations/20260529_nutrition_food_item_reference_canonicalization.sql`

### Badges

- Docs folder: `docs/schema/badges/`
- Summary: `docs/schema/badges/README.md`
- Context: `docs/schema/badges/context.md`
- Current rollout note: the shared `badges` schema stores reusable badge families, tier thresholds, user progress snapshots, and unlock history across strength, running, and nutrition.
- Current strength note: strength badges are source-linked to `strength_workout` unlock events so completion summaries and social badge chips can show only the badges earned by that workout.
- Current running note: running badges reuse the same shared tables, store run-linked unlocks under `run_walk_session` for indoor and outdoor saves, and compute pace/time record badges from qualifying session-level averages when split data is not universally available.
- Current nutrition note: nutrition badges reuse the same shared tables, store diary-linked unlocks under `nutrition_day`, and compute consistency, coverage, and record progress from persisted `nutrition.diary_days` totals, stored targets, `goal_hit`, and `nutrition.diary_items.meal_slot` counts.
- Current icon note: badge series and tiers both store `icon_placeholder` strings until final icon assets replace the placeholder renderer.
- Source locations: `docs/schema/badges/locations.md`
- Change notes: `docs/schema/badges/changes.md`

## Rules

When a schema changes or new schema context is shared, update the relevant schema folder and this index in the same task.
