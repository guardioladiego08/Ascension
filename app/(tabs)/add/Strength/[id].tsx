import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Colors } from '@/constants/Colors';
import LogoHeader from '@/components/my components/logoHeader';
import { supabase } from '@/lib/supabase';
import { useUnits } from '@/contexts/UnitsContext';

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

  const setUnit = (weightUnitCsv === 'kg' || weightUnitCsv === 'lb')
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

export default function StrengthSummaryPage() {
  const { id } = useLocalSearchParams();   // workout ID

  const [loading, setLoading] = React.useState(true);
  const [workout, setWorkout] = React.useState<any>(null);
  const [exercises, setExercises] = React.useState<any[]>([]);
  const [setsByExercise, setSetsByExercise] = React.useState<any>({});

  const { weightUnit } = useUnits(); // 👈 viewer’s preference: 'kg' | 'lb'

  React.useEffect(() => {
    (async () => {
      // 1. Load main workout row
      const { data: w } = await supabase
        .from('strength_workouts')
        .select('*')
        .eq('id', id)
        .single();

      // 2. Load exercise summaries
      const { data: s } = await supabase
        .from('exercise_summary')
        .select('*, exercises(exercise_name)')
        .eq('strength_workout_id', id);

      // 3. Load ALL sets for this workout
      const { data: sets } = await supabase
        .from('strength_sets')
        .select('*')
        .eq('strength_workout_id', id)
        .order('exercise_id', { ascending: true })
        .order('set_index', { ascending: true });

      // Group sets by exercise
      const grouped: any = {};
      sets?.forEach((st: any) => {
        if (!grouped[st.exercise_id]) grouped[st.exercise_id] = [];
        grouped[st.exercise_id].push(st);
      });

      setWorkout(w);
      setExercises(s ?? []);
      setSetsByExercise(grouped);
      setLoading(false);
    })();
  }, [id]);

  if (loading) {
    return (
      <View style={styles.loading}>
        <Text style={{ color: "#fff" }}>Loading...</Text>
      </View>
    );
  }

  // ----- Compute duration -----
  const start = workout?.started_at ? new Date(workout.started_at) : null;
  const end = workout?.ended_at ? new Date(workout.ended_at) : null;

  let durationStr = "";
  if (start && end) {
    const ms = end.getTime() - start.getTime();
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    durationStr = `${mins}m ${secs}s`;
  }

  const dateStr = end
    ? end.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
    : "";

  return (
    <View style={styles.container}>
      <LogoHeader />

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
        
        {/* --- Workout Header --- */}
        <Text style={styles.headerDate}>{dateStr}</Text>
        <Text style={styles.headerDuration}>Duration: {durationStr}</Text>

        <Text style={styles.title}>Workout Summary</Text>

        <Text style={styles.totalVol}>
          Total Volume:{' '}
          {formatFromKg(workout?.total_vol, weightUnit)}
        </Text>

        {/* ---- Per Exercise Summary ---- */}        
        {exercises.map((ex, i) => (
          <View key={i} style={styles.card}>
            <Text style={styles.exerciseName}>
              {ex.exercises?.exercise_name}
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
                    {formatSetWeight(s.weight, s.weight_unit_csv, weightUnit)}
                  </Text>
                  <Text style={styles.col}>{s.reps ?? "-"}</Text>
                  <Text style={styles.col}>{s.rpe ?? "-"}</Text>
                  <Text style={styles.col}>
                    {formatFromKg(s.est_1rm, weightUnit)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ))}

        <TouchableOpacity
          style={styles.homeBtn}
          onPress={() => router.replace('/')}
        >
          <Text style={styles.homeBtnText}>Return Home</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  loading: {
    flex: 1,
    backgroundColor: '#0f1525',
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
  homeBtn: {
    backgroundColor: Colors.dark.highlight1,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
