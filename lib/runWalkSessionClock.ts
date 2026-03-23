export type PersistedRunWalkClock = {
  accumulatedElapsedMs: number;
  runningStartedAtISO: string | null;
};

type NormalizeClockArgs = {
  clock?: Partial<PersistedRunWalkClock> | null;
  elapsedSeconds?: number | null;
  phase?: 'running' | 'paused';
  nowMs?: number;
};

function parseIsoMs(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const parsed = Date.parse(iso);
  return Number.isFinite(parsed) ? parsed : null;
}

export function createPausedRunWalkClock(elapsedSeconds = 0): PersistedRunWalkClock {
  return {
    accumulatedElapsedMs: Math.max(0, Math.round(elapsedSeconds * 1000)),
    runningStartedAtISO: null,
  };
}

export function normalizeRunWalkClock(args: NormalizeClockArgs = {}): PersistedRunWalkClock {
  const nowMs = args.nowMs ?? Date.now();
  const fallbackElapsedMs = Math.max(0, Math.round((args.elapsedSeconds ?? 0) * 1000));
  const accumulatedElapsedMs = Math.max(
    0,
    Number.isFinite(args.clock?.accumulatedElapsedMs)
      ? Number(args.clock?.accumulatedElapsedMs)
      : fallbackElapsedMs
  );
  const runningStartedAtMs = parseIsoMs(args.clock?.runningStartedAtISO ?? null);

  if (args.phase === 'running') {
    return {
      accumulatedElapsedMs,
      runningStartedAtISO:
        runningStartedAtMs == null ? new Date(nowMs).toISOString() : new Date(runningStartedAtMs).toISOString(),
    };
  }

  return {
    accumulatedElapsedMs,
    runningStartedAtISO: runningStartedAtMs == null ? null : new Date(runningStartedAtMs).toISOString(),
  };
}

export function getRunWalkElapsedMs(
  clock: Partial<PersistedRunWalkClock> | null | undefined,
  nowMs = Date.now()
): number {
  const normalized = normalizeRunWalkClock({ clock, nowMs });
  const runningStartedAtMs = parseIsoMs(normalized.runningStartedAtISO);
  if (runningStartedAtMs == null) {
    return normalized.accumulatedElapsedMs;
  }
  return normalized.accumulatedElapsedMs + Math.max(0, nowMs - runningStartedAtMs);
}

export function getRunWalkElapsedSeconds(
  clock: Partial<PersistedRunWalkClock> | null | undefined,
  nowMs = Date.now()
): number {
  return Math.floor(getRunWalkElapsedMs(clock, nowMs) / 1000);
}

export function pauseRunWalkClock(
  clock: Partial<PersistedRunWalkClock> | null | undefined,
  nowMs = Date.now()
): PersistedRunWalkClock {
  return {
    accumulatedElapsedMs: getRunWalkElapsedMs(clock, nowMs),
    runningStartedAtISO: null,
  };
}

export function resumeRunWalkClock(
  clock: Partial<PersistedRunWalkClock> | null | undefined,
  nowMs = Date.now()
): PersistedRunWalkClock {
  const normalized = normalizeRunWalkClock({ clock, nowMs });
  if (normalized.runningStartedAtISO) {
    return normalized;
  }
  return {
    accumulatedElapsedMs: normalized.accumulatedElapsedMs,
    runningStartedAtISO: new Date(nowMs).toISOString(),
  };
}
