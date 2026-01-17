// app/(tabs)/social.tsx
import React, { useMemo, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

import { Colors } from '@/constants/Colors';
import LogoHeader from '@/components/my components/logoHeader';

import ActivityTab from './social/components/ActivityTab';

const BG = Colors.dark.background;
const CARD = Colors.dark.card;
const BORDER = Colors.dark?.border ?? '#1F2937';
const TEXT = Colors.dark.text;
const TEXT_MUTED = Colors.dark.textMuted ?? '#9AA4BF';
const ACCENT = Colors.dark.highlight1;

type Mode = 'feed' | 'activity';

type ActivityType = 'run' | 'ride' | 'strength' | 'brick' | 'nutrition';

type Metric = {
  label: string;
  value: string;
};

type UserLite = {
  id: string;
  username: string;
  displayName: string;
  avatarColor: string;
};

type Post = {
  id: string;
  user: UserLite;
  type: ActivityType;
  createdAtLabel: string;
  title: string;
  subtitle: string;
  metrics: Metric[];
  highlight?: { label: string; icon: keyof typeof Ionicons.glyphMap };
  caption?: string;
};

const TYPE_LABEL: Record<ActivityType, string> = {
  run: 'Run',
  ride: 'Bike',
  strength: 'Lift',
  brick: 'Brick',
  nutrition: 'Nutrition',
};

const TYPE_ICON: Record<ActivityType, keyof typeof Ionicons.glyphMap> = {
  run: 'walk-outline',
  ride: 'bicycle-outline',
  strength: 'barbell-outline',
  brick: 'repeat-outline',
  nutrition: 'nutrition-outline',
};

const FILTERS: Array<{ key: 'all' | ActivityType; label: string; icon?: keyof typeof Ionicons.glyphMap }> = [
  { key: 'all', label: 'All' },
  { key: 'run', label: 'Run', icon: TYPE_ICON.run },
  { key: 'ride', label: 'Bike', icon: TYPE_ICON.ride },
  { key: 'strength', label: 'Lift', icon: TYPE_ICON.strength },
  { key: 'brick', label: 'Brick', icon: TYPE_ICON.brick },
  { key: 'nutrition', label: 'Nutrition', icon: TYPE_ICON.nutrition },
];

const MOCK_POSTS: Post[] = [
  {
    id: 'p1',
    user: { id: 'u1', username: 'mason_miles', displayName: 'Mason Miles', avatarColor: '#374151' },
    type: 'run',
    createdAtLabel: '2h',
    title: 'Tempo Run',
    subtitle: 'McCarren Park • Outdoor',
    metrics: [
      { label: 'Distance', value: '5.2 mi' },
      { label: 'Time', value: '39:12' },
      { label: 'Pace', value: '7:32 /mi' },
      { label: 'HR', value: '156 avg' },
    ],
    highlight: { label: 'Negative split', icon: 'trending-down-outline' },
    caption: 'Felt smooth after the warm-up. Kept it controlled.',
  },
  {
    id: 'p2',
    user: { id: 'u2', username: 'sophia_strong', displayName: 'Sophia Chen', avatarColor: '#1F2937' },
    type: 'strength',
    createdAtLabel: '5h',
    title: 'Push Day',
    subtitle: 'Strength • Upper',
    metrics: [
      { label: 'Volume', value: '18,420 lb' },
      { label: 'Top Set', value: 'Bench 185×5' },
      { label: 'RPE', value: '8.0' },
      { label: 'Duration', value: '61 min' },
    ],
    highlight: { label: 'New 5RM', icon: 'trophy-outline' },
    caption: 'Bench finally moved the way it should. Slow eccentrics helped.',
  },
];

function initials(nameOrUsername: string) {
  const parts = nameOrUsername.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
  return (nameOrUsername.slice(0, 2) || '').toUpperCase();
}

export default function Social() {
  const router = useRouter();

  const [mode, setMode] = useState<Mode>('feed');
  const [activeFilter, setActiveFilter] = useState<'all' | ActivityType>('all');

  const feedData = useMemo(() => {
    if (activeFilter === 'all') return MOCK_POSTS;
    return MOCK_POSTS.filter((p) => p.type === activeFilter);
  }, [activeFilter]);

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

              <FlatList
                data={feedData}
                keyExtractor={(p) => p.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
                renderItem={({ item }) => (
                  <PostCard
                    post={item}
                    onPressUser={() => {
                      // replace with real user_id once your feed is real
                      router.push('/social/search');
                    }}
                  />
                )}
                ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
              />
            </>
          ) : (
            <ActivityTab />
          )}
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
}

/* ----------------------------- Components ----------------------------- */

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

function PostCard({ post, onPressUser }: { post: any; onPressUser: () => void }) {
  return (
    <View style={styles.postCard}>
      <View style={styles.postHeader}>
        <TouchableOpacity style={styles.userRow} onPress={onPressUser} activeOpacity={0.85}>
          <View style={[styles.avatar, { backgroundColor: post.user.avatarColor }]}>
            <Text style={styles.avatarText}>{initials(post.user.displayName || post.user.username)}</Text>
          </View>

          <View style={{ flex: 1 }}>
            <View style={styles.userTopLine}>
              <Text style={styles.username}>{post.user.username}</Text>
              <Text style={styles.dot}>•</Text>
              <Text style={styles.time}>{post.createdAtLabel}</Text>
            </View>
            <Text style={styles.displayName}>{post.user.displayName}</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.typePill}>
          <Ionicons name={TYPE_ICON[post.type]} size={14} color={TEXT} />
          <Text style={styles.typePillText}>{TYPE_LABEL[post.type]}</Text>
        </View>
      </View>

      <View style={styles.postBody}>
        <Text style={styles.postTitle}>{post.title}</Text>
        <Text style={styles.postSubtitle}>{post.subtitle}</Text>

        <View style={styles.metricsGrid}>
          {post.metrics.map((m: any) => (
            <View key={m.label} style={styles.metricCell}>
              <Text style={styles.metricLabel}>{m.label}</Text>
              <Text style={styles.metricValue}>{m.value}</Text>
            </View>
          ))}
        </View>

        {post.highlight ? (
          <View style={styles.highlightRow}>
            <Ionicons name={post.highlight.icon} size={16} color={ACCENT} />
            <Text style={styles.highlightText}>{post.highlight.label}</Text>
          </View>
        ) : null}

        {post.caption ? <Text style={styles.caption}>{post.caption}</Text> : null}
      </View>

      <View style={styles.actionsRow}>
        <ActionButton icon="heart-outline" label="Like" />
        <ActionButton icon="chatbubble-outline" label="Comment" />
        <ActionButton icon="arrow-redo-outline" label="Share" />
      </View>
    </View>
  );
}

function ActionButton({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <TouchableOpacity style={styles.actionBtn} activeOpacity={0.85} onPress={() => {}}>
      <Ionicons name={icon} size={18} color={TEXT_MUTED} />
      <Text style={styles.actionText}>{label}</Text>
    </TouchableOpacity>
  );
}

/* ------------------------------ Styles ------------------------------ */

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

  highlightRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  highlightText: { color: TEXT, fontSize: 12.5, fontWeight: '800' },
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
