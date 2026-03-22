import type { JsonValue } from '@/lib/nutrition/dataAccess';

export type ServingPreset = {
  quantity: number;
  unitLabel: string;
  gramsPerUnit: number;
};

export type ServingEntryMode = 'food' | 'g' | 'oz';

export type ServingReferenceDraft = {
  commonQuantityInput: string;
  commonUnit: string;
  metricGramsInput: string;
};

export const GRAMS_PER_OUNCE = 28.3495;

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function toNullableNumber(value: unknown) {
  if (value == null) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function round(value: number, precision = 2) {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function normalizeUnitToken(value: unknown) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/\s+/g, ' ');
}

function isMetricUnit(unit: string) {
  const normalized = normalizeUnitToken(unit);
  return [
    'g',
    'gram',
    'grams',
    'oz',
    'ounce',
    'ounces',
    'kg',
    'kilogram',
    'kilograms',
    'lb',
    'lbs',
    'pound',
    'pounds',
  ].includes(normalized);
}

export function sanitizeServingQuantityInput(value: string) {
  return value.replace(',', '.').replace(/[^\d./\s]/g, '').replace(/\s+/g, ' ').trimStart();
}

export function sanitizeMetricInput(value: string) {
  return value.replace(',', '.').replace(/[^\d.]/g, '');
}

export function parseServingQuantityInput(value: string | number | null | undefined) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value > 0 ? value : null;
  }

  const raw = sanitizeServingQuantityInput(String(value ?? ''))
    .trim()
    .replace(/\s+/g, ' ');

  if (!raw) return null;

  if (/^\d+(?:\.\d+)?$/.test(raw)) {
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  if (/^\d+\/\d+$/.test(raw)) {
    const [numerator, denominator] = raw.split('/').map(Number);
    if (!denominator) return null;
    const parsed = numerator / denominator;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  if (/^\d+(?:\.\d+)?\s+\d+\/\d+$/.test(raw)) {
    const [wholePart, fractionPart] = raw.split(' ');
    const whole = Number(wholePart);
    const [numerator, denominator] = fractionPart.split('/').map(Number);
    if (!Number.isFinite(whole) || !denominator) return null;
    const parsed = whole + numerator / denominator;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  return null;
}

export function formatServingQuantity(value: number, precision = 2) {
  if (!Number.isFinite(value) || value <= 0) return '1';
  const rounded = round(value, precision);
  if (Number.isInteger(rounded)) return String(rounded);
  return String(rounded).replace(/\.?0+$/, '');
}

export function toMetricGrams(quantity: number | null, unit: unknown) {
  if (quantity == null || quantity <= 0) return null;

  switch (normalizeUnitToken(unit)) {
    case 'g':
    case 'gram':
    case 'grams':
      return quantity;
    case 'oz':
    case 'ounce':
    case 'ounces':
      return quantity * GRAMS_PER_OUNCE;
    case 'kg':
    case 'kilogram':
    case 'kilograms':
      return quantity * 1000;
    case 'lb':
    case 'lbs':
    case 'pound':
    case 'pounds':
      return quantity * 453.59237;
    default:
      return quantity;
  }
}

function extractMetricGramsFromText(rawValue: string) {
  const regex =
    /(\d+(?:\.\d+)?(?:\s+\d+\/\d+|\/\d+)?)\s*(g|grams?|oz|ounces?|kg|kilograms?|lb|lbs|pounds?)/gi;
  let metricGrams: number | null = null;
  let match: RegExpExecArray | null = regex.exec(rawValue);

  while (match) {
    const quantity = parseServingQuantityInput(match[1]);
    const next = toMetricGrams(quantity, match[2]);
    if (next != null) metricGrams = round(next, 2);
    match = regex.exec(rawValue);
  }

  return metricGrams;
}

function parseServingSizeText(
  rawValue: string | null | undefined,
  fallbackUnit = 'serving'
): ServingReferenceDraft {
  const raw = String(rawValue ?? '').trim();
  const metricGrams = raw ? extractMetricGramsFromText(raw) : null;
  const withoutParens = raw.replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();

  const leadingMatch = withoutParens.match(/^([\d./\s]+)\s*(.*)$/);

  if (leadingMatch?.[1]?.trim()) {
    const quantityInput = sanitizeServingQuantityInput(leadingMatch[1]);
    const unit = leadingMatch[2]?.trim() ?? '';

    if (unit && !isMetricUnit(unit)) {
      return {
        commonQuantityInput: quantityInput || '1',
        commonUnit: unit,
        metricGramsInput: metricGrams != null ? formatServingQuantity(metricGrams) : '',
      };
    }
  }

  if (withoutParens && !isMetricUnit(withoutParens)) {
    return {
      commonQuantityInput: '1',
      commonUnit: withoutParens,
      metricGramsInput: metricGrams != null ? formatServingQuantity(metricGrams) : '',
    };
  }

  return {
    commonQuantityInput: '1',
    commonUnit: fallbackUnit,
    metricGramsInput: metricGrams != null ? formatServingQuantity(metricGrams) : '',
  };
}

export function getMetricServingQuantityInGrams(servingReference: JsonValue | null) {
  const reference = asObject(servingReference);
  const metric = asObject(reference?.metric);
  return round(toMetricGrams(toNullableNumber(metric?.quantity), metric?.unit) ?? 0, 2) || null;
}

export function getServingPresetFromReference(
  servingReference: JsonValue | null,
  fallbackUnit = 'serving'
): ServingPreset {
  const reference = asObject(servingReference);
  const common = asObject(reference?.common);
  const commonQty = toNullableNumber(common?.quantity);
  const commonUnit =
    typeof common?.unit === 'string' && common.unit.trim()
      ? common.unit.trim()
      : fallbackUnit;
  const metricGrams = getMetricServingQuantityInGrams(servingReference);

  if (
    commonQty != null &&
    commonQty > 0 &&
    metricGrams != null &&
    metricGrams > 0
  ) {
    return {
      quantity: round(commonQty, 3),
      unitLabel: commonUnit,
      gramsPerUnit: round(metricGrams / commonQty, 3),
    };
  }

  if (commonQty != null && commonQty > 0) {
    return {
      quantity: round(commonQty, 3),
      unitLabel: commonUnit,
      gramsPerUnit: 100,
    };
  }

  if (metricGrams != null && metricGrams > 0) {
    return {
      quantity: round(metricGrams, 2),
      unitLabel: 'g',
      gramsPerUnit: 1,
    };
  }

  return {
    quantity: 1,
    unitLabel: fallbackUnit,
    gramsPerUnit: 100,
  };
}

export function getServingModePresetFromReference(
  servingReference: JsonValue | null,
  mode: ServingEntryMode,
  fallbackUnit = 'serving'
): ServingPreset {
  const foodPreset = getServingPresetFromReference(servingReference, fallbackUnit);
  const totalGramsPerServing = round(foodPreset.quantity * foodPreset.gramsPerUnit, 2);

  if (mode === 'g') {
    return {
      quantity: totalGramsPerServing > 0 ? totalGramsPerServing : 100,
      unitLabel: 'g',
      gramsPerUnit: 1,
    };
  }

  if (mode === 'oz') {
    return {
      quantity:
        totalGramsPerServing > 0
          ? round(totalGramsPerServing / GRAMS_PER_OUNCE, 2)
          : 1,
      unitLabel: 'oz',
      gramsPerUnit: GRAMS_PER_OUNCE,
    };
  }

  return foodPreset;
}

export function inferServingModeFromUnitLabel(unitLabel: string | null | undefined): ServingEntryMode {
  switch (normalizeUnitToken(unitLabel)) {
    case 'g':
    case 'gram':
    case 'grams':
      return 'g';
    case 'oz':
    case 'ounce':
    case 'ounces':
      return 'oz';
    default:
      return 'food';
  }
}

export function getServingReferenceDraft(
  servingReference: JsonValue | null,
  fallbackServingSizeText?: string | null
): ServingReferenceDraft {
  const reference = asObject(servingReference);
  const common = asObject(reference?.common);
  const commonQty = toNullableNumber(common?.quantity);
  const commonUnit =
    typeof common?.unit === 'string' && common.unit.trim() ? common.unit.trim() : '';
  const metricGrams = getMetricServingQuantityInGrams(servingReference);

  if (commonQty != null || commonUnit || metricGrams != null) {
    return {
      commonQuantityInput:
        commonQty != null ? formatServingQuantity(commonQty, 3) : '1',
      commonUnit: commonUnit || 'serving',
      metricGramsInput:
        metricGrams != null ? formatServingQuantity(metricGrams) : '',
    };
  }

  return parseServingSizeText(fallbackServingSizeText, 'serving');
}

export function buildServingReferenceFromDraft(
  draft: ServingReferenceDraft
): JsonValue {
  const commonQuantity = parseServingQuantityInput(draft.commonQuantityInput) ?? 1;
  const commonUnit = String(draft.commonUnit ?? '').trim() || 'serving';
  const metricGrams = parseServingQuantityInput(draft.metricGramsInput);

  const next: Record<string, unknown> = {
    common: {
      quantity: round(commonQuantity, 3),
      unit: commonUnit,
    },
  };

  if (metricGrams != null && metricGrams > 0) {
    next.metric = {
      quantity: round(metricGrams, 2),
      unit: 'g',
    };
  }

  return next as JsonValue;
}

export function convertServingValueToPer100g(
  value: number | null,
  servingGrams: number | null
) {
  if (value == null || servingGrams == null || servingGrams <= 0) return value;
  return round((value * 100) / servingGrams, 2);
}
