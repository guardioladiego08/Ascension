import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import MetricLineChart from '@/components/charts/MetricLineChart';
import type { WeightUnit } from '@/contexts/UnitsContext';
import { useAppTheme } from '@/providers/AppThemeProvider';

import {
  EXERCISE_TREND_METRICS,
  EXERCISE_TREND_RANGE_OPTIONS,
  buildExerciseTrendPoints,
  describeExerciseTrendSnapshot,
  filterExerciseSessionsByRange,
  formatExerciseTrendValue,
  shouldShowTrendMetric,
  type ExerciseTrendMetricId,
  type ExerciseTrendRangeId,
  type StrengthExerciseDetailModel,
} from './strengthExerciseDetailUtils';

type Props = {
  detail: StrengthExerciseDetailModel;
  weightUnit: WeightUnit;
};

export default function ExerciseTrendsTab({ detail, weightUnit }: Props) {
  const { colors, fonts } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);
  const [rangeId, setRangeId] = useState<ExerciseTrendRangeId>('year');

  const sessions = useMemo(
    () => filterExerciseSessionsByRange(detail.sessions, rangeId),
    [detail.sessions, rangeId]
  );

  const visibleMetrics = useMemo(
    () =>
      EXERCISE_TREND_METRICS.filter((metric) =>
        shouldShowTrendMetric(metric.id, sessions)
      ),
    [sessions]
  );

  return (
    <View style={styles.section}>
      <View style={styles.headerCard}>
        <Text style={styles.headerEyebrow}>Exercise trends</Text>
        <Text style={styles.headerTitle}>How this lift changes over time</Text>
        <Text style={styles.headerText}>
          Track 1RM, volume, set quality, rep output, and other graphable workout
          metrics over the selected time range.
        </Text>

        <View style={styles.rangeRow}>
          {EXERCISE_TREND_RANGE_OPTIONS.map((option) => {
            const active = option.id === rangeId;

            return (
              <Pressable
                key={option.id}
                accessibilityRole="button"
                onPress={() => setRangeId(option.id)}
                style={[styles.rangeChip, active ? styles.rangeChipActive : null]}
              >
                <Text
                  style={[styles.rangeChipText, active ? styles.rangeChipTextActive : null]}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {sessions.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No trend data in this range</Text>
          <Text style={styles.emptyText}>
            Expand the timeframe or log more workouts with this exercise to unlock
            chart history.
          </Text>
        </View>
      ) : null}

      {visibleMetrics.map((metric) => {
        const points = buildExerciseTrendPoints(metric.id, sessions);
        const snapshot = describeExerciseTrendSnapshot(metric.id, sessions, weightUnit);

        return (
          <View key={metric.id} style={styles.metricBlock}>
            <View style={styles.metricHeader}>
              <View style={styles.metricCopy}>
                <Text style={styles.metricLabel}>{metric.label}</Text>
                <Text style={styles.metricSubtitle}>{metric.subtitle}</Text>
              </View>

              <View style={styles.metricBadge}>
                <Text style={styles.metricBadgeValue}>{snapshot.latestValue}</Text>
                {snapshot.latestDate ? (
                  <Text style={styles.metricBadgeDate}>{snapshot.latestDate}</Text>
                ) : null}
              </View>
            </View>

            <MetricLineChart
              title={metric.label}
              color={getMetricColor(metric.id, colors)}
              points={points}
              cardBg={colors.card2}
              textColor={colors.text}
              height={190}
              showGrid
              noOfSections={4}
              hideDataPoints={points.length > 12}
              yPaddingRatio={metric.id === 'setCount' || metric.id === 'totalReps' ? 0.1 : 0.12}
              valueFormatter={(value) =>
                formatExerciseTrendValue(metric.id, value, weightUnit)
              }
              xLabelFormatter={(timestamp) => formatTrendXAxis(timestamp, rangeId)}
            />

            <View style={styles.metricFooter}>
              <View style={styles.footerStat}>
                <Text style={styles.footerLabel}>Latest</Text>
                <Text style={styles.footerValue}>{snapshot.latestValue}</Text>
                {snapshot.latestDate ? (
                  <Text style={styles.footerDate}>{snapshot.latestDate}</Text>
                ) : null}
              </View>

              <View style={styles.footerStat}>
                <Text style={styles.footerLabel}>Peak</Text>
                <Text style={styles.footerValue}>{snapshot.peakValue}</Text>
                {snapshot.peakDate ? (
                  <Text style={styles.footerDate}>{snapshot.peakDate}</Text>
                ) : null}
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

function formatTrendXAxis(timestampSeconds: number, rangeId: ExerciseTrendRangeId) {
  const parsed = new Date(timestampSeconds * 1000);

  return parsed.toLocaleDateString(undefined, {
    month: 'short',
    ...(rangeId === 'month' || rangeId === 'quarter' ? { day: 'numeric' } : {}),
  });
}

function getMetricColor(
  metricId: ExerciseTrendMetricId,
  colors: ReturnType<typeof useAppTheme>['colors']
) {
  switch (metricId) {
    case 'volume':
      return colors.highlight1;
    case 'strongestSet':
      return colors.warning;
    case 'avgSet':
      return colors.success;
    case 'totalReps':
      return colors.highlight3;
    case 'setCount':
      return colors.highlight2;
    case 'duration':
      return colors.success;
    case 'oneRm':
    default:
      return colors.highlight2;
  }
}

function createStyles(
  colors: ReturnType<typeof useAppTheme>['colors'],
  fonts: ReturnType<typeof useAppTheme>['fonts']
) {
  return StyleSheet.create({
    section: {
      gap: 18,
    },
    headerCard: {
      borderRadius: 24,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card2,
      paddingHorizontal: 16,
      paddingVertical: 16,
      gap: 8,
    },
    headerEyebrow: {
      color: colors.highlight2,
      fontFamily: fonts.label,
      fontSize: 11,
      lineHeight: 14,
      letterSpacing: 0.9,
      textTransform: 'uppercase',
    },
    headerTitle: {
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 20,
      lineHeight: 25,
    },
    headerText: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 19,
    },
    rangeRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginTop: 4,
    },
    rangeChip: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card3,
      paddingHorizontal: 12,
      paddingVertical: 9,
    },
    rangeChipActive: {
      borderColor: colors.borderStrong,
      backgroundColor: colors.card,
    },
    rangeChipText: {
      color: colors.textMuted,
      fontFamily: fonts.label,
      fontSize: 11,
      lineHeight: 14,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    rangeChipTextActive: {
      color: colors.text,
    },
    emptyCard: {
      borderRadius: 24,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card2,
      paddingHorizontal: 18,
      paddingVertical: 18,
      gap: 8,
    },
    emptyTitle: {
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 18,
      lineHeight: 22,
    },
    emptyText: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 19,
    },
    metricBlock: {
      gap: 10,
    },
    metricHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
    },
    metricCopy: {
      flex: 1,
    },
    metricLabel: {
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 18,
      lineHeight: 22,
    },
    metricSubtitle: {
      marginTop: 4,
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 17,
    },
    metricBadge: {
      minWidth: 88,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card2,
      paddingHorizontal: 12,
      paddingVertical: 10,
      alignItems: 'flex-end',
    },
    metricBadgeValue: {
      color: colors.text,
      fontFamily: fonts.mono,
      fontSize: 14,
      lineHeight: 18,
      fontVariant: ['tabular-nums'],
      textAlign: 'right',
    },
    metricBadgeDate: {
      marginTop: 4,
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 11,
      lineHeight: 14,
      textAlign: 'right',
    },
    metricFooter: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    footerStat: {
      flex: 1,
      minWidth: 130,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card2,
      paddingHorizontal: 12,
      paddingVertical: 12,
      gap: 3,
    },
    footerLabel: {
      color: colors.textMuted,
      fontFamily: fonts.label,
      fontSize: 10,
      lineHeight: 13,
      letterSpacing: 0.55,
      textTransform: 'uppercase',
    },
    footerValue: {
      color: colors.text,
      fontFamily: fonts.mono,
      fontSize: 15,
      lineHeight: 19,
      fontVariant: ['tabular-nums'],
    },
    footerDate: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 16,
    },
  });
}
