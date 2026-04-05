import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '@/providers/AppThemeProvider';

import { NUTRITION_METRIC_OPTIONS, type NutritionMetricId } from './nutritionProgressUtils';

type Props = {
  value: NutritionMetricId;
  onChange: (metricId: NutritionMetricId) => void;
};

export default function NutritionMetricToggle({ value, onChange }: Props) {
  const { colors, fonts } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);

  return (
    <View style={styles.row}>
      {NUTRITION_METRIC_OPTIONS.map((option) => {
        const active = option.id === value;

        return (
          <Pressable
            key={option.id}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(option.id)}
            style={[styles.button, active ? styles.buttonActive : null]}
          >
            <Text style={[styles.label, active ? styles.labelActive : null]}>
              {option.label}
            </Text>
          </Pressable>
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
    row: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    button: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card3,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    buttonActive: {
      borderColor: colors.glowPrimary,
      backgroundColor: colors.accentSoft,
    },
    label: {
      color: colors.textMuted,
      fontFamily: fonts.label,
      fontSize: 11,
      lineHeight: 14,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    labelActive: {
      color: colors.text,
    },
  });
}
