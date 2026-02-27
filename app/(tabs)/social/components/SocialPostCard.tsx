import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { Colors } from '@/constants/Colors';
import {
  createPostComment,
  deletePostComment,
  getPostComments,
  getPostLikes,
  type SocialActivityType,
  type SocialFeedPost,
  type SocialPostComment,
  type SocialPostLike,
} from '@/lib/social/feed';

const BG = Colors.dark.background;
const CARD = Colors.dark.card;
const BORDER = Colors.dark?.border ?? '#1F2937';
const TEXT = Colors.dark.text;
const TEXT_MUTED = Colors.dark.textMuted ?? '#9AA4BF';
const ACCENT = Colors.dark.highlight1;

type Metric = {
  label: string;
  value: string;
};

const TYPE_LABEL: Record<SocialActivityType, string> = {
  run: 'Run',
  walk: 'Walk',
  ride: 'Ride',
  strength: 'Strength',
  nutrition: 'Nutrition',
  other: 'Post',
};

const TYPE_ICON: Record<SocialActivityType, keyof typeof Ionicons.glyphMap> = {
  run: 'walk-outline',
  walk: 'walk-outline',
  ride: 'bicycle-outline',
  strength: 'barbell-outline',
  nutrition: 'nutrition-outline',
  other: 'sparkles-outline',
};

const TYPE_GRADIENT: Record<SocialActivityType, [string, string]> = {
  run: ['#1F3048', '#0F141D'],
  walk: ['#1E3D37', '#101B18'],
  ride: ['#233A47', '#111A21'],
  strength: ['#402A1B', '#1B130D'],
  nutrition: ['#3C2F18', '#1A150E'],
  other: ['#2F3341', '#141923'],
};

function initials(nameOrUsername: string) {
  const parts = nameOrUsername.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
  return (nameOrUsername.slice(0, 2) || '').toUpperCase();
}

function colorFromId(id: string): string {
  const palette = ['#2F4858', '#394867', '#4F5D75', '#3E4C59', '#2C3E50', '#334155'];
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return palette[hash % palette.length];
}

function asNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function pickNumber(metrics: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const n = asNumber(metrics[key]);
    if (n != null) return n;
  }
  return null;
}

function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

function formatPace(secPerUnit: number, unit: 'mi' | 'km'): string {
  if (!Number.isFinite(secPerUnit) || secPerUnit <= 0) return '—';
  const m = Math.floor(secPerUnit / 60);
  const s = Math.round(secPerUnit % 60);
  const suffix = unit === 'mi' ? '/mi' : '/km';
  if (s === 60) return `${m + 1}:00 ${suffix}`;
  return `${m}:${String(s).padStart(2, '0')} ${suffix}`;
}

function formatDistance(meters: number, unit: 'mi' | 'km'): string {
  const val = unit === 'mi' ? meters / 1609.344 : meters / 1000;
  return `${val.toFixed(val >= 10 ? 1 : 2)} ${unit}`;
}

function formatRelativeTime(iso: string): string {
  const ts = new Date(iso).getTime();
  if (!Number.isFinite(ts)) return '';

  const diff = Math.max(0, Date.now() - ts);
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return 'now';

  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;

  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;

  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d`;

  const wk = Math.floor(day / 7);
  if (wk < 5) return `${wk}w`;

  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function buildMetricList(
  post: SocialFeedPost,
  distanceUnit: 'mi' | 'km',
  weightUnit: 'lb' | 'kg'
): Metric[] {
  const m = post.metrics as Record<string, unknown>;
  const out: Metric[] = [];

  if (post.activityType === 'run' || post.activityType === 'walk' || post.activityType === 'ride') {
    const distanceM = pickNumber(m, ['distance_m', 'total_distance_m']);
    if (distanceM != null && distanceM > 0) {
      out.push({ label: 'Distance', value: formatDistance(distanceM, distanceUnit) });
    }

    const durationS = pickNumber(m, ['total_time_s', 'duration_s']);
    if (durationS != null && durationS > 0) {
      out.push({ label: 'Time', value: formatDuration(durationS) });
    }

    const paceMi = pickNumber(m, ['avg_pace_s_per_mi']);
    const paceKm = pickNumber(m, ['avg_pace_s_per_km']);
    const paceForUnit =
      distanceUnit === 'mi'
        ? paceMi ?? (paceKm != null && paceKm > 0 ? paceKm * 1.609344 : null)
        : paceKm ?? (paceMi != null && paceMi > 0 ? paceMi / 1.609344 : null);
    if (paceForUnit != null && paceForUnit > 0) {
      out.push({ label: 'Pace', value: formatPace(paceForUnit, distanceUnit) });
    }

    const hr = pickNumber(m, ['avg_hr', 'heart_rate_avg']);
    if (hr != null && hr > 0) {
      out.push({ label: 'Avg HR', value: `${Math.round(hr)} bpm` });
    }
  }

  if (post.activityType === 'strength') {
    const volumeKg = pickNumber(m, ['total_volume_kg', 'volume_kg']);
    if (volumeKg != null && volumeKg > 0) {
      const mass = weightUnit === 'kg' ? volumeKg : volumeKg * 2.20462;
      out.push({ label: 'Volume', value: `${Math.round(mass).toLocaleString()} ${weightUnit}` });
    }

    const setCount = pickNumber(m, ['total_sets', 'sets']);
    if (setCount != null && setCount > 0) {
      out.push({ label: 'Sets', value: `${Math.round(setCount)}` });
    }

    const exerciseCount = pickNumber(m, ['exercise_count', 'exercises']);
    if (exerciseCount != null && exerciseCount > 0) {
      out.push({ label: 'Exercises', value: `${Math.round(exerciseCount)}` });
    }

    const durationS = pickNumber(m, ['total_time_s', 'duration_s']);
    if (durationS != null && durationS > 0) {
      out.push({ label: 'Time', value: formatDuration(durationS) });
    }
  }

  if (out.length === 0) {
    const durationS = pickNumber(m, ['total_time_s', 'duration_s']);
    if (durationS != null && durationS > 0) {
      out.push({ label: 'Time', value: formatDuration(durationS) });
    }
  }

  return out;
}

function buildHeroMetric(post: SocialFeedPost, metrics: Metric[]): Metric | null {
  if (metrics.length > 0) return metrics[0];

  if (post.activityType === 'strength') return { label: 'Activity', value: 'Strength' };
  if (post.activityType === 'run' || post.activityType === 'walk' || post.activityType === 'ride') {
    return { label: 'Activity', value: TYPE_LABEL[post.activityType] };
  }
  return null;
}

function ActionButton({
  icon,
  label,
  onPress,
  iconColor,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  iconColor?: string;
}) {
  return (
    <TouchableOpacity style={styles.actionBtn} activeOpacity={0.85} onPress={onPress}>
      <Ionicons name={icon} size={18} color={iconColor ?? TEXT_MUTED} />
      <Text style={styles.actionText}>{label}</Text>
    </TouchableOpacity>
  );
}

function ProfilePill({
  id,
  label,
  imageUrl,
  onPressProfile,
}: {
  id: string;
  label: string;
  imageUrl: string | null;
  onPressProfile?: (userId: string) => void;
}) {
  const interactive = !!onPressProfile;
  return (
    <TouchableOpacity
      activeOpacity={interactive ? 0.85 : 1}
      disabled={!interactive}
      onPress={() => onPressProfile?.(id)}
      style={styles.likePill}
    >
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles.likeAvatarImg} />
      ) : (
        <View style={[styles.likeAvatar, { backgroundColor: colorFromId(id) }]}>
          <Text style={styles.likeAvatarText}>{initials(label)}</Text>
        </View>
      )}
      <Text style={styles.likePillText} numberOfLines={1}>
        @{label}
      </Text>
    </TouchableOpacity>
  );
}

function CommentRow({
  comment,
  onPressProfile,
  onDelete,
  busy,
}: {
  comment: SocialPostComment;
  onPressProfile?: (userId: string) => void;
  onDelete: () => void;
  busy: boolean;
}) {
  const interactive = !!onPressProfile;

  return (
    <View style={styles.commentRow}>
      <TouchableOpacity
        activeOpacity={interactive ? 0.85 : 1}
        disabled={!interactive}
        onPress={() => onPressProfile?.(comment.userId)}
      >
        {comment.profileImageUrl ? (
          <Image source={{ uri: comment.profileImageUrl }} style={styles.commentAvatarImg} />
        ) : (
          <View style={[styles.commentAvatar, { backgroundColor: colorFromId(comment.userId) }]}>
            <Text style={styles.commentAvatarText}>{initials(comment.displayName || comment.username)}</Text>
          </View>
        )}
      </TouchableOpacity>

      <View style={{ flex: 1 }}>
        <View style={styles.commentMetaRow}>
          <TouchableOpacity
            activeOpacity={interactive ? 0.85 : 1}
            disabled={!interactive}
            onPress={() => onPressProfile?.(comment.userId)}
          >
            <Text style={styles.commentUserText}>{comment.displayName}</Text>
          </TouchableOpacity>
          <Text style={styles.commentHandleText}>@{comment.username}</Text>
          <Text style={styles.commentDot}>•</Text>
          <Text style={styles.commentTimeText}>{formatRelativeTime(comment.createdAt)}</Text>
        </View>

        <Text style={styles.commentBodyText}>{comment.body}</Text>
      </View>

      {comment.canDelete ? (
        <TouchableOpacity
          style={styles.commentDeleteBtn}
          activeOpacity={0.85}
          disabled={busy}
          onPress={onDelete}
        >
          {busy ? (
            <ActivityIndicator size="small" color={TEXT_MUTED} />
          ) : (
            <Ionicons name="trash-outline" size={16} color={TEXT_MUTED} />
          )}
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export default function SocialPostCard({
  post,
  distanceUnit,
  weightUnit,
  expanded,
  onToggleExpand,
  onPressUser,
  onPressProfile,
  onToggleLike,
  onAdjustCommentCount,
  onPressSession,
}: {
  post: SocialFeedPost;
  distanceUnit: 'mi' | 'km';
  weightUnit: 'lb' | 'kg';
  expanded: boolean;
  onToggleExpand: () => void;
  onPressUser?: () => void;
  onPressProfile?: (userId: string) => void;
  onToggleLike: () => void | Promise<void>;
  onAdjustCommentCount?: (delta: number) => void;
  onPressSession?: (post: SocialFeedPost) => void;
}) {
  const metrics = useMemo(
    () => buildMetricList(post, distanceUnit, weightUnit),
    [post, distanceUnit, weightUnit]
  );
  const heroMetric = useMemo(() => buildHeroMetric(post, metrics), [metrics, post]);
  const createdAtLabel = formatRelativeTime(post.createdAt);
  const typeLabel = TYPE_LABEL[post.activityType] ?? 'Post';
  const typeIcon = TYPE_ICON[post.activityType] ?? 'sparkles-outline';
  const gradient = TYPE_GRADIENT[post.activityType] ?? TYPE_GRADIENT.other;
  const title = post.title?.trim() || `${typeLabel} session`;
  const summaryMetrics = metrics.slice(0, 3);
  const hasSessionLink =
    !!post.sessionId &&
    (post.activityType === 'run' ||
      post.activityType === 'walk' ||
      post.activityType === 'ride' ||
      post.activityType === 'strength');

  const [likes, setLikes] = useState<SocialPostLike[]>([]);
  const [comments, setComments] = useState<SocialPostComment[]>([]);
  const [engagementLoading, setEngagementLoading] = useState(false);
  const [engagementLoaded, setEngagementLoaded] = useState(false);
  const [engagementError, setEngagementError] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState('');
  const [commentBusy, setCommentBusy] = useState(false);
  const [busyCommentId, setBusyCommentId] = useState<string | null>(null);

  useEffect(() => {
    setLikes([]);
    setComments([]);
    setEngagementLoading(false);
    setEngagementLoaded(false);
    setEngagementError(null);
    setCommentDraft('');
    setCommentBusy(false);
    setBusyCommentId(null);
  }, [post.id]);

  async function loadEngagement() {
    if (engagementLoading) return;

    setEngagementLoading(true);
    setEngagementError(null);
    try {
      const [nextLikes, nextComments] = await Promise.all([
        getPostLikes(post.id, Math.max(post.likeCount, 20)),
        getPostComments({ postId: post.id, limit: 100, offset: 0 }),
      ]);
      setLikes(nextLikes);
      setComments(nextComments);
      setEngagementLoaded(true);
    } catch (err: any) {
      setEngagementError(err?.message ?? 'Could not load comments.');
    } finally {
      setEngagementLoading(false);
    }
  }

  async function refreshLikes() {
    try {
      const nextLikes = await getPostLikes(post.id, Math.max(post.likeCount, 20));
      setLikes(nextLikes);
    } catch (err: any) {
      setEngagementError(err?.message ?? 'Could not load likes.');
    }
  }

  useEffect(() => {
    if (!expanded || engagementLoaded) return;
    void loadEngagement();
  }, [expanded, engagementLoaded, post.id]);

  const handleHeroPress = () => {
    if (hasSessionLink && onPressSession) {
      onPressSession(post);
      return;
    }
    onToggleExpand();
  };

  const handleCommentPress = () => {
    if (!expanded) {
      onToggleExpand();
      return;
    }

    if (!engagementLoaded && !engagementLoading) {
      void loadEngagement();
    }
  };

  const handleToggleLike = async () => {
    try {
      await Promise.resolve(onToggleLike());
    } catch (err: any) {
      setEngagementError(err?.message ?? 'Could not update like.');
    } finally {
      if (expanded || engagementLoaded) {
        void refreshLikes();
      }
    }
  };

  const handleSubmitComment = async () => {
    const trimmed = commentDraft.trim();
    if (!trimmed || commentBusy || engagementLoading) return;

    setCommentBusy(true);
    setEngagementError(null);
    try {
      const nextComment = await createPostComment({ postId: post.id, body: trimmed });
      if (nextComment) {
        setComments((prev) => [...prev, nextComment]);
        onAdjustCommentCount?.(1);
      } else {
        await loadEngagement();
      }
      setCommentDraft('');
      setEngagementLoaded(true);
    } catch (err: any) {
      setEngagementError(err?.message ?? 'Could not add comment.');
    } finally {
      setCommentBusy(false);
    }
  };

  const handleDeleteComment = async (comment: SocialPostComment) => {
    if (busyCommentId) return;

    setBusyCommentId(comment.id);
    setEngagementError(null);
    try {
      await deletePostComment(comment.id);
      setComments((prev) => prev.filter((row) => row.id !== comment.id));
      onAdjustCommentCount?.(-1);
    } catch (err: any) {
      setEngagementError(err?.message ?? 'Could not delete comment.');
    } finally {
      setBusyCommentId(null);
    }
  };

  const hasLikesSection = post.likeCount > 0 || likes.length > 0;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.userRow}
          onPress={onPressUser}
          activeOpacity={onPressUser ? 0.85 : 1}
          disabled={!onPressUser}
        >
          {post.profileImageUrl ? (
            <Image source={{ uri: post.profileImageUrl }} style={styles.avatarImg} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: colorFromId(post.userId) }]}>
              <Text style={styles.avatarText}>{initials(post.displayName || post.username)}</Text>
            </View>
          )}

          <View style={{ flex: 1 }}>
            <View style={styles.userTopLine}>
              <Text style={styles.displayName}>{post.displayName}</Text>
              {!!createdAtLabel ? <Text style={styles.dot}>•</Text> : null}
              {!!createdAtLabel ? <Text style={styles.time}>{createdAtLabel}</Text> : null}
            </View>
            <Text style={styles.username}>@{post.username}</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.typePill}>
          <Ionicons name={typeIcon} size={14} color={TEXT} />
          <Text style={styles.typePillText}>{typeLabel}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.heroPress} activeOpacity={0.9} onPress={handleHeroPress}>
        <LinearGradient
          colors={gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.heroKickerRow}>
            <Ionicons name={typeIcon} size={13} color={ACCENT} />
            <Text style={styles.heroKicker}>{typeLabel.toUpperCase()}</Text>
          </View>

          <Text style={styles.title}>{title}</Text>
          {post.subtitle ? <Text style={styles.subtitle}>{post.subtitle}</Text> : null}

          {heroMetric ? (
            <View style={styles.heroMetricBlock}>
              <Text style={styles.heroMetricValue}>{heroMetric.value}</Text>
              <Text style={styles.heroMetricLabel}>{heroMetric.label}</Text>
            </View>
          ) : null}

          {post.caption ? (
            <Text style={styles.captionPreview} numberOfLines={expanded ? 3 : 2}>
              {post.caption}
            </Text>
          ) : null}
        </LinearGradient>
      </TouchableOpacity>

      <View style={styles.actionsRow}>
        <ActionButton
          icon={post.isLikedByMe ? 'heart' : 'heart-outline'}
          iconColor={post.isLikedByMe ? '#ef5350' : TEXT_MUTED}
          label={post.likeCount > 0 ? `${post.likeCount}` : 'Like'}
          onPress={() => void handleToggleLike()}
        />
        <ActionButton
          icon="chatbubble-outline"
          label={post.commentCount > 0 ? `${post.commentCount}` : 'Comment'}
          onPress={handleCommentPress}
        />
        <ActionButton
          icon={expanded ? 'chevron-up-outline' : 'chevron-down-outline'}
          label={expanded ? 'Hide' : 'Expand'}
          onPress={onToggleExpand}
        />
      </View>

      {expanded ? (
        <View style={styles.expandWrap}>
          {summaryMetrics.length > 0 ? (
            <View style={styles.metricsWrap}>
              {summaryMetrics.map((m) => (
                <View key={m.label} style={styles.metricChip}>
                  <Text style={styles.metricLabel}>{m.label}</Text>
                  <Text style={styles.metricValue}>{m.value}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {post.caption ? <Text style={styles.captionFull}>{post.caption}</Text> : null}

          {hasSessionLink && onPressSession ? (
            <TouchableOpacity
              style={styles.openBtn}
              onPress={() => onPressSession(post)}
              activeOpacity={0.85}
            >
              <Ionicons name="open-outline" size={16} color={TEXT} />
              <Text style={styles.openBtnText}>Open session</Text>
            </TouchableOpacity>
          ) : null}

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Likes</Text>
              <Text style={styles.sectionCount}>{post.likeCount}</Text>
            </View>

            {engagementLoading && !engagementLoaded ? (
              <View style={styles.inlineLoading}>
                <ActivityIndicator size="small" color={TEXT_MUTED} />
              </View>
            ) : hasLikesSection ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.likesRow}
              >
                {likes.map((like) => (
                  <ProfilePill
                    key={`${like.userId}:${like.createdAt}`}
                    id={like.userId}
                    label={like.username}
                    imageUrl={like.profileImageUrl}
                    onPressProfile={onPressProfile}
                  />
                ))}
              </ScrollView>
            ) : (
              <Text style={styles.emptyText}>Be the first to like this post.</Text>
            )}
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Comments</Text>
              <Text style={styles.sectionCount}>{post.commentCount}</Text>
            </View>

            {engagementLoading && !engagementLoaded ? (
              <View style={styles.inlineLoading}>
                <ActivityIndicator size="small" color={TEXT_MUTED} />
              </View>
            ) : comments.length > 0 ? (
              <View style={styles.commentsList}>
                {comments.map((comment) => (
                  <CommentRow
                    key={comment.id}
                    comment={comment}
                    onPressProfile={onPressProfile}
                    busy={busyCommentId === comment.id}
                    onDelete={() => void handleDeleteComment(comment)}
                  />
                ))}
              </View>
            ) : (
              <Text style={styles.emptyText}>No comments yet.</Text>
            )}

            <View style={styles.commentComposer}>
              <TextInput
                value={commentDraft}
                onChangeText={setCommentDraft}
                placeholder="Add a comment..."
                placeholderTextColor={TEXT_MUTED}
                style={styles.commentInput}
                multiline
                maxLength={300}
              />
              <TouchableOpacity
                style={[
                  styles.commentSendBtn,
                  (!commentDraft.trim() || commentBusy || engagementLoading) && styles.commentSendBtnDisabled,
                ]}
                activeOpacity={0.85}
                disabled={!commentDraft.trim() || commentBusy || engagementLoading}
                onPress={() => void handleSubmitComment()}
              >
                {commentBusy ? (
                  <ActivityIndicator size="small" color={TEXT} />
                ) : (
                  <Ionicons name="send" size={16} color={TEXT} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {engagementError ? <Text style={styles.errorText}>{engagementError}</Text> : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: CARD,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  avatarImg: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  avatarText: { color: TEXT, fontWeight: '900' },
  userTopLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  displayName: { color: TEXT, fontSize: 13.5, fontWeight: '900' },
  dot: { color: TEXT_MUTED },
  time: { color: TEXT_MUTED, fontSize: 12 },
  username: { color: TEXT_MUTED, fontSize: 12, marginTop: 2 },

  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 28,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  typePillText: { color: TEXT, fontSize: 12, fontWeight: '800' },

  heroPress: { paddingHorizontal: 12, paddingBottom: 12 },
  hero: {
    minHeight: 170,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    padding: 14,
    justifyContent: 'flex-end',
  },
  heroKickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  heroKicker: {
    color: TEXT_MUTED,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  title: { color: TEXT, fontSize: 16, fontWeight: '900' },
  subtitle: { marginTop: 4, color: TEXT_MUTED, fontSize: 12.5 },
  heroMetricBlock: { marginTop: 12 },
  heroMetricValue: {
    color: TEXT,
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 28,
  },
  heroMetricLabel: {
    marginTop: 2,
    color: TEXT_MUTED,
    fontSize: 12,
    fontWeight: '700',
  },
  captionPreview: {
    marginTop: 10,
    color: TEXT_MUTED,
    fontSize: 12.5,
    lineHeight: 17,
  },

  actionsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.07)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  actionBtn: {
    flex: 1,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  actionText: { color: TEXT_MUTED, fontSize: 12, fontWeight: '800' },

  expandWrap: {
    padding: 12,
    gap: 12,
    backgroundColor: 'rgba(0,0,0,0.10)',
  },
  metricsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metricChip: {
    minWidth: '47%',
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  metricLabel: { color: TEXT_MUTED, fontSize: 11, fontWeight: '700' },
  metricValue: { marginTop: 3, color: TEXT, fontSize: 13, fontWeight: '900' },
  captionFull: {
    color: TEXT_MUTED,
    fontSize: 12.5,
    lineHeight: 18,
  },
  openBtn: {
    alignSelf: 'flex-start',
    height: 34,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: BG,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  openBtnText: { color: TEXT, fontSize: 12.5, fontWeight: '800' },

  section: {
    gap: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    backgroundColor: 'rgba(255,255,255,0.02)',
    padding: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: { color: TEXT, fontSize: 13, fontWeight: '900' },
  sectionCount: { color: TEXT_MUTED, fontSize: 12, fontWeight: '800' },
  inlineLoading: {
    minHeight: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  likesRow: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 6,
  },
  likePill: {
    maxWidth: 150,
    height: 34,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: BG,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  likeAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  likeAvatarImg: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  likeAvatarText: {
    color: TEXT,
    fontSize: 10,
    fontWeight: '900',
  },
  likePillText: {
    color: TEXT,
    fontSize: 11.5,
    fontWeight: '700',
    flexShrink: 1,
  },
  commentsList: {
    gap: 10,
  },
  commentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentAvatarImg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  commentAvatarText: {
    color: TEXT,
    fontSize: 11,
    fontWeight: '900',
  },
  commentMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  commentUserText: {
    color: TEXT,
    fontSize: 12,
    fontWeight: '900',
  },
  commentHandleText: {
    color: TEXT_MUTED,
    fontSize: 11,
    fontWeight: '700',
  },
  commentDot: {
    color: TEXT_MUTED,
    fontSize: 11,
  },
  commentTimeText: {
    color: TEXT_MUTED,
    fontSize: 11,
  },
  commentBodyText: {
    marginTop: 4,
    color: TEXT,
    fontSize: 12.5,
    lineHeight: 18,
  },
  commentDeleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  commentComposer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    marginTop: 2,
  },
  commentInput: {
    flex: 1,
    minHeight: 42,
    maxHeight: 92,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: BG,
    color: TEXT,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
  },
  commentSendBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentSendBtnDisabled: {
    opacity: 0.45,
  },
  emptyText: {
    color: TEXT_MUTED,
    fontSize: 12,
    lineHeight: 17,
  },
  errorText: {
    color: '#FCA5A5',
    fontSize: 12,
    lineHeight: 16,
  },
});
