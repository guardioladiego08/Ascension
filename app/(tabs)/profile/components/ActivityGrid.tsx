import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
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

import RouteOutlinePreview from '@/components/routes/RouteOutlinePreview';
import StrengthRadarPreview from '@/components/strength/StrengthRadarPreview';
import { useAppTheme } from '@/providers/AppThemeProvider';
import {
  fetchOutdoorRoutePreviewMap,
  type RoutePreviewPoint,
} from '@/lib/OutdoorSession/routePreview';
import {
  coerceStrengthMuscleProfile,
  type StrengthMuscleProfile,
} from '@/lib/strength/muscleProfile';
import { supabase } from '@/lib/supabase';
import { getSocialFeedForUser } from '@/lib/social/feed';
import { useUnits } from '@/contexts/UnitsContext';
import { getCardioActivityKind } from '@/lib/cardio/activityTypes';

type ActivityKind = 'strength' | 'run' | 'walk' | 'ride';
type ActivityFilter = 'all' | ActivityKind;

type ActivitySource = 'strength' | 'session' | 'outdoor';

type UnifiedActivity = {
  id: string;
  source: ActivitySource;
  kind: ActivityKind;
  postId?: string;

  startedAt: string;
  durationS: number | null;

  // cardio
  distanceM?: number | null;
  paceKm?: number | null;
  paceMi?: number | null;
  speedMps?: number | null;

  // strength
  totalVolume?: number | null;
  strengthMuscleProfile?: StrengthMuscleProfile | null;

  // outdoor route preview
  routePreview?: RoutePreviewPoint[] | null;
};

type Props = {
  userId: string;
  header?: React.ReactElement | null;
  isActive?: boolean;
  refreshToken?: number;
  contentPaddingHorizontal?: number;
  gap?: number;
};

const LB_PER_KG = 2.20462;

const PAGE_SIZE = 24;
const COLUMN_COUNT = 2;
const DEBUG_ACTIVITY_GRID = __DEV__;

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
  const v = mps == null ? null : Number(mps);
  if (!v || v <= 0) return '-';
  const display = unit === 'mi' ? v * 2.236936 : v * 3.6;
  return `${display.toFixed(1)} ${unit === 'mi' ? 'mph' : 'km/h'}`;
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
  if (kind === 'ride') return 'bicycle-outline';
  return 'walk-outline';
}

function labelFor(kind: ActivityKind, source: ActivitySource) {
  if (kind === 'strength') return 'Strength';
  if (kind === 'ride') return source === 'outdoor' ? 'Outdoor cycling' : 'Cycling';
  if (kind === 'walk') return source === 'outdoor' ? 'Outdoor walk' : 'Walk';
  return source === 'outdoor' ? 'Outdoor run' : 'Run';
}

function kindFromText(t: string): ActivityKind | null {
  const kind = getCardioActivityKind(t);
  if (kind === 'walk') return 'walk';
  if (kind === 'run') return 'run';
  if (kind === 'cycle') return 'ride';
  return null;
}

function metricNum(
  metrics: Record<string, number | string | null> | null | undefined,
  keys: string[]
): number | null {
  if (!metrics) return null;
  for (const key of keys) {
    const raw = metrics[key];
    if (raw == null) continue;
    const n = Number(raw);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function normalizeRouteId(value: unknown): string | null {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return null;
  if (trimmed.toLowerCase() === 'undefined') return null;
  if (trimmed.toLowerCase() === 'null') return null;
  return trimmed;
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

function isAccessDeniedError(error: any): boolean {
  if (!error) return false;
  const code = String(error?.code ?? '');
  const msg = String(error?.message ?? '').toLowerCase();
  return (
    code === '42501' ||
    code === 'PGRST301' ||
    msg.includes('permission denied') ||
    msg.includes('row-level security')
  );
}

function FilterPill({
  label,
  active,
  onPress,
  styles,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
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
  const { colors, fonts } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);
  const { width } = useWindowDimensions();
  const { distanceUnit, weightUnit } = useUnits();

  const [filter, setFilter] = useState<ActivityFilter>('all');

  const [items, setItems] = useState<UnifiedActivity[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const logDebug = useCallback(
    (event: string, payload?: Record<string, unknown>) => {
      if (!DEBUG_ACTIVITY_GRID) return;
      console.log('[ActivityGridDebug]', event, {
        userId,
        filter,
        ...(payload ?? {}),
      });
    },
    [filter, userId]
  );

  const strengthOffset = useRef(0);
  const sessionsOffset = useRef(0);
  const outdoorOffset = useRef(0);

  const strengthDone = useRef(false);
  const sessionsDone = useRef(false);
  const outdoorDone = useRef(false);
  const socialDone = useRef(false);
  const socialOffset = useRef(0);

  const cardWidth = useMemo(() => {
    const usable = width - contentPaddingHorizontal * 2 - gap * (COLUMN_COUNT - 1);
    return Math.floor(usable / COLUMN_COUNT);
  }, [width, contentPaddingHorizontal, gap]);
  const cardHeight = useMemo(() => Math.round(cardWidth * 1.12), [cardWidth]);

  // -----------------------------
  // Strength page
  // -----------------------------
  const fetchStrengthPage = useCallback(
    async (from: number, to: number) => {
      const rpcLimit = Math.max(1, to - from + 1);
      const rpcRes = await supabase.rpc('list_visible_strength_activity_cards_user', {
        p_user_id: userId,
        p_limit: rpcLimit,
        p_offset: from,
      });

      if (!rpcRes.error) {
        const rows = ((rpcRes.data ?? []) as any[]).map(
          (row) =>
            ({
              id: String(row.id),
              source: 'strength',
              kind: 'strength',
              startedAt: String(row.started_at),
              durationS: row.duration_s == null ? null : Number(row.duration_s),
              totalVolume: row.total_volume_kg == null ? 0 : Number(row.total_volume_kg),
              strengthMuscleProfile: coerceStrengthMuscleProfile(row.muscle_profile),
            }) satisfies UnifiedActivity
        );
        logDebug('strength_rpc_success', { from, to, count: rows.length });
        return rows;
      }

      logDebug('strength_rpc_failed', {
        from,
        to,
        code: rpcRes.error?.code ?? null,
        message: rpcRes.error?.message ?? null,
      });

      if (!isRpcUnavailableError(rpcRes.error)) {
        if (isAccessDeniedError(rpcRes.error)) {
          logDebug('strength_rpc_access_denied', { from, to });
          return [];
        }
        throw rpcRes.error;
      }

      try {
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
            strengthMuscleProfile: null,
          };
        });

        logDebug('strength_fallback_success', { from, to, count: page.length });
        return page;
      } catch (fallbackError: any) {
        if (isAccessDeniedError(fallbackError)) {
          logDebug('strength_fallback_access_denied', {
            from,
            to,
            code: fallbackError?.code ?? null,
            message: fallbackError?.message ?? null,
          });
          return [];
        }
        throw fallbackError;
      }
    },
    [logDebug, userId]
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
      if (res.error) {
        if (isAccessDeniedError(res.error)) {
          logDebug('indoor_sessions_access_denied', {
            from,
            to,
            code: res.error?.code ?? null,
            message: res.error?.message ?? null,
          });
          return [];
        }
        throw res.error;
      }

      const page = (res.data ?? [])
        .map((r: any) => {
          const kind = kindFromText(String(r.exercise_type ?? ''));
          if (!kind) return null;

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
        })
        .filter((item): item is UnifiedActivity => item != null);

      if (activeFilter === 'all') {
        logDebug('indoor_sessions_success', {
          from,
          to,
          count: page.length,
          rawCount: page.length,
          activeFilter,
        });
        return page;
      }
      const filtered = page.filter((item) => {
        if (activeFilter === 'strength') return false;
        return item.kind === activeFilter;
      });
      logDebug('indoor_sessions_success', {
        from,
        to,
        count: filtered.length,
        rawCount: page.length,
        activeFilter,
      });
      return filtered;
    },
    [logDebug, userId]
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
      if (res.error) {
        if (isAccessDeniedError(res.error)) {
          logDebug('outdoor_sessions_access_denied', {
            from,
            to,
            code: res.error?.code ?? null,
            message: res.error?.message ?? null,
          });
          return [];
        }
        throw res.error;
      }

      const rows = (res.data ?? []) as any[];
      const previewMap = await fetchOutdoorRoutePreviewMap(rows.map((row) => String(row.id)));

      const page = rows
        .map((r: any) => {
          const kind = kindFromText(String(r.activity_type ?? ''));
          if (!kind) return null;

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
            routePreview: previewMap.get(String(r.id)) ?? null,
          } as UnifiedActivity;
        })
        .filter((item): item is UnifiedActivity => item != null);

      if (activeFilter === 'all') {
        logDebug('outdoor_sessions_success', {
          from,
          to,
          count: page.length,
          rawCount: page.length,
          activeFilter,
        });
        return page;
      }
      const filtered = page.filter((item) => {
        if (activeFilter === 'strength') return false;
        return item.kind === activeFilter;
      });
      logDebug('outdoor_sessions_success', {
        from,
        to,
        count: filtered.length,
        rawCount: page.length,
        activeFilter,
      });
      return filtered;
    },
    [logDebug, userId]
  );

  const fetchSocialFallbackPage = useCallback(
    async (from: number, to: number, activeFilter: ActivityFilter) => {
      const limit = Math.max(1, to - from + 1);
      const mappedFilter =
        activeFilter === 'all' ? null : activeFilter === 'strength' ? 'strength' : activeFilter;

      const posts = await getSocialFeedForUser({
        userId,
        offset: from,
        limit,
        activityType: mappedFilter,
      });

      const activityTypeCounts: Record<string, number> = {};
      const visibilityCounts: Record<string, number> = {};
      for (const post of posts) {
        const typeKey = String(post.activityType ?? 'unknown');
        const visibilityKey = String(post.visibility ?? 'unknown');
        activityTypeCounts[typeKey] = (activityTypeCounts[typeKey] ?? 0) + 1;
        visibilityCounts[visibilityKey] = (visibilityCounts[visibilityKey] ?? 0) + 1;
      }
      logDebug('social_fallback_raw', {
        from,
        to,
        rawCount: posts.length,
        activityTypeCounts,
        visibilityCounts,
      });

      let droppedUnsupported = 0;
      const page = posts
        .map((post): UnifiedActivity | null => {
          if (
            post.activityType !== 'strength' &&
            post.activityType !== 'run' &&
            post.activityType !== 'walk' &&
            post.activityType !== 'ride'
          ) {
            droppedUnsupported += 1;
            return null;
          }

          const source: ActivitySource =
            post.activityType === 'strength'
              ? 'strength'
              : post.isOutdoorSession
                ? 'outdoor'
                : 'session';

          const durationS = metricNum(post.metrics, ['total_time_s', 'duration_s', 'duration']);
          const distanceM = metricNum(post.metrics, ['distance_m', 'total_distance_m']);
          const paceKm = metricNum(post.metrics, ['avg_pace_s_per_km', 'pace_s_per_km']);
          const paceMi =
            metricNum(post.metrics, ['avg_pace_s_per_mi', 'pace_s_per_mi']) ??
            (paceKm == null ? null : paceKm * 1.609344);

          return {
            id: String(post.sessionId ?? post.sourceId ?? post.id),
            source,
            kind: post.activityType,
            postId: String(post.id),
            startedAt: post.createdAt,
            durationS: durationS == null ? null : Number(durationS),
            distanceM: distanceM == null ? null : Number(distanceM),
            paceKm: paceKm == null ? null : Number(paceKm),
            paceMi: paceMi == null ? null : Number(paceMi),
            speedMps: metricNum(post.metrics, ['avg_speed_mps']),
            totalVolume:
              post.activityType === 'strength'
                ? metricNum(post.metrics, ['total_volume_kg', 'volume_kg'])
                : null,
            strengthMuscleProfile:
              post.activityType === 'strength'
                ? coerceStrengthMuscleProfile(post.strengthMuscleProfile)
                : null,
            routePreview:
              post.activityType === 'run' ||
              post.activityType === 'walk' ||
              post.activityType === 'ride'
                ? post.routePreview
                : null,
          };
        })
        .filter((item): item is UnifiedActivity => item != null);

      logDebug('social_fallback_success', {
        from,
        to,
        count: page.length,
        rawCount: posts.length,
        droppedUnsupported,
        activeFilter,
      });
      return page;
    },
    [logDebug, userId]
  );

  const resetPagination = useCallback(() => {
    strengthOffset.current = 0;
    sessionsOffset.current = 0;
    outdoorOffset.current = 0;
    socialOffset.current = 0;

    strengthDone.current = false;
    sessionsDone.current = false;
    outdoorDone.current = false;
    socialDone.current = false;

    setItems([]);
  }, []);

  const fetchNext = useCallback(
    async (reset: boolean) => {
      // Always render header; when userId not ready, stop loading and show empty state.
      if (!isActive) {
        logDebug('fetch_next_skipped_inactive', { reset });
        setLoadingInitial(false);
        setLoadingMore(false);
        return;
      }

      if (!userId) {
        if (reset) resetPagination();
        setError(null);
        setLoadingInitial(false);
        setLoadingMore(false);
        logDebug('fetch_next_skipped_missing_user', { reset });
        return;
      }

      const wantsStrength = filter === 'all' || filter === 'strength';
      const wantsCardio =
        filter === 'all' || filter === 'run' || filter === 'walk' || filter === 'ride';

      // If not reset and everything requested is already done, do nothing.
      if (!reset) {
        const strengthAllDone = !wantsStrength || strengthDone.current;
        const cardioAllDone = !wantsCardio || (sessionsDone.current && outdoorDone.current);
        if (strengthAllDone && cardioAllDone && socialDone.current) return;
      }

      logDebug('fetch_next_start', {
        reset,
        wantsStrength,
        wantsCardio,
        strengthDone: strengthDone.current,
        sessionsDone: sessionsDone.current,
        outdoorDone: outdoorDone.current,
        socialDone: socialDone.current,
      });

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

        const primaryIncomingCount = incoming.length;
        if (primaryIncomingCount > 0) {
          socialDone.current = true;
        }

        if (incoming.length === 0 && !socialDone.current) {
          const page = await fetchSocialFallbackPage(
            socialOffset.current,
            socialOffset.current + PAGE_SIZE - 1,
            filter
          );
          socialOffset.current += page.length;
          if (page.length < PAGE_SIZE) socialDone.current = true;
          incoming.push(...page);
        }

        setItems((prev) => {
          const map = new Map(prev.map((p) => [`${p.source}:${p.id}`, p]));
          for (const i of incoming) map.set(`${i.source}:${i.id}`, i);

          return [...map.values()].sort(
            (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
          );
        });
        logDebug('fetch_next_success', {
          reset,
          incomingCount: incoming.length,
          strengthOffset: strengthOffset.current,
          sessionsOffset: sessionsOffset.current,
          outdoorOffset: outdoorOffset.current,
          socialOffset: socialOffset.current,
          strengthDone: strengthDone.current,
          sessionsDone: sessionsDone.current,
          outdoorDone: outdoorDone.current,
          socialDone: socialDone.current,
          usedSocialFallback: primaryIncomingCount === 0 && incoming.length > 0,
        });
      } catch (e: any) {
        console.error('[ActivityGrid] fetchNext failed', e);
        setError(e?.message?.trim?.() ? e.message : 'Failed to load activities');
        logDebug('fetch_next_failed', {
          reset,
          code: e?.code ?? null,
          message: e?.message ?? String(e ?? ''),
        });
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
      fetchSocialFallbackPage,
      logDebug,
      resetPagination,
    ]
  );

  useEffect(() => {
    logDebug('state_snapshot', {
      items: items.length,
      loadingInitial,
      loadingMore,
      error: error ?? null,
      isActive,
    });
  }, [error, isActive, items.length, loadingInitial, loadingMore, logDebug]);

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
          <FilterPill
            label="All"
            active={filter === 'all'}
            onPress={() => setFilter('all')}
            styles={styles}
          />
          <FilterPill
            label="Strength"
            active={filter === 'strength'}
            onPress={() => setFilter('strength')}
            styles={styles}
          />
          <FilterPill
            label="Run"
            active={filter === 'run'}
            onPress={() => setFilter('run')}
            styles={styles}
          />
          <FilterPill
            label="Walk"
            active={filter === 'walk'}
            onPress={() => setFilter('walk')}
            styles={styles}
          />
          <FilterPill
            label="Cycling"
            active={filter === 'ride'}
            onPress={() => setFilter('ride')}
            styles={styles}
          />
        </View>
      </View>
    );
  }, [header, filter]);

  const renderCard = ({ item, index }: { item: UnifiedActivity; index: number }) => {
    const dateLabel = formatCardDate(item.startedAt);
    const routePreviewVisible =
      item.source === 'outdoor' &&
      (item.kind === 'run' || item.kind === 'walk' || item.kind === 'ride') &&
      !!item.routePreview &&
      item.routePreview.length >= 2;
    const strengthRadarVisible =
      item.kind === 'strength' && !!item.strengthMuscleProfile;
    const derivedSpeedMps =
      item.speedMps ??
      (item.distanceM != null &&
      item.distanceM > 0 &&
      item.durationS != null &&
      item.durationS > 0
        ? item.distanceM / item.durationS
        : null);

    const onOpenCard = async () => {
      const postId = normalizeRouteId(item.postId);
      let sessionOrWorkoutId = normalizeRouteId(item.id);

      // If an item came from a legacy feed row without source/session IDs, recover them by post id.
      if (!sessionOrWorkoutId && postId) {
        const postMetaRes = await supabase
          .schema('social')
          .from('posts')
          .select('session_id,source_id')
          .eq('id', postId)
          .maybeSingle();

        if (!postMetaRes.error && postMetaRes.data) {
          const row = postMetaRes.data as any;
          sessionOrWorkoutId = normalizeRouteId(row.session_id ?? row.source_id);
          logDebug('card_press_resolved_from_post', {
            source: item.source,
            kind: item.kind,
            postId,
            resolvedId: sessionOrWorkoutId,
          });
        } else if (postMetaRes.error) {
          logDebug('card_press_post_lookup_failed', {
            source: item.source,
            kind: item.kind,
            postId,
            code: postMetaRes.error?.code ?? null,
            message: postMetaRes.error?.message ?? null,
          });
        }
      }

      if (!sessionOrWorkoutId) {
        logDebug('card_press_missing_target', {
          source: item.source,
          kind: item.kind,
          postId,
          rawId: item.id,
        });
        Alert.alert(
          'Activity unavailable',
          'This activity could not be opened because its session reference is missing.'
        );
        return;
      }

      logDebug('card_press_opening', {
        source: item.source,
        kind: item.kind,
        id: sessionOrWorkoutId,
        postId,
      });

      if (item.source === 'strength') {
        router.push({
          pathname: '/add/Strength/[id]',
          params: postId
            ? { id: sessionOrWorkoutId, postId }
            : { id: sessionOrWorkoutId },
        });
        return;
      }

      if (item.source === 'outdoor') {
        router.push({
          pathname: '/progress/outdoor/[id]',
          params: postId
            ? { id: sessionOrWorkoutId, postId }
            : { id: sessionOrWorkoutId },
        });
        return;
      }

      router.push({
        pathname: '/progress/run_walk/[sessionId]',
        params: postId
          ? { sessionId: sessionOrWorkoutId, postId }
          : { sessionId: sessionOrWorkoutId },
      });
    };

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => {
          void onOpenCard();
        }}
        style={[
          styles.card,
          {
            width: cardWidth,
            height: cardHeight,
            marginRight: index % COLUMN_COUNT !== COLUMN_COUNT - 1 ? gap : 0,
            marginBottom: gap,
          },
        ]}
      >
        <View style={styles.cardHero}>
          {routePreviewVisible || strengthRadarVisible ? (
            <View style={styles.cardPreviewWrap}>
              {routePreviewVisible ? (
                <RouteOutlinePreview
                  points={item.routePreview}
                  strokeColor={colors.highlight1}
                  glowColor={colors.highlight2}
                  startColor={colors.highlight3}
                  endColor={colors.danger}
                  backgroundColor={colors.cardDark}
                  accentColor={colors.accentSoft}
                  strokeWidth={3.2}
                />
              ) : null}
              {strengthRadarVisible ? (
                <StrengthRadarPreview
                  profile={item.strengthMuscleProfile}
                  backgroundColor={colors.cardDark}
                  accentColor={colors.accentSoft}
                  glowColor={colors.highlight2}
                  gridColor={colors.borderStrong}
                  strokeColor={colors.highlight1}
                />
              ) : null}
            </View>
          ) : (
            <View style={styles.cardFallbackHero}>
              <Ionicons name={iconFor(item.kind)} size={20} color={colors.highlight1} />
              <Text style={styles.cardFallbackText}>{labelFor(item.kind, item.source)}</Text>
            </View>
          )}

          <View style={styles.badge}>
            <Ionicons name={iconFor(item.kind)} size={12} color={colors.text} />
          </View>
        </View>

        <View style={styles.overlay}>
          <Text style={styles.dateText}>{dateLabel}</Text>

          <Text style={styles.overlayText}>{formatDuration(item.durationS)}</Text>

          {item.kind === 'strength' ? (
            <View style={styles.volumeRow}>
              <Text style={styles.overlayText}>{formatVolume(item.totalVolume, weightUnit)}</Text>
              <View style={styles.unitChip}>
                <Ionicons name="barbell-outline" size={9} color={colors.text} />
                <Text style={styles.unitChipText}>{weightUnit}</Text>
              </View>
            </View>
          ) : (
            <Text style={styles.overlayText}>
              {item.kind === 'ride'
                ? `${formatDistance(distanceUnit, item.distanceM)} • ${formatSpeed(distanceUnit, derivedSpeedMps)}`
                : `${formatDistance(distanceUnit, item.distanceM)} • ${formatPace(distanceUnit, item.paceKm, item.paceMi)}`}
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
          <ActivityIndicator color={colors.highlight1} />
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
      numColumns={COLUMN_COUNT}
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
          <ActivityIndicator style={{ margin: 16 }} color={colors.highlight1} />
        ) : null
      }
    />
  );
}

function createStyles(
  colors: ReturnType<typeof useAppTheme>['colors'],
  fonts: ReturnType<typeof useAppTheme>['fonts']
) {
  return StyleSheet.create({
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
      borderColor: colors.border,
      backgroundColor: colors.card2,
      marginRight: 8,
      marginBottom: 8,
    },
    pillActive: {
      borderColor: colors.glowPrimary,
      backgroundColor: colors.accentSoft,
    },
    pillText: {
      color: colors.textMuted,
      fontFamily: fonts.label,
      fontSize: 12,
      lineHeight: 16,
    },
    pillTextActive: {
      color: colors.highlight1,
    },
    emptyWrap: {
      paddingVertical: 24,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
    },
    emptyText: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 16,
      textAlign: 'center',
      paddingHorizontal: 16,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 14,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardHero: {
      flex: 1,
      padding: 8,
      backgroundColor: colors.cardDark,
    },
    cardPreviewWrap: {
      flex: 1,
      borderRadius: 10,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.borderStrong,
      backgroundColor: colors.cardDark,
    },
    cardFallbackHero: {
      flex: 1,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.borderStrong,
      backgroundColor: colors.card2,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingHorizontal: 8,
    },
    cardFallbackText: {
      color: colors.textMuted,
      fontFamily: fonts.label,
      fontSize: 11,
      lineHeight: 14,
      textAlign: 'center',
      textTransform: 'uppercase',
    },
    badge: {
      position: 'absolute',
      top: 8,
      left: 8,
      width: 28,
      height: 28,
      borderRadius: 999,
      backgroundColor: colors.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    overlay: {
      paddingHorizontal: 10,
      paddingVertical: 9,
      backgroundColor: colors.popUpCard,
      minHeight: 66,
    },
    dateText: {
      color: colors.textMuted,
      fontFamily: fonts.label,
      fontSize: 11,
      lineHeight: 14,
      marginBottom: 4,
    },
    overlayText: {
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 12,
      lineHeight: 16,
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
      borderColor: colors.borderStrong,
      backgroundColor: colors.card2,
    },
    unitChipText: {
      color: colors.text,
      fontFamily: fonts.label,
      fontSize: 10,
      lineHeight: 13,
      textTransform: 'uppercase',
    },
  });
}
