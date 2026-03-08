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

import { useUnits } from '@/contexts/UnitsContext';
import LogoHeader from '@/components/my components/logoHeader';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import { shareRunWalkSessionToFeed } from '@/lib/social/feed';
import GoalAchievementCard from '@/components/goals/GoalAchievementCard';
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
  getDraft,
  deleteDraft,
  type RunWalkDraft,
} from '@/lib/runWalkDraftStore';

import MetricChart, { type SamplePoint } from '@/components/charts/MetricLineChart';
import DeleteDraftConfirmModal from './indoor/DeleteDraftConfirmModal';
import {
  formatAppleHealthError,
  getAppleHealthUnavailableMessage,
  getAppleHeartRateSamplesForRange,
  isAppleHealthKitAvailable,
  type AppleHeartRateSample,
} from '@/lib/health/appleHealthKit';
import { buildHeartRateTimelinePoints } from '@/lib/health/heartRateTimeline';
import { useAppTheme } from '@/providers/AppThemeProvider';

const M_PER_MI = 1609.344;
const M_PER_KM = 1000;
const FT_PER_M = 3.28084;

const MPH_PER_MPS = 2.236936;
const KMH_PER_MPS = 3.6;
const HEART_RATE_AUTO_RETRY_DELAY_MS = 45_000;
const HEART_RATE_MANUAL_DELAY_MS = 20_000;

function formatClock(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function mToDisplay(meters: number, unit: 'mi' | 'km') {
  return unit === 'mi' ? meters / M_PER_MI : meters / M_PER_KM;
}

function formatPace(secondsPerUnit: number | null, suffix: '/mi' | '/km') {
  if (secondsPerUnit == null || !Number.isFinite(secondsPerUnit) || secondsPerUnit <= 0) return `— ${suffix}`;
  const mm = Math.floor(secondsPerUnit / 60);
  const ss = Math.round(secondsPerUnit % 60);
  return `${mm}:${String(ss).padStart(2, '0')} ${suffix}`;
}

function paceForUnit(
  paceMi: number | null | undefined,
  paceKm: number | null | undefined,
  unit: 'mi' | 'km'
) {
  const mi = paceMi != null && Number.isFinite(paceMi) && paceMi > 0 ? paceMi : null;
  const km = paceKm != null && Number.isFinite(paceKm) && paceKm > 0 ? paceKm : null;

  if (unit === 'mi') return mi ?? (km != null ? km * 1.609344 : null);
  return km ?? (mi != null ? mi / 1.609344 : null);
}

function formatShareErr(err: any): string {
  if (!err) return 'Unknown share error';
  const code = String(err?.code ?? '').trim();
  if (code === '42P10') {
    return 'Backend share function is outdated (42P10). Apply migration 20260227_fix_share_run_walk_session_user_no_on_conflict.sql.';
  }
  const message = String(err?.message ?? 'Share request failed').trim();
  return code ? `${message} (${code})` : message;
}

type HeartRateSyncState =
  | 'idle'
  | 'scheduled'
  | 'syncing'
  | 'synced'
  | 'skipped'
  | 'failed';

export default function IndoorSessionSummary() {
  const router = useRouter();
  const { colors, fonts, globalStyles } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);
  const { distanceUnit } = useUnits();
  const params = useLocalSearchParams<{ draftId?: string }>();
  const draftId = params.draftId;

  const [draft, setDraft] = useState<RunWalkDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [shareToFeed, setShareToFeed] = useState(false);
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

  // ✅ Delete confirmation modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        if (!draftId) {
          Alert.alert('Error', 'Missing draft.');
          router.back();
          return;
        }

        const d = await getDraft(draftId);
        if (!mounted) return;

        if (!d) {
          Alert.alert('Error', 'Draft not found (it may have been deleted).');
          router.back();
          return;
        }

        setDraft(d);
        console.log('[IndoorSessionSummary] draftId:', draftId);
        console.log('[IndoorSessionSummary] loaded draft:', d);
        console.log('[IndoorSessionSummary] samples length:', d?.samples?.length);
        console.log('[IndoorSessionSummary] first sample:', d?.samples?.[0]);
        console.log('[IndoorSessionSummary] last sample:', d?.samples?.[d.samples.length - 1]);
      } catch (e) {
        console.log('[IndoorSessionSummary] load error', e);
        Alert.alert('Error', 'Could not load summary.');
        router.back();
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [draftId, router]);

  const distUnit = distanceUnit;
  const distLabelUnit = distUnit === 'mi' ? 'MI' : 'KM';

  const title = useMemo(() => {
    if (!draft) return 'SESSION SUMMARY';
    switch (draft.exercise_type) {
      case 'indoor_walk':
        return 'INDOOR WALK SUMMARY';
      case 'indoor_run':
      default:
        return 'INDOOR RUN SUMMARY';
    }
  }, [draft]);

  const displayDistance = draft ? mToDisplay(draft.total_distance_m, distUnit) : 0;

  const avgPaceForUnit = paceForUnit(
    draft?.avg_pace_s_per_mi ?? null,
    draft?.avg_pace_s_per_km ?? null,
    distUnit
  );
  const avgPaceText = formatPace(avgPaceForUnit, distUnit === 'mi' ? '/mi' : '/km');
  const workoutStartISO = draft?.created_at ?? null;
  const workoutEndISO = draft?.ended_at ?? null;

  const runHeartRateSync = useCallback(
    async (opts?: { delayMs?: number; reason?: 'auto' | 'manual' }) => {
      if (!workoutStartISO || !workoutEndISO) {
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
        if (!isAppleHealthKitAvailable()) {
          setHeartRateLoaded(true);
          setHeartRateSyncState('skipped');
          setHeartRateSyncMessage(getAppleHealthUnavailableMessage());
          return;
        }

        setHeartRateSyncing(true);
        setHeartRateSyncState('syncing');
        setHeartRateSyncMessage('Loading heart-rate samples from Apple Health…');

        const samples = await getAppleHeartRateSamplesForRange({
          startDate: workoutStartISO,
          endDate: workoutEndISO,
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
        const message = formatAppleHealthError(error);
        setHeartRateLoaded(true);
        if (
          message.toLowerCase().includes('not available') ||
          message.toLowerCase().includes('nitro') ||
          message.toLowerCase().includes('turbo') ||
          message.toLowerCase().includes('build')
        ) {
          setHeartRateSyncState('skipped');
          setHeartRateSyncMessage(message);
          return;
        }
        console.warn('[IndoorSessionSummary] Apple Health load failed', message);
        setHeartRateSyncState('failed');
        setHeartRateSyncMessage(message);
      } finally {
        setHeartRateSyncing(false);
      }
    },
    [workoutEndISO, workoutStartISO]
  );

  useEffect(() => {
    autoHeartRateRetryRef.current = false;
    activeHeartRateSyncTokenRef.current = 0;
    setHeartRateSamples([]);
    setHeartRateLoaded(false);
    setHeartRateSyncState('idle');
    setHeartRateSyncMessage(null);
    setHeartRateSyncing(false);
  }, [draftId]);

  useEffect(() => {
    if (!draft?.created_at || !draft?.ended_at) return;
    if (heartRateLoaded || heartRateSyncing) return;
    void runHeartRateSync({ reason: 'manual' });
  }, [
    draft?.created_at,
    draft?.ended_at,
    heartRateLoaded,
    heartRateSyncing,
    runHeartRateSync,
  ]);

  useEffect(() => {
    if (!draft?.created_at || !draft?.ended_at) return;
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
    draft?.created_at,
    draft?.ended_at,
    heartRateLoaded,
    heartRateSamples.length,
    heartRateSyncState,
    runHeartRateSync,
  ]);

  // -----------------------------
  // Charts: build series from draft.samples (before saving)
  // -----------------------------
  const elapsedLabel = useMemo(() => {
    return (tSeconds: number) => formatClock(Math.round(tSeconds));
  }, []);

  const pacePoints: SamplePoint[] = useMemo(() => {
    if (!draft?.samples?.length) return [];
    return draft.samples
      .map((s: any) => {
        const v = paceForUnit(
          Number.isFinite(s.pace_s_per_mi) ? Number(s.pace_s_per_mi) : null,
          Number.isFinite(s.pace_s_per_km) ? Number(s.pace_s_per_km) : null,
          distUnit
        );
        if (v == null || v <= 0) return null;
        return { t: Number(s.elapsed_s ?? 0), v };
      })
      .filter(Boolean) as SamplePoint[];
  }, [draft?.samples, distUnit]);

  const speedPoints: SamplePoint[] = useMemo(() => {
    if (!draft?.samples?.length) return [];
    const mult = distUnit === 'mi' ? MPH_PER_MPS : KMH_PER_MPS;
    return draft.samples
      .filter((s: any) => Number.isFinite(s.speed_mps) && s.speed_mps >= 0)
      .map((s: any) => ({ t: Number(s.elapsed_s ?? 0), v: Number(s.speed_mps) * mult }));
  }, [draft?.samples, distUnit]);

  const elevationPoints: SamplePoint[] = useMemo(() => {
    if (!draft?.samples?.length) return [];
    const mult = distUnit === 'mi' ? FT_PER_M : 1;
    return draft.samples
      .filter((s: any) => Number.isFinite(s.elevation_m))
      .map((s: any) => ({ t: Number(s.elapsed_s ?? 0), v: Number(s.elevation_m) * mult }));
  }, [draft?.samples, distUnit]);

  const inclinePoints: SamplePoint[] = useMemo(() => {
    if (!draft?.samples?.length) return [];
    return draft.samples
      .filter((s: any) => Number.isFinite(s.incline_deg))
      .map((s: any) => ({ t: Number(s.elapsed_s ?? 0), v: Number(s.incline_deg) }));
  }, [draft?.samples]);

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
    return first.sourceName ?? first.deviceName ?? 'Apple Health';
  }, [heartRateSamples]);

  const paceFormatter = useMemo(() => {
    const suffix = distUnit === 'mi' ? '/mi' : '/km';
    return (v: number) => {
      if (!Number.isFinite(v) || v <= 0) return '—';
      const mm = Math.floor(v / 60);
      const ss = Math.round(v % 60);
      return `${mm}:${String(ss).padStart(2, '0')} ${suffix}`;
    };
  }, [distUnit]);

  const speedFormatter = useMemo(() => {
    return (v: number) => (Number.isFinite(v) ? v.toFixed(1) : '—');
  }, []);

  // ✅ Delete draft (now triggered only after confirmation modal)
  const onDeleteConfirmed = useCallback(async () => {
    if (!draftId) return;
    try {
      setDeleting(true);
      await deleteDraft(draftId);
      setShowDeleteModal(false);
      router.back();
    } catch (e) {
      console.log('[IndoorSessionSummary] delete error', e);
      Alert.alert('Error', 'Could not delete draft.');
    } finally {
      setDeleting(false);
    }
  }, [draftId, router]);

  const onSave = async () => {
    if (!draftId || !draft) return;

    try {
      setSaving(true);
      const fallbackStartedAt = new Date(
        new Date(draft.ended_at).getTime() - Math.max(0, draft.total_time_s) * 1000
      ).toISOString();

      const sessionPayload = {
        status: 'completed',
        started_at: draft.created_at ?? fallbackStartedAt,
        ended_at: draft.ended_at,
        total_time_s: draft.total_time_s,
        total_distance_m: draft.total_distance_m,
        total_elevation_m: draft.total_elevation_m,
        avg_speed_mps: draft.avg_speed_mps,
        avg_pace_s_per_km: draft.avg_pace_s_per_km,
        avg_pace_s_per_mi: draft.avg_pace_s_per_mi,
        timezone_str: getDeviceTimezone(),
      };

      const fallbackExerciseType =
        draft.exercise_type === 'indoor_walk' ? 'walk' : 'run';

      // 1) insert session (with enum compatibility fallback)
      let savedExerciseType: string = draft.exercise_type;
      let { data: inserted, error: insErr } = await supabase
        .schema('run_walk')
        .from('sessions')
        .insert({
          ...sessionPayload,
          exercise_type: savedExerciseType,
        })
        .select('id')
        .single();

      if (insErr && fallbackExerciseType !== savedExerciseType) {
        const msg = String(insErr.message ?? '').toLowerCase();
        const looksLikeEnumMismatch =
          insErr.code === '22P02' || msg.includes('invalid input value for enum');

        if (looksLikeEnumMismatch) {
          savedExerciseType = fallbackExerciseType;
          const retry = await supabase
            .schema('run_walk')
            .from('sessions')
            .insert({
              ...sessionPayload,
              exercise_type: savedExerciseType,
            })
            .select('id')
            .single();
          inserted = retry.data;
          insErr = retry.error;
        }
      }

      if (insErr || !inserted?.id) {
        console.log('[IndoorSessionSummary] session insert error', insErr);
        Alert.alert('Error', 'Could not save session. Please try again.');
        return;
      }

      const sessionId = inserted.id as string;

      // 2) insert samples
      if (draft.samples?.length) {
        const rows = draft.samples.map((s: any) => ({
          session_id: sessionId,
          seq: s.seq,
          elapsed_s: s.elapsed_s,
          distance_m: s.distance_m,
          speed_mps: s.speed_mps,
          pace_s_per_km: s.pace_s_per_km,
          pace_s_per_mi: s.pace_s_per_mi,
          incline_deg: s.incline_deg,
          elevation_m: s.elevation_m,
        }));

        const { error: sampErr } = await supabase
          .schema('run_walk')
          .from('samples')
          .insert(rows);

        if (sampErr) {
          console.log('[IndoorSessionSummary] samples insert error', sampErr);
          // Keep storage atomic for chart summaries: if sample insert fails,
          // remove the just-created session and keep the draft for retry.
          await supabase
            .schema('run_walk')
            .from('sessions')
            .delete()
            .eq('id', sessionId);
          Alert.alert('Error', 'Could not save session samples. Please try again.');
          return;
        }
      }

      // 3) delete local draft
      let shared = false;
      let shareErrorMsg: string | null = null;
      if (shareToFeed) {
        try {
          await shareRunWalkSessionToFeed({
            sessionId,
            exerciseType: savedExerciseType,
            totalDistanceM: draft.total_distance_m,
            totalTimeS: draft.total_time_s,
            avgPaceSPerMi: draft.avg_pace_s_per_mi ?? null,
            avgPaceSPerKm: draft.avg_pace_s_per_km ?? null,
            visibility: 'followers',
          });
          shared = true;
        } catch (shareErr: any) {
          shareErrorMsg = formatShareErr(shareErr);
          console.warn('[IndoorSessionSummary] share failed', shareErr);
        }
      }

      // 4) delete local draft
      await deleteDraft(draftId);

      let nextGoalResult: DailyGoalResults | null = null;
      try {
        nextGoalResult = await syncAndFetchMyDailyGoalResult(
          toLocalISODate(new Date(draft.ended_at))
        );
      } catch (goalError) {
        console.warn('[IndoorSessionSummary] goal refresh failed', goalError);
      }

      setSavedSessionId(sessionId);
      setGoalResult(nextGoalResult);

      if (shareToFeed && shared) {
        setSaveStatusText('Session saved and shared to your feed.');
      } else if (shareToFeed && !shared) {
        setSaveStatusText('Session saved. Sharing to your feed failed.');
        Alert.alert(
          'Share failed',
          `Session saved, but sharing to your feed failed.${shareErrorMsg ? `\n\n${shareErrorMsg}` : ''}`
        );
      } else {
        setSaveStatusText('Session saved.');
      }
    } catch (e) {
      console.log('[IndoorSessionSummary] save unexpected error', e);
      Alert.alert('Error', 'Could not save session.');
    } finally {
      setSaving(false);
    }
  };

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

  if (!draft) {
    return (
      <LinearGradient
        colors={[colors.gradientTop, colors.gradientMid, colors.gradientBottom]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={globalStyles.page}
      >
        <View style={[styles.safe, styles.centered]}>
          <Text style={styles.emptyStateText}>Draft not found.</Text>
        </View>
      </LinearGradient>
    );
  }

  const speedUnitSuffix = distUnit === 'mi' ? 'mph' : 'km/h';
  const paceSuffix = distUnit === 'mi' ? '/mi' : '/km';
  const elevationUnitSuffix = distUnit === 'mi' ? 'ft' : 'm';
  const totalElevationDisplay =
    distUnit === 'mi'
      ? draft.total_elevation_m * FT_PER_M
      : draft.total_elevation_m;

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
              <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
                <Ionicons name="chevron-back" size={18} color={colors.text} />
              </TouchableOpacity>

              <View style={styles.headerCenter}>
                <Text style={globalStyles.eyebrow}>Session summary</Text>
                <Text style={styles.title}>{title}</Text>
                <Text style={styles.heroSubtitle}>
                  Review distance, pace, elevation, and saved cardio effort before you move on.
                </Text>
              </View>

              <View style={styles.iconBtnSpacer} />
            </View>

            <View style={styles.heroStatsRow}>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>{formatClock(draft.total_time_s)}</Text>
                <Text style={styles.heroStatLabel}>time</Text>
              </View>
              <View style={[styles.heroStat, styles.heroStatAccent]}>
                <Text style={styles.heroStatValue}>{`${displayDistance.toFixed(2)} ${distLabelUnit}`}</Text>
                <Text style={styles.heroStatLabel}>distance</Text>
              </View>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>{avgPaceText}</Text>
                <Text style={styles.heroStatLabel}>avg pace</Text>
              </View>
            </View>
          </View>

          <View style={[globalStyles.panelSoft, styles.card]}>
            <Row label="Total Time" value={formatClock(draft.total_time_s)} styles={styles} />
            <Row
              label="Total Distance"
              value={`${displayDistance.toFixed(2)} ${distLabelUnit}`}
              styles={styles}
            />
            <Row
              label="Elevation Gain"
              value={`${totalElevationDisplay.toFixed(0)} ${elevationUnitSuffix}`}
              styles={styles}
            />
            <Row label="Avg Pace" value={avgPaceText} styles={styles} />
          </View>

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
                  cardBg={colors.cardDark}
                  textColor={colors.text}
                  valueFormatter={(v) => `${Math.round(v)}`}
                  xLabelFormatter={elapsedLabel}
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

          <View style={styles.chartsWrap}>
            <MetricChart
              title={`Pace Over Time (${paceSuffix})`}
              color={colors.highlight1}
              points={pacePoints}
              cardBg={colors.card}
              textColor={colors.text}
              valueFormatter={paceFormatter}
              xLabelFormatter={elapsedLabel}
              yClampMin={1}
              noOfSections={5}
              showGrid={false}
              showYAxisIndices={false}
              showXAxisIndices={false}
              hideDataPoints
            />

            <MetricChart
              title={`Speed Over Time (${speedUnitSuffix})`}
              color={colors.highlight3}
              points={speedPoints}
              cardBg={colors.card}
              textColor={colors.text}
              valueFormatter={speedFormatter}
              xLabelFormatter={elapsedLabel}
              unitSuffix={speedUnitSuffix}
              yClampMin={0}
              noOfSections={4}
              showGrid={false}
              showYAxisIndices={false}
              showXAxisIndices={false}
              hideDataPoints
            />

            <MetricChart
              title={`Elevation Over Time (${elevationUnitSuffix})`}
              color={colors.highlight2}
              points={elevationPoints}
              cardBg={colors.card}
              textColor={colors.text}
              valueFormatter={(v) => (Number.isFinite(v) ? v.toFixed(1) : '—')}
              xLabelFormatter={elapsedLabel}
              unitSuffix={elevationUnitSuffix}
              noOfSections={4}
              showGrid={false}
              showYAxisIndices={false}
              showXAxisIndices={false}
              hideDataPoints
            />

            <MetricChart
              title="Incline Over Time (deg)"
              color={colors.highlight3}
              points={inclinePoints}
              cardBg={colors.card}
              textColor={colors.text}
              valueFormatter={(v) => (Number.isFinite(v) ? v.toFixed(1) : '—')}
              xLabelFormatter={elapsedLabel}
              noOfSections={4}
              showGrid={false}
              showYAxisIndices={false}
              showXAxisIndices={false}
              hideDataPoints
            />
          </View>

          <View style={styles.actions}>
            {savedSessionId ? (
              <TouchableOpacity
                activeOpacity={0.9}
                style={[globalStyles.buttonPrimary, styles.saveBtn]}
                onPress={() => router.back()}
              >
                <Ionicons name="checkmark" size={18} color={colors.blkText} />
                <Text style={globalStyles.buttonTextPrimary}>Done</Text>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={styles.shareCard}
                  onPress={() => setShareToFeed((v) => !v)}
                  disabled={saving || deleting}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.shareTitle}>Share to social feed</Text>
                    <Text style={styles.shareSubtitle}>
                      {shareToFeed
                        ? 'Followers will be able to see this session.'
                        : 'Keep this session private.'}
                    </Text>
                  </View>
                  <Ionicons
                    name={shareToFeed ? 'checkmark-circle' : 'ellipse-outline'}
                    size={24}
                    color={shareToFeed ? colors.highlight1 : colors.textMuted}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.9}
                  style={[globalStyles.buttonPrimary, styles.saveBtn, saving && { opacity: 0.6 }]}
                  onPress={onSave}
                  disabled={saving || deleting}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color={colors.blkText} />
                  ) : (
                    <>
                      <Ionicons name="save-outline" size={18} color={colors.blkText} />
                      <Text style={globalStyles.buttonTextPrimary}>Save</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.9}
                  style={[styles.deleteBtn, (saving || deleting) && { opacity: 0.6 }]}
                  onPress={() => setShowDeleteModal(true)}
                  disabled={saving || deleting}
                >
                  <Ionicons name="trash-outline" size={18} color={colors.danger} />
                  <Text style={styles.deleteText}>Delete</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          <View style={{ height: 18 }} />
        </ScrollView>

        <DeleteDraftConfirmModal
          visible={showDeleteModal}
          isBusy={deleting}
          onCancel={() => setShowDeleteModal(false)}
          onConfirm={onDeleteConfirmed}
          title="Delete this session draft?"
          message="If you delete this draft, the data will be lost forever. This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
        />
      </View>
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
    lineHeight: 44,
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
    borderRadius: 14,
    backgroundColor: colors.card3,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  heartRateStatLabel: {
    color: colors.textOffSt,
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
  },
  heartRateActionBtnPrimary: {
    backgroundColor: colors.highlight1,
  },
  heartRateActionBtnText: {
    color: colors.highlight1,
    fontFamily: fonts.heading,
    fontSize: 12,
  },
  heartRateActionBtnPrimaryText: {
    color: colors.blkText,
    fontFamily: fonts.heading,
    fontSize: 12,
  },
  heartRateActionBtnDisabled: {
    opacity: 0.65,
  },

  chartsWrap: {
    marginTop: 12,
    gap: 12,
  },
  noticeCard: {
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  noticeText: {
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 12.5,
    lineHeight: 18,
  },
  goalCardWrap: {
    marginTop: 12,
  },

  actions: {
    marginTop: 14,
    paddingHorizontal: 16,
    gap: 10,
  },
  shareCard: {
    borderRadius: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  shareTitle: {
    color: colors.text,
    fontFamily: fonts.heading,
    fontSize: 13.5,
  },
  shareSubtitle: {
    marginTop: 4,
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 16,
  },
  saveBtn: {
    minHeight: 56,
    gap: 10,
  },

  deleteBtn: {
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  deleteText: {
    color: colors.danger,
    fontFamily: fonts.heading,
    fontSize: 16,
    letterSpacing: 0.2,
  },
  });
}
