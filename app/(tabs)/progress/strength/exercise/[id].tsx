import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { GlobalStyles } from '@/constants/GlobalStyles';
import LogoHeader from '@/components/my components/logoHeader';
import { supabase } from '@/lib/supabase';
import { LineChart, BarChart } from 'react-native-gifted-charts';

type DailyRow = { day: string; day_top_weight_kg: number | null; day_top_est_1rm_kg: number | null; day_volume_kg: number | null };
type WeeklyRow = { week_start: string; wk_volume_kg: number | null; wk_top_weight_kg: number | null; wk_top_est_1rm_kg: number | null };
type PRRow = { occurred_at: string; pr_type: 'top_weight_kg' | 'est_1rm_kg' | 'total_volume_kg'; value: number };

const KG_TO_LB = 2.20462262185;

export default function ExerciseDetail() {
  const params = useLocalSearchParams();
  const exerciseId = String(params.id);
  const exerciseName = String(params.name || '');

  const [loading, setLoading] = useState(true);
  const [daily, setDaily] = useState<DailyRow[]>([]);
  const [weekly, setWeekly] = useState<WeeklyRow[]>([]);
  const [prs, setPRs] = useState<PRRow[]>([]);
  const [timesPerformed, setTimesPerformed] = useState(0);

  useEffect(() => {
    let on = true;
    (async () => {
      setLoading(true);

      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes?.user?.id;

      // Daily
      const { data: d } = await supabase
        .from('v_daily_exercise')
        .select('day, day_top_weight_kg, day_top_est_1rm_kg, day_volume_kg')
        .eq('user_id', uid)
        .eq('exercise_id', exerciseId)
        .order('day', { ascending: true });

      // Weekly
      const { data: w } = await supabase
        .from('v_weekly_exercise')
        .select('week_start, wk_volume_kg, wk_top_weight_kg, wk_top_est_1rm_kg')
        .eq('user_id', uid)
        .eq('exercise_id', exerciseId)
        .order('week_start', { ascending: true });

      // PRs
      const { data: p } = await supabase
        .from('strength_prs')
        .select('occurred_at, pr_type, value')
        .eq('user_id', uid)
        .eq('exercise_id', exerciseId)
        .order('occurred_at', { ascending: true });

      if (!on) return;

      setDaily(d || []);
      setWeekly(w || []);
      setPRs(p || []);

      // Times performed = distinct days with any sets for this exercise
      const times = new Set((d || []).map(r => r.day)).size;
      setTimesPerformed(times);

      setLoading(false);
    })();
    return () => { on = false; };
  }, [exerciseId]);

  const totalVolumeLb = useMemo(() => {
    const kg = (daily || []).reduce((sum, r) => sum + (r.day_volume_kg || 0), 0);
    return kg * KG_TO_LB;
  }, [daily]);

  const latestPRs = useMemo(() => {
    const bestWeight = [...(prs || [])]
      .filter(p => p.pr_type === 'top_weight_kg')
      .reduce((a, b) => (b.value > (a?.value ?? -1) ? b : a), null as PRRow | null);
    const best1RM = [...(prs || [])]
      .filter(p => p.pr_type === 'est_1rm_kg')
      .reduce((a, b) => (b.value > (a?.value ?? -1) ? b : a), null as PRRow | null);
    return {
      topWeightLb: bestWeight ? bestWeight.value * KG_TO_LB : null,
      topWeightDate: bestWeight ? bestWeight.occurred_at : null,
      est1RMLb: best1RM ? best1RM.value * KG_TO_LB : null,
      est1RMDate: best1RM ? best1RM.occurred_at : null,
    };
  }, [prs]);

  // Chart datasets
  const lineTopWeight = (daily || [])
    .filter(r => r.day_top_weight_kg != null)
    .map(r => ({
      value: Number((r.day_top_weight_kg! * KG_TO_LB).toFixed(1)),
      label: new Date(r.day).toLocaleDateString(),
    }));

  const lineEst1RM = (daily || [])
    .filter(r => r.day_top_est_1rm_kg != null)
    .map(r => ({
      value: Number((r.day_top_est_1rm_kg! * KG_TO_LB).toFixed(1)),
      label: new Date(r.day).toLocaleDateString(),
    }));

  const weeklyBars = (weekly || []).map(r => ({
    value: Number(((r.wk_volume_kg || 0) * KG_TO_LB).toFixed(0)),
    label: new Date(r.week_start).toLocaleDateString(),
  }));

  return (
    <View style={GlobalStyles.safeArea}>
      <LogoHeader showBackButton />
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }}>
        <Text style={styles.title}>{exerciseName}</Text>

        {loading ? (
          <ActivityIndicator />
        ) : (
          <>
            {/* Overview */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Overview</Text>

              <View style={styles.row}>
                <View style={styles.kpi}>
                  <Text style={styles.kpiLabel}>Total Volume</Text>
                  <Text style={styles.kpiValue}>{Math.round(totalVolumeLb).toLocaleString()} lb</Text>
                </View>
                <View style={styles.kpi}>
                  <Text style={styles.kpiLabel}>Times Performed</Text>
                  <Text style={styles.kpiValue}>{timesPerformed}</Text>
                </View>
              </View>

              <View style={[styles.row, { marginTop: 8 }]}>
                <View style={styles.kpi}>
                  <Text style={styles.kpiLabel}>Top Set PR</Text>
                  <Text style={styles.kpiValue}>
                    {latestPRs.topWeightLb ? `${latestPRs.topWeightLb.toFixed(1)} lb` : '—'}
                  </Text>
                  <Text style={styles.kpiSub}>
                    {latestPRs.topWeightDate ? new Date(latestPRs.topWeightDate).toLocaleDateString() : ''}
                  </Text>
                </View>
                <View style={styles.kpi}>
                  <Text style={styles.kpiLabel}>Est. 1RM PR</Text>
                  <Text style={styles.kpiValue}>
                    {latestPRs.est1RMLb ? `${latestPRs.est1RMLb.toFixed(1)} lb` : '—'}
                  </Text>
                  <Text style={styles.kpiSub}>
                    {latestPRs.est1RMDate ? new Date(latestPRs.est1RMDate).toLocaleDateString() : ''}
                  </Text>
                </View>
              </View>
            </View>

            {/* Charts */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Top Set Weight (lb)</Text>
              <LineChart
                data={lineTopWeight}
                thickness={2}
                hideDataPoints={false}
                spacing={36}
                yAxisTextStyle={styles.axis}
                xAxisLabelTextStyle={styles.axis}
                hideRules
              />
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Estimated 1RM (lb)</Text>
              <LineChart
                data={lineEst1RM}
                thickness={2}
                hideDataPoints={false}
                spacing={36}
                yAxisTextStyle={styles.axis}
                xAxisLabelTextStyle={styles.axis}
                hideRules
              />
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Weekly Volume (lb)</Text>
              <BarChart
                data={weeklyBars}
                barWidth={16}
                spacing={24}
                xAxisLabelTextStyle={styles.axis}
                yAxisTextStyle={styles.axis}
                hideRules
              />
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { color: Colors.dark.text, fontSize: 20, fontWeight: '700', marginBottom: 12 },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder ?? '#2A2A2A',
    backgroundColor: Colors.dark.card ?? '#1A1A1A',
    padding: 14,
    marginTop: 12,
  },
  sectionTitle: { color: Colors.dark.text, fontSize: 16, fontWeight: '700', marginBottom: 10 },
  row: { flexDirection: 'row', gap: 12 },
  kpi: { flex: 1, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: Colors.dark.cardBorder ?? '#2A2A2A' },
  kpiLabel: { color: Colors.dark.subText ?? '#A5A5A5', fontSize: 12 },
  kpiValue: { color: Colors.dark.text, fontSize: 18, fontWeight: '700' },
  kpiSub: { color: Colors.dark.subText ?? '#A5A5A5', fontSize: 12, marginTop: 2 },
  axis: { color: Colors.dark.subText ?? '#A5A5A5', fontSize: 10 },
});
