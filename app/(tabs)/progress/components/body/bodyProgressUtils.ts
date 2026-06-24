import type { WeightUnit } from '@/contexts/UnitsContext';
import type { BodyMetricEntry } from '@/lib/biometrics/types';
import {
  computeLeanMassKg,
  formatMassFromKg,
  formatPercent,
} from '@/lib/biometrics/utils';

export type BodyMetricId = 'weight' | 'bodyFat' | 'muscle' | 'leanMass';
export type BodyTimelineId = 'week' | 'month' | 'quarter' | 'halfYear' | 'year';

export type BodyMetricSummary = {
  loggedDays: number;
  latestEntry: BodyMetricEntry | null;
  firstEntry: BodyMetricEntry | null;
};

type TimelineBucket = {
  key: string;
  label: string;
  start: Date;
  end: Date;
};

type BodyTimelineWindow = {
  rangeLabel: string;
  cadenceLabel: string;
  buckets: TimelineBucket[];
};

type BodyBucketPoint = {
  t: number;
  v: number;
};

export type BodyTimelineData = {
  entriesInRange: BodyMetricEntry[];
  summary: BodyMetricSummary;
  rangeLabel: string;
  cadenceLabel: string;
  points: BodyBucketPoint[];
  labelsByIndex: Record<number, string>;
};

type BuildTimelineDataArgs = {
  entries: BodyMetricEntry[];
  timelineId: BodyTimelineId;
  metricId: BodyMetricId;
  now?: Date;
};

type MetricOption = {
  id: BodyMetricId;
  label: string;
  helperText: string;
};

type TimelineOption = {
  id: BodyTimelineId;
  label: string;
};

export const BODY_METRIC_OPTIONS: MetricOption[] = [
  {
    id: 'weight',
    label: 'Weight',
    helperText: 'Track scale weight over the selected range.',
  },
  {
    id: 'bodyFat',
    label: 'Body Fat',
    helperText: 'Compare body-fat percentage across each bucket.',
  },
  {
    id: 'muscle',
    label: 'Muscle %',
    helperText: 'Watch muscle percentage move with each check-in.',
  },
  {
    id: 'leanMass',
    label: 'Lean Mass',
    helperText: 'Derived from weight and body-fat percentage.',
  },
];

export const BODY_TIMELINE_OPTIONS: TimelineOption[] = [
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'quarter', label: '3 Mo' },
  { id: 'halfYear', label: '6 Mo' },
  { id: 'year', label: 'Year' },
];

function startOfDay(value: Date) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfDay(value: Date) {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
}

function addDays(value: Date, amount: number) {
  const date = new Date(value);
  date.setDate(date.getDate() + amount);
  return date;
}

function startOfMonth(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), 1, 0, 0, 0, 0);
}

function endOfMonth(value: Date) {
  return new Date(value.getFullYear(), value.getMonth() + 1, 0, 23, 59, 59, 999);
}

function addMonths(value: Date, amount: number) {
  return new Date(value.getFullYear(), value.getMonth() + amount, 1, 0, 0, 0, 0);
}

function toDateLabel(value: Date) {
  return value.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

function getEntryDate(entry: BodyMetricEntry) {
  return new Date(`${entry.loggedForDate}T12:00:00`);
}

function getMetricValueFromEntry(metricId: BodyMetricId, entry: BodyMetricEntry) {
  switch (metricId) {
    case 'weight':
      return entry.weightKg;
    case 'bodyFat':
      return entry.bodyFatPct;
    case 'muscle':
      return entry.musclePct;
    case 'leanMass':
      return computeLeanMassKg(entry.weightKg, entry.bodyFatPct);
    default:
      return null;
  }
}

export function summarizeBodyMetricEntries(entries: BodyMetricEntry[]): BodyMetricSummary {
  return {
    loggedDays: entries.length,
    latestEntry: entries.length ? entries[entries.length - 1] : null,
    firstEntry: entries.length ? entries[0] : null,
  };
}

function buildDayBuckets(now: Date, count: number, rangeLabel: string): BodyTimelineWindow {
  const start = startOfDay(addDays(now, -(count - 1)));
  const buckets = Array.from({ length: count }, (_, index) => {
    const dayStart = startOfDay(addDays(start, index));
    const dayEnd = endOfDay(dayStart);

    return {
      key: dayStart.toISOString(),
      label:
        count <= 7
          ? dayStart.toLocaleDateString(undefined, { weekday: 'short' })
          : dayStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      start: dayStart,
      end: dayEnd,
    };
  });

  return {
    rangeLabel,
    cadenceLabel: 'Daily rollup',
    buckets,
  };
}

function buildWeeklyBuckets(now: Date): BodyTimelineWindow {
  const count = 13;
  const start = startOfDay(addDays(now, -(count * 7 - 1)));
  const buckets = Array.from({ length: count }, (_, index) => {
    const bucketStart = startOfDay(addDays(start, index * 7));
    const bucketEnd = endOfDay(addDays(bucketStart, 6));

    return {
      key: bucketStart.toISOString(),
      label: toDateLabel(bucketStart),
      start: bucketStart,
      end: bucketEnd,
    };
  });

  return {
    rangeLabel: 'Past 13 weeks',
    cadenceLabel: 'Weekly rollup',
    buckets,
  };
}

function buildMonthlyBuckets(now: Date, count: number, rangeLabel: string): BodyTimelineWindow {
  const currentMonth = startOfMonth(now);
  const firstMonth = addMonths(currentMonth, -(count - 1));
  const buckets = Array.from({ length: count }, (_, index) => {
    const monthStart = addMonths(firstMonth, index);
    const monthEnd = endOfMonth(monthStart);

    return {
      key: monthStart.toISOString(),
      label: monthStart.toLocaleDateString(undefined, { month: 'short' }),
      start: monthStart,
      end: monthEnd,
    };
  });

  return {
    rangeLabel,
    cadenceLabel: 'Monthly rollup',
    buckets,
  };
}

function buildTimelineWindow(timelineId: BodyTimelineId, now: Date) {
  switch (timelineId) {
    case 'week':
      return buildDayBuckets(now, 7, 'Past 7 days');
    case 'month':
      return buildDayBuckets(now, 30, 'Past 30 days');
    case 'quarter':
      return buildWeeklyBuckets(now);
    case 'halfYear':
      return buildMonthlyBuckets(now, 6, 'Past 6 months');
    case 'year':
      return buildMonthlyBuckets(now, 12, 'Past 12 months');
    default:
      return buildDayBuckets(now, 7, 'Past 7 days');
  }
}

export function buildBodyTimelineData({
  entries,
  timelineId,
  metricId,
  now = new Date(),
}: BuildTimelineDataArgs): BodyTimelineData {
  const window = buildTimelineWindow(timelineId, now);
  const windowStart = window.buckets[0]?.start ?? startOfDay(now);
  const windowEnd = window.buckets[window.buckets.length - 1]?.end ?? endOfDay(now);

  const entriesInRange = entries.filter((entry) => {
    const timestamp = getEntryDate(entry);
    return timestamp >= windowStart && timestamp <= windowEnd;
  });

  const labelsByIndex: Record<number, string> = {};
  const points = window.buckets.reduce<BodyBucketPoint[]>((acc, bucket, index) => {
    labelsByIndex[index] = bucket.label;

    const bucketEntries = entriesInRange.filter((entry) => {
      const timestamp = getEntryDate(entry);
      return timestamp >= bucket.start && timestamp <= bucket.end;
    });

    if (!bucketEntries.length) {
      return acc;
    }

    const latestBucketEntry = bucketEntries[bucketEntries.length - 1];
    const value = getMetricValueFromEntry(metricId, latestBucketEntry);
    if (value == null || !Number.isFinite(value)) {
      return acc;
    }

    acc.push({
      t: index,
      v: Number(value),
    });
    return acc;
  }, []);

  return {
    entriesInRange,
    summary: summarizeBodyMetricEntries(entriesInRange),
    rangeLabel: window.rangeLabel,
    cadenceLabel: window.cadenceLabel,
    points,
    labelsByIndex,
  };
}

export function getBodyMetricDelta(metricId: BodyMetricId, entries: BodyMetricEntry[]) {
  const values = entries
    .map((entry) => getMetricValueFromEntry(metricId, entry))
    .filter((value): value is number => value != null && Number.isFinite(value));

  if (values.length < 2) return null;
  return values[values.length - 1] - values[0];
}

export function formatBodyMetricValue(
  metricId: BodyMetricId,
  value: number | null | undefined,
  weightUnit: WeightUnit
) {
  switch (metricId) {
    case 'weight':
    case 'leanMass':
      return formatMassFromKg(value, weightUnit, 1);
    case 'bodyFat':
    case 'muscle':
      return formatPercent(value, 1);
    default:
      return '—';
  }
}

export function formatBodyChartMetricValue(
  metricId: BodyMetricId,
  value: number,
  weightUnit: WeightUnit
) {
  if (!Number.isFinite(value)) return '—';

  switch (metricId) {
    case 'weight':
    case 'leanMass':
      return formatMassFromKg(value, weightUnit, 1);
    case 'bodyFat':
    case 'muscle':
      return formatPercent(value, 1);
    default:
      return String(value);
  }
}

export function formatSignedBodyMetricDelta(
  metricId: BodyMetricId,
  value: number | null,
  weightUnit: WeightUnit
) {
  if (value == null || !Number.isFinite(value) || value === 0) {
    return null;
  }

  const sign = value > 0 ? '+' : '';
  switch (metricId) {
    case 'weight':
    case 'leanMass':
      return `${sign}${formatMassFromKg(value, weightUnit, 1, '0.0')}`;
    case 'bodyFat':
    case 'muscle':
      return `${sign}${formatPercent(value, 1, '0.0%')}`;
    default:
      return null;
  }
}
