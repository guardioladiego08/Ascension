import type { Split } from './types';

const R = 6371000; // meters

export function haversineM(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function paceSecPerKmFromSpeed(speedMps: number | null | undefined) {
  if (!speedMps || speedMps <= 0.01) return null;
  return 1000 / speedMps;
}

export function formatDuration(totalS: number) {
  const s = Math.max(0, Math.floor(totalS));
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;

  if (hh > 0) return `${hh}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
  return `${mm}:${String(ss).padStart(2, '0')}`;
}

export function formatDistance(distanceM: number, unit: 'mi' | 'km' = 'mi') {
  if (unit === 'km') return `${(distanceM / 1000).toFixed(2)} km`;
  const mi = distanceM / 1609.344;
  return `${mi.toFixed(2)} mi`;
}

export function formatPace(paceSecPerKm: number | null, unit: 'mi' | 'km' = 'mi') {
  if (!paceSecPerKm) return '—';
  const paceSec = unit === 'km' ? paceSecPerKm : paceSecPerKm * 1.609344;
  const mm = Math.floor(paceSec / 60);
  const ss = Math.floor(paceSec % 60);
  return `${mm}:${String(ss).padStart(2, '0')} /${unit}`;
}

/**
 * Auto-splits every 1km (Strava-like). Returns updated splits.
 */
export function updateAutoKmSplits(args: {
  splits: Split[];
  prevDistanceM: number;
  nextDistanceM: number;
  prevElapsedS: number;
  nextElapsedS: number;
}): Split[] {
  const { splits, prevDistanceM, nextDistanceM, prevElapsedS, nextElapsedS } = args;

  const prevKm = Math.floor(prevDistanceM / 1000);
  const nextKm = Math.floor(nextDistanceM / 1000);

  if (nextKm <= prevKm) return splits;

  // finalize one split per km crossed (handles jumping over km boundaries)
  let out = [...splits];
  for (let km = prevKm + 1; km <= nextKm; km++) {
    const endDistance = km * 1000;
    const idx = out.filter(s => s.kind === 'auto_km').length + 1;

    // approximate end time by proportional distance inside this segment
    const segmentDistance = nextDistanceM - prevDistanceM;
    const segmentTime = nextElapsedS - prevElapsedS;
    const portion = segmentDistance > 0 ? (endDistance - prevDistanceM) / segmentDistance : 1;
    const endElapsed = prevElapsedS + Math.max(0, Math.min(1, portion)) * segmentTime;

    const start = out.length === 0
      ? 0
      : out[out.length - 1].end_elapsed_s;

    const duration = Math.max(1, Math.round(endElapsed - start));
    const avgPace = duration > 0 ? (1000 * duration) / 1000 : null; // 1km segment => sec/km = duration

    out.push({
      index: idx,
      distance_m: 1000,
      duration_s: duration,
      avg_pace_s_per_km: avgPace,
      start_elapsed_s: Math.round(start),
      end_elapsed_s: Math.round(endElapsed),
      kind: 'auto_km',
    });
  }

  return out;
}