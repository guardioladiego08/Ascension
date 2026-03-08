import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { useAppTheme } from '@/providers/AppThemeProvider';
import { supabase } from '@/lib/supabase';

type WeeklySummaryRow = {
  week_start: string;
  workouts_count: number;
  total_hours: number;
  total_kcal_consumed: number;
  total_distance_ran_m: number;
  total_distance_walked_m: number;
  total_distance_run_walk_m: number;
  total_elev_gain_m: number;
};

const M_PER_MI = 1609.344;

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function toLocalISODate(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function getWeekStartMondayISO(d: Date) {
  const day = d.getDay();
  const daysSinceMonday = (day + 6) % 7;
  const monday = new Date(d);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - daysSinceMonday);
  return toLocalISODate(monday);
}

function formatHours(value: number) {
  if (!Number.isFinite(value)) return '0';
  const rounded = Math.round(value * 10) / 10;
  return String(rounded);
}

function formatCalories(value: number) {
  if (!Number.isFinite(value)) return '0';
  const rounded = Math.round(value);
  if (rounded >= 1000) return `${Math.round(rounded / 100) / 10}k`;
  return String(rounded);
}

function formatMeters(value: number) {
  if (!Number.isFinite(value)) return '0';
  return Math.round(value).toLocaleString();
}

export default function WeeklyKpiRow() {
  const { colors, fonts, globalStyles } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);

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

          const tz = Intl?.DateTimeFormat?.().resolvedOptions?.().timeZone ?? null;

          const { error: ensureErr } = await supabase
            .schema('user')
            .rpc('ensure_weekly_summary', {
              p_date: todayISO,
              p_timezone_str: tz,
            });

          if (ensureErr) {
            console.error('[WeeklyKpiRow] ensure_weekly_summary error:', ensureErr);
            return;
          }

          let data: any = null;
          let error: any = null;

          {
            const res = await supabase
              .schema('user')
              .from('weekly_summary')
              .select(
                'week_start,workouts_count,total_hours,total_kcal_consumed,total_distance_ran_m,total_distance_walked_m,total_distance_run_walk_m,total_elev_gain_m'
              )
              .eq('week_start', weekStartISO)
              .maybeSingle();
            data = res.data;
            error = res.error;
          }

          if (error?.code === '42703') {
            const fallbackRes = await supabase
              .schema('user')
              .from('weekly_summary')
              .select(
                'week_start,workouts_count,total_hours,total_kcal_consumed,total_miles_ran,total_miles_walked,total_miles_run_walk,total_elev_gain_m'
              )
              .eq('week_start', weekStartISO)
              .maybeSingle();
            data = fallbackRes.data;
            error = fallbackRes.error;
          }

          if (error?.code === '42703') {
            const legacyRes = await supabase
              .schema('user')
              .from('weekly_summary')
              .select(
                'week_start,workouts_count,total_hours,total_kcal_consumed,total_miles_ran,total_elev_gain_m'
              )
              .eq('week_start', weekStartISO)
              .maybeSingle();
            data = legacyRes.data;
            error = legacyRes.error;
          }

          if (error && (error as any).code !== 'PGRST116') {
            console.error('[WeeklyKpiRow] select weekly_summary error:', error);
            return;
          }

          if (!data) {
            setSummary(null);
            return;
          }

          const legacyRunWalkMiles =
            data.total_miles_run_walk ??
            (Number(data.total_miles_ran ?? 0) + Number(data.total_miles_walked ?? 0));

          setSummary({
            week_start: data.week_start,
            workouts_count: Number(data.workouts_count ?? 0),
            total_hours: Number(data.total_hours ?? 0),
            total_kcal_consumed: Number(data.total_kcal_consumed ?? 0),
            total_distance_ran_m: Number(
              data.total_distance_ran_m ?? Number(data.total_miles_ran ?? 0) * M_PER_MI
            ),
            total_distance_walked_m: Number(
              data.total_distance_walked_m ?? Number(data.total_miles_walked ?? 0) * M_PER_MI
            ),
            total_distance_run_walk_m: Number(
              data.total_distance_run_walk_m ?? legacyRunWalkMiles * M_PER_MI
            ),
            total_elev_gain_m: Number(data.total_elev_gain_m ?? 0),
          });
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
  const runWalkDistanceM =
    summary?.total_distance_run_walk_m ??
    (summary?.total_distance_ran_m ?? 0) + (summary?.total_distance_walked_m ?? 0);
  const elevGainM = summary?.total_elev_gain_m ?? 0;

  return (
    <View style={[globalStyles.panel, styles.wrapper]}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.dateLabel}>Week of {weekStartISO}</Text>
          <Text style={styles.helperText}>
            Training volume synced from the weekly summary table.
          </Text>
        </View>

        <View style={styles.livePill}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>{loading ? 'Syncing' : 'Live'}</Text>
        </View>
      </View>

      <View style={styles.metricRow}>
        <MetricCard
          globalStyles={globalStyles}
          styles={styles}
          label="Workouts"
          value={String(workouts)}
        />
        <MetricCard
          globalStyles={globalStyles}
          styles={styles}
          label="Hours"
          value={formatHours(hours)}
        />
        <MetricCard
          globalStyles={globalStyles}
          styles={styles}
          label="Calories"
          value={formatCalories(calories)}
        />
      </View>

      <View style={styles.footerRow}>
        <View style={[globalStyles.panelSoft, styles.footerCard]}>
          <View style={styles.footerLabelRow}>
            <View
              style={[styles.footerDot, { backgroundColor: colors.highlight2 }]}
            />
            <Text style={styles.footerLabel}>Run + Walk</Text>
          </View>
          <Text style={styles.footerValue}>{formatMeters(runWalkDistanceM)} m</Text>
        </View>

        <View style={[globalStyles.panelSoft, styles.footerCard]}>
          <View style={styles.footerLabelRow}>
            <View
              style={[styles.footerDot, { backgroundColor: colors.highlight3 }]}
            />
            <Text style={styles.footerLabel}>Elevation</Text>
          </View>
          <Text style={styles.footerValue}>{formatMeters(elevGainM)} m</Text>
        </View>
      </View>
    </View>
  );
}

function MetricCard({
  label,
  value,
  globalStyles,
  styles,
}: {
  label: string;
  value: string;
  globalStyles: ReturnType<typeof useAppTheme>['globalStyles'];
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={[globalStyles.kpiCard, styles.metricCard]}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={globalStyles.kpiNumber}>{value}</Text>
    </View>
  );
}

function createStyles(
  colors: ReturnType<typeof useAppTheme>['colors'],
  fonts: ReturnType<typeof useAppTheme>['fonts']
) {
  return StyleSheet.create({
    wrapper: {
      gap: 16,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 12,
    },
    dateLabel: {
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 16,
      lineHeight: 20,
    },
    helperText: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 19,
      marginTop: 6,
      maxWidth: 220,
    },
    livePill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderRadius: 999,
      backgroundColor: colors.accentSecondarySoft,
      paddingVertical: 8,
      paddingHorizontal: 12,
    },
    liveDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.highlight2,
    },
    liveText: {
      color: colors.highlight2,
      fontFamily: fonts.label,
      fontSize: 12,
      lineHeight: 16,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    },
    metricRow: {
      flexDirection: 'row',
      gap: 10,
    },
    metricCard: {
      gap: 12,
    },
    metricLabel: {
      color: colors.textOffSt,
      fontFamily: fonts.label,
      fontSize: 11,
      lineHeight: 14,
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    footerRow: {
      flexDirection: 'row',
      gap: 10,
    },
    footerCard: {
      flex: 1,
      padding: 16,
    },
    footerLabelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    footerDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    footerLabel: {
      color: colors.textOffSt,
      fontFamily: fonts.label,
      fontSize: 11,
      lineHeight: 14,
      letterSpacing: 0.9,
      textTransform: 'uppercase',
    },
    footerValue: {
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 15,
      lineHeight: 20,
      marginTop: 10,
    },
  });
}
