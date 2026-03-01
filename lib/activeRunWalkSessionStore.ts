import AsyncStorage from '@react-native-async-storage/async-storage';

import type { DistanceUnit, RunWalkSample } from '@/lib/runWalkDraftStore';
import type { OutdoorDraftSample } from '@/lib/OutdoorSession/draftStore';
import type { ExerciseDraft } from '@/lib/strength/types';

export type ActiveSessionPhase = 'running' | 'paused';

export type ActiveIndoorSession = {
  kind: 'indoor';
  mode: 'indoor_run' | 'indoor_walk';
  title: string;
  phase: ActiveSessionPhase;
  distanceUnit: DistanceUnit;
  elapsedS: number;
  distanceM: number;
  elevM: number;
  speed: number;
  inclineDeg: number;
  samples: RunWalkSample[];
};

export type ActiveOutdoorCoord = {
  latitude: number;
  longitude: number;
};

export type ActiveOutdoorSession = {
  kind: 'outdoor';
  mode: 'outdoor_run' | 'outdoor_walk';
  title: string;
  phase: ActiveSessionPhase;
  distanceUnit: DistanceUnit;
  startedAtISO: string | null;
  elapsedSeconds: number;
  distanceMeters: number;
  coords: ActiveOutdoorCoord[];
  samples: OutdoorDraftSample[];
};

export type ActiveStrengthSession = {
  kind: 'strength';
  title: string;
  phase: ActiveSessionPhase;
  workoutId: string;
  userId: string | null;
  seconds: number;
  exercises: ExerciseDraft[];
};

export type ActiveRunWalkSession =
  | ActiveIndoorSession
  | ActiveOutdoorSession
  | ActiveStrengthSession;

const KEY = 'tensr:active_run_walk_session';

function safeJsonParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function getActiveRunWalkSession(): Promise<ActiveRunWalkSession | null> {
  const raw = await AsyncStorage.getItem(KEY);
  return safeJsonParse<ActiveRunWalkSession>(raw);
}

export async function setActiveRunWalkSession(session: ActiveRunWalkSession | null) {
  if (!session) {
    await AsyncStorage.removeItem(KEY);
    return;
  }

  await AsyncStorage.setItem(KEY, JSON.stringify(session));
}

export async function clearActiveRunWalkSession() {
  await AsyncStorage.removeItem(KEY);
}
