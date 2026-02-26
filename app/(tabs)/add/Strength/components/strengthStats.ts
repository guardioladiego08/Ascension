// lib/stats/strengthStats.ts
import { supabase } from '@/lib/supabase';

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

// Local date string YYYY-MM-DD (avoids UTC day-shift bugs)
export function toLocalISODate(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function getDeviceTimezone(): string | null {
  try {
    return Intl?.DateTimeFormat?.().resolvedOptions?.().timeZone ?? null;
  } catch {
    return null;
  }
}

export async function updateWeeklyAndLifetimeFromStrengthWorkout(opts: {
  endedAt: Date;              // when the workout ended
  durationSeconds: number;    // your session timer seconds
  totalWeightLiftedKg: number;
}) {
  const p_date = toLocalISODate(opts.endedAt);
  const p_timezone_str = getDeviceTimezone();

  const durationHours = Math.max(0, opts.durationSeconds) / 3600;

  const { error } = await supabase.schema('user').rpc('increment_strength_workout_stats', {
    p_date,
    p_timezone_str,
    p_duration_hours: durationHours,
    p_total_weight_lifted_kg: opts.totalWeightLiftedKg,
  });

  if (!error) return;

  // Backward-compatibility guard:
  // Some deployed DB functions still reference legacy columns (e.g. total_miles_biked).
  // We do not block workout save in that case; instead we log a clear message so
  // the migration can be applied server-side.
  const msg = String(error?.message ?? '').toLowerCase();
  const overloadError =
    error?.code === 'PGRST203' &&
    msg.includes('increment_strength_workout_stats');

  if (overloadError) {
    console.warn(
      '[strengthStats] Skipping stats RPC due to overloaded DB function signature conflict (PGRST203). Apply migration to drop duplicate increment/decrement_strength_workout_stats overloads.',
      error
    );
    return;
  }

  if (
    error?.code === '42703' &&
    (msg.includes('total_miles_biked') || msg.includes('lifetime_stats'))
  ) {
    console.warn(
      '[strengthStats] Skipping stats RPC due to legacy DB function. Apply migration to refresh increment/decrement_strength_workout_stats.',
      error
    );
    return;
  }

  throw error;
}
