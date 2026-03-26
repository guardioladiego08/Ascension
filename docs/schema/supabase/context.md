# Supabase Schema Context

Use this file for durable schema context that should not live only in chat.

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
