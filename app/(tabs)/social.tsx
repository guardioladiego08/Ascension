import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

import { Colors } from '@/constants/Colors';
import LogoHeader from '@/components/my components/logoHeader';
import {
  getSocialFeedPage,
  togglePostLike,
  type SocialActivityType,
  type SocialFeedPost,
} from '@/lib/social/feed';

import ActivityTab from './social/components/ActivityTab';

const BG = Colors.dark.background;
const CARD = Colors.dark.card;
const BORDER = Colors.dark?.border ?? '#1F2937';
const TEXT = Colors.dark.text;
const TEXT_MUTED = Colors.dark.textMuted ?? '#9AA4BF';
const ACCENT = Colors.dark.highlight1;

const PAGE_SIZE = 16;

type Mode = 'feed' | 'activity';
type ActivityFilter = 'all' | SocialActivityType;

type Metric = {
  label: string;
  value: string;
};

const TYPE_LABEL: Record<SocialActivityType, string> = {
  run: 'Run',
  walk: 'Walk',
  ride: 'Bike',
  strength: 'Lift',
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

const FILTERS: Array<{ key: ActivityFilter; label: string; icon?: keyof typeof Ionicons.glyphMap }> = [
  { key: 'all', label: 'All' },
  { key: 'run', label: 'Run', icon: TYPE_ICON.run },
  { key: 'walk', label: 'Walk', icon: TYPE_ICON.walk },
  { key: 'ride', label: 'Bike', icon: TYPE_ICON.ride },
  { key: 'strength', label: 'Lift', icon: TYPE_ICON.strength },
  { key: 'nutrition', label: 'Nutrition', icon: TYPE_ICON.nutrition },
];

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

function formatPace(secPerMile: number): string {
  if (!Number.isFinite(secPerMile) || secPerMile <= 0) return '—';
  const m = Math.floor(secPerMile / 60);
  const s = Math.round(secPerMile % 60);
  if (s === 60) return `${m + 1}:00 /mi`;
  return `${m}:${String(s).padStart(2, '0')} /mi`;
}

function formatDistance(meters: number): string {
  const miles = meters / 1609.344;
  return `${miles.toFixed(miles >= 10 ? 1 : 2)} mi`;
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

function buildMetrics(post: SocialFeedPost): Metric[] {
  const m = post.metrics as Record<string, unknown>;
  const out: Metric[] = [];

  const distanceM = pickNumber(m, ['distance_m', 'total_distance_m']);
  if (distanceM != null && distanceM > 0) {
    out.push({ label: 'Distance', value: formatDistance(distanceM) });
  }

  const durationS = pickNumber(m, ['total_time_s', 'duration_s']);
  if (durationS != null && durationS > 0) {
    out.push({ label: 'Time', value: formatDuration(durationS) });
  }

  const paceMi = pickNumber(m, ['avg_pace_s_per_mi']);
  const paceKm = pickNumber(m, ['avg_pace_s_per_km']);
  const resolvedPaceMi = paceMi ?? (paceKm != null && paceKm > 0 ? paceKm * 1.609344 : null);
  if (resolvedPaceMi != null && resolvedPaceMi > 0) {
    out.push({ label: 'Pace', value: formatPace(resolvedPaceMi) });
  }

  const volumeKg = pickNumber(m, ['total_volume_kg']);
  if (volumeKg != null && volumeKg > 0) {
    const pounds = volumeKg * 2.20462;
    out.push({ label: 'Volume', value: `${Math.round(pounds).toLocaleString()} lb` });
  }

  const hr = pickNumber(m, ['avg_hr', 'heart_rate_avg']);
  if (hr != null && hr > 0) {
    out.push({ label: 'HR', value: `${Math.round(hr)} avg` });
  }

  return out.slice(0, 4);
}

export default function Social() {
  const router = useRouter();

  const [mode, setMode] = useState<Mode>('feed');
  const [activeFilter, setActiveFilter] = useState<ActivityFilter>('all');

  const [posts, setPosts] = useState<SocialFeedPost[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [errorText, setErrorText] = useState<string | null>(null);

  const loadFirstPage = useCallback(async () => {
    setLoadingFeed(true);
    setErrorText(null);

    try {
      const rows = await getSocialFeedPage({
        offset: 0,
        limit: PAGE_SIZE,
        activityType: activeFilter === 'all' ? null : activeFilter,
      });
      setPosts(rows);
      setHasMore(rows.length === PAGE_SIZE);
    } catch (err: any) {
      console.error('[Social] feed load failed', err);
      setPosts([]);
      setHasMore(false);
      setErrorText(err?.message ?? 'Could not load feed.');
    } finally {
      setLoadingFeed(false);
      setRefreshing(false);
    }
  }, [activeFilter]);

  useEffect(() => {
    loadFirstPage();
  }, [loadFirstPage]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadFirstPage();
  }, [loadFirstPage]);

  const onLoadMore = useCallback(async () => {
    if (loadingFeed || loadingMore || refreshing || !hasMore) return;

    setLoadingMore(true);
    try {
      const rows = await getSocialFeedPage({
        offset: posts.length,
        limit: PAGE_SIZE,
        activityType: activeFilter === 'all' ? null : activeFilter,
      });

      setPosts((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        const merged = [...prev];
        for (const row of rows) {
          if (!seen.has(row.id)) {
            seen.add(row.id);
            merged.push(row);
          }
        }
        return merged;
      });

      setHasMore(rows.length === PAGE_SIZE);
    } catch (err: any) {
      console.error('[Social] feed loadMore failed', err);
      setErrorText(err?.message ?? 'Could not load more posts.');
    } finally {
      setLoadingMore(false);
    }
  }, [activeFilter, hasMore, loadingFeed, loadingMore, posts.length, refreshing]);

  const onToggleLike = useCallback(async (post: SocialFeedPost) => {
    const nextLiked = !post.isLikedByMe;

    setPosts((prev) =>
      prev.map((p) =>
        p.id === post.id
          ? {
              ...p,
              isLikedByMe: nextLiked,
              likeCount: Math.max(0, p.likeCount + (nextLiked ? 1 : -1)),
            }
          : p
      )
    );

    try {
      await togglePostLike(post.id, post.isLikedByMe);
    } catch (err) {
      console.error('[Social] toggle like failed', err);
      setPosts((prev) =>
        prev.map((p) =>
          p.id === post.id
            ? {
                ...p,
                isLikedByMe: post.isLikedByMe,
                likeCount: Math.max(0, post.likeCount),
              }
            : p
        )
      );
    }
  }, []);

  const feedData = useMemo(() => posts, [posts]);

  return (
    <SafeAreaView style={styles.safe}>
      <LinearGradient colors={[BG, '#070B12']} style={styles.bg}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <LogoHeader />

          <View style={styles.topRow}>
            <View style={styles.modeRow}>
              <ModePill label="Feed" icon="albums-outline" active={mode === 'feed'} onPress={() => setMode('feed')} />
              <ModePill
                label="Activity"
                icon="notifications-outline"
                active={mode === 'activity'}
                onPress={() => setMode('activity')}
              />
            </View>

            <TouchableOpacity
              onPress={() => router.push('/social/search')}
              style={styles.searchIcon}
              activeOpacity={0.85}
            >
              <Ionicons name="search-outline" size={20} color={TEXT} />
            </TouchableOpacity>
          </View>

          {mode === 'feed' ? (
            <>
              <View style={styles.filterWrap}>
                <FlatList
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  data={FILTERS}
                  keyExtractor={(i) => i.key}
                  contentContainerStyle={styles.filterRow}
                  renderItem={({ item }) => (
                    <FilterChip
                      label={item.label}
                      icon={item.icon}
                      active={activeFilter === item.key}
                      onPress={() => setActiveFilter(item.key)}
                    />
                  )}
                />
              </View>

              {loadingFeed ? (
                <View style={styles.stateWrap}>
                  <ActivityIndicator size="small" color={ACCENT} />
                  <Text style={styles.stateText}>Loading feed…</Text>
                </View>
              ) : (
                <FlatList
                  data={feedData}
                  keyExtractor={(p) => p.id}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.listContent}
                  renderItem={({ item }) => (
                    <PostCard
                      post={item}
                      onPressUser={() =>
                        router.push({ pathname: '/social/[userId]', params: { userId: item.userId } })
                      }
                      onToggleLike={() => onToggleLike(item)}
                    />
                  )}
                  ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
                  onRefresh={onRefresh}
                  refreshing={refreshing}
                  onEndReachedThreshold={0.4}
                  onEndReached={onLoadMore}
                  ListFooterComponent={
                    loadingMore ? (
                      <View style={styles.footerLoading}>
                        <ActivityIndicator size="small" color={TEXT_MUTED} />
                      </View>
                    ) : null
                  }
                  ListEmptyComponent={
                    <View style={styles.stateWrap}>
                      <Ionicons name="newspaper-outline" size={26} color={TEXT_MUTED} />
                      <Text style={styles.stateText}>No posts yet. Follow people or share a session.</Text>
                      {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}
                    </View>
                  }
                />
              )}
            </>
          ) : (
            <ActivityTab />
          )}
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
}

function ModePill({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={[styles.modePill, active && styles.modePillActive]}>
      <Ionicons name={icon} size={16} color={active ? TEXT : TEXT_MUTED} />
      <Text style={[styles.modeText, active && styles.modeTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function FilterChip({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={[styles.chip, active && styles.chipActive]}>
      {icon ? <Ionicons name={icon} size={14} color={active ? TEXT : TEXT_MUTED} /> : null}
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function PostCard({
  post,
  onPressUser,
  onToggleLike,
}: {
  post: SocialFeedPost;
  onPressUser: () => void;
  onToggleLike: () => void;
}) {
  const metrics = buildMetrics(post);
  const typeLabel = TYPE_LABEL[post.activityType] ?? 'Post';
  const typeIcon = TYPE_ICON[post.activityType] ?? 'sparkles-outline';
  const createdAtLabel = formatRelativeTime(post.createdAt);
  const title = post.title?.trim() || `${typeLabel} session`;

  return (
    <View style={styles.postCard}>
      <View style={styles.postHeader}>
        <TouchableOpacity style={styles.userRow} onPress={onPressUser} activeOpacity={0.85}>
          {post.profileImageUrl ? (
            <Image source={{ uri: post.profileImageUrl }} style={styles.avatarImg} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: colorFromId(post.userId) }]}>
              <Text style={styles.avatarText}>{initials(post.displayName || post.username)}</Text>
            </View>
          )}

          <View style={{ flex: 1 }}>
            <View style={styles.userTopLine}>
              <Text style={styles.username}>@{post.username}</Text>
              {!!createdAtLabel ? <Text style={styles.dot}>•</Text> : null}
              {!!createdAtLabel ? <Text style={styles.time}>{createdAtLabel}</Text> : null}
            </View>
            <Text style={styles.displayName}>{post.displayName}</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.typePill}>
          <Ionicons name={typeIcon} size={14} color={TEXT} />
          <Text style={styles.typePillText}>{typeLabel}</Text>
        </View>
      </View>

      <View style={styles.postBody}>
        <Text style={styles.postTitle}>{title}</Text>
        {post.subtitle ? <Text style={styles.postSubtitle}>{post.subtitle}</Text> : null}

        {metrics.length > 0 ? (
          <View style={styles.metricsGrid}>
            {metrics.map((m) => (
              <View key={m.label} style={styles.metricCell}>
                <Text style={styles.metricLabel}>{m.label}</Text>
                <Text style={styles.metricValue}>{m.value}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {post.caption ? <Text style={styles.caption}>{post.caption}</Text> : null}
      </View>

      <View style={styles.actionsRow}>
        <ActionButton
          icon={post.isLikedByMe ? 'heart' : 'heart-outline'}
          iconColor={post.isLikedByMe ? '#ef5350' : TEXT_MUTED}
          label={`Like${post.likeCount ? ` (${post.likeCount})` : ''}`}
          onPress={onToggleLike}
        />
        <ActionButton
          icon="chatbubble-outline"
          label={`Comment${post.commentCount ? ` (${post.commentCount})` : ''}`}
          onPress={() => {}}
        />
        <ActionButton icon="arrow-redo-outline" label="Share" onPress={() => {}} />
      </View>
    </View>
  );
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

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: BG },
  bg: { flex: 1 },

  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    gap: 10,
  },
  modeRow: { flex: 1, flexDirection: 'row', gap: 10 },
  searchIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  modePill: {
    flex: 1,
    height: 40,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: 'rgba(255,255,255,0.03)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  modePillActive: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.12)',
  },
  modeText: {
    color: TEXT_MUTED,
    fontSize: 13,
    fontWeight: '700',
  },
  modeTextActive: { color: TEXT },

  filterWrap: { paddingBottom: 8 },
  filterRow: { paddingHorizontal: 16, gap: 10 },
  chip: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: 'rgba(255,255,255,0.03)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chipActive: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderColor: 'rgba(255,255,255,0.16)',
  },
  chipText: { color: TEXT_MUTED, fontSize: 12.5, fontWeight: '700' },
  chipTextActive: { color: TEXT },

  listContent: { paddingHorizontal: 16, paddingBottom: 24 },

  stateWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 10,
  },
  stateText: {
    color: TEXT_MUTED,
    fontSize: 13,
    textAlign: 'center',
  },
  errorText: {
    color: '#FCA5A5',
    fontSize: 12.5,
    textAlign: 'center',
  },
  footerLoading: {
    paddingVertical: 14,
    alignItems: 'center',
  },

  postCard: {
    backgroundColor: CARD,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  postHeader: {
    padding: 12,
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
  },
  avatarImg: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  avatarText: { color: TEXT, fontWeight: '900' },
  userTopLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  username: { color: TEXT, fontSize: 13.5, fontWeight: '900' },
  dot: { color: TEXT_MUTED },
  time: { color: TEXT_MUTED, fontSize: 12 },
  displayName: { color: TEXT_MUTED, fontSize: 12, marginTop: 2 },

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

  postBody: { paddingHorizontal: 12, paddingBottom: 12 },
  postTitle: { color: TEXT, fontSize: 14, fontWeight: '900' },
  postSubtitle: { color: TEXT_MUTED, fontSize: 12, marginTop: 4 },

  metricsGrid: {
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricCell: {
    width: '47%',
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  metricLabel: { color: TEXT_MUTED, fontSize: 11, fontWeight: '800' },
  metricValue: { color: TEXT, fontSize: 13, fontWeight: '900', marginTop: 4 },

  caption: { color: TEXT_MUTED, fontSize: 12.5, marginTop: 10, lineHeight: 17 },

  actionsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.07)',
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
});
