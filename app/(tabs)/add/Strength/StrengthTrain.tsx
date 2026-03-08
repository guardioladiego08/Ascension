import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { v4 as uuidv4 } from 'uuid';
import { LinearGradient } from 'expo-linear-gradient';

import { supabase } from '@/lib/supabase';
import LogoHeader from '@/components/my components/logoHeader';
import { useUnits } from '@/contexts/UnitsContext';
import type { ExerciseDraft, UnitMass } from '@/lib/strength/types';
import { useActiveRunWalk } from '@/providers/ActiveRunWalkProvider';
import { useAppTheme } from '@/providers/AppThemeProvider';

import SessionHeader from './components/SessionHeader';
import ExerciseCard from './components/ExerciseCard';
import ExercisePickerModal from './components/ExercisePickerModal';
import CancelConfirmModal from './components/CancelConfirmModal';
import FinishConfirmModal from './components/FinishConfirmModal';
import ExerciseRequiredModal from './components/ExerciseRequiredModal';

const TITLE = 'Strength Training Session';

const toKg = (w: number | null | undefined, unit: UnitMass) =>
  w == null ? 0 : unit === 'kg' ? w : w * 0.45359237;

async function ensureAuthedUserId(): Promise<string> {
  const { error: refreshErr } = await supabase.auth.refreshSession();
  if (refreshErr) {
    console.warn('[StrengthTrain] refreshSession failed', refreshErr);
  }

  const { data, error: sessErr } = await supabase.auth.getSession();
  if (sessErr) throw sessErr;

  const uid = data.session?.user?.id;
  if (!uid) {
    throw new Error('Session expired. Please sign in again.');
  }
  return uid;
}

type StrengthWorkoutRow = {
  id: string;
  user_id: string | null;
  started_at: string | null;
  ended_at: string | null;
};

async function getStrengthWorkoutRow(workoutId: string) {
  const { data, error } = await supabase
    .schema('strength')
    .from('strength_workouts')
    .select('id,user_id,started_at,ended_at')
    .eq('id', workoutId)
    .maybeSingle<StrengthWorkoutRow>();

  if (error) throw error;
  return data;
}

async function createStrengthWorkoutRow(params: {
  userId: string;
  startedAtISO?: string | null;
}) {
  const payload: { user_id: string; started_at?: string } = {
    user_id: params.userId,
  };

  if (params.startedAtISO) {
    payload.started_at = params.startedAtISO;
  }

  const { data, error } = await supabase
    .schema('strength')
    .from('strength_workouts')
    .insert(payload)
    .select('id, user_id, started_at, ended_at')
    .single<StrengthWorkoutRow>();

  if (error) throw error;
  return data;
}

export default function StrengthTrain() {
  const { colors, fonts, globalStyles } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);
  const { weightUnit } = useUnits();
  const {
    activeSession,
    hydrated: activeSessionHydrated,
    setSession: setActiveSession,
    clearSession: clearActiveSession,
  } = useActiveRunWalk();
  const [workoutId, setWorkoutId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [startedAtISO, setStartedAtISO] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [exercises, setExercises] = useState<ExerciseDraft[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [paused, setPaused] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [finishModalOpen, setFinishModalOpen] = useState(false);
  const [exerciseRequiredOpen, setExerciseRequiredOpen] = useState(false);
  const hydrationAppliedRef = useRef(false);
  const sessionPersistEnabledRef = useRef(true);

  useEffect(() => {
    const id = setInterval(() => {
      if (!paused) setSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(id);
  }, [paused]);

  useEffect(() => {
    if (!activeSessionHydrated || hydrationAppliedRef.current) return;

    let mounted = true;

    (async () => {
      try {
        hydrationAppliedRef.current = true;

        if (activeSession && activeSession.kind !== 'strength') {
          const sessionLabel =
            activeSession.kind === 'outdoor'
              ? activeSession.mode === 'outdoor_walk'
                ? 'outdoor walk'
                : 'outdoor run'
              : activeSession.mode === 'indoor_walk'
                ? 'indoor walk'
                : 'indoor run';

          Alert.alert(
            'Session in progress',
            `You already have an active ${sessionLabel} session. Finish or cancel it before starting a strength workout.`
          );
          router.back();
          return;
        }

        if (activeSession?.kind === 'strength') {
          const resumedWorkout = await getStrengthWorkoutRow(activeSession.workoutId);
          if (!mounted) return;

          if (
            resumedWorkout &&
            resumedWorkout.user_id === activeSession.userId &&
            resumedWorkout.ended_at == null
          ) {
            console.log('[HealthDebug] resuming existing strength session', {
              workoutId: resumedWorkout.id,
              startedAtISO: resumedWorkout.started_at,
            });

            setWorkoutId(activeSession.workoutId);
            setUserId(activeSession.userId);
            setStartedAtISO(activeSession.startedAtISO ?? resumedWorkout.started_at ?? null);
            setExercises(activeSession.exercises);
            setPaused(activeSession.phase === 'paused');
            setSeconds(activeSession.seconds);
            setLoading(false);
            return;
          }

          console.warn('[HealthDebug] stale strength session found locally, creating replacement row', {
            localWorkoutId: activeSession.workoutId,
            resumedWorkout: resumedWorkout ?? null,
          });
          clearActiveSession();
        }

        const uid = await ensureAuthedUserId();
        if (!mounted) return;
        setUserId(uid);

        const data = await createStrengthWorkoutRow({ userId: uid });
        if (!mounted) return;

        setWorkoutId(data.id);
        setStartedAtISO(data.started_at ?? null);
        setLoading(false);
      } catch (err: any) {
        console.error('[StrengthTrain] start workout failed', err);
        Alert.alert(
          'Error starting workout',
          err?.message ?? 'Failed to start workout. Please sign in again.'
        );
        router.replace('/(tabs)/home');
      }
    })();

    return () => {
      mounted = false;
    };
  }, [activeSession, activeSessionHydrated, clearActiveSession]);

  useEffect(() => {
    if (!activeSessionHydrated || !workoutId || !sessionPersistEnabledRef.current) return;

    setActiveSession({
      kind: 'strength',
      title: TITLE,
      phase: paused ? 'paused' : 'running',
      workoutId,
      userId,
      startedAtISO,
      seconds,
      exercises,
    });
  }, [
    activeSessionHydrated,
    exercises,
    paused,
    seconds,
    setActiveSession,
    startedAtISO,
    userId,
    workoutId,
  ]);

  const addExercise = (ex: { id: string; exercise_name: string }) => {
    setExercises((prev) => [
      ...prev,
      {
        instanceId: uuidv4(),
        exercise_id: ex.id,
        exercise_name: ex.exercise_name,
        sets: [
          {
            tempId: uuidv4(),
            set_index: 1,
            set_type: 'normal',
            weight_unit_csv: weightUnit,
            weight: undefined,
            reps: undefined,
            rpe: undefined,
            est_1rm: undefined,
            done: false,
            notes: null,
          },
        ],
      },
    ]);
  };

  const removeExercise = (instanceId: string) => {
    setExercises((prev) => prev.filter((exercise) => exercise.instanceId !== instanceId));
  };

  const updateExercise = (
    instanceId: string,
    updater: (draft: ExerciseDraft) => ExerciseDraft
  ) => {
    setExercises((prev) =>
      prev.map((exercise) =>
        exercise.instanceId === instanceId ? updater(exercise) : exercise
      )
    );
  };

  const totalVolumeKg = useMemo(() => {
    let volume = 0;
    for (const exercise of exercises) {
      for (const setDraft of exercise.sets) {
        volume += toKg(setDraft.weight, setDraft.weight_unit_csv) * (setDraft.reps ?? 0);
      }
    }
    return volume;
  }, [exercises]);

  const handleCancel = () => {
    setPaused(true);
    setCancelModalOpen(true);
  };

  const stopPersistingStrengthSession = () => {
    sessionPersistEnabledRef.current = false;
    clearActiveSession();
  };

  const handleFinish = async () => {
    if (!workoutId) return;

    if (exercises.length === 0) {
      setFinishModalOpen(false);
      setTimeout(() => setExerciseRequiredOpen(true), 10);
      return;
    }

    setLoading(true);
    try {
      const uid = await ensureAuthedUserId();
      if (uid !== userId) setUserId(uid);

      let effectiveWorkoutId = workoutId;
      let effectiveStartedAtISO = startedAtISO;

      let wRow = await getStrengthWorkoutRow(effectiveWorkoutId);
      console.log('[HealthDebug] strength workout ownership check', {
        workoutId: effectiveWorkoutId,
        uid,
        wRow: wRow ?? null,
      });
      if (!wRow) {
        console.warn('[HealthDebug] workout row missing before save, creating replacement row', {
          workoutId: effectiveWorkoutId,
          startedAtISO: effectiveStartedAtISO,
        });

        wRow = await createStrengthWorkoutRow({
          userId: uid,
          startedAtISO: effectiveStartedAtISO,
        });

        effectiveWorkoutId = wRow.id;
        effectiveStartedAtISO = wRow.started_at ?? effectiveStartedAtISO ?? null;

        setWorkoutId(effectiveWorkoutId);
        setStartedAtISO(effectiveStartedAtISO);
      }
      if (!wRow?.user_id || wRow.user_id !== uid) {
        throw new Error('Workout ownership mismatch. Please sign in again.');
      }

      const setPayload = exercises.flatMap((exercise) =>
        exercise.sets.map((setDraft) => ({
          exercise_id: exercise.exercise_id,
          strength_workout_id: effectiveWorkoutId,
          set_index: setDraft.set_index,
          set_type: setDraft.set_type,
          superset_group: setDraft.superset_group ?? null,
          weight: setDraft.weight ?? null,
          weight_unit_csv: setDraft.weight_unit_csv,
          reps: setDraft.reps ?? null,
          rpe: setDraft.rpe ?? null,
          est_1rm: setDraft.est_1rm ?? null,
          notes: setDraft.notes ?? null,
        }))
      );

      if (setPayload.length > 0) {
        const { error: setsErr } = await supabase
          .schema('strength')
          .from('strength_sets')
          .insert(setPayload);

        if (setsErr) throw setsErr;
      }

      type SummaryRow = {
        exercise_id: string;
        vol: number;
        strongest_set: number;
        best_est_1rm: number;
        avg_set: number;
      };

      const summaries: SummaryRow[] = exercises.map((exercise) => {
        const weightsKg = exercise.sets.map((setDraft) =>
          toKg(setDraft.weight, setDraft.weight_unit_csv)
        );
        const reps = exercise.sets.map((setDraft) => setDraft.reps ?? 0);
        const vols = exercise.sets.map((_, i) => weightsKg[i] * reps[i]);
        const vol = vols.reduce((a, b) => a + b, 0);
        const strongest = weightsKg.reduce((a, b) => (b > a ? b : a), 0);
        const best1rm = exercise.sets.reduce(
          (a, setDraft) => Math.max(a, setDraft.est_1rm ?? 0),
          0
        );
        const weightMean =
          weightsKg.length > 0
            ? weightsKg.reduce((a, b) => a + b, 0) / weightsKg.length
            : 0;

        return {
          exercise_id: exercise.exercise_id,
          vol: +vol.toFixed(2),
          strongest_set: +strongest.toFixed(3),
          best_est_1rm: +best1rm.toFixed(3),
          avg_set: +weightMean.toFixed(3),
        };
      });

      const summaryPayload = summaries.map((summary) => ({
        user_id: uid,
        exercise_id: summary.exercise_id,
        strength_workout_id: effectiveWorkoutId,
        vol: summary.vol,
        strongest_set: summary.strongest_set,
        best_est_1rm: summary.best_est_1rm,
        avg_set: summary.avg_set,
      }));

      if (summaryPayload.length > 0) {
        const { error: sumErr } = await supabase
          .schema('strength')
          .from('exercise_summary')
          .insert(summaryPayload);

        if (sumErr) throw sumErr;
      }

      const endedAt = new Date();
      const totalVol = +totalVolumeKg.toFixed(2);

      const { error: workoutErr } = await supabase
        .schema('strength')
        .from('strength_workouts')
        .update({ ended_at: endedAt.toISOString(), total_vol: totalVol })
        .eq('id', effectiveWorkoutId);

      if (workoutErr) throw workoutErr;

      stopPersistingStrengthSession();
      router.replace(`/(tabs)/add/Strength/${effectiveWorkoutId}?autoHeartRateSync=1`);
    } catch (err: any) {
      console.error('[StrengthTrain] finish failed', err);

      if (err?.code === '42501') {
        Alert.alert(
          'Save failed',
          'Permissions error while saving sets. Your session may have expired. Please sign in again and retry.'
        );
        return;
      }

      Alert.alert('Save failed', err?.message ?? 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !workoutId) {
    return (
      <LinearGradient
        colors={[colors.gradientTop, colors.gradientMid, colors.gradientBottom]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={globalStyles.page}
      >
        <View style={styles.loadingState}>
          <ActivityIndicator size="small" color={colors.highlight1} />
          <Text style={styles.loadingText}>Preparing your session…</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={[colors.gradientTop, colors.gradientMid, colors.gradientBottom]}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={globalStyles.page}
    >
      <View style={[globalStyles.container, styles.page]}>
        <LogoHeader showBackButton />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <SessionHeader
            key={workoutId}
            title={TITLE}
            paused={paused}
            seconds={seconds}
            onPauseToggle={() => setPaused((p) => !p)}
            onCancel={handleCancel}
          />

          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={globalStyles.eyebrow}>Exercises</Text>
              <Text style={styles.sectionSubtitle}>Build the session one movement at a time.</Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.92}
              style={styles.addBtn}
              onPress={() => setPickerOpen(true)}
            >
              <Ionicons name="add" size={18} color={colors.blkText} />
            </TouchableOpacity>
          </View>

          {exercises.length === 0 ? (
            <View style={[globalStyles.panelSoft, styles.empty]}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="barbell-outline" size={20} color={colors.highlight1} />
              </View>
              <Text style={styles.emptyTitle}>No exercises added yet</Text>
              <Text style={styles.emptyText}>
                Tap the add button to start logging lifts for this session.
              </Text>
            </View>
          ) : (
            exercises.map((exercise) => (
              <ExerciseCard
                key={exercise.instanceId}
                exercise={exercise}
                onDelete={() => removeExercise(exercise.instanceId)}
                onChange={(updated) => updateExercise(exercise.instanceId, () => updated)}
              />
            ))
          )}
        </ScrollView>

        <TouchableOpacity
          activeOpacity={0.92}
          style={[globalStyles.buttonPrimary, styles.finishBtn, loading ? styles.finishBtnBusy : null]}
          disabled={loading}
          onPress={() => setFinishModalOpen(true)}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.blkText} />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={18} color={colors.blkText} />
              <Text style={globalStyles.buttonTextPrimary}>Finish workout</Text>
            </>
          )}
        </TouchableOpacity>

        <ExercisePickerModal
          visible={pickerOpen}
          onClose={() => setPickerOpen(false)}
          onPick={(exercise) => {
            addExercise(exercise);
            setPickerOpen(false);
          }}
        />

        <CancelConfirmModal
          visible={cancelModalOpen}
          onKeep={() => {
            setPaused(false);
            setCancelModalOpen(false);
          }}
          onDiscard={async () => {
            try {
              await ensureAuthedUserId();

              if (workoutId) {
                await supabase
                  .schema('strength')
                  .from('strength_workouts')
                  .delete()
                  .eq('id', workoutId);
              }
            } catch (e) {
              console.warn('[StrengthTrain] discard delete failed', e);
            }

            stopPersistingStrengthSession();
            setExercises([]);
            setStartedAtISO(null);
            setSeconds(0);
            setPaused(false);
            setCancelModalOpen(false);
            router.back();
          }}
        />

        <ExerciseRequiredModal
          visible={exerciseRequiredOpen}
          onClose={() => setExerciseRequiredOpen(false)}
        />

        <FinishConfirmModal
          visible={finishModalOpen}
          onCancel={() => setFinishModalOpen(false)}
          onConfirm={async () => {
            setFinishModalOpen(false);
            await handleFinish();
          }}
        />
      </View>
    </LinearGradient>
  );
}

function createStyles(
  colors: ReturnType<typeof useAppTheme>['colors'],
  fonts: ReturnType<typeof useAppTheme>['fonts']
) {
  return StyleSheet.create({
    page: {
      flex: 1,
    },
    loadingState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      paddingHorizontal: 24,
    },
    loadingText: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 14,
      lineHeight: 20,
    },
    scrollContent: {
      paddingBottom: 126,
    },
    sectionHeaderRow: {
      marginTop: 18,
      marginBottom: 2,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    sectionSubtitle: {
      marginTop: 6,
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 18,
    },
    addBtn: {
      width: 44,
      height: 44,
      borderRadius: 16,
      backgroundColor: colors.highlight1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    empty: {
      marginTop: 14,
      alignItems: 'center',
      paddingVertical: 28,
      paddingHorizontal: 18,
    },
    emptyIconWrap: {
      width: 48,
      height: 48,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.accentSoft,
      marginBottom: 14,
    },
    emptyTitle: {
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 18,
      lineHeight: 22,
    },
    emptyText: {
      marginTop: 8,
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 14,
      lineHeight: 20,
      textAlign: 'center',
      maxWidth: 260,
    },
    finishBtn: {
      position: 'absolute',
      left: 18,
      right: 18,
      bottom: 24,
      minHeight: 54,
      flexDirection: 'row',
      gap: 10,
    },
    finishBtnBusy: {
      opacity: 0.82,
    },
  });
}
