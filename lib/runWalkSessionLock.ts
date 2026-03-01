import AsyncStorage from '@react-native-async-storage/async-storage';
import { getActiveRunWalkSession } from '@/lib/activeRunWalkSessionStore';

export type RunWalkMode = 'indoor_run' | 'indoor_walk' | 'outdoor_run' | 'outdoor_walk';

type ActiveLock = {
  mode: RunWalkMode;
  started_at: string; // ISO
};

const KEY = 'tensr:run_walk_active_lock';

export async function getActiveRunWalkLock(): Promise<ActiveLock | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ActiveLock;

    // Safety: if malformed, clear it
    if (!parsed?.mode || !parsed?.started_at) {
      await AsyncStorage.removeItem(KEY);
      return null;
    }

    // Optional: auto-expire stale locks (prevents “stuck forever” after crash)
    const ageMs = Date.now() - new Date(parsed.started_at).getTime();
    const MAX_AGE_MS = 1000 * 60 * 60 * 12; // 12 hours
    if (Number.isFinite(ageMs) && ageMs > MAX_AGE_MS) {
      await AsyncStorage.removeItem(KEY);
      return null;
    }

    const activeSession = await getActiveRunWalkSession();
    if (!activeSession) {
      await AsyncStorage.removeItem(KEY);
      return null;
    }

    if (activeSession.mode !== parsed.mode) {
      await AsyncStorage.removeItem(KEY);
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export async function setActiveRunWalkLock(mode: RunWalkMode): Promise<void> {
  const payload: ActiveLock = { mode, started_at: new Date().toISOString() };
  await AsyncStorage.setItem(KEY, JSON.stringify(payload));
}

export async function clearActiveRunWalkLock(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
