export type CalorieGoalMode = string | null | undefined;
export type GoalConditionMode = 'and' | 'or' | string | null | undefined;
export type GoalCategoryKey = 'strength' | 'cardio' | 'nutrition';

export type DailyGoalResults = {
  date: string;

  strength_condition_mode?: GoalConditionMode;
  cardio_condition_mode?: GoalConditionMode;
  nutrition_condition_mode?: GoalConditionMode;

  strength_use_time: boolean;
  strength_use_volume: boolean;
  met_strength_time: boolean | null;
  met_strength_volume: boolean | null;

  cardio_use_time: boolean;
  cardio_use_distance: boolean;
  met_cardio_time: boolean | null;
  met_cardio_distance: boolean | null;

  protein_enabled: boolean;
  carbs_enabled: boolean;
  fats_enabled: boolean;
  calorie_goal_mode: CalorieGoalMode;

  met_protein: boolean | null;
  met_carbs: boolean | null;
  met_fats: boolean | null;
  met_calories: boolean | null;

  strength_met?: boolean | null;
  cardio_met?: boolean | null;
  nutrition_met?: boolean | null;

  active_metrics_count?: number;
  met_all?: boolean;
};

export type RingStatus = {
  active: boolean;
  closed: boolean;
};

export type Rings = {
  strength: RingStatus;
  cardio: RingStatus;
  nutrition: RingStatus;
  allClosed: boolean;
};

const asTrue = (value: boolean | null | undefined) => value === true;

export const caloriesEnabled = (mode: CalorieGoalMode) =>
  mode != null && String(mode).toLowerCase() !== 'disabled';

export const normalizeGoalConditionMode = (
  mode: GoalConditionMode
): 'and' | 'or' => (String(mode ?? '').toLowerCase() === 'or' ? 'or' : 'and');

function ringStatus(
  enabled: boolean[],
  met: boolean[],
  mode: GoalConditionMode
): RingStatus {
  const active = enabled.some(Boolean);
  if (!active) return { active: false, closed: false };

  const conditionMode = normalizeGoalConditionMode(mode);
  if (conditionMode === 'or') {
    return {
      active: true,
      closed: enabled.some((isEnabled, index) => isEnabled && met[index]),
    };
  }

  for (let i = 0; i < enabled.length; i++) {
    if (enabled[i] && !met[i]) return { active: true, closed: false };
  }

  return { active: true, closed: true };
}

function categoryRing(
  categoryMet: boolean | null | undefined,
  enabled: boolean[],
  met: boolean[],
  mode: GoalConditionMode
): RingStatus {
  const computed = ringStatus(enabled, met, mode);
  if (typeof categoryMet !== 'boolean') return computed;

  return {
    active: computed.active || categoryMet,
    // Prefer a closed ring when either the aggregate flag or the metric-level
    // checks say the category was met. This keeps the UI correct even if the
    // denormalized *_met boolean lags behind the detailed metric fields.
    closed: categoryMet || computed.closed,
  };
}

export function computeRings(row: DailyGoalResults): Rings {
  const strengthEnabled = [
    asTrue(row.strength_use_time),
    asTrue(row.strength_use_volume),
  ];
  const strengthMet = [
    asTrue(row.met_strength_time),
    asTrue(row.met_strength_volume),
  ];

  const cardioEnabled = [
    asTrue(row.cardio_use_time),
    asTrue(row.cardio_use_distance),
  ];
  const cardioMet = [
    asTrue(row.met_cardio_time),
    asTrue(row.met_cardio_distance),
  ];

  const nutritionEnabled = [
    asTrue(row.protein_enabled),
    asTrue(row.carbs_enabled),
    asTrue(row.fats_enabled),
    caloriesEnabled(row.calorie_goal_mode),
  ];
  const nutritionMet = [
    asTrue(row.met_protein),
    asTrue(row.met_carbs),
    asTrue(row.met_fats),
    asTrue(row.met_calories),
  ];

  const strength = categoryRing(
    row.strength_met,
    strengthEnabled,
    strengthMet,
    row.strength_condition_mode
  );
  const cardio = categoryRing(
    row.cardio_met,
    cardioEnabled,
    cardioMet,
    row.cardio_condition_mode
  );
  const nutrition = categoryRing(
    row.nutrition_met,
    nutritionEnabled,
    nutritionMet,
    row.nutrition_condition_mode
  );

  const anyActive = strength.active || cardio.active || nutrition.active;
  const allClosed = anyActive
    ? (!strength.active || strength.closed) &&
      (!cardio.active || cardio.closed) &&
      (!nutrition.active || nutrition.closed)
    : false;

  return { strength, cardio, nutrition, allClosed };
}

export function isGoalCategoryClosed(
  row: DailyGoalResults,
  category: GoalCategoryKey
): boolean {
  return computeRings(row)[category].closed;
}

export function goalCategoryLabel(category: GoalCategoryKey): string {
  if (category === 'strength') return 'Strength goal complete';
  if (category === 'cardio') return 'Cardio goal complete';
  return 'Nutrition goal complete';
}

export function computeMetAllFromRow(row: DailyGoalResults): boolean {
  return computeRings(row).allClosed;
}
