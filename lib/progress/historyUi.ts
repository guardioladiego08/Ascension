import type { DistanceUnit, WeightUnit } from '@/contexts/UnitsContext';

const M_PER_MI = 1609.344;
const M_PER_KM = 1000;
const LB_PER_KG = 2.20462;

export function parsePositiveNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function parseIsoDateFilter(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;

  const parsed = new Date(`${trimmed}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : trimmed;
}

export function parseDateStart(value: string) {
  const date = parseIsoDateFilter(value);
  if (!date) return null;
  return new Date(`${date}T00:00:00`).getTime();
}

export function parseDateEnd(value: string) {
  const date = parseIsoDateFilter(value);
  if (!date) return null;
  return new Date(`${date}T23:59:59.999`).getTime();
}

export function formatHistoryDateLabel(raw: string | null | undefined) {
  if (!raw) return 'Session';
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return 'Session';

  return parsed.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDurationLabel(seconds: number | null | undefined) {
  if (!seconds || seconds <= 0) return '0 min';

  const totalMinutes = Math.round(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }

  return `${totalMinutes} min`;
}

export function formatDistanceLabel(
  meters: number | null | undefined,
  unit: DistanceUnit
) {
  if (!meters || meters <= 0) return `0 ${unit}`;
  const divisor = unit === 'mi' ? M_PER_MI : M_PER_KM;
  return `${(meters / divisor).toFixed(2)} ${unit}`;
}

export function distanceInputToMeters(
  value: number,
  unit: DistanceUnit
) {
  return value * (unit === 'mi' ? M_PER_MI : M_PER_KM);
}

export function formatWeightLabel(
  kilograms: number | null | undefined,
  unit: WeightUnit
) {
  if (!kilograms || kilograms <= 0) return `0 ${unit}`;
  const display = unit === 'kg' ? kilograms : kilograms * LB_PER_KG;
  return `${Math.round(display).toLocaleString()} ${unit}`;
}

export function weightInputToKg(
  value: number,
  unit: WeightUnit
) {
  return unit === 'kg' ? value : value / LB_PER_KG;
}
