import { supabase } from '@/lib/supabase';

type JsonObject = Record<string, unknown>;

export type FoodRow = {
  id: string;
  name: string | null;
  description: string | null;
  type: string | null;
  serving: unknown | null;
  nutrition_100g: unknown | null;
  ean_13: string | null;
  ingredients: string | null;
  labels: unknown | null;
  package_size: unknown | null;
};

export type FoodNutritionPer100g = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number | null;
  sugar: number | null;
  sodium: number | null;
};

export type FoodServingDefault = {
  quantity: number;
  unitLabel: string;
  grams: number;
};

const FOOD_SELECT =
  'id,name,description,type,serving,nutrition_100g,ean_13,ingredients,labels,package_size';

function asObject(value: unknown): JsonObject | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as JsonObject;
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function firstNumber(source: JsonObject | null, keys: string[]): number | null {
  if (!source) return null;
  for (const key of keys) {
    const next = asNumber(source[key]);
    if (next != null) return next;
  }
  return null;
}

function round(value: number, precision = 2) {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

async function findFirstByColumn(column: 'ean_13' | 'id', values: string[]) {
  if (!values.length) return null;

  const { data, error } = await supabase
    .from('foods')
    .select(FOOD_SELECT)
    .in(column, values)
    .limit(1);

  if (error) throw error;
  return (data?.[0] as FoodRow | undefined) ?? null;
}

export function buildBarcodeCandidates(rawValue: string) {
  const trimmed = rawValue.trim();
  const digitsOnly = trimmed.replace(/\D/g, '');
  const values = new Set<string>();

  if (trimmed) values.add(trimmed);
  if (digitsOnly) {
    values.add(digitsOnly);
    if (digitsOnly.length === 12) values.add(`0${digitsOnly}`);
    if (digitsOnly.length === 13 && digitsOnly.startsWith('0')) {
      values.add(digitsOnly.slice(1));
    }
  }

  return Array.from(values);
}

export async function findFoodByBarcode(rawValue: string) {
  const candidates = buildBarcodeCandidates(rawValue);
  const matchByEan = await findFirstByColumn('ean_13', candidates);
  if (matchByEan) return matchByEan;
  return findFirstByColumn('id', candidates);
}

export async function fetchFoodById(id: string) {
  const trimmed = id.trim();
  if (!trimmed) return null;

  const { data, error } = await supabase
    .from('foods')
    .select(FOOD_SELECT)
    .eq('id', trimmed)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') throw error;
  return (data as FoodRow | null) ?? null;
}

export function getNutritionPer100g(food: FoodRow): FoodNutritionPer100g {
  const nutrition = asObject(food.nutrition_100g);

  const calories = firstNumber(nutrition, ['calories', 'kcal', 'energy_kcal']) ?? 0;
  const protein = firstNumber(nutrition, ['protein']) ?? 0;
  const carbs = firstNumber(nutrition, ['carbohydrates', 'carbs', 'carbohydrate']) ?? 0;
  const fat = firstNumber(nutrition, ['total_fat', 'fat', 'fats']) ?? 0;
  const fiber = firstNumber(nutrition, ['fiber', 'fibre', 'dietary_fiber']);
  const sugar = firstNumber(nutrition, ['sugar', 'sugars', 'total_sugars']);
  const sodium = firstNumber(nutrition, ['sodium', 'sodium_mg']);

  return { calories, protein, carbs, fat, fiber, sugar, sodium };
}

export function getDefaultServing(food: FoodRow): FoodServingDefault {
  const serving = asObject(food.serving);
  const common = asObject(serving?.common);
  const metric = asObject(serving?.metric);

  const commonQuantity = asNumber(common?.quantity);
  const commonUnit =
    typeof common?.unit === 'string' && common.unit.trim() ? common.unit.trim() : 'serving';

  const metricQuantity = asNumber(metric?.quantity);
  const metricUnit =
    typeof metric?.unit === 'string' && metric.unit.trim() ? metric.unit.trim() : 'g';

  if (
    commonQuantity != null &&
    commonQuantity > 0 &&
    metricQuantity != null &&
    metricQuantity > 0
  ) {
    return {
      quantity: 1,
      unitLabel: commonUnit,
      grams: round(metricQuantity / commonQuantity),
    };
  }

  if (metricQuantity != null && metricQuantity > 0) {
    return {
      quantity: 1,
      unitLabel: metricUnit,
      grams: round(metricQuantity),
    };
  }

  return {
    quantity: 1,
    unitLabel: 'serving',
    grams: 100,
  };
}

export function getPortionNutrition(nutritionPer100g: FoodNutritionPer100g, grams: number) {
  const safeGrams = Number.isFinite(grams) && grams > 0 ? grams : 100;
  const factor = safeGrams / 100;

  const calories = Math.round(nutritionPer100g.calories * factor);
  const protein = round(nutritionPer100g.protein * factor);
  const carbs = round(nutritionPer100g.carbs * factor);
  const fat = round(nutritionPer100g.fat * factor);
  const fiber = nutritionPer100g.fiber != null ? round(nutritionPer100g.fiber * factor) : null;
  const sugar = nutritionPer100g.sugar != null ? round(nutritionPer100g.sugar * factor) : null;
  const sodium = nutritionPer100g.sodium != null ? Math.round(nutritionPer100g.sodium * factor) : null;

  return { calories, protein, carbs, fat, fiber, sugar, sodium };
}
