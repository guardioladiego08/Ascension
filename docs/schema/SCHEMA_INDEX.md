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
- Source locations: `docs/schema/supabase/locations.md`
- Change notes: `docs/schema/supabase/changes.md`
- SQL guidance skill: `.agents/skills/supabase-postgres-best-practices/`
- Latest nutrition migrations:
  - `supabase/migrations/20260322_nutrition_logging_database_layer.sql`
  - `supabase/migrations/20260322_nutrition_favorites_and_recency.sql`
  - `supabase/migrations/20260322_nutrition_food_search_performance.sql`
  - `supabase/migrations/20260322_nutrition_food_verification_status.sql`

## Rules

When a schema changes or new schema context is shared, update the relevant schema folder and this index in the same task.
