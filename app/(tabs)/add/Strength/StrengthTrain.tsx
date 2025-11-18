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

import { supabase } from '@/lib/supabase';
import SessionHeader from './components/SessionHeader';
import ExerciseCard from './components/ExerciseCard';
import ExercisePickerModal from './components/ExercisePickerModal';
import SummaryModal from './components/SummaryModal';

export type UnitMass = 'kg' | 'lb';
export type SetType = 'normal' | 'warmup' | 'dropset' | 'failure';

export type SetDraft = {
  tempId: string;
  set_index: number; // stored to DB as-is (1..n, including warmups)
  set_type: SetType;
  weight?: number | null;
  weight_unit_csv: UnitMass;
  reps?: number | null;
  rpe?: number | null;
  est_1rm?: number | null;
  superset_group?: number | null;
  done?: boolean;
};

export type ExerciseDraft = {
  instanceId: string;      // UI-only ID for this card instance
  exercise_id: string;     // FK → exercises.id
  exercise_name: string;
  sets: SetDraft[];
};

const toKg = (w: number | null | undefined, unit: UnitMass) =>
  w == null ? 0 : unit === 'kg' ? w : w * 0.45359237;

export default function StrengthTrain() {
  const [workoutId, setWorkoutId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [exercises, setExercises] = useState<ExerciseDraft[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [paused, setPaused] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [timerResetKey, setTimerResetKey] = useState(0);


  useEffect(() => {
    const id = setInterval(() => {
      if (!paused) {
        setSeconds(s => s + 1);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [paused]);
  // Start workout row on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        Alert.alert('Auth error', sessionError.message);
        router.back();
        return;
      }
      const uid = session?.user?.id ?? null;
      if (!uid) {
        Alert.alert('Not signed in', 'You must be signed in to start a workout.');
        router.back();
        return;
      }
      if (!mounted) return;
      setUserId(uid);

      const { data, error } = await supabase
        .from('strength_workouts')
        .insert({ user_id: uid })
        .select('id')
        .single();

      if (error) {
        Alert.alert('Error', error.message);
        router.back();
        return;
      }
      if (!mounted) return;
      setWorkoutId(data.id);
      setLoading(false);
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
            weight_unit_csv: 'lb',
            weight: undefined,
            reps: undefined,
            rpe: undefined,
            est_1rm: undefined,
            done: false,
          },
        ],
      },
    ]);
  };

  const removeExercise = (instanceId: string) => {
    setExercises(prev => prev.filter(e => e.instanceId !== instanceId));
  };

  const updateExercise = (instanceId: string, updater: (draft: ExerciseDraft) => ExerciseDraft) => {
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
    // pause timer immediately
    setPaused(true);

    Alert.alert('Cancel workout?', 'This will discard the current session.', [
      {
        text: 'Keep',
        style: 'cancel',
        onPress: () => {
          // resume timer if user cancels the cancel
          setPaused(false);
        },
      },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: async () => {
          // delete workout
          if (workoutId) {
            await supabase.from('strength_workouts').delete().eq('id', workoutId);
          }

          // 👇 THIS RESETS TIMER
          setTimerResetKey(k => k + 1);

          // navigate home
          router.back();
        },
      },
    ]);
  };


  const handleFinish = async () => {
    if (!workoutId || !userId) return;
    if (exercises.length === 0) {
      Alert.alert('No exercises', 'Please add at least one exercise.');
      return;
    }

    setLoading(true);
    try {
      // 1) Insert sets
      const setPayload = exercises.flatMap(ex =>
        ex.sets.map(s => ({
          exercise_id: ex.exercise_id,
          strength_workout_id: workoutId,
          set_index: s.set_index,           // backend indexing stays full sequence
          set_type: s.set_type,
          superset_group: s.superset_group ?? null,
          weight: s.weight ?? null,
          weight_unit_csv: s.weight_unit_csv,
          reps: s.reps ?? null,
          rpe: s.rpe ?? null,
          est_1rm: s.est_1rm ?? null,
          notes: null,
        })),
      );

      if (setPayload.length > 0) {
        const { error: setsErr } = await supabase.from('strength_sets').insert(setPayload);
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
        user_id: userId,
        exercise_id: sm.exercise_id,
        strength_workout_id: workoutId,
        vol: sm.vol,
        strongest_set: sm.strongest_set,
        best_est_1rm: sm.best_est_1rm,
        avg_set: sm.avg_set,
      }));

      if (summaryPayload.length > 0) {
        const { error: sumErr } = await supabase.from('exercise_summary').insert(summaryPayload);
        if (sumErr) throw sumErr;
      }

      // 3) Update workout with total volume + end time
      const totalVol = +totalVolumeKg.toFixed(2);
      const { error: wErr } = await supabase
        .from('strength_workouts')
        .update({ ended_at: new Date().toISOString(), total_vol: totalVol })
        .eq('id', workoutId);
      if (wErr) throw wErr;

      console.log('✅ workout saved', { workoutId });
      setSummaryOpen(true);
    } catch (err: any) {
      console.error(err);
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
    <View style={styles.container}>
      <SessionHeader
        key={workoutId}               // keep if you're using unique workout per session
        title="Weight Session"
        paused={paused}
        timerResetKey={timerResetKey}   // 👈 NEW
        onPauseToggle={() => setPaused(p => !p)}
        onCancel={handleCancel}
      />

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>EXERCISES</Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => setPickerOpen(true)}>
            <Ionicons name="add" size={18} color="#fff" />
          </TouchableOpacity>
        </View>

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

      <TouchableOpacity style={styles.finishBtn} onPress={handleFinish}>
        <Text style={styles.finishText}>Finish Workout</Text>
      </TouchableOpacity>

      <ExercisePickerModal
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={ex => {
          addExercise(ex);
          setPickerOpen(false);
        }}
      />

      <SummaryModal
        visible={summaryOpen}
        onClose={() => {
          setSummaryOpen(false);
          if (workoutId) router.replace(`/summary/strength/${workoutId}`);
          else router.replace('/(tabs)/add');
        }}
        workoutTotalVolKg={totalVolumeKg}
        exercises={exercises}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1525' },
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
    backgroundColor: '#5b64ff',
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
    borderRadius: 16,
    backgroundColor: '#5b64ff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 8 },
  },
  finishText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
