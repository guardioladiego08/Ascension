// lib/auth_onboarding_submit.ts
import { supabase } from '@/lib/supabase';
import { buildFallbackUsername } from './onboardingDraftStore';
import type { OnboardingDraft } from './onboardingDraftStore';

export async function submitOnboardingDraftToUserUsers(draft: OnboardingDraft) {
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    throw new Error('You are not signed in. Please sign in again.');
  }

  const username =
    (draft.username && draft.username.trim().length > 0 ? draft.username.trim() : null) ??
    buildFallbackUsername(user.email, user.id);

  // Build payload matching your schema: user.users
  const payload: any = {
    user_id: user.id,

    username,

    first_name: draft.first_name?.trim() ?? null,
    last_name: draft.last_name?.trim() ?? null,

    profile_image_url: draft.profile_image_url ?? null,
    is_private: draft.is_private ?? true,
    bio: draft.bio ?? null,

    onboarding_completed: true,

    country: draft.country ?? null,
    state: draft.state ?? null,
    city: draft.city ?? null,

    DOB: draft.DOB ?? null,
    height_cm: draft.height_cm ?? null,
    weight_kg: draft.weight_kg ?? null,
    gender: draft.gender ?? null,

    app_usage_reason: draft.app_usage_reason ?? null,
    app_usage_reasons: Array.isArray(draft.app_usage_reasons) ? draft.app_usage_reasons : [],

    fitness_journey_stage: draft.fitness_journey_stage ?? null,
  };

  const { error } = await supabase
    .schema('user')
    .from('users')
    .upsert(payload, { onConflict: 'user_id' });

  if (error) {
    throw new Error(error.message);
  }

  return { userId: user.id };
}