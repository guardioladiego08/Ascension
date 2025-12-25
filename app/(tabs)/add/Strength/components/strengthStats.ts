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

  if (error) throw error;
}
