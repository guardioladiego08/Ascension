// lib/social/api.ts
import { supabase } from '@/lib/supabase';

export type PublicProfile = {
  id: string; // Canonical: public.profiles.id (auth uid)
  username: string;
  display_name: string;
  profile_image_url: string | null;
  bio: string | null;
  is_private: boolean;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type FollowStatus = 'none' | 'requested' | 'accepted';

export async function getMyUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data?.user?.id) throw new Error('Not signed in');
  return data.user.id;
}

/**
 * Normalize whatever your RPC returns into a strict PublicProfile.
 * IMPORTANT: we try to prefer auth uid when present (commonly `user_id`).
 */
function normalizeProfileRow(r: any): PublicProfile {
  // Common patterns from RPCs:
  // - r.id might be profile_row_id OR auth uid depending on your function
  // - r.user_id / r.auth_user_id might hold auth uid
  const id =
    r?.user_id ??
    r?.auth_user_id ??
    r?.profile_user_id ??
    r?.id ??
    r?.profile_row_id;

  return {
    id: String(id ?? ''),
    username: String(r?.username ?? ''),
    display_name: String(r?.display_name ?? ''),
    profile_image_url: (r?.profile_image_url ?? null) as string | null,
    bio: (r?.bio ?? null) as string | null,
    is_private: Boolean(r?.is_private),
  };
}

/**
 * Resolve a profile by ANY of:
 * - profiles.id (auth uid)
 * - profiles.profile_row_id
 * - username
 *
 * This removes the "User not found" problem even if search passes profile_row_id.
 */
export async function getPublicProfileByUserId(userId: string): Promise<PublicProfile | null> {
  const key = (userId ?? '').trim();
  if (!key) return null;

  // 1) Try your existing RPC first (keep it if it works / has SECURITY DEFINER)
  try {
    const { data, error } = await supabase.rpc('get_profile_card', { p_id: key });
    if (error) throw error;

    const row = Array.isArray(data) ? data[0] : data;
    if (row) return normalizeProfileRow(row);
  } catch {
    // swallow and fall back to direct query
  }

  // 2) Fallback: direct table lookup (works regardless of what search passes)
  const isUuid = UUID_RE.test(key);

  let q = supabase
    .from('profiles')
    .select('id, profile_row_id, username, display_name, profile_image_url, bio, is_private')
    .limit(1);

  if (isUuid) {
    // match either id or profile_row_id
    q = q.or(`id.eq.${key},profile_row_id.eq.${key}`);
  } else {
    q = q.eq('username', key.toLowerCase());
  }

  const { data, error } = await q.maybeSingle();
  if (error) throw error;
  if (!data) return null;

  // Force canonical id to auth uid
  return {
    id: String((data as any).id),
    username: String((data as any).username ?? ''),
    display_name: String((data as any).display_name ?? ''),
    profile_image_url: ((data as any).profile_image_url ?? null) as string | null,
    bio: ((data as any).bio ?? null) as string | null,
    is_private: Boolean((data as any).is_private),
  };
}

export async function searchProfiles(query: string, limit = 25): Promise<PublicProfile[]> {
  const q = query.trim();
  if (!q) return [];

  const { data, error } = await supabase.rpc('search_profiles', {
    p_query: q,
    p_limit: limit,
  });

  if (error) throw error;

  // Normalize results so `item.id` is usable for navigation
  return (data ?? []).map(normalizeProfileRow);
}

export async function getFollowStatus(meId: string, otherId: string): Promise<FollowStatus> {
  const { data, error } = await supabase
    .schema('social')
    .from('follows')
    .select('status')
    .eq('follower_id', meId)
    .eq('followee_id', otherId)
    .maybeSingle();

  if (error) {
    // If table not created yet, behave as "none"
    return 'none';
  }
  return (data?.status as FollowStatus) ?? 'none';
}

export async function followOrRequest(meId: string, otherId: string, isPrivate: boolean) {
  const status: FollowStatus = isPrivate ? 'requested' : 'accepted';
  const { error } = await supabase
    .schema('social')
    .from('follows')
    .upsert(
      { follower_id: meId, followee_id: otherId, status },
      { onConflict: 'follower_id,followee_id' }
    );
  if (error) throw error;
}

export async function unfollowOrCancel(meId: string, otherId: string) {
  const { error } = await supabase
    .schema('social')
    .from('follows')
    .delete()
    .eq('follower_id', meId)
    .eq('followee_id', otherId);
  if (error) throw error;
}

export async function listInboundRequests(meId: string) {
  const { data, error } = await supabase
    .schema('social')
    .from('follows')
    .select('follower_id, created_at')
    .eq('followee_id', meId)
    .eq('status', 'requested')
    .order('created_at', { ascending: false });

  if (error) return [];
  return data ?? [];
}

export async function acceptRequest(meId: string, followerId: string) {
  const { error } = await supabase
    .schema('social')
    .from('follows')
    .update({ status: 'accepted' })
    .eq('followee_id', meId)
    .eq('follower_id', followerId);
  if (error) throw error;
}

export async function declineRequest(meId: string, followerId: string) {
  const { error } = await supabase
    .schema('social')
    .from('follows')
    .delete()
    .eq('followee_id', meId)
    .eq('follower_id', followerId);
  if (error) throw error;
}
