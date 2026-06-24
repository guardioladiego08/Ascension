import type { WeightUnit } from '@/contexts/UnitsContext';

const KG_PER_LB = 0.45359237;
const LB_PER_KG = 2.20462262185;

export function parseNumberOrNull(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

export function formatNumberInput(value: number | null | undefined, digits = 1) {
  if (value == null || !Number.isFinite(value)) return '';

  const rounded = Math.round(value * 10 ** digits) / 10 ** digits;
  return String(rounded);
}

export function toLocalIsoDate(value: Date = new Date()) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseIsoDateOrNull(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;

  const parsed = new Date(`${trimmed}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : trimmed;
}

export function displayWeightToKg(value: number, unit: WeightUnit) {
  return unit === 'lb' ? value * KG_PER_LB : value;
}

export function kgToDisplayWeight(valueKg: number, unit: WeightUnit) {
  return unit === 'lb' ? valueKg * LB_PER_KG : valueKg;
}

export function formatMassFromKg(
  valueKg: number | null | undefined,
  unit: WeightUnit,
  digits = 1,
  empty = '—'
) {
  if (valueKg == null || !Number.isFinite(valueKg)) return empty;
  return `${kgToDisplayWeight(valueKg, unit).toFixed(digits)} ${unit}`;
}

export function formatPercent(
  value: number | null | undefined,
  digits = 1,
  empty = '—'
) {
  if (value == null || !Number.isFinite(value)) return empty;
  return `${value.toFixed(digits)}%`;
}

export function computeLeanMassKg(
  weightKg: number | null | undefined,
  bodyFatPct: number | null | undefined
) {
  if (
    weightKg == null ||
    bodyFatPct == null ||
    !Number.isFinite(weightKg) ||
    !Number.isFinite(bodyFatPct)
  ) {
    return null;
  }

  return weightKg * (1 - bodyFatPct / 100);
}

export function formatBodyMetricDate(value: string | null | undefined, empty = 'No log yet') {
  if (!value) return empty;

  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return empty;

  return parsed.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
