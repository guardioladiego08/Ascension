// lib/social.ts
import { supabase } from '@/lib/supabase';
import { formatSupabaseishError, normalizeThrown } from './errors';

const SOCIAL_SCHEMA = 'social';
const FOLLOWS_TABLE = 'follows'; // follower_id, followee_id
const POSTS_TABLE = 'posts';     // user_id

function toCount(n: number | null | undefined) {
  return typeof n === 'number' && Number.isFinite(n) ? n : 0;
}

export async function getFollowCounts(userId: string): Promise<{ followers: number; following: number }> {
  if (!userId) return { followers: 0, following: 0 };

  const followersQ = supabase
    .schema(SOCIAL_SCHEMA)
    .from(FOLLOWS_TABLE)
    .select('*', { head: true, count: 'exact' })
    .eq('followee_id', userId)
    .eq('status', 'accepted');

  const followingQ = supabase
    .schema(SOCIAL_SCHEMA)
    .from(FOLLOWS_TABLE)
    .select('*', { head: true, count: 'exact' })
    .eq('follower_id', userId)
    .eq('status', 'accepted');

  const [followersRes, followingRes] = await Promise.all([followersQ, followingQ]);

  if (followersRes.error) throw normalizeThrown(followersRes.error, formatSupabaseishError(followersRes.error));
  if (followingRes.error) throw normalizeThrown(followingRes.error, formatSupabaseishError(followingRes.error));

  return {
    followers: toCount(followersRes.count),
    following: toCount(followingRes.count),
  };
}

export async function tryGetPostCount(userId: string): Promise<number> {
  if (!userId) return 0;

  const { count, error } = await supabase
    .schema(SOCIAL_SCHEMA)
    .from(POSTS_TABLE)
    .select('*', { head: true, count: 'exact' })
    .eq('user_id', userId);

  if (error) throw normalizeThrown(error, formatSupabaseishError(error));
  return toCount(count);
}
