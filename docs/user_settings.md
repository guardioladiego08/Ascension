# User Settings

## Source Of Truth
- Table: `user.user_preferences`
- Key: `user_id` (FK to `auth.users.id`)
- Fields:
  - `weight_unit` (`lb` | `kg`)
  - `distance_unit` (`mi` | `km`)
  - `created_at`, `updated_at`

## Storage And Display Rules
- Strength values are stored in canonical metric values where applicable (for example, totals/volume in kg).
- Distance values are stored in metric base units (meters).
- The client converts to display units using `UnitsContext`:
  - Weight: `kg <-> lb`
  - Distance: `m -> mi|km`
  - Pace/speed/elevation labels follow the selected distance unit.

## Unit Settings Flow
1. User changes units in `app/(tabs)/profile/settings.tsx`.
2. Modals call `setWeightUnit` / `setDistanceUnit` from `UnitsContext`.
3. `UnitsContext` upserts into `user.user_preferences`.
4. All consumers read from `UnitsContext` and render converted values.

## Coverage In App
- Settings UI:
  - `app/(tabs)/profile/settings.tsx`
  - `app/(tabs)/profile/settings/WeightUnitModal.tsx`
  - `app/(tabs)/profile/settings/DistanceUnitModal.tsx`
- Strength:
  - `app/(tabs)/add/Strength/StrengthTrain.tsx`
  - `app/(tabs)/add/Strength/components/ExerciseCard.tsx`
  - `app/(tabs)/add/Strength/components/SetRow.tsx`
  - `app/(tabs)/add/Strength/[id].tsx`
  - `app/(tabs)/progress/strength/[id].tsx`
- Cardio/Profile/Social:
  - `app/(tabs)/add/Cardio/indoor/IndoorSession.tsx`
  - `app/(tabs)/profile/components/ActivityGrid.tsx`
  - `app/(tabs)/profile/components/LifetimeStatsTable.tsx`
  - `app/(tabs)/progress/ProgressDetailsSection.tsx`
  - `app/(tabs)/progress/outdoor/[id].tsx`
  - `app/(tabs)/progress/run_walk/[sessionId].tsx`
  - `app/(tabs)/social.tsx`

## Verification Checklist
1. Set `Weight unit = kg` and `Distance unit = km`.
2. Start a strength workout, add sets, and confirm input badges/summary values show `kg`.
3. Open strength progress details and confirm volume + 1RM are shown in `kg`.
4. Start an indoor run/walk and confirm UI labels use `km`, `km/h`, `/km`.
5. Open run/walk and outdoor summaries and confirm pace/distance/elevation labels match selected unit.
6. Switch back to `lb`/`mi` and confirm all above views re-render in imperial.

## SQL Reference
- Migration file: `supabase/migrations/20260226_user_preferences_units_and_schema_tracking.sql`
- Includes:
  - `user.user_preferences` normalization
  - RLS policies for per-user access
  - `public.schema_registry` (current schema snapshot)
  - `public.schema_change_log` (applied change entries)
