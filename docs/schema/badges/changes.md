# Badge Schema Changes

## 2026-04-02 - Nutrition badge rollout on the shared badges schema

- What changed: Added nutrition badge series and tiers to the shared `badges` tables, introduced nutrition diary-day evaluation helpers and triggers, and extended source-linked badge lookups so nutrition daily summaries, progress badges, and social/profile chips all resolve through the same badge RPC contract as strength and running.
- Why: Nutrition needed to reuse the existing badge storage model while basing progress only on supported `diary_days` totals, stored targets, `goal_hit`, and `diary_items.meal_slot` coverage instead of inventing a separate schema or unsupported fields.
- Follow-up: If nutrition posts get a dedicated share flow later, keep `source_type = 'nutrition_day'` and pass diary-day metrics into `social.posts.metrics` so the existing feed card and badge strip stay generic.

## 2026-04-02 - Running badge rollout on the shared badges schema

- What changed: Added running badge series and tiers to the existing shared `badges` tables, created unified indoor/outdoor running badge evaluation helpers and triggers, and updated source-linked badge lookups so saved run summaries and social run posts can resolve running unlocks from the same RPC contract as strength.
- Why: Running badges needed to reuse the shared badge storage model while still supporting indoor and outdoor run saves, progress-page record formatting, and run-linked social badge chips without creating a second schema layout.
- Follow-up: Nutrition should keep this same contract by adding only nutrition-specific series, tiers, and evaluation hooks, and it should decide explicitly which diary/day save event becomes the nutrition `source_type`.

## 2026-04-02 - Shared badges schema and strength rollout

- What changed: Added the dedicated `badges` schema, seeded shared badge families and tiers for strength, added strength badge evaluation helpers plus a workout trigger, and exposed RPCs for badge progress, recent unlocks, and source-linked unlocks.
- Why: Strength badges need one reusable storage contract that later running and nutrition badge work can extend without inventing a new schema for each domain.
- Follow-up: Running and nutrition should reuse the exact same badge tables and RPC shapes, adding only new series/tier seeds plus their own domain evaluation logic.
