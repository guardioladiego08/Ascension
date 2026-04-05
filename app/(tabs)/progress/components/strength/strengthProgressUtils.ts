import type { WeightUnit } from '@/contexts/UnitsContext';

export type StrengthMetricId = 'volume' | 'time' | 'sessions' | 'avgVolume';
export type StrengthTimelineId = 'week' | 'month' | 'quarter' | 'halfYear' | 'year';

export type StrengthActivity = {
  id: string;
  startedAt: string;
  endedAt: string | null;
  totalVolumeKg: number;
  durationS: number;
};

export type StrengthSummary = {
  totalVolumeKg: number;
  totalDurationS: number;
  totalSessions: number;
  avgVolumeKgPerSession: number;
};

type TimelineBucket = {
  key: string;
  label: string;
  start: Date;
  end: Date;
};

type StrengthTimelineWindow = {
  rangeLabel: string;
  cadenceLabel: string;
  buckets: TimelineBucket[];
};

type StrengthBucketPoint = {
  t: number;
  v: number;
};

export type StrengthTimelineData = {
  summary: StrengthSummary;
  rangeLabel: string;
  cadenceLabel: string;
  points: StrengthBucketPoint[];
  labelsByIndex: Record<number, string>;
};

type BuildTimelineDataArgs = {
  activities: StrengthActivity[];
  timelineId: StrengthTimelineId;
  metricId: StrengthMetricId;
  now?: Date;
};

type MetricOption = {
  id: StrengthMetricId;
  label: string;
  helperText: string;
};

type TimelineOption = {
  id: StrengthTimelineId;
  label: string;
};

const LB_PER_KG = 2.20462262185;

export const STRENGTH_METRIC_OPTIONS: MetricOption[] = [
  {
    id: 'volume',
    label: 'Weight',
    helperText: 'Total weight lifted across each period.',
  },
  {
    id: 'time',
    label: 'Time',
    helperText: 'Total session time logged in each period.',
  },
  {
    id: 'sessions',
    label: 'Sessions',
    helperText: 'Completed strength workouts per period.',
  },
  {
    id: 'avgVolume',
    label: 'Avg / Session',
    helperText: 'Average total volume per completed session.',
  },
];

export const STRENGTH_TIMELINE_OPTIONS: TimelineOption[] = [
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

export function formatMassFromKg(valueKg: number, weightUnit: WeightUnit, digits = 0) {
  const converted = weightUnit === 'lb' ? valueKg * LB_PER_KG : valueKg;
  return `${converted.toFixed(digits)} ${weightUnit}`;
}

export function formatDurationCompact(totalSeconds: number) {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return '0m';
  if (totalSeconds >= 3600) {
    return `${(totalSeconds / 3600).toFixed(totalSeconds >= 36_000 ? 0 : 1)}h`;
  }
  return `${Math.round(totalSeconds / 60)}m`;
}

export function formatDurationDetailed(totalSeconds: number) {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return '0m';

  const roundedMinutes = Math.round(totalSeconds / 60);
  const hours = Math.floor(roundedMinutes / 60);
  const minutes = roundedMinutes % 60;

  if (hours <= 0) {
    return `${Math.max(1, minutes)}m`;
  }

  if (minutes <= 0) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}m`;
}

export function summarizeStrengthActivities(
  activities: StrengthActivity[]
): StrengthSummary {
  const totalVolumeKg = activities.reduce((sum, activity) => sum + activity.totalVolumeKg, 0);
  const totalDurationS = activities.reduce((sum, activity) => sum + activity.durationS, 0);
  const totalSessions = activities.length;

  return {
    totalVolumeKg,
    totalDurationS,
    totalSessions,
    avgVolumeKgPerSession: totalSessions > 0 ? totalVolumeKg / totalSessions : 0,
  };
}

function buildDayBuckets(now: Date, count: number, rangeLabel: string): StrengthTimelineWindow {
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

function buildWeeklyBuckets(now: Date): StrengthTimelineWindow {
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

function buildMonthlyBuckets(now: Date, count: number, rangeLabel: string): StrengthTimelineWindow {
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

function buildTimelineWindow(timelineId: StrengthTimelineId, now: Date) {
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

function getMetricValueForBucket(metricId: StrengthMetricId, activities: StrengthActivity[]) {
  const summary = summarizeStrengthActivities(activities);

  switch (metricId) {
    case 'volume':
      return summary.totalVolumeKg;
    case 'time':
      return summary.totalDurationS;
    case 'sessions':
      return summary.totalSessions;
    case 'avgVolume':
      return summary.avgVolumeKgPerSession;
    default:
      return 0;
  }
}

export function buildStrengthTimelineData({
  activities,
  timelineId,
  metricId,
  now = new Date(),
}: BuildTimelineDataArgs): StrengthTimelineData {
  const window = buildTimelineWindow(timelineId, now);
  const windowStart = window.buckets[0]?.start ?? startOfDay(now);
  const windowEnd = window.buckets[window.buckets.length - 1]?.end ?? endOfDay(now);

  const filteredActivities = activities.filter((activity) => {
    const timestamp = new Date(activity.endedAt ?? activity.startedAt);
    return timestamp >= windowStart && timestamp <= windowEnd;
  });

  const labelsByIndex: Record<number, string> = {};
  const points = window.buckets.map((bucket, index) => {
    labelsByIndex[index] = bucket.label;

    const bucketActivities = filteredActivities.filter((activity) => {
      const timestamp = new Date(activity.endedAt ?? activity.startedAt);
      return timestamp >= bucket.start && timestamp <= bucket.end;
    });

    return {
      t: index,
      v: Number(getMetricValueForBucket(metricId, bucketActivities)),
    };
  });

  return {
    summary: summarizeStrengthActivities(filteredActivities),
    rangeLabel: window.rangeLabel,
    cadenceLabel: window.cadenceLabel,
    points,
    labelsByIndex,
  };
}

export function formatChartMetricValue(
  metricId: StrengthMetricId,
  value: number,
  weightUnit: WeightUnit
) {
  if (!Number.isFinite(value)) return '—';

  switch (metricId) {
    case 'volume':
    case 'avgVolume':
      return formatMassFromKg(value, weightUnit, value >= 1000 ? 0 : 1);
    case 'time':
      return formatDurationCompact(value);
    case 'sessions':
      return `${Math.round(value)}`;
    default:
      return String(value);
  }
}
