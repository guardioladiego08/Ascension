// lib/onboardingDraftStore.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type DbGender = 'female' | 'male' | 'non_binary' | 'prefer_not';
export type AppUsageReason =
  | 'track_fitness_health'
  | 'compete_with_friends'
  | 'train_for_personal_goal'
  | 'connect_with_friends'
  | 'other';

export type JourneyStage =
  | 'beginner'
  | 'intermediate'
  | 'advanced'
  | 'returning_from_break'
  | 'elite';

export type OnboardingDraft = {
  // user.users columns (subset used in onboarding)
  username: string | null;

  first_name: string | null;
  last_name: string | null;

  country: string | null;
  state: string | null;
  city: string | null;

  DOB: string | null; // ISO date string: YYYY-MM-DD
  height_cm: number | null;
  weight_kg: number | null;
  gender: DbGender | null;

  app_usage_reason: AppUsageReason | null; // optional single
  app_usage_reasons: AppUsageReason[]; // your table default is '{}'
  fitness_journey_stage: JourneyStage | null;

  // optional extras you may want later
  bio: string | null;
  profile_image_url: string | null;
  is_private: boolean; // default true
};

const initialDraft: OnboardingDraft = {
  username: null,

  first_name: null,
  last_name: null,

  country: null,
  state: null,
  city: null,

  DOB: null,
  height_cm: null,
  weight_kg: null,
  gender: null,

  app_usage_reason: null,
  app_usage_reasons: [],
  fitness_journey_stage: null,

  bio: null,
  profile_image_url: null,
  is_private: true,
};

type OnboardingDraftState = {
  draft: OnboardingDraft;
  setDraft: (patch: Partial<OnboardingDraft>) => void;
  setUsageReasons: (reasons: AppUsageReason[]) => void;
  resetDraft: () => void;
};

export const useOnboardingDraftStore = create<OnboardingDraftState>()(
  persist(
    (set, get) => ({
      draft: initialDraft,

      setDraft: (patch) =>
        set((state) => ({
          draft: { ...state.draft, ...patch },
        })),

      setUsageReasons: (reasons) =>
        set((state) => ({
          draft: { ...state.draft, app_usage_reasons: reasons },
        })),

      resetDraft: () => set({ draft: initialDraft }),
    }),
    {
      name: 'tensr_onboarding_draft_v1',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
    }
  )
);

export function sanitizeUsername(raw: string) {
  let u = (raw ?? '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
  if (u.length > 30) u = u.slice(0, 30);
  return u;
}

export function buildFallbackUsername(email: string | null | undefined, userId: string) {
  const baseRaw = (email?.split('@')?.[0] ?? 'user') + '_' + userId.slice(0, 6);
  let u = sanitizeUsername(baseRaw);
  if (u.length < 3) u = `user_${userId.slice(0, 6)}`;
  if (u.length > 30) u = u.slice(0, 30);
  return u;
}