import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '@/providers/AppThemeProvider';

import NutritionDistributionBars from './NutritionDistributionBars';
import NutritionGoalCalendar from './NutritionGoalCalendar';
import NutritionSectionHeader from './NutritionSectionHeader';
import NutritionSummaryCards from './NutritionSummaryCards';
import {
  formatCount,
  formatPercent,
  type NutritionDayActivity,
  type NutritionRangeSummary,
} from './nutritionProgressUtils';

type Props = {
  summary: NutritionRangeSummary;
  activities: NutritionDayActivity[];
};

export default function NutritionAdherenceSection({ summary, activities }: Props) {
  const { colors, fonts } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);

  const cards = [
    {
      key: 'goal-hit-rate',
      label: 'Goal Hit Rate',
      value: formatPercent(summary.goalHitRatePct, 0),
      detail: `${summary.goalHitDays} goal-hit days in range`,
      icon: 'checkmark-circle-outline' as const,
      tone: 'success' as const,
    },
    {
      key: 'logging-streak',
      label: 'Logging Streak',
      value: formatCount(summary.loggingStreak, 'day'),
      detail: `${summary.daysLogged} logged days total`,
      icon: 'flame-outline' as const,
      tone: 'warning' as const,
    },
    {
      key: 'full-day-rate',
      label: 'Full-day Logging',
      value: formatPercent(summary.fullDayLoggingRatePct, 0),
      detail: `${summary.fullDayLoggingDays} days with breakfast, lunch, and dinner`,
      icon: 'restaurant-outline' as const,
      tone: 'primary' as const,
    },
    {
      key: 'calorie-hit-rate',
      label: 'Calorie Target',
      value: formatPercent(summary.calorieTargetHitRatePct, 0),
      detail: `${summary.calorieTargetHitDays} target-hit days`,
      icon: 'flame-outline' as const,
      tone: 'primary' as const,
    },
    {
      key: 'protein-hit-rate',
      label: 'Protein Target',
      value: formatPercent(summary.proteinTargetHitRatePct, 0),
      detail: `${summary.proteinTargetHitDays} target-hit days`,
      icon: 'fitness-outline' as const,
      tone: 'secondary' as const,
    },
    {
      key: 'carb-hit-rate',
      label: 'Carb Target',
      value: formatPercent(summary.carbTargetHitRatePct, 0),
      detail: `${summary.carbTargetHitDays} target-hit days`,
      icon: 'flash-outline' as const,
      tone: 'tertiary' as const,
    },
  ];

  return (
    <View style={styles.section}>
      <NutritionSectionHeader
        eyebrow="Adherence"
        title="Consistency and goal adherence"
        subtitle="Use the selected range to measure logging discipline and target-hit rates, then scan the monthly calendar to see where complete days and missed fueling patterns cluster."
      />

      <NutritionSummaryCards items={cards} />

      <View style={styles.block}>
        <View style={styles.blockHeader}>
          <Text style={styles.blockTitle}>Main meal coverage</Text>
          <Text style={styles.blockHint}>
            Breakfast, lunch, dinner, and fully logged days across the active range
          </Text>
        </View>
        <NutritionDistributionBars items={summary.mealCoverageDistribution} />
      </View>

      <View style={styles.block}>
        <View style={styles.blockHeader}>
          <Text style={styles.blockTitle}>Goal calendar</Text>
          <Text style={styles.blockHint}>
            Monthly view of daily closes and partial nutrition days
          </Text>
        </View>
        <NutritionGoalCalendar activities={activities} />
      </View>
    </View>
  );
}

function createStyles(
  colors: ReturnType<typeof useAppTheme>['colors'],
  fonts: ReturnType<typeof useAppTheme>['fonts']
) {
  return StyleSheet.create({
    section: {
      marginTop: 22,
      gap: 16,
    },
    block: {
      gap: 10,
    },
    blockHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    blockTitle: {
      flex: 1,
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 16,
      lineHeight: 20,
    },
    blockHint: {
      maxWidth: 150,
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 16,
      textAlign: 'right',
    },
  });
}
