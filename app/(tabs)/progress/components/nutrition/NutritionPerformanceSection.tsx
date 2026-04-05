import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '@/providers/AppThemeProvider';

import NutritionDistributionBars from './NutritionDistributionBars';
import NutritionSectionHeader from './NutritionSectionHeader';
import NutritionSummaryCards from './NutritionSummaryCards';
import {
  formatCalories,
  formatCount,
  formatGrams,
  formatPercent,
  type NutritionRangeSummary,
} from './nutritionProgressUtils';

type Props = {
  summary: NutritionRangeSummary;
};

export default function NutritionPerformanceSection({ summary }: Props) {
  const { colors, fonts } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);

  const cards = [
    {
      key: 'protein-consistency',
      label: 'Protein Consistency',
      value: formatPercent(summary.proteinConsistencyPct, 0),
      detail: 'Days where protein target was met',
      icon: 'fitness-outline' as const,
      tone: 'secondary' as const,
    },
    {
      key: 'carb-support',
      label: 'Carb Support',
      value: formatPercent(summary.carbSupportPct, 0),
      detail: 'Training days where carbs were on target',
      icon: 'flash-outline' as const,
      tone: 'tertiary' as const,
    },
    {
      key: 'recovery-score',
      label: 'Recovery Score',
      value: formatPercent(summary.recoveryNutritionScorePct, 0),
      detail: 'Post-workout protein + carb recovery quality',
      icon: 'refresh-outline' as const,
      tone: 'success' as const,
    },
    {
      key: 'pre-compliance',
      label: 'Pre-fuel Compliance',
      value: formatPercent(summary.preWorkoutCompliancePct, 0),
      detail: 'Training days with a usable pre-workout meal',
      icon: 'rocket-outline' as const,
      tone: 'primary' as const,
    },
    {
      key: 'post-compliance',
      label: 'Post-fuel Compliance',
      value: formatPercent(summary.postWorkoutCompliancePct, 0),
      detail: 'Training days with adequate recovery intake',
      icon: 'checkmark-done-outline' as const,
      tone: 'success' as const,
    },
    {
      key: 'underfueled',
      label: 'Under-fueled Days',
      value: String(summary.underFueledTrainingDays),
      detail: 'Training days below calorie or carb support',
      icon: 'warning-outline' as const,
      tone: 'warning' as const,
    },
    {
      key: 'macro-variance',
      label: 'Macro Variance',
      value: formatPercent(summary.macroVariancePct, 0),
      detail: 'Day-to-day macro volatility',
      icon: 'analytics-outline' as const,
      tone: 'secondary' as const,
    },
    {
      key: 'low-fiber-days',
      label: 'Low-fiber Days',
      value: String(summary.lowFiberDays),
      detail: 'Logged days under 25g fiber',
      icon: 'leaf-outline' as const,
      tone: 'warning' as const,
    },
    {
      key: 'high-sodium-days',
      label: 'High-sodium Days',
      value: String(summary.highSodiumDays),
      detail: 'Days over 2,300mg sodium',
      icon: 'water-outline' as const,
      tone: 'warning' as const,
    },
    {
      key: 'high-sugar-days',
      label: 'High-sugar Days',
      value: String(summary.highSugarDays),
      detail: 'Days over 50g sugar',
      icon: 'ice-cream-outline' as const,
      tone: 'warning' as const,
    },
    {
      key: 'training-calories',
      label: 'Training Calories',
      value: formatCalories(summary.trainingDayAvgCalories, 0),
      detail: 'Average intake on training days',
      icon: 'walk-outline' as const,
      tone: 'primary' as const,
    },
    {
      key: 'rest-calories',
      label: 'Rest Calories',
      value: formatCalories(summary.restDayAvgCalories, 0),
      detail: 'Average intake on rest days',
      icon: 'bed-outline' as const,
      tone: 'secondary' as const,
    },
    {
      key: 'training-protein',
      label: 'Training Protein',
      value: formatGrams(summary.trainingDayAvgProteinG, 0),
      detail: 'Average protein on training days',
      icon: 'barbell-outline' as const,
      tone: 'success' as const,
    },
    {
      key: 'rest-protein',
      label: 'Rest Protein',
      value: formatGrams(summary.restDayAvgProteinG, 0),
      detail: 'Average protein on rest days',
      icon: 'moon-outline' as const,
      tone: 'tertiary' as const,
    },
  ];

  return (
    <View style={styles.section}>
      <NutritionSectionHeader
        eyebrow="Performance"
        title="How nutrition supports training"
        subtitle="These metrics combine food logging with cardio and strength history so you can spot recovery gaps, under-fueled sessions, and differences between training and rest days."
      />

      <NutritionSummaryCards items={cards} />

      <View style={styles.block}>
        <View style={styles.blockHeader}>
          <Text style={styles.blockTitle}>Training day vs rest day</Text>
          <Text style={styles.blockHint}>
            {formatCount(summary.trainingDayCount, 'training day')} vs {formatCount(summary.restDayCount, 'rest day')}
          </Text>
        </View>
        <NutritionDistributionBars items={summary.trainingComparison} />
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
