// app/summary/strength/[id].tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';

type Row = {
  exercise_name: string;
  vol: number | null;
  strongest_set: number | null;
  best_est_1rm: number | null;
  avg_set: number | null;
};

export default function StrengthWorkoutSummaryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [totalVol, setTotalVol] = useState<number>(0);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        // load workout total_vol
        const { data: w, error: wErr } = await supabase
          .from('strength_workouts')
          .select('total_vol')
          .eq('id', id)
          .single();
        if (!wErr && w?.total_vol != null) {
          setTotalVol(w.total_vol);
        }

        // load exercise summary joined with exercises
        const { data, error } = await supabase
          .from('exercise_summary')
          .select('vol, strongest_set, best_est_1rm, avg_set, exercises ( exercise_name )')
          .eq('strength_workout_id', id);

        if (error) throw error;

        const mapped: Row[] =
          (data ?? []).map((r: any) => ({
            exercise_name: r.exercises?.exercise_name ?? 'Exercise',
            vol: r.vol,
            strongest_set: r.strongest_set,
            best_est_1rm: r.best_est_1rm,
            avg_set: r.avg_set,
          })) ?? [];

        setRows(mapped);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Session Summary</Text>
      <Text style={styles.total}>
        Total Volume: {totalVol ? totalVol.toFixed(1) : '0.0'} kg
      </Text>

      <FlatList
        data={rows}
        keyExtractor={i => i.exercise_name}
        contentContainerStyle={{ paddingBottom: 40 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.name}>{item.exercise_name}</Text>
            <Text style={styles.meta}>
              vol {item.vol?.toFixed(1) ?? '0.0'} kg
            </Text>
            <Text style={styles.meta}>
              top set {item.strongest_set?.toFixed(1) ?? '0.0'} kg · est 1RM{' '}
              {item.best_est_1rm?.toFixed(1) ?? '0.0'} kg
            </Text>
            <Text style={styles.meta}>
              avg load {item.avg_set?.toFixed(1) ?? '0.0'} kg
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: '#0f1525',
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: '#0f1525',
    padding: 16,
  },
  title: {
    color: '#eef2ff',
    fontWeight: '800',
    fontSize: 18,
  },
  total: {
    color: '#9fb2ff',
    marginTop: 6,
    marginBottom: 10,
  },
  card: {
    backgroundColor: '#121a2e',
    borderRadius: 14,
    padding: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#2a3557',
  },
  name: {
    color: '#e7ecff',
    fontWeight: '700',
  },
  meta: {
    color: '#a0aad0',
    marginTop: 4,
    fontSize: 13,
  },
});
