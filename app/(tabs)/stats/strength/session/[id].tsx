import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/Colors';
import LogoHeader from '@/components/my components/logoHeader';

const ORANGE = '#FF950A';

interface Exercise {
  id: string;
  exercise_id: string;
  name?: string;
  order_num: number;
  sets: SetRecord[];
}

interface SetRecord {
  id: string;
  set_number: number;
  set_type: string;
  weight: number;
  reps: number;
  rpe?: number;
  rest_seconds?: number;
}

export default function SessionSummary() {
  const { id } = useLocalSearchParams();
  const [session, setSession] = useState<any>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSession();
  }, []);

  const fetchSession = async () => {
    setLoading(true);

    // 1️⃣ Fetch workout details
    const { data: workout, error: workoutErr } = await supabase
      .from('strength_workouts')
      .select('*')
      .eq('id', id)
      .single();

    if (workoutErr) console.error(workoutErr);

    // 2️⃣ Fetch exercises for that workout
    const { data: exercisesData, error: exErr } = await supabase
      .from('workout_exercises')
      .select('id, exercise_id, order_num, notes')
      .eq('strength_workout_id', id)
      .order('order_num', { ascending: true });

    if (exErr) console.error(exErr);

    // 3️⃣ Fetch sets for all those exercises
    const exIds = exercisesData?.map((ex) => ex.id);
    const { data: setsData, error: setErr } = await supabase
      .from('sets')
      .select('id, workout_exercise_id, set_number, set_type, weight, reps, rpe, rest_seconds')
      .in('workout_exercise_id', exIds || [])
      .order('set_number', { ascending: true });

    if (setErr) console.error(setErr);

    // 4️⃣ Group sets under their exercises
    const grouped = (exercisesData || []).map((ex) => ({
      ...ex,
      name: `Exercise ${ex.order_num}`, // Replace with actual lookup if you have an exercises table
      sets: (setsData || []).filter((s) => s.workout_exercise_id === ex.id),
    }));

    setSession(workout);
    setExercises(grouped);
    setLoading(false);
  };

  if (loading)
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator size="large" color={ORANGE} />
      </SafeAreaView>
    );

  const start = new Date(session.started_at);
  const end = new Date(session.ended_at);
  const duration = ((end.getTime() - start.getTime()) / (1000 * 60)).toFixed(0);

  return (
    <SafeAreaView style={styles.safe}>
      <LogoHeader showBackButton />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        {/* HEADER */}
        <Text style={styles.header}>WORKOUT SUMMARY</Text>
        <Text style={styles.date}>{start.toDateString()}</Text>

        {/* METRICS */}
        <View style={styles.summaryCard}>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Duration</Text>
            <Text style={styles.metricValue}>{duration} min</Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Exercises</Text>
            <Text style={styles.metricValue}>{exercises.length}</Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Est. Volume</Text>
            <Text style={styles.metricValue}>
              {exercises
                .reduce(
                  (sum, ex) =>
                    sum + ex.sets.reduce((a, s) => a + (s.weight || 0) * (s.reps || 0), 0),
                  0
                )
                .toLocaleString()} lbs
            </Text>
          </View>
        </View>

        {/* NOTES */}
        {session.notes && (
          <View style={styles.notesCard}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={styles.notesText}>{session.notes}</Text>
          </View>
        )}

        {/* EXERCISE LIST */}
        <Text style={styles.sectionTitle}>Exercises</Text>
        {exercises.map((exercise, index) => (
          <View key={exercise.id} style={styles.exerciseCard}>
            <View style={styles.exerciseHeader}>
              <Text style={styles.exerciseTitle}>
                {exercise.name || `Exercise ${index + 1}`}
              </Text>
              <Text style={styles.exerciseSubtitle}>
                {exercise.sets.length} sets
              </Text>
            </View>

            {/* SET TABLE */}
            <View style={styles.setHeaderRow}>
              <Text style={[styles.setHeader, { flex: 1 }]}>Set</Text>
              <Text style={[styles.setHeader, { flex: 1 }]}>Type</Text>
              <Text style={[styles.setHeader, { flex: 1 }]}>Weight</Text>
              <Text style={[styles.setHeader, { flex: 1 }]}>Reps</Text>
            </View>

            {exercise.sets.map((set, i) => (
              <TouchableOpacity key={set.id} style={styles.setRow} activeOpacity={0.8}>
                <Text style={[styles.setText, { flex: 1 }]}>{set.set_number}</Text>
                <Text style={[styles.setText, { flex: 1 }]}>{set.set_type}</Text>
                <Text style={[styles.setText, { flex: 1 }]}>{set.weight} lb</Text>
                <Text style={[styles.setText, { flex: 1 }]}>{set.reps}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors?.dark?.background ?? '#3f3f3f',
  },
  header: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 20,
    marginBottom: 4,
  },
  date: {
    color: '#CFCFCF',
    fontSize: 12,
    marginBottom: 16,
  },
  summaryCard: {
    backgroundColor: '#2f2f2f',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  metricLabel: { color: '#9b9b9b', fontSize: 13, fontWeight: '600' },
  metricValue: { color: '#fff', fontSize: 14, fontWeight: '700' },
  notesCard: {
    backgroundColor: '#3a3a3a',
    borderRadius: 8,
    padding: 12,
    marginBottom: 18,
  },
  sectionTitle: {
    color: ORANGE,
    fontWeight: '800',
    marginBottom: 8,
    fontSize: 14,
  },
  notesText: {
    color: '#fff',
    fontSize: 13,
    lineHeight: 20,
  },
  exerciseCard: {
    backgroundColor: '#2e2e2e',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  exerciseTitle: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  exerciseSubtitle: {
    color: '#CFCFCF',
    fontSize: 11,
  },
  setHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#444',
    paddingBottom: 4,
    marginBottom: 4,
  },
  setHeader: {
    color: '#aaa',
    fontSize: 11,
    textAlign: 'center',
    fontWeight: '700',
  },
  setRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#3b3b3b',
    borderRadius: 6,
    paddingVertical: 6,
    marginVertical: 2,
  },
  setText: {
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
  },
});
