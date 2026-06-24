import AsyncStorage from '@react-native-async-storage/async-storage';

import type {
  IndoorCardioMode,
  OutdoorCardioMode,
} from '@/lib/cardio/activityTypes';
import type { IntervalPlan } from '@/lib/intervals/types';
import type { DistanceUnit, RunWalkSample } from '@/lib/runWalkDraftStore';
import type { OutdoorDraftSample } from '@/lib/OutdoorSession/draftStore';
import type { PersistedRunWalkClock } from '@/lib/runWalkSessionClock';
import type {
  ExerciseDraft,
  StrengthSessionMode,
  StrengthWorkoutBlockDraft,
} from '@/lib/strength/types';
import type { StrengthRestTimerState } from '@/lib/strength/restTimer';

export type ActiveSessionPhase = 'running' | 'paused';

export type ActiveIndoorSession = {
  sessionId?: string;
  kind: 'indoor';
  mode: IndoorCardioMode;
  title: string;
  sessionVariant?: 'open' | 'interval';
  phase: ActiveSessionPhase;
  clock?: PersistedRunWalkClock;
  distanceUnit: DistanceUnit;
  elapsedS: number;
  distanceM: number;
  elevM: number;
  speed: number;
  inclineDeg: number;
  samples: RunWalkSample[];
  intervalPlan?: IntervalPlan;
};

export type ActiveOutdoorCoord = {
  latitude: number;
  longitude: number;
};

export type ActiveOutdoorSession = {
  sessionId?: string;
  kind: 'outdoor';
  mode: OutdoorCardioMode;
  title: string;
  phase: ActiveSessionPhase;
  clock?: PersistedRunWalkClock;
  distanceUnit: DistanceUnit;
  startedAtISO: string | null;
  elapsedSeconds: number;
  distanceMeters: number;
  coords: ActiveOutdoorCoord[];
  samples: OutdoorDraftSample[];
  sessionVariant?: 'open' | 'interval';
  runSubtype?: string | null;
  intervalPlan?: IntervalPlan;
};

export type ActiveStrengthSession = {
  sessionId?: string;
  kind: 'strength';
  title: string;
  sessionMode: StrengthSessionMode;
  templateId?: string | null;
  templateName?: string | null;
  phase: ActiveSessionPhase;
  workoutId: string;
  userId: string | null;
  startedAtISO: string | null;
  clock?: PersistedRunWalkClock;
  seconds: number;
  blocks?: StrengthWorkoutBlockDraft[];
  exercises: ExerciseDraft[];
  restTimer?: StrengthRestTimerState;
};

export type ActiveRunWalkSession =
  | ActiveIndoorSession
  | ActiveOutdoorSession
  | ActiveStrengthSession;

const KEY = 'tensr:active_run_walk_session';
let sessionWriteChain: Promise<void> = Promise.resolve();

function safeJsonParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function enqueueSessionWrite(task: () => Promise<void>) {
  sessionWriteChain = sessionWriteChain.catch(() => undefined).then(task);
  return sessionWriteChain;
}

export async function getActiveRunWalkSession(): Promise<ActiveRunWalkSession | null> {
  await sessionWriteChain.catch(() => undefined);
  const raw = await AsyncStorage.getItem(KEY);
  return safeJsonParse<ActiveRunWalkSession>(raw);
}

export async function setActiveRunWalkSession(session: ActiveRunWalkSession | null) {
  await enqueueSessionWrite(async () => {
    if (!session) {
      await AsyncStorage.removeItem(KEY);
      return;
    }

    await AsyncStorage.setItem(KEY, JSON.stringify(session));
  });
}

export async function clearActiveRunWalkSession() {
  await setActiveRunWalkSession(null);
}
