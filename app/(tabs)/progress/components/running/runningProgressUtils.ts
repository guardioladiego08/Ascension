import type { DistanceUnit } from '@/contexts/UnitsContext';

export type RunningMetricId = 'distance' | 'pace' | 'time' | 'elevation';
export type RunningTimelineId = 'week' | 'month' | 'quarter' | 'halfYear' | 'year';

export type RunningActivity = {
  id: string;
  endedAt: string;
  durationS: number;
  distanceM: number;
  elevationM: number;
  paceKm: number | null;
  paceMi: number | null;
};

export type RunningSummary = {
  totalDistanceM: number;
  totalDurationS: number;
  totalElevationM: number;
  totalActivities: number;
  avgPaceSeconds: number | null;
};

type TimelineBucket = {
  key: string;
  label: string;
  start: Date;
  end: Date;
};

type RunningTimelineWindow = {
  rangeLabel: string;
  cadenceLabel: string;
  buckets: TimelineBucket[];
};

type RunningBucketPoint = {
  t: number;
  v: number;
};

export type RunningTimelineData = {
  summary: RunningSummary;
  rangeLabel: string;
  cadenceLabel: string;
  points: RunningBucketPoint[];
  labelsByIndex: Record<number, string>;
};

type BuildTimelineDataArgs = {
  activities: RunningActivity[];
  timelineId: RunningTimelineId;
  metricId: RunningMetricId;
  distanceUnit: DistanceUnit;
  now?: Date;
};

type MetricOption = {
  id: RunningMetricId;
  label: string;
  helperText: string;
};

type TimelineOption = {
  id: RunningTimelineId;
  label: string;
};

const M_PER_MI = 1609.344;
const M_PER_KM = 1000;
const FT_PER_M = 3.28084;

export const RUNNING_METRIC_OPTIONS: MetricOption[] = [
  {
    id: 'distance',
    label: 'Distance',
    helperText: 'Total distance covered in each period.',
  },
  {
    id: 'pace',
    label: 'Pace',
    helperText: 'Average pace by bucket. Lower is faster.',
  },
  {
    id: 'time',
    label: 'Time',
    helperText: 'Total moving time logged across the selected range.',
  },
  {
    id: 'elevation',
    label: 'Elevation',
    helperText: 'Total climb recorded in each period.',
  },
];

export const RUNNING_TIMELINE_OPTIONS: TimelineOption[] = [
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

function getDistanceUnitMeters(distanceUnit: DistanceUnit) {
  return distanceUnit === 'km' ? M_PER_KM : M_PER_MI;
}

export function formatDistanceValue(
  distanceM: number,
  distanceUnit: DistanceUnit,
  digits?: number
) {
  const divisor = getDistanceUnitMeters(distanceUnit);
  const distance = distanceM / divisor;
  const fractionDigits =
    typeof digits === 'number' ? digits : distance >= 10 ? 1 : distance >= 1 ? 2 : 2;

  return `${distance.toFixed(fractionDigits)} ${distanceUnit}`;
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

export function formatPaceValue(
  secondsPerUnit: number | null,
  distanceUnit: DistanceUnit
) {
  if (!secondsPerUnit || !Number.isFinite(secondsPerUnit) || secondsPerUnit <= 0) {
    return '—';
  }

  const minutes = Math.floor(secondsPerUnit / 60);
  const seconds = Math.round(secondsPerUnit % 60);
  const normalizedMinutes = seconds === 60 ? minutes + 1 : minutes;
  const normalizedSeconds = seconds === 60 ? 0 : seconds;

  return `${normalizedMinutes}:${String(normalizedSeconds).padStart(2, '0')} /${distanceUnit}`;
}

export function formatElevationValue(
  elevationM: number,
  distanceUnit: DistanceUnit
) {
  if (!Number.isFinite(elevationM) || elevationM <= 0) {
    return distanceUnit === 'mi' ? '0 ft' : '0 m';
  }

  if (distanceUnit === 'mi') {
    return `${Math.round(elevationM * FT_PER_M)} ft`;
  }

  return `${Math.round(elevationM)} m`;
}

export function formatChartMetricValue(
  metricId: RunningMetricId,
  value: number,
  distanceUnit: DistanceUnit
) {
  if (!Number.isFinite(value)) return '—';

  switch (metricId) {
    case 'distance':
      return `${value.toFixed(value >= 10 ? 1 : 2)} ${distanceUnit}`;
    case 'pace':
      return formatPaceValue(value, distanceUnit);
    case 'time':
      return formatDurationCompact(value);
    case 'elevation':
      return distanceUnit === 'mi'
        ? `${Math.round(value)} ft`
        : `${Math.round(value)} m`;
    default:
      return String(value);
  }
}

export function summarizeRunningActivities(
  activities: RunningActivity[],
  distanceUnit: DistanceUnit
): RunningSummary {
  const totalDistanceM = activities.reduce((sum, activity) => sum + activity.distanceM, 0);
  const totalDurationS = activities.reduce((sum, activity) => sum + activity.durationS, 0);
  const totalElevationM = activities.reduce((sum, activity) => sum + activity.elevationM, 0);

  return {
    totalDistanceM,
    totalDurationS,
    totalElevationM,
    totalActivities: activities.length,
    avgPaceSeconds:
      totalDistanceM > 0 && totalDurationS > 0
        ? totalDurationS / (totalDistanceM / getDistanceUnitMeters(distanceUnit))
        : null,
  };
}

function toDateLabel(value: Date) {
  return value.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

function buildDayBuckets(now: Date, count: number, rangeLabel: string): RunningTimelineWindow {
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

function buildWeeklyBuckets(now: Date): RunningTimelineWindow {
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

function buildMonthlyBuckets(now: Date, count: number, rangeLabel: string): RunningTimelineWindow {
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

function buildTimelineWindow(timelineId: RunningTimelineId, now: Date) {
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

function getPaceValueForBucket(
  activities: RunningActivity[],
  distanceUnit: DistanceUnit
) {
  const summary = summarizeRunningActivities(activities, distanceUnit);
  return summary.avgPaceSeconds;
}

function getMetricValueForBucket(
  metricId: RunningMetricId,
  activities: RunningActivity[],
  distanceUnit: DistanceUnit
) {
  const summary = summarizeRunningActivities(activities, distanceUnit);

  switch (metricId) {
    case 'distance':
      return summary.totalDistanceM / getDistanceUnitMeters(distanceUnit);
    case 'pace':
      return getPaceValueForBucket(activities, distanceUnit);
    case 'time':
      return summary.totalDurationS;
    case 'elevation':
      return distanceUnit === 'mi'
        ? summary.totalElevationM * FT_PER_M
        : summary.totalElevationM;
    default:
      return 0;
  }
}

export function buildRunningTimelineData({
  activities,
  timelineId,
  metricId,
  distanceUnit,
  now = new Date(),
}: BuildTimelineDataArgs): RunningTimelineData {
  const window = buildTimelineWindow(timelineId, now);
  const windowStart = window.buckets[0]?.start ?? startOfDay(now);
  const windowEnd = window.buckets[window.buckets.length - 1]?.end ?? endOfDay(now);

  const filteredActivities = activities.filter((activity) => {
    const endedAt = new Date(activity.endedAt);
    return endedAt >= windowStart && endedAt <= windowEnd;
  });

  const labelsByIndex: Record<number, string> = {};
  const points = window.buckets.reduce<RunningBucketPoint[]>((acc, bucket, index) => {
    labelsByIndex[index] = bucket.label;

    const bucketActivities = filteredActivities.filter((activity) => {
      const endedAt = new Date(activity.endedAt);
      return endedAt >= bucket.start && endedAt <= bucket.end;
    });

    const value = getMetricValueForBucket(metricId, bucketActivities, distanceUnit);
    if (metricId === 'pace' && value == null) {
      return acc;
    }

    acc.push({
      t: index,
      v: Number(value ?? 0),
    });
    return acc;
  }, []);

  return {
    summary: summarizeRunningActivities(filteredActivities, distanceUnit),
    rangeLabel: window.rangeLabel,
    cadenceLabel: window.cadenceLabel,
    points,
    labelsByIndex,
  };
}
