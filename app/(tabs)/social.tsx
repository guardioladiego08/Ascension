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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

import { Colors } from '@/constants/Colors';
import LogoHeader from '@/components/my components/logoHeader';
import { supabase } from '@/lib/supabase';
import {
  getSocialFeedPage,
  togglePostLike,
  type SocialActivityType,
  type SocialFeedPost,
} from '@/lib/social/feed';
import { useUnits } from '@/contexts/UnitsContext';

import ActivityTab from './social/components/ActivityTab';
import SocialPostCard from './social/components/SocialPostCard';

const BG = Colors.dark.background;
const BORDER = Colors.dark?.border ?? '#1F2937';
const TEXT = Colors.dark.text;
const TEXT_MUTED = Colors.dark.textMuted ?? '#9AA4BF';
const ACCENT = Colors.dark.highlight1;

const PAGE_SIZE = 16;

type Mode = 'feed' | 'activity';
type ActivityFilter = 'all' | SocialActivityType;

const FILTERS: Array<{ key: ActivityFilter; label: string; icon?: keyof typeof Ionicons.glyphMap }> = [
  { key: 'all', label: 'All' },
  { key: 'run', label: 'Run', icon: 'walk-outline' },
  { key: 'walk', label: 'Walk', icon: 'walk-outline' },
  { key: 'ride', label: 'Ride', icon: 'bicycle-outline' },
  { key: 'strength', label: 'Strength', icon: 'barbell-outline' },
  { key: 'nutrition', label: 'Nutrition', icon: 'nutrition-outline' },
];

export default function Social() {
  const router = useRouter();
  const { distanceUnit, weightUnit } = useUnits();

  const [mode, setMode] = useState<Mode>('feed');
  const [activeFilter, setActiveFilter] = useState<ActivityFilter>('all');

  const [posts, setPosts] = useState<SocialFeedPost[]>([]);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [loadingFeed, setLoadingFeed] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [errorText, setErrorText] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const first = await supabase.auth.getUser();
        if (first.data.user?.id) {
          if (mounted) setMyUserId(first.data.user.id);
          return;
        }

        await supabase.auth.refreshSession();
        const second = await supabase.auth.getUser();
        if (mounted) setMyUserId(second.data.user?.id ?? null);
      } catch {
        if (mounted) setMyUserId(null);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

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
      setExpandedIds({});
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

  const onToggleExpand = useCallback((postId: string) => {
    setExpandedIds((prev) => ({ ...prev, [postId]: !prev[postId] }));
  }, []);

  const onAdjustCommentCount = useCallback((postId: string, delta: number) => {
    if (!delta) return;

    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              commentCount: Math.max(0, p.commentCount + delta),
            }
          : p
      )
    );
  }, []);

  const onOpenProfile = useCallback(
    (userId: string) => {
      if (!userId) return;
      router.push({ pathname: '/social/[userId]', params: { userId } });
    },
    [router]
  );

  const onOpenSession = useCallback(
    (post: SocialFeedPost) => {
      if (!post.sessionId) return;

      if (post.activityType === 'strength') {
        router.push({ pathname: '/add/Strength/[id]', params: { id: post.sessionId, postId: post.id } });
        return;
      }

      if (post.activityType === 'run' || post.activityType === 'walk' || post.activityType === 'ride') {
        router.push({
          pathname: '/progress/run_walk/[sessionId]',
          params: { sessionId: post.sessionId, postId: post.id },
        });
      }
    },
    [router]
  );

  const feedData = useMemo(
    () => (myUserId ? posts.filter((p) => p.userId !== myUserId) : posts),
    [myUserId, posts]
  );

  return (
    <SafeAreaView style={styles.safe}>
      <LinearGradient colors={[BG, '#0A111C']} style={styles.bg}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <LogoHeader />

          <View style={styles.topRow}>
            <View style={styles.modeRow}>
              <ModePill
                label="Feed"
                icon="albums-outline"
                active={mode === 'feed'}
                onPress={() => setMode('feed')}
              />
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
              <View style={styles.heroCard}>
                <Text style={styles.heroTitle}>Community Feed</Text>
                <Text style={styles.heroBody}>
                  Scroll like Instagram, tap any post card to open workout summaries, and filter by session type.
                </Text>
              </View>

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
                    <SocialPostCard
                      post={item}
                      distanceUnit={distanceUnit}
                      weightUnit={weightUnit}
                      expanded={!!expandedIds[item.id]}
                      onToggleExpand={() => onToggleExpand(item.id)}
                      onToggleLike={() => onToggleLike(item)}
                      onAdjustCommentCount={(delta) => onAdjustCommentCount(item.id, delta)}
                      onPressUser={() => onOpenProfile(item.userId)}
                      onPressProfile={onOpenProfile}
                      onPressSession={onOpenSession}
                    />
                  )}
                  ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
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
                      <Text style={styles.stateText}>No posts yet from people you follow.</Text>
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
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.modePill, active && styles.modePillActive]}
    >
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
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.chip, active && styles.chipActive]}
    >
      {icon ? <Ionicons name={icon} size={14} color={active ? TEXT : TEXT_MUTED} /> : null}
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
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
    paddingBottom: 8,
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
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderColor: 'rgba(255,255,255,0.16)',
  },
  modeText: {
    color: TEXT_MUTED,
    fontSize: 13,
    fontWeight: '700',
  },
  modeTextActive: { color: TEXT },

  heroCard: {
    marginHorizontal: 16,
    marginTop: 2,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.03)',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  heroTitle: {
    color: TEXT,
    fontSize: 16,
    fontWeight: '900',
  },
  heroBody: {
    marginTop: 5,
    color: TEXT_MUTED,
    fontSize: 12.5,
    lineHeight: 18,
  },

  filterWrap: { paddingBottom: 10 },
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
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderColor: 'rgba(255,255,255,0.18)',
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
});
