import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { Colors } from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import { useUnits } from '@/contexts/UnitsContext';

type ActivityKind = 'strength' | 'run' | 'walk' | 'cycle';
type ActivityFilter = 'all' | ActivityKind;

type ActivitySource = 'strength' | 'session' | 'outdoor';

type UnifiedActivity = {
  id: string;
  source: ActivitySource;
  kind: ActivityKind;

  startedAt: string;
  durationS: number | null;

  // cardio
  distanceM?: number | null;
  paceKm?: number | null;
  paceMi?: number | null;
  speedMps?: number | null;

  // strength
  totalVolume?: number | null;
};

type Props = {
  userId: string;
  header?: React.ReactElement | null;
  isActive?: boolean;
  refreshToken?: number;
  contentPaddingHorizontal?: number;
  gap?: number;
};

const CARD = Colors.dark.card;
const TEXT = Colors.dark.text;
const MUTED = Colors.dark.textMuted ?? '#9AA4BF';
const LB_PER_KG = 2.20462;

const PAGE_SIZE = 24;

const TABLES = {
  strengthWorkouts: { schema: 'strength', table: 'strength_workouts' },
  strengthSummary: { schema: 'strength', table: 'exercise_summary' },
  indoorSessions: { schema: 'run_walk', table: 'sessions' },
  outdoorSessions: { schema: 'run_walk', table: 'outdoor_sessions' },
};

function formatDuration(seconds?: number | null) {
  const s = seconds == null ? null : Number(seconds);
  if (!s || s <= 0) return '-';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatDistance(unit: 'mi' | 'km', m?: number | null) {
  const v = m == null ? null : Number(m);
  if (!v || v <= 0) return '-';
  return unit === 'mi'
    ? `${(v / 1609.344).toFixed(2)} mi`
    : `${(v / 1000).toFixed(2)} km`;
}

function formatPace(unit: 'mi' | 'km', km?: number | null, mi?: number | null) {
  const sec = unit === 'mi' ? mi : km;
  const s = sec == null ? null : Number(sec);
  if (!s || s <= 0) return '-';
  const mm = Math.floor(s / 60);
  let ss = Math.round(s % 60);
  // guard for rounding to 60
  if (ss === 60) {
    ss = 0;
    return `${mm + 1}:00 /${unit}`;
  }
  return `${mm}:${ss < 10 ? '0' : ''}${ss} /${unit}`;
}

function formatSpeed(unit: 'mi' | 'km', mps?: number | null) {
  const v0 = mps == null ? null : Number(mps);
  if (!v0 || v0 <= 0) return '-';
  const v = unit === 'mi' ? v0 * 2.236936 : v0 * 3.6;
  return unit === 'mi' ? `${v.toFixed(1)} mph` : `${v.toFixed(1)} kph`;
}

function formatVolume(valueKg: number | null | undefined, unit: 'kg' | 'lb') {
  const v = valueKg == null ? 0 : Number(valueKg);
  if (!Number.isFinite(v) || v <= 0) return '0';
  const display = unit === 'kg' ? v : v * LB_PER_KG;
  return Math.round(display).toLocaleString();
}

function formatCardDate(iso: string) {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return '';
  const now = new Date();
  const sameYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: '2-digit' }),
  });
}

function iconFor(kind: ActivityKind): keyof typeof Ionicons.glyphMap {
  if (kind === 'strength') return 'barbell-outline';
  if (kind === 'cycle') return 'bicycle-outline';
  return 'walk-outline';
}

function kindFromText(t: string): ActivityKind {
  const v = (t ?? '').toLowerCase();
  if (v.includes('walk')) return 'walk';
  if (v.includes('bike') || v.includes('cycle') || v.includes('ride')) return 'cycle';
  return 'run';
}

/**
 * Attempt a select; if it fails with missing-column (42703), return null so caller can try next.
 */
async function trySelectOrNull<T>(
  query: any
): Promise<{ data: T[]; error: null } | { data: []; error: any } | null> {
  const res = await query;
  if (!res.error) return { data: (res.data ?? []) as T[], error: null };
  if (res.error?.code === '42703') return null;
  return { data: [], error: res.error };
}

function FilterPill({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      style={[styles.pill, active && styles.pillActive]}
    >
      <Text style={[styles.pillText, active && styles.pillTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function ActivityGrid({
  userId,
  header = null,
  isActive = true,
  refreshToken = 0,
  contentPaddingHorizontal = 16,
  gap = 4,
}: Props) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { distanceUnit, weightUnit } = useUnits();

  const [filter, setFilter] = useState<ActivityFilter>('all');

  const [items, setItems] = useState<UnifiedActivity[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const strengthOffset = useRef(0);
  const sessionsOffset = useRef(0);
  const outdoorOffset = useRef(0);

  const strengthDone = useRef(false);
  const sessionsDone = useRef(false);
  const outdoorDone = useRef(false);

  const cardSize = useMemo(() => {
    const usable = width - contentPaddingHorizontal * 2 - gap * 2;
    return Math.floor(usable / 3);
  }, [width, contentPaddingHorizontal, gap]);

  // -----------------------------
  // Strength page
  // -----------------------------
  const fetchStrengthPage = useCallback(
    async (from: number, to: number) => {
      const base = supabase
        .schema(TABLES.strengthWorkouts.schema)
        .from(TABLES.strengthWorkouts.table);

      let workouts: any[] = [];
      let durationMode: { type: 'col'; key: string } | { type: 'none' } = { type: 'none' };

      const t1 = await trySelectOrNull<any>(
        base
          .select('id, started_at, total_time_s')
          .eq('user_id', userId)
          .order('started_at', { ascending: false })
          .range(from, to)
      );
      if (t1 && t1.error) throw t1.error;
      if (t1) {
        workouts = t1.data;
        durationMode = { type: 'col', key: 'total_time_s' };
      }

      if (!t1) {
        const t2 = await trySelectOrNull<any>(
          base
            .select('id, started_at, duration_s')
            .eq('user_id', userId)
            .order('started_at', { ascending: false })
            .range(from, to)
        );
        if (t2 && t2.error) throw t2.error;
        if (t2) {
          workouts = t2.data;
          durationMode = { type: 'col', key: 'duration_s' };
        }
      }

      if (!t1 && workouts.length === 0) {
        const res = await base
          .select('id, started_at')
          .eq('user_id', userId)
          .order('started_at', { ascending: false })
          .range(from, to);

        if (res.error) throw res.error;
        workouts = res.data ?? [];
        durationMode = { type: 'none' };
      }

      const workoutIds = workouts.map((w) => w.id);

      const volumeMap = new Map<string, number>();
      if (workoutIds.length) {
        const volRes = await supabase
          .schema(TABLES.strengthSummary.schema)
          .from(TABLES.strengthSummary.table)
          .select('strength_workout_id, vol')
          .eq('user_id', userId)
          .in('strength_workout_id', workoutIds);

        if (volRes.error) throw volRes.error;

        for (const r of volRes.data ?? []) {
          const k = String((r as any).strength_workout_id);
          volumeMap.set(k, (volumeMap.get(k) ?? 0) + Number((r as any).vol ?? 0));
        }
      }

      const page: UnifiedActivity[] = workouts.map((w) => {
        let durationS: number | null = null;
        if (durationMode.type === 'col') {
          const v = w[durationMode.key];
          durationS = v == null ? null : Number(v);
        }

        return {
          id: String(w.id),
          source: 'strength',
          kind: 'strength',
          startedAt: w.started_at,
          durationS,
          totalVolume: volumeMap.get(String(w.id)) ?? 0,
        };
      });

      return page;
    },
    [userId]
  );

  // -----------------------------
  // Indoor sessions: run_walk.sessions
  // -----------------------------
  const fetchSessionsPage = useCallback(
    async (from: number, to: number, activeFilter: ActivityFilter) => {
      let q = supabase
        .schema(TABLES.indoorSessions.schema)
        .from(TABLES.indoorSessions.table)
        .select(
          'id, exercise_type, status, started_at, ended_at, total_time_s, total_distance_m, avg_speed_mps, avg_pace_s_per_km, avg_pace_s_per_mi'
        )
        .eq('user_id', userId)
        .eq('status', 'completed')
        .order('started_at', { ascending: false })
        .range(from, to);

      const res = await q;
      if (res.error) throw res.error;

      const page = (res.data ?? []).map((r: any) => {
        const kind = kindFromText(String(r.exercise_type ?? ''));

        const paceKm = r.avg_pace_s_per_km == null ? null : Number(r.avg_pace_s_per_km);
        const paceMi =
          r.avg_pace_s_per_mi != null
            ? Number(r.avg_pace_s_per_mi)
            : paceKm == null
              ? null
              : paceKm * 1.609344;

        return {
          id: String(r.id),
          source: 'session',
          kind,
          startedAt: r.started_at,
          durationS: r.total_time_s == null ? null : Number(r.total_time_s),
          distanceM: r.total_distance_m == null ? null : Number(r.total_distance_m),
          paceKm,
          paceMi,
          speedMps: r.avg_speed_mps == null ? null : Number(r.avg_speed_mps),
        } as UnifiedActivity;
      });

      if (activeFilter === 'all') return page;
      return page.filter((item) => {
        if (activeFilter === 'strength') return false;
        return item.kind === activeFilter;
      });
    },
    [userId]
  );

  // -----------------------------
  // Outdoor sessions: run_walk.outdoor_sessions
  // -----------------------------
  const fetchOutdoorPage = useCallback(
    async (from: number, to: number, activeFilter: ActivityFilter) => {
      let q = supabase
        .schema(TABLES.outdoorSessions.schema)
        .from(TABLES.outdoorSessions.table)
        .select(
          'id, activity_type, started_at, ended_at, duration_s, distance_m, avg_pace_s_per_km, avg_speed_mps'
        )
        .eq('user_id', userId)
        .eq('status', 'completed')
        .not('ended_at', 'is', null)
        .order('started_at', { ascending: false })
        .range(from, to);

      const res = await q;
      if (res.error) throw res.error;

      const page = (res.data ?? []).map((r: any) => {
        const kind = kindFromText(String(r.activity_type ?? ''));

        const paceKm = r.avg_pace_s_per_km == null ? null : Number(r.avg_pace_s_per_km);
        const paceMi = paceKm == null ? null : paceKm * 1.609344;

        return {
          id: String(r.id),
          source: 'outdoor',
          kind,
          startedAt: r.started_at,
          durationS: r.duration_s == null ? null : Number(r.duration_s),
          distanceM: r.distance_m == null ? null : Number(r.distance_m),
          paceKm,
          paceMi,
          speedMps: r.avg_speed_mps == null ? null : Number(r.avg_speed_mps),
        } as UnifiedActivity;
      });

      if (activeFilter === 'all') return page;
      return page.filter((item) => {
        if (activeFilter === 'strength') return false;
        return item.kind === activeFilter;
      });
    },
    [userId]
  );

  const resetPagination = useCallback(() => {
    strengthOffset.current = 0;
    sessionsOffset.current = 0;
    outdoorOffset.current = 0;

    strengthDone.current = false;
    sessionsDone.current = false;
    outdoorDone.current = false;

    setItems([]);
  }, []);

  const fetchNext = useCallback(
    async (reset: boolean) => {
      // Always render header; when userId not ready, stop loading and show empty state.
      if (!isActive) {
        setLoadingInitial(false);
        setLoadingMore(false);
        return;
      }

      if (!userId) {
        if (reset) resetPagination();
        setError(null);
        setLoadingInitial(false);
        setLoadingMore(false);
        return;
      }

      const wantsStrength = filter === 'all' || filter === 'strength';
      const wantsCardio = filter === 'all' || filter === 'run' || filter === 'walk' || filter === 'cycle';

      // If not reset and everything requested is already done, do nothing.
      if (!reset) {
        const strengthAllDone = !wantsStrength || strengthDone.current;
        const cardioAllDone = !wantsCardio || (sessionsDone.current && outdoorDone.current);
        if (strengthAllDone && cardioAllDone) return;
      }

      if (reset) resetPagination();

      setError(null);
      if (reset) setLoadingInitial(true);
      else setLoadingMore(true);

      try {
        const incoming: UnifiedActivity[] = [];

        if (wantsStrength && !strengthDone.current) {
          const page = await fetchStrengthPage(
            strengthOffset.current,
            strengthOffset.current + PAGE_SIZE - 1
          );
          strengthOffset.current += page.length;
          if (page.length < PAGE_SIZE) strengthDone.current = true;
          incoming.push(...page);
        } else if (!wantsStrength) {
          strengthDone.current = true;
        }

        if (wantsCardio && !sessionsDone.current) {
          const page = await fetchSessionsPage(
            sessionsOffset.current,
            sessionsOffset.current + PAGE_SIZE - 1,
            filter
          );
          sessionsOffset.current += page.length;
          if (page.length < PAGE_SIZE) sessionsDone.current = true;
          incoming.push(...page);
        } else if (!wantsCardio) {
          sessionsDone.current = true;
        }

        if (wantsCardio && !outdoorDone.current) {
          const page = await fetchOutdoorPage(
            outdoorOffset.current,
            outdoorOffset.current + PAGE_SIZE - 1,
            filter
          );
          outdoorOffset.current += page.length;
          if (page.length < PAGE_SIZE) outdoorDone.current = true;
          incoming.push(...page);
        } else if (!wantsCardio) {
          outdoorDone.current = true;
        }

        setItems((prev) => {
          const map = new Map(prev.map((p) => [`${p.source}:${p.id}`, p]));
          for (const i of incoming) map.set(`${i.source}:${i.id}`, i);

          return [...map.values()].sort(
            (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
          );
        });
      } catch (e: any) {
        console.error('[ActivityGrid] fetchNext failed', e);
        setError(e?.message?.trim?.() ? e.message : 'Failed to load activities');
      } finally {
        setLoadingInitial(false);
        setLoadingMore(false);
      }
    },
    [
      userId,
      isActive,
      filter,
      fetchStrengthPage,
      fetchSessionsPage,
      fetchOutdoorPage,
      resetPagination,
    ]
  );

  // Fetch when active + user changes
  useEffect(() => {
    if (isActive) fetchNext(true);
  }, [isActive, userId, fetchNext]);

  // External refresh trigger
  useEffect(() => {
    if (isActive) fetchNext(true);
  }, [refreshToken, isActive, fetchNext]);

  // Filter change
  useEffect(() => {
    if (isActive) fetchNext(true);
  }, [filter, isActive, fetchNext]);

  const headerWithFilter = useMemo(() => {
    return (
      <View>
        {header}

        <View style={styles.filterRow}>
          <FilterPill label="All" active={filter === 'all'} onPress={() => setFilter('all')} />
          <FilterPill label="Strength" active={filter === 'strength'} onPress={() => setFilter('strength')} />
          <FilterPill label="Run" active={filter === 'run'} onPress={() => setFilter('run')} />
          <FilterPill label="Walk" active={filter === 'walk'} onPress={() => setFilter('walk')} />
          <FilterPill label="Bike" active={filter === 'cycle'} onPress={() => setFilter('cycle')} />
        </View>
      </View>
    );
  }, [header, filter]);

  const renderCard = ({ item, index }: { item: UnifiedActivity; index: number }) => {
    const dateLabel = formatCardDate(item.startedAt);

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => {
          if (item.source === 'strength') {
            // Strength activity cards represent workout IDs.
            // Open the workout summary screen (same destination as after finishing a workout).
            router.push({ pathname: '/add/Strength/[id]', params: { id: item.id } });
            return;
          }
          if (item.source === 'outdoor') {
            router.push({
              pathname: '/progress/outdoor/[id]',
              params: { id: item.id },
            });
            return;
          }
          router.push({
            pathname: '/progress/run_walk/[sessionId]',
            params: { sessionId: item.id },
          });
        }}
        style={[
          styles.card,
          {
            width: cardSize,
            height: cardSize,
            marginRight: index % 3 !== 2 ? gap : 0,
            marginBottom: gap,
          },
        ]}
      >
        <View style={styles.badge}>
          <Ionicons name={iconFor(item.kind)} size={12} color={TEXT} />
        </View>

        <View style={styles.overlay}>
          <Text style={styles.dateText}>{dateLabel}</Text>

          <Text style={styles.overlayText}>{formatDuration(item.durationS)}</Text>

          {item.kind === 'strength' ? (
            <View style={styles.volumeRow}>
              <Text style={styles.overlayText}>{formatVolume(item.totalVolume, weightUnit)}</Text>
              <View style={styles.unitChip}>
                <Ionicons name="barbell-outline" size={9} color={TEXT} />
                <Text style={styles.unitChipText}>{weightUnit}</Text>
              </View>
            </View>
          ) : item.kind === 'cycle' ? (
            <Text style={styles.overlayText}>
              {formatDistance(distanceUnit, item.distanceM)} • {formatSpeed(distanceUnit, item.speedMps)}
            </Text>
          ) : (
            <Text style={styles.overlayText}>
              {formatDistance(distanceUnit, item.distanceM)} • {formatPace(distanceUnit, item.paceKm, item.paceMi)}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const EmptyState = useCallback(() => {
    // header is rendered by FlatList ListHeaderComponent; this is only the body below it.
    if (loadingInitial) {
      return (
        <View style={styles.emptyWrap}>
          <ActivityIndicator />
          <Text style={styles.emptyText}>Loading activity…</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>{error}</Text>
        </View>
      );
    }

    if (!userId) {
      return (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>Loading profile…</Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.emptyText}>No activity yet.</Text>
      </View>
    );
  }, [loadingInitial, error, userId]);

  return (
    <FlatList
      data={items}
      renderItem={renderCard}
      keyExtractor={(i) => `${i.source}:${i.id}`}
      numColumns={3}
      ListHeaderComponent={headerWithFilter}
      ListEmptyComponent={EmptyState}
      contentContainerStyle={{
        paddingHorizontal: contentPaddingHorizontal,
        paddingTop: 12,
        paddingBottom: 24,
      }}
      showsVerticalScrollIndicator={false}
      onEndReached={() => {
        if (!loadingMore && !loadingInitial) fetchNext(false);
      }}
      onEndReachedThreshold={0.6}
      ListFooterComponent={
        loadingMore ? (
          <ActivityIndicator style={{ margin: 16 }} />
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    marginRight: 8,
    marginBottom: 8,
  },
  pillActive: {
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  pillText: {
    color: MUTED,
    fontSize: 12,
    fontWeight: '700',
  },
  pillTextActive: {
    color: TEXT,
  },

  emptyWrap: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  emptyText: {
    color: MUTED,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 16,
  },

  card: {
    backgroundColor: CARD,
    borderRadius: 6,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  badge: {
    position: 'absolute',
    top: 6,
    left: 6,
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 6,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  dateText: {
    color: MUTED,
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 2,
  },
  overlayText: {
    color: TEXT,
    fontSize: 10,
    fontWeight: '700',
  },
  volumeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  unitChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  unitChipText: {
    color: TEXT,
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
});
