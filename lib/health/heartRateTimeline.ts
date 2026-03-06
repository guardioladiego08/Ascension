import type { AppleHeartRateSample } from '@/lib/health/appleHealthKit';
import type { SamplePoint } from '@/components/charts/MetricLineChart';

function parseTimestampMs(input: string | null | undefined): number | null {
  if (!input || typeof input !== 'string') return null;

  const trimmed = input.trim();
  if (!trimmed) return null;

  let normalized = trimmed;
  if (normalized.includes(' ') && !normalized.includes('T')) {
    normalized = normalized.replace(' ', 'T');
  }
  normalized = normalized.replace(/([+-]\d{2})(\d{2})$/, '$1:$2');
  normalized = normalized.replace(/([+-]\d{2})$/, '$1:00');

  if (
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(normalized)
  ) {
    normalized = `${normalized}Z`;
  }

  const ms = new Date(normalized).getTime();
  return Number.isFinite(ms) ? ms : null;
}

function resolveRangeBounds(params: {
  startISO?: string | null;
  endISO?: string | null;
  anchors: number[];
}) {
  const { startISO, endISO, anchors } = params;

  const parsedStart = parseTimestampMs(startISO);
  const parsedEnd = parseTimestampMs(endISO);

  let rangeStartMs = parsedStart ?? (anchors.length > 0 ? Math.min(...anchors) : null);
  let rangeEndMs = parsedEnd ?? (anchors.length > 0 ? Math.max(...anchors) : null);

  if (rangeStartMs == null || rangeEndMs == null) return null;
  if (rangeStartMs > rangeEndMs) {
    [rangeStartMs, rangeEndMs] = [rangeEndMs, rangeStartMs];
  }

  return { rangeStartMs, rangeEndMs };
}

export function buildHeartRateTimelinePoints(params: {
  samples: AppleHeartRateSample[];
  workoutStartISO?: string | null;
  workoutEndISO?: string | null;
}): SamplePoint[] {
  const { samples, workoutStartISO, workoutEndISO } = params;
  if (!samples.length) return [];

  const anchors: Array<{ anchorMs: number; bpm: number }> = [];
  for (const sample of samples) {
    const sampleStartMs = parseTimestampMs(sample.sampleStartAt);
    const sampleEndMs = parseTimestampMs(sample.sampleEndAt);
    const anchorMs = sampleStartMs ?? sampleEndMs;
    const bpm = Number(sample.bpm);
    if (anchorMs == null || !Number.isFinite(bpm)) continue;
    anchors.push({ anchorMs, bpm });
  }

  if (!anchors.length) return [];

  const bounds = resolveRangeBounds({
    startISO: workoutStartISO,
    endISO: workoutEndISO,
    anchors: anchors.map((s) => s.anchorMs),
  });
  if (!bounds) return [];

  const { rangeStartMs, rangeEndMs } = bounds;

  return anchors
    .map((sample) => {
      const clampedMs = Math.min(Math.max(sample.anchorMs, rangeStartMs), rangeEndMs);
      return {
        t: Math.max(0, (clampedMs - rangeStartMs) / 1000),
        v: Number(sample.bpm.toFixed(2)),
      };
    })
    .filter((point) => Number.isFinite(point.t) && Number.isFinite(point.v))
    .sort((a, b) => a.t - b.t);
}
