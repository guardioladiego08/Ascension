import { supabase } from '@/lib/supabase';

export const USER_PREFERENCES_SCHEMA = 'user';
export const USER_PREFERENCES_TABLE = 'user_preferences';

export async function getAuthenticatedUserId(options?: {
  required?: boolean;
}): Promise<string | null> {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) throw error;

  const userId = session?.user?.id ?? null;
  if (!userId && options?.required) {
    throw new Error('Not signed in');
  }

  return userId;
}

export async function getCurrentUserPreferencesRow<T extends Record<string, unknown>>(
  select: string
): Promise<T | null> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return null;

  const { data, error } = await supabase
    .schema(USER_PREFERENCES_SCHEMA)
    .from(USER_PREFERENCES_TABLE)
    .select(select)
    .eq('user_id', userId)
    .maybeSingle<T>();

  if (error) throw error;
  return data;
}

export async function upsertCurrentUserPreferences(
  patch: Record<string, unknown>,
  options?: { requireAuth?: boolean }
): Promise<boolean> {
  const userId = await getAuthenticatedUserId({
    required: options?.requireAuth,
  });

  if (!userId) return false;

  const { error } = await supabase
    .schema(USER_PREFERENCES_SCHEMA)
    .from(USER_PREFERENCES_TABLE)
    .upsert({ user_id: userId, ...patch }, { onConflict: 'user_id' });

  if (error) throw error;
  return true;
}
