import { supabase } from '@/lib/supabase';

type SupabaseishError = {
  code?: string;
  message?: string;
};

export type UsernameAvailabilityResult = {
  available: boolean | null;
  error: SupabaseishError | null;
};

function canIgnoreUsernameSourceError(error: SupabaseishError | null | undefined) {
  const code = String(error?.code ?? '');
  return (
    code === '42501' ||
    code === '42P01' ||
    code === 'PGRST106' ||
    code === 'PGRST116' ||
    code === 'PGRST200' ||
    code === 'PGRST205'
  );
}

export async function checkSignupUsernameAvailability(
  desiredUsername: string
): Promise<UsernameAvailabilityResult> {
  const desired = (desiredUsername ?? '').trim();
  if (!desired) {
    return { available: false, error: null };
  }

  const { data: rpcData, error: rpcError } = await supabase.rpc('is_username_available', {
    desired_username: desired,
  });

  if (!rpcError && typeof rpcData === 'boolean') {
    return { available: rpcData, error: null };
  }

  const [usersRes, profilesRes, legacyProfilesRes] = await Promise.all([
    supabase
      .schema('user')
      .from('users')
      .select('user_id')
      .eq('username', desired)
      .limit(1)
      .maybeSingle(),
    supabase
      .schema('public')
      .from('profiles')
      .select('id')
      .eq('username', desired)
      .limit(1)
      .maybeSingle(),
    supabase
      .from('profiles_stub')
      .select('user_id')
      .eq('username', desired)
      .limit(1)
      .maybeSingle(),
  ]);

  const fatalFallbackError =
    (!usersRes.error || canIgnoreUsernameSourceError(usersRes.error) ? null : usersRes.error) ??
    (!profilesRes.error || canIgnoreUsernameSourceError(profilesRes.error)
      ? null
      : profilesRes.error) ??
    (!legacyProfilesRes.error || canIgnoreUsernameSourceError(legacyProfilesRes.error)
      ? null
      : legacyProfilesRes.error);

  if (fatalFallbackError) {
    return { available: null, error: fatalFallbackError };
  }

  if (usersRes.data || profilesRes.data || legacyProfilesRes.data) {
    return { available: false, error: null };
  }

  const hadReadableFallbackSource =
    !usersRes.error || !profilesRes.error || !legacyProfilesRes.error;

  if (hadReadableFallbackSource) {
    return { available: true, error: null };
  }

  return { available: null, error: rpcError ?? legacyProfilesRes.error ?? profilesRes.error ?? usersRes.error };
}
