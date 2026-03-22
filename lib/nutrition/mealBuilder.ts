import { getServingPresetFromReference } from '@/lib/nutrition/serving';
import type {
  CanonicalFoodRow,
  UserMealIngredientRow,
} from '@/lib/nutrition/dataAccess';

type NumericLike = number | string | null | undefined;

export type MealDraftIngredient = {
  id: string;
  foodId: string;
  name: string;
  brand: string | null;
  quantityInput: string;
  unit: string;
  gramsPerUnitInput: string;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  fiberPer100g: number | null;
  sodiumPer100g: number | null;
};

export type MealDraftIngredientComputed = MealDraftIngredient & {
  quantity: number;
  gramsPerUnit: number;
  totalGrams: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number | null;
  sodium: number | null;
};

export type MealDraftTotals = {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number | null;
  sodium: number | null;
  grams: number;
};

function round(value: number, precision = 2) {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function toNumber(value: NumericLike, fallback = 0) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function toNullableNumber(value: NumericLike) {
  if (value == null) return null;
  if (typeof value === 'string' && !value.trim()) return null;
  const parsed = toNumber(value, Number.NaN);
  return Number.isFinite(parsed) ? parsed : null;
}

export function sanitizeDecimalInput(value: string) {
  return value.replace(',', '.').replace(/[^\d.]/g, '');
}

export function parsePositiveOrZero(value: string, fallback = 0) {
  const parsed = Number(sanitizeDecimalInput(value));
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

export function formatDecimal(value: number, precision = 2) {
  if (!Number.isFinite(value)) return '0';
  const rounded = round(value, precision);
  if (Number.isInteger(rounded)) return String(rounded);
  return String(rounded).replace(/\.?0+$/, '');
}

function toPer100FromIngredientTotal(total: NumericLike, grams: NumericLike) {
  const totalNumber = toNullableNumber(total);
  const gramsNumber = toNullableNumber(grams);

  if (totalNumber == null || gramsNumber == null || gramsNumber <= 0) {
    return 0;
  }

  return round((totalNumber / gramsNumber) * 100, 4);
}

export function createDraftIngredientFromFood(food: CanonicalFoodRow) {
  const preset = getServingPresetFromReference(food.serving_reference, 'serving');

  return {
    id: `${food.id}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    foodId: food.id,
    name: food.name,
    brand: food.brand,
    quantityInput: formatDecimal(preset.quantity),
    unit: preset.unitLabel,
    gramsPerUnitInput: formatDecimal(preset.gramsPerUnit),
    caloriesPer100g: toNumber(food.calories, 0),
    proteinPer100g: toNumber(food.protein, 0),
    carbsPer100g: toNumber(food.carbs, 0),
    fatPer100g: toNumber(food.fat, 0),
    fiberPer100g: toNullableNumber(food.fiber),
    sodiumPer100g: toNullableNumber(food.sodium_mg),
  } satisfies MealDraftIngredient;
}

export function createDraftIngredientFromSavedRow(
  row: UserMealIngredientRow,
  food: CanonicalFoodRow | null
) {
  const preset = food
    ? getServingPresetFromReference(food.serving_reference, row.unit || 'serving')
    : {
        quantity: 1,
        unitLabel: row.unit || 'serving',
        gramsPerUnit: toNullableNumber(row.grams) ?? 100,
      };

  const quantity = toNumber(row.quantity, 1);
  const totalGrams = toNullableNumber(row.grams);
  const gramsPerUnit =
    totalGrams != null && quantity > 0 ? totalGrams / quantity : preset.gramsPerUnit;

  return {
    id: `${row.id}-${Math.random().toString(16).slice(2, 7)}`,
    foodId: row.food_id,
    name: food?.name ?? 'Ingredient',
    brand: food?.brand ?? null,
    quantityInput: formatDecimal(quantity),
    unit: row.unit || preset.unitLabel || 'serving',
    gramsPerUnitInput: formatDecimal(gramsPerUnit > 0 ? gramsPerUnit : 100),
    caloriesPer100g: food
      ? toNumber(food.calories, 0)
      : toPer100FromIngredientTotal(row.kcal, row.grams),
    proteinPer100g: food
      ? toNumber(food.protein, 0)
      : toPer100FromIngredientTotal(row.protein, row.grams),
    carbsPer100g: food
      ? toNumber(food.carbs, 0)
      : toPer100FromIngredientTotal(row.carbs, row.grams),
    fatPer100g: food
      ? toNumber(food.fat, 0)
      : toPer100FromIngredientTotal(row.fat, row.grams),
    fiberPer100g: food
      ? toNullableNumber(food.fiber)
      : toNullableNumber(row.fiber) == null
        ? null
        : toPer100FromIngredientTotal(row.fiber, row.grams),
    sodiumPer100g: food
      ? toNullableNumber(food.sodium_mg)
      : toNullableNumber(row.sodium) == null
        ? null
        : toPer100FromIngredientTotal(row.sodium, row.grams),
  } satisfies MealDraftIngredient;
}

export function computeIngredientNutrition(
  ingredient: MealDraftIngredient
): MealDraftIngredientComputed {
  const quantity = parsePositiveOrZero(ingredient.quantityInput, 0);
  const gramsPerUnit = parsePositiveOrZero(ingredient.gramsPerUnitInput, 0);
  const totalGrams = round(quantity * gramsPerUnit, 2);
  const factor = totalGrams / 100;

  const kcal = Math.round(ingredient.caloriesPer100g * factor);
  const protein = round(ingredient.proteinPer100g * factor);
  const carbs = round(ingredient.carbsPer100g * factor);
  const fat = round(ingredient.fatPer100g * factor);
  const fiber =
    ingredient.fiberPer100g == null ? null : round(ingredient.fiberPer100g * factor);
  const sodium =
    ingredient.sodiumPer100g == null ? null : round(ingredient.sodiumPer100g * factor);

  return {
    ...ingredient,
    quantity,
    gramsPerUnit,
    totalGrams,
    kcal,
    protein,
    carbs,
    fat,
    fiber,
    sodium,
  };
}

export function computeMealTotals(rows: MealDraftIngredientComputed[]): MealDraftTotals {
  return rows.reduce<MealDraftTotals>(
    (acc, row) => ({
      kcal: acc.kcal + row.kcal,
      protein: round(acc.protein + row.protein),
      carbs: round(acc.carbs + row.carbs),
      fat: round(acc.fat + row.fat),
      fiber:
        acc.fiber == null && row.fiber == null
          ? null
          : round((acc.fiber ?? 0) + (row.fiber ?? 0)),
      sodium:
        acc.sodium == null && row.sodium == null
          ? null
          : round((acc.sodium ?? 0) + (row.sodium ?? 0)),
      grams: round(acc.grams + row.totalGrams),
    }),
    {
      kcal: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: null,
      sodium: null,
      grams: 0,
    }
  );
}
