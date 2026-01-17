// lib/goals/goalLogic.ts

export type CalorieGoalMode = string | null | undefined;

export type DailyGoalResults = {
  date: string;

  // Strength enable + met
  strength_use_time: boolean;
  strength_use_volume: boolean;
  met_strength_time: boolean | null;
  met_strength_volume: boolean | null;

  // Cardio enable + met
  cardio_use_time: boolean;
  cardio_use_distance: boolean;
  met_cardio_time: boolean | null;
  met_cardio_distance: boolean | null;

  // Nutrition enable + met
  protein_enabled: boolean;
  carbs_enabled: boolean;
  fats_enabled: boolean;
  calorie_goal_mode: CalorieGoalMode;

  met_protein: boolean | null;
  met_carbs: boolean | null;
  met_fats: boolean | null;
  met_calories: boolean | null;

  // Stored overall
  active_metrics_count: number;
  met_all: boolean;
};

export type RingStatus = {
  active: boolean; // at least one metric enabled in this ring
  closed: boolean; // all enabled metrics met
};

export type Rings = {
  strength: RingStatus;
  cardio: RingStatus;
  nutrition: RingStatus;
  allClosed: boolean;
};

// ---- helpers ----
const asTrue = (v: boolean | null | undefined) => v === true;

export const caloriesEnabled = (mode: CalorieGoalMode) =>
  mode != null && String(mode).toLowerCase() !== 'disabled';

function ringStatus(enabled: boolean[], met: boolean[]): RingStatus {
  const active = enabled.some(Boolean);
  if (!active) return { active: false, closed: false };

  // Any enabled metric that is not met => ring not closed
  for (let i = 0; i < enabled.length; i++) {
    if (enabled[i] && !met[i]) return { active: true, closed: false };
  }
  return { active: true, closed: true };
}

/**
 * Derive ring closure from a daily_goal_results row.
 * Rules:
 * - Ring is ACTIVE if any metric in that category is enabled
 * - Ring is CLOSED if all enabled metrics are met
 * - If a metric is enabled but met_* is NULL -> treat as not met
 */
export function computeRings(row: DailyGoalResults): Rings {
  const strengthEnabled = [asTrue(row.strength_use_time), asTrue(row.strength_use_volume)];
  const strengthMet = [asTrue(row.met_strength_time), asTrue(row.met_strength_volume)];

  const cardioEnabled = [asTrue(row.cardio_use_time), asTrue(row.cardio_use_distance)];
  const cardioMet = [asTrue(row.met_cardio_time), asTrue(row.met_cardio_distance)];

  const calEnabled = caloriesEnabled(row.calorie_goal_mode);
  const nutritionEnabled = [
    asTrue(row.protein_enabled),
    asTrue(row.carbs_enabled),
    asTrue(row.fats_enabled),
    calEnabled,
  ];
  const nutritionMet = [
    asTrue(row.met_protein),
    asTrue(row.met_carbs),
    asTrue(row.met_fats),
    asTrue(row.met_calories),
  ];

  const strength = ringStatus(strengthEnabled, strengthMet);
  const cardio = ringStatus(cardioEnabled, cardioMet);
  const nutrition = ringStatus(nutritionEnabled, nutritionMet);

  // Overall: all active rings must be closed; and at least one metric enabled overall.
  const anyActive = strength.active || cardio.active || nutrition.active;
  const allClosed = anyActive
    ? (!strength.active || strength.closed) &&
      (!cardio.active || cardio.closed) &&
      (!nutrition.active || nutrition.closed)
    : false;

  return { strength, cardio, nutrition, allClosed };
}

/**
 * Optional: compute met_all exactly from flags (matches the SQL-style "enabled implies met" rule).
 * Use this if you ever want to validate met_all or compute it client-side.
 */
export function computeMetAllFromRow(row: DailyGoalResults): boolean {
  const calEnabled = caloriesEnabled(row.calorie_goal_mode);

  const checks: Array<[boolean, boolean]> = [
    [row.strength_use_time, asTrue(row.met_strength_time)],
    [row.strength_use_volume, asTrue(row.met_strength_volume)],
    [row.cardio_use_time, asTrue(row.met_cardio_time)],
    [row.cardio_use_distance, asTrue(row.met_cardio_distance)],
    [row.protein_enabled, asTrue(row.met_protein)],
    [row.carbs_enabled, asTrue(row.met_carbs)],
    [row.fats_enabled, asTrue(row.met_fats)],
    [calEnabled, asTrue(row.met_calories)],
  ];

  const activeCount = checks.reduce((acc, [enabled]) => acc + (enabled ? 1 : 0), 0);
  if (activeCount === 0) return false;

  return checks.every(([enabled, met]) => (enabled ? met : true));
}
