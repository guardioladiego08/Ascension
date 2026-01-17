// lib/profile.ts
import { supabase } from '@/lib/supabase';
import type { Profile, ProfilePreview, UpdateMyProfileInput } from './types';
import { requireAuthedUserId } from './auth';
import { formatSupabaseishError, normalizeThrown } from './errors';

const PROFILES = { schema: 'public', table: 'profiles' } as const;

/**
 * IMPORTANT:
 * Keep this as a literal `as const` string.
 * If you build it dynamically (e.g. .replace()), Supabase typed select will return GenericStringError.
 */
export const PROFILE_SELECT =
  'id, username, display_name, profile_image_url, bio, is_private, onboarding_completed, has_accepted_privacy_policy, privacy_accepted_at, first_name, last_name, preferred_name, country, state, city, date_of_birth, height_cm, weight_kg, gender, app_usage_reasons, fitness_journey_stage, created_at, updated_at, profile_row_id' as const;

export async function getProfileById(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .schema(PROFILES.schema)
    .from(PROFILES.table)
    .select(PROFILE_SELECT)
    .eq('id', userId)
    .maybeSingle();

  if (error) throw normalizeThrown(error, formatSupabaseishError(error));
  return (data as Profile) ?? null;
}

export async function getMyProfile(): Promise<Profile> {
  const userId = await requireAuthedUserId();
  const p = await getProfileById(userId);
  if (!p) throw new Error('Profile not found for current user.');
  return p;
}

export async function updateMyProfile(input: UpdateMyProfileInput): Promise<Profile> {
  const userId = await requireAuthedUserId();

  const { data, error } = await supabase
    .schema(PROFILES.schema)
    .from(PROFILES.table)
    .update(input)
    .eq('id', userId)
    .select(PROFILE_SELECT)
    .single();

  if (error) throw normalizeThrown(error, formatSupabaseishError(error));
  return data as Profile;
}

export async function searchProfiles(query: string, limit = 20): Promise<ProfilePreview[]> {
  const q = query.trim();
  if (!q) return [];

  const { data, error } = await supabase
    .schema(PROFILES.schema)
    .from(PROFILES.table)
    .select('id, username, display_name, profile_image_url, bio, is_private')
    .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw normalizeThrown(error, formatSupabaseishError(error));
  return (data ?? []) as ProfilePreview[];
}
