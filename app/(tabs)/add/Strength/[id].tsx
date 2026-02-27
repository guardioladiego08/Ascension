// app/(tabs)/add/Strength/[id].tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Colors } from '@/constants/Colors';
import LogoHeader from '@/components/my components/logoHeader';
import { supabase } from '@/lib/supabase';
import { useUnits } from '@/contexts/UnitsContext';
import { LinearGradient } from 'expo-linear-gradient';

const BG = Colors.dark.background;
const PRIMARY = Colors.dark.highlight1;

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

  const setUnit =
    weightUnitCsv === 'kg' || weightUnitCsv === 'lb'
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

type ExerciseSummaryRow = {
  exercise_id: string;
  exercise_name?: string | null;
  vol: number | null;
  strongest_set: number | null;
  best_est_1rm: number | null;
  avg_set: number | null;
};

export default function StrengthSummaryPage() {
  const { id } = useLocalSearchParams<{ id?: string }>(); // workout ID

  const [loading, setLoading] = React.useState(true);
  const [workout, setWorkout] = React.useState<any>(null);
  const [exercises, setExercises] = React.useState<ExerciseSummaryRow[]>([]);
  const [setsByExercise, setSetsByExercise] = React.useState<Record<string, any[]>>({});

  const { weightUnit } = useUnits(); // viewer’s preference: 'kg' | 'lb'

  React.useEffect(() => {
    if (!id) return;

    (async () => {
      try {
        setLoading(true);

        // 1. Load main workout row from strength schema
        const { data: w, error: wError } = await supabase
          .schema('strength')
          .from('strength_workouts')
          .select('*')
          .eq('id', id)
          .single();

        if (wError) {
          console.error('Error loading workout', wError);
          Alert.alert('Error', 'Could not load workout.');
          setLoading(false);
          return;
        }

        // 2. Load exercise summaries (no join yet)
        const { data: summaryRows, error: sError } = await supabase
          .schema('strength')
          .from('exercise_summary')
          .select(
            'exercise_id, vol, strongest_set, best_est_1rm, avg_set'
          )
          .eq('strength_workout_id', id);

        if (sError) {
          console.error('Error loading exercise_summary', sError);
        }

        const summaries = (summaryRows ?? []) as ExerciseSummaryRow[];

        // 3. Load exercise names from public.exercises for all exercise_ids
        let enrichedSummaries = summaries;
        if (summaries.length > 0) {
          const uniqueIds = Array.from(
            new Set(summaries.map((row) => row.exercise_id))
          );

          const { data: exRows, error: exError } = await supabase
            .from('exercises') // public.exercises
            .select('id, exercise_name')
            .in('id', uniqueIds);

          if (exError) {
            console.error('Error loading exercises', exError);
          }

          const nameById: Record<string, string | null> = {};
          exRows?.forEach((er: any) => {
            nameById[er.id] = er.exercise_name;
          });

          enrichedSummaries = summaries.map((row) => ({
            ...row,
            exercise_name: nameById[row.exercise_id] ?? null,
          }));
        }

        // 4. Load ALL sets for this workout from strength schema
        const { data: sets, error: setsError } = await supabase
          .schema('strength')
          .from('strength_sets')
          .select('*')
          .eq('strength_workout_id', id)
          .order('exercise_id', { ascending: true })
          .order('set_index', { ascending: true });

        if (setsError) {
          console.error('Error loading strength_sets', setsError);
        }

        // Group sets by exercise
        const grouped: Record<string, any[]> = {};
        (sets ?? []).forEach((st: any) => {
          if (!grouped[st.exercise_id]) grouped[st.exercise_id] = [];
          grouped[st.exercise_id].push(st);
        });

        setWorkout(w);
        setExercises(enrichedSummaries);
        setSetsByExercise(grouped);
      } catch (err) {
        console.error('Error loading strength summary', err);
        Alert.alert('Error', 'Could not load strength workout summary.');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // ---------- DELETE WORKOUT & RELATED DATA ----------
  const handleDeleteWorkout = () => {
    if (!id) return;

    Alert.alert(
      'Delete workout?',
      'This will permanently delete this workout and all its sets and exercise summaries. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Stats are now maintained by DB triggers on strength.strength_workouts.
              // ---- 1) Delete sets ----
              const { data: deletedSets, error: setsError } = await supabase
                .schema('strength')
                .from('strength_sets')
                .delete()
                .eq('strength_workout_id', id)
                .select('id');
              if (setsError) throw setsError;

              console.log('Deleted strength_sets rows:', deletedSets?.length ?? 0);

              // ---- 2) Delete exercise summaries ----
              const { data: deletedSummaries, error: summaryError } = await supabase
                .schema('strength')
                .from('exercise_summary')
                .delete()
                .eq('strength_workout_id', id)
                .select('id');
              if (summaryError) throw summaryError;

              console.log('Deleted exercise_summary rows:', deletedSummaries?.length ?? 0);

              // ---- 3) Delete workout header (trigger reverts stats if completed) ----
              const { data: deletedWorkouts, error: workoutError } = await supabase
                .schema('strength')
                .from('strength_workouts')
                .delete()
                .eq('id', id)
                .select('id');
              if (workoutError) throw workoutError;

              console.log('Deleted strength_workouts rows:', deletedWorkouts?.length ?? 0);

              Alert.alert('Workout deleted');
              router.replace('../../../home');
            } catch (err) {
              console.error('Error deleting workout', err);
              Alert.alert(
                'Error',
                'Could not delete workout. Check console logs for details.'
              );
            }
          }

        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <Text style={{ color: '#fff' }}>Loading...</Text>
      </View>
    );
  }

  // ----- Compute duration -----
  const start = workout?.started_at ? new Date(workout.started_at) : null;
  const end = workout?.ended_at ? new Date(workout.ended_at) : null;

  let durationStr = '';
  if (start && end) {
    const ms = end.getTime() - start.getTime();
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    durationStr = `${mins}m ${secs}s`;
  }

  const dateStr = end
    ? end.toLocaleDateString(undefined, {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

  return (
    <LinearGradient
      colors={['#3a3a3bff', '#1e1e1eff', BG]}
      start={{ x: 0.2, y: 0 }}
      end={{ x: 0.8, y: 1 }}
      style={{ flex: 1 }}
    > 
      <View style={styles.container}>
        <LogoHeader />

        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
          {/* --- Workout Header --- */}
          <Text style={styles.headerDate}>{dateStr}</Text>
          <Text style={styles.headerDuration}>Duration: {durationStr}</Text>

          <Text style={styles.title}>Workout Summary</Text>

          <Text style={styles.totalVol}>
            Total Volume: {formatFromKg(workout?.total_vol, weightUnit)}
          </Text>

          {/* ---- Per Exercise Summary ---- */}
          {exercises.length === 0 && (
            <Text style={{ color: '#9aa4bf', marginTop: 8 }}>
              No exercises logged for this workout.
            </Text>
          )}

          {exercises.map((ex, i) => (
            <View key={ex.exercise_id ?? i} style={styles.card}>
              <Text style={styles.exerciseName}>
                {ex.exercise_name ?? 'Exercise'}
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
                      {formatSetWeight(
                        s.weight,
                        s.weight_unit_csv,
                        weightUnit
                      )}
                    </Text>
                    <Text style={styles.col}>{s.reps ?? '-'}</Text>
                    <Text style={styles.col}>{s.rpe ?? '-'}</Text>
                    <Text style={styles.col}>
                      {formatFromKg(s.est_1rm, weightUnit)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ))}

          {/* DELETE + HOME BUTTONS */}
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={handleDeleteWorkout}
          >
            <Text style={styles.deleteBtnText}>Delete Workout</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.homeBtn}
            onPress={() => router.replace('/')}
          >
            <Text style={styles.homeBtnText}>Return Home</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loading: {
    flex: 1,
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

  deleteBtn: {
    borderColor: '#FF4D4F',
    borderWidth: 1,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 10,
  },
  deleteBtnText: {
    color: '#FF4D4F',
    fontWeight: '700',
    textAlign: 'center',
  },

  homeBtn: {
    borderColor: Colors.dark.highlight1,
    borderWidth: 1,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 12,
  },
  homeBtnText: {
    color: Colors.dark.highlight1,
    fontWeight: '700',
    textAlign: 'center',
  },
});
