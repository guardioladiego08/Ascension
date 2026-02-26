// lib/social/api.ts
import { supabase } from '@/lib/supabase';

export type PublicProfile = {
  id: string; // Canonical: user.users.user_id (auth uid)
  username: string;
  display_name: string;
  profile_image_url: string | null;
  bio: string | null;
  is_private: boolean;
};

export type FollowStatus = 'none' | 'requested' | 'accepted';

export type ConnectionProfile = {
  id: string;
  username: string;
  display_name: string;
  profile_image_url: string | null;
  is_private: boolean;
  followed_at: string | null;
};

export async function getMyUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data?.user?.id) throw new Error('Not signed in');
  return data.user.id;
}

function isRpcUnavailableError(error: any): boolean {
  if (!error) return false;
  const code = String(error?.code ?? '');
  const msg = String(error?.message ?? '').toLowerCase();
  return (
    code === 'PGRST202' ||
    code === 'PGRST204' ||
    msg.includes('could not find the function') ||
    msg.includes('schema cache')
  );
}

function isRpcAmbiguousOverloadError(error: any): boolean {
  if (!error) return false;
  const code = String(error?.code ?? '');
  const msg = String(error?.message ?? '').toLowerCase();
  return code === 'PGRST203' || (msg.includes('could not choose the best candidate function') && msg.includes('get_profile_card'));
}

function isMissingColumnError(error: any, column: string): boolean {
  if (!error) return false;
  const code = String(error?.code ?? '');
  const msg = `${error?.message ?? ''} ${error?.details ?? ''} ${error?.hint ?? ''}`.toLowerCase();
  const col = column.toLowerCase();
  return code === '42703' || (msg.includes('column') && msg.includes(col)) || (msg.includes('schema cache') && msg.includes(col));
}

function parseFollowStatus(rawValue: any): FollowStatus {
  const raw = String(rawValue ?? '').toLowerCase();
  if (raw === 'accepted') return 'accepted';
  if (raw === 'requested' || raw === 'pending') return 'requested';
  return 'none';
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

  const username = String(r?.username ?? '').trim();
  const composedDisplay = [r?.first_name ?? '', r?.last_name ?? '']
    .filter((v: string) => String(v).trim().length > 0)
    .join(' ')
    .trim();
  const displayName = String(r?.display_name ?? composedDisplay).trim() || username;

  return {
    id: String(id ?? ''),
    username,
    display_name: displayName,
    profile_image_url: (r?.profile_image_url ?? null) as string | null,
    bio: (r?.bio ?? null) as string | null,
    is_private: Boolean(r?.is_private),
  };
}

function hasUsableProfile(p: PublicProfile | null | undefined): p is PublicProfile {
  if (!p) return false;
  return String(p.id ?? '').trim().length > 0 && String(p.username ?? '').trim().length > 0;
}

function dedupeProfiles(rows: PublicProfile[]): PublicProfile[] {
  const out: PublicProfile[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const id = String(row.id ?? '').trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(row);
  }
  return out;
}

function normalizeConnectionRow(r: any): ConnectionProfile {
  const normalized = normalizeProfileRow(r);
  return {
    id: normalized.id,
    username: String(normalized.username ?? '').trim(),
    display_name: String(normalized.display_name ?? '').trim() || String(normalized.username ?? '').trim(),
    profile_image_url: normalized.profile_image_url,
    is_private: Boolean(normalized.is_private),
    followed_at: r?.followed_at ? String(r.followed_at) : null,
  };
}

/**
 * Resolve a profile from user.users by:
 * - user_id (auth uid)
 * - username
 */
export async function getPublicProfileByUserId(userId: string): Promise<PublicProfile | null> {
  const key = (userId ?? '').trim();
  if (!key) return null;

  const rpcCandidates = ['get_profile_card_user', 'get_profile_card'] as const;
  let lastRpcError: any = null;

  for (const fn of rpcCandidates) {
    const { data, error } = await supabase.rpc(fn, { p_id: key });
    if (!error) {
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) return null;
      const normalized = normalizeProfileRow(row);
      return hasUsableProfile(normalized) ? normalized : null;
    }

    // Old overloaded get_profile_card(uuid/text) can throw this; try next path.
    if (isRpcAmbiguousOverloadError(error)) {
      lastRpcError = error;
      continue;
    }

    lastRpcError = error;
  }

  // Fallback direct read (only works if RLS allows select on user.users).
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  let q = supabase
    .schema('user')
    .from('users')
    .select('user_id, username, first_name, last_name, profile_image_url, bio, is_private')
    .limit(1);

  if (uuidRe.test(key)) {
    q = q.eq('user_id', key);
  } else {
    q = q.ilike('username', key);
  }

  const { data, error } = await q.maybeSingle();
  if (error) throw lastRpcError ?? error;
  if (!data) return null;
  const normalized = normalizeProfileRow(data);
  return hasUsableProfile(normalized) ? normalized : null;
}

export async function searchProfiles(query: string, limit = 25): Promise<PublicProfile[]> {
  const q = query.trim();
  if (!q) return [];

  const rpcCandidates = ['search_profiles_user', 'search_profiles'] as const;
  let lastRpcError: any = null;

  for (const fn of rpcCandidates) {
    const { data, error } = await supabase.rpc(fn, { p_query: q, p_limit: limit });
    if (!error) {
      const normalized = (data ?? []).map(normalizeProfileRow).filter(hasUsableProfile);
      return dedupeProfiles(normalized).slice(0, limit);
    }
    lastRpcError = error;
  }

  // Fallback direct read (only if RLS allows)
  const usersRes = await supabase
    .schema('user')
    .from('users')
    .select('user_id, username, first_name, last_name, profile_image_url, bio, is_private')
    .ilike('username', `%${q}%`)
    .not('username', 'is', null)
    .limit(limit);

  if (usersRes.error) throw lastRpcError ?? usersRes.error;

  const normalized = (usersRes.data ?? []).map(normalizeProfileRow).filter(hasUsableProfile);
  return dedupeProfiles(normalized).slice(0, limit);
}

export async function listFollowers(
  userId: string,
  limit = 100,
  offset = 0
): Promise<ConnectionProfile[]> {
  const { data, error } = await supabase.rpc('list_followers_user', {
    p_user_id: userId,
    p_limit: limit,
    p_offset: offset,
  });
  if (error) throw error;
  return (data ?? []).map(normalizeConnectionRow);
}

export async function listFollowing(
  userId: string,
  limit = 100,
  offset = 0
): Promise<ConnectionProfile[]> {
  const { data, error } = await supabase.rpc('list_following_user', {
    p_user_id: userId,
    p_limit: limit,
    p_offset: offset,
  });
  if (error) throw error;
  return (data ?? []).map(normalizeConnectionRow);
}

export async function getFollowStatus(meId: string, otherId: string): Promise<FollowStatus> {
  const rpcRes = await supabase.rpc('get_follow_status_user', {
    p_target_id: otherId,
  });
  if (!rpcRes.error) return parseFollowStatus(rpcRes.data);

  const { data, error } = await supabase
    .schema('social')
    .from('follows')
    .select('status')
    .eq('follower_id', meId)
    .eq('followee_id', otherId)
    .maybeSingle();

  if (error && isMissingColumnError(error, 'followee_id')) {
    const legacyRes = await supabase
      .schema('social')
      .from('follows')
      .select('status')
      .eq('follower_id', meId)
      .eq('following_id', otherId)
      .maybeSingle();

    if (legacyRes.error) return 'none';
    return parseFollowStatus((legacyRes.data as any)?.status);
  }

  if (error) {
    // If table not created yet, behave as "none"
    return 'none';
  }
  return parseFollowStatus((data as any)?.status);
}

export async function followOrRequest(meId: string, otherId: string, isPrivate: boolean) {
  const rpcRes = await supabase.rpc('follow_user', {
    p_followee_id: otherId,
  });
  if (!rpcRes.error) return;
  if (!isRpcUnavailableError(rpcRes.error)) throw rpcRes.error;

  const status = isPrivate ? 'pending' : 'accepted';
  const followeeRes = await supabase
    .schema('social')
    .from('follows')
    .upsert(
      { follower_id: meId, followee_id: otherId, status },
      { onConflict: 'follower_id,followee_id' }
    );
  if (!followeeRes.error) return;

  if (isMissingColumnError(followeeRes.error, 'followee_id')) {
    const legacyRes = await supabase
      .schema('social')
      .from('follows')
      .upsert(
        { follower_id: meId, following_id: otherId, status } as any,
        { onConflict: 'follower_id,following_id' }
      );
    if (legacyRes.error) throw legacyRes.error;
    return;
  }

  throw followeeRes.error;
}

export async function unfollowOrCancel(meId: string, otherId: string) {
  const rpcRes = await supabase.rpc('unfollow_user', {
    p_followee_id: otherId,
  });
  if (!rpcRes.error) return;
  if (!isRpcUnavailableError(rpcRes.error)) throw rpcRes.error;

  const followeeRes = await supabase
    .schema('social')
    .from('follows')
    .delete()
    .eq('follower_id', meId)
    .eq('followee_id', otherId);
  if (!followeeRes.error) return;

  if (isMissingColumnError(followeeRes.error, 'followee_id')) {
    const legacyRes = await supabase
      .schema('social')
      .from('follows')
      .delete()
      .eq('follower_id', meId)
      .eq('following_id', otherId);
    if (legacyRes.error) throw legacyRes.error;
    return;
  }

  throw followeeRes.error;
}

export async function listInboundRequests(meId: string) {
  const rpcRes = await supabase.rpc('list_inbound_follow_requests_user', {
    p_limit: 100,
    p_offset: 0,
  });
  if (!rpcRes.error) return rpcRes.data ?? [];

  const followeeRes = await supabase
    .schema('social')
    .from('follows')
    .select('follower_id, created_at')
    .eq('followee_id', meId)
    .in('status', ['requested', 'pending'])
    .order('created_at', { ascending: false });

  if (!followeeRes.error) return followeeRes.data ?? [];

  if (isMissingColumnError(followeeRes.error, 'followee_id')) {
    const legacyRes = await supabase
      .schema('social')
      .from('follows')
      .select('follower_id, created_at')
      .eq('following_id', meId)
      .in('status', ['requested', 'pending'])
      .order('created_at', { ascending: false });
    if (legacyRes.error) return [];
    return legacyRes.data ?? [];
  }

  return [];
}

export async function acceptRequest(meId: string, followerId: string) {
  const rpcRes = await supabase.rpc('accept_follow_request_user', {
    p_follower_id: followerId,
  });
  if (!rpcRes.error) return;
  if (!isRpcUnavailableError(rpcRes.error)) throw rpcRes.error;

  const followeeRes = await supabase
    .schema('social')
    .from('follows')
    .update({ status: 'accepted' })
    .eq('followee_id', meId)
    .eq('follower_id', followerId)
    .in('status', ['requested', 'pending']);
  if (!followeeRes.error) return;

  if (isMissingColumnError(followeeRes.error, 'followee_id')) {
    const legacyRes = await supabase
      .schema('social')
      .from('follows')
      .update({ status: 'accepted' })
      .eq('following_id', meId)
      .eq('follower_id', followerId)
      .in('status', ['requested', 'pending']);
    if (legacyRes.error) throw legacyRes.error;
    return;
  }

  throw followeeRes.error;
}

export async function declineRequest(meId: string, followerId: string) {
  const rpcRes = await supabase.rpc('decline_follow_request_user', {
    p_follower_id: followerId,
  });
  if (!rpcRes.error) return;
  if (!isRpcUnavailableError(rpcRes.error)) throw rpcRes.error;

  const followeeRes = await supabase
    .schema('social')
    .from('follows')
    .delete()
    .eq('followee_id', meId)
    .eq('follower_id', followerId)
    .in('status', ['requested', 'pending']);
  if (!followeeRes.error) return;

  if (isMissingColumnError(followeeRes.error, 'followee_id')) {
    const legacyRes = await supabase
      .schema('social')
      .from('follows')
      .delete()
      .eq('following_id', meId)
      .eq('follower_id', followerId)
      .in('status', ['requested', 'pending']);
    if (legacyRes.error) throw legacyRes.error;
    return;
  }

  throw followeeRes.error;
}
