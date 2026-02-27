import React, { useMemo } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { Colors } from '@/constants/Colors';
import type { SocialActivityType, SocialFeedPost } from '@/lib/social/feed';

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

function buildHeroMetric(
  post: SocialFeedPost,
  metrics: Metric[]
): Metric | null {
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

export default function SocialPostCard({
  post,
  distanceUnit,
  weightUnit,
  expanded,
  onToggleExpand,
  onPressUser,
  onToggleLike,
  onPressSession,
}: {
  post: SocialFeedPost;
  distanceUnit: 'mi' | 'km';
  weightUnit: 'lb' | 'kg';
  expanded: boolean;
  onToggleExpand: () => void;
  onPressUser?: () => void;
  onToggleLike: () => void;
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
    (post.activityType === 'run' || post.activityType === 'walk' || post.activityType === 'ride' || post.activityType === 'strength');
  const handleHeroPress = () => {
    if (hasSessionLink && onPressSession) {
      onPressSession(post);
      return;
    }
    onToggleExpand();
  };

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
          onPress={onToggleLike}
        />
        <ActionButton
          icon="chatbubble-outline"
          label={post.commentCount > 0 ? `${post.commentCount}` : 'Comment'}
          onPress={() => {}}
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
            <TouchableOpacity style={styles.openBtn} onPress={() => onPressSession(post)} activeOpacity={0.85}>
              <Ionicons name="open-outline" size={16} color={TEXT} />
              <Text style={styles.openBtnText}>Open session</Text>
            </TouchableOpacity>
          ) : null}
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
    gap: 10,
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
});
