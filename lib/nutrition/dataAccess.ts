import { supabase } from '@/lib/supabase';
import { getMetricServingQuantityInGrams } from '@/lib/nutrition/serving';

const NUTRITION_SCHEMA = 'nutrition' as const;
const PUBLIC_FOOD_VERIFICATION_STATUSES = ['user_confirmed', 'verified'] as const;

type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | { [key: string]: JsonValue } | JsonValue[];
export type JsonObject = Record<string, JsonValue>;

type NumericLike = number | string | null | undefined;

export type MealSlot =
  | 'breakfast'
  | 'lunch'
  | 'dinner'
  | 'snack'
  | 'pre-workout'
  | 'post-workout'
  | 'custom';

export type FoodKind = 'packaged' | 'ingredient';
export type FoodSource = 'manual' | 'barcode' | 'ocr' | 'import' | 'user';
export type FoodVerificationStatus =
  | 'pending'
  | 'user_confirmed'
  | 'verified'
  | 'rejected';

export type CanonicalFoodRow = {
  id: string;
  food_kind: FoodKind;
  name: string;
  brand: string | null;
  barcode: string | null;
  serving_reference: JsonValue | null;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  fiber: number | null;
  sodium_mg: number | null;
  ingredients_text: string | null;
  source: FoodSource;
  image_urls: string[];
  created_by: string | null;
  is_verified: boolean;
  verification_status: FoodVerificationStatus;
  created_at: string;
  updated_at: string;
};

export type FoodSubmissionStatus =
  | 'pending'
  | 'confirmed'
  | 'approved'
  | 'rejected'
  | 'needs_review';

export type FoodSubmissionRow = {
  id: string;
  created_by: string;
  barcode: string | null;
  barcode_normalized: string | null;
  label_image_urls: string[];
  ocr_raw_text: string | null;
  ocr_payload: JsonValue | null;
  confirmation_status: FoodSubmissionStatus;
  canonical_food_id: string | null;
  notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type UserMealRow = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  notes: string | null;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number | null;
  sugar: number | null;
  sodium: number | null;
  default_portion_grams: number | null;
  is_private: boolean;
  created_at: string;
  updated_at: string;
};

export type UserMealIngredientRow = {
  id: string;
  recipe_id: string;
  food_id: string;
  quantity: number;
  unit: string;
  grams: number | null;
  kcal: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  fiber: number | null;
  sodium: number | null;
  position: number;
  note: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type UserMealWithIngredients = UserMealRow & {
  ingredients: UserMealIngredientRow[];
};

export type DiaryDayRow = {
  id: string;
  user_id: string;
  date: string;
  timezone_str: string;
  kcal_total: number;
  protein_g_total: number;
  carbs_g_total: number;
  fat_g_total: number;
  fiber_g_total: number;
  sodium_mg_total: number;
  created_at: string;
  updated_at: string;
};

export type DiaryEntryRow = {
  id: string;
  user_id: string;
  diary_day_id: string;
  meal_type: string;
  meal_slot: MealSlot;
  food_id: string | null;
  recipe_id: string | null;
  quantity: number;
  unit_label: string;
  consumed_at: string;
  grams: number | null;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number | null;
  sugar: number | null;
  sodium: number | null;
  note: string | null;
  created_at: string;
  updated_at: string;
};

export type LastFoodDiaryUsage = {
  entryId: string;
  foodId: string;
  mealType: string;
  mealSlot: MealSlot;
  quantity: number;
  unitLabel: string;
  grams: number | null;
  snapshot: NutritionSnapshot;
  consumedAt: string;
};

export type LastMealDiaryUsage = {
  entryId: string;
  mealId: string;
  mealType: string;
  mealSlot: MealSlot;
  quantity: number;
  unitLabel: string;
  grams: number | null;
  snapshot: NutritionSnapshot;
  consumedAt: string;
};

export type RecentFoodRow = {
  food: CanonicalFoodRow;
  lastUsage: LastFoodDiaryUsage;
  usageCount: number;
  relevanceScore: number;
};

export type RecentMealRow = {
  meal: UserMealRow;
  lastUsage: LastMealDiaryUsage;
  usageCount: number;
  relevanceScore: number;
};

export type FavoriteFoodRow = {
  id: string;
  user_id: string;
  food_id: string;
  created_at: string;
};

export type FavoriteMealRow = {
  id: string;
  user_id: string;
  meal_id: string;
  created_at: string;
};

export type MealSlotCopyOption = {
  sourceDate: string;
  mealSlot: MealSlot;
  entryCount: number;
  latestConsumedAt: string;
};

export type NutritionSnapshot = {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number | null;
  sugar: number | null;
  sodium: number | null;
  grams: number | null;
};

type FoodSnapshotSelectRow = {
  calories: NumericLike;
  protein: NumericLike;
  carbs: NumericLike;
  fat: NumericLike;
  fiber: NumericLike;
  sodium_mg: NumericLike;
  serving_reference: JsonValue | null;
};

type MealSnapshotSelectRow = {
  kcal: NumericLike;
  protein: NumericLike;
  carbs: NumericLike;
  fat: NumericLike;
  fiber: NumericLike;
  sugar: NumericLike;
  sodium: NumericLike;
  default_portion_grams: NumericLike;
};

type DiaryFoodUsageSelectRow = {
  id: string;
  food_id: string | null;
  meal_type: string | null;
  meal_slot: string | null;
  quantity: NumericLike;
  unit_label: string | null;
  grams: NumericLike;
  kcal: NumericLike;
  protein: NumericLike;
  carbs: NumericLike;
  fat: NumericLike;
  fiber: NumericLike;
  sugar: NumericLike;
  sodium: NumericLike;
  consumed_at: string;
  created_at: string;
};

type DiaryMealUsageSelectRow = {
  id: string;
  recipe_id: string | null;
  meal_type: string | null;
  meal_slot: string | null;
  quantity: NumericLike;
  unit_label: string | null;
  grams: NumericLike;
  kcal: NumericLike;
  protein: NumericLike;
  carbs: NumericLike;
  fat: NumericLike;
  fiber: NumericLike;
  sugar: NumericLike;
  sodium: NumericLike;
  consumed_at: string;
  created_at: string;
};

export type CreateCanonicalFoodPayload = {
  createdBy?: string | null;
  foodKind?: FoodKind;
  name: string;
  brand?: string | null;
  barcode?: string | null;
  servingReference?: JsonValue | null;
  calories?: NumericLike;
  protein?: NumericLike;
  carbs?: NumericLike;
  fat?: NumericLike;
  fiber?: NumericLike;
  sodiumMg?: NumericLike;
  ingredientsText?: string | null;
  source?: FoodSource;
  imageUrls?: string[];
  isVerified?: boolean;
  verificationStatus?: FoodVerificationStatus;
};

export type CreateFoodSubmissionFromScanPayload = {
  createdBy?: string | null;
  barcode?: string | null;
  labelImageUrls?: string[];
  ocrRawText?: string | null;
  ocrPayload?: JsonValue | null;
  notes?: string | null;
};

export type ConfirmFoodSubmissionAndCreateCanonicalFoodPayload = {
  submissionId: string;
  reviewedBy?: string | null;
  confirmationStatus?: FoodSubmissionStatus;
  food: CreateCanonicalFoodPayload;
};

export type ConfirmFoodSubmissionAndCreateCanonicalFoodResult = {
  food: CanonicalFoodRow;
  submission: FoodSubmissionRow;
};

export type UpdateCanonicalFoodVerificationStatusPayload = {
  foodId: string;
  verificationStatus: FoodVerificationStatus;
  userId?: string | null;
};

export type UserMealIngredientInput = {
  foodId: string;
  quantity?: NumericLike;
  unit?: string | null;
  grams?: NumericLike;
  kcal?: NumericLike;
  protein?: NumericLike;
  carbs?: NumericLike;
  fat?: NumericLike;
  fiber?: NumericLike;
  sodium?: NumericLike;
  note?: string | null;
  position?: NumericLike;
};

export type CreateUserMealPayload = {
  userId?: string | null;
  name: string;
  description?: string | null;
  notes?: string | null;
  kcal?: NumericLike;
  protein?: NumericLike;
  carbs?: NumericLike;
  fat?: NumericLike;
  fiber?: NumericLike;
  sugar?: NumericLike;
  sodium?: NumericLike;
  defaultPortionGrams?: NumericLike;
  isPrivate?: boolean;
  ingredients?: UserMealIngredientInput[];
};

export type UpdateUserMealPayload = {
  mealId: string;
  userId?: string | null;
  name?: string | null;
  description?: string | null;
  notes?: string | null;
  kcal?: NumericLike;
  protein?: NumericLike;
  carbs?: NumericLike;
  fat?: NumericLike;
  fiber?: NumericLike;
  sugar?: NumericLike;
  sodium?: NumericLike;
  defaultPortionGrams?: NumericLike;
  isPrivate?: boolean;
  ingredients?: UserMealIngredientInput[];
};

export type CreateDiaryEntryPayload = {
  userId?: string | null;
  date?: string | null;
  timezoneStr?: string | null;
  consumedAt?: string | null;
  mealSlot?: MealSlot;
  mealType?: string | null;
  foodId?: string | null;
  mealId?: string | null;
  quantity?: NumericLike;
  unitLabel?: string | null;
  grams?: NumericLike;
  snapshot?: Partial<NutritionSnapshot>;
  note?: string | null;
};

const FOOD_ITEM_SELECT =
  'id,food_kind,name,brand,barcode,serving_reference,calories,protein,carbs,fat,fiber,sodium_mg,ingredients_text,source,image_urls,created_by,is_verified,verification_status,created_at,updated_at';
const FOOD_ITEM_SELECT_LEGACY =
  'id,food_kind,name,brand,barcode,serving_reference,calories,protein,carbs,fat,fiber,sodium_mg,ingredients_text,source,image_urls,created_by,is_verified,created_at,updated_at';
const FOOD_SUBMISSION_SELECT =
  'id,created_by,barcode,barcode_normalized,label_image_urls,ocr_raw_text,ocr_payload,confirmation_status,canonical_food_id,notes,reviewed_by,reviewed_at,created_at,updated_at';
const RECIPE_SELECT =
  'id,user_id,name,description,notes,kcal,protein,carbs,fat,fiber,sugar,sodium,default_portion_grams,is_private,created_at,updated_at';
const RECIPE_INGREDIENT_SELECT =
  'id,recipe_id,food_id,quantity,unit,grams,kcal,protein,carbs,fat,fiber,sodium,position,note,created_by,created_at,updated_at';
const DIARY_DAY_SELECT =
  'id,user_id,date,timezone_str,kcal_total,protein_g_total,carbs_g_total,fat_g_total,fiber_g_total,sodium_mg_total,created_at,updated_at';
const DIARY_ITEM_SELECT =
  'id,user_id,diary_day_id,meal_type,meal_slot,food_id,recipe_id,quantity,unit_label,consumed_at,grams,kcal,protein,carbs,fat,fiber,sugar,sodium,note,created_at,updated_at';
const DIARY_FOOD_USAGE_SELECT =
  'id,food_id,meal_type,meal_slot,quantity,unit_label,grams,kcal,protein,carbs,fat,fiber,sugar,sodium,consumed_at,created_at';
const DIARY_MEAL_USAGE_SELECT =
  'id,recipe_id,meal_type,meal_slot,quantity,unit_label,grams,kcal,protein,carbs,fat,fiber,sugar,sodium,consumed_at,created_at';
const FAVORITE_FOOD_SELECT = 'id,user_id,food_id,created_at';
const FAVORITE_MEAL_SELECT = 'id,user_id,meal_id,created_at';

function toNumber(value: NumericLike, fallback = 0) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function toNullableNumber(value: NumericLike): number | null {
  if (value == null) return null;
  if (typeof value === 'string' && !value.trim()) return null;
  const parsed = toNumber(value, Number.NaN);
  return Number.isFinite(parsed) ? parsed : null;
}

function toPositiveNumber(value: NumericLike, fallback = 1) {
  const parsed = toNumber(value, fallback);
  return parsed > 0 ? parsed : fallback;
}

function clampLimit(limit: number | undefined, fallback = 25, max = 100) {
  if (!Number.isFinite(limit)) return fallback;
  const n = Math.trunc(limit as number);
  if (n <= 0) return fallback;
  return Math.min(n, max);
}

function cleanNullableString(value: string | null | undefined) {
  const trimmed = String(value ?? '').trim();
  return trimmed ? trimmed : null;
}

function cleanStringArray(values: string[] | null | undefined) {
  if (!Array.isArray(values)) return [];
  return values.map((value) => String(value ?? '').trim()).filter(Boolean);
}

function normalizeBarcode(rawValue: string | null | undefined) {
  const trimmed = String(rawValue ?? '').trim();
  if (!trimmed) return null;
  const digits = trimmed.replace(/\D/g, '');
  return digits || trimmed;
}

function normalizeFoodSearchQuery(rawValue: string | null | undefined) {
  return String(rawValue ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function sanitizeSearchToken(rawValue: string) {
  return rawValue.replace(/[%_,]/g, ' ').replace(/\s+/g, ' ').trim();
}

function buildBarcodeCandidates(rawValue: string) {
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

function normalizeMealSlot(value: string | null | undefined): MealSlot {
  const raw = String(value ?? '').trim().toLowerCase();
  if (raw === 'breakfast') return 'breakfast';
  if (raw === 'lunch') return 'lunch';
  if (raw === 'dinner') return 'dinner';
  if (raw === 'snack') return 'snack';
  if (raw === 'pre_workout' || raw === 'pre-workout' || raw === 'preworkout') {
    return 'pre-workout';
  }
  if (raw === 'post_workout' || raw === 'post-workout' || raw === 'postworkout') {
    return 'post-workout';
  }
  return 'custom';
}

function getDeviceTimezone() {
  try {
    return Intl?.DateTimeFormat?.().resolvedOptions?.().timeZone ?? 'UTC';
  } catch {
    return 'UTC';
  }
}

function toDateOnly(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date value: ${String(value)}`);
  }
  return date.toISOString().slice(0, 10);
}

function copyConsumedTimeToDate(consumedAt: string, dateOnly: string) {
  const parsed = new Date(consumedAt);
  if (Number.isNaN(parsed.getTime())) {
    return `${dateOnly}T12:00:00.000Z`;
  }

  const hh = String(parsed.getUTCHours()).padStart(2, '0');
  const mm = String(parsed.getUTCMinutes()).padStart(2, '0');
  const ss = String(parsed.getUTCSeconds()).padStart(2, '0');
  const ms = String(parsed.getUTCMilliseconds()).padStart(3, '0');
  return `${dateOnly}T${hh}:${mm}:${ss}.${ms}Z`;
}

function isNotFound(error: unknown) {
  const parsed = error as { code?: unknown };
  return typeof parsed?.code === 'string' && parsed.code === 'PGRST116';
}

function isMissingColumn(error: unknown, columnName: string) {
  const parsed = error as {
    code?: unknown;
    message?: unknown;
    details?: unknown;
    hint?: unknown;
  };
  const haystack = `${String(parsed?.message ?? '')} ${String(parsed?.details ?? '')} ${String(parsed?.hint ?? '')}`.toLowerCase();
  return (
    String(parsed?.code ?? '') === '42703' ||
    String(parsed?.code ?? '') === 'PGRST204' ||
    (haystack.includes(columnName.toLowerCase()) &&
      (
        haystack.includes('does not exist') ||
        haystack.includes('unknown') ||
        haystack.includes('schema cache') ||
        haystack.includes('could not find')
      ))
  );
}

function isMissingFunction(error: unknown, functionName: string) {
  const parsed = error as {
    code?: unknown;
    message?: unknown;
    details?: unknown;
    hint?: unknown;
  };
  const haystack = `${String(parsed?.message ?? '')} ${String(parsed?.details ?? '')} ${String(parsed?.hint ?? '')}`.toLowerCase();
  return (
    String(parsed?.code ?? '') === 'PGRST202' ||
    (haystack.includes(functionName.toLowerCase()) &&
      (haystack.includes('does not exist') || haystack.includes('could not find')))
  );
}

function isMissingTable(error: unknown, tableName: string) {
  const parsed = error as {
    code?: unknown;
    message?: unknown;
    details?: unknown;
    hint?: unknown;
  };
  const haystack = `${String(parsed?.message ?? '')} ${String(parsed?.details ?? '')} ${String(parsed?.hint ?? '')}`.toLowerCase();
  const normalizedTable = tableName.toLowerCase();

  return (
    String(parsed?.code ?? '') === 'PGRST205' ||
    (haystack.includes(normalizedTable) &&
      (
        haystack.includes('does not exist') ||
        haystack.includes('schema cache') ||
        haystack.includes('could not find')
      ))
  );
}

function isForeignKeyViolation(error: unknown, constraintName?: string) {
  const parsed = error as {
    code?: unknown;
    message?: unknown;
    details?: unknown;
    hint?: unknown;
  };
  const haystack = `${String(parsed?.message ?? '')} ${String(parsed?.details ?? '')} ${String(parsed?.hint ?? '')}`.toLowerCase();
  const normalizedConstraint = String(constraintName ?? '').trim().toLowerCase();

  if (String(parsed?.code ?? '') === '23503') {
    if (!normalizedConstraint) return true;
    return haystack.includes(normalizedConstraint);
  }

  return (
    haystack.includes('foreign key') &&
    (!normalizedConstraint || haystack.includes(normalizedConstraint))
  );
}

function resolveFoodVerificationStatus(
  value: unknown,
  isVerifiedFallback: boolean
): FoodVerificationStatus {
  switch (value) {
    case 'pending':
    case 'user_confirmed':
    case 'verified':
    case 'rejected':
      return value;
    default:
      return isVerifiedFallback ? 'verified' : 'user_confirmed';
  }
}

function asCanonicalFoodRow(
  value: unknown,
  fallbackStatus?: FoodVerificationStatus
): CanonicalFoodRow {
  const row = (value ?? {}) as Record<string, unknown>;
  const isVerified = Boolean(row.is_verified);

  return {
    ...(row as unknown as Omit<CanonicalFoodRow, 'is_verified' | 'verification_status'>),
    is_verified: isVerified,
    verification_status: resolveFoodVerificationStatus(
      row.verification_status,
      fallbackStatus === 'verified' ? true : isVerified
    ),
  };
}

function extractInsertId(value: unknown) {
  if (!value || typeof value !== 'object') return null;
  const row = value as { id?: unknown };
  return typeof row.id === 'string' ? row.id : null;
}

async function selectCanonicalFoodsByIds(foodIds: string[]) {
  if (!foodIds.length) return [];

  try {
    const { data, error } = await supabase
      .schema(NUTRITION_SCHEMA)
      .from('food_items')
      .select(FOOD_ITEM_SELECT)
      .in('id', foodIds);

    if (error) throw error;
    return (data ?? []) as CanonicalFoodRow[];
  } catch (error) {
    if (!isMissingColumn(error, 'verification_status')) {
      throw error;
    }

    const { data, error: legacyError } = await supabase
      .schema(NUTRITION_SCHEMA)
      .from('food_items')
      .select(FOOD_ITEM_SELECT_LEGACY)
      .in('id', foodIds);

    if (legacyError) throw legacyError;
    return ((data ?? []) as unknown[]).map((row) => asCanonicalFoodRow(row));
  }
}

function toFoodSnapshotRow(value: unknown): FoodSnapshotSelectRow {
  return (value ?? {}) as FoodSnapshotSelectRow;
}

function toMealSnapshotRow(value: unknown): MealSnapshotSelectRow {
  return (value ?? {}) as MealSnapshotSelectRow;
}

function toDiaryFoodUsageRow(value: unknown): DiaryFoodUsageSelectRow {
  return (value ?? {}) as DiaryFoodUsageSelectRow;
}

function toDiaryMealUsageRow(value: unknown): DiaryMealUsageSelectRow {
  return (value ?? {}) as DiaryMealUsageSelectRow;
}

function mapDiaryFoodUsageRow(value: DiaryFoodUsageSelectRow): LastFoodDiaryUsage | null {
  const foodId = cleanNullableString(value.food_id);
  if (!foodId) return null;

  const quantity = toPositiveNumber(value.quantity, 1);
  const mealSlot = normalizeMealSlot(value.meal_slot ?? value.meal_type);

  return {
    entryId: String(value.id ?? '').trim(),
    foodId,
    mealType: cleanNullableString(value.meal_type) ?? mealSlot,
    mealSlot,
    quantity,
    unitLabel: cleanNullableString(value.unit_label) ?? 'serving',
    grams: toNullableNumber(value.grams),
    snapshot: {
      kcal: toNumber(value.kcal, 0),
      protein: toNumber(value.protein, 0),
      carbs: toNumber(value.carbs, 0),
      fat: toNumber(value.fat, 0),
      fiber: toNullableNumber(value.fiber),
      sugar: toNullableNumber(value.sugar),
      sodium: toNullableNumber(value.sodium),
      grams: toNullableNumber(value.grams),
    },
    consumedAt: String(value.consumed_at ?? ''),
  };
}

function mapDiaryMealUsageRow(value: DiaryMealUsageSelectRow): LastMealDiaryUsage | null {
  const mealId = cleanNullableString(value.recipe_id);
  if (!mealId) return null;

  const quantity = toPositiveNumber(value.quantity, 1);
  const mealSlot = normalizeMealSlot(value.meal_slot ?? value.meal_type);

  return {
    entryId: String(value.id ?? '').trim(),
    mealId,
    mealType: cleanNullableString(value.meal_type) ?? mealSlot,
    mealSlot,
    quantity,
    unitLabel: cleanNullableString(value.unit_label) ?? 'meal',
    grams: toNullableNumber(value.grams),
    snapshot: {
      kcal: toNumber(value.kcal, 0),
      protein: toNumber(value.protein, 0),
      carbs: toNumber(value.carbs, 0),
      fat: toNumber(value.fat, 0),
      fiber: toNullableNumber(value.fiber),
      sugar: toNullableNumber(value.sugar),
      sodium: toNullableNumber(value.sodium),
      grams: toNullableNumber(value.grams),
    },
    consumedAt: String(value.consumed_at ?? ''),
  };
}

function toTimestamp(value: string | null | undefined) {
  const parsed = Date.parse(String(value ?? ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function addDaysToDateOnly(dateOnly: string, offsetDays: number) {
  const parsed = new Date(`${dateOnly}T12:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid date value: ${dateOnly}`);
  }
  parsed.setUTCDate(parsed.getUTCDate() + offsetDays);
  return parsed.toISOString().slice(0, 10);
}

async function requireUserId(explicitUserId?: string | null) {
  const explicit = cleanNullableString(explicitUserId);
  if (explicit) return explicit;

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) throw error;
  if (!user?.id) throw new Error('Not signed in');
  return user.id;
}

async function getCurrentUserIdOrNull() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    console.warn('[nutrition] Failed to resolve current user for optional lookup', error);
    return null;
  }

  return cleanNullableString(user?.id) ?? null;
}

export async function getAuthenticatedNutritionUserId() {
  return requireUserId();
}

async function ensureDiaryDayRow(userId: string, date: string, timezoneStr?: string | null) {
  const tz = cleanNullableString(timezoneStr) ?? getDeviceTimezone();

  const { data, error } = await supabase
    .schema(NUTRITION_SCHEMA)
    .from('diary_days')
    .upsert(
      {
        user_id: userId,
        date,
        timezone_str: tz,
      },
      { onConflict: 'user_id,date' }
    )
    .select(DIARY_DAY_SELECT)
    .single();

  if (error) throw error;
  return data as DiaryDayRow;
}

function sum(values: Array<number | null | undefined>) {
  return values.reduce<number>((acc, value) => acc + toNumber(value, 0), 0);
}

async function refreshDiaryDayTotals(diaryDayId: string) {
  const { data, error } = await supabase
    .schema(NUTRITION_SCHEMA)
    .from('diary_items')
    .select('kcal,protein,carbs,fat,fiber,sodium')
    .eq('diary_day_id', diaryDayId);

  if (error) throw error;

  const rows = (data ?? []) as Array<{
    kcal: NumericLike;
    protein: NumericLike;
    carbs: NumericLike;
    fat: NumericLike;
    fiber: NumericLike;
    sodium: NumericLike;
  }>;

  const totals = {
    kcal_total: sum(rows.map((row) => toNullableNumber(row.kcal))),
    protein_g_total: sum(rows.map((row) => toNullableNumber(row.protein))),
    carbs_g_total: sum(rows.map((row) => toNullableNumber(row.carbs))),
    fat_g_total: sum(rows.map((row) => toNullableNumber(row.fat))),
    fiber_g_total: sum(rows.map((row) => toNullableNumber(row.fiber))),
    sodium_mg_total: sum(rows.map((row) => toNullableNumber(row.sodium))),
  };

  const { error: updateError } = await supabase
    .schema(NUTRITION_SCHEMA)
    .from('diary_days')
    .update(totals)
    .eq('id', diaryDayId);

  if (updateError) throw updateError;
}

function extractDefaultServingGrams(servingReference: JsonValue | null) {
  if (!servingReference || typeof servingReference !== 'object' || Array.isArray(servingReference)) {
    return null;
  }

  const reference = servingReference as Record<string, unknown>;
  const common =
    reference.common &&
    typeof reference.common === 'object' &&
    !Array.isArray(reference.common)
      ? (reference.common as Record<string, unknown>)
      : null;

  const metricQty = getMetricServingQuantityInGrams(servingReference);
  const commonQty = toNullableNumber(common?.quantity as NumericLike);

  if (metricQty != null && metricQty > 0 && commonQty != null && commonQty > 0) {
    return metricQty / commonQty;
  }

  if (metricQty != null && metricQty > 0) {
    return metricQty;
  }

  return null;
}

function multiplySnapshot(snapshot: NutritionSnapshot, quantity: number): NutritionSnapshot {
  return {
    kcal: Math.round(snapshot.kcal * quantity),
    protein: Number((snapshot.protein * quantity).toFixed(2)),
    carbs: Number((snapshot.carbs * quantity).toFixed(2)),
    fat: Number((snapshot.fat * quantity).toFixed(2)),
    fiber:
      snapshot.fiber == null ? null : Number((snapshot.fiber * quantity).toFixed(2)),
    sugar:
      snapshot.sugar == null ? null : Number((snapshot.sugar * quantity).toFixed(2)),
    sodium:
      snapshot.sodium == null ? null : Number((snapshot.sodium * quantity).toFixed(2)),
    grams:
      snapshot.grams == null ? null : Number((snapshot.grams * quantity).toFixed(2)),
  };
}

async function getFoodSnapshot(foodId: string): Promise<NutritionSnapshot> {
  const { data, error } = await supabase
    .schema(NUTRITION_SCHEMA)
    .from('food_items')
    .select('calories,protein,carbs,fat,fiber,sodium_mg,serving_reference')
    .eq('id', foodId)
    .maybeSingle();

  if (error && !isNotFound(error)) throw error;
  if (!data) {
    throw new Error('Food not found');
  }

  const row = toFoodSnapshotRow(data);

  return {
    kcal: toNumber(row.calories, 0),
    protein: toNumber(row.protein, 0),
    carbs: toNumber(row.carbs, 0),
    fat: toNumber(row.fat, 0),
    fiber: toNullableNumber(row.fiber),
    sugar: null,
    sodium: toNullableNumber(row.sodium_mg),
    grams: extractDefaultServingGrams(row.serving_reference),
  };
}

async function getMealSnapshot(mealId: string, userId: string): Promise<NutritionSnapshot> {
  const { data, error } = await supabase
    .schema(NUTRITION_SCHEMA)
    .from('recipes')
    .select('kcal,protein,carbs,fat,fiber,sugar,sodium,default_portion_grams')
    .eq('id', mealId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error && !isNotFound(error)) throw error;
  if (!data) {
    throw new Error('Meal not found');
  }

  const row = toMealSnapshotRow(data);

  return {
    kcal: toNumber(row.kcal, 0),
    protein: toNumber(row.protein, 0),
    carbs: toNumber(row.carbs, 0),
    fat: toNumber(row.fat, 0),
    fiber: toNullableNumber(row.fiber),
    sugar: toNullableNumber(row.sugar),
    sodium: toNullableNumber(row.sodium),
    grams: toNullableNumber(row.default_portion_grams),
  };
}

function toRecipeIngredientRows(
  recipeId: string,
  userId: string,
  ingredients: UserMealIngredientInput[]
) {
  return ingredients
    .filter((ingredient) => cleanNullableString(ingredient.foodId))
    .map((ingredient, index) => ({
      recipe_id: recipeId,
      food_id: String(ingredient.foodId).trim(),
      quantity: toPositiveNumber(ingredient.quantity, 1),
      unit: cleanNullableString(ingredient.unit) ?? 'serving',
      grams: toNullableNumber(ingredient.grams),
      kcal: toNullableNumber(ingredient.kcal),
      protein: toNullableNumber(ingredient.protein),
      carbs: toNullableNumber(ingredient.carbs),
      fat: toNullableNumber(ingredient.fat),
      fiber: toNullableNumber(ingredient.fiber),
      sodium: toNullableNumber(ingredient.sodium),
      note: cleanNullableString(ingredient.note),
      position: Math.max(0, Math.trunc(toNumber(ingredient.position, index))),
      created_by: userId,
    }));
}

async function getMealIngredientsByRecipeIds(recipeIds: string[]) {
  if (!recipeIds.length) return new Map<string, UserMealIngredientRow[]>();

  const { data, error } = await supabase
    .schema(NUTRITION_SCHEMA)
    .from('recipe_ingredients')
    .select(RECIPE_INGREDIENT_SELECT)
    .in('recipe_id', recipeIds)
    .order('position', { ascending: true });

  if (error) throw error;

  const map = new Map<string, UserMealIngredientRow[]>();
  const rows = (data ?? []) as UserMealIngredientRow[];

  for (const row of rows) {
    const bucket = map.get(row.recipe_id) ?? [];
    bucket.push(row);
    map.set(row.recipe_id, bucket);
  }

  return map;
}

export async function getFoodByBarcode(barcode: string) {
  const normalized = normalizeBarcode(barcode);
  if (!normalized) return null;

  try {
    const { data, error } = await supabase
      .schema(NUTRITION_SCHEMA)
      .from('food_items')
      .select(FOOD_ITEM_SELECT)
      .eq('barcode_normalized', normalized)
      .in('verification_status', [...PUBLIC_FOOD_VERIFICATION_STATUSES])
      .order('is_verified', { ascending: false })
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error && !isNotFound(error)) throw error;
    if (data) {
      return data as CanonicalFoodRow;
    }
  } catch (error) {
    if (
      !isMissingColumn(error, 'barcode_normalized') &&
      !isMissingColumn(error, 'verification_status')
    ) {
      throw error;
    }
  }

  const candidates = buildBarcodeCandidates(barcode).slice(0, 6);
  if (!candidates.length) return null;

  try {
    const { data, error } = await supabase
      .schema(NUTRITION_SCHEMA)
      .from('food_items')
      .select(FOOD_ITEM_SELECT)
      .in('barcode', candidates)
      .in('verification_status', [...PUBLIC_FOOD_VERIFICATION_STATUSES])
      .order('is_verified', { ascending: false })
      .order('updated_at', { ascending: false })
      .limit(1);

    if (error) throw error;
    if ((data ?? []).length > 0) {
      return data?.[0] as CanonicalFoodRow;
    }
  } catch (fallbackError) {
    if (!isMissingColumn(fallbackError, 'verification_status')) {
      throw fallbackError;
    }

    const { data, error } = await supabase
      .schema(NUTRITION_SCHEMA)
      .from('food_items')
      .select(FOOD_ITEM_SELECT_LEGACY)
      .in('barcode', candidates)
      .order('is_verified', { ascending: false })
      .order('updated_at', { ascending: false })
      .limit(1);

    if (error) throw error;
    if ((data ?? []).length > 0) {
      return asCanonicalFoodRow(data[0]);
    }
  }

  const currentUserId = await getCurrentUserIdOrNull();
  if (!currentUserId) return null;

  try {
    const { data, error } = await supabase
      .schema(NUTRITION_SCHEMA)
      .from('food_items')
      .select(FOOD_ITEM_SELECT)
      .eq('created_by', currentUserId)
      .eq('barcode_normalized', normalized)
      .order('updated_at', { ascending: false })
      .limit(1);

    if (error) throw error;
    if ((data ?? []).length > 0) {
      return data?.[0] as CanonicalFoodRow;
    }
  } catch (error) {
    if (
      !isMissingColumn(error, 'barcode_normalized') &&
      !isMissingColumn(error, 'verification_status')
    ) {
      throw error;
    }
  }

  try {
    const { data, error } = await supabase
      .schema(NUTRITION_SCHEMA)
      .from('food_items')
      .select(FOOD_ITEM_SELECT)
      .eq('created_by', currentUserId)
      .in('barcode', candidates)
      .order('updated_at', { ascending: false })
      .limit(1);

    if (error) throw error;
    if ((data ?? []).length > 0) {
      return data?.[0] as CanonicalFoodRow;
    }
  } catch (error) {
    if (!isMissingColumn(error, 'verification_status')) {
      throw error;
    }

    const { data, error: legacyError } = await supabase
      .schema(NUTRITION_SCHEMA)
      .from('food_items')
      .select(FOOD_ITEM_SELECT_LEGACY)
      .eq('created_by', currentUserId)
      .in('barcode', candidates)
      .order('updated_at', { ascending: false })
      .limit(1);

    if (legacyError) throw legacyError;
    return data?.[0] ? asCanonicalFoodRow(data[0]) : null;
  }

  return null;
}

export async function getCanonicalFoodById(foodId: string) {
  const cleanFoodId = cleanNullableString(foodId);
  if (!cleanFoodId) return null;

  try {
    const { data, error } = await supabase
      .schema(NUTRITION_SCHEMA)
      .from('food_items')
      .select(FOOD_ITEM_SELECT)
      .eq('id', cleanFoodId)
      .in('verification_status', [...PUBLIC_FOOD_VERIFICATION_STATUSES])
      .maybeSingle();

    if (error && !isNotFound(error)) throw error;
    return (data as CanonicalFoodRow | null) ?? null;
  } catch (error) {
    if (!isMissingColumn(error, 'verification_status')) {
      throw error;
    }

    const { data, error: fallbackError } = await supabase
      .schema(NUTRITION_SCHEMA)
      .from('food_items')
      .select(FOOD_ITEM_SELECT_LEGACY)
      .eq('id', cleanFoodId)
      .maybeSingle();

    if (fallbackError && !isNotFound(fallbackError)) throw fallbackError;
    return data ? asCanonicalFoodRow(data) : null;
  }
}

export async function updateCanonicalFoodVerificationStatus(
  payload: UpdateCanonicalFoodVerificationStatusPayload
) {
  await requireUserId(payload.userId);
  const cleanFoodId = cleanNullableString(payload.foodId);
  if (!cleanFoodId) {
    throw new Error('foodId is required');
  }

  const nextStatus = payload.verificationStatus;

  const { data, error } = await supabase
    .schema(NUTRITION_SCHEMA)
    .from('food_items')
    .update({
      verification_status: nextStatus,
      is_verified: nextStatus === 'verified',
    })
    .eq('id', cleanFoodId)
    .select(FOOD_ITEM_SELECT)
    .single();

  if (error) throw error;
  return data as CanonicalFoodRow;
}

export async function searchFoods(query: string, limit = 25) {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const safeLimit = clampLimit(limit, 25, 100);
  const normalizedQuery = normalizeFoodSearchQuery(trimmed);
  const barcodeFirst = /^\d{8,14}$/.test(trimmed);
  const dedupedRows: CanonicalFoodRow[] = [];
  const seenIds = new Set<string>();

  const pushUnique = (row: CanonicalFoodRow | null | undefined) => {
    if (!row) return;
    if (seenIds.has(row.id)) return;
    seenIds.add(row.id);
    dedupedRows.push(row);
  };

  let direct: CanonicalFoodRow | null = null;

  if (barcodeFirst) {
    direct = await getFoodByBarcode(trimmed);
    if (direct) {
      pushUnique(direct);
      if (safeLimit === 1) {
        return dedupedRows;
      }
    }
  }

  if (normalizedQuery) {
    try {
      const { data, error } = await supabase
        .schema(NUTRITION_SCHEMA)
        .rpc('search_food_items', {
          p_query: normalizedQuery,
          p_limit: safeLimit,
        });

      if (error) throw error;
      for (const row of (data ?? []) as CanonicalFoodRow[]) {
        pushUnique(row);
        if (dedupedRows.length >= safeLimit) break;
      }
    } catch (error) {
      if (!isMissingFunction(error, 'search_food_items')) {
        throw error;
      }
    }
  }

  if (dedupedRows.length < safeLimit) {
    const fallbackTerm = sanitizeSearchToken(trimmed);
    const fallbackNormalized = sanitizeSearchToken(normalizedQuery);
    const normalizedPattern = fallbackNormalized.replace(/\s+/g, '%');
    const fallbackPattern = fallbackTerm.replace(/\s+/g, '%');

    if (fallbackPattern || normalizedPattern) {
      try {
        const orFilters = [
          normalizedPattern ? `normalized_name.ilike.%${normalizedPattern}%` : null,
          fallbackPattern ? `name.ilike.%${fallbackPattern}%` : null,
          fallbackPattern ? `brand.ilike.%${fallbackPattern}%` : null,
          fallbackPattern ? `ingredients_text.ilike.%${fallbackPattern}%` : null,
        ]
          .filter(Boolean)
          .join(',');

        let queryBuilder = supabase
          .schema(NUTRITION_SCHEMA)
          .from('food_items')
          .select(FOOD_ITEM_SELECT)
          .or(orFilters)
          .in('verification_status', [...PUBLIC_FOOD_VERIFICATION_STATUSES])
          .order('is_verified', { ascending: false })
          .order('name', { ascending: true })
          .limit(Math.max(0, safeLimit - dedupedRows.length));

        if (direct) {
          queryBuilder = queryBuilder.neq('id', direct.id);
        }

        const { data, error } = await queryBuilder;
        if (error) throw error;

        for (const row of (data ?? []) as CanonicalFoodRow[]) {
          pushUnique(row);
          if (dedupedRows.length >= safeLimit) break;
        }
      } catch (fallbackError) {
        if (
          !isMissingColumn(fallbackError, 'normalized_name') &&
          !isMissingColumn(fallbackError, 'verification_status')
        ) {
          throw fallbackError;
        }

        if (!fallbackPattern) {
          return dedupedRows.slice(0, safeLimit);
        }

        try {
          let queryBuilder = supabase
            .schema(NUTRITION_SCHEMA)
            .from('food_items')
            .select(FOOD_ITEM_SELECT)
            .or(
              `name.ilike.%${fallbackPattern}%,brand.ilike.%${fallbackPattern}%,ingredients_text.ilike.%${fallbackPattern}%`
            )
            .in('verification_status', [...PUBLIC_FOOD_VERIFICATION_STATUSES])
            .order('is_verified', { ascending: false })
            .order('name', { ascending: true })
            .limit(Math.max(0, safeLimit - dedupedRows.length));

          if (direct) {
            queryBuilder = queryBuilder.neq('id', direct.id);
          }

          const { data, error: fallbackQueryError } = await queryBuilder;
          if (fallbackQueryError) throw fallbackQueryError;

          for (const row of (data ?? []) as CanonicalFoodRow[]) {
            pushUnique(row);
            if (dedupedRows.length >= safeLimit) break;
          }
        } catch (legacyError) {
          if (!isMissingColumn(legacyError, 'verification_status')) {
            throw legacyError;
          }

          let queryBuilder = supabase
            .schema(NUTRITION_SCHEMA)
            .from('food_items')
            .select(FOOD_ITEM_SELECT_LEGACY)
            .or(
              `name.ilike.%${fallbackPattern}%,brand.ilike.%${fallbackPattern}%,ingredients_text.ilike.%${fallbackPattern}%`
            )
            .order('is_verified', { ascending: false })
            .order('name', { ascending: true })
            .limit(Math.max(0, safeLimit - dedupedRows.length));

          if (direct) {
            queryBuilder = queryBuilder.neq('id', direct.id);
          }

          const { data, error: legacyQueryError } = await queryBuilder;
          if (legacyQueryError) throw legacyQueryError;

          for (const row of (data ?? []) as unknown[]) {
            pushUnique(asCanonicalFoodRow(row));
            if (dedupedRows.length >= safeLimit) break;
          }
        }
      }
    }
  }

  if (dedupedRows.length < safeLimit && barcodeFirst && direct) {
    try {
      const { data, error } = await supabase
        .schema(NUTRITION_SCHEMA)
        .from('food_items')
        .select(FOOD_ITEM_SELECT)
        .ilike('name', `%${sanitizeSearchToken(trimmed)}%`)
        .neq('id', direct.id)
        .in('verification_status', [...PUBLIC_FOOD_VERIFICATION_STATUSES])
        .order('is_verified', { ascending: false })
        .order('name', { ascending: true })
        .limit(Math.max(0, safeLimit - dedupedRows.length));

      if (error) throw error;
      for (const row of (data ?? []) as CanonicalFoodRow[]) {
        pushUnique(row);
        if (dedupedRows.length >= safeLimit) break;
      }
    } catch (error) {
      if (!isMissingColumn(error, 'verification_status')) {
        console.warn('[nutrition.searchFoods] fallback barcode expansion failed', error);
        return dedupedRows.slice(0, safeLimit);
      }

      try {
        const { data, error: legacyError } = await supabase
          .schema(NUTRITION_SCHEMA)
          .from('food_items')
          .select(FOOD_ITEM_SELECT_LEGACY)
          .ilike('name', `%${sanitizeSearchToken(trimmed)}%`)
          .neq('id', direct.id)
          .order('is_verified', { ascending: false })
          .order('name', { ascending: true })
          .limit(Math.max(0, safeLimit - dedupedRows.length));

        if (legacyError) throw legacyError;
        for (const row of (data ?? []) as unknown[]) {
          pushUnique(asCanonicalFoodRow(row));
          if (dedupedRows.length >= safeLimit) break;
        }
      } catch (legacyQueryError) {
        console.warn(
          '[nutrition.searchFoods] fallback barcode expansion failed',
          legacyQueryError
        );
      }
    }
  }

  return dedupedRows.slice(0, safeLimit);
}

export async function getLastFoodDiaryUsage(foodId: string, userId?: string | null) {
  const cleanFoodId = cleanNullableString(foodId);
  if (!cleanFoodId) return null;

  const resolvedUserId = await requireUserId(userId);

  const { data, error } = await supabase
    .schema(NUTRITION_SCHEMA)
    .from('diary_items')
    .select(DIARY_FOOD_USAGE_SELECT)
    .eq('user_id', resolvedUserId)
    .eq('food_id', cleanFoodId)
    .order('consumed_at', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error && !isNotFound(error)) throw error;
  if (!data) return null;

  return mapDiaryFoodUsageRow(toDiaryFoodUsageRow(data));
}

export async function getRecentFoods(userId?: string | null, limit = 12) {
  const resolvedUserId = await requireUserId(userId);
  const safeLimit = clampLimit(limit, 12, 40);
  const fetchSize = Math.min(safeLimit * 10, 400);

  const { data, error } = await supabase
    .schema(NUTRITION_SCHEMA)
    .from('diary_items')
    .select(DIARY_FOOD_USAGE_SELECT)
    .eq('user_id', resolvedUserId)
    .not('food_id', 'is', null)
    .order('consumed_at', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(fetchSize);

  if (error) throw error;

  const rankingByFoodId = new Map<
    string,
    { usage: LastFoodDiaryUsage; usageCount: number; relevanceScore: number }
  >();

  for (const rawRow of (data ?? []) as DiaryFoodUsageSelectRow[]) {
    const usage = mapDiaryFoodUsageRow(toDiaryFoodUsageRow(rawRow));
    if (!usage) continue;

    const consumedAtTs = toTimestamp(usage.consumedAt);
    const existing = rankingByFoodId.get(usage.foodId);

    if (!existing) {
      rankingByFoodId.set(usage.foodId, {
        usage,
        usageCount: 1,
        relevanceScore: consumedAtTs,
      });
      continue;
    }

    existing.usageCount += 1;

    if (consumedAtTs > toTimestamp(existing.usage.consumedAt)) {
      existing.usage = usage;
    }

    const frequencyBoostMs = Math.min(existing.usageCount, 12) * 4 * 60 * 60 * 1000;
    existing.relevanceScore = toTimestamp(existing.usage.consumedAt) + frequencyBoostMs;
  }

  const ranked = Array.from(rankingByFoodId.values())
    .sort((a, b) => {
      if (b.relevanceScore !== a.relevanceScore) {
        return b.relevanceScore - a.relevanceScore;
      }
      return toTimestamp(b.usage.consumedAt) - toTimestamp(a.usage.consumedAt);
    })
    .slice(0, safeLimit);

  if (!ranked.length) return [];

  const foodIds = ranked.map((item) => item.usage.foodId);
  const foodRows = await selectCanonicalFoodsByIds(foodIds);

  const foodsById = new Map(
    foodRows.map((food) => [food.id, food] as const)
  );

  const rows: RecentFoodRow[] = [];
  for (const rankedRow of ranked) {
    const food = foodsById.get(rankedRow.usage.foodId);
    if (!food) continue;
    rows.push({
      food,
      lastUsage: rankedRow.usage,
      usageCount: rankedRow.usageCount,
      relevanceScore: rankedRow.relevanceScore,
    });
  }

  return rows;
}

export async function getRecentMeals(userId?: string | null, limit = 10) {
  const resolvedUserId = await requireUserId(userId);
  const safeLimit = clampLimit(limit, 10, 40);
  const fetchSize = Math.min(safeLimit * 10, 400);

  const { data, error } = await supabase
    .schema(NUTRITION_SCHEMA)
    .from('diary_items')
    .select(DIARY_MEAL_USAGE_SELECT)
    .eq('user_id', resolvedUserId)
    .not('recipe_id', 'is', null)
    .order('consumed_at', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(fetchSize);

  if (error) throw error;

  const rankingByMealId = new Map<
    string,
    { usage: LastMealDiaryUsage; usageCount: number; relevanceScore: number }
  >();

  for (const rawRow of (data ?? []) as DiaryMealUsageSelectRow[]) {
    const usage = mapDiaryMealUsageRow(toDiaryMealUsageRow(rawRow));
    if (!usage) continue;

    const consumedAtTs = toTimestamp(usage.consumedAt);
    const existing = rankingByMealId.get(usage.mealId);

    if (!existing) {
      rankingByMealId.set(usage.mealId, {
        usage,
        usageCount: 1,
        relevanceScore: consumedAtTs,
      });
      continue;
    }

    existing.usageCount += 1;

    if (consumedAtTs > toTimestamp(existing.usage.consumedAt)) {
      existing.usage = usage;
    }

    const frequencyBoostMs = Math.min(existing.usageCount, 12) * 4 * 60 * 60 * 1000;
    existing.relevanceScore = toTimestamp(existing.usage.consumedAt) + frequencyBoostMs;
  }

  const ranked = Array.from(rankingByMealId.values())
    .sort((a, b) => {
      if (b.relevanceScore !== a.relevanceScore) {
        return b.relevanceScore - a.relevanceScore;
      }
      return toTimestamp(b.usage.consumedAt) - toTimestamp(a.usage.consumedAt);
    })
    .slice(0, safeLimit);

  if (!ranked.length) return [];

  const mealIds = ranked.map((item) => item.usage.mealId);
  const { data: mealRows, error: mealsError } = await supabase
    .schema(NUTRITION_SCHEMA)
    .from('recipes')
    .select(RECIPE_SELECT)
    .in('id', mealIds);

  if (mealsError) throw mealsError;

  const mealsById = new Map(
    ((mealRows ?? []) as UserMealRow[]).map((meal) => [meal.id, meal] as const)
  );

  const rows: RecentMealRow[] = [];
  for (const rankedRow of ranked) {
    const meal = mealsById.get(rankedRow.usage.mealId);
    if (!meal) continue;
    rows.push({
      meal,
      lastUsage: rankedRow.usage,
      usageCount: rankedRow.usageCount,
      relevanceScore: rankedRow.relevanceScore,
    });
  }

  return rows;
}

export async function getUserFavoriteFoodIds(userId?: string | null) {
  const resolvedUserId = await requireUserId(userId);

  let data: unknown[] | null = null;
  try {
    const result = await supabase
      .schema(NUTRITION_SCHEMA)
      .from('user_favorite_foods')
      .select('food_id')
      .eq('user_id', resolvedUserId)
      .order('created_at', { ascending: false });

    if (result.error) throw result.error;
    data = result.data;
  } catch (error) {
    if (isMissingTable(error, 'nutrition.user_favorite_foods')) {
      return [];
    }
    throw error;
  }

  return Array.from(
    new Set(
      (data ?? [])
        .map((row) => cleanNullableString((row as { food_id?: unknown }).food_id as string))
        .filter(Boolean) as string[]
    )
  );
}

export async function setFoodFavorite(
  foodId: string,
  isFavorite: boolean,
  userId?: string | null
) {
  const resolvedUserId = await requireUserId(userId);
  const cleanFoodId = cleanNullableString(foodId);

  if (!cleanFoodId) {
    throw new Error('foodId is required');
  }

  if (isFavorite) {
    try {
      const { error } = await supabase
        .schema(NUTRITION_SCHEMA)
        .from('user_favorite_foods')
        .upsert(
          {
            user_id: resolvedUserId,
            food_id: cleanFoodId,
          },
          { onConflict: 'user_id,food_id', ignoreDuplicates: true }
        );

      if (error) throw error;
    } catch (error) {
      if (isMissingTable(error, 'nutrition.user_favorite_foods')) {
        return false;
      }
      throw error;
    }
    return true;
  }

  try {
    const { error } = await supabase
      .schema(NUTRITION_SCHEMA)
      .from('user_favorite_foods')
      .delete()
      .eq('user_id', resolvedUserId)
      .eq('food_id', cleanFoodId);

    if (error) throw error;
  } catch (error) {
    if (isMissingTable(error, 'nutrition.user_favorite_foods')) {
      return false;
    }
    throw error;
  }
  return false;
}

export async function getFavoriteFoods(userId?: string | null, limit = 12) {
  const resolvedUserId = await requireUserId(userId);
  const safeLimit = clampLimit(limit, 12, 40);

  let data: unknown[] | null = null;
  try {
    const result = await supabase
      .schema(NUTRITION_SCHEMA)
      .from('user_favorite_foods')
      .select(FAVORITE_FOOD_SELECT)
      .eq('user_id', resolvedUserId)
      .order('created_at', { ascending: false })
      .limit(safeLimit);

    if (result.error) throw result.error;
    data = result.data;
  } catch (error) {
    if (isMissingTable(error, 'nutrition.user_favorite_foods')) {
      return [];
    }
    throw error;
  }

  const favorites = (data ?? []) as FavoriteFoodRow[];
  if (!favorites.length) return [];

  const foodIds = favorites
    .map((favorite) => cleanNullableString(favorite.food_id))
    .filter(Boolean) as string[];

  const foodRows = await selectCanonicalFoodsByIds(foodIds);

  const foodsById = new Map(
    foodRows.map((food) => [food.id, food] as const)
  );

  const orderedFoods: CanonicalFoodRow[] = [];
  for (const favorite of favorites) {
    const food = foodsById.get(favorite.food_id);
    if (!food) continue;
    orderedFoods.push(food);
  }

  return orderedFoods;
}

export async function getUserFavoriteMealIds(userId?: string | null) {
  const resolvedUserId = await requireUserId(userId);

  let data: unknown[] | null = null;
  try {
    const result = await supabase
      .schema(NUTRITION_SCHEMA)
      .from('user_favorite_meals')
      .select('meal_id')
      .eq('user_id', resolvedUserId)
      .order('created_at', { ascending: false });

    if (result.error) throw result.error;
    data = result.data;
  } catch (error) {
    if (isMissingTable(error, 'nutrition.user_favorite_meals')) {
      return [];
    }
    throw error;
  }

  return Array.from(
    new Set(
      (data ?? [])
        .map((row) => cleanNullableString((row as { meal_id?: unknown }).meal_id as string))
        .filter(Boolean) as string[]
    )
  );
}

export async function setMealFavorite(
  mealId: string,
  isFavorite: boolean,
  userId?: string | null
) {
  const resolvedUserId = await requireUserId(userId);
  const cleanMealId = cleanNullableString(mealId);

  if (!cleanMealId) {
    throw new Error('mealId is required');
  }

  if (isFavorite) {
    try {
      const { error } = await supabase
        .schema(NUTRITION_SCHEMA)
        .from('user_favorite_meals')
        .upsert(
          {
            user_id: resolvedUserId,
            meal_id: cleanMealId,
          },
          { onConflict: 'user_id,meal_id', ignoreDuplicates: true }
        );

      if (error) throw error;
    } catch (error) {
      if (isMissingTable(error, 'nutrition.user_favorite_meals')) {
        return false;
      }
      throw error;
    }
    return true;
  }

  try {
    const { error } = await supabase
      .schema(NUTRITION_SCHEMA)
      .from('user_favorite_meals')
      .delete()
      .eq('user_id', resolvedUserId)
      .eq('meal_id', cleanMealId);

    if (error) throw error;
  } catch (error) {
    if (isMissingTable(error, 'nutrition.user_favorite_meals')) {
      return false;
    }
    throw error;
  }
  return false;
}

export async function getFavoriteMeals(userId?: string | null, limit = 12) {
  const resolvedUserId = await requireUserId(userId);
  const safeLimit = clampLimit(limit, 12, 40);

  let data: unknown[] | null = null;
  try {
    const result = await supabase
      .schema(NUTRITION_SCHEMA)
      .from('user_favorite_meals')
      .select(FAVORITE_MEAL_SELECT)
      .eq('user_id', resolvedUserId)
      .order('created_at', { ascending: false })
      .limit(safeLimit);

    if (result.error) throw result.error;
    data = result.data;
  } catch (error) {
    if (isMissingTable(error, 'nutrition.user_favorite_meals')) {
      return [];
    }
    throw error;
  }

  const favorites = (data ?? []) as FavoriteMealRow[];
  if (!favorites.length) return [];

  const mealIds = favorites
    .map((favorite) => cleanNullableString(favorite.meal_id))
    .filter(Boolean) as string[];

  const { data: mealRows, error: mealsError } = await supabase
    .schema(NUTRITION_SCHEMA)
    .from('recipes')
    .select(RECIPE_SELECT)
    .eq('user_id', resolvedUserId)
    .in('id', mealIds);

  if (mealsError) throw mealsError;

  const mealsById = new Map(
    ((mealRows ?? []) as UserMealRow[]).map((meal) => [meal.id, meal] as const)
  );

  const orderedMeals: UserMealRow[] = [];
  for (const favorite of favorites) {
    const meal = mealsById.get(favorite.meal_id);
    if (!meal) continue;
    orderedMeals.push(meal);
  }

  return orderedMeals;
}

export async function createFoodSubmissionFromScan(payload: CreateFoodSubmissionFromScanPayload) {
  const userId = await requireUserId(payload.createdBy);

  const insertPayload = {
    created_by: userId,
    barcode: cleanNullableString(payload.barcode),
    barcode_normalized: normalizeBarcode(payload.barcode),
    label_image_urls: cleanStringArray(payload.labelImageUrls),
    ocr_raw_text: cleanNullableString(payload.ocrRawText),
    ocr_payload: (payload.ocrPayload ?? null) as JsonValue | null,
    confirmation_status: 'pending' as FoodSubmissionStatus,
    canonical_food_id: null,
    notes: cleanNullableString(payload.notes),
  };

  const { data, error } = await supabase
    .schema(NUTRITION_SCHEMA)
    .from('food_submissions')
    .insert(insertPayload)
    .select(FOOD_SUBMISSION_SELECT)
    .single();

  if (error) throw error;
  return data as FoodSubmissionRow;
}

export async function getFoodSubmissionById(submissionId: string) {
  const cleanId = cleanNullableString(submissionId);
  if (!cleanId) return null;

  const { data, error } = await supabase
    .schema(NUTRITION_SCHEMA)
    .from('food_submissions')
    .select(FOOD_SUBMISSION_SELECT)
    .eq('id', cleanId)
    .maybeSingle();

  if (error && !isNotFound(error)) throw error;
  return (data as FoodSubmissionRow | null) ?? null;
}

export async function confirmFoodSubmissionAndCreateCanonicalFood(
  payload: ConfirmFoodSubmissionAndCreateCanonicalFoodPayload
): Promise<ConfirmFoodSubmissionAndCreateCanonicalFoodResult> {
  const reviewedBy = await requireUserId(payload.reviewedBy);
  const createdBy = await requireUserId(payload.food.createdBy ?? reviewedBy);
  const verificationStatus: FoodVerificationStatus =
    payload.food.verificationStatus ??
    (payload.food.isVerified ? 'verified' : 'user_confirmed');

  const { data: submissionToConfirm, error: submissionLookupError } = await supabase
    .schema(NUTRITION_SCHEMA)
    .from('food_submissions')
    .select('id')
    .eq('id', payload.submissionId)
    .maybeSingle();

  if (submissionLookupError && !isNotFound(submissionLookupError)) {
    throw submissionLookupError;
  }
  if (!submissionToConfirm?.id) {
    throw new Error('Food submission not found');
  }

  const canonicalFoodInsertBase = {
    food_kind: payload.food.foodKind ?? 'ingredient',
    name: String(payload.food.name ?? '').trim(),
    brand: cleanNullableString(payload.food.brand),
    barcode: cleanNullableString(payload.food.barcode),
    serving_reference: (payload.food.servingReference ?? null) as JsonValue | null,
    calories: toNullableNumber(payload.food.calories),
    protein: toNullableNumber(payload.food.protein),
    carbs: toNullableNumber(payload.food.carbs),
    fat: toNullableNumber(payload.food.fat),
    fiber: toNullableNumber(payload.food.fiber),
    sodium_mg: toNullableNumber(payload.food.sodiumMg),
    ingredients_text: cleanNullableString(payload.food.ingredientsText),
    source: payload.food.source ?? 'user',
    image_urls: cleanStringArray(payload.food.imageUrls),
    created_by: createdBy,
    is_verified: verificationStatus === 'verified',
  };

  if (!canonicalFoodInsertBase.name) {
    throw new Error('Food name is required');
  }

  let foodData: unknown = null;

  const { data: nextFoodData, error: foodError } = await supabase
    .schema(NUTRITION_SCHEMA)
    .from('food_items')
    .insert({
      ...canonicalFoodInsertBase,
      verification_status: verificationStatus,
    })
    .select(FOOD_ITEM_SELECT)
    .single();

  if (foodError) {
    if (!isMissingColumn(foodError, 'verification_status')) {
      throw foodError;
    }

    const { data: legacyFoodData, error: legacyFoodError } = await supabase
      .schema(NUTRITION_SCHEMA)
      .from('food_items')
      .insert(canonicalFoodInsertBase)
      .select(FOOD_ITEM_SELECT_LEGACY)
      .single();

    if (legacyFoodError) throw legacyFoodError;
    foodData = legacyFoodData;
  } else {
    foodData = nextFoodData;
  }

  const canonicalFoodId = extractInsertId(foodData);
  if (!canonicalFoodId) {
    throw new Error('Canonical food creation failed');
  }

  const submissionUpdateBase = {
    confirmation_status: payload.confirmationStatus ?? 'confirmed',
    reviewed_by: reviewedBy,
    reviewed_at: new Date().toISOString(),
  };

  let submissionData: unknown = null;

  const { data: nextSubmissionData, error: submissionError } = await supabase
    .schema(NUTRITION_SCHEMA)
    .from('food_submissions')
    .update({
      ...submissionUpdateBase,
      canonical_food_id: canonicalFoodId,
    })
    .eq('id', payload.submissionId)
    .select(FOOD_SUBMISSION_SELECT)
    .single();

  if (submissionError) {
    if (
      !isForeignKeyViolation(submissionError, 'food_submissions_canonical_food_id_fkey')
    ) {
      throw submissionError;
    }

    const { data: legacySubmissionData, error: legacySubmissionError } = await supabase
      .schema(NUTRITION_SCHEMA)
      .from('food_submissions')
      .update(submissionUpdateBase)
      .eq('id', payload.submissionId)
      .select(FOOD_SUBMISSION_SELECT)
      .single();

    if (legacySubmissionError) throw legacySubmissionError;
    submissionData = legacySubmissionData;
  } else {
    submissionData = nextSubmissionData;
  }

  return {
    food: asCanonicalFoodRow(foodData, verificationStatus),
    submission: submissionData as FoodSubmissionRow,
  };
}

export async function createUserMeal(payload: CreateUserMealPayload) {
  const userId = await requireUserId(payload.userId);
  const name = String(payload.name ?? '').trim();

  if (!name) {
    throw new Error('Meal name is required');
  }

  const recipeInsert = {
    user_id: userId,
    name,
    description: cleanNullableString(payload.description),
    notes: cleanNullableString(payload.notes),
    kcal: toNumber(payload.kcal, 0),
    protein: toNumber(payload.protein, 0),
    carbs: toNumber(payload.carbs, 0),
    fat: toNumber(payload.fat, 0),
    fiber: toNullableNumber(payload.fiber),
    sugar: toNullableNumber(payload.sugar),
    sodium: toNullableNumber(payload.sodium),
    default_portion_grams: toNullableNumber(payload.defaultPortionGrams),
    is_private: payload.isPrivate ?? true,
  };

  const { data: recipeData, error: recipeError } = await supabase
    .schema(NUTRITION_SCHEMA)
    .from('recipes')
    .insert(recipeInsert)
    .select(RECIPE_SELECT)
    .single();

  if (recipeError) throw recipeError;

  const recipe = recipeData as UserMealRow;

  const ingredients = payload.ingredients ?? [];
  if (ingredients.length > 0) {
    const ingredientRows = toRecipeIngredientRows(recipe.id, userId, ingredients);

    if (ingredientRows.length > 0) {
      const { error: ingredientError } = await supabase
        .schema(NUTRITION_SCHEMA)
        .from('recipe_ingredients')
        .insert(ingredientRows);

      if (ingredientError) throw ingredientError;
    }
  }

  const ingredientMap = await getMealIngredientsByRecipeIds([recipe.id]);

  return {
    ...recipe,
    ingredients: ingredientMap.get(recipe.id) ?? [],
  } as UserMealWithIngredients;
}

export async function updateUserMeal(payload: UpdateUserMealPayload) {
  const userId = await requireUserId(payload.userId);

  const { data: existingMeal, error: existingMealError } = await supabase
    .schema(NUTRITION_SCHEMA)
    .from('recipes')
    .select(RECIPE_SELECT)
    .eq('id', payload.mealId)
    .eq('user_id', userId)
    .maybeSingle();

  if (existingMealError && !isNotFound(existingMealError)) throw existingMealError;
  if (!existingMeal) {
    throw new Error('Meal not found');
  }

  const patch: Record<string, unknown> = {};

  if (payload.name !== undefined) {
    const nextName = cleanNullableString(payload.name);
    if (!nextName) throw new Error('Meal name cannot be empty');
    patch.name = nextName;
  }
  if (payload.description !== undefined) {
    patch.description = cleanNullableString(payload.description);
  }
  if (payload.notes !== undefined) {
    patch.notes = cleanNullableString(payload.notes);
  }
  if (payload.kcal !== undefined) {
    patch.kcal = toNumber(payload.kcal, 0);
  }
  if (payload.protein !== undefined) {
    patch.protein = toNumber(payload.protein, 0);
  }
  if (payload.carbs !== undefined) {
    patch.carbs = toNumber(payload.carbs, 0);
  }
  if (payload.fat !== undefined) {
    patch.fat = toNumber(payload.fat, 0);
  }
  if (payload.fiber !== undefined) {
    patch.fiber = toNullableNumber(payload.fiber);
  }
  if (payload.sugar !== undefined) {
    patch.sugar = toNullableNumber(payload.sugar);
  }
  if (payload.sodium !== undefined) {
    patch.sodium = toNullableNumber(payload.sodium);
  }
  if (payload.defaultPortionGrams !== undefined) {
    patch.default_portion_grams = toNullableNumber(payload.defaultPortionGrams);
  }
  if (payload.isPrivate !== undefined) {
    patch.is_private = payload.isPrivate;
  }

  let recipe = existingMeal as UserMealRow;

  if (Object.keys(patch).length > 0) {
    const { data: updatedData, error: updateError } = await supabase
      .schema(NUTRITION_SCHEMA)
      .from('recipes')
      .update(patch)
      .eq('id', payload.mealId)
      .eq('user_id', userId)
      .select(RECIPE_SELECT)
      .single();

    if (updateError) throw updateError;
    recipe = updatedData as UserMealRow;
  }

  if (payload.ingredients !== undefined) {
    const { error: deleteIngredientsError } = await supabase
      .schema(NUTRITION_SCHEMA)
      .from('recipe_ingredients')
      .delete()
      .eq('recipe_id', payload.mealId);

    if (deleteIngredientsError) throw deleteIngredientsError;

    const ingredientRows = toRecipeIngredientRows(payload.mealId, userId, payload.ingredients);
    if (ingredientRows.length > 0) {
      const { error: insertIngredientsError } = await supabase
        .schema(NUTRITION_SCHEMA)
        .from('recipe_ingredients')
        .insert(ingredientRows);

      if (insertIngredientsError) throw insertIngredientsError;
    }
  }

  const ingredientMap = await getMealIngredientsByRecipeIds([payload.mealId]);

  return {
    ...recipe,
    ingredients: ingredientMap.get(payload.mealId) ?? [],
  } as UserMealWithIngredients;
}

export async function getUserMeals(userId?: string | null) {
  const cleanUserId = await requireUserId(userId);

  const { data, error } = await supabase
    .schema(NUTRITION_SCHEMA)
    .from('recipes')
    .select(RECIPE_SELECT)
    .eq('user_id', cleanUserId)
    .order('updated_at', { ascending: false });

  if (error) throw error;

  const rows = (data ?? []) as UserMealRow[];
  if (!rows.length) return [];

  const ingredientMap = await getMealIngredientsByRecipeIds(rows.map((row) => row.id));

  return rows.map((row) => ({
    ...row,
    ingredients: ingredientMap.get(row.id) ?? [],
  })) as UserMealWithIngredients[];
}

export async function getUserMealById(mealId: string, userId?: string | null) {
  const cleanMealId = cleanNullableString(mealId);
  if (!cleanMealId) return null;

  const resolvedUserId = await requireUserId(userId);

  const { data, error } = await supabase
    .schema(NUTRITION_SCHEMA)
    .from('recipes')
    .select(RECIPE_SELECT)
    .eq('id', cleanMealId)
    .eq('user_id', resolvedUserId)
    .maybeSingle();

  if (error && !isNotFound(error)) throw error;
  if (!data) return null;

  const ingredientMap = await getMealIngredientsByRecipeIds([cleanMealId]);

  return {
    ...(data as UserMealRow),
    ingredients: ingredientMap.get(cleanMealId) ?? [],
  } as UserMealWithIngredients;
}

export async function getCanonicalFoodsByIds(foodIds: string[]) {
  const deduped = Array.from(
    new Set(foodIds.map((id) => cleanNullableString(id)).filter(Boolean) as string[])
  );
  if (!deduped.length) return [];

  return selectCanonicalFoodsByIds(deduped);
}

export async function createDiaryEntry(payload: CreateDiaryEntryPayload) {
  const userId = await requireUserId(payload.userId);
  const foodId = cleanNullableString(payload.foodId);
  const mealId = cleanNullableString(payload.mealId);

  if (!foodId && !mealId) {
    throw new Error('Either foodId or mealId is required');
  }
  if (foodId && mealId) {
    throw new Error('Only one of foodId or mealId can be provided');
  }

  const consumedAt = cleanNullableString(payload.consumedAt) ?? new Date().toISOString();
  const dateOnly = cleanNullableString(payload.date) ?? toDateOnly(consumedAt);
  const diaryDay = await ensureDiaryDayRow(userId, dateOnly, payload.timezoneStr);

  const quantity = toPositiveNumber(payload.quantity, 1);
  const baseSnapshot = payload.snapshot
    ? {
        kcal: toNumber(payload.snapshot.kcal, 0),
        protein: toNumber(payload.snapshot.protein, 0),
        carbs: toNumber(payload.snapshot.carbs, 0),
        fat: toNumber(payload.snapshot.fat, 0),
        fiber: toNullableNumber(payload.snapshot.fiber),
        sugar: toNullableNumber(payload.snapshot.sugar),
        sodium: toNullableNumber(payload.snapshot.sodium),
        grams: toNullableNumber(payload.snapshot.grams),
      }
    : foodId
      ? await getFoodSnapshot(foodId)
      : await getMealSnapshot(String(mealId), userId);

  const scaledSnapshot = payload.snapshot
    ? baseSnapshot
    : multiplySnapshot(baseSnapshot, quantity);

  const mealSlot = normalizeMealSlot(payload.mealSlot ?? payload.mealType);

  const insertPayload = {
    user_id: userId,
    diary_day_id: diaryDay.id,
    meal_type: cleanNullableString(payload.mealType) ?? mealSlot,
    meal_slot: mealSlot,
    food_id: foodId,
    recipe_id: mealId,
    quantity,
    unit_label: cleanNullableString(payload.unitLabel) ?? 'serving',
    consumed_at: consumedAt,
    grams: toNullableNumber(payload.grams) ?? scaledSnapshot.grams,
    kcal: scaledSnapshot.kcal,
    protein: scaledSnapshot.protein,
    carbs: scaledSnapshot.carbs,
    fat: scaledSnapshot.fat,
    fiber: scaledSnapshot.fiber,
    sugar: scaledSnapshot.sugar,
    sodium: scaledSnapshot.sodium,
    note: cleanNullableString(payload.note),
  };

  const { data, error } = await supabase
    .schema(NUTRITION_SCHEMA)
    .from('diary_items')
    .insert(insertPayload)
    .select(DIARY_ITEM_SELECT)
    .single();

  if (error) throw error;

  await refreshDiaryDayTotals(diaryDay.id);

  return data as DiaryEntryRow;
}

export async function getDiaryEntriesByDate(userId: string, date: string) {
  const cleanUserId = cleanNullableString(userId);
  const cleanDate = cleanNullableString(date);

  if (!cleanUserId || !cleanDate) return [];

  const { data: diaryDay, error: diaryDayError } = await supabase
    .schema(NUTRITION_SCHEMA)
    .from('diary_days')
    .select('id')
    .eq('user_id', cleanUserId)
    .eq('date', cleanDate)
    .maybeSingle();

  if (diaryDayError && !isNotFound(diaryDayError)) throw diaryDayError;
  if (!diaryDay?.id) return [];

  const { data, error } = await supabase
    .schema(NUTRITION_SCHEMA)
    .from('diary_items')
    .select(DIARY_ITEM_SELECT)
    .eq('diary_day_id', diaryDay.id)
    .order('consumed_at', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data ?? []) as DiaryEntryRow[];
}

function buildCopiedDiaryRows(sourceEntries: DiaryEntryRow[], userId: string, diaryDayId: string, toDate: string) {
  return sourceEntries.map((entry) => ({
    user_id: userId,
    diary_day_id: diaryDayId,
    meal_type: entry.meal_type,
    meal_slot: entry.meal_slot,
    food_id: entry.food_id,
    recipe_id: entry.recipe_id,
    quantity: entry.quantity,
    unit_label: entry.unit_label,
    consumed_at: copyConsumedTimeToDate(entry.consumed_at, toDate),
    grams: entry.grams,
    kcal: entry.kcal,
    protein: entry.protein,
    carbs: entry.carbs,
    fat: entry.fat,
    fiber: entry.fiber,
    sugar: entry.sugar,
    sodium: entry.sodium,
    note: entry.note,
  }));
}

export async function copyDiaryEntryToDate(
  entryId: string,
  toDate: string,
  userId?: string | null
): Promise<DiaryEntryRow | null> {
  const resolvedUserId = await requireUserId(userId);
  const cleanEntryId = cleanNullableString(entryId);
  const cleanToDate = cleanNullableString(toDate);

  if (!cleanEntryId) {
    throw new Error('entryId is required');
  }
  if (!cleanToDate) {
    throw new Error('toDate is required');
  }

  const { data: sourceEntry, error: sourceError } = await supabase
    .schema(NUTRITION_SCHEMA)
    .from('diary_items')
    .select(DIARY_ITEM_SELECT)
    .eq('id', cleanEntryId)
    .eq('user_id', resolvedUserId)
    .maybeSingle();

  if (sourceError && !isNotFound(sourceError)) throw sourceError;
  if (!sourceEntry) return null;

  const targetDay = await ensureDiaryDayRow(resolvedUserId, cleanToDate);
  const copyRows = buildCopiedDiaryRows(
    [sourceEntry as DiaryEntryRow],
    resolvedUserId,
    targetDay.id,
    cleanToDate
  );

  const { data, error } = await supabase
    .schema(NUTRITION_SCHEMA)
    .from('diary_items')
    .insert(copyRows)
    .select(DIARY_ITEM_SELECT)
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  await refreshDiaryDayTotals(targetDay.id);
  return (data as DiaryEntryRow | null) ?? null;
}

export async function copyDiaryEntryToToday(entryId: string, userId?: string | null) {
  return copyDiaryEntryToDate(entryId, toDateOnly(new Date()), userId);
}

export async function copyDiaryEntries(
  fromDate: string,
  toDate: string,
  userId: string
): Promise<DiaryEntryRow[]> {
  const cleanUserId = cleanNullableString(userId);
  if (!cleanUserId) {
    throw new Error('User ID is required');
  }

  const from = cleanNullableString(fromDate);
  const to = cleanNullableString(toDate);

  if (!from || !to) {
    throw new Error('Both fromDate and toDate are required');
  }

  if (from === to) {
    return [];
  }

  const sourceEntries = await getDiaryEntriesByDate(cleanUserId, from);
  if (!sourceEntries.length) {
    return [];
  }

  const targetDay = await ensureDiaryDayRow(cleanUserId, to);
  const copyRows = buildCopiedDiaryRows(sourceEntries, cleanUserId, targetDay.id, to);

  const { data, error } = await supabase
    .schema(NUTRITION_SCHEMA)
    .from('diary_items')
    .insert(copyRows)
    .select(DIARY_ITEM_SELECT);

  if (error) throw error;

  await refreshDiaryDayTotals(targetDay.id);

  return (data ?? []) as DiaryEntryRow[];
}

export async function copyMealSlotFromDate(
  fromDate: string,
  toDate: string,
  mealSlot: MealSlot,
  userId?: string | null
): Promise<DiaryEntryRow[]> {
  const resolvedUserId = await requireUserId(userId);
  const from = cleanNullableString(fromDate);
  const to = cleanNullableString(toDate);

  if (!from || !to) {
    throw new Error('Both fromDate and toDate are required');
  }

  const normalizedSlot = normalizeMealSlot(mealSlot);

  const { data: sourceDay, error: sourceDayError } = await supabase
    .schema(NUTRITION_SCHEMA)
    .from('diary_days')
    .select('id')
    .eq('user_id', resolvedUserId)
    .eq('date', from)
    .maybeSingle();

  if (sourceDayError && !isNotFound(sourceDayError)) throw sourceDayError;
  if (!sourceDay?.id) return [];

  const { data: sourceItems, error: sourceItemsError } = await supabase
    .schema(NUTRITION_SCHEMA)
    .from('diary_items')
    .select(DIARY_ITEM_SELECT)
    .eq('user_id', resolvedUserId)
    .eq('diary_day_id', sourceDay.id)
    .eq('meal_slot', normalizedSlot)
    .order('consumed_at', { ascending: true })
    .order('created_at', { ascending: true });

  if (sourceItemsError) throw sourceItemsError;

  const entries = (sourceItems ?? []) as DiaryEntryRow[];
  if (!entries.length) return [];

  const targetDay = await ensureDiaryDayRow(resolvedUserId, to);
  const copyRows = buildCopiedDiaryRows(entries, resolvedUserId, targetDay.id, to);

  const { data, error } = await supabase
    .schema(NUTRITION_SCHEMA)
    .from('diary_items')
    .insert(copyRows)
    .select(DIARY_ITEM_SELECT);

  if (error) throw error;

  await refreshDiaryDayTotals(targetDay.id);
  return (data ?? []) as DiaryEntryRow[];
}

export async function repeatYesterdayMealSlot(
  mealSlot: MealSlot,
  toDate: string,
  userId?: string | null
) {
  const cleanToDate = cleanNullableString(toDate);
  if (!cleanToDate) {
    throw new Error('toDate is required');
  }

  const fromDate = addDaysToDateOnly(cleanToDate, -1);
  return copyMealSlotFromDate(fromDate, cleanToDate, mealSlot, userId);
}

export async function getRecentMealSlotCopyOptions(
  userId?: string | null,
  toDate?: string | null,
  lookbackDays = 7,
  limit = 10
): Promise<MealSlotCopyOption[]> {
  const resolvedUserId = await requireUserId(userId);
  const targetDate = cleanNullableString(toDate) ?? toDateOnly(new Date());
  const safeDays = Math.max(1, Math.min(Math.trunc(lookbackDays), 30));
  const safeLimit = clampLimit(limit, 10, 30);

  const { data: sourceDays, error: sourceDaysError } = await supabase
    .schema(NUTRITION_SCHEMA)
    .from('diary_days')
    .select('id,date')
    .eq('user_id', resolvedUserId)
    .lt('date', targetDate)
    .order('date', { ascending: false })
    .limit(safeDays);

  if (sourceDaysError) throw sourceDaysError;

  const dayRows = (sourceDays ?? []) as Array<{ id: string; date: string }>;
  if (!dayRows.length) return [];

  const dayById = new Map(dayRows.map((row) => [row.id, row.date] as const));
  const dayIds = dayRows.map((row) => row.id);

  const { data: slotRows, error: slotRowsError } = await supabase
    .schema(NUTRITION_SCHEMA)
    .from('diary_items')
    .select('diary_day_id,meal_slot,consumed_at')
    .eq('user_id', resolvedUserId)
    .in('diary_day_id', dayIds)
    .order('consumed_at', { ascending: false });

  if (slotRowsError) throw slotRowsError;

  const aggregate = new Map<string, MealSlotCopyOption>();

  for (const rawRow of (slotRows ?? []) as Array<{
    diary_day_id: string;
    meal_slot: string | null;
    consumed_at: string;
  }>) {
    const dayDate = dayById.get(rawRow.diary_day_id);
    if (!dayDate) continue;

    const slot = normalizeMealSlot(rawRow.meal_slot);
    if (slot === 'custom') continue;

    const key = `${dayDate}::${slot}`;
    const existing = aggregate.get(key);
    if (!existing) {
      aggregate.set(key, {
        sourceDate: dayDate,
        mealSlot: slot,
        entryCount: 1,
        latestConsumedAt: rawRow.consumed_at,
      });
      continue;
    }

    existing.entryCount += 1;
    if (toTimestamp(rawRow.consumed_at) > toTimestamp(existing.latestConsumedAt)) {
      existing.latestConsumedAt = rawRow.consumed_at;
    }
  }

  return Array.from(aggregate.values())
    .sort((a, b) => {
      const dateCmp = toTimestamp(`${b.sourceDate}T00:00:00.000Z`) -
        toTimestamp(`${a.sourceDate}T00:00:00.000Z`);
      if (dateCmp !== 0) return dateCmp;
      if (b.entryCount !== a.entryCount) return b.entryCount - a.entryCount;
      return toTimestamp(b.latestConsumedAt) - toTimestamp(a.latestConsumedAt);
    })
    .slice(0, safeLimit);
}
