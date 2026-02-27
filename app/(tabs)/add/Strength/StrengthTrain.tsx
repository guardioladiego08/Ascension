// app/(tabs)/add/Strength/StrengthTrain.tsx
import React, { useEffect, useMemo, useState } from 'react';
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
import { GlobalStyles } from '@/constants/GlobalStyles';
import { LinearGradient } from 'expo-linear-gradient';

import { supabase } from '@/lib/supabase';
import LogoHeader from '@/components/my components/logoHeader';
import SessionHeader from './components/SessionHeader';
import ExerciseCard from './components/ExerciseCard';
import ExercisePickerModal from './components/ExercisePickerModal';
import CancelConfirmModal from './components/CancelConfirmModal';
import FinishConfirmModal from './components/FinishConfirmModal';
import ExerciseRequiredModal from './components/ExerciseRequiredModal';
import { Colors } from '@/constants/Colors';
import { useUnits } from '@/contexts/UnitsContext';

const BG = Colors.dark.background;
const PRIMARY = Colors.dark.highlight1;

export type UnitMass = 'kg' | 'lb';
export type SetType = 'normal' | 'warmup' | 'dropset' | 'failure';

export type SetDraft = {
  tempId: string;
  set_index: number;
  set_type: SetType;
  weight?: number | null;
  weight_unit_csv: UnitMass;
  reps?: number | null;
  rpe?: number | null;
  est_1rm?: number | null;
  superset_group?: number | null;
  done?: boolean;
  notes?: string | null;
};

export type ExerciseDraft = {
  instanceId: string; // UI-only ID for this card instance
  exercise_id: string; // FK → exercises.id
  exercise_name: string;
  sets: SetDraft[];
};

const toKg = (w: number | null | undefined, unit: UnitMass) =>
  w == null ? 0 : unit === 'kg' ? w : w * 0.45359237;

/**
 * Ensures we have a valid JWT (common failure: token expires while user is training).
 * Returns the current authenticated user id (auth.uid()).
 */
async function ensureAuthedUserId(): Promise<string> {
  // Refresh session first (handles long-running sessions / app backgrounding)
  const { error: refreshErr } = await supabase.auth.refreshSession();
  if (refreshErr) {
    // Not fatal by itself; we'll still try getSession below
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

export default function StrengthTrain() {
  const { weightUnit } = useUnits();
  const [workoutId, setWorkoutId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null); // convenience / UI state
  const [loading, setLoading] = useState(true);

  const [exercises, setExercises] = useState<ExerciseDraft[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);

  const [paused, setPaused] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [timerResetKey, setTimerResetKey] = useState(0);

  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [finishModalOpen, setFinishModalOpen] = useState(false);
  const [exerciseRequiredOpen, setExerciseRequiredOpen] = useState(false);

  useEffect(() => {
    const id = setInterval(() => {
      if (!paused) setSeconds(s => s + 1);
    }, 1000);
    return () => clearInterval(id);
  }, [paused]);

  // Start workout row on mount
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const uid = await ensureAuthedUserId();
        if (!mounted) return;
        setUserId(uid);

        const { data, error } = await supabase
          .schema('strength')
          .from('strength_workouts')
          .insert({ user_id: uid })
          .select('id')
          .single();

        if (error) throw error;
        if (!mounted) return;

        setWorkoutId(data.id);
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
  }, []);

  const addExercise = (ex: { id: string; exercise_name: string }) => {
    setExercises(prev => [
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
    setExercises(prev => prev.filter(e => e.instanceId !== instanceId));
  };

  const updateExercise = (
    instanceId: string,
    updater: (draft: ExerciseDraft) => ExerciseDraft
  ) => {
    setExercises(prev => prev.map(e => (e.instanceId === instanceId ? updater(e) : e)));
  };

  const totalVolumeKg = useMemo(() => {
    let v = 0;
    for (const ex of exercises) {
      for (const s of ex.sets) {
        v += toKg(s.weight, s.weight_unit_csv) * (s.reps ?? 0);
      }
    }
    return v;
  }, [exercises]);

  const handleCancel = () => {
    setPaused(true);
    setCancelModalOpen(true);
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
      // IMPORTANT: get a fresh uid right before any inserts (prevents RLS failures)
      const uid = await ensureAuthedUserId();
      if (uid !== userId) setUserId(uid);

      // Ownership sanity check (optional but very helpful)
      const { data: wRow, error: wCheckErr } = await supabase
        .schema('strength')
        .from('strength_workouts')
        .select('id,user_id')
        .eq('id', workoutId)
        .single();

      if (wCheckErr) throw wCheckErr;
      if (!wRow?.user_id || wRow.user_id !== uid) {
        throw new Error('Workout ownership mismatch. Please sign in again.');
      }

      // 1) Insert sets
      const setPayload = exercises.flatMap(ex =>
        ex.sets.map(s => ({
          exercise_id: ex.exercise_id,
          strength_workout_id: workoutId,
          set_index: s.set_index,
          set_type: s.set_type,
          superset_group: s.superset_group ?? null,
          weight: s.weight ?? null,
          weight_unit_csv: s.weight_unit_csv,
          reps: s.reps ?? null,
          rpe: s.rpe ?? null,
          est_1rm: s.est_1rm ?? null,
          notes: s.notes ?? null,
        }))
      );

      if (setPayload.length > 0) {
        const { error: setsErr } = await supabase
          .schema('strength')
          .from('strength_sets')
          .insert(setPayload);

        if (setsErr) throw setsErr;
      }

      // 2) Compute exercise_summary per exercise
      type SummaryRow = {
        exercise_id: string;
        vol: number;
        strongest_set: number;
        best_est_1rm: number;
        avg_set: number;
      };

      const summaries: SummaryRow[] = exercises.map(ex => {
        const weightsKg = ex.sets.map(s => toKg(s.weight, s.weight_unit_csv));
        const reps = ex.sets.map(s => s.reps ?? 0);

        const vols = ex.sets.map((_, i) => weightsKg[i] * reps[i]);
        const vol = vols.reduce((a, b) => a + b, 0);

        const strongest = weightsKg.reduce((a, b) => (b > a ? b : a), 0);
        const best1rm = ex.sets.reduce((a, s) => Math.max(a, s.est_1rm ?? 0), 0);

        const weightMean =
          weightsKg.length > 0 ? weightsKg.reduce((a, b) => a + b, 0) / weightsKg.length : 0;

        return {
          exercise_id: ex.exercise_id,
          vol: +vol.toFixed(2),
          strongest_set: +strongest.toFixed(3),
          best_est_1rm: +best1rm.toFixed(3),
          avg_set: +weightMean.toFixed(3),
        };
      });

      const summaryPayload = summaries.map(sm => ({
        user_id: uid, // use fresh uid
        exercise_id: sm.exercise_id,
        strength_workout_id: workoutId,
        vol: sm.vol,
        strongest_set: sm.strongest_set,
        best_est_1rm: sm.best_est_1rm,
        avg_set: sm.avg_set,
      }));

      if (summaryPayload.length > 0) {
        const { error: sumErr } = await supabase
          .schema('strength')
          .from('exercise_summary')
          .insert(summaryPayload);

        if (sumErr) throw sumErr;
      }

      // 3) Update workout with total volume + end time
      const endedAt = new Date();
      const totalVol = +totalVolumeKg.toFixed(2);

      const { error: wErr } = await supabase
        .schema('strength')
        .from('strength_workouts')
        .update({ ended_at: endedAt.toISOString(), total_vol: totalVol })
        .eq('id', workoutId);

      if (wErr) throw wErr;

      console.log('✅ workout saved', { workoutId });
      router.replace(`/(tabs)/add/Strength/${workoutId}`);
    } catch (err: any) {
      console.error('[StrengthTrain] finish failed', err);

      // More helpful RLS message
      const code = err?.code;
      if (code === '42501') {
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
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <LinearGradient
      colors={['#3a3a3bff', '#1e1e1eff', BG]}
      start={{ x: 0.2, y: 0 }}
      end={{ x: 0.8, y: 1 }}
      style={{ flex: 1 }}
    >
      <View style={[GlobalStyles.container, { flex: 1 }]}>
        <LogoHeader showBackButton />

        <SessionHeader
          key={workoutId}
          title="Strength Training Session"
          paused={paused}
          timerResetKey={timerResetKey}
          onPauseToggle={() => setPaused(p => !p)}
          onCancel={handleCancel}
        />

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>EXERCISES</Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => setPickerOpen(true)}>
            <Ionicons name="add" size={18} color={PRIMARY} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
          {exercises.map(ex => (
            <ExerciseCard
              key={ex.instanceId}
              exercise={ex}
              onDelete={() => removeExercise(ex.instanceId)}
              onChange={updated => updateExercise(ex.instanceId, () => updated)}
            />
          ))}

          {exercises.length === 0 && (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Tap + to add your first exercise</Text>
            </View>
          )}
        </ScrollView>

        <TouchableOpacity
          style={[styles.finishBtn, loading ? { opacity: 0.7 } : null]}
          disabled={loading}
          onPress={() => setFinishModalOpen(true)}
        >
          <Text style={styles.finishText}>{loading ? 'Saving…' : 'Finish Workout'}</Text>
        </TouchableOpacity>

        <ExercisePickerModal
          visible={pickerOpen}
          onClose={() => setPickerOpen(false)}
          onPick={ex => {
            addExercise(ex);
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
              // Ensure session (delete is also protected by RLS)
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
              // still proceed with local cleanup + navigation
            }

            setExercises([]);
            setSeconds(0);
            setPaused(false);
            setTimerResetKey(k => k + 1);

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

const styles = StyleSheet.create({
  container: { flex: 1 },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 8,
  },
  sectionTitle: { color: '#aeb6cf', fontSize: 12, letterSpacing: 1.2 },
  addBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.dark.highlight1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: { padding: 24, alignItems: 'center' },
  emptyText: { color: '#7d86a5' },
  finishBtn: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 24,
    height: 52,
    borderRadius: 10,
    borderColor: PRIMARY,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 8 },
  },
  finishText: { color: PRIMARY, fontWeight: '700', fontSize: 18 },
});
