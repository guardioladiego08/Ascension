import AsyncStorage from '@react-native-async-storage/async-storage';

export type DistanceUnit = 'mi' | 'km';
export type Mode = 'indoor_run' | 'indoor_walk' | 'outdoor_run' | 'outdoor_walk';

export type RunWalkSample = {
  seq: number;
  elapsed_s: number;
  distance_m: number;
  speed_mps: number;
  pace_s_per_km: number | null;
  pace_s_per_mi: number | null;
  incline_deg: number;
  elevation_m: number;
};

export type RunWalkDraft = {
  id: string;
  created_at: string; // ISO
  ended_at: string; // ISO (when user pressed Finish)
  exercise_type: Mode;
  distance_unit: DistanceUnit;

  total_time_s: number;
  total_distance_m: number;
  total_elevation_m: number;

  avg_speed_mps: number;
  avg_pace_s_per_km: number | null;
  avg_pace_s_per_mi: number | null;

  samples: RunWalkSample[];
};

const INDEX_KEY = 'runwalk:drafts:index';
const draftKey = (id: string) => `runwalk:draft:${id}`;

function safeJsonParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function getIndex(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(INDEX_KEY);
  const parsed = safeJsonParse<string[]>(raw);
  return Array.isArray(parsed) ? parsed : [];
}

async function setIndex(ids: string[]) {
  await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(ids));
}

export async function upsertDraft(draft: RunWalkDraft) {
  await AsyncStorage.setItem(draftKey(draft.id), JSON.stringify(draft));
  const ids = await getIndex();
  if (!ids.includes(draft.id)) {
    await setIndex([draft.id, ...ids]);
  }
}

export async function getDraft(id: string): Promise<RunWalkDraft | null> {
  const raw = await AsyncStorage.getItem(draftKey(id));
  return safeJsonParse<RunWalkDraft>(raw);
}

export async function deleteDraft(id: string) {
  await AsyncStorage.removeItem(draftKey(id));
  const ids = await getIndex();
  await setIndex(ids.filter((x) => x !== id));
}

export async function listDraftIds(): Promise<string[]> {
  return await getIndex();
}
