import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '@/providers/AppThemeProvider';

import type { NutritionDistributionItem } from './nutritionProgressUtils';

type Props = {
  items: NutritionDistributionItem[];
};

export default function NutritionDistributionBars({ items }: Props) {
  const { colors, fonts } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);

  const maxValue = Math.max(...items.map((item) => item.value), 0);

  if (!items.length) {
    return (
      <View style={styles.emptyCard}>
        <Text style={styles.emptyText}>No tracked data in this section yet.</Text>
      </View>
    );
  }

  return (
    <View style={styles.stack}>
      {items.map((item) => {
        const progress = maxValue > 0 ? item.value / maxValue : 0;
        const fillStyle =
          item.tone === 'secondary'
            ? styles.fillSecondary
            : item.tone === 'tertiary'
              ? styles.fillTertiary
              : item.tone === 'success'
                ? styles.fillSuccess
                : item.tone === 'warning'
                  ? styles.fillWarning
                  : styles.fillPrimary;

        return (
          <View key={item.key} style={styles.card}>
            <View style={styles.topRow}>
              <Text style={styles.label}>{item.label}</Text>
              <Text style={styles.value}>{item.valueLabel}</Text>
            </View>

            <View style={styles.track}>
              <View style={[styles.fill, fillStyle, { width: `${Math.max(progress * 100, 6)}%` }]} />
            </View>

            {item.detail ? <Text style={styles.detail}>{item.detail}</Text> : null}
          </View>
        );
      })}
    </View>
  );
}

function createStyles(
  colors: ReturnType<typeof useAppTheme>['colors'],
  fonts: ReturnType<typeof useAppTheme>['fonts']
) {
  return StyleSheet.create({
    stack: {
      gap: 10,
    },
    card: {
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card2,
      paddingHorizontal: 14,
      paddingVertical: 14,
      gap: 10,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    label: {
      flex: 1,
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 14,
      lineHeight: 18,
    },
    value: {
      color: colors.text,
      fontFamily: fonts.mono,
      fontSize: 13,
      lineHeight: 17,
      fontVariant: ['tabular-nums'],
      textAlign: 'right',
    },
    track: {
      height: 9,
      borderRadius: 999,
      overflow: 'hidden',
      backgroundColor: colors.card3,
    },
    fill: {
      height: '100%',
      borderRadius: 999,
    },
    fillPrimary: {
      backgroundColor: colors.highlight1,
    },
    fillSecondary: {
      backgroundColor: colors.highlight2,
    },
    fillTertiary: {
      backgroundColor: colors.highlight3,
    },
    fillSuccess: {
      backgroundColor: colors.success,
    },
    fillWarning: {
      backgroundColor: colors.warning,
    },
    detail: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 16,
    },
    emptyCard: {
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card2,
      paddingHorizontal: 14,
      paddingVertical: 14,
    },
    emptyText: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 16,
    },
  });
}
