import { supabase } from '@/lib/supabase';

export type DbProfile = {
  id: string;
  username: string;
  display_name: string;
  bio: string | null;
  profile_image_url: string | null;
  is_private: boolean;
};

export type FollowRow = {
  follower_id: string;
  followee_id: string;
  status: 'pending' | 'accepted';
  created_at?: string;
  accepted_at?: string | null;
};

export async function getAuthedUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data?.user?.id) throw new Error('Not signed in');
  return data.user.id;
}

export async function getProfileByUserId(userId: string): Promise<DbProfile | null> {
  const { data, error } = await supabase
    .schema('public')
    .from('profiles')
    .select('id, username, display_name, bio, profile_image_url, is_private')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  return (data as any) ?? null;
}

export async function searchProfiles(q: string, limit = 20): Promise<DbProfile[]> {
  const query = q.trim();
  if (!query) return [];

  const { data, error } = await supabase
    .schema('public')
    .from('profiles')
    .select('id, username, display_name, bio, profile_image_url, is_private')
    .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
    .limit(limit);

  if (error) throw error;
  return (data as any[]) ?? [];
}

export async function getFollowEdge(meId: string, targetId: string): Promise<FollowRow | null> {
  const { data, error } = await supabase
    .schema('social')
    .from('follows')
    .select('follower_id, followee_id, status, created_at, accepted_at')
    .eq('follower_id', meId)
    .eq('followee_id', targetId)
    .maybeSingle();

  if (error) throw error;
  return (data as any) ?? null;
}

export async function followOrRequest(meId: string, target: DbProfile): Promise<void> {
  const desiredStatus: FollowRow['status'] = target.is_private ? 'pending' : 'accepted';

  const { error } = await supabase
    .schema('social')
    .from('follows')
    .upsert(
      {
        follower_id: meId,
        followee_id: target.id,
        status: desiredStatus,
        accepted_at: desiredStatus === 'accepted' ? new Date().toISOString() : null,
      },
      { onConflict: 'follower_id,followee_id' }
    );

  if (error) throw error;
}

export async function unfollowOrCancel(meId: string, targetId: string): Promise<void> {
  const { error } = await supabase
    .schema('social')
    .from('follows')
    .delete()
    .eq('follower_id', meId)
    .eq('followee_id', targetId);

  if (error) throw error;
}

export async function acceptIncomingRequest(meId: string, followerId: string): Promise<void> {
  const { error } = await supabase
    .schema('social')
    .from('follows')
    .update({ status: 'accepted', accepted_at: new Date().toISOString() })
    .eq('follower_id', followerId)
    .eq('followee_id', meId)
    .eq('status', 'pending');

  if (error) throw error;
}

export async function declineIncomingRequest(meId: string, followerId: string): Promise<void> {
  const { error } = await supabase
    .schema('social')
    .from('follows')
    .delete()
    .eq('follower_id', followerId)
    .eq('followee_id', meId)
    .eq('status', 'pending');

  if (error) throw error;
}

export async function getFollowCounts(userId: string): Promise<{ followers: number; following: number }> {
  const followersRes = await supabase
    .schema('social')
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('followee_id', userId)
    .eq('status', 'accepted');

  if (followersRes.error) throw followersRes.error;

  const followingRes = await supabase
    .schema('social')
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('follower_id', userId)
    .eq('status', 'accepted');

  if (followingRes.error) throw followingRes.error;

  return {
    followers: followersRes.count ?? 0,
    following: followingRes.count ?? 0,
  };
}

export async function tryGetPostCount(userId: string): Promise<number> {
  // If social.posts doesn’t exist yet, fail gracefully.
  const res = await supabase
    .schema('social')
    .from('posts')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (res.error) return 0;
  return res.count ?? 0;
}
