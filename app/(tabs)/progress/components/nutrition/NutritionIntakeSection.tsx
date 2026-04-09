import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import MetricLineChart from '@/components/charts/MetricLineChart';
import { useAppTheme } from '@/providers/AppThemeProvider';

import NutritionDistributionBars from './NutritionDistributionBars';
import NutritionMetricToggle from './NutritionMetricToggle';
import NutritionSectionHeader from './NutritionSectionHeader';
import NutritionSummaryCards from './NutritionSummaryCards';
import NutritionTimelineToggle from './NutritionTimelineToggle';
import {
  NUTRITION_METRIC_OPTIONS,
  formatCalories,
  formatCount,
  formatGrams,
  formatNutritionChartValue,
  formatPercent,
  formatSodium,
  type NutritionMetricId,
  type NutritionTimelineData,
  type NutritionTimelineId,
} from './nutritionProgressUtils';

type Props = {
  metricId: NutritionMetricId;
  onMetricChange: (metricId: NutritionMetricId) => void;
  timelineId: NutritionTimelineId;
  onTimelineChange: (timelineId: NutritionTimelineId) => void;
  timelineData: NutritionTimelineData;
};

export default function NutritionIntakeSection({
  metricId,
  onMetricChange,
  timelineId,
  onTimelineChange,
  timelineData,
}: Props) {
  const { colors, fonts } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);

  const activeMetric = NUTRITION_METRIC_OPTIONS.find((option) => option.id === metricId);
  const summary = timelineData.summary;

  const snapshotItems = [
    {
      key: 'calories',
      label: 'Avg Calories',
      value: formatCalories(summary.avgCalories, 0),
      detail: 'Average intake per logged day',
      icon: 'flame-outline' as const,
      tone: 'primary' as const,
    },
    {
      key: 'protein',
      label: 'Avg Protein',
      value: formatGrams(summary.avgProteinG, 0),
      detail: 'Average protein per logged day',
      icon: 'fitness-outline' as const,
      tone: 'secondary' as const,
    },
    {
      key: 'carbs',
      label: 'Avg Carbs',
      value: formatGrams(summary.avgCarbsG, 0),
      detail: 'Average carbohydrate intake',
      icon: 'flash-outline' as const,
      tone: 'tertiary' as const,
    },
    {
      key: 'fat',
      label: 'Avg Fat',
      value: formatGrams(summary.avgFatG, 0),
      detail: 'Average fats per logged day',
      icon: 'water-outline' as const,
      tone: 'warning' as const,
    },
    {
      key: 'goal-hit-days',
      label: 'Goal Hit Days',
      value: String(summary.goalHitDays),
      detail: 'Nutrition goal days completed',
      icon: 'checkmark-circle-outline' as const,
      tone: 'success' as const,
    },
    {
      key: 'goal-hit-rate',
      label: 'Goal Hit Rate',
      value: formatPercent(summary.goalHitRatePct, 0),
      detail: 'Share of logged days that closed nutrition goals',
      icon: 'ribbon-outline' as const,
      tone: 'success' as const,
    },
    {
      key: 'days-logged',
      label: 'Days Logged',
      value: String(summary.daysLogged),
      detail: 'Days with nutrition data in range',
      icon: 'calendar-outline' as const,
      tone: 'primary' as const,
    },
    {
      key: 'logging-streak',
      label: 'Logging Streak',
      value: formatCount(summary.loggingStreak, 'day'),
      detail: 'Current consecutive logged-day streak',
      icon: 'flame-outline' as const,
      tone: 'warning' as const,
    },
    {
      key: 'total-meals',
      label: 'Total Meals',
      value: String(summary.totalMeals),
      detail: 'All meals logged in range',
      icon: 'restaurant-outline' as const,
      tone: 'tertiary' as const,
    },
    {
      key: 'avg-meals',
      label: 'Meals / Day',
      value: summary.avgMealsPerDay.toFixed(1),
      detail: 'Average meals per logged day',
      icon: 'time-outline' as const,
      tone: 'tertiary' as const,
    },
  ];

  const macroCompositionItems = [
    {
      key: 'protein-share',
      label: 'Protein share',
      value: summary.macroComposition.proteinPct,
      valueLabel: formatPercent(summary.macroComposition.proteinPct, 0),
      detail: formatCalories(summary.macroComposition.proteinCalories, 0),
      tone: 'secondary' as const,
    },
    {
      key: 'carb-share',
      label: 'Carb share',
      value: summary.macroComposition.carbsPct,
      valueLabel: formatPercent(summary.macroComposition.carbsPct, 0),
      detail: formatCalories(summary.macroComposition.carbsCalories, 0),
      tone: 'tertiary' as const,
    },
    {
      key: 'fat-share',
      label: 'Fat share',
      value: summary.macroComposition.fatPct,
      valueLabel: formatPercent(summary.macroComposition.fatPct, 0),
      detail: formatCalories(summary.macroComposition.fatCalories, 0),
      tone: 'warning' as const,
    },
  ];

  return (
    <View style={styles.section}>
      <NutritionSectionHeader
        eyebrow="Intake"
        title="Daily intake and adherence"
      />

      <View style={styles.chartShell}>
        <NutritionMetricToggle value={metricId} onChange={onMetricChange} />

        <View style={styles.chartMetaRow}>
          <View style={styles.chartMetaCopy}>
            <Text style={styles.chartMetaTitle}>{activeMetric?.label ?? 'Metric'} trend</Text>
            <Text style={styles.chartMetaSubtitle}>
              {activeMetric?.helperText ?? 'Review the selected nutrition metric.'}
            </Text>
          </View>

          <View style={styles.rangeBadge}>
            <Text style={styles.rangeBadgeLabel}>{timelineData.rangeLabel}</Text>
            <Text style={styles.rangeBadgeValue}>
              {formatCount(summary.daysLogged, 'day')}
            </Text>
          </View>
        </View>

        <MetricLineChart
          title={`${activeMetric?.label ?? 'Metric'} trend`}
          color={getMetricColor(metricId, colors)}
          points={timelineData.points}
          cardBg={colors.card3}
          textColor={colors.text}
          height={190}
          showGrid
          noOfSections={4}
          hideDataPoints={timelineData.points.length > 10}
          yPaddingRatio={metricId === 'goalHit' ? 0.1 : 0.12}
          valueFormatter={(value) => formatNutritionChartValue(metricId, value)}
          xLabelFormatter={(index) => timelineData.labelsByIndex[index] ?? ''}
        />

        <View style={styles.chartFooter}>
          <Text style={styles.chartFooterText}>
            {metricId === 'goalHit'
              ? `${formatPercent(summary.goalHitRatePct, 0)} of logged days hit nutrition goals`
              : `${formatCount(summary.totalMeals, 'meal')} across ${formatCount(summary.daysLogged, 'logged day')}`}
          </Text>
          <Text style={styles.chartFooterHint}>{timelineData.cadenceLabel}</Text>
        </View>

        <NutritionTimelineToggle value={timelineId} onChange={onTimelineChange} />
      </View>

      <NutritionSummaryCards items={snapshotItems} />

      <View style={styles.subsection}>
        <View style={styles.subsectionHeader}>
          <Text style={styles.subsectionTitle}>Macro composition</Text>
          <Text style={styles.subsectionHint}>Calorie share from protein, carbs, and fat</Text>
        </View>
        <NutritionDistributionBars items={macroCompositionItems} />
      </View>
    </View>
  );
}

function getMetricColor(
  metricId: NutritionMetricId,
  colors: ReturnType<typeof useAppTheme>['colors']
) {
  switch (metricId) {
    case 'protein':
      return colors.highlight2;
    case 'carbs':
      return colors.highlight3;
    case 'fat':
      return colors.warning;
    case 'fiber':
      return colors.success;
    case 'sodium':
      return colors.warning;
    case 'sugar':
      return colors.highlight3;
    case 'meals':
      return colors.highlight2;
    case 'goalHit':
      return colors.success;
    case 'calories':
    default:
      return colors.highlight1;
  }
}

function createStyles(
  colors: ReturnType<typeof useAppTheme>['colors'],
  fonts: ReturnType<typeof useAppTheme>['fonts']
) {
  return StyleSheet.create({
    section: {
      gap: 1,
    },
    chartShell: {
      borderRadius: 26,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      paddingHorizontal: 16,
      paddingVertical: 0,
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
    chartFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      marginTop: -4,
    },
    chartFooterText: {
      flex: 1,
      color: colors.text,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 18,
    },
    chartFooterHint: {
      color: colors.textMuted,
      fontFamily: fonts.label,
      fontSize: 10,
      lineHeight: 13,
      letterSpacing: 0.65,
      textTransform: 'uppercase',
      textAlign: 'right',
    },
    subsection: {
      gap: 10,
    },
    subsectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    subsectionTitle: {
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 16,
      lineHeight: 20,
    },
    subsectionHint: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 16,
      textAlign: 'right',
    },
  });
}
