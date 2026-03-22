// app/(tabs)/add/Strength/[id].tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import LogoHeader from '@/components/my components/logoHeader';
import { supabase } from '@/lib/supabase';
import { useUnits } from '@/contexts/UnitsContext';
import { shareStrengthWorkoutToFeed } from '@/lib/social/feed';
import GoalAchievementCard from '@/components/goals/GoalAchievementCard';
import {
  syncAndFetchMyDailyGoalResult,
  toLocalISODate,
} from '@/lib/goals/client';
import {
  isGoalCategoryClosed,
  type DailyGoalResults,
} from '@/lib/goals/goalLogic';
import MetricLineChart, { type SamplePoint } from '@/components/charts/MetricLineChart';
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

const HEART_RATE_AUTO_RETRY_DELAY_MS = 45_000;
const HEART_RATE_MANUAL_DELAY_MS = 20_000;
const HEART_RATE_PROVIDER_LABEL = getCurrentHealthProviderLabel();

const LB_PER_KG = 2.20462;

// Format a value that is stored in KG (volumes, 1RM, etc.)
function formatFromKg(
  value: number | null | undefined,
  unit: 'kg' | 'lb'
): string {
  if (value == null) return '-';
  if (unit === 'kg') return `${value.toFixed(1)} kg`;
  const lb = value * LB_PER_KG;
  return `${lb.toFixed(0)} lb`;
}

// Format a set weight that has its own unit (s.weight + s.weight_unit_csv)
function formatSetWeight(
  weight: number | null | undefined,
  weightUnitCsv: string | null | undefined,
  viewerUnit: 'kg' | 'lb'
): string {
  if (weight == null) return '-';

  const setUnit =
    weightUnitCsv === 'kg' || weightUnitCsv === 'lb'
      ? (weightUnitCsv as 'kg' | 'lb')
      : viewerUnit;

  // if same unit, just show value + unit
  if (setUnit === viewerUnit) {
    return `${weight}${setUnit}`;
  }

  // convert if different
  if (setUnit === 'kg' && viewerUnit === 'lb') {
    const lb = weight * LB_PER_KG;
    return `${lb.toFixed(0)}lb`;
  }

  if (setUnit === 'lb' && viewerUnit === 'kg') {
    const kg = weight / LB_PER_KG;
    return `${kg.toFixed(1)}kg`;
  }

  return `${weight}${setUnit}`;
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

type ExerciseSummaryRow = {
  exercise_id: string;
  exercise_name?: string | null;
  vol: number | null;
  strongest_set: number | null;
  best_est_1rm: number | null;
  avg_set: number | null;
};

type HeartRateSyncState =
  | 'idle'
  | 'scheduled'
  | 'syncing'
  | 'synced'
  | 'skipped'
  | 'failed';

function formatTimelineLabel(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(seconds / 60);
  const rem = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
}

export default function StrengthSummaryPage() {
  const { colors, fonts, globalStyles } = useAppTheme();
  const styles = React.useMemo(() => createStyles(colors, fonts), [colors, fonts]);
  const { id, postId, autoHeartRateSync } = useLocalSearchParams<{
    id?: string;
    postId?: string;
    autoHeartRateSync?: string;
  }>(); // workout ID

  const [loading, setLoading] = React.useState(true);
  const [workout, setWorkout] = React.useState<any>(null);
  const [exercises, setExercises] = React.useState<ExerciseSummaryRow[]>([]);
  const [setsByExercise, setSetsByExercise] = React.useState<Record<string, any[]>>({});
  const [canDelete, setCanDelete] = React.useState(true);
  const [shareToFeed, setShareToFeed] = React.useState(false);
  const [sharing, setSharing] = React.useState(false);
  const [goalResult, setGoalResult] = React.useState<DailyGoalResults | null>(null);
  const [heartRateSamples, setHeartRateSamples] = React.useState<HealthHeartRateSample[]>([]);
  const [heartRateSyncState, setHeartRateSyncState] = React.useState<HeartRateSyncState>('idle');
  const [heartRateSyncMessage, setHeartRateSyncMessage] = React.useState<string | null>(null);
  const [heartRateSyncing, setHeartRateSyncing] = React.useState(false);
  const [heartRateLoaded, setHeartRateLoaded] = React.useState(false);
  const autoSyncScheduledRef = React.useRef(false);
  const activeSyncTokenRef = React.useRef(0);

  const { weightUnit } = useUnits(); // viewer’s preference: 'kg' | 'lb'
  const shouldAutoHeartRateSync = autoHeartRateSync === '1';

  const runHeartRateSync = React.useCallback(
    async (opts?: { delayMs?: number; reason?: 'auto' | 'manual' }) => {
      if (!id || !canDelete) {
        setHeartRateSyncState('skipped');
        setHeartRateSyncMessage('Heart-rate sync is available only for your own workouts.');
        return;
      }

      if (!workout?.started_at || !workout?.ended_at) {
        setHeartRateSyncState('skipped');
        setHeartRateSyncMessage('Workout time range is missing, so heart-rate sync was skipped.');
        return;
      }

      const delayMs = Math.max(0, opts?.delayMs ?? 0);
      const reason = opts?.reason ?? 'manual';
      const syncToken = Date.now();
      activeSyncTokenRef.current = syncToken;

      if (delayMs > 0) {
        setHeartRateSyncState('scheduled');
        setHeartRateSyncMessage(
          `${reason === 'auto' ? 'Auto retry' : 'Retry'} in ${Math.round(
            delayMs / 1000
          )} seconds before re-checking ${HEART_RATE_PROVIDER_LABEL}.`
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }

      if (activeSyncTokenRef.current !== syncToken) {
        return;
      }

      try {
        setHeartRateSyncing(true);
        if (!(await isCurrentHealthProviderAvailable())) {
          setHeartRateLoaded(true);
          setHeartRateSyncState('skipped');
          setHeartRateSyncMessage(await getCurrentHealthProviderUnavailableMessage());
          return;
        }

        setHeartRateSyncState('syncing');
        setHeartRateSyncMessage(
          `Loading heart-rate samples from ${HEART_RATE_PROVIDER_LABEL}…`
        );

        const samples = await getCurrentHeartRateSamplesForRange({
          startDate: workout.started_at,
          endDate: workout.ended_at,
        });

        if (activeSyncTokenRef.current !== syncToken) {
          return;
        }

        setHeartRateSamples(samples);
        setHeartRateLoaded(true);
        setHeartRateSyncState('synced');
        if (samples.length === 0) {
          setHeartRateSyncMessage(
            `${HEART_RATE_PROVIDER_LABEL} returned no samples for this workout yet. Retry after a short delay.`
          );
        } else {
          setHeartRateSyncMessage(
            `Loaded ${samples.length} heart-rate samples from ${HEART_RATE_PROVIDER_LABEL}.`
          );
        }
      } catch (error: any) {
        const message = formatCurrentHealthError(error);
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

        console.warn('[StrengthSummary] health provider load failed', message);
        setHeartRateSyncState('failed');
        setHeartRateSyncMessage(message);
      } finally {
        setHeartRateSyncing(false);
      }
    },
    [canDelete, id, workout?.ended_at, workout?.started_at]
  );

  React.useEffect(() => {
    if (!id) return;

    (async () => {
      try {
        setLoading(true);

        const meRes = await supabase.auth.getUser();
        const meId = meRes.data.user?.id ?? null;

        const enrichSummariesWithExerciseNames = async (summaries: ExerciseSummaryRow[]) => {
          if (summaries.length === 0) return summaries;

          const uniqueIds = Array.from(new Set(summaries.map((row) => row.exercise_id)));
          const { data: exRows, error: exError } = await supabase
            .from('exercises')
            .select('id, exercise_name')
            .in('id', uniqueIds);

          if (exError) {
            console.error('Error loading exercises', exError);
            return summaries;
          }

          const nameById: Record<string, string | null> = {};
          exRows?.forEach((er: any) => {
            nameById[String(er.id)] = er.exercise_name ?? null;
          });

          return summaries.map((row) => ({
            ...row,
            exercise_name: nameById[row.exercise_id] ?? row.exercise_name ?? null,
          }));
        };

        // 1) Try direct table reads first (owner path)
        const directWorkout = await supabase
          .schema('strength')
          .from('strength_workouts')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (!directWorkout.error && directWorkout.data) {
          const [summaryRes, setsRes] = await Promise.all([
            supabase
              .schema('strength')
              .from('exercise_summary')
              .select('exercise_id, vol, strongest_set, best_est_1rm, avg_set')
              .eq('strength_workout_id', id),
            supabase
              .schema('strength')
              .from('strength_sets')
              .select('*')
              .eq('strength_workout_id', id)
              .order('exercise_id', { ascending: true })
              .order('set_index', { ascending: true }),
          ]);

          const summaries = ((summaryRes.data ?? []) as ExerciseSummaryRow[]).map((row) => ({
            ...row,
            exercise_id: String(row.exercise_id),
          }));
          const enrichedSummaries = await enrichSummariesWithExerciseNames(summaries);

          const grouped: Record<string, any[]> = {};
          (setsRes.data ?? []).forEach((st: any) => {
            const exerciseId = String(st.exercise_id ?? '');
            if (!exerciseId) return;
            if (!grouped[exerciseId]) grouped[exerciseId] = [];
            grouped[exerciseId].push(st);
          });

          setWorkout(directWorkout.data);
          setExercises(enrichedSummaries);
          setSetsByExercise(grouped);
          const isOwnWorkout =
            !!meId && String((directWorkout.data as any).user_id ?? '') === meId;
          setCanDelete(isOwnWorkout);
          if (isOwnWorkout && (directWorkout.data as any).ended_at) {
            try {
              setGoalResult(
                await syncAndFetchMyDailyGoalResult(
                  toLocalISODate(new Date((directWorkout.data as any).ended_at))
                )
              );
            } catch (goalError) {
              console.warn('[StrengthSummary] goal refresh failed', goalError);
            }
          }
          return;
        }

        // 2) Fallback for accepted followers: security-definer RPC with social visibility check
        let rpc = await supabase.rpc('get_strength_workout_summary_user', {
          p_workout_id: id,
          p_post_id: postId ?? null,
        });
        if (
          rpc.error &&
          (String(rpc.error?.code ?? '') === 'PGRST202' || String(rpc.error?.message ?? '').includes('get_strength_workout_summary_user'))
        ) {
          // Backward compatibility with older backend signature (single argument).
          rpc = await supabase.rpc('get_strength_workout_summary_user', {
            p_workout_id: id,
          });
        }
        if (rpc.error) {
          throw rpc.error;
        }

        const row = Array.isArray(rpc.data) ? rpc.data[0] : rpc.data;
        if (!row) throw new Error('Workout not found');

        const workoutRow = (row as any).workout ?? null;
        const summaryRows = (Array.isArray((row as any).exercise_summary) ? (row as any).exercise_summary : []).map(
          (s: any) => ({
            exercise_id: String(s?.exercise_id ?? ''),
            exercise_name: s?.exercise_name ?? null,
            vol: s?.vol == null ? null : Number(s.vol),
            strongest_set: s?.strongest_set == null ? null : Number(s.strongest_set),
            best_est_1rm: s?.best_est_1rm == null ? null : Number(s.best_est_1rm),
            avg_set: s?.avg_set == null ? null : Number(s.avg_set),
          })
        ) as ExerciseSummaryRow[];
        const enrichedSummaries = await enrichSummariesWithExerciseNames(summaryRows);

        const grouped: Record<string, any[]> = {};
        (Array.isArray((row as any).sets) ? (row as any).sets : []).forEach((st: any) => {
          const exerciseId = String(st?.exercise_id ?? '');
          if (!exerciseId) return;
          if (!grouped[exerciseId]) grouped[exerciseId] = [];
          grouped[exerciseId].push(st);
        });

        setWorkout(workoutRow);
        setExercises(enrichedSummaries);
        setSetsByExercise(grouped);
        const isOwnWorkout = Boolean((row as any).can_delete);
        setCanDelete(isOwnWorkout);
        if (isOwnWorkout && workoutRow?.ended_at) {
          try {
            setGoalResult(
              await syncAndFetchMyDailyGoalResult(
                toLocalISODate(new Date(workoutRow.ended_at))
              )
            );
          } catch (goalError) {
            console.warn('[StrengthSummary] goal refresh failed', goalError);
          }
        }
      } catch (err) {
        console.error('Error loading strength summary', err);
        Alert.alert('Error', 'Could not load strength workout summary.');
      } finally {
        setLoading(false);
      }
    })();
  }, [id, postId]);

  React.useEffect(() => {
    autoSyncScheduledRef.current = false;
    activeSyncTokenRef.current = 0;
    setHeartRateSamples([]);
    setHeartRateLoaded(false);
    setHeartRateSyncState('idle');
    setHeartRateSyncMessage(null);
    setHeartRateSyncing(false);
  }, [id]);

  React.useEffect(() => {
    if (!id || !canDelete || !workout?.started_at || !workout?.ended_at) return;
    if (heartRateLoaded) return;
    if (heartRateSyncing) return;

    void runHeartRateSync({ reason: 'manual' });
  }, [
    canDelete,
    heartRateLoaded,
    heartRateSyncing,
    id,
    runHeartRateSync,
    workout?.ended_at,
    workout?.started_at,
  ]);

  React.useEffect(() => {
    if (!shouldAutoHeartRateSync) return;
    if (!id || !canDelete || !workout?.started_at || !workout?.ended_at) return;
    if (!heartRateLoaded) return;
    if (heartRateSamples.length > 0) return;
    if (heartRateSyncState !== 'synced') return;
    if (heartRateSyncing) return;
    if (autoSyncScheduledRef.current) return;

    autoSyncScheduledRef.current = true;
    void runHeartRateSync({
      delayMs: HEART_RATE_AUTO_RETRY_DELAY_MS,
      reason: 'auto',
    });
  }, [
    canDelete,
    heartRateLoaded,
    heartRateSamples.length,
    heartRateSyncState,
    heartRateSyncing,
    id,
    shouldAutoHeartRateSync,
    runHeartRateSync,
    workout?.ended_at,
    workout?.started_at,
  ]);

  // ---------- DELETE WORKOUT & RELATED DATA ----------
  const handleDeleteWorkout = () => {
    if (!canDelete) return;
    if (!id) return;

    Alert.alert(
      'Delete workout?',
      'This will permanently delete this workout and all its sets and exercise summaries. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Stats are now maintained by DB triggers on strength.strength_workouts.
              // ---- 1) Delete sets ----
              const { data: deletedSets, error: setsError } = await supabase
                .schema('strength')
                .from('strength_sets')
                .delete()
                .eq('strength_workout_id', id)
                .select('id');
              if (setsError) throw setsError;

              console.log('Deleted strength_sets rows:', deletedSets?.length ?? 0);

              // ---- 2) Delete exercise summaries ----
              const { data: deletedSummaries, error: summaryError } = await supabase
                .schema('strength')
                .from('exercise_summary')
                .delete()
                .eq('strength_workout_id', id)
                .select('id');
              if (summaryError) throw summaryError;

              console.log('Deleted exercise_summary rows:', deletedSummaries?.length ?? 0);

              // ---- 3) Delete workout header (trigger reverts stats if completed) ----
              const { data: deletedWorkouts, error: workoutError } = await supabase
                .schema('strength')
                .from('strength_workouts')
                .delete()
                .eq('id', id)
                .select('id');
              if (workoutError) throw workoutError;

              console.log('Deleted strength_workouts rows:', deletedWorkouts?.length ?? 0);

              Alert.alert('Workout deleted');
              router.replace('../../../home');
            } catch (err) {
              console.error('Error deleting workout', err);
              Alert.alert(
                'Error',
                'Could not delete workout. Check console logs for details.'
              );
            }
          }

        },
      ]
    );
  };

  const heartRateSummary = React.useMemo(() => {
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

    const avgBpm = sumBpm / heartRateSamples.length;
    return {
      avgBpm: Math.round(avgBpm * 10) / 10,
      minBpm: Math.round(minBpm),
      maxBpm: Math.round(maxBpm),
      sampleCount: heartRateSamples.length,
    };
  }, [heartRateSamples]);

  const heartRateChartPoints = React.useMemo<SamplePoint[]>(() => {
    return buildHeartRateTimelinePoints({
      samples: heartRateSamples,
      workoutStartISO: workout?.started_at ?? null,
      workoutEndISO: workout?.ended_at ?? null,
    });
  }, [heartRateSamples, workout?.ended_at, workout?.started_at]);

  const heartRateSourceLabel = React.useMemo(() => {
    if (heartRateSamples.length === 0) return null;
    const first = heartRateSamples[0];
    return first.sourceName ?? first.deviceName ?? HEART_RATE_PROVIDER_LABEL;
  }, [heartRateSamples]);

  if (loading) {
    return (
      <View style={globalStyles.page}>
        <View style={styles.loading}>
          <ActivityIndicator size="small" color={colors.highlight1} />
          <Text style={styles.loadingText}>Loading workout summary…</Text>
        </View>
      </View>
    );
  }

  // ----- Compute duration -----
  const start = workout?.started_at ? new Date(workout.started_at) : null;
  const end = workout?.ended_at ? new Date(workout.ended_at) : null;

  let durationStr = '';
  let durationSeconds = 0;
  if (start && end) {
    const ms = end.getTime() - start.getTime();
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    durationStr = `${mins}m ${secs}s`;
    durationSeconds = Math.max(0, Math.round(ms / 1000));
  }

  const dateStr = end
    ? end.toLocaleDateString(undefined, {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

  const totalSets = Object.values(setsByExercise).reduce((sum, rows) => sum + rows.length, 0);

  const handleReturnHome = async () => {
    if (sharing) return;
    if (!canDelete) {
      router.back();
      return;
    }
    if (!id) {
      router.replace('/');
      return;
    }

    if (!shareToFeed) {
      router.replace('/');
      return;
    }

    try {
      setSharing(true);
      await shareStrengthWorkoutToFeed({
        workoutId: id,
        totalVolumeKg: Number(workout?.total_vol ?? 0),
        totalSets,
        exerciseCount: exercises.length,
        durationS: durationSeconds,
        visibility: 'followers',
      });
      Alert.alert('Shared', 'Workout saved and posted to your social feed.');
      router.replace('/');
    } catch (err) {
      console.error('[StrengthSummary] share failed', err);
      Alert.alert(
        'Share failed',
        `Workout was saved, but posting to feed failed.\n\n${formatShareErr(err)}\n\nTap "Share + Return Home" to retry.`
      );
    } finally {
      setSharing(false);
    }
  };

  return (
    <View style={globalStyles.page}>
      <View style={[globalStyles.container, styles.container]}>
        <LogoHeader />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={[globalStyles.panel, styles.heroCard]}>
            <View style={styles.heroHeaderRow}>
              <View style={styles.heroCopy}>
                <Text style={globalStyles.eyebrow}>Session complete</Text>
                <Text style={styles.title}>Strength summary</Text>
                <Text style={styles.heroSubtitle}>
                  Your workout has been saved. Review the session, heart-rate data,
                  and per-exercise output below.
                </Text>
              </View>

              <View style={styles.livePill}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>Saved</Text>
              </View>
            </View>

            <View style={styles.heroMetaRow}>
              <View style={styles.heroMetaBlock}>
                <Text style={styles.heroMetaLabel}>Finished</Text>
                <Text style={styles.heroMetaValue}>{dateStr || 'Today'}</Text>
              </View>

              <View style={styles.heroMetaBlock}>
                <Text style={styles.heroMetaLabel}>Duration</Text>
                <Text style={styles.heroMetaValue}>{durationStr || '-'}</Text>
              </View>
            </View>

            <View style={styles.heroStatsRow}>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>
                  {formatFromKg(workout?.total_vol, weightUnit)}
                </Text>
                <Text style={styles.heroStatLabel}>total volume</Text>
              </View>

              <View style={[styles.heroStat, styles.heroStatAccent]}>
                <Text style={styles.heroStatValue}>{totalSets}</Text>
                <Text style={styles.heroStatLabel}>sets logged</Text>
              </View>

              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>{exercises.length}</Text>
                <Text style={styles.heroStatLabel}>exercises</Text>
              </View>
            </View>
          </View>

          {canDelete && workout?.ended_at ? (
            <View style={[globalStyles.panelSoft, styles.heartRateCard]}>
              <View style={styles.heartRateHeaderRow}>
                <View>
                  <Text style={globalStyles.eyebrow}>Recovery signal</Text>
                  <Text style={styles.heartRateTitle}>Heart rate</Text>
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

                  <MetricLineChart
                    title={`Session Timeline${heartRateSourceLabel ? ` · ${heartRateSourceLabel}` : ''}`}
                    color={colors.danger}
                    points={heartRateChartPoints}
                    cardBg={colors.cardDark}
                    textColor={colors.text}
                    height={180}
                    yClampMin={40}
                    yClampMax={220}
                    noOfSections={4}
                    showGrid
                    valueFormatter={(v) => `${Math.round(v)}`}
                    xLabelFormatter={formatTimelineLabel}
                    yAxisSuffix=" bpm"
                    unitSuffix="bpm"
                  />
                </>
              ) : (
                <Text style={styles.heartRateEmpty}>
                  No {HEART_RATE_PROVIDER_LABEL} heart-rate samples found yet for this workout
                  window. Data can appear with a short delay after completion.
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

          {goalResult && isGoalCategoryClosed(goalResult, 'strength') ? (
            <View style={styles.goalCardWrap}>
              <GoalAchievementCard
                title="Strength goal complete"
                description="This workout completed your strength goal for today."
              />
            </View>
          ) : null}

          {/* ---- Per Exercise Summary ---- */}
          {exercises.length === 0 && (
            <View style={[globalStyles.panelSoft, styles.emptyCard]}>
              <Text style={styles.emptyText}>No exercises logged for this workout.</Text>
            </View>
          )}

          {exercises.map((ex, i) => (
            <View key={ex.exercise_id ?? i} style={[globalStyles.panelSoft, styles.card]}>
              <View style={styles.exerciseHeaderRow}>
                <Text style={styles.exerciseName}>{ex.exercise_name ?? 'Exercise'}</Text>
                <View style={styles.exercisePill}>
                  <Text style={styles.exercisePillText}>
                    {setsByExercise[ex.exercise_id]?.length ?? 0} sets
                  </Text>
                </View>
              </View>

              <View style={styles.detailsGrid}>
                <View style={styles.detailCard}>
                  <Text style={styles.detailLabel}>Volume</Text>
                  <Text style={styles.detailValue}>{formatFromKg(ex.vol, weightUnit)}</Text>
                </View>
                <View style={styles.detailCard}>
                  <Text style={styles.detailLabel}>Strongest set</Text>
                  <Text style={styles.detailValue}>
                    {formatFromKg(ex.strongest_set, weightUnit)}
                  </Text>
                </View>
                <View style={styles.detailCard}>
                  <Text style={styles.detailLabel}>Best est. 1RM</Text>
                  <Text style={styles.detailValue}>
                    {formatFromKg(ex.best_est_1rm, weightUnit)}
                  </Text>
                </View>
                <View style={styles.detailCard}>
                  <Text style={styles.detailLabel}>Avg set weight</Text>
                  <Text style={styles.detailValue}>
                    {formatFromKg(ex.avg_set, weightUnit)}
                  </Text>
                </View>
              </View>

              <View style={styles.table}>
                <View style={[styles.row, styles.tableHeader]}>
                  <Text style={[styles.col, styles.hCol]}>Set</Text>
                  <Text style={[styles.col, styles.hCol]}>Type</Text>
                  <Text style={[styles.col, styles.hCol]}>Weight</Text>
                  <Text style={[styles.col, styles.hCol]}>Reps</Text>
                  <Text style={[styles.col, styles.hCol]}>RPE</Text>
                  <Text style={[styles.col, styles.hCol]}>1RM</Text>
                </View>

                {setsByExercise[ex.exercise_id]?.map((s: any, idx: number) => (
                  <View key={idx} style={styles.row}>
                    <Text style={styles.col}>{s.set_index}</Text>
                    <Text style={styles.col}>{s.set_type}</Text>
                    <Text style={styles.col}>
                      {formatSetWeight(s.weight, s.weight_unit_csv, weightUnit)}
                    </Text>
                    <Text style={styles.col}>{s.reps ?? '-'}</Text>
                    <Text style={styles.col}>{s.rpe ?? '-'}</Text>
                    <Text style={styles.col}>{formatFromKg(s.est_1rm, weightUnit)}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))}

          {canDelete ? (
            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.shareCard}
              onPress={() => setShareToFeed((v) => !v)}
              disabled={sharing}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.shareTitle}>Share to social feed</Text>
                <Text style={styles.shareSubtitle}>
                  {shareToFeed ? 'Followers will see this workout.' : 'Keep this workout private.'}
                </Text>
              </View>
              <Ionicons
                name={shareToFeed ? 'checkmark-circle' : 'ellipse-outline'}
                size={24}
                color={shareToFeed ? colors.highlight1 : colors.textMuted}
              />
            </TouchableOpacity>
          ) : null}

          {canDelete ? (
            <TouchableOpacity
              activeOpacity={0.92}
              style={styles.deleteBtn}
              onPress={handleDeleteWorkout}
            >
              <Text style={styles.deleteBtnText}>Delete Workout</Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            activeOpacity={0.92}
            style={[
              shareToFeed && canDelete ? globalStyles.buttonPrimary : globalStyles.buttonSecondary,
              styles.homeBtn,
              sharing ? { opacity: 0.7 } : null,
            ]}
            onPress={handleReturnHome}
            disabled={sharing}
          >
            <Text
              style={
                shareToFeed && canDelete
                  ? globalStyles.buttonTextPrimary
                  : globalStyles.buttonTextSecondary
              }
            >
              {sharing ? 'Posting…' : !canDelete ? 'Back' : shareToFeed ? 'Share + Return Home' : 'Return Home'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </View>
  );
}

function createStyles(
  colors: ReturnType<typeof useAppTheme>['colors'],
  fonts: ReturnType<typeof useAppTheme>['fonts']
) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: 72,
    },
    loading: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
    },
    loadingText: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 14,
      lineHeight: 20,
    },
    heroCard: {
      marginTop: 10,
      marginBottom: 18,
      paddingBottom: 18,
    },
    heroHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 12,
    },
    heroCopy: {
      flex: 1,
    },
    title: {
      marginTop: 8,
      color: colors.text,
      fontFamily: fonts.display,
      fontSize: 32,
      lineHeight: 36,
      letterSpacing: -0.9,
    },
    heroSubtitle: {
      marginTop: 10,
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 14,
      lineHeight: 20,
      maxWidth: 290,
    },
    livePill: {
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: colors.accentSoft,
      borderWidth: 1,
      borderColor: colors.glowPrimary,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    liveDot: {
      width: 8,
      height: 8,
      borderRadius: 999,
      backgroundColor: colors.highlight1,
    },
    liveText: {
      color: colors.highlight1,
      fontFamily: fonts.label,
      fontSize: 11,
      lineHeight: 14,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    heroMetaRow: {
      marginTop: 22,
      flexDirection: 'row',
      gap: 16,
    },
    heroMetaBlock: {
      flex: 1,
    },
    heroMetaLabel: {
      color: colors.textOffSt,
      fontFamily: fonts.label,
      fontSize: 11,
      lineHeight: 14,
      letterSpacing: 0.7,
      textTransform: 'uppercase',
    },
    heroMetaValue: {
      marginTop: 6,
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 15,
      lineHeight: 19,
    },
    heroStatsRow: {
      marginTop: 18,
      flexDirection: 'row',
      gap: 10,
    },
    heroStat: {
      flex: 1,
      minHeight: 94,
      borderRadius: 18,
      backgroundColor: colors.card2,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 14,
      paddingHorizontal: 12,
      justifyContent: 'space-between',
    },
    heroStatAccent: {
      backgroundColor: colors.card3,
    },
    heroStatValue: {
      color: colors.text,
      fontFamily: fonts.display,
      fontSize: 20,
      lineHeight: 24,
      letterSpacing: -0.6,
    },
    heroStatLabel: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 11,
      lineHeight: 15,
      textTransform: 'uppercase',
    },
    goalCardWrap: {
      marginBottom: 18,
    },
    heartRateCard: {
      marginBottom: 18,
      padding: 16,
    },
    heartRateHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
      gap: 12,
    },
    heartRateTitle: {
      marginTop: 8,
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 24,
      lineHeight: 28,
      letterSpacing: -0.6,
    },
    heartRateAvgLabel: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 14,
      lineHeight: 18,
    },
    heartRateAvgValue: {
      color: colors.danger,
      fontFamily: fonts.display,
      fontSize: 38,
      lineHeight: 42,
      letterSpacing: -1,
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
      paddingHorizontal: 10,
    },
    heartRateStatLabel: {
      color: colors.textOffSt,
      fontFamily: fonts.label,
      fontSize: 11,
      lineHeight: 14,
      letterSpacing: 0.5,
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
      lineHeight: 19,
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
      marginTop: 12,
    },
    heartRateActionBtn: {
      flex: 1,
      minHeight: 46,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card2,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 10,
    },
    heartRateActionBtnPrimary: {
      backgroundColor: colors.highlight1,
      borderColor: colors.highlight1,
    },
    heartRateActionBtnText: {
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 12,
      lineHeight: 16,
      textAlign: 'center',
    },
    heartRateActionBtnPrimaryText: {
      color: colors.blkText,
      fontFamily: fonts.heading,
      fontSize: 12,
      lineHeight: 16,
      textAlign: 'center',
    },
    heartRateActionBtnDisabled: {
      opacity: 0.65,
    },
    emptyCard: {
      marginBottom: 18,
      alignItems: 'center',
      paddingVertical: 24,
    },
    emptyText: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 14,
      lineHeight: 20,
    },
    card: {
      padding: 16,
      marginBottom: 18,
    },
    exerciseHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      marginBottom: 14,
    },
    exerciseName: {
      flex: 1,
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 20,
      lineHeight: 24,
      letterSpacing: -0.4,
    },
    exercisePill: {
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 6,
      backgroundColor: colors.accentSoft,
      borderWidth: 1,
      borderColor: colors.glowPrimary,
    },
    exercisePillText: {
      color: colors.highlight1,
      fontFamily: fonts.label,
      fontSize: 11,
      lineHeight: 14,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    detailsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginBottom: 10,
    },
    detailCard: {
      width: '48%',
      borderRadius: 14,
      backgroundColor: colors.card3,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 12,
      paddingHorizontal: 12,
    },
    detailLabel: {
      color: colors.textOffSt,
      fontFamily: fonts.label,
      fontSize: 11,
      lineHeight: 14,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    detailValue: {
      marginTop: 6,
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 14,
      lineHeight: 18,
    },
    table: {
      marginTop: 6,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    tableHeader: {
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingBottom: 6,
      marginBottom: 4,
    },
    row: {
      flexDirection: 'row',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    col: {
      flex: 1,
      color: colors.text,
      fontFamily: fonts.body,
      fontSize: 11,
      lineHeight: 15,
      textAlign: 'center',
    },
    hCol: {
      fontFamily: fonts.label,
      color: colors.highlight1,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    shareCard: {
      borderRadius: 18,
      backgroundColor: colors.card2,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 16,
      paddingVertical: 14,
      marginBottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    shareTitle: {
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 14,
      lineHeight: 18,
    },
    shareSubtitle: {
      marginTop: 4,
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 17,
    },
    deleteBtn: {
      minHeight: 50,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.danger,
      backgroundColor: colors.accentSecondarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 8,
    },
    deleteBtnText: {
      color: colors.danger,
      fontFamily: fonts.heading,
      fontSize: 14,
      lineHeight: 18,
      textAlign: 'center',
    },
    homeBtn: {
      marginTop: 12,
    },
  });
}
