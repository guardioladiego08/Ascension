# Badges Schema Context

## 2026-04-02 - Shared badge foundation spans strength, running, and nutrition

- The badge system lives in a dedicated `badges` schema instead of being mixed into `strength`, `run_walk`, or `nutrition`.
- The shared base tables are:
  - `badges.badge_series`
  - `badges.badge_tiers`
  - `badges.user_badge_progress`
  - `badges.user_badge_unlocks`
- `badge_series` stores the reusable badge family contract across domains.
- `badge_tiers` stores thresholds and user-facing tier copy for each badge family.
- `user_badge_progress` stores the latest progress snapshot plus the user's best recorded progress for the series.
- `user_badge_unlocks` stores actual unlock events so completion summaries and social surfaces can show badges tied to a source workout/session/day.

## 2026-04-02 - Strength unlocks are source-linked to workouts

- Strength badge unlocks use `source_type = 'strength_workout'`.
- `source_id` should point at the completed `strength.strength_workouts.id` that triggered the unlock when the badge came from a specific workout.
- Historical/backfill unlocks may exist with a null `source_id` if they were inferred during rollout rather than earned inside the current session flow.

## 2026-04-02 - Running unlocks use one shared run session source contract

- Running badge unlocks use `source_type = 'run_walk_session'` for both indoor `run_walk.sessions` runs and outdoor `run_walk.outdoor_sessions` runs.
- `source_id` should point at the saved run session id that triggered the unlock, regardless of whether the run was indoor or outdoor.
- Walk and other non-running sessions reuse the broader run/walk schema but must not award running badges.

## 2026-04-02 - Running pace and race-time records are computed from available session-level data

- The current rollout computes running record badges from saved session averages that already exist on indoor and outdoor run rows.
- `pace_record` uses the best qualifying average speed from completed runs at or above 1 km.
- `fastest_mile`, `fastest_5k`, `fastest_10k`, `fastest_half`, and `fastest_marathon` use equivalent target times derived from the average speed of runs whose saved total distance meets that target distance.
- This keeps the badge schema shared and consistent across indoor and outdoor runs without requiring split-level segment storage for every environment.

## 2026-04-02 - Nutrition unlocks are source-linked to logged diary days

- Nutrition badge unlocks use `source_type = 'nutrition_day'`.
- `source_id` should point at the saved `nutrition.diary_days.id` row whose totals and meal coverage triggered the unlock.
- Nutrition progress must be computed from fields that already exist on `nutrition.diary_days` and `nutrition.diary_items`, not from speculative habit-tracking columns.

## 2026-04-02 - Nutrition consistency uses stored day targets and meal-slot coverage

- Logged nutrition days are only days that have at least one `nutrition.diary_items` row.
- Goal-hit nutrition badges read the persisted `nutrition.diary_days.goal_hit` flag after the existing daily goal sync logic updates it.
- Calorie and macro consistency badges compare persisted totals against the day-level stored targets with a tolerance, while coverage badges use `meal_slot` counts for breakfast, lunch, dinner, and full-day logging.
- Nutrition record badges currently use the best single-day `protein_g_total` and highest single-day diary entry count because those are reliable values already stored in the existing schema.

## 2026-04-02 - Badge icons are placeholders for now

- Both `badges.badge_series` and `badges.badge_tiers` store an `icon_placeholder` string.
- The app should render a placeholder badge icon from that string until final icon assets exist.
- Later icon work should replace the placeholder rendering without changing the schema contract.

## 2026-04-02 - Social visibility should not rely on broad table reads

- Own-row RLS protects `user_badge_progress` and `user_badge_unlocks`.
- Cross-user badge views should go through security-definer RPCs so social/profile visibility rules stay explicit.
- For strength workout badge chips, a visible social post or visible workout/privacy rule is enough to show the workout-linked unlocks.
- For running badge chips, a visible social post tied to the saved run session is enough to show the run-linked unlocks to other users.
- For nutrition badge chips, a visible social post tied to the logged `nutrition_day` source is enough to show the nutrition-day unlocks to other users.
