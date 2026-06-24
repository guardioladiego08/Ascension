import type {
  IntervalPhaseKind,
} from '@/lib/intervals/types';

export type IntervalStepTimelineItem = {
  sequence_index: number;
  phase_kind: IntervalPhaseKind;
  planned_duration_s: number;
  actual_duration_s: number;
  started_elapsed_s: number;
  ended_elapsed_s: number;
  completed: boolean;
};

export type IntervalCoordinateSample = {
  lat: number | null;
  lon: number | null;
};

export type IntervalDurationBreakdown = Record<IntervalPhaseKind, number>;

export type IntervalSessionBreakdown = {
  actualDurationByKind: IntervalDurationBreakdown;
  plannedDurationByKind: IntervalDurationBreakdown;
  completedWorkIntervals: number;
  totalWorkIntervals: number;
  completedSteps: number;
  totalSteps: number;
  totalPlannedSeconds: number;
  totalActualSeconds: number;
};

function zeroBreakdown(): IntervalDurationBreakdown {
  return {
    warmup: 0,
    work: 0,
    recovery: 0,
    rest: 0,
    cooldown: 0,
  };
}

export function summarizeIntervalSessionSteps(
  steps: IntervalStepTimelineItem[]
): IntervalSessionBreakdown {
  const actualDurationByKind = zeroBreakdown();
  const plannedDurationByKind = zeroBreakdown();
  let completedWorkIntervals = 0;
  let totalWorkIntervals = 0;
  let completedSteps = 0;
  let totalPlannedSeconds = 0;
  let totalActualSeconds = 0;

  for (const step of steps) {
    const plannedSeconds = Math.max(0, Math.round(step.planned_duration_s ?? 0));
    const actualSeconds = Math.max(0, Math.round(step.actual_duration_s ?? 0));

    plannedDurationByKind[step.phase_kind] += plannedSeconds;
    actualDurationByKind[step.phase_kind] += actualSeconds;
    totalPlannedSeconds += plannedSeconds;
    totalActualSeconds += actualSeconds;

    if (step.completed) {
      completedSteps += 1;
    }

    if (step.phase_kind === 'work') {
      totalWorkIntervals += 1;
      if (step.completed || actualSeconds >= plannedSeconds) {
        completedWorkIntervals += 1;
      }
    }
  }

  return {
    actualDurationByKind,
    plannedDurationByKind,
    completedWorkIntervals,
    totalWorkIntervals,
    completedSteps,
    totalSteps: steps.length,
    totalPlannedSeconds,
    totalActualSeconds,
  };
}

export function extractIntervalRouteCoords(samples: IntervalCoordinateSample[]) {
  return samples
    .filter(
      (sample) => Number.isFinite(sample.lat) && Number.isFinite(sample.lon)
    )
    .map((sample) => ({
      lat: sample.lat as number,
      lon: sample.lon as number,
    }));
}
