import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '@/providers/AppThemeProvider';

import { STRENGTH_METRIC_OPTIONS, type StrengthMetricId } from './strengthProgressUtils';

type Props = {
  value: StrengthMetricId;
  onChange: (metricId: StrengthMetricId) => void;
};

export default function StrengthMetricToggle({ value, onChange }: Props) {
  const { colors, fonts } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);

  return (
    <View style={styles.row}>
      {STRENGTH_METRIC_OPTIONS.map((option) => {
        const isActive = option.id === value;

        return (
          <Pressable
            key={option.id}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            onPress={() => onChange(option.id)}
            style={[styles.button, isActive ? styles.buttonActive : null]}
          >
            <Text style={[styles.label, isActive ? styles.labelActive : null]}>
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
