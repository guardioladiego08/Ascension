// components/home/WeeklyKpiRow.tsx
import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { GlobalStyles } from '@/constants/GlobalStyles';
import { Colors } from '@/constants/Colors';
import { supabase } from '@/lib/supabase';

const TEXT_MUTED = Colors.dark.textMuted;

type WeeklySummaryRow = {
  week_start: string; // YYYY-MM-DD
  workouts_count: number;
  total_hours: number;
  total_kcal_consumed: number;
};

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function toLocalISODate(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

// Monday-start week
function getWeekStartMondayISO(d: Date) {
  const day = d.getDay(); // Sun=0..Sat=6
  const daysSinceMonday = (day + 6) % 7; // Mon=0, Tue=1, ... Sun=6
  const monday = new Date(d);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - daysSinceMonday);
  return toLocalISODate(monday);
}

function formatHours(value: number) {
  if (!Number.isFinite(value)) return '0';
  // show 1 decimal if not whole
  const rounded = Math.round(value * 10) / 10;
  return String(rounded);
}

function formatCalories(value: number) {
  if (!Number.isFinite(value)) return '0';
  const rounded = Math.round(value);
  if (rounded >= 1000) return `${Math.round(rounded / 100) / 10}k`;
  return String(rounded);
}

export default function WeeklyKpiRow() {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<WeeklySummaryRow | null>(null);

  const todayISO = useMemo(() => toLocalISODate(new Date()), []);
  const weekStartISO = useMemo(() => getWeekStartMondayISO(new Date()), []);

  useFocusEffect(
    useCallback(() => {
      const run = async () => {
        try {
          setLoading(true);

          const { data: userData, error: userError } = await supabase.auth.getUser();
          if (userError) {
            console.error('[WeeklyKpiRow] auth.getUser error:', userError);
            return;
          }
          if (!userData?.user) return;

          // Ensure a row exists for this week, then read it (RPC returns the row)
          const tz =
            Intl?.DateTimeFormat?.().resolvedOptions?.().timeZone ?? null;

          const { data: ensured, error: ensureErr } = await supabase
            .schema('user')
            .rpc('ensure_weekly_summary', {
              p_date: todayISO,
              p_timezone_str: tz,
            });

          if (ensureErr) {
            console.error('[WeeklyKpiRow] ensure_weekly_summary error:', ensureErr);
            return;
          }

          if (ensured) {
            setSummary({
              week_start: ensured.week_start,
              workouts_count: Number(ensured.workouts_count ?? 0),
              total_hours: Number(ensured.total_hours ?? 0),
              total_kcal_consumed: Number(ensured.total_kcal_consumed ?? 0),
            });
            return;
          }

          // Fallback direct select (should rarely happen)
          const { data, error } = await supabase
            .schema('user')
            .from('weekly_summary')
            .select('week_start,workouts_count,total_hours,total_kcal_consumed')
            .eq('week_start', weekStartISO)
            .maybeSingle();

          if (error && (error as any).code !== 'PGRST116') {
            console.error('[WeeklyKpiRow] select weekly_summary error:', error);
            return;
          }

          setSummary(
            data
              ? {
                  week_start: data.week_start,
                  workouts_count: Number(data.workouts_count ?? 0),
                  total_hours: Number(data.total_hours ?? 0),
                  total_kcal_consumed: Number(data.total_kcal_consumed ?? 0),
                }
              : null
          );
        } finally {
          setLoading(false);
        }
      };

      run();
    }, [todayISO, weekStartISO])
  );

  const workouts = summary?.workouts_count ?? 0;
  const hours = summary?.total_hours ?? 0;
  const calories = summary?.total_kcal_consumed ?? 0;

  return (
    <View>
      <View style={styles.headerRow}>
        <Text style={styles.subtitle}>Week of {weekStartISO}</Text>
        {loading ? <Text style={styles.subtitle}>Updating…</Text> : null}
      </View>

      <View style={styles.kpiRow}>
        <View style={GlobalStyles.kpiCard}>
          <Text style={GlobalStyles.kpiNumber}>{workouts}</Text>
          <Text style={GlobalStyles.kpiLabel}>Workouts</Text>
        </View>

        <View style={GlobalStyles.kpiCard}>
          <Text style={GlobalStyles.kpiNumber}>{formatHours(hours)}</Text>
          <Text style={GlobalStyles.kpiLabel}>Hours</Text>
        </View>

        <View style={GlobalStyles.kpiCard}>
          <Text style={GlobalStyles.kpiNumber}>{formatCalories(calories)}</Text>
          <Text style={GlobalStyles.kpiLabel}>Calories</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  subtitle: {
    color: TEXT_MUTED,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  kpiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
});
