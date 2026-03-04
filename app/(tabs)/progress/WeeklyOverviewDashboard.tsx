import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import { Colors } from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import { useUnits } from '@/contexts/UnitsContext';
import { getAuthenticatedUserId } from '@/lib/progress/history';

type Props = {
  rangeStart: Date;
  rangeEnd: Date;
};

type StrengthMetricRow = {
  started_at: string;
  ended_at: string | null;
  total_vol: number | null;
};

type IndoorMetricRow = {
  ended_at: string | null;
  exercise_type: string;
  total_time_s: number | null;
  total_distance_m: number | null;
};

type OutdoorMetricRow = {
  ended_at: string | null;
  activity_type: string;
  duration_s: number | null;
  distance_m: number | null;
};

type NutritionMetricRow = {
  date: string;
  goal_hit: boolean | null;
  kcal_total: number | null;
  protein_g_total: number | null;
};

type WeeklyOverviewMetrics = {
  strengthSessions: number;
  strengthVolumeKg: number;
  strengthMinutes: number;
  cardioSessions: number;
  cardioDistanceM: number;
  cardioMinutes: number;
  nutritionTrackedDays: number;
  nutritionGoalHitDays: number;
  nutritionCalories: number;
  nutritionAvgProtein: number;
  activeDays: number;
  balanceScore: number;
  dayKeys: string[];
  strengthByDay: Record<string, number>;
  cardioByDay: Record<string, number>;
  nutritionByDay: Record<string, number>;
};

const M_PER_MI = 1609.344;
const M_PER_KM = 1000;
const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const STRENGTH_COLOR = '#7C83FF';
const CARDIO_COLOR = '#2DD4BF';
const NUTRITION_COLOR = '#F59E0B';

function toLocalISODate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function buildDayKeys(rangeStart: Date, rangeEnd: Date) {
  const keys: string[] = [];
  const cursor = new Date(rangeStart);
  cursor.setHours(0, 0, 0, 0);

  const end = new Date(rangeEnd);
  end.setHours(0, 0, 0, 0);

  while (cursor <= end) {
    keys.push(toLocalISODate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return keys;
}

function ensureRunWalk(value: string) {
  const normalized = value.toLowerCase();
  return normalized.includes('run') || normalized.includes('walk');
}

function formatHours(minutes: number) {
  if (minutes <= 0) return '0 hrs';
  return `${(minutes / 60).toFixed(1)} hrs`;
}

function formatDistance(distanceM: number, unit: 'mi' | 'km') {
  if (unit === 'mi') return `${(distanceM / M_PER_MI).toFixed(1)} mi`;
  return `${(distanceM / M_PER_KM).toFixed(1)} km`;
}

function getCellOpacity(value: number, maxValue: number) {
  if (value <= 0) return 0.12;
  if (maxValue <= 0) return 0.4;
  return 0.28 + Math.min(0.72, value / maxValue);
}

const EMPTY_METRICS: WeeklyOverviewMetrics = {
  strengthSessions: 0,
  strengthVolumeKg: 0,
  strengthMinutes: 0,
  cardioSessions: 0,
  cardioDistanceM: 0,
  cardioMinutes: 0,
  nutritionTrackedDays: 0,
  nutritionGoalHitDays: 0,
  nutritionCalories: 0,
  nutritionAvgProtein: 0,
  activeDays: 0,
  balanceScore: 0,
  dayKeys: [],
  strengthByDay: {},
  cardioByDay: {},
  nutritionByDay: {},
};

export default function WeeklyOverviewDashboard({
  rangeStart,
  rangeEnd,
}: Props) {
  const { distanceUnit } = useUnits();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<WeeklyOverviewMetrics>(EMPTY_METRICS);

  useEffect(() => {
    let isActive = true;

    const load = async () => {
      try {
        setLoading(true);

        const userId = await getAuthenticatedUserId();
        if (!userId) {
          if (isActive) setMetrics(EMPTY_METRICS);
          return;
        }

        const start = new Date(rangeStart);
        start.setHours(0, 0, 0, 0);
        const end = new Date(rangeEnd);
        end.setHours(23, 59, 59, 999);

        const startIso = start.toISOString();
        const endIso = end.toISOString();
        const startDate = toLocalISODate(start);
        const endDate = toLocalISODate(end);
        const dayKeys = buildDayKeys(start, end);

        const [strengthRes, indoorRes, outdoorRes, nutritionRes] = await Promise.all([
          supabase
            .schema('strength')
            .from('strength_workouts')
            .select('started_at, ended_at, total_vol')
            .eq('user_id', userId)
            .gte('started_at', startIso)
            .lte('started_at', endIso),
          supabase
            .schema('run_walk')
            .from('sessions')
            .select('ended_at, exercise_type, total_time_s, total_distance_m')
            .eq('user_id', userId)
            .eq('status', 'completed')
            .gte('ended_at', startIso)
            .lte('ended_at', endIso),
          supabase
            .schema('run_walk')
            .from('outdoor_sessions')
            .select('ended_at, activity_type, duration_s, distance_m')
            .eq('user_id', userId)
            .eq('status', 'completed')
            .gte('ended_at', startIso)
            .lte('ended_at', endIso),
          supabase
            .schema('nutrition')
            .from('diary_days')
            .select('date, goal_hit, kcal_total, protein_g_total')
            .eq('user_id', userId)
            .gte('date', startDate)
            .lte('date', endDate),
        ]);

        if (strengthRes.error) throw strengthRes.error;
        if (indoorRes.error) throw indoorRes.error;
        if (outdoorRes.error) throw outdoorRes.error;
        if (nutritionRes.error) throw nutritionRes.error;

        const strengthRows = (strengthRes.data ?? []) as StrengthMetricRow[];
        const indoorRows = ((indoorRes.data ?? []) as IndoorMetricRow[]).filter((row) =>
          ensureRunWalk(String(row.exercise_type ?? ''))
        );
        const outdoorRows = ((outdoorRes.data ?? []) as OutdoorMetricRow[]).filter((row) =>
          ensureRunWalk(String(row.activity_type ?? ''))
        );
        const nutritionRows = (nutritionRes.data ?? []) as NutritionMetricRow[];

        const strengthByDay: Record<string, number> = {};
        let strengthMinutes = 0;
        let strengthVolumeKg = 0;

        strengthRows.forEach((row) => {
          const key = toLocalISODate(new Date(row.started_at));
          strengthByDay[key] = (strengthByDay[key] ?? 0) + 1;
          strengthVolumeKg += Number(row.total_vol ?? 0);

          if (row.ended_at) {
            const startedAt = new Date(row.started_at).getTime();
            const endedAt = new Date(row.ended_at).getTime();
            if (endedAt > startedAt) {
              strengthMinutes += (endedAt - startedAt) / 60000;
            }
          }
        });

        const cardioByDay: Record<string, number> = {};
        let cardioMinutes = 0;
        let cardioDistanceM = 0;

        indoorRows.forEach((row) => {
          if (!row.ended_at) return;
          const key = toLocalISODate(new Date(row.ended_at));
          const intensity =
            Number(row.total_distance_m ?? 0) > 0
              ? Number(row.total_distance_m ?? 0)
              : Number(row.total_time_s ?? 0);
          cardioByDay[key] = (cardioByDay[key] ?? 0) + intensity;
          cardioDistanceM += Number(row.total_distance_m ?? 0);
          cardioMinutes += Number(row.total_time_s ?? 0) / 60;
        });

        outdoorRows.forEach((row) => {
          if (!row.ended_at) return;
          const key = toLocalISODate(new Date(row.ended_at));
          const intensity =
            Number(row.distance_m ?? 0) > 0
              ? Number(row.distance_m ?? 0)
              : Number(row.duration_s ?? 0);
          cardioByDay[key] = (cardioByDay[key] ?? 0) + intensity;
          cardioDistanceM += Number(row.distance_m ?? 0);
          cardioMinutes += Number(row.duration_s ?? 0) / 60;
        });

        const nutritionByDay: Record<string, number> = {};
        let nutritionCalories = 0;
        let nutritionProtein = 0;
        let nutritionGoalHitDays = 0;

        nutritionRows.forEach((row) => {
          nutritionByDay[row.date] = row.goal_hit ? 2 : 1;
          nutritionCalories += Number(row.kcal_total ?? 0);
          nutritionProtein += Number(row.protein_g_total ?? 0);
          if (row.goal_hit) nutritionGoalHitDays += 1;
        });

        const activeDays = dayKeys.filter(
          (key) =>
            (strengthByDay[key] ?? 0) > 0 ||
            (cardioByDay[key] ?? 0) > 0 ||
            (nutritionByDay[key] ?? 0) > 0
        ).length;

        const domainHits =
          Object.keys(strengthByDay).length +
          Object.keys(cardioByDay).length +
          nutritionRows.length;
        const balanceScore =
          dayKeys.length > 0 ? Math.round((domainHits / (dayKeys.length * 3)) * 100) : 0;

        if (!isActive) return;

        setMetrics({
          strengthSessions: strengthRows.length,
          strengthVolumeKg: Number(strengthVolumeKg.toFixed(0)),
          strengthMinutes: Math.round(strengthMinutes),
          cardioSessions: indoorRows.length + outdoorRows.length,
          cardioDistanceM,
          cardioMinutes: Math.round(cardioMinutes),
          nutritionTrackedDays: nutritionRows.length,
          nutritionGoalHitDays,
          nutritionCalories: Math.round(nutritionCalories),
          nutritionAvgProtein:
            nutritionRows.length > 0 ? nutritionProtein / nutritionRows.length : 0,
          activeDays,
          balanceScore,
          dayKeys,
          strengthByDay,
          cardioByDay,
          nutritionByDay,
        });
      } catch (err) {
        console.warn('Error loading weekly overview', err);
        if (isActive) setMetrics(EMPTY_METRICS);
      } finally {
        if (isActive) setLoading(false);
      }
    };

    load();

    return () => {
      isActive = false;
    };
  }, [rangeEnd, rangeStart]);

  const todayKey = toLocalISODate(new Date());
  const maxStrength = useMemo(
    () => Math.max(1, ...Object.values(metrics.strengthByDay), 0),
    [metrics.strengthByDay]
  );
  const maxCardio = useMemo(
    () => Math.max(1, ...Object.values(metrics.cardioByDay), 0),
    [metrics.cardioByDay]
  );

  if (loading) {
    return (
      <View style={styles.card}>
        <View style={styles.loadingState}>
          <ActivityIndicator size="small" color={Colors.dark.highlight1} />
          <Text style={styles.loadingText}>Building weekly overview…</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.eyebrow}>WEEK PULSE</Text>
          <Text style={styles.title}>Strength, cardio, and nutrition in one view.</Text>
        </View>

        <View style={styles.scorePill}>
          <Text style={styles.scoreValue}>{metrics.balanceScore}%</Text>
          <Text style={styles.scoreLabel}>balance</Text>
        </View>
      </View>

      <View style={styles.snapshotRow}>
        <View style={styles.snapshotCard}>
          <Text style={styles.snapshotValue}>{metrics.activeDays}</Text>
          <Text style={styles.snapshotLabel}>active days</Text>
        </View>
        <View style={styles.snapshotCard}>
          <Text style={styles.snapshotValue}>{metrics.nutritionGoalHitDays}</Text>
          <Text style={styles.snapshotLabel}>goal hits</Text>
        </View>
        <View style={styles.snapshotCard}>
          <Text style={styles.snapshotValue}>{Math.round((metrics.strengthMinutes + metrics.cardioMinutes) / 60)}</Text>
          <Text style={styles.snapshotLabel}>training hrs</Text>
        </View>
      </View>

      <View style={styles.matrixCard}>
        <View style={styles.legendRow}>
          <LegendDot color={STRENGTH_COLOR} label="Strength" />
          <LegendDot color={CARDIO_COLOR} label="Cardio" />
          <LegendDot color={NUTRITION_COLOR} label="Nutrition" />
        </View>

        <View style={styles.matrixGrid}>
          {metrics.dayKeys.map((dayKey, index) => {
            const isToday = dayKey === todayKey;
            return (
              <View
                key={dayKey}
                style={[styles.dayColumn, isToday && styles.dayColumnToday]}
              >
                <MetricCell
                  color={STRENGTH_COLOR}
                  opacity={getCellOpacity(metrics.strengthByDay[dayKey] ?? 0, maxStrength)}
                />
                <MetricCell
                  color={CARDIO_COLOR}
                  opacity={getCellOpacity(metrics.cardioByDay[dayKey] ?? 0, maxCardio)}
                />
                <MetricCell
                  color={NUTRITION_COLOR}
                  opacity={(metrics.nutritionByDay[dayKey] ?? 0) === 2 ? 1 : (metrics.nutritionByDay[dayKey] ?? 0) === 1 ? 0.45 : 0.12}
                />
                <Text style={[styles.dayLabel, isToday && styles.dayLabelToday]}>
                  {DAY_LABELS[index] ?? ''}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.domainRow}>
        <DomainSummary
          color={STRENGTH_COLOR}
          icon={<MaterialCommunityIcons name="dumbbell" size={16} color="#FFFFFF" />}
          label="Strength"
          primary={`${metrics.strengthSessions} session${metrics.strengthSessions === 1 ? '' : 's'}`}
          secondary={`${metrics.strengthVolumeKg.toLocaleString()} kg · ${formatHours(metrics.strengthMinutes)}`}
        />
        <DomainSummary
          color={CARDIO_COLOR}
          icon={<Ionicons name="walk-outline" size={16} color="#062B2A" />}
          label="Cardio"
          primary={formatDistance(metrics.cardioDistanceM, distanceUnit)}
          secondary={`${metrics.cardioSessions} session${metrics.cardioSessions === 1 ? '' : 's'} · ${Math.round(metrics.cardioMinutes)} min`}
        />
        <DomainSummary
          color={NUTRITION_COLOR}
          icon={<MaterialCommunityIcons name="food-apple-outline" size={16} color="#3F2100" />}
          label="Nutrition"
          primary={`${metrics.nutritionTrackedDays}/${metrics.dayKeys.length || 7} tracked`}
          secondary={`${metrics.nutritionCalories.toLocaleString()} kcal · ${metrics.nutritionAvgProtein.toFixed(0)}g avg protein`}
        />
      </View>
    </View>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

function MetricCell({ color, opacity }: { color: string; opacity: number }) {
  return <View style={[styles.metricCell, { backgroundColor: color, opacity }]} />;
}

function DomainSummary({
  color,
  icon,
  label,
  primary,
  secondary,
}: {
  color: string;
  icon: React.ReactNode;
  label: string;
  primary: string;
  secondary: string;
}) {
  return (
    <View style={styles.domainCard}>
      <View style={styles.domainHeader}>
        <View style={[styles.domainIcon, { backgroundColor: color }]}>{icon}</View>
        <Text style={styles.domainLabel}>{label}</Text>
      </View>
      <Text style={styles.domainPrimary}>{primary}</Text>
      <Text style={styles.domainSecondary}>{secondary}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.dark.card,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  loadingState: {
    minHeight: 240,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 8,
    color: '#9DA4C4',
    fontSize: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  eyebrow: {
    fontSize: 12,
    letterSpacing: 0.8,
    color: '#9DA4C4',
  },
  title: {
    marginTop: 6,
    maxWidth: 220,
    fontSize: 16,
    lineHeight: 22,
    color: '#E5E7F5',
    fontWeight: '600',
  },
  scorePill: {
    minWidth: 78,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: Colors.dark.card2,
    alignItems: 'center',
  },
  scoreValue: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  scoreLabel: {
    marginTop: 2,
    fontSize: 11,
    color: '#9DA4C4',
    textTransform: 'uppercase',
  },
  snapshotRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  snapshotCard: {
    flex: 1,
    backgroundColor: Colors.dark.card2,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  snapshotValue: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  snapshotLabel: {
    marginTop: 4,
    color: '#9DA4C4',
    fontSize: 11,
  },
  matrixCard: {
    marginTop: 14,
    backgroundColor: '#2E3033',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 14,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendText: {
    color: '#B8C1DF',
    fontSize: 11,
  },
  matrixGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  dayColumn: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 14,
    paddingVertical: 8,
  },
  dayColumnToday: {
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  metricCell: {
    width: '100%',
    maxWidth: 32,
    height: 18,
    borderRadius: 8,
    marginBottom: 8,
  },
  dayLabel: {
    marginTop: 2,
    color: '#7F88A6',
    fontSize: 11,
    fontWeight: '600',
  },
  dayLabelToday: {
    color: '#FFFFFF',
  },
  domainRow: {
    marginTop: 14,
    gap: 10,
  },
  domainCard: {
    backgroundColor: Colors.dark.card2,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  domainHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  domainIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  domainLabel: {
    color: '#DCE3FF',
    fontSize: 13,
    fontWeight: '600',
  },
  domainPrimary: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  domainSecondary: {
    marginTop: 4,
    color: '#9DA4C4',
    fontSize: 12,
  },
});
