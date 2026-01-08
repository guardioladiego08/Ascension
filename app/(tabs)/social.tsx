// app/(tabs)/social.tsx
import React, { useMemo, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

import { Colors } from '@/constants/Colors';
import LogoHeader from '@/components/my components/logoHeader';

const BG = Colors.dark.background;
const CARD = Colors.dark.card;
const BORDER = Colors.dark?.border ?? '#1F2937';
const TEXT = Colors.dark.text;
const TEXT_MUTED = Colors.dark.textMuted ?? '#9AA4BF';
const ACCENT = Colors.dark.highlight1;

type FeedMode = 'feed' | 'people';

type ActivityType = 'run' | 'ride' | 'strength' | 'brick' | 'nutrition';

type Metric = {
  label: string;
  value: string;
};

type UserLite = {
  id: string;
  username: string;
  displayName: string;
  // purely visual for mockups
  avatarColor: string;
};

type Post = {
  id: string;
  user: UserLite;
  type: ActivityType;
  createdAtLabel: string; // e.g., "2h", "Yesterday"
  title: string; // e.g., "Tempo Run"
  subtitle: string; // e.g., "Prospect Park • 38°F"
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
  {
    id: 'p3',
    user: { id: 'u3', username: 'riley_ride', displayName: 'Riley Patel', avatarColor: '#111827' },
    type: 'ride',
    createdAtLabel: 'Yesterday',
    title: 'Endurance Ride',
    subtitle: 'Indoor Cycle • Zone 2',
    metrics: [
      { label: 'Time', value: '1:15:00' },
      { label: 'Power', value: '192w avg' },
      { label: 'Cadence', value: '86 rpm' },
      { label: 'Cal', value: '712' },
    ],
    highlight: { label: 'Steady effort', icon: 'pulse-outline' },
    caption: 'Easy aerobic day. Legs feel fresh for tomorrow’s run.',
  },
  {
    id: 'p4',
    user: { id: 'u4', username: 'ava_brick', displayName: 'Ava Rodriguez', avatarColor: '#0F172A' },
    type: 'brick',
    createdAtLabel: '2d',
    title: 'Brick Session',
    subtitle: 'Bike → Run • Race prep',
    metrics: [
      { label: 'Bike', value: '22.4 mi' },
      { label: 'Run', value: '3.1 mi' },
      { label: 'Total', value: '1:38:45' },
      { label: 'Transition', value: '2:10' },
    ],
    highlight: { label: 'Fast T2', icon: 'flash-outline' },
    caption: 'Transition felt way better this week. Practicing pays off.',
  },
  {
    id: 'p5',
    user: { id: 'u5', username: 'noah_macros', displayName: 'Noah Kim', avatarColor: '#1E293B' },
    type: 'nutrition',
    createdAtLabel: '3d',
    title: 'Nutrition Check-in',
    subtitle: 'Daily targets • Consistency',
    metrics: [
      { label: 'Protein', value: '182 g' },
      { label: 'Carbs', value: '318 g' },
      { label: 'Fat', value: '72 g' },
      { label: 'Cal', value: '2,940' },
    ],
    highlight: { label: 'Hit targets', icon: 'checkmark-circle-outline' },
    caption: 'More carbs on hard days has been a game-changer for training quality.',
  },
];

// Mock “people” directory (includes post authors + extras)
const MOCK_USERS: UserLite[] = [
  ...MOCK_POSTS.map((p) => p.user),
  { id: 'u6', username: 'lena_longrun', displayName: 'Lena Park', avatarColor: '#111827' },
  { id: 'u7', username: 'tri_tanner', displayName: 'Tanner Scott', avatarColor: '#0B1220' },
  { id: 'u8', username: 'kayla_kettlebell', displayName: 'Kayla Nguyen', avatarColor: '#1F2937' },
];

function initials(nameOrUsername: string) {
  const parts = nameOrUsername.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
  return (nameOrUsername.slice(0, 2) || '').toUpperCase();
}

function formatTypePill(type: ActivityType) {
  return TYPE_LABEL[type];
}

export default function Social() {
  const router = useRouter();

  const [mode, setMode] = useState<FeedMode>('feed');
  const [activeFilter, setActiveFilter] = useState<'all' | ActivityType>('all');
  const [query, setQuery] = useState('');

  const feedData = useMemo(() => {
    if (activeFilter === 'all') return MOCK_POSTS;
    return MOCK_POSTS.filter((p) => p.type === activeFilter);
  }, [activeFilter]);

  const peopleResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return MOCK_USERS;
    return MOCK_USERS.filter((u) => u.username.toLowerCase().includes(q));
  }, [query]);

  return (
    <SafeAreaView style={styles.safe}>
      <LinearGradient colors={[BG, '#070B12']} style={styles.bg}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <LogoHeader />

          {/* Top segmented toggle */}
          <View style={styles.modeRow}>
            <ModePill
              label="Feed"
              icon="albums-outline"
              active={mode === 'feed'}
              onPress={() => setMode('feed')}
            />
            <ModePill
              label="People"
              icon="search-outline"
              active={mode === 'people'}
              onPress={() => setMode('people')}
            />
          </View>

          {mode === 'feed' ? (
            <>
              {/* Filters */}
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

              {/* Feed */}
              <FlatList
                data={feedData}
                keyExtractor={(p) => p.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
                renderItem={({ item }) => (
                  <PostCard
                    post={item}
                    onPressUser={() => {
                      // TODO: wire to your actual profile route
                      // router.push({ pathname: '/profile/[username]', params: { username: item.user.username } });
                      router.push('/(tabs)/profile');
                    }}
                  />
                )}
                ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
              />
            </>
          ) : (
            <>
              {/* People search */}
              <View style={styles.searchBox}>
                <Ionicons name="search-outline" size={18} color={TEXT_MUTED} style={{ marginRight: 10 }} />
                <TextInput
                  placeholder="Search by username"
                  placeholderTextColor={TEXT_MUTED}
                  value={query}
                  onChangeText={setQuery}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.searchInput}
                />
                {!!query && (
                  <TouchableOpacity onPress={() => setQuery('')} style={styles.clearBtn} activeOpacity={0.85}>
                    <Ionicons name="close-circle" size={18} color={TEXT_MUTED} />
                  </TouchableOpacity>
                )}
              </View>

              <Text style={styles.helperText}>
                Tip: search works on usernames (e.g., “tri”, “mason”, “macros”).
              </Text>

              <FlatList
                data={peopleResults}
                keyExtractor={(u) => u.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
                renderItem={({ item }) => (
                  <UserRow
                    user={item}
                    onPress={() => {
                      // TODO: wire to your actual public profile route
                      // router.push({ pathname: '/profile/[username]', params: { username: item.username } });
                      router.push('/(tabs)/profile');
                    }}
                  />
                )}
                ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
              />
            </>
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

function PostCard({ post, onPressUser }: { post: Post; onPressUser: () => void }) {
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
          <Text style={styles.typePillText}>{formatTypePill(post.type)}</Text>
        </View>
      </View>

      <View style={styles.postBody}>
        <Text style={styles.postTitle}>{post.title}</Text>
        <Text style={styles.postSubtitle}>{post.subtitle}</Text>

        {/* Metrics grid */}
        <View style={styles.metricsGrid}>
          {post.metrics.map((m) => (
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

      {/* Actions */}
      <View style={styles.actionsRow}>
        <ActionButton icon="heart-outline" label="Like" />
        <ActionButton icon="chatbubble-outline" label="Comment" />
        <ActionButton icon="arrow-redo-outline" label="Share" />
      </View>
    </View>
  );
}

function ActionButton({
  icon,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}) {
  return (
    <TouchableOpacity style={styles.actionBtn} activeOpacity={0.85} onPress={() => {}}>
      <Ionicons name={icon} size={18} color={TEXT_MUTED} />
      <Text style={styles.actionText}>{label}</Text>
    </TouchableOpacity>
  );
}

function UserRow({ user, onPress }: { user: UserLite; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.userCard} onPress={onPress} activeOpacity={0.85}>
      <View style={[styles.avatar, { backgroundColor: user.avatarColor }]}>
        <Text style={styles.avatarText}>{initials(user.displayName || user.username)}</Text>
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.username}>{user.username}</Text>
        <Text style={styles.displayName}>{user.displayName}</Text>
      </View>

      <TouchableOpacity style={styles.followBtn} activeOpacity={0.85} onPress={() => {}}>
        <Text style={styles.followText}>Follow</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

/* ------------------------------ Styles ------------------------------ */

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: BG },
  bg: { flex: 1 },

  modeRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
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
    letterSpacing: 0.2,
  },
  modeTextActive: { color: TEXT },

  filterWrap: {
    paddingBottom: 8,
  },
  filterRow: {
    paddingHorizontal: 16,
    gap: 10,
  },
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
  chipText: {
    color: TEXT_MUTED,
    fontSize: 12.5,
    fontWeight: '700',
  },
  chipTextActive: { color: TEXT },

  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },

  postCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: CARD,
    overflow: 'hidden',
  },
  postHeader: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  userRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  avatarText: {
    color: TEXT,
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.4,
  },
  userTopLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  username: {
    color: TEXT,
    fontSize: 13.5,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  dot: { color: TEXT_MUTED, fontSize: 12 },
  time: { color: TEXT_MUTED, fontSize: 12, fontWeight: '700' },
  displayName: { color: TEXT_MUTED, fontSize: 12.25, fontWeight: '600' },

  typePill: {
    height: 30,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  typePillText: {
    color: TEXT,
    fontSize: 12,
    fontWeight: '800',
  },

  postBody: {
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  postTitle: {
    color: TEXT,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  postSubtitle: {
    marginTop: 3,
    color: TEXT_MUTED,
    fontSize: 12.5,
    fontWeight: '600',
  },

  metricsGrid: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricCell: {
    width: '48%',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  metricLabel: {
    color: TEXT_MUTED,
    fontSize: 11.5,
    fontWeight: '700',
  },
  metricValue: {
    marginTop: 4,
    color: TEXT,
    fontSize: 13.5,
    fontWeight: '900',
  },

  highlightRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  highlightText: {
    color: TEXT,
    fontSize: 12.5,
    fontWeight: '800',
  },

  caption: {
    marginTop: 10,
    color: TEXT,
    fontSize: 12.75,
    fontWeight: '600',
    lineHeight: 18,
    opacity: 0.9,
  },

  actionsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 10,
    paddingHorizontal: 8,
    justifyContent: 'space-around',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  actionText: {
    color: TEXT_MUTED,
    fontSize: 12.5,
    fontWeight: '700',
  },

  searchBox: {
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 10,
    height: 44,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: 'rgba(255,255,255,0.03)',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    color: TEXT,
    fontSize: 14,
    fontWeight: '700',
  },
  clearBtn: {
    paddingLeft: 8,
    paddingVertical: 6,
  },
  helperText: {
    marginHorizontal: 16,
    marginBottom: 10,
    color: TEXT_MUTED,
    fontSize: 12,
    fontWeight: '600',
  },

  userCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: CARD,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  followBtn: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  followText: {
    color: TEXT,
    fontSize: 12.5,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
});
