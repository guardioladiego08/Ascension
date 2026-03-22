import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import MetricLineChart, { type SamplePoint } from '@/components/charts/MetricLineChart';
import { supabase } from '@/lib/supabase';
import { useUnits } from '@/contexts/UnitsContext';
import { useAppTheme } from '@/providers/AppThemeProvider';
import {
  fetchVisibleExerciseById,
  getAuthenticatedUserId,
  getExerciseBodyParts,
  type ExerciseRecord,
} from '@/lib/strength/exercises';

type StrengthSetRow = {
  id: string;
  exercise_id: string;
  strength_workout_id: string;
  weight?: number | null;
  weight_unit_csv?: string | null;
  reps?: number | null;
  est_1rm?: number | null;
  performed_at: string;
};

type ExerciseSummaryRow = {
  strength_workout_id: string;
  vol: number | null;
  best_est_1rm: number | null;
};

type WorkoutRow = {
  id: string;
  started_at: string | null;
  ended_at: string | null;
};

const LB_PER_KG = 2.20462;

function formatMassFromKg(valueKg: number, unit: 'kg' | 'lb') {
  if (unit === 'kg') return `${Math.round(valueKg)} kg`;
  return `${Math.round(valueKg * LB_PER_KG).toLocaleString()} lb`;
}

function massFromKg(valueKg: number, unit: 'kg' | 'lb') {
  if (unit === 'kg') return valueKg;
  return valueKg * LB_PER_KG;
}

function formatShortDate(value: string | null) {
  if (!value) return 'Unknown';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Unknown';
  return parsed.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

const ExerciseDetailScreen: React.FC = () => {
  const { id, name } = useLocalSearchParams<{ id?: string; name?: string }>();
  const { weightUnit } = useUnits();
  const { colors, fonts, globalStyles } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);

  const [exercise, setExercise] = useState<ExerciseRecord | null>(null);
  const [summaries, setSummaries] = useState<ExerciseSummaryRow[]>([]);
  const [sets, setSets] = useState<StrengthSetRow[]>([]);
  const [workouts, setWorkouts] = useState<WorkoutRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedStat, setSelectedStat] = useState<'sessions' | 'volume' | 'oneRM'>(
    'sessions'
  );

  useEffect(() => {
    const load = async () => {
      if (!id || Array.isArray(id)) {
        setExercise(null);
        setSummaries([]);
        setSets([]);
        setWorkouts([]);
        setLoading(false);
        setErrorMsg('No exercise ID provided.');
        return;
      }

      try {
        setLoading(true);
        setExercise(null);
        setSummaries([]);
        setSets([]);
        setWorkouts([]);
        setErrorMsg(null);

        const userId = await getAuthenticatedUserId();
        if (!userId) {
          setErrorMsg('Not signed in.');
          setLoading(false);
          return;
        }

        const exerciseData = await fetchVisibleExerciseById(userId, id);
        if (!exerciseData) {
          setErrorMsg('Exercise not found.');
          setLoading(false);
          return;
        }
        setExercise(exerciseData);

        const { data: summaryData, error: summaryErr } = await supabase
          .schema('strength')
          .from('exercise_summary')
          .select('strength_workout_id, vol, best_est_1rm')
          .eq('user_id', userId)
          .eq('exercise_id', id);

        if (summaryErr) throw summaryErr;

        const summaryRows = (summaryData ?? []) as ExerciseSummaryRow[];
        setSummaries(summaryRows);

        const workoutIds = Array.from(
          new Set(summaryRows.map((row) => row.strength_workout_id).filter(Boolean))
        );

        if (workoutIds.length === 0) {
          setSets([]);
          setWorkouts([]);
          return;
        }

        const [{ data: setData, error: setErr }, { data: workoutData, error: wkErr }] =
          await Promise.all([
            supabase
              .schema('strength')
              .from('strength_sets')
              .select(
                'id, exercise_id, strength_workout_id, weight, weight_unit_csv, reps, est_1rm, performed_at'
              )
              .eq('exercise_id', id)
              .in('strength_workout_id', workoutIds)
              .order('performed_at', { ascending: true }),
            supabase
              .schema('strength')
              .from('strength_workouts')
              .select('id, started_at, ended_at')
              .eq('user_id', userId)
              .in('id', workoutIds),
          ]);

        if (setErr) throw setErr;
        if (wkErr) throw wkErr;

        setSets((setData ?? []) as StrengthSetRow[]);
        setWorkouts((workoutData ?? []) as WorkoutRow[]);
      } catch (err) {
        console.warn('Error loading exercise detail', err);
        setErrorMsg('Error loading exercise details.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  const title = useMemo(() => {
    if (typeof name === 'string' && name.length) return name;
    if (!exercise) return 'Exercise';
    return exercise.exercise_name || 'Exercise';
  }, [name, exercise]);

  const metrics = useMemo(() => {
    if (!summaries.length && !sets.length) {
      return {
        totalSessions: 0,
        totalVolume: 0,
        avgReps: 0,
        bestOneRm: 0,
      };
    }

    const totalSessions = summaries.length;
    const totalVolume = summaries.reduce((sum, row) => sum + Number(row.vol ?? 0), 0);
    const bestOneRm = summaries.reduce(
      (best, row) => Math.max(best, Number(row.best_est_1rm ?? 0)),
      0
    );

    let totalReps = 0;
    for (const set of sets) {
      totalReps += set.reps ?? 0;
    }

    return {
      totalSessions,
      totalVolume,
      avgReps: sets.length ? totalReps / sets.length : 0,
      bestOneRm,
    };
  }, [sets, summaries]);

  const trendRows = useMemo(() => {
    const workoutMap = new Map(workouts.map((workout) => [workout.id, workout]));

    return summaries
      .map((summary) => {
        const workout = workoutMap.get(summary.strength_workout_id);
        const timestampSource = workout?.ended_at ?? workout?.started_at ?? null;
        if (!timestampSource) return null;

        const timestampMs = new Date(timestampSource).getTime();
        if (!Number.isFinite(timestampMs)) return null;

        return {
          workoutId: summary.strength_workout_id,
          timestampMs,
          timestampSeconds: Math.round(timestampMs / 1000),
          dateLabel: formatShortDate(timestampSource),
          volumeKg: Number(summary.vol ?? 0),
          oneRmKg: Number(summary.best_est_1rm ?? 0),
        };
      })
      .filter(
        (
          row
        ): row is {
          workoutId: string;
          timestampMs: number;
          timestampSeconds: number;
          dateLabel: string;
          volumeKg: number;
          oneRmKg: number;
        } => row != null
      )
      .sort((a, b) => a.timestampMs - b.timestampMs)
      .map((row, index) => ({
        ...row,
        sessionCount: index + 1,
      }));
  }, [summaries, workouts]);

  const selectedTrendPoints = useMemo<SamplePoint[]>(() => {
    return trendRows.map((row) => ({
      t: row.timestampSeconds,
      v:
        selectedStat === 'sessions'
          ? row.sessionCount
          : selectedStat === 'volume'
            ? row.volumeKg
            : row.oneRmKg,
    }));
  }, [selectedStat, trendRows]);

  const selectedTrendMeta = useMemo(() => {
    if (!trendRows.length) {
      return {
        latestValue: 'No tracked value yet',
        latestDate: null as string | null,
        peakValue: 'No tracked peak',
        peakDate: null as string | null,
      };
    }

    const metricValue = (row: (typeof trendRows)[number]) =>
      selectedStat === 'sessions'
        ? row.sessionCount
        : selectedStat === 'volume'
          ? row.volumeKg
          : row.oneRmKg;

    const formatValue = (value: number) => {
      if (selectedStat === 'sessions') return `${Math.round(value)} sessions`;
      return value > 0 ? formatMassFromKg(value, weightUnit) : '—';
    };

    const latest = trendRows[trendRows.length - 1];
    const peak = trendRows.reduce((best, row) =>
      metricValue(row) > metricValue(best) ? row : best
    );

    return {
      latestValue: formatValue(metricValue(latest)),
      latestDate: latest.dateLabel,
      peakValue: formatValue(metricValue(peak)),
      peakDate: peak.dateLabel,
    };
  }, [selectedStat, trendRows, weightUnit]);

  const selectedChartValue = useMemo(() => {
    if (selectedStat === 'sessions') return metrics.totalSessions || 0;
    if (selectedStat === 'volume') return metrics.totalVolume || 0;
    return metrics.bestOneRm || 0;
  }, [metrics.bestOneRm, metrics.totalSessions, metrics.totalVolume, selectedStat]);

  const selectedChartLabel = useMemo(() => {
    if (selectedStat === 'sessions') return `${metrics.totalSessions} sessions`;
    if (selectedStat === 'volume') {
      return metrics.totalVolume > 0
        ? formatMassFromKg(metrics.totalVolume, weightUnit)
        : 'No volume yet';
    }
    return metrics.bestOneRm > 0
      ? formatMassFromKg(metrics.bestOneRm, weightUnit)
      : 'No 1RM yet';
  }, [metrics.bestOneRm, metrics.totalSessions, metrics.totalVolume, selectedStat, weightUnit]);

  if (loading) {
    return (
      <View style={globalStyles.page}>
        <View style={[globalStyles.safeArea, styles.centered]}>
          <ActivityIndicator size="small" color={colors.highlight1} />
          <Text style={styles.stateText}>Loading exercise...</Text>
        </View>
      </View>
    );
  }

  if (errorMsg) {
    return (
      <View style={globalStyles.page}>
        <View style={[globalStyles.safeArea, styles.centered]}>
          <View style={[globalStyles.panelSoft, styles.errorCard]}>
            <Text style={styles.errorText}>{errorMsg}</Text>
            <TouchableOpacity
              style={[globalStyles.buttonSecondary, styles.retryButton]}
              onPress={() => router.back()}
            >
              <Text style={globalStyles.buttonTextSecondary}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={globalStyles.page}>
      <View style={globalStyles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={20} color={colors.text} />
            </TouchableOpacity>
            <View style={styles.headerSpacer} />
          </View>

          <View style={styles.hero}>
            <Text style={globalStyles.eyebrow}>Exercise Detail</Text>
            <Text style={globalStyles.header}>{title}</Text>
            <Text style={styles.heroText}>Detailed stats for this exercise across all logged strength sessions.</Text>

            {exercise ? (
              <View style={styles.metaRow}>
                {exercise.workout_category ? (
                  <Tag label={exercise.workout_category} styles={styles} />
                ) : null}
                {getExerciseBodyParts(exercise).map((bodyPart) => (
                  <Tag key={bodyPart} label={bodyPart} styles={styles} />
                ))}
              </View>
            ) : null}
          </View>

          <View style={styles.metricsGrid}>
            <MetricCard
              label="Sessions"
              value={String(metrics.totalSessions)}
              subtitle="times completed"
              styles={styles}
            />
            <MetricCard
              label="Volume"
              value={metrics.totalVolume > 0 ? formatMassFromKg(metrics.totalVolume, weightUnit) : '—'}
              subtitle="all time"
              styles={styles}
            />
            <MetricCard
              label="Best 1RM"
              value={metrics.bestOneRm > 0 ? formatMassFromKg(metrics.bestOneRm, weightUnit) : '—'}
              subtitle="estimated"
              styles={styles}
            />
          </View>

          <View style={styles.secondaryStatsRow}>
            <SecondaryStat
              value={String(sets.length)}
              label="Total sets"
              styles={styles}
            />
            <SecondaryStat
              value={metrics.avgReps > 0 ? metrics.avgReps.toFixed(1) : '—'}
              label="Avg reps / set"
              styles={styles}
            />
          </View>

          <View style={[globalStyles.panel, styles.chartSection]}>
            <View style={styles.chartHeader}>
              <View>
                <Text style={globalStyles.eyebrow}>Progression</Text>
                <Text style={styles.sectionTitle}>Performance summary</Text>
              </View>
              <View style={styles.chartSummaryPill}>
                <Text style={styles.chartSummaryLabel}>Latest</Text>
                <Text style={styles.chartSummaryValue}>{selectedTrendMeta.latestValue}</Text>
                {selectedTrendMeta.latestDate ? (
                  <Text style={styles.chartSummarySubvalue}>{selectedTrendMeta.latestDate}</Text>
                ) : null}
              </View>
            </View>

            <View style={styles.segmentRow}>
              <SegmentChip
                label="Sessions"
                active={selectedStat === 'sessions'}
                onPress={() => setSelectedStat('sessions')}
                styles={styles}
              />
              <SegmentChip
                label="Volume"
                active={selectedStat === 'volume'}
                onPress={() => setSelectedStat('volume')}
                styles={styles}
              />
              <SegmentChip
                label="1RM"
                active={selectedStat === 'oneRM'}
                onPress={() => setSelectedStat('oneRM')}
                styles={styles}
              />
            </View>

            {!summaries.length ? (
              <View style={styles.chartEmpty}>
                <Text style={styles.chartEmptyTitle}>No exercise data yet</Text>
                <Text style={styles.chartEmptyText}>
                  Complete more sessions with this movement to populate the progression block.
                </Text>
              </View>
            ) : (
              <>
                <MetricLineChart
                  title={
                    selectedStat === 'sessions'
                      ? 'Sessions Over Time'
                      : selectedStat === 'volume'
                        ? `Volume Over Time (${weightUnit})`
                        : `Best 1RM Over Time (${weightUnit})`
                  }
                  color={
                    selectedStat === 'sessions'
                      ? colors.highlight1
                      : selectedStat === 'volume'
                        ? colors.highlight2
                        : colors.highlight3
                  }
                  points={selectedTrendPoints}
                  cardBg={colors.card2}
                  textColor={colors.text}
                  showGrid
                  hideDataPoints={false}
                  yClampMin={0}
                  valueFormatter={(value) =>
                    selectedStat === 'sessions'
                      ? `${Math.round(value)}`
                      : `${Math.round(massFromKg(value, weightUnit)).toLocaleString()}`
                  }
                  yAxisSuffix={selectedStat === 'sessions' ? '' : ` ${weightUnit}`}
                  unitSuffix={selectedStat === 'sessions' ? undefined : weightUnit}
                  xLabelFormatter={(timestamp) =>
                    new Date(timestamp * 1000).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                    })
                  }
                />

                <View style={styles.trendMetaRow}>
                  <View style={styles.trendMetaCard}>
                    <Text style={styles.trendMetaLabel}>Latest session</Text>
                    <Text style={styles.trendMetaValue}>{selectedTrendMeta.latestValue}</Text>
                    {selectedTrendMeta.latestDate ? (
                      <Text style={styles.trendMetaSubvalue}>
                        {selectedTrendMeta.latestDate}
                      </Text>
                    ) : null}
                  </View>

                  <View style={styles.trendMetaCard}>
                    <Text style={styles.trendMetaLabel}>Peak session</Text>
                    <Text style={styles.trendMetaValue}>{selectedTrendMeta.peakValue}</Text>
                    {selectedTrendMeta.peakDate ? (
                      <Text style={styles.trendMetaSubvalue}>
                        {selectedTrendMeta.peakDate}
                      </Text>
                    ) : null}
                  </View>
                </View>
              </>
            )}
          </View>

          <View style={[globalStyles.panelSoft, styles.summaryPanel]}>
            <Text style={styles.summaryLabel}>Current focus</Text>
            <Text style={styles.summaryValue}>
              {selectedChartValue > 0 ? selectedChartLabel : 'No tracked value yet'}
            </Text>
            <Text style={styles.summaryText}>
              Use this screen to compare all-time totals above with a dated trend for
              sessions, per-workout volume, and estimated 1RM.
            </Text>
          </View>
        </ScrollView>
      </View>
    </View>
  );
};

function MetricCard({
  label,
  value,
  subtitle,
  styles,
}: {
  label: string;
  value: string;
  subtitle: string;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricSub}>{subtitle}</Text>
    </View>
  );
}

function SecondaryStat({
  value,
  label,
  styles,
}: {
  value: string;
  label: string;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.secondaryStat}>
      <Text style={styles.secondaryStatValue}>{value}</Text>
      <Text style={styles.secondaryStatLabel}>{label}</Text>
    </View>
  );
}

function Tag({
  label,
  styles,
}: {
  label: string;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.metaTag}>
      <Text style={styles.metaTagText}>{label}</Text>
    </View>
  );
}

function SegmentChip({
  label,
  active,
  onPress,
  styles,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <TouchableOpacity
      style={[styles.segmentChip, active ? styles.segmentChipActive : null]}
      onPress={onPress}
      activeOpacity={0.88}
    >
      <Text style={[styles.segmentText, active ? styles.segmentTextActive : null]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function createStyles(
  colors: ReturnType<typeof useAppTheme>['colors'],
  fonts: ReturnType<typeof useAppTheme>['fonts']
) {
  return StyleSheet.create({
    scrollContent: {
      paddingTop: 8,
      paddingBottom: 28,
      gap: 14,
    },
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: -2,
    },
    backButton: {
      width: 42,
      height: 42,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerSpacer: {
      flex: 1,
    },
    hero: {
      borderRadius: 28,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      padding: 20,
      gap: 8,
    },
    heroText: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 14,
      lineHeight: 20,
    },
    metaRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 8,
    },
    metaTag: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card2,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    metaTagText: {
      color: colors.textMuted,
      fontFamily: fonts.label,
      fontSize: 10,
      lineHeight: 12,
      letterSpacing: 0.35,
      textTransform: 'uppercase',
    },
    metricsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    metricCard: {
      width: '48%',
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card2,
      padding: 15,
    },
    metricLabel: {
      color: colors.textMuted,
      fontFamily: fonts.label,
      fontSize: 11,
      lineHeight: 13,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    },
    metricValue: {
      marginTop: 8,
      color: colors.text,
      fontFamily: fonts.display,
      fontSize: 24,
      lineHeight: 28,
      letterSpacing: -0.6,
    },
    metricSub: {
      marginTop: 5,
      color: colors.textOffSt,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 16,
    },
    secondaryStatsRow: {
      flexDirection: 'row',
      gap: 10,
    },
    secondaryStat: {
      flex: 1,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card2,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    secondaryStatValue: {
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 16,
      lineHeight: 20,
    },
    secondaryStatLabel: {
      marginTop: 4,
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 16,
    },
    chartSection: {
      gap: 16,
    },
    chartHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 12,
    },
    sectionTitle: {
      marginTop: 8,
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 22,
      lineHeight: 26,
      letterSpacing: -0.5,
    },
    chartSummaryPill: {
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.accentSoft,
      paddingHorizontal: 12,
      paddingVertical: 10,
      alignItems: 'flex-end',
    },
    chartSummaryLabel: {
      color: colors.highlight1,
      fontFamily: fonts.label,
      fontSize: 10,
      lineHeight: 12,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    },
    chartSummaryValue: {
      marginTop: 5,
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 13,
      lineHeight: 17,
    },
    chartSummarySubvalue: {
      marginTop: 3,
      color: colors.textOffSt,
      fontFamily: fonts.body,
      fontSize: 11,
      lineHeight: 14,
    },
    segmentRow: {
      flexDirection: 'row',
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card2,
      padding: 4,
      gap: 4,
    },
    segmentChip: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
      borderRadius: 14,
    },
    segmentChipActive: {
      backgroundColor: colors.highlight1,
    },
    segmentText: {
      color: colors.textMuted,
      fontFamily: fonts.label,
      fontSize: 11,
      lineHeight: 14,
      letterSpacing: 0.35,
      textTransform: 'uppercase',
    },
    segmentTextActive: {
      color: colors.blkText,
    },
    chartEmpty: {
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card2,
      paddingHorizontal: 18,
      paddingVertical: 24,
      alignItems: 'center',
    },
    chartEmptyTitle: {
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 16,
      lineHeight: 20,
      textAlign: 'center',
    },
    chartEmptyText: {
      marginTop: 8,
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 18,
      textAlign: 'center',
    },
    trendMetaRow: {
      flexDirection: 'row',
      gap: 10,
    },
    trendMetaCard: {
      flex: 1,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card2,
      paddingHorizontal: 12,
      paddingVertical: 12,
    },
    trendMetaLabel: {
      color: colors.textMuted,
      fontFamily: fonts.label,
      fontSize: 10,
      lineHeight: 12,
      letterSpacing: 0.35,
      textTransform: 'uppercase',
    },
    trendMetaValue: {
      marginTop: 6,
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 15,
      lineHeight: 19,
    },
    trendMetaSubvalue: {
      marginTop: 4,
      color: colors.textOffSt,
      fontFamily: fonts.body,
      fontSize: 11,
      lineHeight: 14,
    },
    summaryPanel: {
      gap: 8,
    },
    summaryLabel: {
      color: colors.textMuted,
      fontFamily: fonts.label,
      fontSize: 11,
      lineHeight: 13,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    },
    summaryValue: {
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 18,
      lineHeight: 22,
    },
    summaryText: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 18,
    },
    stateText: {
      marginTop: 8,
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 18,
    },
    errorCard: {
      alignItems: 'center',
      gap: 12,
      width: '100%',
    },
    errorText: {
      color: colors.danger,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 18,
      textAlign: 'center',
    },
    retryButton: {
      minWidth: 140,
    },
  });
}

export default ExerciseDetailScreen;
