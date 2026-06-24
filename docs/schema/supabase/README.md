# Supabase Schema Notes

This folder holds human-readable context for the Supabase schema used by this project.

It does not replace the SQL source of truth. It points to it and captures the reasoning around it.

## Files

- `context.md`: product and domain context that affects schema decisions
- `locations.md`: where the actual SQL, tests, seeds, and related code live
- `changes.md`: dated notes about schema-related changes and why they happened

## Current Focus Areas

- Indoor cycling now reuses the open `run_walk.sessions` flow, which means hosted schemas must accept `indoor_cycle`, persist cadence on `run_walk.samples`, and roll indoor cycling distance into `total_distance_biked_m` instead of run/walk totals
- Daily `user.body_metrics` biometrics check-ins for weight, body-fat percentage, and muscle percentage, powering the home quick action and the body progress tab
- Interval running now has dedicated `run_walk.interval_*` tables for saved custom workouts, executed phase breakdowns, and sampled interval-session GPS points while reusing the existing outdoor summary, goal, and running-badge trigger helpers.
- Indoor treadmill intervals now have their own `run_walk.indoor_interval_*` tables for saved workouts, completed sessions, per-phase breakdowns, and sampled speed/incline data without changing the open indoor run table.
- Account-synced `user.user_preferences` settings for units, health providers, theme palette, and strength rest timer
- Strength template schema-cache compatibility after custom-schema DDL
- Indoor run/walk summary triggers must use meter-based `weekly_summary` columns only; newer trigger-hardening migrations should not reintroduce `total_miles_*` writes.
- Strength workout templates with normalized block exercise structure and future share visibility metadata
- Strength workout muscle-profile aggregation and visibility-safe profile activity cards for radar previews
- Visibility-safe profile feed RPC fallback for environments where the `social` schema is not client-exposed
- Indoor and outdoor run/walk summary RPC parity so own and shared session detail screens resolve through the same visibility-safe source
- Signup username availability compatibility across legacy and canonical user-profile stores
- Signup bootstrap compatibility between hosted auth triggers, `public.profiles`, and `"user".users`
- Signup auth-trigger hardening so legacy bootstrap insert failures do not abort `auth.users` creation
- Nutrition catalog/search compatibility and verification-state rollout
- Canonical nutrition food references on `nutrition.food_items.id`, including the migration path that removes runtime dependence on legacy `foods` tables
- Strength workout structure via ordered workout blocks and normalized superset membership
- Strength exercise catalog classification via canonical core movements and weighted muscle activation
- Account deletion safety for summary and goal trigger cascades
- Account deletion safety for exercise/workout cascade ordering

## SQL Workflow

For query writing, RPCs, indexes, and RLS work, use the local guidance in `.agents/skills/supabase-postgres-best-practices/` together with this folder.

Use the skill for reusable Postgres and Supabase best practices, then verify every change against:

- `docs/schema/supabase/context.md` for project assumptions
- `docs/schema/supabase/locations.md` for the canonical SQL paths
- `supabase/` for the executable schema history and live SQL sources

## Source of Truth

The executable schema history remains in the SQL files under `supabase/`.
