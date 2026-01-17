// lib/units.ts
import type { DistanceUnit } from '@/contexts/UnitsContext';

export const M_PER_MI = 1609.344;
export const M_PER_KM = 1000;

export function distanceFromMeters(meters: number | null | undefined, unit: DistanceUnit): number {
  const m = Number(meters ?? 0);
  if (!Number.isFinite(m) || m <= 0) return 0;
  return unit === 'mi' ? m / M_PER_MI : m / M_PER_KM;
}

export function formatDistance(meters: number | null | undefined, unit: DistanceUnit, decimals = 2): string {
  const d = distanceFromMeters(meters, unit);
  if (!d) return `0.00 ${unit}`;
  return `${d.toFixed(decimals)} ${unit}`;
}

function pad2(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

export function formatPaceFromMps(mps: number | null | undefined, unit: DistanceUnit): string {
  const v = Number(mps ?? 0);
  if (!Number.isFinite(v) || v <= 0) return '—';
  const secPerUnit = unit === 'mi' ? (M_PER_MI / v) : (M_PER_KM / v);
  const mins = Math.floor(secPerUnit / 60);
  const secs = Math.round(secPerUnit % 60);
  return `${mins}:${pad2(secs)} /${unit}`;
}
