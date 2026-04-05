import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '@/providers/AppThemeProvider';

import NutritionDistributionBars from './NutritionDistributionBars';
import NutritionSectionHeader from './NutritionSectionHeader';
import NutritionSummaryCards from './NutritionSummaryCards';
import { type NutritionRangeSummary } from './nutritionProgressUtils';

type Props = {
  summary: NutritionRangeSummary;
};

export default function NutritionSourcesSection({ summary }: Props) {
  const { colors, fonts } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);

  const cards = [
    {
      key: 'recipes',
      label: 'Recipe Meals',
      value: String(summary.recipeUsageCount),
      detail: 'Logged meal entries using saved recipes',
      icon: 'book-outline' as const,
      tone: 'primary' as const,
    },
    {
      key: 'favorite-reuse',
      label: 'Favorite Reuse',
      value: String(summary.favoriteMealReuseCount),
      detail: 'Favorite meals reused in the selected range',
      icon: 'heart-outline' as const,
      tone: 'secondary' as const,
    },
  ];

  return (
    <View style={styles.section}>
      <NutritionSectionHeader
        eyebrow="Sources"
        title="What those calories came from"
        subtitle="Use entry-type and source breakdowns to see whether intake is coming from recipes, ingredients, packaged foods, or barcode-heavy logging patterns."
      />

      <NutritionSummaryCards items={cards} />

      <View style={styles.block}>
        <View style={styles.blockHeader}>
          <Text style={styles.blockTitle}>Calories by entry type</Text>
          <Text style={styles.blockHint}>Recipes vs packaged vs ingredients</Text>
        </View>
        <NutritionDistributionBars items={summary.foodKindDistribution} />
      </View>

      <View style={styles.block}>
        <View style={styles.blockHeader}>
          <Text style={styles.blockTitle}>Direct food source mix</Text>
          <Text style={styles.blockHint}>Manual, barcode, OCR, import, and user-created foods</Text>
        </View>
        <NutritionDistributionBars items={summary.sourceDistribution} />
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
