import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { isCyclingActivity } from '@/lib/cardio/activityTypes';
import LogoHeader from '@/components/my components/logoHeader';
import { supabase } from '@/lib/supabase';
import MetricChart, { type SamplePoint } from '@/components/charts/MetricLineChart';
import { LinearGradient } from 'expo-linear-gradient';
import DeleteConfirmModal from './DeleteConfirmModal';
import { useUnits } from '@/contexts/UnitsContext';
import {
  formatCurrentHealthError,
  getCurrentHeartRateSamplesForRange,
  getCurrentHealthProviderLabel,
  getCurrentHealthProviderUnavailableMessage,
  isCurrentHealthProviderAvailable,
} from '@/lib/health/provider';
import { buildHeartRateTimelinePoints } from '@/lib/health/heartRateTimeline';
import type { HealthHeartRateSample } from '@/lib/health/types';
import { useAppTheme } from '@/providers/AppThemeProvider';
import { useSmartBack } from '@/lib/navigation/useSmartBack';

const M_PER_MI = 1609.344;
const M_PER_KM = 1000;
const MPH_PER_MPS = 2.236936;
const KMH_PER_MPS = 3.6;
const FT_PER_M = 3.28084;
const HEART_RATE_AUTO_RETRY_DELAY_MS = 45_000;
const HEART_RATE_MANUAL_DELAY_MS = 20_000;
const HEART_RATE_PROVIDER_LABEL = getCurrentHealthProviderLabel();




function formatClock(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatPace(secondsPerUnit: number | null, suffix: '/mi' | '/km') {
  if (!secondsPerUnit || secondsPerUnit <= 0) return `— ${suffix}`;
  const m = Math.floor(secondsPerUnit / 60);
  const s = Math.round(secondsPerUnit % 60);
  return `${m}:${String(s).padStart(2, '0')} ${suffix}`;
}

function formatDistance(meters: number, unit: 'mi' | 'km') {
  if (unit === 'km') return `${(meters / M_PER_KM).toFixed(2)} KM`;
  return `${(meters / M_PER_MI).toFixed(2)} MI`;
}

function formatElevation(meters: number, unit: 'mi' | 'km') {
  if (unit === 'mi') return `${Math.round(meters * FT_PER_M)} ft`;
  return `${Math.round(meters)} m`;
}

type SessionRow = {
  id: string;
  user_id?: string;
  exercise_type: string;
  started_at?: string | null;
  ended_at?: string | null;
  total_time_s: number;
  total_distance_m: number;
  total_elevation_m: number;
  avg_pace_s_per_mi: number | null;
  avg_pace_s_per_km: number | null;
};

type SampleRow = {
  elapsed_s: number;
  pace_s_per_mi: number | null;
  pace_s_per_km: number | null;
  speed_mps: number | null;
  cadence_rpm: number | null;
  elevation_m: number | null;
  incline_deg: number | null;
};

type HeartRateSyncState =
  | 'idle'
  | 'scheduled'
  | 'syncing'
  | 'synced'
  | 'skipped'
  | 'failed';

function formatLoadSessionErr(err: any): string {
  if (!err) return 'Could not load session.';

  const code = String(err?.code ?? '').trim();
  const message = String(err?.message ?? '').trim();
  const details = String(err?.details ?? '').trim();
  const raw = `${message} ${details}`.toLowerCase();

  if (
    code === 'PGRST202' ||
    code === 'PGRST204' ||
    raw.includes('get_run_walk_session_summary_user')
  ) {
    return 'Backend summary RPC is missing. Apply migration 20260227_shared_workout_summary_rpcs.sql.';
  }

  if (code === '42804' || raw.includes('structure of query does not match function result type')) {
    return 'Backend summary RPC is outdated (42804). Apply migration 20260228_fix_run_walk_summary_rpc_return_types.sql (or compatibility file 20260227_fix_run_walk_summary_rpc_return_types.sql).';
  }

  if (raw.includes('session not found')) {
    return 'This session could not be found.';
  }

  if (raw.includes('not allowed') || code === '42501') {
    return 'You do not have permission to view this session.';
  }

  if (!message) return 'Could not load session.';
  return code ? `${message} (${code})` : message;
}

function parseSampleRows(value: unknown): SampleRow[] {
  if (!Array.isArray(value)) return [];
  return value.map((row: any) => ({
    elapsed_s: Number(row?.elapsed_s ?? 0),
    pace_s_per_mi: row?.pace_s_per_mi == null ? null : Number(row.pace_s_per_mi),
    pace_s_per_km: row?.pace_s_per_km == null ? null : Number(row.pace_s_per_km),
    speed_mps: row?.speed_mps == null ? null : Number(row.speed_mps),
    cadence_rpm: row?.cadence_rpm == null ? null : Number(row.cadence_rpm),
    elevation_m: row?.elevation_m == null ? null : Number(row.elevation_m),
    incline_deg: row?.incline_deg == null ? null : Number(row.incline_deg),
  }));
}

export default function RunWalkSessionSummary() {
  const { goBackSmart } = useSmartBack();
  const { colors, fonts, globalStyles } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);
  const { sessionId, postId } = useLocalSearchParams<{ sessionId?: string; postId?: string }>();
  const { distanceUnit } = useUnits();
  const sessionIdParam =
    typeof sessionId === 'string' ? sessionId : Array.isArray(sessionId) ? sessionId[0] : '';
  const postIdParam =
    typeof postId === 'string' ? postId : Array.isArray(postId) ? postId[0] : null;

  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [session, setSession] = useState<SessionRow | null>(null);
  const [samples, setSamples] = useState<SampleRow[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [canDelete, setCanDelete] = useState(false);
  const [heartRateSamples, setHeartRateSamples] = useState<HealthHeartRateSample[]>([]);
  const [heartRateSyncState, setHeartRateSyncState] = useState<HeartRateSyncState>('idle');
  const [heartRateSyncMessage, setHeartRateSyncMessage] = useState<string | null>(null);
  const [heartRateSyncing, setHeartRateSyncing] = useState(false);
  const [heartRateLoaded, setHeartRateLoaded] = useState(false);
  const autoHeartRateRetryRef = useRef(false);
  const activeHeartRateSyncTokenRef = useRef(0);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        if (!sessionIdParam) throw new Error('Missing session id');

        const meRes = await supabase.auth.getUser();
        const meId = meRes.data.user?.id ?? null;

        let rpc = await supabase.rpc('get_run_walk_session_summary_user', {
          p_session_id: sessionIdParam,
          p_post_id: postIdParam ?? null,
        });
        const rpcUnavailable =
          rpc.error &&
          (String(rpc.error?.code ?? '') === 'PGRST202' ||
            String(rpc.error?.code ?? '') === 'PGRST204' ||
            String(rpc.error?.message ?? '').includes('get_run_walk_session_summary_user'));

        if (rpcUnavailable) {
          // Backward compatibility with older backend signature (single argument).
          rpc = await supabase.rpc('get_run_walk_session_summary_user', {
            p_session_id: sessionIdParam,
          });
        }

        if (!rpc.error) {
          const row = Array.isArray(rpc.data) ? rpc.data[0] : rpc.data;
          if (!row) throw new Error('Session not found');

          if (!mounted) return;
          setSession({
            id: String((row as any).session_id),
            user_id: String((row as any).owner_id),
            exercise_type: String((row as any).exercise_type ?? ''),
            started_at: (row as any).started_at ?? null,
            ended_at: (row as any).ended_at ?? null,
            total_time_s: Number((row as any).total_time_s ?? 0),
            total_distance_m: Number((row as any).total_distance_m ?? 0),
            total_elevation_m: Number((row as any).total_elevation_m ?? 0),
            avg_pace_s_per_mi:
              (row as any).avg_pace_s_per_mi == null ? null : Number((row as any).avg_pace_s_per_mi),
            avg_pace_s_per_km:
              (row as any).avg_pace_s_per_km == null ? null : Number((row as any).avg_pace_s_per_km),
          });
          setSamples(parseSampleRows((row as any).samples));
          setCanDelete(Boolean((row as any).can_delete ?? (!!meId && String((row as any).owner_id ?? '') === meId)));
          return;
        }

        const directSession = await supabase
          .schema('run_walk')
          .from('sessions')
          .select(
            'id, user_id, exercise_type, started_at, ended_at, total_time_s, total_distance_m, total_elevation_m, avg_pace_s_per_mi, avg_pace_s_per_km'
          )
          .eq('id', sessionIdParam)
          .maybeSingle();

        if (!directSession.error && directSession.data) {
          const directSamples = await supabase
            .schema('run_walk')
            .from('samples')
            .select(
              'elapsed_s, pace_s_per_mi, pace_s_per_km, speed_mps, cadence_rpm, elevation_m, incline_deg'
            )
            .eq('session_id', sessionIdParam)
            .order('elapsed_s');

          if (!directSamples.error) {
            if (!mounted) return;
            setSession(directSession.data as SessionRow);
            setSamples((directSamples.data ?? []) as SampleRow[]);
            setCanDelete(!!meId && String((directSession.data as any).user_id ?? '') === meId);
            return;
          }
        }

        throw rpc.error;
      } catch (e) {
        console.warn('[RunWalkSessionSummary] load failed', e);
        Alert.alert('Error', formatLoadSessionErr(e));
        goBackSmart({ fallbackHref: '/progress' });
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [goBackSmart, postIdParam, sessionIdParam]);

  const workoutStartISO = useMemo(() => {
    if (!session) return null;
    if (session.started_at) return session.started_at;
    if (session.ended_at && session.total_time_s > 0) {
      const endMs = new Date(session.ended_at).getTime();
      return new Date(endMs - session.total_time_s * 1000).toISOString();
    }
    return null;
  }, [session]);

  const workoutEndISO = useMemo(() => {
    if (!session) return null;
    if (session.ended_at) return session.ended_at;
    if (session.started_at && session.total_time_s > 0) {
      const startMs = new Date(session.started_at).getTime();
      return new Date(startMs + session.total_time_s * 1000).toISOString();
    }
    return null;
  }, [session]);

  const runHeartRateSync = useCallback(
    async (opts?: { delayMs?: number; reason?: 'auto' | 'manual' }) => {
      if (!canDelete) {
        setHeartRateSyncState('skipped');
        setHeartRateSyncMessage(
          `${HEART_RATE_PROVIDER_LABEL} heart-rate is shown only for your own sessions.`
        );
        return;
      }

      if (!workoutStartISO || !workoutEndISO) {
        setHeartRateSyncState('skipped');
        setHeartRateSyncMessage('Session timestamps are missing, so heart-rate sync was skipped.');
        return;
      }

      const delayMs = Math.max(0, opts?.delayMs ?? 0);
      const reason = opts?.reason ?? 'manual';
      const syncToken = Date.now();
      activeHeartRateSyncTokenRef.current = syncToken;

      if (delayMs > 0) {
        setHeartRateSyncState('scheduled');
        setHeartRateSyncMessage(
          `${reason === 'auto' ? 'Auto retry' : 'Retry'} in ${Math.round(
            delayMs / 1000
          )} seconds before re-checking ${HEART_RATE_PROVIDER_LABEL}.`
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }

      if (activeHeartRateSyncTokenRef.current !== syncToken) {
        return;
      }

      try {
        setHeartRateSyncing(true);
        setHeartRateSyncState('syncing');
        setHeartRateSyncMessage(
          `Loading heart-rate samples from ${HEART_RATE_PROVIDER_LABEL}…`
        );

        if (!(await isCurrentHealthProviderAvailable())) {
          throw new Error(await getCurrentHealthProviderUnavailableMessage());
        }

        const loaded = await getCurrentHeartRateSamplesForRange({
          startDate: workoutStartISO,
          endDate: workoutEndISO,
        });

        if (activeHeartRateSyncTokenRef.current !== syncToken) {
          return;
        }

        setHeartRateSamples(loaded);
        setHeartRateLoaded(true);
        setHeartRateSyncState('synced');

        if (loaded.length === 0) {
          setHeartRateSyncMessage(
            `${HEART_RATE_PROVIDER_LABEL} returned no samples for this session window. Retry after a short delay.`
          );
        } else {
          setHeartRateSyncMessage(
            `Loaded ${loaded.length} heart-rate samples from ${HEART_RATE_PROVIDER_LABEL}.`
          );
        }
      } catch (error: any) {
        console.warn('[RunWalkSessionSummary] health provider load failed', error);
        setHeartRateLoaded(true);
        setHeartRateSyncState('failed');
        setHeartRateSyncMessage(formatCurrentHealthError(error));
      } finally {
        setHeartRateSyncing(false);
      }
    },
    [canDelete, workoutEndISO, workoutStartISO]
  );

  useEffect(() => {
    autoHeartRateRetryRef.current = false;
    activeHeartRateSyncTokenRef.current = 0;
    setHeartRateSamples([]);
    setHeartRateLoaded(false);
    setHeartRateSyncState('idle');
    setHeartRateSyncMessage(null);
    setHeartRateSyncing(false);
  }, [sessionIdParam, workoutStartISO, workoutEndISO]);

  useEffect(() => {
    if (!canDelete || !workoutStartISO || !workoutEndISO) return;
    if (heartRateLoaded || heartRateSyncing) return;
    void runHeartRateSync({ reason: 'manual' });
  }, [
    canDelete,
    heartRateLoaded,
    heartRateSyncing,
    runHeartRateSync,
    workoutEndISO,
    workoutStartISO,
  ]);

  useEffect(() => {
    if (!canDelete || !workoutStartISO || !workoutEndISO) return;
    if (!heartRateLoaded) return;
    if (heartRateSamples.length > 0) return;
    if (heartRateSyncState !== 'synced') return;
    if (autoHeartRateRetryRef.current) return;

    autoHeartRateRetryRef.current = true;
    void runHeartRateSync({
      delayMs: HEART_RATE_AUTO_RETRY_DELAY_MS,
      reason: 'auto',
    });
  }, [
    canDelete,
    heartRateLoaded,
    heartRateSamples.length,
    heartRateSyncState,
    runHeartRateSync,
    workoutEndISO,
    workoutStartISO,
  ]);

  const title = useMemo(() => {
    if (!session) return '';
    if (session.exercise_type?.includes('walk')) return 'WALK SUMMARY';
    if (isCyclingActivity(session.exercise_type)) return 'CYCLING SUMMARY';
    if (session.exercise_type?.includes('run')) return 'RUN SUMMARY';
    return 'RUN / WALK SUMMARY';
  }, [session]);
  const isCycleSession = isCyclingActivity(session?.exercise_type ?? null);

  const pacePoints: SamplePoint[] = useMemo(
    () =>
      samples
        .map((s) => ({
          t: s.elapsed_s,
          v: distanceUnit === 'mi' ? s.pace_s_per_mi : s.pace_s_per_km,
        }))
        .filter((s) => s.v != null && s.v > 0) as SamplePoint[],
    [samples, distanceUnit]
  );

  const speedPoints: SamplePoint[] = useMemo(
    () =>
      samples
        .filter((s) => s.speed_mps != null)
        .map((s) => ({
          t: s.elapsed_s,
          v: s.speed_mps! * (distanceUnit === 'mi' ? MPH_PER_MPS : KMH_PER_MPS),
        })),
    [samples, distanceUnit]
  );

  const elevationPoints: SamplePoint[] = useMemo(
    () =>
      samples
        .filter((s) => s.elevation_m != null)
        .map((s) => ({
          t: s.elapsed_s,
          v: distanceUnit === 'mi' ? s.elevation_m! * FT_PER_M : s.elevation_m!,
        })),
    [samples, distanceUnit]
  );

  const inclinePoints: SamplePoint[] = useMemo(
    () =>
      samples
        .filter((s) => s.incline_deg != null)
        .map((s) => ({
          t: s.elapsed_s,
          v: s.incline_deg!,
        })),
    [samples]
  );

  const cadencePoints: SamplePoint[] = useMemo(
    () =>
      samples
        .filter((s) => s.cadence_rpm != null && s.cadence_rpm > 0)
        .map((s) => ({
          t: s.elapsed_s,
          v: s.cadence_rpm!,
        })),
    [samples]
  );

  const heartRateSummary = useMemo(() => {
    if (heartRateSamples.length === 0) return null;

    let minBpm = heartRateSamples[0].bpm;
    let maxBpm = heartRateSamples[0].bpm;
    let sumBpm = 0;

    for (const sample of heartRateSamples) {
      const bpm = Number(sample.bpm);
      if (bpm < minBpm) minBpm = bpm;
      if (bpm > maxBpm) maxBpm = bpm;
      sumBpm += bpm;
    }

    return {
      avgBpm: Math.round((sumBpm / heartRateSamples.length) * 10) / 10,
      minBpm: Math.round(minBpm),
      maxBpm: Math.round(maxBpm),
      sampleCount: heartRateSamples.length,
    };
  }, [heartRateSamples]);

  const heartRatePoints: SamplePoint[] = useMemo(() => {
    return buildHeartRateTimelinePoints({
      samples: heartRateSamples,
      workoutStartISO,
      workoutEndISO,
    });
  }, [heartRateSamples, workoutEndISO, workoutStartISO]);

  const heartRateSourceLabel = useMemo(() => {
    if (heartRateSamples.length === 0) return null;
    const first = heartRateSamples[0];
    return first.sourceName ?? first.deviceName ?? HEART_RATE_PROVIDER_LABEL;
  }, [heartRateSamples]);

  if (loading) {
    return (
      <LinearGradient
        colors={[colors.gradientTop, colors.gradientMid, colors.gradientBottom]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={globalStyles.page}
      >
        <View style={[styles.safe, styles.centered]}>
          <ActivityIndicator size="small" color={colors.highlight1} />
        </View>
      </LinearGradient>
    );
  }

  if (!session) {
    return (
      <LinearGradient
        colors={[colors.gradientTop, colors.gradientMid, colors.gradientBottom]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={globalStyles.page}
      >
        <View style={[styles.safe, styles.centered]}>
          <Text style={styles.emptyStateText}>Session not found.</Text>
        </View>
      </LinearGradient>
    );
  }

  const avgPaceForUnit = distanceUnit === 'mi'
    ? session.avg_pace_s_per_mi
    : session.avg_pace_s_per_km;
  const avgSpeedDisplay =
    session.total_time_s > 0
      ? (session.total_distance_m / session.total_time_s) *
        (distanceUnit === 'mi' ? MPH_PER_MPS : KMH_PER_MPS)
      : 0;
  const avgCadenceDisplay =
    cadencePoints.length > 0
      ? cadencePoints.reduce((sum, point) => sum + point.v, 0) / cadencePoints.length
      : null;

  const speedUnitSuffix = distanceUnit === 'mi' ? 'mph' : 'km/h';
  const paceSuffix = distanceUnit === 'mi' ? '/mi' : '/km';
  const elevationUnitSuffix = distanceUnit === 'mi' ? 'ft' : 'm';

  return (
    <LinearGradient
      colors={[colors.gradientTop, colors.gradientMid, colors.gradientBottom]}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={globalStyles.page}
    >
      <View style={[globalStyles.container, styles.safe]}>
        <LogoHeader />

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={[globalStyles.panel, styles.heroCard]}>
            <View style={styles.headerRow}>
              <TouchableOpacity style={styles.iconBtn} onPress={() => goBackSmart({ fallbackHref: '/progress' })}>
                <Ionicons name="chevron-back" size={18} color={colors.text} />
              </TouchableOpacity>

              <View style={styles.headerCenter}>
                <Text style={globalStyles.eyebrow}>Session summary</Text>
                <Text style={styles.title}>{title}</Text>
                <Text style={styles.heroSubtitle}>
                  {isCycleSession
                    ? 'Review distance, speed, cadence, and resistance for this saved indoor ride.'
                    : 'Review distance, pace, elevation, and cardio effort for this session.'}
                </Text>
              </View>

              {canDelete ? (
                <TouchableOpacity
                  style={[styles.iconBtn, deleting && { opacity: 0.6 }]}
                  onPress={() => setShowDeleteModal(true)}
                  disabled={deleting}
                >
                  <Ionicons name="trash-outline" size={18} color={colors.danger} />
                </TouchableOpacity>
              ) : (
                <View style={styles.iconBtnSpacer} />
              )}
            </View>

            <View style={styles.heroStatsRow}>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>{formatClock(session.total_time_s)}</Text>
                <Text style={styles.heroStatLabel}>time</Text>
              </View>
              <View style={[styles.heroStat, styles.heroStatAccent]}>
                <Text style={styles.heroStatValue}>
                  {formatDistance(session.total_distance_m, distanceUnit)}
                </Text>
                <Text style={styles.heroStatLabel}>distance</Text>
              </View>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>
                  {isCycleSession
                    ? `${avgSpeedDisplay.toFixed(1)} ${speedUnitSuffix}`
                    : formatPace(avgPaceForUnit, distanceUnit === 'mi' ? '/mi' : '/km')}
                </Text>
                <Text style={styles.heroStatLabel}>{isCycleSession ? 'avg speed' : 'avg pace'}</Text>
              </View>
            </View>
          </View>

          <View style={[globalStyles.panelSoft, styles.card]}>
            <Row label="Total Time" value={formatClock(session.total_time_s)} styles={styles} />
            <Row
              label="Total Distance"
              value={formatDistance(session.total_distance_m, distanceUnit)}
              styles={styles}
            />
            {isCycleSession ? (
              <>
                <Row
                  label="Avg Speed"
                  value={`${avgSpeedDisplay.toFixed(1)} ${speedUnitSuffix}`}
                  styles={styles}
                />
                <Row
                  label="Avg Cadence"
                  value={
                    avgCadenceDisplay != null ? `${Math.round(avgCadenceDisplay)} rpm` : '—'
                  }
                  styles={styles}
                />
              </>
            ) : (
              <>
                <Row
                  label="Elevation Gain"
                  value={formatElevation(session.total_elevation_m, distanceUnit)}
                  styles={styles}
                />
                <Row
                  label="Avg Pace"
                  value={formatPace(avgPaceForUnit, distanceUnit === 'mi' ? '/mi' : '/km')}
                  styles={styles}
                />
              </>
            )}
          </View>

          {canDelete ? (
            <View style={[globalStyles.panelSoft, styles.heartRateCard]}>
              <View style={styles.heartRateHeaderRow}>
                <View>
                  <Text style={globalStyles.eyebrow}>Recovery signal</Text>
                  <Text style={styles.heartRateTitle}>Heart Rate</Text>
                </View>
                {heartRateSyncing ? (
                  <ActivityIndicator size="small" color={colors.highlight1} />
                ) : null}
              </View>

              {heartRateSummary ? (
                <>
                  <Text style={styles.heartRateAvgLabel}>Avg. Heart Rate</Text>
                  <Text style={styles.heartRateAvgValue}>{heartRateSummary.avgBpm} BPM</Text>

                  <View style={styles.heartRateStatsRow}>
                    <View style={styles.heartRateStat}>
                      <Text style={styles.heartRateStatLabel}>Min</Text>
                      <Text style={styles.heartRateStatValue}>{heartRateSummary.minBpm}</Text>
                    </View>
                    <View style={styles.heartRateStat}>
                      <Text style={styles.heartRateStatLabel}>Max</Text>
                      <Text style={styles.heartRateStatValue}>{heartRateSummary.maxBpm}</Text>
                    </View>
                    <View style={styles.heartRateStat}>
                      <Text style={styles.heartRateStatLabel}>Samples</Text>
                      <Text style={styles.heartRateStatValue}>{heartRateSummary.sampleCount}</Text>
                    </View>
                  </View>

                  <MetricChart
                    title={`Session Timeline${heartRateSourceLabel ? ` · ${heartRateSourceLabel}` : ''}`}
                    color={colors.danger}
                    points={heartRatePoints}
                    cardBg={colors.card}
                    textColor={colors.text}
                    valueFormatter={(v) => `${Math.round(v)}`}
                    xLabelFormatter={formatClock}
                    yClampMin={40}
                    yClampMax={220}
                    yAxisSuffix=" bpm"
                    unitSuffix="bpm"
                    showGrid
                    showYAxisIndices={false}
                    showXAxisIndices={false}
                    hideDataPoints
                  />
                </>
              ) : (
                <Text style={styles.heartRateEmpty}>
                  No {HEART_RATE_PROVIDER_LABEL} heart-rate samples found yet for this session
                  window.
                </Text>
              )}

              {heartRateSyncMessage ? (
                <Text
                  style={[
                    styles.heartRateStatusText,
                    heartRateSyncState === 'failed' ? styles.heartRateStatusTextError : null,
                  ]}
                >
                  {heartRateSyncMessage}
                </Text>
              ) : null}

              <View style={styles.heartRateActionsRow}>
                <TouchableOpacity
                  activeOpacity={0.9}
                  style={[
                    styles.heartRateActionBtn,
                    styles.heartRateActionBtnPrimary,
                    heartRateSyncing ? styles.heartRateActionBtnDisabled : null,
                  ]}
                  disabled={heartRateSyncing}
                  onPress={() =>
                    runHeartRateSync({ delayMs: HEART_RATE_MANUAL_DELAY_MS, reason: 'manual' })
                  }
                >
                  <Text style={styles.heartRateActionBtnPrimaryText}>
                    {heartRateSyncing
                      ? 'Syncing…'
                      : `Retry (${Math.round(HEART_RATE_MANUAL_DELAY_MS / 1000)}s delay)`}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.9}
                  style={[
                    styles.heartRateActionBtn,
                    heartRateSyncing ? styles.heartRateActionBtnDisabled : null,
                  ]}
                  disabled={heartRateSyncing}
                  onPress={() => runHeartRateSync({ reason: 'manual' })}
                >
                  <Text style={styles.heartRateActionBtnText}>Sync now</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

          <View style={styles.chartsWrap}>
            {!isCycleSession ? (
              <MetricChart
                title={`Pace Over Time (${paceSuffix})`}
                color={colors.highlight1}
                points={pacePoints}
                cardBg={colors.card}
                textColor={colors.text}
                hideDataPoints
              />
            ) : null}

            <MetricChart
              title={`Speed Over Time (${speedUnitSuffix})`}
              color={colors.highlight3}
              points={speedPoints}
              cardBg={colors.card}
              textColor={colors.text}
              hideDataPoints
            />

            <MetricChart
              title={isCycleSession ? 'Resistance Over Time' : `Elevation Over Time (${elevationUnitSuffix})`}
              color={colors.highlight2}
              points={isCycleSession ? inclinePoints : elevationPoints}
              cardBg={colors.card}
              textColor={colors.text}
              unitSuffix={isCycleSession ? 'lvl' : undefined}
              hideDataPoints
            />

            {isCycleSession ? (
              <MetricChart
                title="Cadence Over Time (rpm)"
                color={colors.highlight1}
                points={cadencePoints}
                cardBg={colors.card}
                textColor={colors.text}
                unitSuffix="rpm"
                hideDataPoints
              />
            ) : null}
          </View>

          <View style={{ height: 18 }} />
        </ScrollView>
      </View>
      {canDelete ? (
        <DeleteConfirmModal
          visible={showDeleteModal}
          onCancel={() => setShowDeleteModal(false)}
          onDelete={async () => {
            try {
              setDeleting(true);
              setShowDeleteModal(false);

              const { error } = await supabase
                .schema('run_walk')
                .from('sessions')
                .delete()
                .eq('id', sessionIdParam);

              if (error) {
                Alert.alert('Error', 'Could not delete session.');
                return;
              }

              goBackSmart({ fallbackHref: '/progress' });
            } finally {
              setDeleting(false);
            }
          }}
        />
      ) : null}
    </LinearGradient>
  );
}

function Row({
  label,
  value,
  styles,
}: {
  label: string;
  value: string;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function createStyles(
  colors: ReturnType<typeof useAppTheme>['colors'],
  fonts: ReturnType<typeof useAppTheme>['fonts']
) {
  return StyleSheet.create({
    safe: { flex: 1 },
    centered: { alignItems: 'center', justifyContent: 'center' },
    emptyStateText: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 14,
      lineHeight: 20,
    },
    scrollContent: {
      paddingBottom: 12,
    },
    heroCard: {
      marginTop: 8,
      marginBottom: 12,
      paddingBottom: 18,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
    },
    iconBtn: {
      width: 40,
      height: 40,
      borderRadius: 14,
      backgroundColor: colors.card2,
      borderWidth: 1,
      borderColor: colors.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    iconBtnSpacer: { width: 40, height: 40 },
    headerCenter: { flex: 1, alignItems: 'center' },
    title: {
      marginTop: 8,
      color: colors.highlight1,
      fontFamily: fonts.display,
      fontSize: 22,
      lineHeight: 26,
      letterSpacing: -0.6,
      textAlign: 'center',
    },
    heroSubtitle: {
      marginTop: 8,
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 19,
      textAlign: 'center',
      maxWidth: 260,
    },
    heroStatsRow: {
      marginTop: 18,
      flexDirection: 'row',
      gap: 10,
    },
    heroStat: {
      flex: 1,
      minHeight: 88,
      borderRadius: 18,
      backgroundColor: colors.card2,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 12,
      paddingHorizontal: 10,
      justifyContent: 'space-between',
    },
    heroStatAccent: {
      backgroundColor: colors.card3,
    },
    heroStatValue: {
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 15,
      lineHeight: 19,
      textAlign: 'center',
    },
    heroStatLabel: {
      color: colors.textOffSt,
      fontFamily: fonts.label,
      fontSize: 10,
      lineHeight: 14,
      letterSpacing: 0.7,
      textTransform: 'uppercase',
      textAlign: 'center',
    },
    card: {
      marginBottom: 12,
      padding: 16,
      gap: 12,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
    },
    rowLabel: {
      color: colors.textOffSt,
      fontFamily: fonts.label,
      fontSize: 11,
      lineHeight: 14,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    rowValue: {
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 14,
      lineHeight: 18,
    },
    heartRateCard: {
      paddingHorizontal: 14,
      paddingVertical: 14,
      marginBottom: 12,
    },
    heartRateHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 6,
    },
    heartRateTitle: {
      marginTop: 8,
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 22,
      lineHeight: 26,
    },
    heartRateAvgLabel: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 15,
      lineHeight: 19,
    },
    heartRateAvgValue: {
      color: colors.danger,
      fontFamily: fonts.display,
      fontSize: 40,
      lineHeight: 42,
      marginTop: 4,
      marginBottom: 10,
    },
    heartRateStatsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
      gap: 10,
    },
    heartRateStat: {
      flex: 1,
      borderRadius: 12,
      backgroundColor: colors.card2,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 10,
      paddingHorizontal: 8,
    },
    heartRateStatLabel: {
      color: colors.textMuted,
      fontFamily: fonts.label,
      fontSize: 11,
      lineHeight: 14,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    },
    heartRateStatValue: {
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 16,
      lineHeight: 20,
      marginTop: 4,
    },
    heartRateEmpty: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 18,
      marginBottom: 8,
    },
    heartRateStatusText: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 17,
      marginTop: 10,
    },
    heartRateStatusTextError: {
      color: colors.danger,
    },
    heartRateActionsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginTop: 10,
    },
    heartRateActionBtn: {
      flex: 1,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.highlight1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 11,
      paddingHorizontal: 10,
      backgroundColor: colors.card2,
    },
    heartRateActionBtnPrimary: {
      backgroundColor: colors.highlight1,
    },
    heartRateActionBtnText: {
      color: colors.highlight1,
      fontFamily: fonts.label,
      fontSize: 12,
      lineHeight: 16,
      textTransform: 'uppercase',
    },
    heartRateActionBtnPrimaryText: {
      color: colors.blkText,
      fontFamily: fonts.label,
      fontSize: 12,
      lineHeight: 16,
      textTransform: 'uppercase',
    },
    heartRateActionBtnDisabled: {
      opacity: 0.65,
    },
    chartsWrap: {
      gap: 12,
    },
  });
}
