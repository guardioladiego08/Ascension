import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

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
  sourceType: string | null;
  sourceId: string | null;
  sessionId: string | null;
  title: string | null;
  subtitle: string | null;
  caption: string | null;
  visibility: PostVisibility;
  createdAt: string;
  metrics: Record<string, number | string | null>;
  mediaUrls: string[];
  likeCount: number;
  commentCount: number;
  isLikedByMe: boolean;
};

export type SocialPostLike = {
  userId: string;
  username: string;
  displayName: string;
  profileImageUrl: string | null;
  createdAt: string;
};

export type SocialPostComment = {
  id: string;
  postId: string;
  userId: string;
  username: string;
  displayName: string;
  profileImageUrl: string | null;
  parentCommentId: string | null;
  body: string;
  createdAt: string;
  updatedAt: string;
  canDelete: boolean;
};

type SocialUserSummary = {
  userId: string;
  username: string;
  displayName: string;
  profileImageUrl: string | null;
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

function normalizeMediaUrls(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((v) => String(v ?? '').trim())
      .filter((v) => v.length > 0);
  }

  const single = String(value ?? '').trim();
  return single ? [single] : [];
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

function isAuthSessionError(error: any): boolean {
  if (!error) return false;
  const code = String(error?.code ?? '').toUpperCase();
  const msg = String(error?.message ?? '').toLowerCase();
  return (
    code === 'PGRST301' ||
    code === 'PGRST302' ||
    msg.includes('jwt') ||
    msg.includes('token') ||
    msg.includes('not authenticated') ||
    msg.includes('unauthorized')
  );
}

function isOnConflictConstraintError(error: any): boolean {
  if (!error) return false;
  const code = String(error?.code ?? '');
  const msg = String(error?.message ?? '').toLowerCase();
  return code === '42P10' || msg.includes('no unique or exclusion constraint');
}

function asUuidOrNull(value: unknown): string | null {
  const v = String(value ?? '').trim();
  if (!v) return null;
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRe.test(v) ? v : null;
}

function stableUuidFromRef(value: string): string {
  const ref = String(value ?? '').trim();
  if (!ref) return uuidv4();

  const bytes = new Uint8Array(16);
  let seed = 0x811c9dc5;

  for (let i = 0; i < 16; i++) {
    const charCode = ref.charCodeAt(i % ref.length);
    seed ^= charCode + i * 131;
    seed = Math.imul(seed, 0x01000193);
    bytes[i] = (seed >>> 24) & 0xff;
  }

  // RFC4122 variant/version bits
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const h = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

async function getAuthedUserIdWithRefresh(): Promise<string> {
  const first = await supabase.auth.getUser();
  if (!first.error && first.data.user?.id) return first.data.user.id;

  await supabase.auth.refreshSession();

  const second = await supabase.auth.getUser();
  if (second.error) throw second.error;
  if (!second.data.user?.id) throw new Error('Not authenticated');
  return second.data.user.id;
}

async function shareSessionViaRpc(args: {
  sessionId: string;
  activityType: SocialActivityType;
  title: string;
  subtitle: string;
  caption?: string | null;
  visibility: PostVisibility;
  metrics: Record<string, unknown>;
}): Promise<{ data: any; error: any }> {
  const payload = {
    p_session_id: args.sessionId,
    p_activity_type: args.activityType,
    p_title: args.title,
    p_subtitle: args.subtitle,
    p_caption: args.caption?.trim() ? args.caption.trim() : null,
    p_visibility: args.visibility,
    p_metrics: args.metrics,
  };

  let rpcRes = await supabase.rpc('share_run_walk_session_user', payload);
  if (!rpcRes.error) return rpcRes;

  if (isAuthSessionError(rpcRes.error)) {
    await supabase.auth.refreshSession();
    rpcRes = await supabase.rpc('share_run_walk_session_user', payload);
  }

  return rpcRes;
}

async function lookupExistingPostId(args: {
  userId: string;
  sourceType: string;
  sourceId: string;
}): Promise<string | null> {
  const res = await supabase
    .schema('social')
    .from('posts')
    .select('id')
    .eq('user_id', args.userId)
    .eq('source_type', args.sourceType)
    .eq('source_id', args.sourceId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (res.error || !res.data) return null;
  return String((res.data as any).id);
}

async function persistPostDirect(args: {
  sourceType: string;
  sourceId?: string | null;
  sessionId?: string | null;
  activityType: SocialActivityType;
  title: string;
  subtitle: string;
  caption?: string | null;
  visibility?: PostVisibility;
  metrics?: Record<string, unknown>;
}): Promise<string> {
  const userId = await getAuthedUserIdWithRefresh();
  const visibility = args.visibility ?? 'followers';

  const row = {
    user_id: userId,
    source_type: args.sourceType,
    source_id: args.sourceId ?? null,
    session_id: args.sessionId ?? null,
    activity_type: args.activityType,
    title: args.title,
    subtitle: args.subtitle,
    caption: args.caption?.trim() ? args.caption.trim() : null,
    visibility,
    metrics: args.metrics ?? {},
  };

  if (row.source_id) {
    const upsertRes = await supabase
      .schema('social')
      .from('posts')
      .upsert(row, { onConflict: 'user_id,source_type,source_id' })
      .select('id')
      .single();

    if (!upsertRes.error) return String((upsertRes.data as any).id);

    if (isOnConflictConstraintError(upsertRes.error)) {
      const insertRes = await supabase
        .schema('social')
        .from('posts')
        .insert(row)
        .select('id')
        .single();

      if (!insertRes.error) return String((insertRes.data as any).id);

      if (String(insertRes.error?.code ?? '') === '23505') {
        const existingId = await lookupExistingPostId({
          userId,
          sourceType: args.sourceType,
          sourceId: row.source_id,
        });
        if (existingId) return existingId;
      }

      throw insertRes.error;
    }

    if (String(upsertRes.error?.code ?? '') === '23505') {
      const existingId = await lookupExistingPostId({
        userId,
        sourceType: args.sourceType,
        sourceId: row.source_id,
      });
      if (existingId) return existingId;
    }

    throw upsertRes.error;
  }

  const insertRes = await supabase
    .schema('social')
    .from('posts')
    .insert(row)
    .select('id')
    .single();

  if (insertRes.error) throw insertRes.error;
  return String((insertRes.data as any).id);
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

function cleanIdentityText(value: unknown): string | null {
  const text = String(value ?? '').trim();
  return text.length > 0 ? text : null;
}

function cleanUsername(value: unknown): string | null {
  const raw = cleanIdentityText(value);
  if (!raw) return null;
  return raw.replace(/^@+/, '').trim() || null;
}

function isGenericIdentityLabel(value: string): boolean {
  const v = value.trim().toLowerCase();
  return v === 'user' || v === 'null' || v === 'undefined' || v === 'unknown';
}

async function fetchProfileCardMap(ownerIds: string[]): Promise<
  Map<string, { username: string | null; display_name: string | null; profile_image_url: string | null }>
> {
  const out = new Map<string, { username: string | null; display_name: string | null; profile_image_url: string | null }>();
  if (ownerIds.length === 0) return out;

  const uniqueIds = Array.from(new Set(ownerIds.map((v) => String(v ?? '').trim()).filter(Boolean)));
  if (uniqueIds.length === 0) return out;

  await Promise.all(
    uniqueIds.map(async (ownerId) => {
      let row: any = null;
      for (const fn of ['get_profile_card_user', 'get_profile_card'] as const) {
        const rpc = await supabase.rpc(fn, { p_id: ownerId });
        if (rpc.error) continue;
        row = Array.isArray(rpc.data) ? rpc.data[0] : rpc.data;
        if (row) break;
      }
      if (!row) return;

      const key = String((row as any).user_id ?? (row as any).id ?? ownerId);
      out.set(key, {
        username: ((row as any).username ?? null) as string | null,
        display_name: ((row as any).display_name ?? null) as string | null,
        profile_image_url: ((row as any).profile_image_url ?? null) as string | null,
      });
    })
  );

  return out;
}

async function resolveUserSummaryMap(ownerIds: string[]): Promise<Map<string, SocialUserSummary>> {
  const out = new Map<string, SocialUserSummary>();
  const uniqueIds = Array.from(new Set(ownerIds.map((v) => String(v ?? '').trim()).filter(Boolean)));
  if (uniqueIds.length === 0) return out;

  const [profilesRes, usersRes] = await Promise.all([
    supabase
      .schema('public')
      .from('profiles')
      .select('id, username, display_name, profile_image_url')
      .in('id', uniqueIds),
    supabase
      .schema('user')
      .from('users')
      .select('user_id, username, first_name, last_name, profile_image_url')
      .in('user_id', uniqueIds),
  ]);

  const profileMap = new Map<
    string,
    { username: string | null; display_name: string | null; profile_image_url: string | null }
  >();
  const userMap = new Map<
    string,
    {
      username: string | null;
      first_name: string | null;
      last_name: string | null;
      profile_image_url: string | null;
    }
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

  const needsProfileCard = uniqueIds.filter((ownerId) => {
    const profile = profileMap.get(ownerId);
    const user = userMap.get(ownerId);

    const candidateUsername =
      cleanUsername(user?.username) ??
      cleanUsername(profile?.username) ??
      null;
    const hasGoodUsername = !!candidateUsername && !isGenericIdentityLabel(candidateUsername);

    const hasHumanDisplay =
      !!cleanIdentityText(user?.first_name) ||
      !!cleanIdentityText(user?.last_name) ||
      !!cleanIdentityText(profile?.display_name);

    return !hasGoodUsername || !hasHumanDisplay;
  });

  const rpcProfileMap = await fetchProfileCardMap(needsProfileCard);

  for (const ownerId of uniqueIds) {
    const profile = profileMap.get(ownerId);
    const user = userMap.get(ownerId);
    const rpcProfile = rpcProfileMap.get(ownerId);

    const firstLast = [cleanIdentityText(user?.first_name), cleanIdentityText(user?.last_name)]
      .filter((s): s is string => Boolean(s))
      .join(' ')
      .trim();

    const candidateUsernames = [
      cleanUsername(rpcProfile?.username),
      cleanUsername(user?.username),
      cleanUsername(profile?.username),
    ].filter((v): v is string => Boolean(v));
    const preferredUsername =
      candidateUsernames.find((v) => !isGenericIdentityLabel(v)) ?? candidateUsernames[0] ?? null;
    const username = preferredUsername ?? fallbackUsername(ownerId);

    const profileDisplayName =
      cleanIdentityText(rpcProfile?.display_name) ?? cleanIdentityText(profile?.display_name);
    const preferredDisplayName =
      firstLast ||
      (profileDisplayName && !isGenericIdentityLabel(profileDisplayName) ? profileDisplayName : null) ||
      profileDisplayName ||
      username;

    out.set(ownerId, {
      userId: ownerId,
      username,
      displayName: preferredDisplayName,
      profileImageUrl:
        profile?.profile_image_url ?? user?.profile_image_url ?? rpcProfile?.profile_image_url ?? null,
    });
  }

  return out;
}

async function hydrateFeedPosts(postRows: any[]): Promise<SocialFeedPost[]> {
  if (postRows.length === 0) return [];

  const ownerIds = Array.from(new Set(postRows.map((r) => String(r.user_id)).filter(Boolean)));
  const postIds = postRows.map((r) => String(r.id));

  const [userSummaryMap, likesRes] = await Promise.all([
    resolveUserSummaryMap(ownerIds),
    supabase.rpc('get_liked_post_ids_user', {
      p_post_ids: postIds,
    }),
  ]);

  const likedSet = new Set<string>();
  if (!likesRes.error) {
    for (const row of likesRes.data ?? []) {
      likedSet.add(String((row as any).post_id));
    }
  }

  return postRows.map((row) => {
    const ownerId = String(row.user_id);
    const userSummary = userSummaryMap.get(ownerId);
    const username = userSummary?.username ?? fallbackUsername(ownerId);
    const displayName = userSummary?.displayName ?? username;
    const profileImageUrl = userSummary?.profileImageUrl ?? null;

    return {
      id: String(row.id),
      userId: ownerId,
      username,
      displayName,
      profileImageUrl,
      activityType: coerceActivityType(row.activity_type),
      sourceType: row.source_type == null ? null : String(row.source_type),
      sourceId: row.source_id == null ? null : String(row.source_id),
      sessionId: row.session_id == null ? null : String(row.session_id),
      title: row.title == null ? null : String(row.title),
      subtitle: row.subtitle == null ? null : String(row.subtitle),
      caption: row.caption == null ? null : String(row.caption),
      visibility: coerceVisibility(row.visibility),
      createdAt: String(row.created_at),
      metrics: normalizeMetrics(row.metrics),
      mediaUrls: normalizeMediaUrls(row.media_urls),
      likeCount: asInt(row.like_count),
      commentCount: asInt(row.comment_count),
      isLikedByMe: likedSet.has(String(row.id)),
    } satisfies SocialFeedPost;
  });
}

export async function getPostLikes(postId: string, limit = 20): Promise<SocialPostLike[]> {
  const trimmedPostId = String(postId ?? '').trim();
  if (!trimmedPostId) return [];

  const likesRes = await supabase.rpc('list_post_likes_user', {
    p_post_id: trimmedPostId,
    p_limit: Math.max(1, Math.min(100, Math.trunc(limit))),
  });

  if (isMissingDbObject(likesRes.error)) return [];
  if (likesRes.error) throw likesRes.error;

  const rows = (likesRes.data ?? []) as any[];
  if (rows.length === 0) return [];

  const userMap = await resolveUserSummaryMap(rows.map((row) => String(row.user_id)));
  return rows.map((row) => {
    const userId = String(row.user_id);
    const user = userMap.get(userId);
    return {
      userId,
      username: user?.username ?? fallbackUsername(userId),
      displayName: user?.displayName ?? user?.username ?? fallbackUsername(userId),
      profileImageUrl: user?.profileImageUrl ?? null,
      createdAt: String(row.created_at),
    } satisfies SocialPostLike;
  });
}

export async function getPostComments(args: {
  postId: string;
  limit?: number;
  offset?: number;
}): Promise<SocialPostComment[]> {
  const trimmedPostId = String(args.postId ?? '').trim();
  if (!trimmedPostId) return [];

  const commentsRes = await supabase.rpc('list_post_comments_user', {
    p_post_id: trimmedPostId,
    p_limit: Math.max(1, Math.min(200, Math.trunc(args.limit ?? 50))),
    p_offset: Math.max(0, Math.trunc(args.offset ?? 0)),
  });

  if (isMissingDbObject(commentsRes.error)) return [];
  if (commentsRes.error) throw commentsRes.error;

  const rows = (commentsRes.data ?? []) as any[];
  if (rows.length === 0) return [];

  const userMap = await resolveUserSummaryMap(rows.map((row) => String(row.user_id)));
  return rows.map((row) => {
    const userId = String(row.user_id);
    const user = userMap.get(userId);
    return {
      id: String(row.id),
      postId: String(row.post_id),
      userId,
      username: user?.username ?? fallbackUsername(userId),
      displayName: user?.displayName ?? user?.username ?? fallbackUsername(userId),
      profileImageUrl: user?.profileImageUrl ?? null,
      parentCommentId: row.parent_comment_id == null ? null : String(row.parent_comment_id),
      body: String(row.body ?? ''),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at ?? row.created_at),
      canDelete: Boolean(row.can_delete),
    } satisfies SocialPostComment;
  });
}

export async function createPostComment(args: {
  postId: string;
  body: string;
  parentCommentId?: string | null;
}): Promise<SocialPostComment | null> {
  const trimmedPostId = String(args.postId ?? '').trim();
  const trimmedBody = String(args.body ?? '').trim();
  if (!trimmedPostId || !trimmedBody) return null;

  const createRes = await supabase.rpc('create_post_comment_user', {
    p_post_id: trimmedPostId,
    p_body: trimmedBody,
    p_parent_comment_id: args.parentCommentId ?? null,
  });

  if (isMissingDbObject(createRes.error)) return null;
  if (createRes.error) throw createRes.error;

  const row = Array.isArray(createRes.data) ? createRes.data[0] : createRes.data;
  if (!row) return null;
  const userId = String((row as any).user_id);
  const userMap = await resolveUserSummaryMap([userId]);
  const user = userMap.get(userId);

  return {
    id: String((row as any).id),
    postId: String((row as any).post_id),
    userId,
    username: user?.username ?? fallbackUsername(userId),
    displayName: user?.displayName ?? user?.username ?? fallbackUsername(userId),
    profileImageUrl: user?.profileImageUrl ?? null,
    parentCommentId: (row as any).parent_comment_id == null ? null : String((row as any).parent_comment_id),
    body: String((row as any).body ?? trimmedBody),
    createdAt: String((row as any).created_at),
    updatedAt: String((row as any).updated_at ?? (row as any).created_at),
    canDelete: Boolean((row as any).can_delete ?? true),
  } satisfies SocialPostComment;
}

export async function deletePostComment(commentId: string): Promise<void> {
  const trimmedCommentId = String(commentId ?? '').trim();
  if (!trimmedCommentId) return;

  const deleteRes = await supabase.rpc('delete_post_comment_user', {
    p_comment_id: trimmedCommentId,
  });

  if (deleteRes.error && !isMissingDbObject(deleteRes.error)) throw deleteRes.error;
}

async function mergePostSourceMetadata(postRows: any[]): Promise<any[]> {
  if (postRows.length === 0) return [];
  const hasInlineMetadata = postRows.every(
    (row) =>
      Object.prototype.hasOwnProperty.call(row, 'source_type') &&
      Object.prototype.hasOwnProperty.call(row, 'source_id') &&
      Object.prototype.hasOwnProperty.call(row, 'session_id') &&
      Object.prototype.hasOwnProperty.call(row, 'media_urls')
  );
  if (hasInlineMetadata) return postRows;

  const postIds = postRows.map((r) => String(r.id)).filter(Boolean);
  if (postIds.length === 0) return postRows;

  const metaRes = await supabase
    .schema('social')
    .from('posts')
    .select('id, source_type, source_id, session_id, media_urls')
    .in('id', postIds);

  if (metaRes.error) return postRows;

  const metaById = new Map<string, any>();
  for (const row of (metaRes.data ?? []) as any[]) {
    metaById.set(String(row.id), row);
  }

  return postRows.map((row) => {
    const meta = metaById.get(String(row.id));
    if (!meta) return row;
    return {
      ...row,
      source_type: row.source_type ?? meta.source_type ?? null,
      source_id: row.source_id ?? meta.source_id ?? null,
      session_id: row.session_id ?? meta.session_id ?? null,
      media_urls: row.media_urls ?? meta.media_urls ?? [],
    };
  });
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

  const withMeta = await mergePostSourceMetadata(postRows);
  return hydrateFeedPosts(withMeta);
}

export async function getSocialFeedForUser(args: {
  userId: string;
  offset?: number;
  limit?: number;
  activityType?: SocialActivityType | null;
}): Promise<SocialFeedPost[]> {
  const userId = String(args.userId ?? '').trim();
  if (!userId) return [];

  const offset = Math.max(0, Math.trunc(args.offset ?? 0));
  const limit = Math.max(1, Math.min(50, Math.trunc(args.limit ?? 20)));

  let query = supabase
    .schema('social')
    .from('posts')
    .select(
      'id, user_id, activity_type, source_type, source_id, session_id, title, subtitle, caption, metrics, media_urls, visibility, created_at, like_count, comment_count'
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (args.activityType) {
    query = query.eq('activity_type', args.activityType);
  }

  const postsRes = await query;
  if (!postsRes.error) {
    const postRows = (postsRes.data ?? []) as any[];
    return hydrateFeedPosts(postRows);
  }

  if (!isMissingDbObject(postsRes.error)) {
    throw postsRes.error;
  }

  // Fallback when `social` schema is not exposed: derive from feed RPC and filter by user.
  const fetchLimit = Math.max(50, Math.min(500, (offset + limit) * 3));
  const rpcRes = await supabase.rpc('get_feed_user', {
    p_limit: fetchLimit,
    p_offset: 0,
    p_activity_type: args.activityType ?? null,
  });
  if (rpcRes.error) return [];

  const filtered = ((rpcRes.data ?? []) as any[])
    .filter((row) => String(row.user_id) === userId)
    .slice(offset, offset + limit);

  const withMeta = await mergePostSourceMetadata(filtered);
  return hydrateFeedPosts(withMeta);
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
  const sessionUuid = asUuidOrNull(args.sessionId);
  const rpcSessionId = sessionUuid ?? stableUuidFromRef(String(args.sessionId ?? ''));

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
    source_session_ref: sessionUuid ? null : String(args.sessionId ?? '').trim() || null,
  };

  // Preferred path: RPC (works even when social schema is not directly exposed).
  const rpcRes = await shareSessionViaRpc({
    sessionId: rpcSessionId,
    activityType,
    title: buildRunWalkTitle(activityType),
    subtitle: 'Run/Walk Session',
    caption: args.caption ?? null,
    visibility,
    metrics,
  });

  if (!rpcRes.error) return String(rpcRes.data);

  if (!isRpcUnavailableError(rpcRes.error) && !isMissingDbObject(rpcRes.error)) {
    console.warn('[social] share_run_walk_session_user failed', rpcRes.error);
  }
  throw rpcRes.error;
}

export async function shareStrengthWorkoutToFeed(args: {
  workoutId: string;
  totalVolumeKg: number;
  totalSets: number;
  exerciseCount: number;
  durationS?: number | null;
  caption?: string | null;
  visibility?: PostVisibility;
}): Promise<string> {
  const visibility = args.visibility ?? 'followers';
  const workoutUuid = asUuidOrNull(args.workoutId);
  const fallbackRpcId = workoutUuid ?? stableUuidFromRef(String(args.workoutId ?? ''));

  const metrics = {
    total_volume_kg: Number.isFinite(args.totalVolumeKg) ? Number(args.totalVolumeKg) : 0,
    total_sets: Number.isFinite(args.totalSets) ? Math.max(0, Math.trunc(args.totalSets)) : 0,
    exercise_count: Number.isFinite(args.exerciseCount) ? Math.max(0, Math.trunc(args.exerciseCount)) : 0,
    total_time_s:
      args.durationS != null && Number.isFinite(args.durationS)
        ? Math.max(0, Math.trunc(args.durationS))
        : null,
    source_workout_ref: workoutUuid ? null : String(args.workoutId ?? '').trim() || null,
  };

  // Use the existing share RPC so we never depend on direct `social` schema access.
  const rpcRes = await shareSessionViaRpc({
    sessionId: fallbackRpcId,
    activityType: 'strength',
    title: 'Strength Training Session',
    subtitle: 'Strength Session',
    caption: args.caption ?? null,
    visibility,
    metrics,
  });

  if (!rpcRes.error) return String(rpcRes.data);
  throw rpcRes.error;
}
