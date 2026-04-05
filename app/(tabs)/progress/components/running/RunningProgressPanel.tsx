import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import MetricLineChart from '@/components/charts/MetricLineChart';
import { useUnits } from '@/contexts/UnitsContext';
import { useAppTheme } from '@/providers/AppThemeProvider';

import RunningBadgesSection from './RunningBadgesSection';
import RunningMetricToggle from './RunningMetricToggle';
import RunningSummaryCards from './RunningSummaryCards';
import RunningTimelineToggle from './RunningTimelineToggle';
import {
  RUNNING_METRIC_OPTIONS,
  buildRunningTimelineData,
  formatChartMetricValue,
  formatDistanceValue,
  formatDurationDetailed,
  formatElevationValue,
  formatPaceValue,
  type RunningMetricId,
  type RunningTimelineId,
} from './runningProgressUtils';
import { useRunningProgressData } from './useRunningProgressData';

const METRIC_COLOR_TONES: Record<RunningMetricId, 'primary' | 'secondary' | 'tertiary'> = {
  distance: 'primary',
  pace: 'secondary',
  time: 'tertiary',
  elevation: 'secondary',
};

function getMetricChartColor(
  metricId: RunningMetricId,
  colors: ReturnType<typeof useAppTheme>['colors']
) {
  switch (metricId) {
    case 'pace':
      return colors.highlight2;
    case 'time':
      return colors.highlight3;
    case 'elevation':
      return colors.warning;
    case 'distance':
    default:
      return colors.highlight1;
  }
}

function formatRunCount(count: number) {
  return count === 1 ? '1 run' : `${count} runs`;
}

export default function RunningProgressPanel() {
  const { colors, fonts } = useAppTheme();
  const { distanceUnit } = useUnits();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);

  const [metricId, setMetricId] = useState<RunningMetricId>('distance');
  const [timelineId, setTimelineId] = useState<RunningTimelineId>('week');

  const { activities, loading, error, reload } = useRunningProgressData();

  const timelineData = useMemo(
    () =>
      buildRunningTimelineData({
        activities,
        metricId,
        timelineId,
        distanceUnit,
      }),
    [activities, distanceUnit, metricId, timelineId]
  );

  const activeMetric = RUNNING_METRIC_OPTIONS.find((option) => option.id === metricId);
  const chartColor = getMetricChartColor(metricId, colors);
  const hasRunsInRange = timelineData.summary.totalActivities > 0;

  const summaryItems = useMemo(
    () => [
      {
        key: 'distance',
        label: 'Total Distance',
        value: formatDistanceValue(timelineData.summary.totalDistanceM, distanceUnit, 1),
        detail: `${formatRunCount(timelineData.summary.totalActivities)} in range`,
        icon: 'map-outline' as const,
        tone: METRIC_COLOR_TONES.distance,
      },
      {
        key: 'pace',
        label: 'Avg Pace',
        value: formatPaceValue(timelineData.summary.avgPaceSeconds, distanceUnit),
        detail: hasRunsInRange ? 'Weighted by total time and distance' : 'Complete a run to unlock pace',
        icon: 'speedometer-outline' as const,
        tone: METRIC_COLOR_TONES.pace,
      },
      {
        key: 'activities',
        label: 'Run Activities',
        value: String(timelineData.summary.totalActivities),
        detail: 'Completed running sessions',
        icon: 'fitness-outline' as const,
        tone: METRIC_COLOR_TONES.time,
      },
      {
        key: 'elevation',
        label: 'Elevation',
        value: formatElevationValue(timelineData.summary.totalElevationM, distanceUnit),
        detail: 'Total climb for the selected range',
        icon: 'trending-up-outline' as const,
        tone: METRIC_COLOR_TONES.elevation,
      },
      {
        key: 'time',
        label: 'Time Spent',
        value: formatDurationDetailed(timelineData.summary.totalDurationS),
        detail: 'Moving time across completed runs',
        icon: 'time-outline' as const,
        tone: METRIC_COLOR_TONES.time,
      },
    ],
    [
      distanceUnit,
      hasRunsInRange,
      timelineData.summary.avgPaceSeconds,
      timelineData.summary.totalActivities,
      timelineData.summary.totalDistanceM,
      timelineData.summary.totalDurationS,
      timelineData.summary.totalElevationM,
    ]
  );

  return (
    <View>
      <View style={styles.headerRow}>
        <View style={styles.headerTextWrap}>
          <Text style={styles.eyebrow}>Running analytics</Text>
          <Text style={styles.heading}>Track how each block of training moves</Text>
          <Text style={styles.subtitle}>
            Switch the chart metric up top, then change the timeline below to compare
            pace, distance, time, and elevation on the same surface.
          </Text>
        </View>

        <View style={styles.rangeBadge}>
          <Text style={styles.rangeBadgeLabel}>{timelineData.rangeLabel}</Text>
          <Text style={styles.rangeBadgeValue}>{formatRunCount(timelineData.summary.totalActivities)}</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingCard}>
          <ActivityIndicator size="small" color={colors.highlight1} />
          <Text style={styles.loadingText}>Loading completed runs...</Text>
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
        <RunningMetricToggle value={metricId} onChange={setMetricId} />

        <View style={styles.chartMetaRow}>
          <View style={styles.chartMetaCopy}>
            <Text style={styles.chartMetaTitle}>{activeMetric?.label ?? 'Metric'} trend</Text>
            <Text style={styles.chartMetaSubtitle}>
              {activeMetric?.helperText ?? 'Review the selected running metric.'}
            </Text>
          </View>

          <Text style={styles.chartMetaRange}>
            {timelineData.cadenceLabel}
          </Text>
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
          yPaddingRatio={metricId === 'pace' ? 0.04 : 0.12}
          valueFormatter={(value) => formatChartMetricValue(metricId, value, distanceUnit)}
          xLabelFormatter={(index) => timelineData.labelsByIndex[index] ?? ''}
        />

        <View style={styles.timelineMetaRow}>
          <Text style={styles.timelineMetaText}>
            {hasRunsInRange
              ? `${formatRunCount(timelineData.summary.totalActivities)} selected`
              : 'No runs logged in this range yet'}
          </Text>
          <Text style={styles.timelineMetaHint}>
            {metricId === 'pace' ? 'Lower pace is faster.' : timelineData.rangeLabel}
          </Text>
        </View>

        <RunningTimelineToggle value={timelineId} onChange={setTimelineId} />
      </View>

      <RunningSummaryCards items={summaryItems} />
      <RunningBadgesSection />
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
      color: colors.highlight1,
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
      maxWidth: 260,
    },
    subtitle: {
      marginTop: 10,
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 14,
      lineHeight: 20,
      maxWidth: 320,
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
  });
}
