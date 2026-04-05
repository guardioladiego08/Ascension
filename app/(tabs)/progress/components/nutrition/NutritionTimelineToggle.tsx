import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '@/providers/AppThemeProvider';

import { NUTRITION_TIMELINE_OPTIONS, type NutritionTimelineId } from './nutritionProgressUtils';

type Props = {
  value: NutritionTimelineId;
  onChange: (timelineId: NutritionTimelineId) => void;
};

export default function NutritionTimelineToggle({ value, onChange }: Props) {
  const { colors, fonts } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);

  return (
    <View style={styles.shell}>
      {NUTRITION_TIMELINE_OPTIONS.map((option) => {
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
    shell: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      justifyContent: 'space-between',
    },
    button: {
      minWidth: 60,
      flexGrow: 1,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card2,
      paddingHorizontal: 10,
      paddingVertical: 12,
      alignItems: 'center',
    },
    buttonActive: {
      borderColor: colors.glowSecondary,
      backgroundColor: colors.accentSecondarySoft,
    },
    label: {
      color: colors.textMuted,
      fontFamily: fonts.label,
      fontSize: 11,
      lineHeight: 14,
      letterSpacing: 0.45,
      textTransform: 'uppercase',
      textAlign: 'center',
    },
    labelActive: {
      color: colors.text,
    },
  });
}
