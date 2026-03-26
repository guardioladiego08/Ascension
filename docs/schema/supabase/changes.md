# Supabase Schema Changes

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
