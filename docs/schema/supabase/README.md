# Supabase Schema Notes

This folder holds human-readable context for the Supabase schema used by this project.

It does not replace the SQL source of truth. It points to it and captures the reasoning around it.

## Files

- `context.md`: product and domain context that affects schema decisions
- `locations.md`: where the actual SQL, tests, seeds, and related code live
- `changes.md`: dated notes about schema-related changes and why they happened

## Current Focus Areas

- Nutrition catalog/search compatibility and verification-state rollout
- Strength workout structure via ordered workout blocks and normalized superset membership

## SQL Workflow

For query writing, RPCs, indexes, and RLS work, use the local guidance in `.agents/skills/supabase-postgres-best-practices/` together with this folder.

Use the skill for reusable Postgres and Supabase best practices, then verify every change against:

- `docs/schema/supabase/context.md` for project assumptions
- `docs/schema/supabase/locations.md` for the canonical SQL paths
- `supabase/` for the executable schema history and live SQL sources

## Source of Truth

The executable schema history remains in the SQL files under `supabase/`.
