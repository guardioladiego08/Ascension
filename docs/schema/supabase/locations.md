# Supabase Schema Locations

## Primary SQL Sources

- Migrations: `supabase/migrations/`
- Indoor run/walk stats compatibility migration: `supabase/migrations/20260331_fix_indoor_run_walk_stats_meter_columns.sql`
- Strength workout templates migration: `supabase/migrations/20260331_strength_workout_templates.sql`
- Strength template schema-cache refresh migration: `supabase/migrations/20260401_strength_template_schema_cache_refresh.sql`
- Signup auth trigger hardening migration: `supabase/migrations/20260329_signup_auth_trigger_hardening.sql`
- Signup bootstrap compatibility migration: `supabase/migrations/20260329_signup_bootstrap_schema_compat.sql`
- Signup username availability migration: `supabase/migrations/20260329_signup_username_availability_rpc.sql`
- Account deletion safety migration: `supabase/migrations/20260329_auth_user_delete_safe_summary_triggers.sql`
- Exercise/workout cascade-order migration: `supabase/migrations/20260329_workout_block_exercises_exercise_fk_deferrable.sql`
- Foundation SQL: `supabase/social_foundation.sql`
- Exercise catalog migrations:
  - `supabase/migrations/20260303_shared_exercise_library.sql`
  - `supabase/migrations/20260327_exercise_library_visibility_guard.sql`
  - `supabase/migrations/20260327_z_exercise_catalog_core_movement_and_body_part_weights.sql`

## Supporting SQL

- Tests: `supabase/tests/`
- Seeds: `supabase/seeds/`
- Debug diagnostics: `supabase/debug/`
- Signup failure diagnostic: `supabase/debug/inspect_auth_signup_failure.sql`

## Related App Code

- Supabase client helpers: `lib/supabase.ts`
- Shared auth bootstrap identity helpers: `lib/auth/bootstrapIdentity.ts`
- Signup email flow: `app/SignInLogin/SignupEmail.tsx`
- Signup username availability helper: `lib/auth/usernameAvailability.ts`
- Outdoor session Supabase helpers: `lib/OutdoorSession/supabase.ts`
- Strength workout session flow: `app/(tabs)/add/Strength/`
- Strength workout client models/helpers: `lib/strength/`
- Strength workout template client helpers: `lib/strength/templates.ts`

## Notes

If new generated database types, schema snapshots, or docs are added later, list them here.
