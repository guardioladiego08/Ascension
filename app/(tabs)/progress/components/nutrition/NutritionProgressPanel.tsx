import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '@/providers/AppThemeProvider';

import NutritionAdherenceSection from './NutritionAdherenceSection';
import NutritionBadgesSection from './NutritionBadgesSection';
import NutritionIntakeSection from './NutritionIntakeSection';
import NutritionPerformanceSection from './NutritionPerformanceSection';
import NutritionRepeatSection from './NutritionRepeatSection';
import NutritionSourcesSection from './NutritionSourcesSection';
import NutritionTimingSection from './NutritionTimingSection';
import {
  buildNutritionTimelineData,
  formatPercent,
  type NutritionMetricId,
  type NutritionTimelineId,
} from './nutritionProgressUtils';
import { useNutritionProgressData } from './useNutritionProgressData';

export default function NutritionProgressPanel() {
  const { colors, fonts } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);

  const [metricId, setMetricId] = useState<NutritionMetricId>('calories');
  const [timelineId, setTimelineId] = useState<NutritionTimelineId>('week');

  const { activities, entries, loading, error, reload } = useNutritionProgressData();

  const timelineData = useMemo(
    () =>
      buildNutritionTimelineData({
        activities,
        metricId,
        timelineId,
      }),
    [activities, metricId, timelineId]
  );

  const summary = timelineData.summary;

  return (
    <View>
      <View style={styles.headerRow}>
        <View style={styles.headerTextWrap}>
          <Text style={styles.eyebrow}>Nutrition analytics</Text>
          <Text style={styles.heading}>See intake, timing, and training support in one place</Text>
          <Text style={styles.subtitle}>
            Track calories, macros, adherence, meal timing, repeat behavior, and how
            your nutrition lines up with cardio and strength days without leaving the
            progress tab.
          </Text>
        </View>

        <View style={styles.rangeBadge}>
          <Text style={styles.rangeBadgeLabel}>{timelineData.rangeLabel}</Text>
          <Text style={styles.rangeBadgeValue}>{summary.daysLogged} days</Text>
          <Text style={styles.rangeBadgeSubvalue}>{formatPercent(summary.goalHitRatePct, 0)} hit</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingCard}>
          <ActivityIndicator size="small" color={colors.highlight1} />
          <Text style={styles.loadingText}>Loading nutrition history...</Text>
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

      <NutritionIntakeSection
        metricId={metricId}
        onMetricChange={setMetricId}
        timelineId={timelineId}
        onTimelineChange={setTimelineId}
        timelineData={timelineData}
      />

      <NutritionAdherenceSection summary={summary} activities={activities} />
      <NutritionTimingSection summary={summary} />
      <NutritionPerformanceSection summary={summary} />
      <NutritionSourcesSection summary={summary} />
      <NutritionRepeatSection entries={entries} timelineId={timelineId} />
      <NutritionBadgesSection />
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
  });
}
