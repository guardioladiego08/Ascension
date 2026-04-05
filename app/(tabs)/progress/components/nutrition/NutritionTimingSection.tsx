import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '@/providers/AppThemeProvider';

import NutritionDistributionBars from './NutritionDistributionBars';
import NutritionSectionHeader from './NutritionSectionHeader';
import NutritionSummaryCards from './NutritionSummaryCards';
import NutritionTimingHeatmap from './NutritionTimingHeatmap';
import {
  formatCount,
  formatGrams,
  formatPercent,
  type NutritionRangeSummary,
} from './nutritionProgressUtils';

type Props = {
  summary: NutritionRangeSummary;
};

export default function NutritionTimingSection({ summary }: Props) {
  const { colors, fonts } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);

  const timingCards = [
    {
      key: 'pre-meals',
      label: 'Pre-workout Meals',
      value: String(summary.totalPreWorkoutMeals),
      detail: 'Meals logged in the pre-workout slot',
      icon: 'flash-outline' as const,
      tone: 'primary' as const,
    },
    {
      key: 'post-meals',
      label: 'Post-workout Meals',
      value: String(summary.totalPostWorkoutMeals),
      detail: 'Meals logged in the post-workout slot',
      icon: 'refresh-outline' as const,
      tone: 'secondary' as const,
    },
    {
      key: 'pre-carbs',
      label: 'Avg Pre-workout Carbs',
      value: formatGrams(summary.avgPreWorkoutCarbsG, 0),
      detail: 'Average carbs across pre-workout meals',
      icon: 'nutrition-outline' as const,
      tone: 'tertiary' as const,
    },
    {
      key: 'post-protein',
      label: 'Avg Post-workout Protein',
      value: formatGrams(summary.avgPostWorkoutProteinG, 0),
      detail: 'Average protein across post-workout meals',
      icon: 'barbell-outline' as const,
      tone: 'success' as const,
    },
    {
      key: 'late-fuel',
      label: 'Late-fuel Ratio',
      value: formatPercent(summary.lateFuelRatioPct, 0),
      detail: 'Calories logged after 8 PM',
      icon: 'moon-outline' as const,
      tone: 'warning' as const,
    },
    {
      key: 'avg-meals',
      label: 'Meals / Day',
      value: summary.avgMealsPerDay.toFixed(1),
      detail: `${formatCount(summary.totalMeals, 'meal')} total`,
      icon: 'restaurant-outline' as const,
      tone: 'primary' as const,
    },
  ];

  return (
    <View style={styles.section}>
      <NutritionSectionHeader
        eyebrow="Timing"
        title="When you eat"
        subtitle="Use meal-slot patterns and a timing heatmap to see whether fueling is clustered around training, spread across the day, or drifting late."
      />

      <NutritionSummaryCards items={timingCards} />

      <View style={styles.block}>
        <View style={styles.blockHeader}>
          <Text style={styles.blockTitle}>Calories by meal slot</Text>
          <Text style={styles.blockHint}>Range totals by slot</Text>
        </View>
        <NutritionDistributionBars items={summary.mealSlotDistribution} />
      </View>

      <View style={styles.block}>
        <View style={styles.blockHeader}>
          <Text style={styles.blockTitle}>Timing heatmap</Text>
          <Text style={styles.blockHint}>3-hour meal frequency bins</Text>
        </View>
        <NutritionTimingHeatmap cells={summary.timingHeatmap} />
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
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 16,
      lineHeight: 20,
    },
    blockHint: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 16,
      textAlign: 'right',
    },
  });
}
