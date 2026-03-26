export type StrengthRestTimerStatus = 'idle' | 'running' | 'paused' | 'ready';
export type StrengthRestTimerOwnerKind = 'exercise' | 'superset';

export type StrengthRestTimerState = {
  status: StrengthRestTimerStatus;
  ownerKind: StrengthRestTimerOwnerKind | null;
  ownerId: string | null;
  durationSeconds: number;
  remainingSeconds: number;
  startedAtMs: number | null;
  endAtMs: number | null;
  readyAtMs: number | null;
};

type PartialStrengthRestTimerState = Partial<StrengthRestTimerState> | null | undefined;

export function formatRestTimerClock(totalSeconds: number) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(seconds / 60);
  const rem = seconds % 60;
  return `${mins}:${String(rem).padStart(2, '0')}`;
}

export function createIdleStrengthRestTimer(
  durationSeconds: number,
  ownerKind: StrengthRestTimerOwnerKind | null = null,
  ownerId: string | null = null
): StrengthRestTimerState {
  return {
    status: 'idle',
    ownerKind,
    ownerId,
    durationSeconds,
    remainingSeconds: durationSeconds,
    startedAtMs: null,
    endAtMs: null,
    readyAtMs: null,
  };
}

export function normalizeStrengthRestTimer(
  timer: PartialStrengthRestTimerState,
  fallbackDurationSeconds: number
): StrengthRestTimerState {
  const durationSeconds =
    typeof timer?.durationSeconds === 'number' && Number.isFinite(timer.durationSeconds)
      ? Math.max(1, Math.round(timer.durationSeconds))
      : fallbackDurationSeconds;
  const remainingSeconds =
    typeof timer?.remainingSeconds === 'number' && Number.isFinite(timer.remainingSeconds)
      ? Math.max(0, Math.round(timer.remainingSeconds))
      : durationSeconds;
  const status: StrengthRestTimerStatus =
    timer?.status === 'running' ||
    timer?.status === 'paused' ||
    timer?.status === 'ready' ||
    timer?.status === 'idle'
      ? timer.status
      : 'idle';
  const legacyExerciseInstanceId =
    typeof (timer as { exerciseInstanceId?: unknown } | null)?.exerciseInstanceId ===
    'string'
      ? ((timer as { exerciseInstanceId?: string }).exerciseInstanceId ?? null)
      : null;
  const ownerId =
    typeof timer?.ownerId === 'string' ? timer.ownerId : legacyExerciseInstanceId;
  const ownerKind: StrengthRestTimerOwnerKind | null =
    timer?.ownerKind === 'exercise' || timer?.ownerKind === 'superset'
      ? timer.ownerKind
      : ownerId
        ? 'exercise'
        : null;

  return {
    status,
    ownerKind,
    ownerId,
    durationSeconds,
    remainingSeconds,
    startedAtMs:
      typeof timer?.startedAtMs === 'number' && Number.isFinite(timer.startedAtMs)
        ? timer.startedAtMs
        : null,
    endAtMs:
      typeof timer?.endAtMs === 'number' && Number.isFinite(timer.endAtMs)
        ? timer.endAtMs
        : null,
    readyAtMs:
      typeof timer?.readyAtMs === 'number' && Number.isFinite(timer.readyAtMs)
        ? timer.readyAtMs
        : null,
  };
}

export function startStrengthRestTimer(params: {
  durationSeconds: number;
  ownerKind: StrengthRestTimerOwnerKind;
  ownerId: string;
  nowMs?: number;
}): StrengthRestTimerState {
  const nowMs = params.nowMs ?? Date.now();

  return {
    status: 'running',
    ownerKind: params.ownerKind,
    ownerId: params.ownerId,
    durationSeconds: params.durationSeconds,
    remainingSeconds: params.durationSeconds,
    startedAtMs: nowMs,
    endAtMs: nowMs + params.durationSeconds * 1000,
    readyAtMs: null,
  };
}

export function applyStrengthRestTimerPreference(
  timer: StrengthRestTimerState,
  durationSeconds: number
): StrengthRestTimerState {
  if (timer.status === 'running') {
    return timer;
  }

  if (timer.status === 'ready') {
    return {
      ...timer,
      durationSeconds,
    };
  }

  return createIdleStrengthRestTimer(durationSeconds, timer.ownerKind, timer.ownerId);
}

export function pauseStrengthRestTimer(
  timer: StrengthRestTimerState,
  nowMs = Date.now()
): StrengthRestTimerState {
  if (timer.status !== 'running' || timer.endAtMs == null) {
    return timer;
  }

  const remainingMs = Math.max(0, timer.endAtMs - nowMs);

  return {
    ...timer,
    status: 'paused',
    remainingSeconds: Math.ceil(remainingMs / 1000),
    endAtMs: null,
  };
}

export function resumeStrengthRestTimer(
  timer: StrengthRestTimerState,
  nowMs = Date.now()
): StrengthRestTimerState {
  if (timer.status !== 'paused') {
    return timer;
  }

  return {
    ...timer,
    status: 'running',
    startedAtMs: nowMs,
    endAtMs: nowMs + timer.remainingSeconds * 1000,
    readyAtMs: null,
  };
}

export function restartStrengthRestTimer(
  timer: StrengthRestTimerState,
  nowMs = Date.now()
): StrengthRestTimerState {
  if (!timer.ownerKind || !timer.ownerId) {
    return createIdleStrengthRestTimer(timer.durationSeconds);
  }

  return startStrengthRestTimer({
    durationSeconds: timer.durationSeconds,
    ownerKind: timer.ownerKind,
    ownerId: timer.ownerId,
    nowMs,
  });
}

export function syncStrengthRestTimer(
  timer: StrengthRestTimerState,
  nowMs = Date.now()
): StrengthRestTimerState {
  if (timer.status !== 'running' || timer.endAtMs == null) {
    return timer;
  }

  const remainingMs = timer.endAtMs - nowMs;
  if (remainingMs <= 0) {
    return {
      ...timer,
      status: 'ready',
      remainingSeconds: 0,
      endAtMs: null,
      readyAtMs: nowMs,
    };
  }

  const nextRemainingSeconds = Math.ceil(remainingMs / 1000);
  if (nextRemainingSeconds === timer.remainingSeconds) {
    return timer;
  }

  return {
    ...timer,
    remainingSeconds: nextRemainingSeconds,
  };
}

export function getStrengthRestTimerProgress(
  timer: StrengthRestTimerState,
  nowMs = Date.now()
) {
  if (timer.durationSeconds <= 0) {
    return 0;
  }

  if (timer.status === 'paused') {
    return Math.max(
      0,
      Math.min(1, timer.remainingSeconds / Math.max(1, timer.durationSeconds))
    );
  }

  if (timer.status !== 'running' || timer.endAtMs == null) {
    return 0;
  }

  const remainingMs = Math.max(0, timer.endAtMs - nowMs);
  return Math.max(0, Math.min(1, remainingMs / (timer.durationSeconds * 1000)));
}
