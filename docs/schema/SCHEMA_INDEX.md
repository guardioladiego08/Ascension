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
- Current compatibility note: hosted nutrition environments may still be missing `verification_status` and favorite tables from the 2026-03-22 rollout, so app-side fallbacks remain required until those migrations are applied remotely.
- Current strength library note: shared exercise rows are the canonical visible library, and the 2026-03-27 exercise guard migration blocks future shared-vs-user name collisions after normalization.
- Current strength template note: templates now live in normalized `strength.workout_templates*` tables with private-by-default ownership, per-exercise target set counts, and future-ready `visibility` / fork provenance for later feed sharing.
- Current strength template compatibility note: hosted projects also need `20260401_strength_template_schema_cache_refresh.sql` after the template-table rollout so PostgREST reloads the `strength.workout_templates*` relations into its schema cache and the app stops hitting `PGRST205`.
- Current exercise catalog note: `public.exercises.core_movement` stores canonical snake_case movement families, while `body_part_weights` is the source-of-truth muscle activation JSON and `body_parts` remains a derived compatibility column.
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

## Rules

When a schema changes or new schema context is shared, update the relevant schema folder and this index in the same task.
