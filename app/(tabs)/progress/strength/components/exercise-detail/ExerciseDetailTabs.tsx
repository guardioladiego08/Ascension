import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '@/providers/AppThemeProvider';

import {
  EXERCISE_DETAIL_TABS,
  type ExerciseDetailTabId,
} from './strengthExerciseDetailUtils';

type Props = {
  value: ExerciseDetailTabId;
  onChange: (tabId: ExerciseDetailTabId) => void;
};

export default function ExerciseDetailTabs({ value, onChange }: Props) {
  const { colors, fonts } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);

  return (
    <View style={styles.shell}>
      {EXERCISE_DETAIL_TABS.map((tab) => {
        const active = tab.id === value;

        return (
          <Pressable
            key={tab.id}
            accessibilityRole="button"
            onPress={() => onChange(tab.id)}
            style={[styles.button, active ? styles.buttonActive : null]}
          >
            <Text style={[styles.buttonText, active ? styles.buttonTextActive : null]}>
              {tab.label}
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
      alignItems: 'center',
      gap: 8,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card2,
      padding: 6,
    },
    button: {
      flex: 1,
      minHeight: 46,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 10,
      paddingVertical: 10,
    },
    buttonActive: {
      backgroundColor: colors.card3,
      borderWidth: 1,
      borderColor: colors.borderStrong,
    },
    buttonText: {
      color: colors.textMuted,
      fontFamily: fonts.heading,
      fontSize: 16,
      lineHeight: 20,
    },
    buttonTextActive: {
      color: colors.text,
    },
  });
}
