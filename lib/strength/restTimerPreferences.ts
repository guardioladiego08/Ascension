import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  getCurrentUserPreferencesRow,
  upsertCurrentUserPreferences,
} from '@/lib/userPreferences';

const STORAGE_KEY = 'tensr:strength_rest_timer_preferences.v1';

export const DEFAULT_STRENGTH_REST_TIMER_SECONDS = 90;
export const MIN_STRENGTH_REST_TIMER_SECONDS = 15;
export const MAX_STRENGTH_REST_TIMER_SECONDS = 300;
export const STRENGTH_REST_TIMER_STEP_SECONDS = 15;
export const STRENGTH_REST_TIMER_PRESET_SECONDS = [30, 45, 60, 90, 120, 180];

export type StrengthRestTimerPreferences = {
  defaultDurationSeconds: number;
};

type StrengthRestTimerPreferenceRow = {
  strength_rest_timer_seconds: number | null;
};

function clampStrengthRestTimerDuration(seconds: number) {
  const bounded = Math.min(
    MAX_STRENGTH_REST_TIMER_SECONDS,
    Math.max(MIN_STRENGTH_REST_TIMER_SECONDS, seconds)
  );

  const stepped =
    Math.round(bounded / STRENGTH_REST_TIMER_STEP_SECONDS) *
    STRENGTH_REST_TIMER_STEP_SECONDS;

  return Math.min(
    MAX_STRENGTH_REST_TIMER_SECONDS,
    Math.max(MIN_STRENGTH_REST_TIMER_SECONDS, stepped)
  );
}

function normalizeStoredPreferences(
  value: Partial<StrengthRestTimerPreferences> | null | undefined
): StrengthRestTimerPreferences {
  const rawSeconds = Number(value?.defaultDurationSeconds);
  const defaultDurationSeconds = Number.isFinite(rawSeconds)
    ? clampStrengthRestTimerDuration(rawSeconds)
    : DEFAULT_STRENGTH_REST_TIMER_SECONDS;

  return {
    defaultDurationSeconds,
  };
}

async function getLocalStrengthRestTimerPreferences(): Promise<StrengthRestTimerPreferences> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        defaultDurationSeconds: DEFAULT_STRENGTH_REST_TIMER_SECONDS,
      };
    }

    const parsed = JSON.parse(raw) as Partial<StrengthRestTimerPreferences>;
    return normalizeStoredPreferences(parsed);
  } catch (error) {
    console.warn('[StrengthRestTimerPreferences] Failed to load preferences', error);
    return {
      defaultDurationSeconds: DEFAULT_STRENGTH_REST_TIMER_SECONDS,
    };
  }
}

async function persistLocalStrengthRestTimerPreferences(
  preferences: StrengthRestTimerPreferences
) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
}

export async function getStrengthRestTimerPreferences(): Promise<StrengthRestTimerPreferences> {
  const localPreferences = await getLocalStrengthRestTimerPreferences();

  try {
    const data = await getCurrentUserPreferencesRow<StrengthRestTimerPreferenceRow>(
      'strength_rest_timer_seconds'
    );

    const remoteSeconds = Number(data?.strength_rest_timer_seconds);
    if (Number.isFinite(remoteSeconds)) {
      const remotePreferences = normalizeStoredPreferences({
        defaultDurationSeconds: remoteSeconds,
      });

      await persistLocalStrengthRestTimerPreferences(remotePreferences);
      return remotePreferences;
    }

    if (
      localPreferences.defaultDurationSeconds !== DEFAULT_STRENGTH_REST_TIMER_SECONDS
    ) {
      await upsertCurrentUserPreferences({
        strength_rest_timer_seconds: localPreferences.defaultDurationSeconds,
      });
    }
  } catch (error) {
    console.warn('[StrengthRestTimerPreferences] Failed to sync preferences', error);
  }

  return localPreferences;
}

export async function setStrengthRestTimerDefaultSeconds(seconds: number) {
  const nextPreferences = normalizeStoredPreferences({
    defaultDurationSeconds: seconds,
  });

  try {
    await persistLocalStrengthRestTimerPreferences(nextPreferences);
  } catch (error) {
    console.warn('[StrengthRestTimerPreferences] Failed to save preferences', error);
  }

  try {
    await upsertCurrentUserPreferences({
      strength_rest_timer_seconds: nextPreferences.defaultDurationSeconds,
    });
  } catch (error) {
    console.warn('[StrengthRestTimerPreferences] Failed to sync preferences', error);
  }

  return nextPreferences.defaultDurationSeconds;
}
