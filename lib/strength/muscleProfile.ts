export const STRENGTH_MUSCLE_PROFILE_KEYS = [
  'chest',
  'back',
  'shoulders',
  'arms',
  'core',
  'quads',
  'posterior_chain',
  'calves',
] as const;

export const STRENGTH_MUSCLE_RADAR_AXES = [
  'chest',
  'shoulders',
  'arms',
  'quads',
  'posterior_chain',
  'calves',
  'core',
  'back',
] as const;

export type StrengthMuscleProfileKey = (typeof STRENGTH_MUSCLE_PROFILE_KEYS)[number];
export type StrengthMuscleRadarAxis = (typeof STRENGTH_MUSCLE_RADAR_AXES)[number];
export type StrengthMuscleProfile = Record<StrengthMuscleProfileKey, number>;

export const STRENGTH_MUSCLE_LABELS: Record<StrengthMuscleProfileKey, string> = {
  chest: 'Chest',
  back: 'Back',
  shoulders: 'Shoulders',
  arms: 'Arms',
  core: 'Core',
  quads: 'Quads',
  posterior_chain: 'Posterior Chain',
  calves: 'Calves',
};

function clampUnit(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(1, parsed));
}

export function emptyStrengthMuscleProfile(): StrengthMuscleProfile {
  return {
    chest: 0,
    back: 0,
    shoulders: 0,
    arms: 0,
    core: 0,
    quads: 0,
    posterior_chain: 0,
    calves: 0,
  };
}

export function coerceStrengthMuscleProfile(value: unknown): StrengthMuscleProfile | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const input = value as Record<string, unknown>;
  const profile = emptyStrengthMuscleProfile();
  let hasNonZeroValue = false;

  for (const key of STRENGTH_MUSCLE_PROFILE_KEYS) {
    const nextValue = clampUnit(input[key]);
    profile[key] = Math.round(nextValue * 1000) / 1000;
    if (profile[key] > 0) {
      hasNonZeroValue = true;
    }
  }

  return hasNonZeroValue ? profile : null;
}

export function getDominantStrengthMuscle(
  profile: StrengthMuscleProfile | null | undefined
): { key: StrengthMuscleProfileKey; label: string; value: number } | null {
  if (!profile) return null;

  let dominantKey: StrengthMuscleProfileKey | null = null;
  let dominantValue = 0;

  for (const key of STRENGTH_MUSCLE_PROFILE_KEYS) {
    const nextValue = clampUnit(profile[key]);
    if (nextValue > dominantValue) {
      dominantKey = key;
      dominantValue = nextValue;
    }
  }

  if (!dominantKey || dominantValue <= 0) return null;
  return {
    key: dominantKey,
    label: STRENGTH_MUSCLE_LABELS[dominantKey],
    value: dominantValue,
  };
}
