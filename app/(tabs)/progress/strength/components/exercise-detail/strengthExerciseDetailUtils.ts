import type { SamplePoint } from '@/components/charts/MetricLineChart';
import type { WeightUnit } from '@/contexts/UnitsContext';
import type { UnitMass } from '@/lib/strength/types';

export type StrengthExerciseSetRow = {
  id: string;
  exercise_id: string;
  strength_workout_id: string;
  set_index: number | null;
  set_type: string | null;
  weight: number | null;
  weight_unit_csv: UnitMass | null;
  reps: number | null;
  est_1rm: number | null;
  rpe: number | null;
  notes: string | null;
  performed_at: string | null;
};

export type StrengthExerciseSummaryRow = {
  strength_workout_id: string;
  vol: number | null;
  strongest_set: number | null;
  best_est_1rm: number | null;
  avg_set: number | null;
  created_at: string | null;
};

export type StrengthExerciseWorkoutRow = {
  id: string;
  started_at: string | null;
  ended_at: string | null;
  total_vol: number | null;
  name: string | null;
};

export type ExerciseDetailTabId = 'overview' | 'history' | 'trends';
export type ExerciseHistorySortId =
  | 'recent'
  | 'oldest'
  | 'volume'
  | 'oneRm'
  | 'heaviest'
  | 'reps';
export type ExerciseTrendRangeId = 'month' | 'quarter' | 'halfYear' | 'year' | 'all';
export type ExerciseTrendMetricId =
  | 'oneRm'
  | 'volume'
  | 'strongestSet'
  | 'avgSet'
  | 'totalReps'
  | 'setCount'
  | 'duration';

export type ExerciseSetRecord = {
  id: string;
  workoutId: string;
  setIndex: number;
  setType: string;
  timestampMs: number;
  timestampSeconds: number;
  performedAt: string | null;
  dateLabel: string;
  dateTimeLabel: string;
  rawWeight: number | null;
  rawWeightUnit: UnitMass | null;
  weightKg: number;
  reps: number;
  est1RmKg: number;
  volumeKg: number;
  sessionVolumeKg: number;
  sessionBest1RmKg: number;
  notes: string | null;
};

export type ExerciseSessionRecord = {
  workoutId: string;
  timestampMs: number;
  timestampSeconds: number;
  occurredAt: string | null;
  dateLabel: string;
  dateLongLabel: string;
  volumeKg: number;
  bestEst1RmKg: number;
  strongestSetKg: number;
  avgSetKg: number;
  totalReps: number;
  setCount: number;
  avgRepsPerSet: number;
  durationSeconds: number;
};

export type ExerciseRepRecord = {
  reps: number;
  set: ExerciseSetRecord;
};

export type StrengthExerciseDetailModel = {
  sessions: ExerciseSessionRecord[];
  sets: ExerciseSetRecord[];
  repRecords: ExerciseRepRecord[];
  metrics: {
    totalSessions: number;
    totalSets: number;
    totalReps: number;
    totalVolumeKg: number;
    avgVolumeKgPerSession: number;
    avgRepsPerSet: number;
    avgSetWeightKg: number;
    totalDurationSeconds: number;
  };
  records: {
    oneRepMax: ExerciseSetRecord | null;
    bestSet: ExerciseSetRecord | null;
    strongestSet: ExerciseSetRecord | null;
    maxVolumeSession: ExerciseSessionRecord | null;
  };
  firstLoggedAt: string | null;
  lastLoggedAt: string | null;
  firstSession: ExerciseSessionRecord | null;
  latestSession: ExerciseSessionRecord | null;
  progressDelta: {
    oneRmKg: number;
    volumeKg: number;
  };
};

type ExerciseTrendMetricDefinition = {
  id: ExerciseTrendMetricId;
  label: string;
  subtitle: string;
  valueType: 'mass' | 'count' | 'duration';
};

const LB_PER_KG = 2.20462262185;
const KG_PER_LB = 0.45359237;

export const EXERCISE_DETAIL_TABS: Array<{ id: ExerciseDetailTabId; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'history', label: 'History' },
  { id: 'trends', label: 'Trends' },
];

export const EXERCISE_HISTORY_SORT_OPTIONS: Array<{
  id: ExerciseHistorySortId;
  label: string;
}> = [
  { id: 'recent', label: 'Recent' },
  { id: 'oldest', label: 'Oldest' },
  { id: 'volume', label: 'Max Vol' },
  { id: 'oneRm', label: '1RM' },
  { id: 'heaviest', label: 'Weight' },
  { id: 'reps', label: 'Reps' },
];

export const EXERCISE_TREND_RANGE_OPTIONS: Array<{
  id: ExerciseTrendRangeId;
  label: string;
}> = [
  { id: 'month', label: 'Month' },
  { id: 'quarter', label: '3 Mo' },
  { id: 'halfYear', label: '6 Mo' },
  { id: 'year', label: 'Year' },
  { id: 'all', label: 'All' },
];

export const EXERCISE_TREND_METRICS: ExerciseTrendMetricDefinition[] = [
  {
    id: 'oneRm',
    label: 'Best Est. 1RM',
    subtitle: 'Projected top single based on your best logged set each workout.',
    valueType: 'mass',
  },
  {
    id: 'volume',
    label: 'Session Volume',
    subtitle: 'Total exercise volume completed in each workout.',
    valueType: 'mass',
  },
  {
    id: 'strongestSet',
    label: 'Strongest Set',
    subtitle: 'Heaviest single set weight logged each workout.',
    valueType: 'mass',
  },
  {
    id: 'avgSet',
    label: 'Avg Set Weight',
    subtitle: 'Average load used across the sets in each workout.',
    valueType: 'mass',
  },
  {
    id: 'totalReps',
    label: 'Total Reps',
    subtitle: 'Repetition count completed for this exercise each workout.',
    valueType: 'count',
  },
  {
    id: 'setCount',
    label: 'Set Count',
    subtitle: 'Number of logged sets for this exercise per workout.',
    valueType: 'count',
  },
  {
    id: 'duration',
    label: 'Workout Time',
    subtitle: 'Completed workout duration when both start and end times are available.',
    valueType: 'duration',
  },
];

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function toDate(value: string | null | undefined) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDate(value: string | null | undefined, options: Intl.DateTimeFormatOptions) {
  const parsed = toDate(value);
  if (!parsed) return 'Unknown';
  return parsed.toLocaleDateString(undefined, options);
}

function formatDateTime(value: string | null | undefined) {
  const parsed = toDate(value);
  if (!parsed) return 'Unknown';
  return parsed.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function pickTimestamp(
  performedAt: string | null,
  workout: StrengthExerciseWorkoutRow | undefined
) {
  return performedAt ?? workout?.ended_at ?? workout?.started_at ?? null;
}

function resolveSetIndex(value: number | null) {
  if (isFiniteNumber(value)) {
    return Math.max(1, Math.round(value));
  }
  return 1;
}

function formatSetType(value: string | null) {
  if (!value) return 'normal';
  return value.replace(/_/g, ' ');
}

function roundTo(value: number, digits: number) {
  const multiplier = 10 ** digits;
  return Math.round(value * multiplier) / multiplier;
}

export function convertSetWeightToKg(
  weight: number | null | undefined,
  unit: UnitMass | null | undefined
) {
  if (!isFiniteNumber(weight)) return 0;
  return unit === 'lb' ? weight * KG_PER_LB : weight;
}

export function formatMassFromKg(
  valueKg: number | null | undefined,
  weightUnit: WeightUnit,
  digits = 0,
  fallback = '—'
) {
  if (!isFiniteNumber(valueKg) || valueKg <= 0) return fallback;

  const converted = weightUnit === 'lb' ? valueKg * LB_PER_KG : valueKg;
  return `${converted.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })} ${weightUnit}`;
}

export function formatSetWeight(
  rawWeight: number | null | undefined,
  rawUnit: UnitMass | null | undefined,
  viewerUnit: WeightUnit
) {
  if (!isFiniteNumber(rawWeight)) return '—';

  if (rawUnit === viewerUnit || !rawUnit) {
    return `${rawWeight.toLocaleString(undefined, {
      minimumFractionDigits: viewerUnit === 'kg' ? 1 : 0,
      maximumFractionDigits: viewerUnit === 'kg' ? 1 : 0,
    })} ${viewerUnit}`;
  }

  const weightKg = convertSetWeightToKg(rawWeight, rawUnit);
  return formatMassFromKg(weightKg, viewerUnit, viewerUnit === 'kg' ? 1 : 0);
}

export function formatSetPerformance(
  set: Pick<ExerciseSetRecord, 'rawWeight' | 'rawWeightUnit' | 'reps'> | null,
  viewerUnit: WeightUnit
) {
  if (!set) return '—';

  const weightLabel = formatSetWeight(set.rawWeight, set.rawWeightUnit, viewerUnit);
  if (weightLabel === '—') return '—';
  if (!set.reps) return weightLabel;
  return `${weightLabel} x${set.reps}`;
}

export function formatDurationDetailed(totalSeconds: number) {
  if (!isFiniteNumber(totalSeconds) || totalSeconds <= 0) return '—';

  const roundedMinutes = Math.round(totalSeconds / 60);
  const hours = Math.floor(roundedMinutes / 60);
  const minutes = roundedMinutes % 60;

  if (hours <= 0) return `${Math.max(1, minutes)}m`;
  if (minutes <= 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

export function formatDurationCompact(totalSeconds: number) {
  if (!isFiniteNumber(totalSeconds) || totalSeconds <= 0) return '—';
  if (totalSeconds >= 3600) {
    return `${(totalSeconds / 3600).toFixed(totalSeconds >= 36000 ? 0 : 1)}h`;
  }
  return `${Math.round(totalSeconds / 60)}m`;
}

function chooseMaxRecord<T>(items: T[], score: (item: T) => number) {
  return items.reduce<T | null>((best, item) => {
    if (!best) return item;
    return score(item) > score(best) ? item : best;
  }, null);
}

function sumPositive(items: number[]) {
  return items.reduce((sum, value) => sum + (isFiniteNumber(value) ? value : 0), 0);
}

export function buildStrengthExerciseDetailModel(args: {
  summaries: StrengthExerciseSummaryRow[];
  sets: StrengthExerciseSetRow[];
  workouts: StrengthExerciseWorkoutRow[];
}): StrengthExerciseDetailModel {
  const { summaries, sets, workouts } = args;
  const workoutsById = new Map(workouts.map((workout) => [workout.id, workout]));
  const summaryByWorkoutId = new Map(
    summaries.map((summary) => [summary.strength_workout_id, summary])
  );

  const setRecords = sets
    .map<ExerciseSetRecord | null>((set) => {
      const workout = workoutsById.get(set.strength_workout_id);
      const timestampSource = pickTimestamp(set.performed_at, workout);
      const parsedTimestamp = toDate(timestampSource);
      if (!parsedTimestamp) return null;

      const weightKg = roundTo(convertSetWeightToKg(set.weight, set.weight_unit_csv), 3);
      const reps = isFiniteNumber(set.reps) ? Math.max(0, Math.round(set.reps)) : 0;
      const est1RmKg = roundTo(
        isFiniteNumber(set.est_1rm)
          ? set.est_1rm
          : weightKg > 0 && reps > 0
            ? weightKg * (1 + reps / 30)
            : 0,
        3
      );
      const volumeKg = roundTo(weightKg * reps, 2);
      const workoutSummary = summaryByWorkoutId.get(set.strength_workout_id);

      return {
        id: set.id,
        workoutId: set.strength_workout_id,
        setIndex: resolveSetIndex(set.set_index),
        setType: formatSetType(set.set_type),
        timestampMs: parsedTimestamp.getTime(),
        timestampSeconds: Math.round(parsedTimestamp.getTime() / 1000),
        performedAt: timestampSource,
        dateLabel: formatDate(timestampSource, { month: 'short', day: 'numeric' }),
        dateTimeLabel: formatDateTime(timestampSource),
        rawWeight: set.weight,
        rawWeightUnit: set.weight_unit_csv,
        weightKg,
        reps,
        est1RmKg,
        volumeKg,
        sessionVolumeKg: Number(workoutSummary?.vol ?? 0),
        sessionBest1RmKg: Number(workoutSummary?.best_est_1rm ?? 0),
        notes: set.notes,
      };
    })
    .filter((record): record is ExerciseSetRecord => record != null)
    .sort((left, right) => left.timestampMs - right.timestampMs);

  const setsByWorkoutId = new Map<string, ExerciseSetRecord[]>();
  for (const set of setRecords) {
    const grouped = setsByWorkoutId.get(set.workoutId) ?? [];
    grouped.push(set);
    setsByWorkoutId.set(set.workoutId, grouped);
  }

  const workoutIds = Array.from(
    new Set([
      ...summaries.map((summary) => summary.strength_workout_id),
      ...setRecords.map((set) => set.workoutId),
    ])
  );

  const sessions = workoutIds
    .map<ExerciseSessionRecord | null>((workoutId) => {
      const workout = workoutsById.get(workoutId);
      const workoutSets = setsByWorkoutId.get(workoutId) ?? [];
      const summary = summaryByWorkoutId.get(workoutId);
      const timestampSource =
        workout?.ended_at ??
        workout?.started_at ??
        workoutSets[workoutSets.length - 1]?.performedAt ??
        summary?.created_at ??
        null;
      const parsedTimestamp = toDate(timestampSource);
      if (!parsedTimestamp) return null;

      const totalReps = sumPositive(workoutSets.map((set) => set.reps));
      const setCount = workoutSets.length;
      const weightValues = workoutSets
        .map((set) => set.weightKg)
        .filter((value) => value > 0);

      const startedAt = toDate(workout?.started_at);
      const endedAt = toDate(workout?.ended_at);
      const durationSeconds =
        startedAt && endedAt && endedAt > startedAt
          ? Math.round((endedAt.getTime() - startedAt.getTime()) / 1000)
          : 0;

      return {
        workoutId,
        timestampMs: parsedTimestamp.getTime(),
        timestampSeconds: Math.round(parsedTimestamp.getTime() / 1000),
        occurredAt: timestampSource,
        dateLabel: formatDate(timestampSource, { month: 'short', day: 'numeric' }),
        dateLongLabel: formatDate(timestampSource, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
        volumeKg: roundTo(
          Number(summary?.vol ?? sumPositive(workoutSets.map((set) => set.volumeKg))),
          2
        ),
        bestEst1RmKg: roundTo(
          Number(summary?.best_est_1rm ?? chooseMaxRecord(workoutSets, (set) => set.est1RmKg)?.est1RmKg ?? 0),
          3
        ),
        strongestSetKg: roundTo(
          Number(summary?.strongest_set ?? chooseMaxRecord(workoutSets, (set) => set.weightKg)?.weightKg ?? 0),
          3
        ),
        avgSetKg: roundTo(
          Number(
            summary?.avg_set ??
              (weightValues.length > 0 ? sumPositive(weightValues) / weightValues.length : 0)
          ),
          3
        ),
        totalReps,
        setCount,
        avgRepsPerSet: setCount > 0 ? totalReps / setCount : 0,
        durationSeconds,
      };
    })
    .filter((record): record is ExerciseSessionRecord => record != null)
    .sort((left, right) => left.timestampMs - right.timestampMs);

  const totalSessions = sessions.length;
  const totalSets = setRecords.length;
  const totalReps = sumPositive(setRecords.map((set) => set.reps));
  const totalVolumeKg = roundTo(sumPositive(sessions.map((session) => session.volumeKg)), 2);
  const totalDurationSeconds = sumPositive(sessions.map((session) => session.durationSeconds));
  const avgVolumeKgPerSession = totalSessions > 0 ? totalVolumeKg / totalSessions : 0;
  const avgRepsPerSet = totalSets > 0 ? totalReps / totalSets : 0;
  const avgSetWeightKg =
    totalSets > 0 ? sumPositive(setRecords.map((set) => set.weightKg)) / totalSets : 0;

  const repRecords = Array.from(
    setRecords.reduce((map, set) => {
      if (set.reps <= 0) return map;
      const current = map.get(set.reps);
      if (
        !current ||
        set.weightKg > current.weightKg ||
        (set.weightKg === current.weightKg && set.est1RmKg > current.est1RmKg) ||
        (set.weightKg === current.weightKg &&
          set.est1RmKg === current.est1RmKg &&
          set.timestampMs > current.timestampMs)
      ) {
        map.set(set.reps, set);
      }
      return map;
    }, new Map<number, ExerciseSetRecord>())
  )
    .sort((left, right) => left[0] - right[0])
    .slice(0, 10)
    .map(([reps, set]) => ({ reps, set }));

  const firstSession = sessions[0] ?? null;
  const latestSession = sessions[sessions.length - 1] ?? null;

  return {
    sessions,
    sets: setRecords,
    repRecords,
    metrics: {
      totalSessions,
      totalSets,
      totalReps,
      totalVolumeKg,
      avgVolumeKgPerSession,
      avgRepsPerSet,
      avgSetWeightKg,
      totalDurationSeconds,
    },
    records: {
      oneRepMax: chooseMaxRecord(setRecords, (set) => set.est1RmKg),
      bestSet: chooseMaxRecord(setRecords, (set) => set.volumeKg),
      strongestSet: chooseMaxRecord(setRecords, (set) => set.weightKg),
      maxVolumeSession: chooseMaxRecord(sessions, (session) => session.volumeKg),
    },
    firstLoggedAt: firstSession?.occurredAt ?? null,
    lastLoggedAt: latestSession?.occurredAt ?? null,
    firstSession,
    latestSession,
    progressDelta: {
      oneRmKg:
        latestSession && firstSession
          ? roundTo(latestSession.bestEst1RmKg - firstSession.bestEst1RmKg, 2)
          : 0,
      volumeKg:
        latestSession && firstSession
          ? roundTo(latestSession.volumeKg - firstSession.volumeKg, 2)
          : 0,
    },
  };
}

export function sortExerciseHistory(
  sets: ExerciseSetRecord[],
  sortId: ExerciseHistorySortId
) {
  const sorted = [...sets];

  sorted.sort((left, right) => {
    switch (sortId) {
      case 'oldest':
        return left.timestampMs - right.timestampMs;
      case 'volume':
        return (
          right.volumeKg - left.volumeKg ||
          right.est1RmKg - left.est1RmKg ||
          right.timestampMs - left.timestampMs
        );
      case 'oneRm':
        return (
          right.est1RmKg - left.est1RmKg ||
          right.weightKg - left.weightKg ||
          right.timestampMs - left.timestampMs
        );
      case 'heaviest':
        return (
          right.weightKg - left.weightKg ||
          right.reps - left.reps ||
          right.timestampMs - left.timestampMs
        );
      case 'reps':
        return (
          right.reps - left.reps ||
          right.weightKg - left.weightKg ||
          right.timestampMs - left.timestampMs
        );
      case 'recent':
      default:
        return right.timestampMs - left.timestampMs;
    }
  });

  return sorted;
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, date.getDate());
}

export function filterExerciseSessionsByRange(
  sessions: ExerciseSessionRecord[],
  rangeId: ExerciseTrendRangeId,
  now = new Date()
) {
  if (rangeId === 'all') {
    return sessions;
  }

  const rangeStart =
    rangeId === 'month'
      ? startOfDay(addDays(now, -29))
      : rangeId === 'quarter'
        ? startOfDay(addDays(now, -89))
        : rangeId === 'halfYear'
          ? startOfDay(addMonths(now, -6))
          : startOfDay(addMonths(now, -12));

  return sessions.filter((session) => {
    const occurredAt = new Date(session.timestampMs);
    return occurredAt >= rangeStart && occurredAt <= now;
  });
}

export function shouldShowTrendMetric(
  metricId: ExerciseTrendMetricId,
  sessions: ExerciseSessionRecord[]
) {
  if (metricId !== 'duration') return true;
  return sessions.some((session) => session.durationSeconds > 0);
}

export function getExerciseTrendMetricDefinition(metricId: ExerciseTrendMetricId) {
  return EXERCISE_TREND_METRICS.find((metric) => metric.id === metricId) ?? null;
}

export function getExerciseTrendMetricValue(
  metricId: ExerciseTrendMetricId,
  session: ExerciseSessionRecord
) {
  switch (metricId) {
    case 'oneRm':
      return session.bestEst1RmKg;
    case 'volume':
      return session.volumeKg;
    case 'strongestSet':
      return session.strongestSetKg;
    case 'avgSet':
      return session.avgSetKg;
    case 'totalReps':
      return session.totalReps;
    case 'setCount':
      return session.setCount;
    case 'duration':
      return session.durationSeconds;
    default:
      return 0;
  }
}

export function buildExerciseTrendPoints(
  metricId: ExerciseTrendMetricId,
  sessions: ExerciseSessionRecord[]
): SamplePoint[] {
  return sessions.map((session) => ({
    t: session.timestampSeconds,
    v: getExerciseTrendMetricValue(metricId, session),
  }));
}

export function formatExerciseTrendValue(
  metricId: ExerciseTrendMetricId,
  value: number,
  weightUnit: WeightUnit
) {
  const definition = getExerciseTrendMetricDefinition(metricId);
  if (!definition || !Number.isFinite(value)) return '—';

  switch (definition.valueType) {
    case 'mass':
      return formatMassFromKg(value, weightUnit, value >= 1000 ? 0 : 1);
    case 'duration':
      return formatDurationCompact(value);
    case 'count':
    default:
      return `${Math.round(value)}`;
  }
}

export function describeExerciseTrendSnapshot(
  metricId: ExerciseTrendMetricId,
  sessions: ExerciseSessionRecord[],
  weightUnit: WeightUnit
) {
  if (sessions.length === 0) {
    return {
      latestValue: '—',
      latestDate: null as string | null,
      peakValue: '—',
      peakDate: null as string | null,
    };
  }

  const latest = sessions[sessions.length - 1];
  const peak = chooseMaxRecord(sessions, (session) =>
    getExerciseTrendMetricValue(metricId, session)
  );

  return {
    latestValue: formatExerciseTrendValue(
      metricId,
      getExerciseTrendMetricValue(metricId, latest),
      weightUnit
    ),
    latestDate: latest.dateLabel,
    peakValue:
      peak != null
        ? formatExerciseTrendValue(
            metricId,
            getExerciseTrendMetricValue(metricId, peak),
            weightUnit
          )
        : '—',
    peakDate: peak?.dateLabel ?? null,
  };
}

export function formatSignedMassDelta(valueKg: number, weightUnit: WeightUnit) {
  if (!isFiniteNumber(valueKg) || valueKg === 0) return 'Flat';
  const sign = valueKg > 0 ? '+' : '−';
  return `${sign}${formatMassFromKg(Math.abs(valueKg), weightUnit, 0)}`;
}

export function formatSignedCountDelta(value: number) {
  if (!isFiniteNumber(value) || value === 0) return 'Flat';
  return `${value > 0 ? '+' : '−'}${Math.abs(Math.round(value))}`;
}

export function formatDateBadge(value: string | null | undefined) {
  return formatDate(value, { month: 'short', day: 'numeric', year: 'numeric' });
}
