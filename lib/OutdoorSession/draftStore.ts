import AsyncStorage from '@react-native-async-storage/async-storage';

export type OutdoorDraftSample = {
  seq: number;
  ts: string;
  elapsed_s: number;
  lat: number;
  lon: number;
  altitude_m: number | null;
  accuracy_m: number | null;
  speed_mps: number | null;
  bearing_deg: number | null;
  distance_m: number;
  is_moving: boolean;
};

export type OutdoorSessionDraft = {
  id: string;
  created_at: string;
  started_at: string;
  ended_at: string;
  activity_type: 'run' | 'walk';
  total_time_s: number;
  total_distance_m: number;
  avg_speed_mps: number | null;
  avg_pace_s_per_km: number | null;
  samples: OutdoorDraftSample[];
};

const INDEX_KEY = 'outdoor:drafts:index';
const draftKey = (id: string) => `outdoor:draft:${id}`;

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

export async function upsertOutdoorDraft(draft: OutdoorSessionDraft) {
  await AsyncStorage.setItem(draftKey(draft.id), JSON.stringify(draft));
  const ids = await getIndex();
  if (!ids.includes(draft.id)) {
    await setIndex([draft.id, ...ids]);
  }
}

export async function getOutdoorDraft(id: string): Promise<OutdoorSessionDraft | null> {
  const raw = await AsyncStorage.getItem(draftKey(id));
  return safeJsonParse<OutdoorSessionDraft>(raw);
}

export async function deleteOutdoorDraft(id: string) {
  await AsyncStorage.removeItem(draftKey(id));
  const ids = await getIndex();
  await setIndex(ids.filter((x) => x !== id));
}

export async function listOutdoorDraftIds(): Promise<string[]> {
  return await getIndex();
}
