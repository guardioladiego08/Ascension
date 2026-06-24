import type {
  IntervalPlan,
  IntervalPlanSource,
  IntervalPlanStep,
  IntervalRuntimeState,
  IntervalSessionStepInsert,
} from '@/lib/intervals/types';

type StepSeed = {
  kind: IntervalPlanStep['kind'];
  label: string;
  durationSeconds: number;
  cue: string;
  intervalIndex?: number | null;
};

type CustomPlanArgs = {
  name: string;
  description?: string;
  benefit?: string;
  warmupSeconds: number;
  workSeconds: number;
  recoverySeconds: number;
  restSeconds: number;
  intervalCount: number;
  activityTag?: 'indoor' | 'outdoor';
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function clampWholeSeconds(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value));
}

export function createIntervalPlanStep(seed: StepSeed, index: number): IntervalPlanStep {
  return {
    id: `step-${index + 1}-${seed.kind}`,
    kind: seed.kind,
    label: seed.label,
    durationSeconds: clampWholeSeconds(seed.durationSeconds),
    cue: seed.cue,
    intervalIndex: seed.intervalIndex ?? null,
  };
}

export function createIntervalPlan(args: {
  id: string;
  source: IntervalPlanSource;
  name: string;
  description: string;
  benefit: string;
  steps: StepSeed[];
  tags?: string[];
  templateId?: string | null;
  originLabel?: string | null;
}): IntervalPlan {
  const steps = args.steps
    .map((step, index) => createIntervalPlanStep(step, index))
    .filter((step) => step.durationSeconds > 0);

  return {
    id: args.id,
    templateId: args.templateId ?? null,
    source: args.source,
    name: args.name,
    description: args.description,
    benefit: args.benefit,
    originLabel: args.originLabel ?? null,
    tags: args.tags ?? [],
    steps,
  };
}

export function getIntervalPlanTotalDuration(plan: IntervalPlan) {
  return plan.steps.reduce((sum, step) => sum + step.durationSeconds, 0);
}

export function getIntervalPlanTotalIntervals(plan: IntervalPlan) {
  return plan.steps.reduce((count, step) => {
    if (step.kind !== 'work') return count;
    return Math.max(count, step.intervalIndex ?? 0);
  }, 0);
}

export function getIntervalRuntimeState(
  plan: IntervalPlan,
  elapsedSeconds: number
): IntervalRuntimeState {
  const boundedElapsed = Math.max(0, Math.floor(elapsedSeconds));
  const totalDuration = getIntervalPlanTotalDuration(plan);
  const totalIntervalCount = getIntervalPlanTotalIntervals(plan);

  if (plan.steps.length === 0) {
    return {
      currentStep: null,
      currentStepIndex: -1,
      stepElapsedSeconds: 0,
      stepRemainingSeconds: 0,
      nextStep: null,
      completedStepCount: 0,
      completedIntervalCount: 0,
      totalIntervalCount,
      totalRemainingSeconds: 0,
      isComplete: true,
    };
  }

  let cursor = 0;

  for (let index = 0; index < plan.steps.length; index += 1) {
    const step = plan.steps[index];
    const nextCursor = cursor + step.durationSeconds;

    if (boundedElapsed < nextCursor) {
      const completedStepCount = index;
      const completedIntervalCount = plan.steps.slice(0, index).reduce((count, candidate) => {
        if (candidate.kind !== 'work') return count;
        return Math.max(count, candidate.intervalIndex ?? 0);
      }, 0);

      return {
        currentStep: step,
        currentStepIndex: index,
        stepElapsedSeconds: boundedElapsed - cursor,
        stepRemainingSeconds: nextCursor - boundedElapsed,
        nextStep: plan.steps[index + 1] ?? null,
        completedStepCount,
        completedIntervalCount,
        totalIntervalCount,
        totalRemainingSeconds: Math.max(0, totalDuration - boundedElapsed),
        isComplete: false,
      };
    }

    cursor = nextCursor;
  }

  return {
    currentStep: null,
    currentStepIndex: plan.steps.length,
    stepElapsedSeconds: 0,
    stepRemainingSeconds: 0,
    nextStep: null,
    completedStepCount: plan.steps.length,
    completedIntervalCount: totalIntervalCount,
    totalIntervalCount,
    totalRemainingSeconds: 0,
    isComplete: true,
  };
}

export function buildCustomIntervalPlan(args: CustomPlanArgs): IntervalPlan {
  const warmupSeconds = clampWholeSeconds(args.warmupSeconds);
  const workSeconds = clampWholeSeconds(args.workSeconds);
  const recoverySeconds = clampWholeSeconds(args.recoverySeconds);
  const restSeconds = clampWholeSeconds(args.restSeconds);
  const intervalCount = Math.max(1, Math.min(30, Math.round(args.intervalCount)));

  const steps: StepSeed[] = [];

  if (warmupSeconds > 0) {
    steps.push({
      kind: 'warmup',
      label: 'Warm-up',
      durationSeconds: warmupSeconds,
      cue: 'Settle in and get ready for your first effort.',
    });
  }

  for (let intervalIndex = 1; intervalIndex <= intervalCount; intervalIndex += 1) {
    steps.push({
      kind: 'work',
      label: `Work ${intervalIndex}`,
      durationSeconds: workSeconds,
      cue: `Push the pace for interval ${intervalIndex}.`,
      intervalIndex,
    });

    if (recoverySeconds > 0) {
      steps.push({
        kind: 'recovery',
        label: `Break ${intervalIndex}`,
        durationSeconds: recoverySeconds,
        cue: 'Recover with an easy jog or walk.',
        intervalIndex,
      });
    }

    if (restSeconds > 0 && intervalIndex < intervalCount) {
      steps.push({
        kind: 'rest',
        label: `Rest ${intervalIndex}`,
        durationSeconds: restSeconds,
        cue: 'Take a full reset before the next repeat.',
        intervalIndex,
      });
    }
  }

  const normalizedName = args.name.trim() || 'Custom Interval';
  const id = `custom-${slugify(normalizedName)}-${intervalCount}-${workSeconds}`;

  return createIntervalPlan({
    id,
    source: 'custom',
    name: normalizedName,
    description:
      args.description?.trim() ||
      `${intervalCount} hard efforts with flexible break and rest timing.`,
    benefit:
      args.benefit?.trim() ||
      'Build a session around your exact work-to-recovery ratio and save it for repeat weeks.',
    steps,
    tags: ['custom', args.activityTag ?? 'outdoor', 'interval'],
  });
}

export function serializeIntervalPlan(plan: IntervalPlan) {
  return JSON.stringify(plan);
}

export function deserializeIntervalPlan(raw: string | null | undefined): IntervalPlan | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as IntervalPlan;
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    if (!parsed.id || !parsed.name || !Array.isArray(parsed.steps)) {
      return null;
    }

    return createIntervalPlan({
      id: String(parsed.id),
      templateId: parsed.templateId ?? null,
      source: parsed.source === 'custom' ? 'custom' : 'preset',
      name: String(parsed.name),
      description: String(parsed.description ?? ''),
      benefit: String(parsed.benefit ?? ''),
      originLabel: parsed.originLabel ?? null,
      tags: Array.isArray(parsed.tags) ? parsed.tags.map(String) : [],
      steps: parsed.steps.map((step) => ({
        kind: step.kind,
        label: String(step.label),
        durationSeconds: clampWholeSeconds(step.durationSeconds),
        cue: String(step.cue ?? ''),
        intervalIndex:
          typeof step.intervalIndex === 'number' ? Math.round(step.intervalIndex) : null,
      })),
    });
  } catch {
    return null;
  }
}

export function formatIntervalDuration(totalSeconds: number) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}:${String(remaining).padStart(2, '0')}`;
}

export function buildIntervalSessionStepRows(
  sessionId: string,
  plan: IntervalPlan,
  elapsedSeconds: number
): IntervalSessionStepInsert[] {
  const boundedElapsed = Math.max(0, Math.floor(elapsedSeconds));
  let cursor = 0;

  return plan.steps.map((step, index) => {
    const started = cursor;
    const ended = cursor + step.durationSeconds;
    const actualDurationSeconds = Math.max(
      0,
      Math.min(step.durationSeconds, boundedElapsed - started)
    );
    cursor = ended;

    return {
      session_id: sessionId,
      sequence_index: index,
      phase_kind: step.kind,
      phase_label: step.label,
      planned_duration_s: step.durationSeconds,
      actual_duration_s: actualDurationSeconds,
      started_elapsed_s: started,
      ended_elapsed_s: started + actualDurationSeconds,
      interval_index: step.intervalIndex,
      completed: actualDurationSeconds >= step.durationSeconds,
    };
  });
}
