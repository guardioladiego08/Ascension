import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import { useAppTheme } from '@/providers/AppThemeProvider';
import { supabase } from '@/lib/supabase';
import { useUnits } from '@/contexts/UnitsContext';
import { fetchVisibleExerciseCount } from '@/lib/strength/exercises';

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

type NutritionDayMetricRow = {
  date: string;
  goal_hit: boolean | null;
};

type Props = {
  onExercisesPress?: () => void;
  rangeStart: Date;
  rangeEnd: Date;
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
  const day = d.getDay();
  const daysSinceMonday = (day + 6) % 7;
  const monday = new Date(d);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - daysSinceMonday);
  return toLocalISODate(monday);
}

function isRunWalk(type: string) {
  const value = (type ?? '').toLowerCase();
  return value.includes('run') || value.includes('walk');
}

const TopMetricCards: React.FC<Props> = ({
  onExercisesPress,
  rangeStart,
  rangeEnd,
}) => {
  const { colors, fonts, globalStyles } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);
  const { distanceUnit } = useUnits();

  const [weightsSessions, setWeightsSessions] = useState(0);
  const [weightsHours, setWeightsHours] = useState(0);
  const [loadingWeights, setLoadingWeights] = useState(true);

  const [exerciseCount, setExerciseCount] = useState(0);
  const [loadingExercises, setLoadingExercises] = useState(true);

  const [runningDistanceM, setRunningDistanceM] = useState(0);
  const [runningSessions, setRunningSessions] = useState(0);
  const [loadingRunning, setLoadingRunning] = useState(true);

  const [nutritionTrackedDays, setNutritionTrackedDays] = useState(0);
  const [nutritionGoalHitDays, setNutritionGoalHitDays] = useState(0);
  const [loadingNutrition, setLoadingNutrition] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoadingWeights(true);
        setLoadingExercises(true);
        setLoadingRunning(true);
        setLoadingNutrition(true);

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
          setNutritionTrackedDays(0);
          setNutritionGoalHitDays(0);
          return;
        }

        const start = new Date(rangeStart);
        start.setHours(0, 0, 0, 0);
        const end = new Date(rangeEnd);
        end.setHours(23, 59, 59, 999);
        const weekStartISO = getWeekStartMondayISO(start);

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
          return sum + Math.max(0, ended - started) / 1000 / 3600;
        }, 0);

        setWeightsSessions(sessions);
        setWeightsHours(Number(totalHours.toFixed(1)));

        setExerciseCount(await fetchVisibleExerciseCount(user.id));

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

        const nutritionPromise = supabase
          .schema('nutrition')
          .from('diary_days')
          .select('date, goal_hit')
          .eq('user_id', user.id)
          .gte('date', toLocalISODate(start))
          .lte('date', toLocalISODate(end));

        const [indoorRes, outdoorRes, weeklyRes, nutritionRes] = await Promise.all([
          indoorPromise,
          outdoorPromise,
          weeklySummaryPromise,
          nutritionPromise,
        ]);

        if (indoorRes.error) throw indoorRes.error;
        if (outdoorRes.error) throw outdoorRes.error;
        if (weeklyRes.error && weeklyRes.error.code !== '42703') throw weeklyRes.error;
        if (nutritionRes.error) throw nutritionRes.error;

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
            const milesWalked = Number(
              (legacyWeeklyRes.data as any)?.total_miles_walked ?? 0
            );
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

        const sessionDistanceM = indoorTotals.distanceM + outdoorTotals.distanceM;
        const summaryDistanceM =
          Number(weeklyRow?.total_distance_run_walk_m ?? NaN) ||
          (Number(weeklyRow?.total_distance_ran_m ?? 0) +
            Number(weeklyRow?.total_distance_walked_m ?? 0));
        const finalDistanceM =
          Number.isFinite(summaryDistanceM) && summaryDistanceM > 0
            ? summaryDistanceM
            : sessionDistanceM;

        setRunningSessions(indoorTotals.sessions + outdoorTotals.sessions);
        setRunningDistanceM(finalDistanceM);

        const nutritionRows = (nutritionRes.data ?? []) as NutritionDayMetricRow[];
        setNutritionTrackedDays(nutritionRows.length);
        setNutritionGoalHitDays(
          nutritionRows.filter((row) => Boolean(row.goal_hit)).length
        );
      } catch (error) {
        console.warn('Error loading top metrics', error);
        setWeightsSessions(0);
        setWeightsHours(0);
        setExerciseCount(0);
        setRunningDistanceM(0);
        setRunningSessions(0);
        setNutritionTrackedDays(0);
        setNutritionGoalHitDays(0);
      } finally {
        setLoadingWeights(false);
        setLoadingExercises(false);
        setLoadingRunning(false);
        setLoadingNutrition(false);
      }
    };

    fetchMetrics();
  }, [rangeEnd, rangeStart]);

  const weightsSubtitle = loadingWeights
    ? 'Loading...'
    : `${weightsSessions} session${weightsSessions === 1 ? '' : 's'} · ${weightsHours} hrs`;
  const weightsValue = loadingWeights ? '—' : String(weightsSessions || 0);

  const exercisesSubtitle = loadingExercises ? 'Loading...' : 'exercises';
  const exercisesValue = loadingExercises ? '—' : String(exerciseCount || 0);

  const runningDistance =
    distanceUnit === 'mi'
      ? runningDistanceM / M_PER_MI
      : runningDistanceM / M_PER_KM;
  const runningUnitLabel = distanceUnit === 'mi' ? 'miles' : 'km';
  const runningValue = loadingRunning ? '—' : runningDistance.toFixed(1);
  const runningSubtitle = loadingRunning
    ? 'Loading...'
    : `${runningUnitLabel} · ${runningSessions} session${runningSessions === 1 ? '' : 's'}`;

  const totalDisplayedDays = Math.max(
    1,
    Math.round((rangeEnd.getTime() - rangeStart.getTime()) / 86400000) + 1
  );

  const nutritionValue = loadingNutrition
    ? '—'
    : `${nutritionTrackedDays}/${totalDisplayedDays}`;
  const nutritionSubtitle = loadingNutrition
    ? 'Loading...'
    : nutritionGoalHitDays > 0
      ? `${nutritionGoalHitDays} goal hit${nutritionGoalHitDays === 1 ? '' : 's'}`
      : 'days tracked';

  return (
    <View style={styles.metricGrid}>
      <View style={[globalStyles.panelSoft, styles.metricCard]}>
        <View style={styles.metricHeaderRow}>
          <View style={[styles.metricIcon, { backgroundColor: colors.accentSoft }]}>
            <MaterialCommunityIcons
              name="dumbbell"
              size={18}
              color={colors.highlight1}
            />
          </View>
          <Text style={styles.metricLabel}>WEIGHTS</Text>
        </View>
        <Text style={styles.metricValue}>{weightsValue}</Text>
        <Text style={styles.metricSub}>{weightsSubtitle}</Text>
      </View>

      <View style={[globalStyles.panelSoft, styles.metricCard]}>
        <View style={styles.metricHeaderRow}>
          <View
            style={[styles.metricIcon, { backgroundColor: colors.accentSecondarySoft }]}
          >
            <Ionicons name="walk-outline" size={18} color={colors.highlight2} />
          </View>
          <Text style={styles.metricLabel}>RUNNING</Text>
        </View>
        <Text style={styles.metricValue}>{runningValue}</Text>
        <Text style={styles.metricSub}>{runningSubtitle}</Text>
      </View>

      <TouchableOpacity
        style={[globalStyles.panelSoft, styles.metricCard]}
        activeOpacity={0.85}
        onPress={onExercisesPress}
      >
        <View style={styles.metricHeaderRow}>
          <View
            style={[styles.metricIcon, { backgroundColor: colors.accentTertiarySoft }]}
          >
            <Ionicons name="list-outline" size={18} color={colors.highlight3} />
          </View>
          <Text style={styles.metricLabel}>EXERCISES</Text>
        </View>
        <Text style={styles.metricValue}>{exercisesValue}</Text>
        <Text style={styles.metricSub}>{exercisesSubtitle}</Text>
      </TouchableOpacity>

      <View style={[globalStyles.panelSoft, styles.metricCard]}>
        <View style={styles.metricHeaderRow}>
          <View style={[styles.metricIcon, { backgroundColor: colors.accentSoft }]}>
            <MaterialCommunityIcons
              name="food-apple-outline"
              size={18}
              color={colors.highlight1}
            />
          </View>
          <Text style={styles.metricLabel}>NUTRITION</Text>
        </View>
        <Text style={styles.metricValue}>{nutritionValue}</Text>
        <Text style={styles.metricSub}>{nutritionSubtitle}</Text>
      </View>
    </View>
  );
};

function createStyles(
  colors: ReturnType<typeof useAppTheme>['colors'],
  fonts: ReturnType<typeof useAppTheme>['fonts']
) {
  return StyleSheet.create({
    metricGrid: {
      marginTop: 24,
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      rowGap: 14,
    },
    metricCard: {
      width: '48%',
      minHeight: 132,
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      paddingVertical: 14,
    },
    metricHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    metricIcon: {
      width: 32,
      height: 32,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },
    metricLabel: {
      color: colors.textOffSt,
      fontFamily: fonts.label,
      fontSize: 10,
      lineHeight: 13,
      letterSpacing: 0.9,
    },
    metricValue: {
      color: colors.text,
      fontFamily: fonts.display,
      fontSize: 28,
      lineHeight: 32,
      letterSpacing: -0.9,
    },
    metricSub: {
      marginTop: 6,
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 11,
      lineHeight: 15,
    },
  });
}

export default TopMetricCards;
