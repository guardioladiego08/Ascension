import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '@/providers/AppThemeProvider';

import NutritionDistributionBars from './NutritionDistributionBars';
import NutritionSectionHeader from './NutritionSectionHeader';
import NutritionSummaryCards from './NutritionSummaryCards';
import {
  filterNutritionEntriesByTimeline,
  formatCount,
  summarizeNutritionRepeat,
  type NutritionEntryInsight,
  type NutritionTimelineId,
} from './nutritionProgressUtils';

type Props = {
  entries: NutritionEntryInsight[];
  timelineId: NutritionTimelineId;
};

export default function NutritionRepeatSection({ entries, timelineId }: Props) {
  const { colors, fonts } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);

  const summary = useMemo(
    () => summarizeNutritionRepeat(filterNutritionEntriesByTimeline(entries, timelineId)),
    [entries, timelineId]
  );

  const cards = [
    {
      key: 'unique-foods',
      label: 'Unique Foods',
      value: String(summary.uniqueFoodsLogged),
      detail: 'Distinct food items logged in the active range',
      icon: 'leaf-outline' as const,
      tone: 'primary' as const,
    },
    {
      key: 'unique-meals',
      label: 'Unique Meals',
      value: String(summary.uniqueMealsLogged),
      detail: 'Distinct saved meals reused in the active range',
      icon: 'book-outline' as const,
      tone: 'secondary' as const,
    },
    {
      key: 'goto-food',
      label: 'Go-to Food Logs',
      value: formatCount(summary.mostLoggedFoodCount, 'log', 'logs'),
      detail: summary.mostLoggedFoodLabel
        ? `Most logged food: ${summary.mostLoggedFoodLabel}`
        : 'No repeated food entries yet',
      icon: 'repeat-outline' as const,
      tone: 'tertiary' as const,
    },
    {
      key: 'goto-meal',
      label: 'Go-to Meal Logs',
      value: formatCount(summary.mostLoggedMealCount, 'log', 'logs'),
      detail: summary.mostLoggedMealLabel
        ? `Most logged meal: ${summary.mostLoggedMealLabel}`
        : 'No repeated saved meals yet',
      icon: 'star-outline' as const,
      tone: 'warning' as const,
    },
  ];

  return (
    <View style={styles.section}>
      <NutritionSectionHeader
        eyebrow="Repeat"
        title="Repeat behavior and go-to foods"
        subtitle="These repeat patterns follow the same nutrition timeline selected above, so you can see whether your habits are tight and repeatable or too narrow to support long-term adherence."
      />

      <NutritionSummaryCards items={cards} />

      <View style={styles.block}>
        <View style={styles.blockHeader}>
          <Text style={styles.blockTitle}>Top repeated foods</Text>
          <Text style={styles.blockHint}>Most frequently logged individual foods</Text>
        </View>
        <NutritionDistributionBars items={summary.topFoods} />
      </View>

      <View style={styles.block}>
        <View style={styles.blockHeader}>
          <Text style={styles.blockTitle}>Top repeated meals</Text>
          <Text style={styles.blockHint}>Most frequently reused saved meals</Text>
        </View>
        <NutritionDistributionBars items={summary.topMeals} />
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
