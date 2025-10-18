import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import LogoHeader from '@/components/my components/logoHeader';
import CardioSummaryChart from '@/components/my components/charts/CardioSummaryChart';
import moment from 'moment';
import { Colors } from '@/constants/Colors';

const ORANGE = '#FF950A';
const BG = Colors?.dark?.background ?? '#121212';

interface SetRow {
  id: string;
  workout_exercise_id: string;
  weight: number | null;
  reps: number | null;
  created_at: string;
}

export default function ExerciseDetail() {
  const { id, name } = useLocalSearchParams<{ id: string; name: string }>();
  const [loading, setLoading] = useState(true);
  const [sets, setSets] = useState<SetRow[]>([]);
  const [totalVolume, setTotalVolume] = useState(0);
  const [bestLift, setBestLift] = useState(0);
  const [chartData, setChartData] = useState<{ label: string; value: number }[]>([]);

  useEffect(() => {
    fetchExerciseData();
  }, []);

  const fetchExerciseData = async () => {
    setLoading(true);

    // 1️⃣ Get all workout_exercises linked to this exercise
    const { data: workouts, error: exErr } = await supabase
      .from('workout_exercises')
      .select('id')
      .eq('exercise_id', id);

    if (exErr) {
      console.error(exErr);
      setLoading(false);
      return;
    }

    const exIds = workouts?.map((e) => e.id);
    if (!exIds?.length) {
      setSets([]);
      setLoading(false);
      return;
    }

    // 2️⃣ Fetch all sets (now includes created_at)
    const { data: setData, error: setErr } = await supabase
      .from('sets')
      .select('id, workout_exercise_id, weight, reps, created_at')
      .in('workout_exercise_id', exIds)
      .order('created_at', { ascending: true });

    if (setErr) {
      console.error(setErr);
      setLoading(false);
      return;
    }

    setSets(setData || []);

    // 3️⃣ Calculate total volume & best lift & daily totals
    let total = 0;
    let best = 0;
    const daily: Record<string, number> = {};

    (setData || []).forEach((s) => {
      const weight = s.weight ?? 0;
      const reps = s.reps ?? 0;
      const vol = weight * reps;
      total += vol;
      best = Math.max(best, vol);
      const day = moment(s.created_at).format('YYYY-MM-DD');
      daily[day] = (daily[day] || 0) + vol;
    });

    setTotalVolume(total);
    setBestLift(best);

    // 4️⃣ Format chart data for CardioSummaryChart
    const sortedDays = Object.keys(daily).sort();
    const formatted = sortedDays.map((day) => ({
      label: day, // CardioSummaryChart expects full date strings
      value: daily[day],
    }));

    setChartData(formatted);
    setLoading(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator color={ORANGE} size="large" style={{ marginTop: 50 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <LogoHeader showBackButton />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* HEADER */}
        <Text style={styles.title}>{name}</Text>

        {/* INFO */}
        <View style={styles.infoCard}>
          <View style={styles.row}>
            <Text style={styles.label}>Total Volume</Text>
            <Text style={styles.value}>{totalVolume.toLocaleString()} lbs</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Best Lift (Weight × Reps)</Text>
            <Text style={styles.value}>{bestLift.toLocaleString()} lbs</Text>
          </View>
        </View>

        {/* CHART SECTION */}
        <Text style={styles.sectionHeader}>DAILY TOTAL VOLUME</Text>
        {chartData.length > 0 ? (
          <CardioSummaryChart
            title="Daily Total Volume"
            color={ORANGE}
            data={chartData}
            height={240}
          />
        ) : (
          <Text style={{ color: '#999', fontSize: 13, marginTop: 10 }}>
            No data yet for this exercise.
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BG,
  },
  title: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: '#2f2f2f',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  label: {
    color: '#aaa',
    fontSize: 13,
    fontWeight: '600',
  },
  value: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  sectionHeader: {
    color: ORANGE,
    fontWeight: '800',
    fontSize: 14,
    marginBottom: 6,
  },
});
