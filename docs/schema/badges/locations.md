# Badge Schema Locations

## Primary SQL Sources

- Shared badge + strength rollout migration:
  - `supabase/migrations/20260402_badges_strength_foundation.sql`
- Running badge rollout migration:
  - `supabase/migrations/20260402_badges_running_rollout.sql`
- Nutrition badge rollout migration:
  - `supabase/migrations/20260402_badges_nutrition_rollout.sql`

## RPC Surfaces

- `public.get_badge_progress_user(...)`
- `public.get_recent_badge_unlocks_user(...)`
- `public.get_badge_unlocks_for_source_user(...)`

## Badge Evaluation Functions

- `badges.apply_progress_snapshot(...)`
- `badges.evaluate_strength_badges_for_user(...)`
- `badges.apply_strength_workout_badges()`
- `badges.is_running_activity(...)`
- `badges.running_completed_sessions(...)`
- `badges.evaluate_running_badges_for_user(...)`
- `badges.apply_run_walk_session_badges()`
- `badges.apply_outdoor_run_badges()`
- `badges.is_within_target_range(...)`
- `badges.nutrition_logged_days(...)`
- `badges.evaluate_nutrition_badges_for_user(...)`
- `badges.apply_nutrition_day_badges()`

## Related App Code

- Shared badge client types:
  - `lib/badges/types.ts`
- Shared badge client RPC helpers:
  - `lib/badges/api.ts`
- Shared placeholder icon + badge UI:
  - `components/badges/BadgePlaceholderIcon.tsx`
  - `components/badges/BadgeChip.tsx`
  - `components/badges/BadgeCard.tsx`
  - `components/badges/BadgeSummarySection.tsx`
  - `components/badges/BadgeUnlockStrip.tsx`
- Strength completion summary badge section:
  - `app/(tabs)/add/Strength/components/WorkoutBadgeSummarySection.tsx`
- Strength progress badge section:
  - `app/(tabs)/progress/components/strength/StrengthBadgesSection.tsx`
- Running progress badge section:
  - `app/(tabs)/progress/components/running/RunningBadgesSection.tsx`
- Nutrition progress badge section:
  - `app/(tabs)/progress/components/nutrition/NutritionBadgesSection.tsx`

## Strength App Entry Points

- Strength summary screen:
  - `app/(tabs)/add/Strength/[id].tsx`
- Strength progress panel:
  - `app/(tabs)/progress/components/strength/StrengthProgressPanel.tsx`
- Indoor run summary screen:
  - `app/(tabs)/add/Cardio/indoor/IndoorSessionSummary.tsx`
- Outdoor run summary screen:
  - `app/(tabs)/add/Cardio/outdoor/SessionSummary.tsx`
- Running progress panel:
  - `app/(tabs)/progress/components/running/RunningProgressPanel.tsx`
- Nutrition daily summary screen:
  - `app/(tabs)/progress/nutrition/dailyNutritionSummary.tsx`
- Nutrition progress panel:
  - `app/(tabs)/progress/components/nutrition/NutritionProgressPanel.tsx`
- Social feed:
  - `app/(tabs)/social.tsx`
- Social post card:
  - `app/(tabs)/social/components/SocialPostCard.tsx`
- Social profile:
  - `app/(tabs)/social/[userId].tsx`
