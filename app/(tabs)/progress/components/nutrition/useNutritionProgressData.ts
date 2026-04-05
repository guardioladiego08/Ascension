import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import { getUserFavoriteMealIds } from '@/lib/nutrition/dataAccess';
import { fetchCardioSessions, fetchStrengthWorkouts, getAuthenticatedUserId } from '@/lib/progress/history';
import { supabase } from '@/lib/supabase';

import {
  buildDateRangeBackOneYear,
  createEmptyNutritionDay,
  normalizeFoodKind,
  normalizeNutritionSource,
  type NutritionDayActivity,
  type NutritionEntryInsight,
} from './nutritionProgressUtils';

type NutritionDayRow = {
  id: string;
  date: string;
  timezone_str: string | null;
  kcal_total: number | string | null;
  protein_g_total: number | string | null;
  carbs_g_total: number | string | null;
  fat_g_total: number | string | null;
  fiber_g_total: number | string | null;
  sodium_mg_total: number | string | null;
  kcal_target: number | string | null;
  protein_g_target: number | string | null;
  carbs_g_target: number | string | null;
  fat_g_target: number | string | null;
  goal_hit: boolean | null;
};

type NutritionItemRow = {
  id: string;
  diary_day_id: string;
  meal_slot: string | null;
  food_id: string | null;
  recipe_id: string | null;
  consumed_at: string | null;
  created_at: string | null;
  kcal: number | string | null;
  protein: number | string | null;
  carbs: number | string | null;
  fat: number | string | null;
  fiber: number | string | null;
  sugar: number | string | null;
  sodium: number | string | null;
};

type FoodMetaRow = {
  id: string;
  name: string | null;
  brand: string | null;
  food_kind: string | null;
  source: string | null;
};

type RecipeMetaRow = {
  id: string;
  name: string | null;
};

type QueryBuilderFactory = () => any;

const PAGE_SIZE = 1000;

function toNumber(value: number | string | null | undefined) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function toDateKey(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function fetchAllRows<T>(queryBuilderFactory: QueryBuilderFactory) {
  const rows: T[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await queryBuilderFactory().range(from, from + PAGE_SIZE - 1);
    if (error) throw error;

    const page = (data ?? []) as T[];
    rows.push(...page);

    if (page.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return rows;
}

async function fetchFoodMeta(foodIds: string[]) {
  if (!foodIds.length) return [] as FoodMetaRow[];

  const rows: FoodMetaRow[] = [];
  const chunkSize = 150;

  for (let index = 0; index < foodIds.length; index += chunkSize) {
    const chunk = foodIds.slice(index, index + chunkSize);
    const { data, error } = await supabase
      .schema('nutrition')
      .from('food_items')
      .select('id, name, brand, food_kind, source')
      .in('id', chunk);

    if (error) throw error;
    rows.push(...((data ?? []) as FoodMetaRow[]));
  }

  return rows;
}

async function fetchRecipeMeta(recipeIds: string[]) {
  if (!recipeIds.length) return [] as RecipeMetaRow[];

  const rows: RecipeMetaRow[] = [];
  const chunkSize = 150;

  for (let index = 0; index < recipeIds.length; index += chunkSize) {
    const chunk = recipeIds.slice(index, index + chunkSize);
    const { data, error } = await supabase
      .schema('nutrition')
      .from('recipes')
      .select('id, name')
      .in('id', chunk);

    if (error) throw error;
    rows.push(...((data ?? []) as RecipeMetaRow[]));
  }

  return rows;
}

function formatFoodLabel(row: FoodMetaRow | undefined) {
  const name = String(row?.name ?? '').trim();
  const brand = String(row?.brand ?? '').trim();
  if (name && brand) return `${brand} ${name}`;
  if (name) return name;
  if (brand) return brand;
  return 'Food';
}

export function useNutritionProgressData() {
  const [activities, setActivities] = useState<NutritionDayActivity[]>([]);
  const [entries, setEntries] = useState<NutritionEntryInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const userId = await getAuthenticatedUserId();
      if (!userId) {
        setActivities([]);
        setEntries([]);
        return;
      }

      const { startDate } = buildDateRangeBackOneYear();

      const [dayRows, strengthWorkouts, cardioSessions, favoriteMealIds] = await Promise.all([
        fetchAllRows<NutritionDayRow>(() =>
          supabase
            .schema('nutrition')
            .from('diary_days')
            .select(
              'id, date, timezone_str, kcal_total, protein_g_total, carbs_g_total, fat_g_total, fiber_g_total, sodium_mg_total, kcal_target, protein_g_target, carbs_g_target, fat_g_target, goal_hit'
            )
            .eq('user_id', userId)
            .gte('date', startDate)
            .order('date', { ascending: true })
        ),
        fetchStrengthWorkouts(userId),
        fetchCardioSessions(userId),
        getUserFavoriteMealIds(userId),
      ]);

      const dayIdToActivity = new Map<string, NutritionDayActivity>();
      dayRows.forEach((row) => {
        const activity = createEmptyNutritionDay(row.date);
        activity.id = row.id;
        activity.date = row.date;
        activity.kcal = toNumber(row.kcal_total);
        activity.proteinG = toNumber(row.protein_g_total);
        activity.carbsG = toNumber(row.carbs_g_total);
        activity.fatG = toNumber(row.fat_g_total);
        activity.fiberG = toNumber(row.fiber_g_total);
        activity.sodiumMg = toNumber(row.sodium_mg_total);
        activity.kcalTarget =
          row.kcal_target == null ? null : toNumber(row.kcal_target);
        activity.proteinTargetG =
          row.protein_g_target == null ? null : toNumber(row.protein_g_target);
        activity.carbsTargetG =
          row.carbs_g_target == null ? null : toNumber(row.carbs_g_target);
        activity.fatTargetG =
          row.fat_g_target == null ? null : toNumber(row.fat_g_target);
        activity.goalHit = Boolean(row.goal_hit);
        activity.proteinTargetHit =
          activity.proteinTargetG != null && activity.proteinG >= activity.proteinTargetG;
        activity.carbsTargetHit =
          activity.carbsTargetG != null && activity.carbsG >= activity.carbsTargetG;
        activity.fatTargetHit =
          activity.fatTargetG != null && activity.fatG >= activity.fatTargetG;
        activity.calorieTargetHit =
          activity.kcalTarget != null && activity.kcal >= activity.kcalTarget;

        dayIdToActivity.set(row.id, activity);
      });

      const dayIds = dayRows.map((row) => row.id);
      const itemRows: NutritionItemRow[] = [];
      const dayChunkSize = 100;

      for (let index = 0; index < dayIds.length; index += dayChunkSize) {
        const chunk = dayIds.slice(index, index + dayChunkSize);
        const chunkRows = await fetchAllRows<NutritionItemRow>(() =>
          supabase
            .schema('nutrition')
            .from('diary_items')
            .select(
              'id, diary_day_id, meal_slot, food_id, recipe_id, consumed_at, created_at, kcal, protein, carbs, fat, fiber, sugar, sodium'
            )
            .in('diary_day_id', chunk)
            .order('consumed_at', { ascending: true })
        );
        itemRows.push(...chunkRows);
      }

      const foodIds = Array.from(
        new Set(
          itemRows
            .map((row) => row.food_id)
            .filter((value): value is string => typeof value === 'string' && value.length > 0)
        )
      );
      const recipeIds = Array.from(
        new Set(
          itemRows
            .map((row) => row.recipe_id)
            .filter((value): value is string => typeof value === 'string' && value.length > 0)
        )
      );

      const [foodMetaRows, recipeMetaRows] = await Promise.all([
        fetchFoodMeta(foodIds),
        fetchRecipeMeta(recipeIds),
      ]);
      const foodMetaById = new Map(foodMetaRows.map((row) => [row.id, row]));
      const recipeMetaById = new Map(recipeMetaRows.map((row) => [row.id, row]));
      const favoriteMealIdSet = new Set(favoriteMealIds);
      const nextEntries: NutritionEntryInsight[] = [];

      itemRows.forEach((row) => {
        const day = dayIdToActivity.get(row.diary_day_id);
        if (!day) return;

        const slot = String(row.meal_slot ?? 'custom');
        const kcal = toNumber(row.kcal);
        const protein = toNumber(row.protein);
        const carbs = toNumber(row.carbs);
        const sugar = toNumber(row.sugar);

        day.mealCount += 1;
        day.mealSlotCounts[slot] = (day.mealSlotCounts[slot] ?? 0) + 1;
        day.mealSlotCalories[slot] = (day.mealSlotCalories[slot] ?? 0) + kcal;
        day.sugarG += sugar;
        day.favoriteMealReuseCount +=
          row.recipe_id && favoriteMealIdSet.has(row.recipe_id) ? 1 : 0;

        if (row.recipe_id) {
          day.recipeEntryCount += 1;
          day.foodKindCounts.recipe += 1;
          day.foodKindCalories.recipe += kcal;
        }

        if (row.food_id) {
          day.foodEntryCount += 1;
          const foodMeta = foodMetaById.get(row.food_id);
          const sourceKey = normalizeNutritionSource(foodMeta?.source);
          const foodKind = normalizeFoodKind(foodMeta?.food_kind);
          day.sourceCounts[sourceKey] += 1;
          day.foodKindCounts[foodKind] += 1;
          day.foodKindCalories[foodKind] += kcal;
        }

        if (slot === 'pre-workout') {
          day.preWorkoutMealCount += 1;
          day.preWorkoutCalories += kcal;
          day.preWorkoutCarbsG += carbs;
        }

        if (slot === 'post-workout') {
          day.postWorkoutMealCount += 1;
          day.postWorkoutProteinG += protein;
          day.postWorkoutCarbsG += carbs;
        }

        const timestamp = row.consumed_at ?? row.created_at;
        const parsed = timestamp ? new Date(timestamp) : null;
        if (parsed && !Number.isNaN(parsed.getTime())) {
          const hour = parsed.getHours();
          const binIndex = Math.max(0, Math.min(7, Math.floor(hour / 3)));
          day.hourlyMealBins[binIndex] += 1;
          day.hourlyCaloriesBins[binIndex] += kcal;

          if (hour >= 20) {
            day.lateCalories += kcal;
          }
        }

        nextEntries.push({
          id: row.id,
          date: day.date,
          diaryDayId: row.diary_day_id,
          mealSlot: slot,
          calories: kcal,
          proteinG: protein,
          carbsG: carbs,
          foodId: row.food_id,
          foodLabel: row.food_id ? formatFoodLabel(foodMetaById.get(row.food_id)) : null,
          recipeId: row.recipe_id,
          recipeLabel:
            row.recipe_id ? String(recipeMetaById.get(row.recipe_id)?.name ?? 'Saved meal') : null,
          isFavoriteMeal: Boolean(row.recipe_id && favoriteMealIdSet.has(row.recipe_id)),
        });
      });

      const strengthDateSet = new Set(
        strengthWorkouts
          .map((workout) => toDateKey(workout.ended_at ?? workout.started_at))
          .filter((value): value is string => Boolean(value))
      );
      const cardioDateSet = new Set(
        cardioSessions
          .map((session) => toDateKey(session.endedAt ?? session.startedAt))
          .filter((value): value is string => Boolean(value))
      );

      dayIdToActivity.forEach((activity) => {
        activity.isStrengthDay = strengthDateSet.has(activity.date);
        activity.isCardioDay = cardioDateSet.has(activity.date);
        activity.isTrainingDay = activity.isStrengthDay || activity.isCardioDay;
      });

      const normalized = Array.from(dayIdToActivity.values()).sort((left, right) =>
        left.date.localeCompare(right.date)
      );

      setActivities(normalized);
      setEntries(
        nextEntries.sort(
          (left, right) =>
            left.date.localeCompare(right.date) ||
            left.mealSlot.localeCompare(right.mealSlot) ||
            left.id.localeCompare(right.id)
        )
      );
    } catch (loadError: any) {
      console.warn('[NutritionProgress] Failed to load nutrition progress data', loadError);
      setActivities([]);
      setEntries([]);
      setError(loadError?.message ?? 'Could not load nutrition progress.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
      return undefined;
    }, [load])
  );

  return useMemo(
    () => ({
      activities,
      entries,
      loading,
      error,
      reload: load,
    }),
    [activities, entries, error, load, loading]
  );
}
