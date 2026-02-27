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
import { useUnits } from '@/contexts/UnitsContext';

type StrengthWorkoutRow = {
  started_at: string;
  ended_at: string | null;
};

type IndoorRunWalkRow = {
  exercise_type: string;
  total_distance_m: number | null;
};

type OutdoorRunWalkRow = {
  activity_type: string;
  distance_m: number | null;
};

type WeeklyRunWalkRow = {
  total_distance_ran_m: number | null;
  total_distance_walked_m: number | null;
  total_distance_run_walk_m: number | null;
};

type Props = {
  onExercisesPress?: () => void;
};

const M_PER_MI = 1609.344;
const M_PER_KM = 1000;

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function toLocalISODate(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function getWeekStartMondayISO(d: Date) {
  const day = d.getDay(); // Sun=0..Sat=6
  const daysSinceMonday = (day + 6) % 7;
  const monday = new Date(d);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - daysSinceMonday);
  return toLocalISODate(monday);
}

function isRunWalk(type: string) {
  const v = (type ?? '').toLowerCase();
  return v.includes('run') || v.includes('walk');
}

const TopMetricCards: React.FC<Props> = ({ onExercisesPress }) => {
  const { distanceUnit } = useUnits();
  const [weightsSessions, setWeightsSessions] = useState(0);
  const [weightsHours, setWeightsHours] = useState(0);
  const [loadingWeights, setLoadingWeights] = useState(true);

  const [exerciseCount, setExerciseCount] = useState(0);
  const [loadingExercises, setLoadingExercises] = useState(true);

  const [runningDistanceM, setRunningDistanceM] = useState(0);
  const [runningSessions, setRunningSessions] = useState(0);
  const [loadingRunning, setLoadingRunning] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();
        if (userError) throw userError;

        if (!user) {
          setWeightsSessions(0);
          setWeightsHours(0);
          setExerciseCount(0);
          setRunningDistanceM(0);
          setRunningSessions(0);
          return;
        }

        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - 6);
        const weekStartISO = getWeekStartMondayISO(end);

        // ---- Weights (last 7 days) ----
        const { data: weightData, error: weightError } = await supabase
          .schema('strength')
          .from('strength_workouts')
          .select('started_at, ended_at')
          .eq('user_id', user.id)
          .gte('started_at', start.toISOString())
          .lte('started_at', end.toISOString());

        if (weightError) throw weightError;

        const rows = (weightData ?? []) as StrengthWorkoutRow[];
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

        // ---- Exercises (total count) ----
        const { data: exerciseData, error: exerciseError } = await supabase
          .from('exercises')
          .select('id')
          .or(`user_id.is.null,user_id.eq.${user.id}`);

        if (exerciseError) throw exerciseError;
        setExerciseCount((exerciseData ?? []).length);

        // ---- Running (indoor + outdoor run/walk, last 7 days) ----
        const indoorPromise = supabase
          .schema('run_walk')
          .from('sessions')
          .select('exercise_type, total_distance_m')
          .eq('user_id', user.id)
          .eq('status', 'completed')
          .gte('ended_at', start.toISOString())
          .lte('ended_at', end.toISOString());

        const outdoorPromise = supabase
          .schema('run_walk')
          .from('outdoor_sessions')
          .select('activity_type, distance_m')
          .eq('user_id', user.id)
          .eq('status', 'completed')
          .gte('ended_at', start.toISOString())
          .lte('ended_at', end.toISOString());

        const weeklySummaryPromise = supabase
          .schema('user')
          .from('weekly_summary')
          .select('total_distance_ran_m,total_distance_walked_m,total_distance_run_walk_m')
          .eq('user_id', user.id)
          .eq('week_start', weekStartISO)
          .maybeSingle();

        const [indoorRes, outdoorRes, weeklyRes] = await Promise.all([
          indoorPromise,
          outdoorPromise,
          weeklySummaryPromise,
        ]);

        if (indoorRes.error) throw indoorRes.error;
        if (outdoorRes.error) throw outdoorRes.error;
        if (weeklyRes.error && weeklyRes.error.code !== '42703') throw weeklyRes.error;

        const indoorRows = (indoorRes.data ?? []) as IndoorRunWalkRow[];
        const outdoorRows = (outdoorRes.data ?? []) as OutdoorRunWalkRow[];
        let weeklyRow = (weeklyRes.data ?? null) as WeeklyRunWalkRow | null;
        if (weeklyRes.error?.code === '42703') {
          const legacyWeeklyRes = await supabase
            .schema('user')
            .from('weekly_summary')
            .select('total_miles_ran,total_miles_walked,total_miles_run_walk')
            .eq('user_id', user.id)
            .eq('week_start', weekStartISO)
            .maybeSingle();

          if (legacyWeeklyRes.error?.code === '42703') {
            const legacySingleRes = await supabase
              .schema('user')
              .from('weekly_summary')
              .select('total_miles_ran')
              .eq('user_id', user.id)
              .eq('week_start', weekStartISO)
              .maybeSingle();

            if (!legacySingleRes.error) {
              const milesRan = Number((legacySingleRes.data as any)?.total_miles_ran ?? 0);
              weeklyRow = {
                total_distance_ran_m: milesRan * M_PER_MI,
                total_distance_walked_m: 0,
                total_distance_run_walk_m: milesRan * M_PER_MI,
              };
            }
          } else if (!legacyWeeklyRes.error) {
            const milesRan = Number((legacyWeeklyRes.data as any)?.total_miles_ran ?? 0);
            const milesWalked = Number((legacyWeeklyRes.data as any)?.total_miles_walked ?? 0);
            const milesRunWalk = Number(
              (legacyWeeklyRes.data as any)?.total_miles_run_walk ?? milesRan + milesWalked
            );
            weeklyRow = {
              total_distance_ran_m: milesRan * M_PER_MI,
              total_distance_walked_m: milesWalked * M_PER_MI,
              total_distance_run_walk_m: milesRunWalk * M_PER_MI,
            };
          }
        }

        const indoorTotals = indoorRows
          .filter((row) => isRunWalk(row.exercise_type))
          .reduce(
            (acc, row) => {
              acc.sessions += 1;
              acc.distanceM += Number(row.total_distance_m ?? 0);
              return acc;
            },
            { sessions: 0, distanceM: 0 }
          );

        const outdoorTotals = outdoorRows
          .filter((row) => isRunWalk(row.activity_type))
          .reduce(
            (acc, row) => {
              acc.sessions += 1;
              acc.distanceM += Number(row.distance_m ?? 0);
              return acc;
            },
            { sessions: 0, distanceM: 0 }
          );

        setRunningSessions(indoorTotals.sessions + outdoorTotals.sessions);
        const fallbackDistanceM = indoorTotals.distanceM + outdoorTotals.distanceM;
        const weeklyDistanceM =
          Number(weeklyRow?.total_distance_run_walk_m ?? NaN) ||
          (Number(weeklyRow?.total_distance_ran_m ?? 0) +
            Number(weeklyRow?.total_distance_walked_m ?? 0));
        const finalDistanceM =
          Number.isFinite(weeklyDistanceM) && weeklyDistanceM > 0
            ? weeklyDistanceM
            : fallbackDistanceM;
        setRunningDistanceM(finalDistanceM);
      } catch (err) {
        console.warn('Error loading top metrics', err);
      } finally {
        setLoadingWeights(false);
        setLoadingExercises(false);
        setLoadingRunning(false);
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

  const runningDistance = distanceUnit === 'mi'
    ? runningDistanceM / M_PER_MI
    : runningDistanceM / M_PER_KM;
  const runningUnitLabel = distanceUnit === 'mi' ? 'miles' : 'km';
  const runningValue = loadingRunning ? '—' : runningDistance.toFixed(1);
  const runningSubtitle = loadingRunning
    ? 'Loading...'
    : `${runningUnitLabel} · ${runningSessions} session${runningSessions === 1 ? '' : 's'}`;

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

      {/* Running */}
      <View style={styles.metricCard}>
        <View style={styles.metricHeaderRow}>
          <View style={[styles.metricIcon, styles.runningIcon]}>
            <Ionicons name="walk-outline" size={18} color="#C7F4FF" />
          </View>
          <Text style={styles.metricLabel}>RUNNING</Text>
        </View>
        <Text style={styles.metricValue}>{runningValue}</Text>
        <Text style={styles.metricSub}>{runningSubtitle}</Text>
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
