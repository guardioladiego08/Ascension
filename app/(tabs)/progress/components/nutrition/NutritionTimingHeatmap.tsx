import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '@/providers/AppThemeProvider';

import type { NutritionHeatmapCell } from './nutritionProgressUtils';

type Props = {
  cells: NutritionHeatmapCell[];
};

export default function NutritionTimingHeatmap({ cells }: Props) {
  const { colors, fonts } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);

  return (
    <View style={styles.grid}>
      {cells.map((cell) => (
        <View key={cell.key} style={styles.cellWrap}>
          <View
            style={[
              styles.cell,
              {
                backgroundColor:
                  cell.intensity > 0
                    ? `rgba(58,134,255,${0.12 + cell.intensity * 0.52})`
                    : colors.card2,
              },
            ]}
          >
            <Text style={styles.cellCount}>{cell.meals}</Text>
          </View>
          <Text style={styles.cellLabel}>{cell.label}</Text>
        </View>
      ))}
    </View>
  );
}

function createStyles(
  colors: ReturnType<typeof useAppTheme>['colors'],
  fonts: ReturnType<typeof useAppTheme>['fonts']
) {
  return StyleSheet.create({
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    cellWrap: {
      width: '23%',
      minWidth: 64,
      gap: 6,
    },
    cell: {
      height: 56,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.card2,
    },
    cellCount: {
      color: colors.text,
      fontFamily: fonts.mono,
      fontSize: 18,
      lineHeight: 22,
      fontVariant: ['tabular-nums'],
    },
    cellLabel: {
      color: colors.textMuted,
      fontFamily: fonts.label,
      fontSize: 10,
      lineHeight: 13,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      textAlign: 'center',
    },
  });
}
