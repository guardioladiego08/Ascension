// lib/auth.ts
import { supabase } from '@/lib/supabase';
import { formatSupabaseishError, normalizeThrown } from './errors';

export async function requireAuthedUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();

  if (error) throw normalizeThrown(error, formatSupabaseishError(error));

  const id = data?.user?.id;
  if (!id) throw new Error('Not signed in');
  return id;
}
