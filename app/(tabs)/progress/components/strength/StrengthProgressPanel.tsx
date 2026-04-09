import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import MetricLineChart from '@/components/charts/MetricLineChart';
import { useUnits } from '@/contexts/UnitsContext';
import { useAppTheme } from '@/providers/AppThemeProvider';

import StrengthBadgesSection from './StrengthBadgesSection';
import StrengthMetricToggle from './StrengthMetricToggle';
import StrengthSummaryCards from './StrengthSummaryCards';
import StrengthTimelineToggle from './StrengthTimelineToggle';
import {
  STRENGTH_METRIC_OPTIONS,
  buildStrengthTimelineData,
  formatChartMetricValue,
  formatDurationDetailed,
  formatMassFromKg,
  type StrengthMetricId,
  type StrengthTimelineId,
} from './strengthProgressUtils';
import { useStrengthProgressData } from './useStrengthProgressData';

const METRIC_COLOR_TONES: Record<StrengthMetricId, 'primary' | 'secondary' | 'tertiary'> = {
  volume: 'primary',
  time: 'secondary',
  sessions: 'tertiary',
  avgVolume: 'secondary',
};

function getMetricChartColor(
  metricId: StrengthMetricId,
  colors: ReturnType<typeof useAppTheme>['colors']
) {
  switch (metricId) {
    case 'time':
      return colors.highlight2;
    case 'sessions':
      return colors.highlight3;
    case 'avgVolume':
      return colors.warning;
    case 'volume':
    default:
      return colors.highlight1;
  }
}

function formatWorkoutCount(count: number) {
  return count === 1 ? '1 workout' : `${count} workouts`;
}

export default function StrengthProgressPanel() {
  const { colors, fonts } = useAppTheme();
  const { weightUnit } = useUnits();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);

  const [metricId, setMetricId] = useState<StrengthMetricId>('volume');
  const [timelineId, setTimelineId] = useState<StrengthTimelineId>('week');

  const { activities, exerciseCount, loading, error, reload } = useStrengthProgressData();

  const timelineData = useMemo(
    () =>
      buildStrengthTimelineData({
        activities,
        metricId,
        timelineId,
      }),
    [activities, metricId, timelineId]
  );

  const activeMetric = STRENGTH_METRIC_OPTIONS.find((option) => option.id === metricId);
  const chartColor = getMetricChartColor(metricId, colors);
  const hasWorkoutsInRange = timelineData.summary.totalSessions > 0;

  const summaryItems = useMemo(
    () => [
      {
        key: 'volume',
        label: 'Total Weight',
        value: formatMassFromKg(timelineData.summary.totalVolumeKg, weightUnit, 0),
        detail: `${formatWorkoutCount(timelineData.summary.totalSessions)} in range`,
        icon: 'barbell-outline' as const,
        tone: METRIC_COLOR_TONES.volume,
      },
      {
        key: 'time',
        label: 'Total Time',
        value: formatDurationDetailed(timelineData.summary.totalDurationS),
        detail: 'Completed strength session time',
        icon: 'time-outline' as const,
        tone: METRIC_COLOR_TONES.time,
      },
      {
        key: 'avgVolume',
        label: 'Avg / Session',
        value: formatMassFromKg(timelineData.summary.avgVolumeKgPerSession, weightUnit, 0),
        detail: hasWorkoutsInRange ? 'Average total volume per workout' : 'Complete a workout to unlock averages',
        icon: 'analytics-outline' as const,
        tone: METRIC_COLOR_TONES.avgVolume,
      },
      {
        key: 'sessions',
        label: 'Sessions',
        value: String(timelineData.summary.totalSessions),
        detail: 'Completed strength workouts',
        icon: 'fitness-outline' as const,
        tone: METRIC_COLOR_TONES.sessions,
      },
    ],
    [
      hasWorkoutsInRange,
      timelineData.summary.avgVolumeKgPerSession,
      timelineData.summary.totalDurationS,
      timelineData.summary.totalSessions,
      timelineData.summary.totalVolumeKg,
      weightUnit,
    ]
  );

  return (
    <View>
      <View style={styles.headerRow}>
        <View style={styles.headerTextWrap}>
          <Text style={styles.eyebrow}>Strength analytics</Text>
          <Text style={styles.heading}>See how strength compounds over time</Text>

        </View>

        <View style={styles.rangeBadge}>
          <Text style={styles.rangeBadgeLabel}>{timelineData.rangeLabel}</Text>
          <Text style={styles.rangeBadgeValue}>
            {formatWorkoutCount(timelineData.summary.totalSessions)}
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingCard}>
          <ActivityIndicator size="small" color={colors.highlight1} />
          <Text style={styles.loadingText}>Loading strength history...</Text>
        </View>
      ) : null}

      {error ? (
        <View style={styles.errorCard}>
          <View style={styles.errorRow}>
            <Ionicons name="alert-circle-outline" size={18} color={colors.warning} />
            <Text style={styles.errorText}>{error}</Text>
          </View>

          <Pressable accessibilityRole="button" onPress={reload} style={styles.retryButton}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.chartShell}>
        <StrengthMetricToggle value={metricId} onChange={setMetricId} />

        <View style={styles.chartMetaRow}>
          <View style={styles.chartMetaCopy}>
            <Text style={styles.chartMetaTitle}>{activeMetric?.label ?? 'Metric'} trend</Text>
            <Text style={styles.chartMetaSubtitle}>
              {activeMetric?.helperText ?? 'Review the selected strength metric.'}
            </Text>
          </View>

          <Text style={styles.chartMetaRange}>{timelineData.cadenceLabel}</Text>
        </View>

        <MetricLineChart
          title={`${activeMetric?.label ?? 'Metric'} trend`}
          color={chartColor}
          points={timelineData.points}
          cardBg={colors.card3}
          textColor={colors.text}
          height={190}
          showGrid
          noOfSections={4}
          hideDataPoints={timelineData.points.length > 10}
          yPaddingRatio={metricId === 'sessions' ? 0.1 : 0.12}
          valueFormatter={(value) => formatChartMetricValue(metricId, value, weightUnit)}
          xLabelFormatter={(index) => timelineData.labelsByIndex[index] ?? ''}
        />

        <View style={styles.timelineMetaRow}>
          <Text style={styles.timelineMetaText}>
            {hasWorkoutsInRange
              ? `${formatWorkoutCount(timelineData.summary.totalSessions)} selected`
              : 'No strength workouts logged in this range yet'}
          </Text>
          <Text style={styles.timelineMetaHint}>{timelineData.rangeLabel}</Text>
        </View>

        <StrengthTimelineToggle value={timelineId} onChange={setTimelineId} />
      </View>

      <StrengthSummaryCards items={summaryItems} />
      <StrengthBadgesSection />

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/progress/strength/exercises')}
        style={styles.exercisesButton}
      >
        <View>
          <Text style={styles.exercisesLabel}>Exercise Library</Text>
          <Text style={styles.exercisesValue}>{exerciseCount} exercises</Text>
        </View>

        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </Pressable>
    </View>
  );
}

function createStyles(
  colors: ReturnType<typeof useAppTheme>['colors'],
  fonts: ReturnType<typeof useAppTheme>['fonts']
) {
  return StyleSheet.create({
    headerRow: {
      flexDirection: 'row',
      gap: 14,
      alignItems: 'flex-start',
      justifyContent: 'space-between',
    },
    headerTextWrap: {
      flex: 1,
    },
    eyebrow: {
      color: colors.highlight2,
      fontFamily: fonts.label,
      fontSize: 11,
      lineHeight: 14,
      letterSpacing: 1.1,
      textTransform: 'uppercase',
    },
    heading: {
      marginTop: 10,
      color: colors.text,
      fontFamily: fonts.display,
      fontSize: 28,
      lineHeight: 31,
      letterSpacing: -0.8,
      maxWidth: 280,
    },
    subtitle: {
      marginTop: 10,
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 14,
      lineHeight: 20,
      maxWidth: 330,
    },
    rangeBadge: {
      minWidth: 92,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card2,
      paddingHorizontal: 14,
      paddingVertical: 12,
      alignItems: 'flex-end',
    },
    rangeBadgeLabel: {
      color: colors.textMuted,
      fontFamily: fonts.label,
      fontSize: 10,
      lineHeight: 13,
      letterSpacing: 0.7,
      textTransform: 'uppercase',
    },
    rangeBadgeValue: {
      marginTop: 8,
      color: colors.text,
      fontFamily: fonts.mono,
      fontSize: 14,
      lineHeight: 18,
      textAlign: 'right',
    },
    loadingCard: {
      marginTop: 20,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card2,
      paddingHorizontal: 18,
      paddingVertical: 18,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    loadingText: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 18,
    },
    errorCard: {
      marginTop: 16,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.glowSecondary,
      backgroundColor: colors.accentSecondarySoft,
      paddingHorizontal: 16,
      paddingVertical: 14,
      gap: 12,
    },
    errorRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    errorText: {
      flex: 1,
      color: colors.text,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 18,
    },
    retryButton: {
      alignSelf: 'flex-start',
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.borderStrong,
      backgroundColor: colors.card3,
      paddingHorizontal: 14,
      paddingVertical: 9,
    },
    retryText: {
      color: colors.text,
      fontFamily: fonts.label,
      fontSize: 11,
      lineHeight: 14,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    chartShell: {
      marginTop: 18,
      borderRadius: 26,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      paddingHorizontal: 16,
      paddingVertical: 16,
      gap: 14,
    },
    chartMetaRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 10,
    },
    chartMetaCopy: {
      flex: 1,
    },
    chartMetaTitle: {
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 16,
      lineHeight: 20,
    },
    chartMetaSubtitle: {
      marginTop: 4,
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 18,
    },
    chartMetaRange: {
      color: colors.textMuted,
      fontFamily: fonts.label,
      fontSize: 10,
      lineHeight: 13,
      letterSpacing: 0.7,
      textTransform: 'uppercase',
      paddingTop: 3,
    },
    timelineMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      marginTop: -4,
    },
    timelineMetaText: {
      flex: 1,
      color: colors.text,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 18,
    },
    timelineMetaHint: {
      color: colors.textMuted,
      fontFamily: fonts.label,
      fontSize: 10,
      lineHeight: 13,
      letterSpacing: 0.65,
      textTransform: 'uppercase',
      textAlign: 'right',
    },
    exercisesButton: {
      marginTop: 18,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card2,
      paddingHorizontal: 18,
      paddingVertical: 18,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    exercisesLabel: {
      color: colors.textMuted,
      fontFamily: fonts.label,
      fontSize: 10,
      lineHeight: 13,
      letterSpacing: 0.7,
      textTransform: 'uppercase',
    },
    exercisesValue: {
      marginTop: 8,
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 17,
      lineHeight: 21,
    },
  });
}
