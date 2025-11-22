// components/my components/progress/TopMetricCards.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { supabase } from '@/lib/supabase';

type StrengthWorkoutRow = {
  started_at: string;
  ended_at: string | null;
};

type Props = {
  onExercisesPress?: () => void;
};

const TopMetricCards: React.FC<Props> = ({ onExercisesPress }) => {
  const [weightsSessions, setWeightsSessions] = useState(0);
  const [weightsHours, setWeightsHours] = useState(0);
  const [loadingWeights, setLoadingWeights] = useState(true);

  const [exerciseCount, setExerciseCount] = useState(0);
  const [loadingExercises, setLoadingExercises] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      // ---- Weights (last 7 days) ----
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();
        if (userError) throw userError;

        if (user) {
          const end = new Date();
          const start = new Date();
          start.setDate(end.getDate() - 6);

          const { data, error } = await supabase
            .from('strength_workouts') // change if your table name differs
            .select('started_at, ended_at')
            .eq('user_id', user.id)
            .gte('started_at', start.toISOString())
            .lte('started_at', end.toISOString());

          if (error) throw error;

          const rows = (data ?? []) as StrengthWorkoutRow[];
          const sessions = rows.length;

          const totalHours = rows.reduce((sum, row) => {
            if (!row.ended_at) return sum;
            const started = new Date(row.started_at).getTime();
            const ended = new Date(row.ended_at).getTime();
            if (Number.isNaN(started) || Number.isNaN(ended)) return sum;
            const diffHours = Math.max(0, ended - started) / 1000 / 3600;
            return sum + diffHours;
          }, 0);

          setWeightsSessions(sessions);
          setWeightsHours(Number(totalHours.toFixed(1)));
        }
      } catch (err) {
        console.warn('Error loading weights stats', err);
      } finally {
        setLoadingWeights(false);
      }

      // ---- Exercises (total count) ----
      try {
        const { data, error } = await supabase
          .from('exercises') // adjust if table name differs
          .select('id');

        if (error) throw error;

        setExerciseCount((data ?? []).length);
      } catch (err) {
        console.warn('Error loading exercises count', err);
      } finally {
        setLoadingExercises(false);
      }
    };

    fetchMetrics();
  }, []);

  const weightsSubtitle = loadingWeights
    ? 'Loading...'
    : `${weightsSessions} session${weightsSessions === 1 ? '' : 's'} · ${weightsHours} hrs`;
  const weightsValue = loadingWeights ? '—' : String(weightsSessions || 0);

  const exercisesSubtitle = loadingExercises ? 'Loading...' : 'exercises';
  const exercisesValue = loadingExercises ? '—' : String(exerciseCount || 0);

  return (
    <View style={styles.metricGrid}>
      {/* Weights */}
      <View style={styles.metricCard}>
        <View style={styles.metricHeaderRow}>
          <View style={[styles.metricIcon, styles.weightsIcon]}>
            <MaterialCommunityIcons
              name="dumbbell"
              size={18}
              color="#C7D2FF"
            />
          </View>
          <Text style={styles.metricLabel}>WEIGHTS</Text>
        </View>
        <Text style={styles.metricValue}>{weightsValue}</Text>
        <Text style={styles.metricSub}>{weightsSubtitle}</Text>
      </View>

      {/* Running (dummy) */}
      <View style={styles.metricCard}>
        <View style={styles.metricHeaderRow}>
          <View style={[styles.metricIcon, styles.runningIcon]}>
            <Ionicons name="walk-outline" size={18} color="#C7F4FF" />
          </View>
          <Text style={styles.metricLabel}>RUNNING</Text>
        </View>
        <Text style={styles.metricValue}>12.4</Text>
        <Text style={styles.metricSub}>miles · 3 runs</Text>
      </View>

      {/* Exercises (replaces Cycling) */}
      <TouchableOpacity
        style={styles.metricCard}
        activeOpacity={0.85}
        onPress={onExercisesPress}
      >
        <View style={styles.metricHeaderRow}>
          <View style={[styles.metricIcon, styles.exercisesIcon]}>
            <Ionicons name="list-outline" size={18} color="#E6F3FF" />
          </View>
          <Text style={styles.metricLabel}>EXERCISES</Text>
        </View>
        <Text style={styles.metricValue}>{exercisesValue}</Text>
        <Text style={styles.metricSub}>{exercisesSubtitle}</Text>
      </TouchableOpacity>

      {/* Nutrition (dummy) */}
      <View style={styles.metricCard}>
        <View style={styles.metricHeaderRow}>
          <View style={[styles.metricIcon, styles.nutritionIcon]}>
            <MaterialCommunityIcons
              name="food-apple-outline"
              size={18}
              color="#FFEAD1"
            />
          </View>
          <Text style={styles.metricLabel}>NUTRITION</Text>
        </View>
        <Text style={styles.metricValue}>6/7</Text>
        <Text style={styles.metricSub}>days tracked</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  metricGrid: {
    marginTop: 24,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 14,
  },
  metricCard: {
    width: '48%',
    backgroundColor: Colors.dark.card,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  metricHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  metricIcon: {
    width: 28,
    height: 28,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  weightsIcon: {
    backgroundColor: '#28307A',
  },
  runningIcon: {
    backgroundColor: '#1C7C72',
  },
  exercisesIcon: {
    backgroundColor: '#1E3A8A',
  },
  nutritionIcon: {
    backgroundColor: '#7C2D12',
  },
  metricLabel: {
    fontSize: 10,
    letterSpacing: 0.9,
    color: '#9DA4C4',
  },
  metricValue: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  metricSub: {
    marginTop: 4,
    fontSize: 11,
    color: '#9DA4C4',
  },
});

export default TopMetricCards;
