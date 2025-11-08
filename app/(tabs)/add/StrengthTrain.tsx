// app/(tabs)/new/StrengthTrain.tsx
// -----------------------------------------------------------------------------
// MAIN SCREEN – orchestrates state and composes the split components
// Supports per-set "mode" (normal | warmup | dropset | failure).
// On finish, writes to Supabase: strength_workouts → workout_exercises → sets
// After saving, shows a Workout Summary popup; closing it returns to /new.
// -----------------------------------------------------------------------------

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, ScrollView, TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import LogoHeader from '@/components/my components/logoHeader';
import { GlobalStyles } from '@/constants/GlobalStyles';
import { Colors } from '@/constants/Colors';
import ExercisePickerModal from '@/components/my components/activities/strength/ExercisePickerModal';
import StrengthHeader from '@/components/my components/activities/strength/StrengthHeader';
import ExerciseCard from '@/components/my components/activities/strength/ExerciseCard';
import EmptyState from '@/components/my components/activities/strength/EmptyState';
import FooterActions from '@/components/my components/activities/strength/FooterActions';
import ConfirmOverlay from '@/components/my components/activities/strength/ConfirmOverlay';
import ExerciseSummaryPopup from '@/components/my components/activities/strength/ExerciseSummaryPopup';
import type { ExerciseType, SetMode } from '@/components/my components/activities/strength/types';
import { supabase } from '@/lib/supabase';

// -------------------------
// DB Catalog Row
// -------------------------
type ExerciseRow = {
  id: string;
  exercise_name: string;
  info: string;
};

type SummarySet = { setNumber: number; reps: number; weight: number; mode: string };
type SummaryExercise = { name: string; sets: SummarySet[] };

const StrengthTrain: React.FC = () => {
  // Modal
  const [pickerVisible, setPickerVisible] = useState(false);

  // Active workout log
  const [exercises, setExercises] = useState<ExerciseType[]>([]);

  // Catalog from Supabase
  const [dbExercises, setDbExercises] = useState<ExerciseRow[]>([]);

  // Timer
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(true);

  // Finish + Summary
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [summaryPayload, setSummaryPayload] = useState<{
    date: string;
    duration: string;
    exercises: SummaryExercise[];
  } | null>(null);

  // Interval ref
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
  };

  const stopTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  // On mount: reset and start
  useEffect(() => {
    setSeconds(0);
    setExercises([]);
    setIsRunning(true);
    startTimer();
    return stopTimer;
  }, []);

  // Timer toggle
  useEffect(() => {
    if (isRunning) startTimer();
    else stopTimer();
    return stopTimer;
  }, [isRunning]);

  // Fetch exercise catalog
  useEffect(() => {
    const fetchExercises = async () => {
      const { data, error } = await supabase.from('exercises').select('id, exercise_name, info');
      if (error) console.error('Error fetching exercises:', error);
      else setDbExercises(data || []);
    };
    fetchExercises();
  }, []);

  // Derived: total weight volume (weight * reps)
  const totalWeight = useMemo(
    () =>
      exercises.reduce((sumEx, ex) => {
        const exSum = ex.sets.reduce((sumSet, st) => {
          const w = parseFloat(st.weight) || 0;
          const r = parseInt(st.reps, 10) || 0;
          return sumSet + w * r;
        }, 0);
        return sumEx + exSum;
      }, 0),
    [exercises]
  );

  // Helpers
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  const secondsToHMMSS = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return h > 0 ? `${h}h ${pad(m)}m ${pad(sec)}s` : `${m}m ${pad(sec)}s`;
  };

  // Actions
  const addExercise = (exerciseName: string) => {
    const id = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    setExercises((es) => [...es, { id, name: exerciseName, sets: [] }]);
    setPickerVisible(false);
  };

  const addSet = (exId: string) =>
    setExercises((es) =>
      es.map((ex) =>
        ex.id === exId
          ? { ...ex, sets: [...ex.sets, { weight: '', reps: '', mode: 'normal' }] }
          : ex
      )
    );

  const updateSet = (exId: string, idx: number, field: 'weight' | 'reps', val: string) =>
    setExercises((es) =>
      es.map((ex) =>
        ex.id === exId
          ? { ...ex, sets: ex.sets.map((st, i) => (i === idx ? { ...st, [field]: val } : st)) }
          : ex
      )
    );

  const updateSetMode = (exId: string, idx: number, mode: SetMode) =>
    setExercises((es) =>
      es.map((ex) =>
        ex.id === exId
          ? { ...ex, sets: ex.sets.map((st, i) => (i === idx ? { ...st, mode } : st)) }
          : ex
      )
    );

  const removeExercise = (exId: string) =>
    setExercises((es) => es.filter((e) => e.id !== exId));

  // Persist workout to Supabase
  const saveWorkout = async () => {
    const { data: workout, error: workoutError } = await supabase
      .from('strength_workouts')
      .insert({ ended_at: new Date().toISOString() })
      .select()
      .single();

    if (workoutError || !workout) {
      console.error('Workout insert failed:', workoutError);
      Alert.alert('Error', 'Could not save workout.');
      return null;
    }

    for (let i = 0; i < exercises.length; i++) {
      const ex = exercises[i];
      const match = dbExercises.find((d) => d.exercise_name === ex.name);
      const exerciseId = match?.id || null;

      const { data: we, error: exError } = await supabase
        .from('workout_exercises')
        .insert({
          strength_workout_id: workout.id,
          exercise_id: exerciseId,
          order_num: i + 1,
        })
        .select()
        .single();

      if (exError || !we) {
        console.error('Exercise insert failed:', exError);
        continue;
      }

      const setRows = ex.sets.map((s, idx) => ({
        workout_exercise_id: we.id,
        set_number: idx + 1,
        set_type: s.mode,
        weight: parseFloat(s.weight) || 0,
        reps: parseInt(s.reps, 10) || 0,
      }));

      if (setRows.length > 0) {
        const { error: setError } = await supabase.from('sets').insert(setRows);
        if (setError) console.error('Set insert failed:', setError);
      }
    }

    return workout;
  };

  const finishWorkout = async () => {
    stopTimer();
    setShowConfirm(false);

    const summary = {
      date: new Date().toLocaleDateString(),
      duration: secondsToHMMSS(seconds),
      exercises: exercises.map((ex) => ({
        name: ex.name,
        sets: ex.sets.map((s, idx) => ({
          setNumber: idx + 1,
          reps: parseInt(s.reps || '0', 10) || 0,
          weight: parseFloat(s.weight || '0') || 0,
          mode: s.mode,
        })),
      })),
    };

    const workout = await saveWorkout();
    if (!workout) {
      setIsRunning(true);
      return;
    }

    setSummaryPayload(summary);
    setShowSummary(true);
  };

  const handleCloseSummary = () => {
    setShowSummary(false);
    setExercises([]);
    setSeconds(0);
    setIsRunning(false);
    router.replace('/new');
  };

  return (
    <>
      <ExercisePickerModal
        visible={pickerVisible}
        items={dbExercises}
        onPick={addExercise}
        onClose={() => setPickerVisible(false)}
      />

      <View style={GlobalStyles.container}>
        <LogoHeader showBackButton />
        <StrengthHeader seconds={seconds} totalWeight={totalWeight} />

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
        >
          {exercises.map((ex, idx) => (
            <ExerciseCard
              key={ex.id}
              ex={ex}
              index={idx}
              onDelete={removeExercise}
              onAddSet={addSet}
              onUpdateSet={updateSet}
              onUpdateSetMode={updateSetMode}
            />
          ))}

          {exercises.length === 0 && <EmptyState />}

          <TouchableOpacity style={styles.addExerciseBtn} onPress={() => setPickerVisible(true)}>
            <MaterialIcons name="add" size={20} color={Colors.dark.blkText} />
            <Text style={styles.addExerciseText}>Add Exercise</Text>
          </TouchableOpacity>

          <FooterActions
            isRunning={isRunning}
            onToggleTimer={() => setIsRunning((p) => !p)}
            onFinish={() => setShowConfirm(true)}
          />
        </ScrollView>

        <ConfirmOverlay
          visible={showConfirm}
          onCancel={() => setShowConfirm(false)}
          onConfirm={finishWorkout}
        />
      </View>

      {summaryPayload && (
        <ExerciseSummaryPopup
          visible={showSummary}
          onClose={handleCloseSummary}
          date={summaryPayload.date}
          duration={summaryPayload.duration}
          exercises={summaryPayload.exercises}
        />
      )}
    </>
  );
};

export default StrengthTrain;

const styles = StyleSheet.create({
  addExerciseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF950A',
    padding: 14,
    borderRadius: 10,
    justifyContent: 'center',
    marginTop: 8,
  },
  addExerciseText: { color: Colors.dark.blkText, marginLeft: 8, fontSize: 16 },
});
