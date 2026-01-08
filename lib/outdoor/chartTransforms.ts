// lib/outdoor/chartTransforms.ts
import type { SamplePoint } from '@/components/charts/MetricLineChart';

const M_PER_MI = 1609.344;

// Keep charts responsive. 200–400 points is usually plenty.
export function downsample<T>(arr: T[], max = 320): T[] {
  if (arr.length <= max) return arr;
  const stride = Math.ceil(arr.length / max);
  return arr.filter((_, i) => i % stride === 0 || i === arr.length - 1);
}

export type OutdoorSampleRow = {
  elapsed_s: number | null;
  ts: string;
  speed_mps: number | null;
  altitude_m: number | null;
  lat: number | null;
  lon: number | null;
};

// Pace in minutes per mile, derived from speed (m/s).
export function buildPacePoints(samples: OutdoorSampleRow[]): SamplePoint[] {
  const pts: SamplePoint[] = [];

  for (const s of samples) {
    const t = s.elapsed_s;
    const v = s.speed_mps;

    if (!Number.isFinite(t as number)) continue;
    if (!Number.isFinite(v as number)) continue;
    if ((v as number) < 0.3) continue; // avoid divide-by-zero + junk

    const secPerMi = M_PER_MI / (v as number);
    const minPerMi = secPerMi / 60;

    // clamp to avoid GPS spikes ruining the chart
    if (minPerMi < 3 || minPerMi > 25) continue;

    pts.push({ t: t as number, v: minPerMi });
  }

  return downsample(pts, 320);
}

export function buildElevationPoints(samples: OutdoorSampleRow[]): SamplePoint[] {
  const pts: SamplePoint[] = [];

  for (const s of samples) {
    const t = s.elapsed_s;
    const alt = s.altitude_m;

    if (!Number.isFinite(t as number)) continue;
    if (!Number.isFinite(alt as number)) continue;

    pts.push({ t: t as number, v: alt as number });
  }

  return downsample(pts, 320);
}

export function extractRouteCoords(samples: OutdoorSampleRow[]) {
  return samples
    .filter((s) => Number.isFinite(s.lat as number) && Number.isFinite(s.lon as number))
    .map((s) => ({ lat: s.lat as number, lon: s.lon as number }));
}
