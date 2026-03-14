import { M_PER_KM, M_PER_MI } from '@/lib/units';
import type { GoalSnapshot } from './types';

export function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

export function formatNumber(value: number) {
  if (!Number.isFinite(value)) return '0';
  return Math.round(value).toLocaleString();
}

export function formatMinutes(minutes: number) {
  if (!Number.isFinite(minutes) || minutes <= 0) return '0 min';
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const wholeHours = Math.floor(minutes / 60);
  const remainder = Math.round(minutes % 60);
  if (!remainder) return `${wholeHours}h`;
  return `${wholeHours}h ${remainder}m`;
}

export function formatDistanceValue(meters: number, unit: 'mi' | 'km') {
  if (!Number.isFinite(meters) || meters <= 0) return `0.0 ${unit}`;
  const amount = unit === 'mi' ? meters / M_PER_MI : meters / M_PER_KM;
  return `${amount.toFixed(1)} ${unit}`;
}

export function formatWeightValue(kilos: number, unit: 'kg' | 'lb') {
  if (!Number.isFinite(kilos) || kilos <= 0) return `0 ${unit}`;
  const amount = unit === 'lb' ? kilos * 2.20462262185 : kilos;
  return `${Math.round(amount).toLocaleString()} ${unit}`;
}

export function getDaySegment() {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

export function isRunWalkType(value: string) {
  const normalized = String(value ?? '').toLowerCase();
  return normalized.includes('run') || normalized.includes('walk');
}

export function toProgress(actual: number, target: number | null | undefined) {
  const normalizedTarget = Number(target ?? 0);
  if (!Number.isFinite(normalizedTarget) || normalizedTarget <= 0) return null;
  return clamp01(actual / normalizedTarget);
}

export function combineProgress(values: Array<number | null>, mode: 'and' | 'or' | null | undefined) {
  const activeValues = values.filter((value): value is number => typeof value === 'number');
  if (!activeValues.length) return 0;
  if (mode === 'or') return Math.max(...activeValues);
  return activeValues.reduce((sum, value) => sum + value, 0) / activeValues.length;
}

export function cardioTargetMeters(goal: GoalSnapshot | null) {
  const distance = Number(goal?.cardio_distance ?? 0);
  if (!Number.isFinite(distance) || distance <= 0) return null;
  return (goal?.cardio_distance_unit ?? 'km') === 'mi' ? distance * M_PER_MI : distance * M_PER_KM;
}

export function strengthTargetKg(goal: GoalSnapshot | null) {
  const volume = Number(goal?.strength_volume_min ?? 0);
  if (!Number.isFinite(volume) || volume <= 0) return null;
  return (goal?.strength_volume_unit ?? 'kg') === 'lb' ? volume / 2.20462262185 : volume;
}

export function friendlyDateLabel(dateIso: string) {
  const parsed = new Date(`${dateIso}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return dateIso;
  return parsed.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}
