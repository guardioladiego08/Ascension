import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
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
import { SafeAreaView } from 'react-native-safe-area-context';

import LogoHeader from '@/components/my components/logoHeader';
import { useAppTheme } from '@/providers/AppThemeProvider';
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
  const { colors, fonts, globalStyles } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);
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
      <LinearGradient
        colors={[colors.gradientTop, colors.gradientMid, colors.gradientBottom]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={globalStyles.page}
      >
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
              <Ionicons name="search-outline" size={20} color={colors.highlight1} />
            </TouchableOpacity>
          </View>

          {mode === 'feed' ? (
            <>
              <View style={styles.heroCard}>
                <Text style={styles.heroEyebrow}>Community</Text>
                <Text style={styles.heroTitle}>Social Feed</Text>
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
                  <ActivityIndicator size="small" color={colors.highlight1} />
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
                        <ActivityIndicator size="small" color={colors.textMuted} />
                      </View>
                    ) : null
                  }
                  ListEmptyComponent={
                    <View style={styles.stateWrap}>
                      <Ionicons name="newspaper-outline" size={26} color={colors.textMuted} />
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
  const { colors, fonts } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.modePill, active && styles.modePillActive]}
    >
      <Ionicons
        name={icon}
        size={16}
        color={active ? colors.blkText : colors.textMuted}
      />
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
  const { colors, fonts } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.chip, active && styles.chipActive]}
    >
      {icon ? (
        <Ionicons
          name={icon}
          size={14}
          color={active ? colors.blkText : colors.textMuted}
        />
      ) : null}
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function createStyles(
  colors: ReturnType<typeof useAppTheme>['colors'],
  fonts: ReturnType<typeof useAppTheme>['fonts']
) {
  return StyleSheet.create({
    flex: { flex: 1 },
    safe: { flex: 1, backgroundColor: colors.background },
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
      width: 42,
      height: 42,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.glowPrimary,
      backgroundColor: colors.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modePill: {
      flex: 1,
      height: 42,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card2,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    modePillActive: {
      backgroundColor: colors.highlight1,
      borderColor: colors.highlight1,
    },
    modeText: {
      color: colors.textMuted,
      fontFamily: fonts.label,
      fontSize: 13,
      lineHeight: 16,
    },
    modeTextActive: { color: colors.blkText },
    heroCard: {
      marginHorizontal: 16,
      marginTop: 2,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 20,
      backgroundColor: colors.card,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    heroEyebrow: {
      color: colors.textOffSt,
      fontFamily: fonts.label,
      fontSize: 11,
      lineHeight: 14,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    heroTitle: {
      marginTop: 6,
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 18,
      lineHeight: 22,
    },
    heroBody: {
      marginTop: 6,
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 12.5,
      lineHeight: 18,
    },
    filterWrap: { paddingBottom: 10 },
    filterRow: { paddingHorizontal: 16, gap: 10 },
    chip: {
      height: 36,
      paddingHorizontal: 12,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card2,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    chipActive: {
      backgroundColor: colors.highlight1,
      borderColor: colors.highlight1,
    },
    chipText: {
      color: colors.textMuted,
      fontFamily: fonts.label,
      fontSize: 12.5,
      lineHeight: 16,
    },
    chipTextActive: { color: colors.blkText },
    listContent: { paddingHorizontal: 16, paddingBottom: 24 },
    stateWrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
      gap: 10,
    },
    stateText: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 18,
      textAlign: 'center',
    },
    errorText: {
      color: colors.danger,
      fontFamily: fonts.body,
      fontSize: 12.5,
      lineHeight: 17,
      textAlign: 'center',
    },
    footerLoading: {
      paddingVertical: 14,
      alignItems: 'center',
    },
  });
}
