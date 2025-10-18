// components/strength/RecentStrengthWorkouts.tsx
// Fetches last N workouts, computes total_exercises & total_volume from sets,
// shows fixed-height scrollable cards (3-cards-tall viewport).

import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/Colors';

const ORANGE = '#FF950A';

// ---- Types coming from your DB schema ----
type StrengthWorkout = {
  id: string;
  started_at: string;
  ended_at: string;
  notes?: string | null;
};

type WorkoutExercise = {
  id: string;
  strength_workout_id: string;
  exercise_id: string | null;
  order_num: number | null;
};

type SetRow = {
  id: string;
  workout_exercise_id: string;
  set_number: number | null;
  set_type: string | null; // e.g., 'working', 'warmup', etc.
  weight: number | null;   // lbs
  reps: number | null;
  rpe?: number | null;
  rest_seconds?: number | null;
};

type EnrichedWorkout = StrengthWorkout & {
  duration_minutes: number;
  total_exercises: number;
  total_volume: number;
};

type Props = {
  limit?: number; // default 8
  onPressWorkout?: (workoutId: string) => void;
  style?: ViewStyle;
};

const CARD_HEIGHT = 96;           // single card height
const CARD_GAP = 12;              // gap between cards
const VISIBLE_CARDS = 3;          // fixed viewport height in cards

const RecentStrengthWorkouts: React.FC<Props> = ({
  limit = 8,
  onPressWorkout,
  style,
}) => {
  const [loading, setLoading] = useState(true);
  const [workouts, setWorkouts] = useState<EnrichedWorkout[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);

      // 1) Fetch recent workouts
      const { data: wData, error: wErr } = await supabase
        .from('strength_workouts')
        .select('id, started_at, ended_at, notes')
        .order('started_at', { ascending: false })
        .limit(limit);

      if (wErr) {
        console.error('[strength_workouts] fetch error:', wErr);
        setLoading(false);
        return;
      }
      const workoutIds = (wData ?? []).map((w) => w.id);
      if (!workoutIds.length) {
        setWorkouts([]);
        setLoading(false);
        return;
      }

      // 2) Fetch all exercises for those workouts (bulk, using .in)
      const { data: exData, error: exErr } = await supabase
        .from('workout_exercises')
        .select('id, strength_workout_id, exercise_id, order_num')
        .in('strength_workout_id', workoutIds);

      if (exErr) {
        console.error('[workout_exercises] fetch error:', exErr);
        setLoading(false);
        return;
      }
      const exerciseIds = (exData ?? []).map((e) => e.id);

      // 3) Fetch sets for those exercises
      const { data: sData, error: sErr } = await supabase
        .from('sets')
        .select(
          'id, workout_exercise_id, set_number, set_type, weight, reps, rpe, rest_seconds'
        )
        .in('workout_exercise_id', exerciseIds);

      if (sErr) {
        console.error('[sets] fetch error:', sErr);
        setLoading(false);
        return;
      }

      // 4) Compute totals per workout
      // Build fast lookups
      const exByWorkout = new Map<string, WorkoutExercise[]>();
      (exData ?? []).forEach((ex) => {
        const arr = exByWorkout.get(ex.strength_workout_id) ?? [];
        arr.push(ex);
        exByWorkout.set(ex.strength_workout_id, arr);
      });

      const setsByExercise = new Map<string, SetRow[]>();
      (sData ?? []).forEach((s) => {
        const arr = setsByExercise.get(s.workout_exercise_id) ?? [];
        arr.push(s);
        setsByExercise.set(s.workout_exercise_id, arr);
      });

      const enriched: EnrichedWorkout[] = (wData ?? []).map((w) => {
        // duration
        const start = new Date(w.started_at).getTime();
        const end = new Date(w.ended_at).getTime();
        const duration_minutes = Math.max(0, Math.round((end - start) / 60000));

        // exercises count
        const exercises = exByWorkout.get(w.id) ?? [];
        const total_exercises = exercises.length;

        // total volume = sum(weight*reps) across all sets of all exercises
        let total_volume = 0;
        for (const ex of exercises) {
          const sets = setsByExercise.get(ex.id) ?? [];
          for (const s of sets) {
            const weight = s.weight ?? 0;
            const reps = s.reps ?? 0;
            total_volume += weight * reps;
          }
        }

        return {
          ...w,
          duration_minutes,
          total_exercises,
          total_volume,
        };
      });

      setWorkouts(enriched);
      setLoading(false);
    })();
  }, [limit]);

  // Fixed-height viewport for exactly 3 cards (with gaps)
  const containerHeight = useMemo(() => {
    const gaps = CARD_GAP * (VISIBLE_CARDS - 1);
    return CARD_HEIGHT * VISIBLE_CARDS + gaps;
  }, []);

  if (loading) {
    return (
      <View style={[styles.container, { height: containerHeight }, style]}>
        <ActivityIndicator size="large" color={ORANGE} style={{ marginTop: 24 }} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { height: containerHeight }, style]}>
      <FlatList
        data={workouts}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ gap: CARD_GAP, paddingBottom: 4 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => onPressWorkout?.(item.id)}
            style={[styles.card, { height: CARD_HEIGHT }]}
          >
            {/* Top row: Date & Duration */}
            <View style={styles.topRow}>
              <Text style={styles.title}>
                {new Date(item.started_at).toLocaleDateString('en-CA')}
              </Text>
              <Text style={styles.date}>{item.duration_minutes} min</Text>
            </View>

            {/* Meta: Exercises + Volume */}
            <View style={styles.metaRow}>
              <View style={styles.metaPill}>
                <Text style={styles.metaLabel}>EXERCISES</Text>
                <Text style={styles.metaValue}>{item.total_exercises}</Text>
              </View>
              <View style={styles.metaPill}>
                <Text style={styles.metaLabel}>VOLUME</Text>
                <Text style={styles.metaValue}>
                  {item.total_volume.toLocaleString()} lbs
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  card: {
    backgroundColor: '#3a3a3a',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#2c2c2c',
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  title: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  date: {
    color: '#CFCFCF',
    fontSize: 11,
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    gap: 8,
  },
  metaPill: {
    flex: 1,
    backgroundColor: '#5a5a5a',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  metaLabel: {
    color: '#EAEAEA',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  metaValue: {
    color: '#fff',
    marginTop: 2,
    fontWeight: '800',
    fontSize: 12,
  },
});

export default RecentStrengthWorkouts;
