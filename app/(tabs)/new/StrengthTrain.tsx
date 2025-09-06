// app/(tabs)/new/StrengthTrain.tsx
// -----------------------------------------------------------------------------
// MAIN SCREEN – orchestrates state and composes the split components
// Now supports per-set "mode" (normal | warmup | dropset | failure).
// Tap a set number (or the mode pill) in ExerciseCard to change its mode.
// -----------------------------------------------------------------------------

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
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
import type { ExerciseType, SetMode } from '@/components/my components/activities/strength/types';

const EXERCISES = [
  'Bench Press (Barbell)',
  'Incline Press (Dumbbell)',
  'Back Squat (Barbell)',
  'Deadlift',
  'Overhead Press (Dumbbell)',
  'Barbell Row',
];

const StrengthTrain: React.FC = () => {
  // Modal
  const [pickerVisible, setPickerVisible] = useState(false);

  // Exercises
  const [exercises, setExercises] = useState<ExerciseType[]>([]);

  // Timer
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(true);

  // Finish confirmation
  const [showConfirm, setShowConfirm] = useState(false);

  // Interval ref (RN returns number)
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

  // Toggle running
  useEffect(() => {
    if (isRunning) startTimer();
    else stopTimer();
    return stopTimer;
  }, [isRunning]);

  // Derived: total weight
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

  // Actions
  const addExercise = (name: string) => {
    const id = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    setExercises((es) => [...es, { id, name, sets: [] }]);
    setPickerVisible(false);
  };

  const addSet = (exId: string) =>
    setExercises((es) =>
      es.map((ex) =>
        ex.id === exId
          ? {
              ...ex,
              // Default a new set to 'normal' so it "continues counting" unless user changes it
              sets: [...ex.sets, { weight: '', reps: '', mode: 'normal' }],
            }
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

  // NEW: update a set's mode (normal | warmup | dropset | failure)
  const updateSetMode = (exId: string, idx: number, mode: SetMode) =>
    setExercises((es) =>
      es.map((ex) =>
        ex.id === exId
          ? {
              ...ex,
              sets: ex.sets.map((st, i) => (i === idx ? { ...st, mode } : st)),
            }
          : ex
      )
    );

  const removeExercise = (exId: string) =>
    setExercises((es) => es.filter((e) => e.id !== exId));

  const finishWorkout = () => {
    setShowConfirm(false);
    stopTimer();
    router.back();
  };

  return (
    <>
      {/* Picker modal */}
      <ExercisePickerModal
        visible={pickerVisible}
        items={EXERCISES}
        onPick={addExercise}
        onClose={() => setPickerVisible(false)}
      />

      {/* Page */}
      <View style={GlobalStyles.container}>
        <LogoHeader showBackButton />

        {/* Header (title + metrics) */}
        <StrengthHeader seconds={seconds} totalWeight={totalWeight} />

        {/* Scrollable body */}
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}>
          {/* Exercise cards */}
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

          {/* Empty state */}
          {exercises.length === 0 && <EmptyState />}

          {/* Add Exercise */}
          <TouchableOpacity style={styles.addExerciseBtn} onPress={() => setPickerVisible(true)}>
            <MaterialIcons name="add" size={20} color= {Colors.dark.blkText} />
            <Text style={styles.addExerciseText}>Add Exercise</Text>
          </TouchableOpacity>

          {/* Footer actions */}
          <FooterActions
            isRunning={isRunning}
            onToggleTimer={() => setIsRunning((p) => !p)}
            onFinish={() => setShowConfirm(true)}
          />
        </ScrollView>

        {/* Confirm finish */}
        <ConfirmOverlay
          visible={showConfirm}
          onCancel={() => setShowConfirm(false)}
          onConfirm={finishWorkout}
        />
      </View>
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
