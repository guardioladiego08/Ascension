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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '@/constants/Colors';
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

const BG = Colors.dark.background;
const CARD = Colors.dark.card;
const TEXT = Colors.dark.text;
const DANGER = '#EF4444';

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
    elevation_m: row?.elevation_m == null ? null : Number(row.elevation_m),
    incline_deg: row?.incline_deg == null ? null : Number(row.incline_deg),
  }));
}

export default function RunWalkSessionSummary() {
  const router = useRouter();
  const { sessionId, postId } = useLocalSearchParams<{ sessionId?: string; postId?: string }>();
  const { distanceUnit } = useUnits();

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
        if (!sessionId) throw new Error('Missing session id');

        const meRes = await supabase.auth.getUser();
        const meId = meRes.data.user?.id ?? null;

        const directSession = await supabase
          .schema('run_walk')
          .from('sessions')
          .select(
            'id, user_id, exercise_type, started_at, ended_at, total_time_s, total_distance_m, total_elevation_m, avg_pace_s_per_mi, avg_pace_s_per_km'
          )
          .eq('id', sessionId)
          .maybeSingle();

        if (!directSession.error && directSession.data) {
          const directSamples = await supabase
            .schema('run_walk')
            .from('samples')
            .select('elapsed_s, pace_s_per_mi, pace_s_per_km, speed_mps, elevation_m, incline_deg')
            .eq('session_id', sessionId)
            .order('elapsed_s');

          if (!directSamples.error) {
            if (!mounted) return;
            setSession(directSession.data as SessionRow);
            setSamples((directSamples.data ?? []) as SampleRow[]);
            setCanDelete(!!meId && String((directSession.data as any).user_id ?? '') === meId);
            return;
          }
        }

        // Fallback for accepted followers (or any RLS-restricted reads):
        // use security-definer RPC with social visibility checks.
        let rpc = await supabase.rpc('get_run_walk_session_summary_user', {
          p_session_id: sessionId,
          p_post_id: postId ?? null,
        });
        if (
          rpc.error &&
          (String(rpc.error?.code ?? '') === 'PGRST202' || String(rpc.error?.message ?? '').includes('get_run_walk_session_summary_user'))
        ) {
          // Backward compatibility with older backend signature (single argument).
          rpc = await supabase.rpc('get_run_walk_session_summary_user', {
            p_session_id: sessionId,
          });
        }
        if (rpc.error) {
          throw rpc.error;
        }

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
        setCanDelete(Boolean((row as any).can_delete));
      } catch (e) {
        console.warn('[RunWalkSessionSummary] load failed', e);
        Alert.alert('Error', formatLoadSessionErr(e));
        router.back();
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [sessionId, postId, router]);

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
  }, [sessionId, workoutStartISO, workoutEndISO]);

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
    if (session.exercise_type?.includes('run')) return 'RUN SUMMARY';
    return 'RUN / WALK SUMMARY';
  }, [session]);

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

  if (loading || !session) {
    return (
      <View style={[styles.safe, styles.centered]}>
        <ActivityIndicator />
      </View>
    );
  }

  const avgPaceForUnit = distanceUnit === 'mi'
    ? session.avg_pace_s_per_mi
    : session.avg_pace_s_per_km;

  return (
    <LinearGradient
      colors={['#3a3a3bff', '#1e1e1eff', BG]}
      style={{ flex: 1 }}
    >
      <View style={styles.safe}>
        <LogoHeader showBackButton usePreviousRoute />
        {/* Header */}
        <View style={styles.header}>

          <View style={styles.headerCenter}>
            <Text style={styles.headerLabel}>SUMMARY</Text>
            <Text style={styles.headerTitle}>{title}</Text>
          </View>

          {canDelete ? (
            <TouchableOpacity
              style={[styles.trashBtn, deleting && { opacity: 0.6 }]}
              onPress={() => setShowDeleteModal(true)}
              disabled={deleting}
            >
              <Ionicons name="trash-outline" size={20} color="#EF4444" />
            </TouchableOpacity>
          ) : null}

        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            <Row label="Total Time" value={formatClock(session.total_time_s)} />
            <Row label="Distance" value={formatDistance(session.total_distance_m, distanceUnit)} />
            <Row
              label="Elevation Gain"
              value={formatElevation(session.total_elevation_m, distanceUnit)}
            />
            <Row
              label="Avg Pace"
              value={formatPace(avgPaceForUnit, distanceUnit === 'mi' ? '/mi' : '/km')}
            />
          </View>

          {canDelete ? (
            <View style={styles.heartRateCard}>
              <View style={styles.heartRateHeaderRow}>
                <Text style={styles.heartRateTitle}>Heart Rate</Text>
                {heartRateSyncing ? (
                  <ActivityIndicator size="small" color={Colors.dark.highlight1} />
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
                    color="#FF4D4F"
                    points={heartRatePoints}
                    cardBg="rgba(5, 8, 22, 0.45)"
                    textColor={TEXT}
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
            <MetricChart
              title={`Pace Over Time (${distanceUnit === 'mi' ? '/mi' : '/km'})`}
              color={Colors.dark.highlight1}
              points={pacePoints}
              cardBg={CARD}
              textColor={TEXT}
              hideDataPoints
            />

            <MetricChart
              title={`Speed Over Time (${distanceUnit === 'mi' ? 'mph' : 'km/h'})`}
              color={Colors.dark.highlight4}
              points={speedPoints}
              cardBg={CARD}
              textColor={TEXT}
              hideDataPoints
            />

            <MetricChart
              title={`Elevation Over Time (${distanceUnit === 'mi' ? 'ft' : 'm'})`}
              color={Colors.dark.highlight2}
              points={elevationPoints}
              cardBg={CARD}
              textColor={TEXT}
              hideDataPoints
            />
          </View>

          <View style={{ height: 24 }} />
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
                .eq('id', sessionId);

              if (error) {
                Alert.alert('Error', 'Could not delete session.');
                return;
              }

              router.back();
            } finally {
              setDeleting(false);
            }
          }}
        />
      ) : null}
    </LinearGradient>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  centered: { alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  headerCenter: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    pointerEvents: 'none',
  },
  headerLabel: {
    fontSize: 11,
    letterSpacing: 2,
    opacity: 0.6,
    color: TEXT,
    fontWeight: '700',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.dark.highlight1,
  },

  trashBtn: {
    marginLeft: 'auto',
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: DANGER,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },

  card: {
    marginTop: 8,
    marginHorizontal: 16,
    backgroundColor: CARD,
    borderRadius: 18,
    padding: 16,
    gap: 12,
  },
  heartRateCard: {
    marginTop: 12,
    marginHorizontal: 16,
    borderRadius: 16,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  heartRateHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  heartRateTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
  },
  heartRateAvgLabel: {
    color: '#c6d0ea',
    fontSize: 15,
    fontWeight: '600',
  },
  heartRateAvgValue: {
    color: '#FF4D4F',
    fontSize: 40,
    fontWeight: '900',
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
    backgroundColor: 'rgba(5,8,22,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  heartRateStatLabel: {
    color: '#9aa4bf',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  heartRateStatValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 4,
  },
  heartRateEmpty: {
    color: '#9aa4bf',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  heartRateStatusText: {
    color: '#A3B2D5',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 10,
  },
  heartRateStatusTextError: {
    color: '#FCA5A5',
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
    borderColor: Colors.dark.highlight1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    paddingHorizontal: 10,
  },
  heartRateActionBtnPrimary: {
    backgroundColor: Colors.dark.highlight1,
  },
  heartRateActionBtnText: {
    color: Colors.dark.highlight1,
    fontWeight: '700',
    fontSize: 12,
  },
  heartRateActionBtnPrimaryText: {
    color: '#0D1320',
    fontWeight: '800',
    fontSize: 12,
  },
  heartRateActionBtnDisabled: {
    opacity: 0.65,
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rowLabel: {
    color: TEXT,
    opacity: 0.7,
    fontSize: 12,
    fontWeight: '800',
  },
  rowValue: {
    color: TEXT,
    fontSize: 14,
    fontWeight: '900',
  },

  chartsWrap: {
    marginTop: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
});
