import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '@/constants/Colors';
import { useUnits } from '@/contexts/UnitsContext';
import GoalAchievementCard from '@/components/goals/GoalAchievementCard';
import {
  deleteOutdoorSession,
  createOutdoorSession,
  insertOutdoorSamples,
  updateOutdoorSession,
} from '@/lib/OutdoorSession/supabase';
import {
  formatDuration,
  formatDistance,
  formatPaceForUnit,
  paceSecPerKm,
} from '@/lib/OutdoorSession/outdoorUtils';
import {
  getDeviceTimezone,
  syncAndFetchMyDailyGoalResult,
  toLocalISODate,
} from '@/lib/goals/client';
import {
  isGoalCategoryClosed,
  type DailyGoalResults,
} from '@/lib/goals/goalLogic';
import {
  deleteOutdoorDraft,
  getOutdoorDraft,
  type OutdoorSessionDraft,
} from '@/lib/OutdoorSession/draftStore';
import MetricChart, { type SamplePoint } from '@/components/charts/MetricLineChart';
import {
  formatAppleHealthError,
  getAppleHealthUnavailableMessage,
  getAppleHeartRateSamplesForRange,
  isAppleHealthKitAvailable,
  type AppleHeartRateSample,
} from '@/lib/health/appleHealthKit';
import { buildHeartRateTimelinePoints } from '@/lib/health/heartRateTimeline';

const BG = Colors?.dark?.background ?? '#F5F6F8';
const CARD = Colors?.dark?.card ?? '#131A24';
const TEXT = Colors?.dark?.text ?? '#111';
const MUTED = Colors?.dark?.textMuted ?? '#6B7280';
const ACCENT = Colors?.dark?.highlight1 ?? '#16A34A';
const HEART_RATE_AUTO_RETRY_DELAY_MS = 45_000;
const HEART_RATE_MANUAL_DELAY_MS = 20_000;

function normalizeOutdoorActivityType(activityType?: string): 'run' | 'walk' {
  return String(activityType ?? '').toLowerCase().includes('walk') ? 'walk' : 'run';
}

function getSafeIsoDate(value?: string | null, fallbackDate?: Date) {
  if (value) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }

  return (fallbackDate ?? new Date()).toISOString();
}

function formatTimelineLabel(totalSeconds: number) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(seconds / 60);
  const rem = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
}

type HeartRateSyncState =
  | 'idle'
  | 'scheduled'
  | 'syncing'
  | 'synced'
  | 'skipped'
  | 'failed';

export default function SessionSummary() {
  const router = useRouter();
  const { distanceUnit } = useUnits();
  const params = useLocalSearchParams<{
    draftId?: string;
    title?: string;
    activityType?: string;
    elapsedSeconds?: string;
    distanceMeters?: string;
    startedAtISO?: string;
    endedAtISO?: string;
  }>();
  const draftId = params.draftId?.toString();

  const title = (params.title ?? 'Outdoor Session').toString();
  const [draft, setDraft] = useState<OutdoorSessionDraft | null>(null);
  const [loading, setLoading] = useState(Boolean(draftId));

  const [saving, setSaving] = useState(false);
  const [savedSessionId, setSavedSessionId] = useState<string | null>(null);
  const [goalResult, setGoalResult] = useState<DailyGoalResults | null>(null);
  const [saveStatusText, setSaveStatusText] = useState<string | null>(null);
  const [heartRateSamples, setHeartRateSamples] = useState<AppleHeartRateSample[]>([]);
  const [heartRateSyncState, setHeartRateSyncState] = useState<HeartRateSyncState>('idle');
  const [heartRateSyncMessage, setHeartRateSyncMessage] = useState<string | null>(null);
  const [heartRateSyncing, setHeartRateSyncing] = useState(false);
  const [heartRateLoaded, setHeartRateLoaded] = useState(false);
  const autoHeartRateRetryRef = useRef(false);
  const activeHeartRateSyncTokenRef = useRef(0);

  useEffect(() => {
    let mounted = true;

    if (!draftId) {
      setLoading(false);
      return () => {
        mounted = false;
      };
    }

    (async () => {
      try {
        const nextDraft = await getOutdoorDraft(draftId);
        if (!mounted) return;

        if (!nextDraft) {
          Alert.alert('Error', 'Outdoor draft not found.');
          router.replace('/(tabs)/home');
          return;
        }

        setDraft(nextDraft);
      } catch (error) {
        console.warn('[OutdoorSessionSummary] draft load failed', error);
        if (mounted) {
          Alert.alert('Error', 'Could not load outdoor summary.');
          router.replace('/(tabs)/home');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [draftId, router]);

  const activityType = draft?.activity_type ?? normalizeOutdoorActivityType(params.activityType?.toString());
  const elapsedSeconds = draft?.total_time_s ?? Math.max(0, Number(params.elapsedSeconds ?? 0) || 0);
  const distanceMeters = draft?.total_distance_m ?? Math.max(0, Number(params.distanceMeters ?? 0) || 0);
  const endedAtISO = getSafeIsoDate(draft?.ended_at ?? params.endedAtISO?.toString());
  const startedAtISO = getSafeIsoDate(
    draft?.started_at ?? params.startedAtISO?.toString(),
    new Date(new Date(endedAtISO).getTime() - elapsedSeconds * 1000)
  );

  const avgPace = useMemo(
    () => draft?.avg_pace_s_per_km ?? paceSecPerKm(distanceMeters, elapsedSeconds),
    [distanceMeters, draft?.avg_pace_s_per_km, elapsedSeconds]
  );

  const avgSpeedMps = useMemo(() => {
    if (draft?.avg_speed_mps != null) return draft.avg_speed_mps;
    if (elapsedSeconds <= 0 || distanceMeters <= 0) return null;
    return distanceMeters / elapsedSeconds;
  }, [distanceMeters, draft?.avg_speed_mps, elapsedSeconds]);

  const runHeartRateSync = useCallback(
    async (opts?: { delayMs?: number; reason?: 'auto' | 'manual' }) => {
      if (!startedAtISO || !endedAtISO) {
        setHeartRateSyncState('skipped');
        setHeartRateSyncMessage('Workout timestamps are missing, so heart-rate sync was skipped.');
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
          )} seconds before re-checking Apple Health.`
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }

      if (activeHeartRateSyncTokenRef.current !== syncToken) {
        return;
      }

      try {
        setHeartRateSyncing(true);
        setHeartRateSyncState('syncing');
        setHeartRateSyncMessage('Loading heart-rate samples from Apple Health…');

        if (!isAppleHealthKitAvailable()) {
          throw new Error(getAppleHealthUnavailableMessage());
        }

        const samples = await getAppleHeartRateSamplesForRange({
          startDate: startedAtISO,
          endDate: endedAtISO,
        });

        if (activeHeartRateSyncTokenRef.current !== syncToken) {
          return;
        }

        setHeartRateSamples(samples);
        setHeartRateLoaded(true);
        setHeartRateSyncState('synced');

        if (samples.length === 0) {
          setHeartRateSyncMessage(
            'Apple Health returned no samples for this session yet. Retry after a short delay.'
          );
        } else {
          setHeartRateSyncMessage(
            `Loaded ${samples.length} heart-rate samples from Apple Health.`
          );
        }
      } catch (error: any) {
        console.warn('[OutdoorSessionSummary] Apple Health load failed', error);
        setHeartRateLoaded(true);
        setHeartRateSyncState('failed');
        setHeartRateSyncMessage(formatAppleHealthError(error));
      } finally {
        setHeartRateSyncing(false);
      }
    },
    [endedAtISO, startedAtISO]
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
      workoutStartISO: startedAtISO,
      workoutEndISO: endedAtISO,
    });
  }, [endedAtISO, heartRateSamples, startedAtISO]);

  const heartRateSourceLabel = useMemo(() => {
    if (heartRateSamples.length === 0) return null;
    const first = heartRateSamples[0];
    return first.sourceName ?? first.deviceName ?? 'Apple Health';
  }, [heartRateSamples]);

  useEffect(() => {
    autoHeartRateRetryRef.current = false;
    activeHeartRateSyncTokenRef.current = 0;
    setHeartRateSamples([]);
    setHeartRateLoaded(false);
    setHeartRateSyncState('idle');
    setHeartRateSyncMessage(null);
    setHeartRateSyncing(false);
  }, [draftId, startedAtISO, endedAtISO]);

  useEffect(() => {
    if (!startedAtISO || !endedAtISO) return;
    if (heartRateLoaded || heartRateSyncing) return;
    void runHeartRateSync({ reason: 'manual' });
  }, [
    endedAtISO,
    heartRateLoaded,
    heartRateSyncing,
    runHeartRateSync,
    startedAtISO,
  ]);

  useEffect(() => {
    if (!startedAtISO || !endedAtISO) return;
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
    endedAtISO,
    heartRateLoaded,
    heartRateSamples.length,
    heartRateSyncState,
    heartRateSyncing,
    runHeartRateSync,
    startedAtISO,
  ]);

  async function onSave() {
    if (saving || savedSessionId || loading) return;

    let sessionId: string | null = null;

    try {
      setSaving(true);

      sessionId = await createOutdoorSession({
        activityType,
        startedAtISO,
        timezoneStr: getDeviceTimezone(),
      });

      if (draft?.samples?.length) {
        await insertOutdoorSamples(
          draft.samples.map((sample) => ({
            session_id: sessionId!,
            ts: sample.ts,
            elapsed_s: sample.elapsed_s,
            lat: sample.lat,
            lon: sample.lon,
            altitude_m: sample.altitude_m,
            accuracy_m: sample.accuracy_m,
            speed_mps: sample.speed_mps,
            bearing_deg: sample.bearing_deg,
            hr_bpm: null,
            cadence_spm: null,
            grade_pct: null,
            distance_m: sample.distance_m,
            is_moving: sample.is_moving,
            source: 'fg',
          }))
        );
      }

      await updateOutdoorSession(sessionId, {
        ended_at: endedAtISO,
        duration_s: elapsedSeconds,
        distance_m: distanceMeters,
        avg_speed_mps: avgSpeedMps,
        avg_pace_s_per_km: avgPace,
        status: 'completed',
      });

      let nextGoalResult: DailyGoalResults | null = null;
      try {
        nextGoalResult = await syncAndFetchMyDailyGoalResult(
          toLocalISODate(new Date(endedAtISO))
        );
      } catch (goalError) {
        console.warn('[OutdoorSessionSummary] goal refresh failed', goalError);
      }

      if (draftId) {
        await deleteOutdoorDraft(draftId);
      }

      setSavedSessionId(sessionId);
      setGoalResult(nextGoalResult);
      setSaveStatusText('Session saved.');
    } catch (error) {
      console.warn('[OutdoorSessionSummary] save failed', error);

      if (sessionId) {
        try {
          await deleteOutdoorSession(sessionId);
        } catch (cleanupError) {
          console.warn('[OutdoorSessionSummary] cleanup failed', cleanupError);
        }
      }

      Alert.alert('Error', 'Could not save outdoor session. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function onDone() {
    router.replace('/(tabs)/home');
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.kicker}>SESSION SUMMARY</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.sub}>{activityType.toUpperCase()}</Text>
        </View>

        <View style={styles.card}>
          <Row label="Time" value={formatDuration(elapsedSeconds)} />
          <Row label="Distance" value={formatDistance(distanceMeters, distanceUnit)} />
          <Row label="Avg Pace" value={formatPaceForUnit(avgPace, distanceUnit)} />
        </View>

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
                xLabelFormatter={formatTimelineLabel}
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
              No Apple Health heart-rate samples found yet for this session window.
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

        {savedSessionId && saveStatusText ? (
          <View style={styles.noticeCard}>
            <Text style={styles.noticeText}>{saveStatusText}</Text>
          </View>
        ) : null}

        {savedSessionId && goalResult && isGoalCategoryClosed(goalResult, 'cardio') ? (
          <View style={styles.goalCardWrap}>
            <GoalAchievementCard
              title="Cardio goal complete"
              description="This session completed your cardio goal for today."
            />
          </View>
        ) : null}

        <View style={styles.footer}>
          {savedSessionId ? (
            <TouchableOpacity style={styles.primary} onPress={onDone}>
              <Ionicons name="checkmark" size={20} color="#0E151F" />
              <Text style={styles.primaryText}>Done</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.primary, saving && styles.primaryDisabled]}
              onPress={onSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#0E151F" />
              ) : (
                <>
                  <Ionicons name="save-outline" size={20} color="#0E151F" />
                  <Text style={styles.primaryText}>Save Session</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      <View style={[styles.accentLine, { backgroundColor: ACCENT }]} />
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={rowStyles.row}>
      <Text style={rowStyles.label}>{label}</Text>
      <Text style={rowStyles.value}>{value}</Text>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  label: {
    color: MUTED,
    fontWeight: '800',
    letterSpacing: 1.2,
    fontSize: 12,
  },
  value: {
    color: TEXT,
    fontWeight: '900',
    fontSize: 16,
  },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  kicker: {
    color: MUTED,
    fontWeight: '900',
    letterSpacing: 1.6,
    fontSize: 12,
  },
  title: {
    marginTop: 8,
    color: TEXT,
    fontWeight: '900',
    fontSize: 28,
  },
  sub: {
    marginTop: 4,
    color: MUTED,
    fontWeight: '800',
    letterSpacing: 1.4,
    fontSize: 12,
  },
  card: {
    marginTop: 12,
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 6,
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
  noticeCard: {
    marginTop: 12,
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: CARD,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  noticeText: {
    color: '#D7E0F4',
    fontSize: 12.5,
    lineHeight: 18,
  },
  goalCardWrap: {
    marginTop: 12,
    paddingHorizontal: 16,
  },
  footer: {
    marginTop: 'auto',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    gap: 10,
  },
  primary: {
    height: 56,
    borderRadius: 16,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  primaryDisabled: {
    opacity: 0.65,
  },
  primaryText: {
    color: '#0E151F',
    fontSize: 16,
    fontWeight: '900',
  },
  accentLine: {
    height: 4,
    width: '100%',
  },
});
