export type NutritionTimelineId = 'week' | 'month' | 'quarter' | 'halfYear' | 'year';
export type NutritionMetricId =
  | 'calories'
  | 'protein'
  | 'carbs'
  | 'fat'
  | 'fiber'
  | 'sodium'
  | 'sugar'
  | 'meals'
  | 'goalHit';

export type NutritionSourceKey = 'manual' | 'barcode' | 'ocr' | 'import' | 'user' | 'other';
export type NutritionFoodKindKey = 'packaged' | 'ingredient' | 'recipe' | 'other';

export type NutritionDayActivity = {
  id: string;
  date: string;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  sodiumMg: number;
  sugarG: number;
  kcalTarget: number | null;
  proteinTargetG: number | null;
  carbsTargetG: number | null;
  fatTargetG: number | null;
  goalHit: boolean;
  mealCount: number;
  recipeEntryCount: number;
  foodEntryCount: number;
  favoriteMealReuseCount: number;
  preWorkoutMealCount: number;
  postWorkoutMealCount: number;
  preWorkoutCalories: number;
  preWorkoutCarbsG: number;
  postWorkoutProteinG: number;
  postWorkoutCarbsG: number;
  lateCalories: number;
  hourlyMealBins: number[];
  hourlyCaloriesBins: number[];
  mealSlotCounts: Record<string, number>;
  mealSlotCalories: Record<string, number>;
  sourceCounts: Record<NutritionSourceKey, number>;
  foodKindCounts: Record<NutritionFoodKindKey, number>;
  foodKindCalories: Record<NutritionFoodKindKey, number>;
  isStrengthDay: boolean;
  isCardioDay: boolean;
  isTrainingDay: boolean;
  proteinTargetHit: boolean;
  carbsTargetHit: boolean;
  fatTargetHit: boolean;
  calorieTargetHit: boolean;
};

export type NutritionEntryInsight = {
  id: string;
  date: string;
  diaryDayId: string;
  mealSlot: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  foodId: string | null;
  foodLabel: string | null;
  recipeId: string | null;
  recipeLabel: string | null;
  isFavoriteMeal: boolean;
};

type TimelineBucket = {
  key: string;
  label: string;
  start: Date;
  end: Date;
};

type NutritionTimelineWindow = {
  rangeLabel: string;
  cadenceLabel: string;
  buckets: TimelineBucket[];
};

type NutritionMetricOption = {
  id: NutritionMetricId;
  label: string;
  helperText: string;
};

type NutritionTimelineOption = {
  id: NutritionTimelineId;
  label: string;
};

type NutritionBucketPoint = {
  t: number;
  v: number;
};

export type NutritionTimelineData = {
  summary: NutritionRangeSummary;
  rangeLabel: string;
  cadenceLabel: string;
  points: NutritionBucketPoint[];
  labelsByIndex: Record<number, string>;
};

export type NutritionDistributionItem = {
  key: string;
  label: string;
  value: number;
  valueLabel: string;
  detail?: string;
  tone?: 'primary' | 'secondary' | 'tertiary' | 'success' | 'warning';
};

export type NutritionHeatmapCell = {
  key: string;
  label: string;
  meals: number;
  calories: number;
  intensity: number;
};

export type NutritionRangeSummary = {
  daysLogged: number;
  loggingStreak: number;
  totalMeals: number;
  avgMealsPerDay: number;
  avgCalories: number;
  avgProteinG: number;
  avgCarbsG: number;
  avgFatG: number;
  avgFiberG: number;
  avgSodiumMg: number;
  avgSugarG: number;
  goalHitDays: number;
  goalHitRatePct: number;
  breakfastCoverageDays: number;
  lunchCoverageDays: number;
  dinnerCoverageDays: number;
  fullDayLoggingDays: number;
  fullDayLoggingRatePct: number;
  calorieTargetHitDays: number;
  calorieTargetHitRatePct: number;
  proteinTargetHitDays: number;
  proteinTargetHitRatePct: number;
  carbTargetHitDays: number;
  carbTargetHitRatePct: number;
  fatTargetHitDays: number;
  fatTargetHitRatePct: number;
  totalPreWorkoutMeals: number;
  totalPostWorkoutMeals: number;
  avgPreWorkoutCarbsG: number;
  avgPostWorkoutProteinG: number;
  trainingDayCount: number;
  restDayCount: number;
  trainingDayAvgCalories: number;
  trainingDayAvgProteinG: number;
  trainingDayAvgCarbsG: number;
  restDayAvgCalories: number;
  restDayAvgProteinG: number;
  restDayAvgCarbsG: number;
  proteinConsistencyPct: number;
  carbSupportPct: number;
  recoveryNutritionScorePct: number;
  underFueledTrainingDays: number;
  preWorkoutCompliancePct: number;
  postWorkoutCompliancePct: number;
  lateFuelRatioPct: number;
  macroVariancePct: number;
  highSodiumDays: number;
  highSugarDays: number;
  lowFiberDays: number;
  recipeUsageCount: number;
  favoriteMealReuseCount: number;
  macroComposition: {
    proteinCalories: number;
    carbsCalories: number;
    fatCalories: number;
    proteinPct: number;
    carbsPct: number;
    fatPct: number;
  };
  mealCoverageDistribution: NutritionDistributionItem[];
  mealSlotDistribution: NutritionDistributionItem[];
  foodKindDistribution: NutritionDistributionItem[];
  sourceDistribution: NutritionDistributionItem[];
  trainingComparison: NutritionDistributionItem[];
  timingHeatmap: NutritionHeatmapCell[];
};

export type NutritionRepeatSummary = {
  uniqueFoodsLogged: number;
  uniqueMealsLogged: number;
  mostLoggedFoodLabel: string | null;
  mostLoggedFoodCount: number;
  mostLoggedMealLabel: string | null;
  mostLoggedMealCount: number;
  topFoods: NutritionDistributionItem[];
  topMeals: NutritionDistributionItem[];
};

type BuildNutritionTimelineDataArgs = {
  activities: NutritionDayActivity[];
  metricId: NutritionMetricId;
  timelineId: NutritionTimelineId;
  now?: Date;
};

const MEAL_SLOT_LABELS: Record<string, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
  'pre-workout': 'Pre-workout',
  'post-workout': 'Post-workout',
  custom: 'Custom',
};

const SOURCE_LABELS: Record<NutritionSourceKey, string> = {
  manual: 'Manual',
  barcode: 'Barcode',
  ocr: 'OCR',
  import: 'Import',
  user: 'User',
  other: 'Other',
};

const FOOD_KIND_LABELS: Record<NutritionFoodKindKey, string> = {
  packaged: 'Packaged',
  ingredient: 'Ingredient',
  recipe: 'Recipe',
  other: 'Other',
};

export const NUTRITION_METRIC_OPTIONS: NutritionMetricOption[] = [
  {
    id: 'calories',
    label: 'Calories',
    helperText: 'Average calorie intake per logged day in each period.',
  },
  {
    id: 'protein',
    label: 'Protein',
    helperText: 'Average protein intake per logged day.',
  },
  {
    id: 'carbs',
    label: 'Carbs',
    helperText: 'Average carbohydrate intake per logged day.',
  },
  {
    id: 'fat',
    label: 'Fat',
    helperText: 'Average fat intake per logged day.',
  },
  {
    id: 'fiber',
    label: 'Fiber',
    helperText: 'Average fiber intake per logged day.',
  },
  {
    id: 'sodium',
    label: 'Sodium',
    helperText: 'Average sodium intake per logged day.',
  },
  {
    id: 'sugar',
    label: 'Sugar',
    helperText: 'Average sugar intake per logged day.',
  },
  {
    id: 'meals',
    label: 'Meals',
    helperText: 'Average meals logged per day.',
  },
  {
    id: 'goalHit',
    label: 'Goal Hit %',
    helperText: 'Nutrition goal completion rate for the selected period.',
  },
];

export const NUTRITION_TIMELINE_OPTIONS: NutritionTimelineOption[] = [
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'quarter', label: '3 Mo' },
  { id: 'halfYear', label: '6 Mo' },
  { id: 'year', label: 'Year' },
];

function roundTo(value: number, digits = 0) {
  const multiplier = 10 ** digits;
  return Math.round(value * multiplier) / multiplier;
}

function startOfDay(value: Date) {
  const next = new Date(value);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(value: Date) {
  const next = new Date(value);
  next.setHours(23, 59, 59, 999);
  return next;
}

function addDays(value: Date, amount: number) {
  const next = new Date(value);
  next.setDate(next.getDate() + amount);
  return next;
}

function startOfMonth(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), 1, 0, 0, 0, 0);
}

function endOfMonth(value: Date) {
  return new Date(value.getFullYear(), value.getMonth() + 1, 0, 23, 59, 59, 999);
}

function addMonths(value: Date, amount: number) {
  return new Date(value.getFullYear(), value.getMonth() + amount, 1, 0, 0, 0, 0);
}

function formatDateLabel(value: Date, options: Intl.DateTimeFormatOptions) {
  return value.toLocaleDateString(undefined, options);
}

function toIsoDateKey(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function safeAverage(total: number, count: number) {
  return count > 0 ? total / count : 0;
}

function calculateStreak(dateKeys: string[]) {
  if (!dateKeys.length) return 0;

  const unique = Array.from(new Set(dateKeys)).sort((left, right) =>
    right.localeCompare(left)
  );

  let streak = 1;
  for (let index = 1; index < unique.length; index += 1) {
    const previous = new Date(`${unique[index - 1]}T00:00:00`);
    const current = new Date(`${unique[index]}T00:00:00`);
    const diffDays = Math.round((previous.getTime() - current.getTime()) / 86400000);
    if (diffDays !== 1) break;
    streak += 1;
  }

  return streak;
}

function buildDayBuckets(now: Date, count: number, rangeLabel: string): NutritionTimelineWindow {
  const start = startOfDay(addDays(now, -(count - 1)));
  const buckets = Array.from({ length: count }, (_, index) => {
    const dayStart = startOfDay(addDays(start, index));
    const dayEnd = endOfDay(dayStart);

    return {
      key: dayStart.toISOString(),
      label:
        count <= 7
          ? formatDateLabel(dayStart, { weekday: 'short' })
          : formatDateLabel(dayStart, { month: 'short', day: 'numeric' }),
      start: dayStart,
      end: dayEnd,
    };
  });

  return {
    rangeLabel,
    cadenceLabel: 'Daily rollup',
    buckets,
  };
}

function buildWeeklyBuckets(now: Date): NutritionTimelineWindow {
  const count = 13;
  const start = startOfDay(addDays(now, -(count * 7 - 1)));
  const buckets = Array.from({ length: count }, (_, index) => {
    const bucketStart = startOfDay(addDays(start, index * 7));
    const bucketEnd = endOfDay(addDays(bucketStart, 6));

    return {
      key: bucketStart.toISOString(),
      label: formatDateLabel(bucketStart, { month: 'short', day: 'numeric' }),
      start: bucketStart,
      end: bucketEnd,
    };
  });

  return {
    rangeLabel: 'Past 13 weeks',
    cadenceLabel: 'Weekly rollup',
    buckets,
  };
}

function buildMonthlyBuckets(now: Date, count: number, rangeLabel: string): NutritionTimelineWindow {
  const currentMonth = startOfMonth(now);
  const firstMonth = addMonths(currentMonth, -(count - 1));
  const buckets = Array.from({ length: count }, (_, index) => {
    const monthStart = addMonths(firstMonth, index);
    const monthEnd = endOfMonth(monthStart);

    return {
      key: monthStart.toISOString(),
      label: formatDateLabel(monthStart, { month: 'short' }),
      start: monthStart,
      end: monthEnd,
    };
  });

  return {
    rangeLabel,
    cadenceLabel: 'Monthly rollup',
    buckets,
  };
}

function buildTimelineWindow(timelineId: NutritionTimelineId, now: Date) {
  switch (timelineId) {
    case 'week':
      return buildDayBuckets(now, 7, 'Past 7 days');
    case 'month':
      return buildDayBuckets(now, 30, 'Past 30 days');
    case 'quarter':
      return buildWeeklyBuckets(now);
    case 'halfYear':
      return buildMonthlyBuckets(now, 6, 'Past 6 months');
    case 'year':
    default:
      return buildMonthlyBuckets(now, 12, 'Past 12 months');
  }
}

function metricValueForDays(metricId: NutritionMetricId, days: NutritionDayActivity[]) {
  if (!days.length) return 0;

  const daysLogged = days.length;

  switch (metricId) {
    case 'calories':
      return safeAverage(
        days.reduce((sum, day) => sum + day.kcal, 0),
        daysLogged
      );
    case 'protein':
      return safeAverage(
        days.reduce((sum, day) => sum + day.proteinG, 0),
        daysLogged
      );
    case 'carbs':
      return safeAverage(
        days.reduce((sum, day) => sum + day.carbsG, 0),
        daysLogged
      );
    case 'fat':
      return safeAverage(
        days.reduce((sum, day) => sum + day.fatG, 0),
        daysLogged
      );
    case 'fiber':
      return safeAverage(
        days.reduce((sum, day) => sum + day.fiberG, 0),
        daysLogged
      );
    case 'sodium':
      return safeAverage(
        days.reduce((sum, day) => sum + day.sodiumMg, 0),
        daysLogged
      );
    case 'sugar':
      return safeAverage(
        days.reduce((sum, day) => sum + day.sugarG, 0),
        daysLogged
      );
    case 'meals':
      return safeAverage(
        days.reduce((sum, day) => sum + day.mealCount, 0),
        daysLogged
      );
    case 'goalHit':
      return (
        safeAverage(
          days.reduce((sum, day) => sum + (day.goalHit ? 100 : 0), 0),
          daysLogged
        ) || 0
      );
    default:
      return 0;
  }
}

function buildDistributionItems(
  entries: Array<{
    key: string;
    label: string;
    value: number;
    tone?: NutritionDistributionItem['tone'];
    valueLabel?: string;
    detail?: string;
  }>,
  formatter: (value: number) => string
) {
  const total = entries.reduce((sum, entry) => sum + entry.value, 0);

  return entries
    .filter((entry) => entry.value > 0)
    .sort((left, right) => right.value - left.value)
    .map((entry) => ({
      key: entry.key,
      label: entry.label,
      value: entry.value,
      valueLabel: entry.valueLabel ?? formatter(entry.value),
      detail:
        entry.detail ??
        (total > 0 ? `${Math.round((entry.value / total) * 100)}% of total` : undefined),
      tone: entry.tone ?? 'primary',
    }));
}

function makeHeatmap(hours: number[], calories: number[]) {
  const maxMeals = Math.max(...hours, 0);

  return Array.from({ length: 8 }, (_, index) => {
    const startHour = index * 3;
    const endHour = startHour + 2;
    const meals = hours[index] ?? 0;
    const totalCalories = calories[index] ?? 0;

    return {
      key: `${startHour}`,
      label: `${String(startHour).padStart(2, '0')}-${String(endHour + 1).padStart(2, '0')}`,
      meals,
      calories: totalCalories,
      intensity: maxMeals > 0 ? meals / maxMeals : 0,
    };
  });
}

function macroVariancePct(days: NutritionDayActivity[]) {
  if (days.length <= 1) return 0;

  const metrics = [
    days.map((day) => day.proteinG),
    days.map((day) => day.carbsG),
    days.map((day) => day.fatG),
  ];

  const variations = metrics
    .map((values) => {
      const mean = safeAverage(values.reduce((sum, value) => sum + value, 0), values.length);
      if (mean <= 0) return 0;
      const variance =
        values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
      return Math.sqrt(variance) / mean;
    })
    .filter((value) => Number.isFinite(value));

  return safeAverage(
    variations.reduce((sum, value) => sum + value, 0),
    variations.length
  ) * 100;
}

export function formatCalories(value: number, digits = 0) {
  return `${value.toLocaleString(undefined, {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  })} kcal`;
}

export function formatGrams(value: number, digits = 0) {
  return `${value.toLocaleString(undefined, {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  })} g`;
}

export function formatSodium(value: number) {
  return `${Math.round(value).toLocaleString()} mg`;
}

export function formatPercent(value: number, digits = 0) {
  return `${value.toLocaleString(undefined, {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  })}%`;
}

export function formatCount(value: number, noun: string, plural = `${noun}s`) {
  const rounded = Math.round(value);
  return `${rounded} ${rounded === 1 ? noun : plural}`;
}

export function summarizeNutritionRange(days: NutritionDayActivity[]): NutritionRangeSummary {
  const daysLogged = days.length;
  const totalMeals = days.reduce((sum, day) => sum + day.mealCount, 0);
  const avgCalories = safeAverage(days.reduce((sum, day) => sum + day.kcal, 0), daysLogged);
  const avgProteinG = safeAverage(
    days.reduce((sum, day) => sum + day.proteinG, 0),
    daysLogged
  );
  const avgCarbsG = safeAverage(days.reduce((sum, day) => sum + day.carbsG, 0), daysLogged);
  const avgFatG = safeAverage(days.reduce((sum, day) => sum + day.fatG, 0), daysLogged);
  const avgFiberG = safeAverage(
    days.reduce((sum, day) => sum + day.fiberG, 0),
    daysLogged
  );
  const avgSodiumMg = safeAverage(
    days.reduce((sum, day) => sum + day.sodiumMg, 0),
    daysLogged
  );
  const avgSugarG = safeAverage(
    days.reduce((sum, day) => sum + day.sugarG, 0),
    daysLogged
  );
  const goalHitDays = days.filter((day) => day.goalHit).length;
  const goalHitRatePct = safeAverage(goalHitDays * 100, daysLogged);
  const breakfastCoverageDays = days.filter((day) => (day.mealSlotCounts.breakfast ?? 0) > 0).length;
  const lunchCoverageDays = days.filter((day) => (day.mealSlotCounts.lunch ?? 0) > 0).length;
  const dinnerCoverageDays = days.filter((day) => (day.mealSlotCounts.dinner ?? 0) > 0).length;
  const fullDayLoggingDays = days.filter((day) => {
    const breakfastCount = day.mealSlotCounts.breakfast ?? 0;
    const lunchCount = day.mealSlotCounts.lunch ?? 0;
    const dinnerCount = day.mealSlotCounts.dinner ?? 0;
    return breakfastCount > 0 && lunchCount > 0 && dinnerCount > 0;
  }).length;
  const fullDayLoggingRatePct = safeAverage(fullDayLoggingDays * 100, daysLogged);
  const totalPreWorkoutMeals = days.reduce((sum, day) => sum + day.preWorkoutMealCount, 0);
  const totalPostWorkoutMeals = days.reduce((sum, day) => sum + day.postWorkoutMealCount, 0);

  const trainingDays = days.filter((day) => day.isTrainingDay);
  const restDays = days.filter((day) => !day.isTrainingDay);
  const trainingDayCount = trainingDays.length;
  const restDayCount = restDays.length;

  const proteinTargetDays = days.filter((day) => day.proteinTargetG != null).length;
  const carbTargetDays = days.filter((day) => day.carbsTargetG != null).length;
  const fatTargetDays = days.filter((day) => day.fatTargetG != null).length;
  const calorieTargetDays = days.filter((day) => day.kcalTarget != null).length;
  const proteinTargetHitDays = days.filter((day) => day.proteinTargetHit).length;
  const carbTargetHitDays = days.filter((day) => day.carbsTargetHit).length;
  const fatTargetHitDays = days.filter((day) => day.fatTargetHit).length;
  const calorieTargetHitDays = days.filter((day) => day.calorieTargetHit).length;
  const carbSupportDays = trainingDays.filter((day) => day.carbsTargetG != null).length;
  const underFueledTrainingDays = trainingDays.filter((day) => {
    const lowCalories =
      day.kcalTarget != null && day.kcalTarget > 0 && day.kcal < day.kcalTarget * 0.85;
    const lowCarbs =
      day.carbsTargetG != null && day.carbsTargetG > 0 && day.carbsG < day.carbsTargetG * 0.85;
    return lowCalories || lowCarbs;
  }).length;

  const postWorkoutRecoveryHits = trainingDays.filter(
    (day) => day.postWorkoutProteinG >= 20 && day.postWorkoutCarbsG >= 20
  ).length;
  const preWorkoutFuelHits = trainingDays.filter(
    (day) => day.preWorkoutMealCount > 0 || day.preWorkoutCalories >= 150 || day.preWorkoutCarbsG >= 20
  ).length;

  const recoveryNutritionScorePct =
    trainingDayCount > 0
      ? safeAverage(
          trainingDays.reduce((sum, day) => {
            const proteinScore = Math.min(day.postWorkoutProteinG / 20, 1) * 50;
            const carbScore = Math.min(day.postWorkoutCarbsG / 20, 1) * 50;
            return sum + proteinScore + carbScore;
          }, 0),
          trainingDayCount
        )
      : 0;

  const hours = Array.from({ length: 8 }, () => 0);
  const calories = Array.from({ length: 8 }, () => 0);
  const slotTotals = new Map<string, number>();
  const sourceCounts: Record<NutritionSourceKey, number> = {
    manual: 0,
    barcode: 0,
    ocr: 0,
    import: 0,
    user: 0,
    other: 0,
  };
  const foodKindCounts: Record<NutritionFoodKindKey, number> = {
    packaged: 0,
    ingredient: 0,
    recipe: 0,
    other: 0,
  };
  const foodKindCalories: Record<NutritionFoodKindKey, number> = {
    packaged: 0,
    ingredient: 0,
    recipe: 0,
    other: 0,
  };

  days.forEach((day) => {
    day.hourlyMealBins.forEach((count, index) => {
      hours[index] += count;
    });
    day.hourlyCaloriesBins.forEach((value, index) => {
      calories[index] += value;
    });

    Object.entries(day.mealSlotCalories).forEach(([slot, value]) => {
      slotTotals.set(slot, (slotTotals.get(slot) ?? 0) + value);
    });

    (Object.keys(sourceCounts) as NutritionSourceKey[]).forEach((key) => {
      sourceCounts[key] += day.sourceCounts[key];
    });

    (Object.keys(foodKindCounts) as NutritionFoodKindKey[]).forEach((key) => {
      foodKindCounts[key] += day.foodKindCounts[key];
      foodKindCalories[key] += day.foodKindCalories[key];
    });

  });

  const mealSlotDistribution = buildDistributionItems(
    Array.from(slotTotals.entries()).map(([slot, value], index) => ({
      key: slot,
      label: MEAL_SLOT_LABELS[slot] ?? slot,
      value,
      tone: index % 3 === 0 ? 'primary' : index % 3 === 1 ? 'secondary' : 'tertiary',
    })),
    (value) => formatCalories(value, 0)
  );

  const mealCoverageDistribution = buildDistributionItems(
    [
      {
        key: 'breakfast',
        label: 'Breakfast logged',
        value: breakfastCoverageDays,
        valueLabel: formatCount(breakfastCoverageDays, 'day'),
        detail: formatPercent(safeAverage(breakfastCoverageDays * 100, daysLogged), 0),
        tone: 'primary',
      },
      {
        key: 'lunch',
        label: 'Lunch logged',
        value: lunchCoverageDays,
        valueLabel: formatCount(lunchCoverageDays, 'day'),
        detail: formatPercent(safeAverage(lunchCoverageDays * 100, daysLogged), 0),
        tone: 'secondary',
      },
      {
        key: 'dinner',
        label: 'Dinner logged',
        value: dinnerCoverageDays,
        valueLabel: formatCount(dinnerCoverageDays, 'day'),
        detail: formatPercent(safeAverage(dinnerCoverageDays * 100, daysLogged), 0),
        tone: 'tertiary',
      },
      {
        key: 'full-day',
        label: 'Full day logged',
        value: fullDayLoggingDays,
        valueLabel: formatCount(fullDayLoggingDays, 'day'),
        detail: formatPercent(fullDayLoggingRatePct, 0),
        tone: 'success',
      },
    ],
    (value) => formatCount(value, 'day')
  );

  const sourceDistribution = buildDistributionItems(
    (Object.keys(sourceCounts) as NutritionSourceKey[]).map((key, index) => ({
      key,
      label: SOURCE_LABELS[key],
      value: sourceCounts[key],
      tone: index % 3 === 0 ? 'primary' : index % 3 === 1 ? 'secondary' : 'tertiary',
    })),
    (value) => formatCount(value, 'entry')
  );

  const foodKindDistribution = buildDistributionItems(
    (Object.keys(foodKindCalories) as NutritionFoodKindKey[]).map((key, index) => ({
      key,
      label: FOOD_KIND_LABELS[key],
      value: foodKindCalories[key],
      tone:
        key === 'packaged'
          ? 'warning'
          : key === 'ingredient'
            ? 'success'
            : index % 3 === 0
              ? 'primary'
              : 'secondary',
    })),
    (value) => formatCalories(value, 0)
  );

  const trainingComparison = buildDistributionItems(
    [
      {
        key: 'training-calories',
        label: 'Training cals',
        value: safeAverage(
          trainingDays.reduce((sum, day) => sum + day.kcal, 0),
          trainingDayCount
        ),
        valueLabel: formatCalories(
          safeAverage(trainingDays.reduce((sum, day) => sum + day.kcal, 0), trainingDayCount),
          0
        ),
        tone: 'primary',
      },
      {
        key: 'rest-calories',
        label: 'Rest cals',
        value: safeAverage(restDays.reduce((sum, day) => sum + day.kcal, 0), restDayCount),
        valueLabel: formatCalories(
          safeAverage(restDays.reduce((sum, day) => sum + day.kcal, 0), restDayCount),
          0
        ),
        tone: 'secondary',
      },
      {
        key: 'training-protein',
        label: 'Training protein',
        value: safeAverage(
          trainingDays.reduce((sum, day) => sum + day.proteinG, 0),
          trainingDayCount
        ),
        valueLabel: formatGrams(
          safeAverage(trainingDays.reduce((sum, day) => sum + day.proteinG, 0), trainingDayCount),
          0
        ),
        tone: 'tertiary',
      },
      {
        key: 'rest-protein',
        label: 'Rest protein',
        value: safeAverage(restDays.reduce((sum, day) => sum + day.proteinG, 0), restDayCount),
        valueLabel: formatGrams(
          safeAverage(restDays.reduce((sum, day) => sum + day.proteinG, 0), restDayCount),
          0
        ),
        tone: 'success',
      },
      {
        key: 'training-carbs',
        label: 'Training carbs',
        value: safeAverage(
          trainingDays.reduce((sum, day) => sum + day.carbsG, 0),
          trainingDayCount
        ),
        valueLabel: formatGrams(
          safeAverage(trainingDays.reduce((sum, day) => sum + day.carbsG, 0), trainingDayCount),
          0
        ),
        tone: 'primary',
      },
      {
        key: 'rest-carbs',
        label: 'Rest carbs',
        value: safeAverage(restDays.reduce((sum, day) => sum + day.carbsG, 0), restDayCount),
        valueLabel: formatGrams(
          safeAverage(restDays.reduce((sum, day) => sum + day.carbsG, 0), restDayCount),
          0
        ),
        tone: 'secondary',
      },
    ],
    (value) => `${value.toFixed(0)}`
  );

  const proteinCalories = days.reduce((sum, day) => sum + day.proteinG * 4, 0);
  const carbsCalories = days.reduce((sum, day) => sum + day.carbsG * 4, 0);
  const fatCalories = days.reduce((sum, day) => sum + day.fatG * 9, 0);
  const totalMacroCalories = proteinCalories + carbsCalories + fatCalories;
  const lateFuelRatioPct =
    days.reduce((sum, day) => sum + day.lateCalories, 0) /
    Math.max(days.reduce((sum, day) => sum + day.kcal, 0), 1) *
    100;

  return {
    daysLogged,
    loggingStreak: calculateStreak(days.map((day) => day.date)),
    totalMeals,
    avgMealsPerDay: safeAverage(totalMeals, daysLogged),
    avgCalories,
    avgProteinG,
    avgCarbsG,
    avgFatG,
    avgFiberG,
    avgSodiumMg,
    avgSugarG,
    goalHitDays,
    goalHitRatePct,
    breakfastCoverageDays,
    lunchCoverageDays,
    dinnerCoverageDays,
    fullDayLoggingDays,
    fullDayLoggingRatePct,
    calorieTargetHitDays,
    calorieTargetHitRatePct:
      calorieTargetDays > 0 ? (calorieTargetHitDays / calorieTargetDays) * 100 : 0,
    proteinTargetHitDays,
    proteinTargetHitRatePct:
      proteinTargetDays > 0 ? (proteinTargetHitDays / proteinTargetDays) * 100 : 0,
    carbTargetHitDays,
    carbTargetHitRatePct: carbTargetDays > 0 ? (carbTargetHitDays / carbTargetDays) * 100 : 0,
    fatTargetHitDays,
    fatTargetHitRatePct: fatTargetDays > 0 ? (fatTargetHitDays / fatTargetDays) * 100 : 0,
    totalPreWorkoutMeals,
    totalPostWorkoutMeals,
    avgPreWorkoutCarbsG: safeAverage(
      days.reduce((sum, day) => sum + day.preWorkoutCarbsG, 0),
      Math.max(totalPreWorkoutMeals, 1)
    ),
    avgPostWorkoutProteinG: safeAverage(
      days.reduce((sum, day) => sum + day.postWorkoutProteinG, 0),
      Math.max(totalPostWorkoutMeals, 1)
    ),
    trainingDayCount,
    restDayCount,
    trainingDayAvgCalories: safeAverage(
      trainingDays.reduce((sum, day) => sum + day.kcal, 0),
      trainingDayCount
    ),
    trainingDayAvgProteinG: safeAverage(
      trainingDays.reduce((sum, day) => sum + day.proteinG, 0),
      trainingDayCount
    ),
    trainingDayAvgCarbsG: safeAverage(
      trainingDays.reduce((sum, day) => sum + day.carbsG, 0),
      trainingDayCount
    ),
    restDayAvgCalories: safeAverage(restDays.reduce((sum, day) => sum + day.kcal, 0), restDayCount),
    restDayAvgProteinG: safeAverage(
      restDays.reduce((sum, day) => sum + day.proteinG, 0),
      restDayCount
    ),
    restDayAvgCarbsG: safeAverage(restDays.reduce((sum, day) => sum + day.carbsG, 0), restDayCount),
    proteinConsistencyPct:
      proteinTargetDays > 0
        ? (days.filter((day) => day.proteinTargetHit).length / proteinTargetDays) * 100
        : 0,
    carbSupportPct:
      carbSupportDays > 0
        ? (trainingDays.filter((day) => day.carbsTargetHit).length / carbSupportDays) * 100
        : carbTargetDays > 0
          ? (days.filter((day) => day.carbsTargetHit).length / carbTargetDays) * 100
          : 0,
    recoveryNutritionScorePct,
    underFueledTrainingDays,
    preWorkoutCompliancePct:
      trainingDayCount > 0 ? (preWorkoutFuelHits / trainingDayCount) * 100 : 0,
    postWorkoutCompliancePct:
      trainingDayCount > 0 ? (postWorkoutRecoveryHits / trainingDayCount) * 100 : 0,
    lateFuelRatioPct,
    macroVariancePct: macroVariancePct(days),
    highSodiumDays: days.filter((day) => day.sodiumMg >= 2300).length,
    highSugarDays: days.filter((day) => day.sugarG >= 50).length,
    lowFiberDays: days.filter((day) => day.fiberG > 0 && day.fiberG < 25).length,
    recipeUsageCount: days.reduce((sum, day) => sum + day.recipeEntryCount, 0),
    favoriteMealReuseCount: days.reduce((sum, day) => sum + day.favoriteMealReuseCount, 0),
    macroComposition: {
      proteinCalories,
      carbsCalories,
      fatCalories,
      proteinPct: totalMacroCalories > 0 ? (proteinCalories / totalMacroCalories) * 100 : 0,
      carbsPct: totalMacroCalories > 0 ? (carbsCalories / totalMacroCalories) * 100 : 0,
      fatPct: totalMacroCalories > 0 ? (fatCalories / totalMacroCalories) * 100 : 0,
    },
    mealCoverageDistribution,
    mealSlotDistribution,
    foodKindDistribution,
    sourceDistribution,
    trainingComparison,
    timingHeatmap: makeHeatmap(hours, calories),
  };
}

function dayInRange(day: NutritionDayActivity, start: Date, end: Date) {
  const date = new Date(`${day.date}T12:00:00`);
  return date >= start && date <= end;
}

export function buildNutritionTimelineData({
  activities,
  metricId,
  timelineId,
  now = new Date(),
}: BuildNutritionTimelineDataArgs): NutritionTimelineData {
  const window = buildTimelineWindow(timelineId, now);
  const windowStart = window.buckets[0]?.start ?? startOfDay(now);
  const windowEnd = window.buckets[window.buckets.length - 1]?.end ?? endOfDay(now);

  const filtered = activities.filter((activity) => dayInRange(activity, windowStart, windowEnd));
  const labelsByIndex: Record<number, string> = {};

  const points = window.buckets.map((bucket, index) => {
    labelsByIndex[index] = bucket.label;
    const bucketDays = filtered.filter((day) => dayInRange(day, bucket.start, bucket.end));

    return {
      t: index,
      v: roundTo(metricValueForDays(metricId, bucketDays), metricId === 'goalHit' ? 0 : 1),
    };
  });

  return {
    summary: summarizeNutritionRange(filtered),
    rangeLabel: window.rangeLabel,
    cadenceLabel: window.cadenceLabel,
    points,
    labelsByIndex,
  };
}

export function filterNutritionActivitiesByTimeline(
  activities: NutritionDayActivity[],
  timelineId: NutritionTimelineId,
  now = new Date()
) {
  const window = buildTimelineWindow(timelineId, now);
  const windowStart = window.buckets[0]?.start ?? startOfDay(now);
  const windowEnd = window.buckets[window.buckets.length - 1]?.end ?? endOfDay(now);

  return activities.filter((activity) => dayInRange(activity, windowStart, windowEnd));
}

export function filterNutritionEntriesByTimeline(
  entries: NutritionEntryInsight[],
  timelineId: NutritionTimelineId,
  now = new Date()
) {
  const window = buildTimelineWindow(timelineId, now);
  const windowStart = window.buckets[0]?.start ?? startOfDay(now);
  const windowEnd = window.buckets[window.buckets.length - 1]?.end ?? endOfDay(now);

  return entries.filter((entry) => {
    const date = new Date(`${entry.date}T12:00:00`);
    return date >= windowStart && date <= windowEnd;
  });
}

export function summarizeNutritionRepeat(
  entries: NutritionEntryInsight[]
): NutritionRepeatSummary {
  const foods = new Map<
    string,
    {
      key: string;
      label: string;
      count: number;
      calories: number;
    }
  >();
  const meals = new Map<
    string,
    {
      key: string;
      label: string;
      count: number;
      calories: number;
      favoriteCount: number;
    }
  >();

  entries.forEach((entry) => {
    if (entry.foodId && entry.foodLabel) {
      const next = foods.get(entry.foodId) ?? {
        key: entry.foodId,
        label: entry.foodLabel,
        count: 0,
        calories: 0,
      };
      next.count += 1;
      next.calories += entry.calories;
      foods.set(entry.foodId, next);
    }

    if (entry.recipeId && entry.recipeLabel) {
      const next = meals.get(entry.recipeId) ?? {
        key: entry.recipeId,
        label: entry.recipeLabel,
        count: 0,
        calories: 0,
        favoriteCount: 0,
      };
      next.count += 1;
      next.calories += entry.calories;
      next.favoriteCount += entry.isFavoriteMeal ? 1 : 0;
      meals.set(entry.recipeId, next);
    }
  });

  const sortByRepeat = <T extends { count: number; calories: number; label: string }>(items: T[]) =>
    items.sort(
      (left, right) =>
        right.count - left.count ||
        right.calories - left.calories ||
        left.label.localeCompare(right.label)
    );

  const rankedFoods = sortByRepeat(Array.from(foods.values()));
  const rankedMeals = sortByRepeat(Array.from(meals.values()));

  const topFoods = buildDistributionItems(
    rankedFoods.slice(0, 5).map((item, index) => ({
      key: item.key,
      label: item.label,
      value: item.count,
      valueLabel: formatCount(item.count, 'log', 'logs'),
      detail: formatCalories(item.calories, 0),
      tone: index % 3 === 0 ? 'primary' : index % 3 === 1 ? 'secondary' : 'tertiary',
    })),
    (value) => formatCount(value, 'log', 'logs')
  );

  const topMeals = buildDistributionItems(
    rankedMeals.slice(0, 5).map((item, index) => ({
      key: item.key,
      label: item.label,
      value: item.count,
      valueLabel: formatCount(item.count, 'log', 'logs'),
      detail:
        item.favoriteCount > 0
          ? `${formatCalories(item.calories, 0)} · Favorite`
          : formatCalories(item.calories, 0),
      tone:
        item.favoriteCount > 0
          ? 'warning'
          : index % 3 === 0
            ? 'primary'
            : index % 3 === 1
              ? 'secondary'
              : 'tertiary',
    })),
    (value) => formatCount(value, 'log', 'logs')
  );

  return {
    uniqueFoodsLogged: foods.size,
    uniqueMealsLogged: meals.size,
    mostLoggedFoodLabel: rankedFoods[0]?.label ?? null,
    mostLoggedFoodCount: rankedFoods[0]?.count ?? 0,
    mostLoggedMealLabel: rankedMeals[0]?.label ?? null,
    mostLoggedMealCount: rankedMeals[0]?.count ?? 0,
    topFoods,
    topMeals,
  };
}

export function formatNutritionChartValue(metricId: NutritionMetricId, value: number) {
  if (!Number.isFinite(value)) return '—';

  switch (metricId) {
    case 'calories':
      return formatCalories(value, 0);
    case 'protein':
    case 'carbs':
    case 'fat':
    case 'fiber':
    case 'sugar':
      return formatGrams(value, value >= 100 ? 0 : 1);
    case 'sodium':
      return formatSodium(value);
    case 'meals':
      return `${value.toFixed(value >= 10 ? 0 : 1)}`;
    case 'goalHit':
      return formatPercent(value, 0);
    default:
      return String(value);
  }
}

export function formatNutritionMetricValue(metricId: NutritionMetricId, value: number) {
  return formatNutritionChartValue(metricId, value);
}

export function normalizeNutritionSource(value: string | null | undefined): NutritionSourceKey {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (
    normalized === 'manual' ||
    normalized === 'barcode' ||
    normalized === 'ocr' ||
    normalized === 'import' ||
    normalized === 'user'
  ) {
    return normalized;
  }
  return 'other';
}

export function normalizeFoodKind(value: string | null | undefined): NutritionFoodKindKey {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (normalized === 'packaged' || normalized === 'ingredient') {
    return normalized;
  }
  return 'other';
}

export function createEmptyNutritionDay(date: string): NutritionDayActivity {
  return {
    id: date,
    date,
    kcal: 0,
    proteinG: 0,
    carbsG: 0,
    fatG: 0,
    fiberG: 0,
    sodiumMg: 0,
    sugarG: 0,
    kcalTarget: null,
    proteinTargetG: null,
    carbsTargetG: null,
    fatTargetG: null,
    goalHit: false,
    mealCount: 0,
    recipeEntryCount: 0,
    foodEntryCount: 0,
    favoriteMealReuseCount: 0,
    preWorkoutMealCount: 0,
    postWorkoutMealCount: 0,
    preWorkoutCalories: 0,
    preWorkoutCarbsG: 0,
    postWorkoutProteinG: 0,
    postWorkoutCarbsG: 0,
    lateCalories: 0,
    hourlyMealBins: Array.from({ length: 8 }, () => 0),
    hourlyCaloriesBins: Array.from({ length: 8 }, () => 0),
    mealSlotCounts: {},
    mealSlotCalories: {},
    sourceCounts: {
      manual: 0,
      barcode: 0,
      ocr: 0,
      import: 0,
      user: 0,
      other: 0,
    },
    foodKindCounts: {
      packaged: 0,
      ingredient: 0,
      recipe: 0,
      other: 0,
    },
    foodKindCalories: {
      packaged: 0,
      ingredient: 0,
      recipe: 0,
      other: 0,
    },
    isStrengthDay: false,
    isCardioDay: false,
    isTrainingDay: false,
    proteinTargetHit: false,
    carbsTargetHit: false,
    fatTargetHit: false,
    calorieTargetHit: false,
  };
}

export function buildDateRangeBackOneYear(now = new Date()) {
  const start = startOfDay(new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()));
  const end = endOfDay(now);

  return {
    startDate: toIsoDateKey(start),
    endDate: toIsoDateKey(end),
  };
}
