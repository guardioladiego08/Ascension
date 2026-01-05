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

type UnifiedActivity = {
  id: string;
  kind: ActivityKind;
  startedAt: string;
  durationS: number | null;

  // run/walk
  distanceM?: number | null;
  paceKm?: number | null;
  paceMi?: number | null;

  // strength
  totalVolume?: number | null;
};

type Props = {
  userId: string;
  header?: React.ReactElement | null;

  // only refresh/fetch when active
  isActive?: boolean;
  refreshToken?: number;

  // layout
  contentPaddingHorizontal?: number;
  gap?: number;
};

const BG = Colors.dark.background;
const CARD = Colors.dark.card;
const TEXT = Colors.dark.text;
const MUTED = Colors.dark.textMuted ?? '#9AA4BF';

const PAGE_SIZE = 24;

const TABLES = {
  strengthWorkouts: { schema: 'strength', table: 'strength_workouts' },
  strengthSummary: { schema: 'strength', table: 'exercise_summary' },
  runWalkSessions: { schema: 'run_walk', table: 'sessions' },
};

function formatDuration(seconds?: number | null) {
  if (!seconds || seconds <= 0) return '-';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatDistance(m?: number | null, unit: 'mi' | 'km') {
  if (!m || m <= 0) return '-';
  return unit === 'mi'
    ? `${(m / 1609.344).toFixed(2)} mi`
    : `${(m / 1000).toFixed(2)} km`;
}

function formatPace(km?: number | null, mi?: number | null, unit: 'mi' | 'km') {
  const sec = unit === 'mi' ? mi : km;
  if (!sec || sec <= 0) return '-';
  const mm = Math.floor(sec / 60);
  const ss = Math.round(sec % 60);
  return `${mm}:${ss < 10 ? '0' : ''}${ss} /${unit}`;
}

function iconFor(kind: ActivityKind): keyof typeof Ionicons.glyphMap {
  if (kind === 'strength') return 'barbell-outline';
  if (kind === 'cycle') return 'bicycle-outline';
  return 'walk-outline';
}

function safeSecondsFromDates(start?: string | null, end?: string | null): number | null {
  if (!start || !end) return null;
  const t0 = Date.parse(start);
  const t1 = Date.parse(end);
  if (!Number.isFinite(t0) || !Number.isFinite(t1)) return null;
  const s = Math.round((t1 - t0) / 1000);
  return s > 0 ? s : null;
}

/**
 * Attempt a select; if it fails with missing-column (42703), return null so caller can try next.
 */
async function trySelectOrNull<T>(
  query: Promise<{ data: T[] | null; error: any }>,
): Promise<{ data: T[]; error: null } | { data: []; error: any } | null> {
  const res = await query;
  if (!res.error) return { data: (res.data ?? []) as T[], error: null };
  if (res.error?.code === '42703') return null; // missing column, try another shape
  return { data: [], error: res.error }; // real error
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
  const { units } = useUnits();
  const distanceUnit = (units?.distance ?? 'mi') as 'mi' | 'km';

  const [items, setItems] = useState<UnifiedActivity[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const strengthOffset = useRef(0);
  const runWalkOffset = useRef(0);
  const strengthDone = useRef(false);
  const runWalkDone = useRef(false);

  const cardSize = useMemo(() => {
    const usable = width - contentPaddingHorizontal * 2 - gap * 2;
    return Math.floor(usable / 3);
  }, [width, contentPaddingHorizontal, gap]);

  const fetchStrengthPage = useCallback(
    async (from: number, to: number) => {
      const base = supabase
        .schema(TABLES.strengthWorkouts.schema)
        .from(TABLES.strengthWorkouts.table);

      // Try multiple schema shapes to avoid 42703
      // Order matters: prefer explicit stored duration, then computed from ended_at, then none.
      let workouts: any[] = [];
      let durationMode:
        | { type: 'col'; key: string }
        | { type: 'dates'; startKey: 'started_at'; endKey: 'ended_at' }
        | { type: 'none' } = { type: 'none' };

      // 1) started_at + total_time_s
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

      // 2) started_at + duration_s
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

      // 3) started_at + total_duration_s
      if (!t1 && workouts.length === 0) {
        const t3 = await trySelectOrNull<any>(
          base
            .select('id, started_at, total_duration_s')
            .eq('user_id', userId)
            .order('started_at', { ascending: false })
            .range(from, to)
        );
        if (t3 && t3.error) throw t3.error;
        if (t3) {
          workouts = t3.data;
          durationMode = { type: 'col', key: 'total_duration_s' };
        }
      }

      // 4) started_at + time_s
      if (!t1 && workouts.length === 0) {
        const t4 = await trySelectOrNull<any>(
          base
            .select('id, started_at, time_s')
            .eq('user_id', userId)
            .order('started_at', { ascending: false })
            .range(from, to)
        );
        if (t4 && t4.error) throw t4.error;
        if (t4) {
          workouts = t4.data;
          durationMode = { type: 'col', key: 'time_s' };
        }
      }

      // 5) Compute duration from ended_at (if column exists)
      if (!t1 && workouts.length === 0) {
        const t5 = await trySelectOrNull<any>(
          base
            .select('id, started_at, ended_at')
            .eq('user_id', userId)
            .order('started_at', { ascending: false })
            .range(from, to)
        );
        if (t5 && t5.error) throw t5.error;
        if (t5) {
          workouts = t5.data;
          durationMode = { type: 'dates', startKey: 'started_at', endKey: 'ended_at' };
        }
      }

      // 6) Minimal fallback
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

      // Aggregate volume from exercise_summary
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
        } else if (durationMode.type === 'dates') {
          durationS = safeSecondsFromDates(w.started_at, w.ended_at);
        }

        return {
          id: String(w.id),
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

  const fetchRunWalkPage = useCallback(
    async (from: number, to: number) => {
      const res = await supabase
        .schema(TABLES.runWalkSessions.schema)
        .from(TABLES.runWalkSessions.table)
        .select(
          'id, exercise_type, started_at, total_time_s, total_distance_m, avg_pace_s_per_km, avg_pace_s_per_mi'
        )
        .eq('user_id', userId)
        .order('started_at', { ascending: false })
        .range(from, to);

      if (res.error) throw res.error;

      return (res.data ?? []).map((r: any) => ({
        id: String(r.id),
        kind: r.exercise_type as ActivityKind, // enum is fine
        startedAt: r.started_at,
        durationS: r.total_time_s == null ? null : Number(r.total_time_s),
        distanceM: r.total_distance_m == null ? null : Number(r.total_distance_m),
        paceKm: r.avg_pace_s_per_km == null ? null : Number(r.avg_pace_s_per_km),
        paceMi: r.avg_pace_s_per_mi == null ? null : Number(r.avg_pace_s_per_mi),
      })) as UnifiedActivity[];
    },
    [userId]
  );

  const fetchNext = useCallback(
    async (reset: boolean) => {
      if (!userId || !isActive) return;

      if (reset) {
        strengthOffset.current = 0;
        runWalkOffset.current = 0;
        strengthDone.current = false;
        runWalkDone.current = false;
        setItems([]);
      }

      setError(null);
      reset ? setLoadingInitial(true) : setLoadingMore(true);

      try {
        const incoming: UnifiedActivity[] = [];

        if (!strengthDone.current) {
          const page = await fetchStrengthPage(
            strengthOffset.current,
            strengthOffset.current + PAGE_SIZE - 1
          );
          strengthOffset.current += page.length;
          if (page.length < PAGE_SIZE) strengthDone.current = true;
          incoming.push(...page);
        }

        if (!runWalkDone.current) {
          const page = await fetchRunWalkPage(
            runWalkOffset.current,
            runWalkOffset.current + PAGE_SIZE - 1
          );
          runWalkOffset.current += page.length;
          if (page.length < PAGE_SIZE) runWalkDone.current = true;
          incoming.push(...page);
        }

        setItems((prev) => {
          const map = new Map(prev.map((p) => [`${p.kind}:${p.id}`, p]));
          for (const i of incoming) map.set(`${i.kind}:${i.id}`, i);
          return [...map.values()].sort(
            (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
          );
        });
      } catch (e: any) {
        console.error('[ActivityGrid] fetchNext failed', e);
        setError(e?.message ?? 'Failed to load activities');
      } finally {
        setLoadingInitial(false);
        setLoadingMore(false);
      }
    },
    [userId, isActive, fetchStrengthPage, fetchRunWalkPage]
  );

  useEffect(() => {
    if (isActive) fetchNext(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, isActive]);

  useEffect(() => {
    if (isActive) fetchNext(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshToken, isActive]);

  const renderCard = ({ item, index }: { item: UnifiedActivity; index: number }) => (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => {
        if (item.kind === 'strength') {
          router.push({
            pathname: '/progress/strength/[id]',
            params: { id: item.id },
          });
        } else {
          router.push({
            pathname: '/progress/run_walk/[sessionId]',
            params: { sessionId: item.id },
          });
        }
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
        <Text style={styles.overlayText}>{formatDuration(item.durationS)}</Text>

        {item.kind === 'strength' ? (
          <Text style={styles.overlayText}>
            {Math.round(item.totalVolume ?? 0).toLocaleString()} vol
          </Text>
        ) : (
          <Text style={styles.overlayText}>
            {formatDistance(item.distanceM, distanceUnit)} •{' '}
            {formatPace(item.paceKm, item.paceMi, distanceUnit)}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  if (loadingInitial) {
    return (
      <View style={styles.loadingWrap}>
        {header}
        <View style={{ height: 14 }} />
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <FlatList
      data={items}
      renderItem={renderCard}
      keyExtractor={(i) => `${i.kind}:${i.id}`}
      numColumns={3}
      ListHeaderComponent={header}
      contentContainerStyle={{
        paddingHorizontal: contentPaddingHorizontal,
        paddingTop: 12,
        paddingBottom: 24,
      }}
      showsVerticalScrollIndicator={false}
      onEndReached={() => !loadingMore && fetchNext(false)}
      onEndReachedThreshold={0.6}
      ListFooterComponent={
        loadingMore ? <ActivityIndicator style={{ margin: 16 }} /> : error ? (
          <View style={{ paddingVertical: 12, alignItems: 'center' }}>
            <Text style={{ color: MUTED, fontSize: 12 }}>{error}</Text>
          </View>
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  loadingWrap: {
    flex: 1,
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
  overlayText: {
    color: TEXT,
    fontSize: 10,
    fontWeight: '700',
  },
});
