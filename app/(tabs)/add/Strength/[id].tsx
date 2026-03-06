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
import { Colors } from '@/constants/Colors';
import LogoHeader from '@/components/my components/logoHeader';
import { supabase } from '@/lib/supabase';
import { useUnits } from '@/contexts/UnitsContext';
import { LinearGradient } from 'expo-linear-gradient';
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
  formatAppleHealthError,
  getAppleHealthUnavailableMessage,
  getAppleHeartRateSamplesForRange,
  isAppleHealthKitAvailable,
  type AppleHeartRateSample,
} from '@/lib/health/appleHealthKit';
import { buildHeartRateTimelinePoints } from '@/lib/health/heartRateTimeline';

const BG = Colors.dark.background;
const PRIMARY = Colors.dark.highlight1;
const HEART_RATE_AUTO_RETRY_DELAY_MS = 45_000;
const HEART_RATE_MANUAL_DELAY_MS = 20_000;

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
  const [heartRateSamples, setHeartRateSamples] = React.useState<AppleHeartRateSample[]>([]);
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
          )} seconds before re-checking Apple Health.`
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }

      if (activeSyncTokenRef.current !== syncToken) {
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
            'Apple Health returned no samples for this workout yet. Retry after a short delay.'
          );
        } else {
          setHeartRateSyncMessage(
            `Loaded ${samples.length} heart-rate samples from Apple Health.`
          );
        }
      } catch (error: any) {
        console.warn('[StrengthSummary] Apple Health load failed', error);
        setHeartRateLoaded(true);
        setHeartRateSyncState('failed');
        setHeartRateSyncMessage(formatAppleHealthError(error));
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
    return first.sourceName ?? first.deviceName ?? 'Apple Health';
  }, [heartRateSamples]);

  if (loading) {
    return (
      <View style={styles.loading}>
        <Text style={{ color: '#fff' }}>Loading...</Text>
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
    <LinearGradient
      colors={['#3a3a3bff', '#1e1e1eff', BG]}
      start={{ x: 0.2, y: 0 }}
      end={{ x: 0.8, y: 1 }}
      style={{ flex: 1 }}
    > 
      <View style={styles.container}>
        <LogoHeader />

        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
          {/* --- Workout Header --- */}
          <Text style={styles.headerDate}>{dateStr}</Text>
          <Text style={styles.headerDuration}>Duration: {durationStr}</Text>

          <Text style={styles.title}>Workout Summary</Text>

          <Text style={styles.totalVol}>
            Total Volume: {formatFromKg(workout?.total_vol, weightUnit)}
          </Text>

          {canDelete && workout?.ended_at ? (
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

                  <MetricLineChart
                    title={`Session Timeline${heartRateSourceLabel ? ` · ${heartRateSourceLabel}` : ''}`}
                    color="#FF4D4F"
                    points={heartRateChartPoints}
                    cardBg="rgba(5, 8, 22, 0.45)"
                    textColor="#EAF2FF"
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
                  No Apple Health heart-rate samples found yet for this workout window. Data can
                  appear with a short delay after completion.
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
            <Text style={{ color: '#9aa4bf', marginTop: 8 }}>
              No exercises logged for this workout.
            </Text>
          )}

          {exercises.map((ex, i) => (
            <View key={ex.exercise_id ?? i} style={styles.card}>
              <Text style={styles.exerciseName}>
                {ex.exercise_name ?? 'Exercise'}
              </Text>

              <Text style={styles.detail}>
                Volume: {formatFromKg(ex.vol, weightUnit)}
              </Text>
              <Text style={styles.detail}>
                Strongest Set: {formatFromKg(ex.strongest_set, weightUnit)}
              </Text>
              <Text style={styles.detail}>
                Best Est 1RM: {formatFromKg(ex.best_est_1rm, weightUnit)}
              </Text>
              <Text style={styles.detail}>
                Avg Set Weight: {formatFromKg(ex.avg_set, weightUnit)}
              </Text>

              {/* ---- Table of Sets ---- */}
              <View style={styles.table}>
                {/* Header */}
                <View style={[styles.row, styles.tableHeader]}>
                  <Text style={[styles.col, styles.hCol]}>Set</Text>
                  <Text style={[styles.col, styles.hCol]}>Type</Text>
                  <Text style={[styles.col, styles.hCol]}>Weight</Text>
                  <Text style={[styles.col, styles.hCol]}>Reps</Text>
                  <Text style={[styles.col, styles.hCol]}>RPE</Text>
                  <Text style={[styles.col, styles.hCol]}>1RM</Text>
                </View>

                {/* Rows */}
                {setsByExercise[ex.exercise_id]?.map((s: any, idx: number) => (
                  <View key={idx} style={styles.row}>
                    <Text style={styles.col}>{s.set_index}</Text>
                    <Text style={styles.col}>{s.set_type}</Text>
                    <Text style={styles.col}>
                      {formatSetWeight(
                        s.weight,
                        s.weight_unit_csv,
                        weightUnit
                      )}
                    </Text>
                    <Text style={styles.col}>{s.reps ?? '-'}</Text>
                    <Text style={styles.col}>{s.rpe ?? '-'}</Text>
                    <Text style={styles.col}>
                      {formatFromKg(s.est_1rm, weightUnit)}
                    </Text>
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
                color={shareToFeed ? Colors.dark.highlight1 : Colors.dark.text}
              />
            </TouchableOpacity>
          ) : null}

          {/* DELETE + HOME BUTTONS */}
          {canDelete ? (
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={handleDeleteWorkout}
            >
              <Text style={styles.deleteBtnText}>Delete Workout</Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={[styles.homeBtn, sharing ? { opacity: 0.7 } : null]}
            onPress={handleReturnHome}
            disabled={sharing}
          >
            <Text style={styles.homeBtnText}>
              {sharing ? 'Posting…' : !canDelete ? 'Back' : shareToFeed ? 'Share + Return Home' : 'Return Home'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* --- Header --- */
  headerDate: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  headerDuration: {
    color: Colors.dark.highlight1,
    fontSize: 14,
    marginBottom: 16,
  },

  title: {
    color: '#e7ecff',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 12,
  },
  totalVol: {
    color: Colors.dark.highlight1,
    fontSize: 16,
    marginBottom: 20,
  },
  goalCardWrap: {
    marginBottom: 18,
  },
  heartRateCard: {
    borderRadius: 16,
    backgroundColor: Colors.dark.card,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 18,
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

  shareCard: {
    borderRadius: 14,
    backgroundColor: Colors.dark.card,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  shareTitle: {
    color: '#fff',
    fontSize: 13.5,
    fontWeight: '800',
  },
  shareSubtitle: {
    marginTop: 4,
    color: '#9aa4bf',
    fontSize: 12,
    lineHeight: 16,
  },

  card: {
    backgroundColor: Colors.dark.card,
    padding: 16,
    borderRadius: 14,
    marginBottom: 20,
  },
  exerciseName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  detail: {
    color: Colors.dark.text,
    marginBottom: 4,
  },

  /* --- Table --- */
  table: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1f2946',
  },
  tableHeader: {
    borderBottomWidth: 1,
    borderBottomColor: '#1f2946',
    paddingBottom: 6,
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#1a233a',
  },
  col: {
    flex: 1,
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
  },
  hCol: {
    fontWeight: '700',
    color: Colors.dark.highlight1,
  },

  deleteBtn: {
    borderColor: '#FF4D4F',
    borderWidth: 1,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 10,
  },
  deleteBtnText: {
    color: '#FF4D4F',
    fontWeight: '700',
    textAlign: 'center',
  },

  homeBtn: {
    borderColor: Colors.dark.highlight1,
    borderWidth: 1,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 12,
  },
  homeBtnText: {
    color: Colors.dark.highlight1,
    fontWeight: '700',
    textAlign: 'center',
  },
});
