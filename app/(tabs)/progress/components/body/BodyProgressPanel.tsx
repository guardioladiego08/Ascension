import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import MetricLineChart from '@/components/charts/MetricLineChart';
import { useUnits } from '@/contexts/UnitsContext';
import { useAppTheme } from '@/providers/AppThemeProvider';
import {
  computeLeanMassKg,
  formatBodyMetricDate,
  formatMassFromKg,
} from '@/lib/biometrics/utils';

import BodyMetricToggle from './BodyMetricToggle';
import BodySummaryCards from './BodySummaryCards';
import BodyTimelineToggle from './BodyTimelineToggle';
import {
  BODY_METRIC_OPTIONS,
  buildBodyTimelineData,
  formatBodyChartMetricValue,
  formatBodyMetricValue,
  formatSignedBodyMetricDelta,
  getBodyMetricDelta,
  type BodyMetricId,
  type BodyTimelineId,
} from './bodyProgressUtils';
import { useBodyProgressData } from './useBodyProgressData';

const METRIC_COLOR_TONES: Record<
  BodyMetricId,
  'primary' | 'secondary' | 'tertiary' | 'success' | 'warning'
> = {
  weight: 'primary',
  bodyFat: 'warning',
  muscle: 'secondary',
  leanMass: 'success',
};

function getMetricChartColor(
  metricId: BodyMetricId,
  colors: ReturnType<typeof useAppTheme>['colors']
) {
  switch (metricId) {
    case 'bodyFat':
      return colors.warning;
    case 'muscle':
      return colors.highlight2;
    case 'leanMass':
      return colors.success;
    case 'weight':
    default:
      return colors.highlight1;
  }
}

function formatLoggedDayCount(count: number) {
  return count === 1 ? '1 log' : `${count} logs`;
}

export default function BodyProgressPanel() {
  const { colors, fonts } = useAppTheme();
  const { weightUnit } = useUnits();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);

  const [metricId, setMetricId] = useState<BodyMetricId>('weight');
  const [timelineId, setTimelineId] = useState<BodyTimelineId>('week');

  const { entries, loading, error, reload } = useBodyProgressData();

  const timelineData = useMemo(
    () =>
      buildBodyTimelineData({
        entries,
        metricId,
        timelineId,
      }),
    [entries, metricId, timelineId]
  );

  const activeMetric = BODY_METRIC_OPTIONS.find((option) => option.id === metricId);
  const chartColor = getMetricChartColor(metricId, colors);
  const latestEntry = timelineData.summary.latestEntry;
  const hasLogsInRange = timelineData.summary.loggedDays > 0;

  const weightDelta = getBodyMetricDelta('weight', timelineData.entriesInRange);
  const bodyFatDelta = getBodyMetricDelta('bodyFat', timelineData.entriesInRange);
  const muscleDelta = getBodyMetricDelta('muscle', timelineData.entriesInRange);
  const leanMassDelta = getBodyMetricDelta('leanMass', timelineData.entriesInRange);

  const summaryItems = useMemo(
    () => [
      {
        key: 'weight',
        label: 'Latest Weight',
        value: formatBodyMetricValue('weight', latestEntry?.weightKg ?? null, weightUnit),
        detail:
          formatSignedBodyMetricDelta('weight', weightDelta, weightUnit) != null
            ? `${formatSignedBodyMetricDelta('weight', weightDelta, weightUnit)} vs range start`
            : latestEntry
              ? `Logged ${formatBodyMetricDate(latestEntry.loggedForDate)}`
              : 'Add your first body check-in',
        icon: 'scale-outline' as const,
        tone: METRIC_COLOR_TONES.weight,
      },
      {
        key: 'bodyFat',
        label: 'Body Fat',
        value: formatBodyMetricValue('bodyFat', latestEntry?.bodyFatPct ?? null, weightUnit),
        detail:
          formatSignedBodyMetricDelta('bodyFat', bodyFatDelta, weightUnit) != null
            ? `${formatSignedBodyMetricDelta('bodyFat', bodyFatDelta, weightUnit)} vs range start`
            : 'Percentage of total body weight',
        icon: 'pie-chart-outline' as const,
        tone: METRIC_COLOR_TONES.bodyFat,
      },
      {
        key: 'muscle',
        label: 'Muscle %',
        value: formatBodyMetricValue('muscle', latestEntry?.musclePct ?? null, weightUnit),
        detail:
          formatSignedBodyMetricDelta('muscle', muscleDelta, weightUnit) != null
            ? `${formatSignedBodyMetricDelta('muscle', muscleDelta, weightUnit)} vs range start`
            : 'Stored directly from your check-in',
        icon: 'body-outline' as const,
        tone: METRIC_COLOR_TONES.muscle,
      },
      {
        key: 'leanMass',
        label: 'Lean Mass',
        value: formatMassFromKg(
          computeLeanMassKg(latestEntry?.weightKg ?? null, latestEntry?.bodyFatPct ?? null),
          weightUnit,
          1
        ),
        detail:
          formatSignedBodyMetricDelta('leanMass', leanMassDelta, weightUnit) != null
            ? `${formatSignedBodyMetricDelta('leanMass', leanMassDelta, weightUnit)} vs range start`
            : 'Derived from weight and body fat',
        icon: 'barbell-outline' as const,
        tone: METRIC_COLOR_TONES.leanMass,
      },
    ],
    [
      bodyFatDelta,
      latestEntry,
      leanMassDelta,
      muscleDelta,
      weightDelta,
      weightUnit,
    ]
  );

  return (
    <View>
      <View style={styles.headerRow}>
        <View style={styles.headerTextWrap}>
          <Text style={styles.eyebrow}>Body analytics</Text>
          <Text style={styles.heading}>Track body composition over time</Text>
          <Text style={styles.subtitle}>
            Weight, body fat, muscle percentage, and derived lean mass share one trend view.
          </Text>
        </View>

        <View style={styles.rangeBadge}>
          <Text style={styles.rangeBadgeLabel}>{timelineData.rangeLabel}</Text>
          <Text style={styles.rangeBadgeValue}>
            {formatLoggedDayCount(timelineData.summary.loggedDays)}
          </Text>
          <Text style={styles.rangeBadgeSubvalue}>
            {latestEntry ? formatBodyMetricDate(latestEntry.loggedForDate) : 'No data'}
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingCard}>
          <ActivityIndicator size="small" color={colors.highlight1} />
          <Text style={styles.loadingText}>Loading body metrics...</Text>
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
        <BodyMetricToggle value={metricId} onChange={setMetricId} />

        <View style={styles.chartMetaRow}>
          <View style={styles.chartMetaCopy}>
            <Text style={styles.chartMetaTitle}>{activeMetric?.label ?? 'Metric'} trend</Text>
            <Text style={styles.chartMetaSubtitle}>
              {activeMetric?.helperText ?? 'Review the selected body metric.'}
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
          yPaddingRatio={metricId === 'weight' || metricId === 'leanMass' ? 0.06 : 0.08}
          valueFormatter={(value) => formatBodyChartMetricValue(metricId, value, weightUnit)}
          xLabelFormatter={(index) => timelineData.labelsByIndex[index] ?? ''}
        />

        <View style={styles.timelineMetaRow}>
          <Text style={styles.timelineMetaText}>
            {hasLogsInRange
              ? `${formatLoggedDayCount(timelineData.summary.loggedDays)} selected`
              : 'No body metrics logged in this range yet'}
          </Text>
          <Text style={styles.timelineMetaHint}>
            {metricId === 'leanMass' ? 'Derived from each saved entry.' : timelineData.rangeLabel}
          </Text>
        </View>

        <BodyTimelineToggle value={timelineId} onChange={setTimelineId} />
      </View>

      <BodySummaryCards items={summaryItems} />

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/progress/body/log')}
        style={styles.logButton}
      >
        <View style={styles.logButtonCopy}>
          <Text style={styles.logButtonLabel}>Log Biometrics</Text>
          <Text style={styles.logButtonValue}>
            {latestEntry
              ? `Update weight, body fat, or muscle % for ${formatBodyMetricDate(
                  latestEntry.loggedForDate
                )}`
              : 'Save your first weight, body-fat, or muscle check-in.'}
          </Text>
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
      fontVariant: ['tabular-nums'],
    },
    rangeBadgeSubvalue: {
      marginTop: 4,
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 11,
      lineHeight: 14,
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
      marginTop: 22,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card2,
      paddingHorizontal: 16,
      paddingVertical: 16,
      gap: 16,
    },
    chartMetaRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 14,
      alignItems: 'center',
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
      marginTop: 6,
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 17,
    },
    chartMetaRange: {
      color: colors.textMuted,
      fontFamily: fonts.label,
      fontSize: 10,
      lineHeight: 13,
      letterSpacing: 0.7,
      textTransform: 'uppercase',
      textAlign: 'right',
    },
    timelineMetaRow: {
      marginTop: -6,
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
      alignItems: 'center',
    },
    timelineMetaText: {
      flex: 1,
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 17,
    },
    timelineMetaHint: {
      color: colors.textMuted,
      fontFamily: fonts.label,
      fontSize: 10,
      lineHeight: 13,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      textAlign: 'right',
    },
    logButton: {
      marginTop: 18,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card2,
      paddingHorizontal: 16,
      paddingVertical: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    logButtonCopy: {
      flex: 1,
      gap: 6,
    },
    logButtonLabel: {
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 16,
      lineHeight: 20,
    },
    logButtonValue: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 18,
    },
  });
}
