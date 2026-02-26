import { supabase } from '@/lib/supabase';

export type SocialActivityType = 'run' | 'walk' | 'ride' | 'strength' | 'nutrition' | 'other';
export type PostVisibility = 'public' | 'followers' | 'private';

export type SocialCounts = {
  posts: number;
  followers: number;
  following: number;
};

export type SocialFeedPost = {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  profileImageUrl: string | null;
  activityType: SocialActivityType;
  title: string | null;
  subtitle: string | null;
  caption: string | null;
  visibility: PostVisibility;
  createdAt: string;
  metrics: Record<string, number | string | null>;
  likeCount: number;
  commentCount: number;
  isLikedByMe: boolean;
};

function asInt(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value ?? 0);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.trunc(n));
}

function normalizeMetrics(value: unknown): Record<string, number | string | null> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};

  const obj = value as Record<string, unknown>;
  const out: Record<string, number | string | null> = {};

  for (const [k, v] of Object.entries(obj)) {
    if (v == null || typeof v === 'string' || typeof v === 'number') {
      out[k] = v as string | number | null;
      continue;
    }

    if (typeof v === 'boolean') {
      out[k] = v ? 1 : 0;
      continue;
    }

    out[k] = String(v);
  }

  return out;
}

function isMissingDbObject(error: any): boolean {
  if (!error) return false;
  const code = String(error?.code ?? '');
  const msg = String(error?.message ?? '').toLowerCase();
  return (
    code === '42P01' ||
    code === '3F000' ||
    code === '42703' ||
    code === 'PGRST106' ||
    msg.includes('does not exist') ||
    msg.includes('undefined column') ||
    msg.includes('schema must be one of the following')
  );
}

function coerceActivityType(value: unknown): SocialActivityType {
  const v = String(value ?? '').toLowerCase();
  if (v === 'run') return 'run';
  if (v === 'walk') return 'walk';
  if (v === 'ride' || v === 'bike' || v === 'cycle') return 'ride';
  if (v === 'strength') return 'strength';
  if (v === 'nutrition') return 'nutrition';
  return 'other';
}

function coerceVisibility(value: unknown): PostVisibility {
  const v = String(value ?? '').toLowerCase();
  if (v === 'public') return 'public';
  if (v === 'private') return 'private';
  return 'followers';
}

function fallbackUsername(userId: string): string {
  return `user_${String(userId).slice(0, 8)}`;
}

export async function getSocialCounts(userId: string): Promise<SocialCounts> {
  if (!userId) return { posts: 0, followers: 0, following: 0 };

  const rpcRes = await supabase.rpc('get_profile_stats_user', { p_user_id: userId });
  if (!rpcRes.error) {
    const row = Array.isArray(rpcRes.data) ? rpcRes.data[0] : rpcRes.data;
    return {
      posts: asInt((row as any)?.posts),
      followers: asInt((row as any)?.followers),
      following: asInt((row as any)?.following),
    };
  }
  if (isMissingDbObject(rpcRes.error)) return { posts: 0, followers: 0, following: 0 };
  throw rpcRes.error;
}

export async function getSocialFeedPage(args: {
  offset?: number;
  limit?: number;
  activityType?: SocialActivityType | null;
}): Promise<SocialFeedPost[]> {
  const offset = Math.max(0, Math.trunc(args.offset ?? 0));
  const limit = Math.max(1, Math.min(50, Math.trunc(args.limit ?? 20)));
  const postsRes = await supabase.rpc('get_feed_user', {
    p_limit: limit,
    p_offset: offset,
    p_activity_type: args.activityType ?? null,
  });
  if (isMissingDbObject(postsRes.error)) return [];
  if (postsRes.error) throw postsRes.error;

  const postRows = (postsRes.data ?? []) as any[];
  if (postRows.length === 0) return [];

  const ownerIds = Array.from(new Set(postRows.map((r) => String(r.user_id)).filter(Boolean)));

  const [profilesRes, usersRes] = await Promise.all([
    supabase
      .schema('public')
      .from('profiles')
      .select('id, username, display_name, profile_image_url')
      .in('id', ownerIds),
    supabase
      .schema('user')
      .from('users')
      .select('user_id, username, first_name, last_name, profile_image_url')
      .in('user_id', ownerIds),
  ]);

  const profileMap = new Map<
    string,
    { username: string | null; display_name: string | null; profile_image_url: string | null }
  >();
  const userMap = new Map<
    string,
    { username: string | null; first_name: string | null; last_name: string | null; profile_image_url: string | null }
  >();

  if (!profilesRes.error) {
    for (const row of (profilesRes.data ?? []) as any[]) {
      profileMap.set(String(row.id), {
        username: (row.username ?? null) as string | null,
        display_name: (row.display_name ?? null) as string | null,
        profile_image_url: (row.profile_image_url ?? null) as string | null,
      });
    }
  }

  if (!usersRes.error) {
    for (const row of (usersRes.data ?? []) as any[]) {
      userMap.set(String(row.user_id), {
        username: (row.username ?? null) as string | null,
        first_name: (row.first_name ?? null) as string | null,
        last_name: (row.last_name ?? null) as string | null,
        profile_image_url: (row.profile_image_url ?? null) as string | null,
      });
    }
  }

  const postIds = postRows.map((r) => String(r.id));

  const likesRes = await supabase.rpc('get_liked_post_ids_user', {
    p_post_ids: postIds,
  });

  const likedSet = new Set<string>();
  if (!likesRes.error) {
    for (const row of likesRes.data ?? []) {
      likedSet.add(String((row as any).post_id));
    }
  }

  return postRows.map((row) => {
    const ownerId = String(row.user_id);
    const profile = profileMap.get(ownerId);
    const user = userMap.get(ownerId);

    const firstLast = [user?.first_name ?? '', user?.last_name ?? '']
      .filter((s) => s && String(s).trim().length > 0)
      .join(' ')
      .trim();

    const username =
      profile?.username?.trim() || user?.username?.trim() || fallbackUsername(ownerId);

    const displayName =
      profile?.display_name?.trim() || firstLast || username;

    const profileImageUrl = profile?.profile_image_url ?? user?.profile_image_url ?? null;

    return {
      id: String(row.id),
      userId: ownerId,
      username,
      displayName,
      profileImageUrl,
      activityType: coerceActivityType(row.activity_type),
      title: row.title == null ? null : String(row.title),
      subtitle: row.subtitle == null ? null : String(row.subtitle),
      caption: row.caption == null ? null : String(row.caption),
      visibility: coerceVisibility(row.visibility),
      createdAt: String(row.created_at),
      metrics: normalizeMetrics(row.metrics),
      likeCount: asInt(row.like_count),
      commentCount: asInt(row.comment_count),
      isLikedByMe: likedSet.has(String(row.id)),
    } satisfies SocialFeedPost;
  });
}

export async function togglePostLike(postId: string, currentlyLiked: boolean): Promise<void> {
  if (!postId) return;

  if (currentlyLiked) {
    const { error } = await supabase.rpc('unlike_post_user', {
      p_post_id: postId,
    });
    if (error && !isMissingDbObject(error)) throw error;
    return;
  }

  const { error } = await supabase.rpc('like_post_user', {
    p_post_id: postId,
  });

  if (!error) return;
  if (error.code === '23505') return;
  if (isMissingDbObject(error)) return;
  throw error;
}

function mapRunWalkExerciseTypeToActivityType(exerciseType: string): SocialActivityType {
  const v = String(exerciseType ?? '').toLowerCase();
  if (v.includes('walk')) return 'walk';
  if (v.includes('bike') || v.includes('cycle') || v.includes('ride')) return 'ride';
  return 'run';
}

function buildRunWalkTitle(activityType: SocialActivityType): string {
  if (activityType === 'walk') return 'Indoor Walk';
  if (activityType === 'ride') return 'Indoor Ride';
  return 'Indoor Run';
}

export async function shareRunWalkSessionToFeed(args: {
  sessionId: string;
  exerciseType: string;
  totalDistanceM: number;
  totalTimeS: number;
  avgPaceSPerMi: number | null;
  avgPaceSPerKm: number | null;
  caption?: string | null;
  visibility?: PostVisibility;
}): Promise<string> {
  const activityType = mapRunWalkExerciseTypeToActivityType(args.exerciseType);
  const visibility = args.visibility ?? 'followers';

  const metrics = {
    distance_m: Number.isFinite(args.totalDistanceM) ? args.totalDistanceM : 0,
    total_time_s: Number.isFinite(args.totalTimeS) ? args.totalTimeS : 0,
    avg_pace_s_per_mi:
      args.avgPaceSPerMi != null && Number.isFinite(args.avgPaceSPerMi)
        ? args.avgPaceSPerMi
        : null,
    avg_pace_s_per_km:
      args.avgPaceSPerKm != null && Number.isFinite(args.avgPaceSPerKm)
        ? args.avgPaceSPerKm
        : null,
  };

  const { data, error } = await supabase.rpc('share_run_walk_session_user', {
    p_session_id: args.sessionId,
    p_activity_type: activityType,
    p_title: buildRunWalkTitle(activityType),
    p_subtitle: 'Run/Walk Session',
    p_caption: args.caption?.trim() ? args.caption.trim() : null,
    p_visibility: visibility,
    p_metrics: metrics,
  });

  if (error) throw error;
  return String(data);
}
