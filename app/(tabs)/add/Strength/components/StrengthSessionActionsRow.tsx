import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAppTheme } from '@/providers/AppThemeProvider';
import { HOME_TONES } from '../../../home/tokens';

type Props = {
  onOpenSuperset: () => void;
  onOpenExercisePicker: () => void;
};

export default function StrengthSessionActionsRow({
  onOpenSuperset,
  onOpenExercisePicker,
}: Props) {
  const { colors, fonts } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);

  return (
    <View style={styles.sectionHeaderRow}>
      <Text style={styles.eyebrow}>Exercises</Text>

      <View style={styles.addActions}>
        <TouchableOpacity
          activeOpacity={0.92}
          style={styles.supersetBtn}
          onPress={onOpenSuperset}
        >
          <Ionicons name="git-compare-outline" size={16} color={colors.text} />
          <Text style={styles.supersetBtnText}>Superset</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.92}
          style={styles.addBtn}
          onPress={onOpenExercisePicker}
        >
          <Ionicons name="add" size={18} color={colors.blkText} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function createStyles(
  colors: ReturnType<typeof useAppTheme>['colors'],
  fonts: ReturnType<typeof useAppTheme>['fonts']
) {
  return StyleSheet.create({
    sectionHeaderRow: {
      marginTop: 10,
      marginBottom: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    eyebrow: {
      color: HOME_TONES.textTertiary,
      fontFamily: fonts.label,
      fontSize: 11,
      lineHeight: 14,
      letterSpacing: 0.9,
      textTransform: 'uppercase',
    },
    addActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    supersetBtn: {
      minHeight: 42,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      backgroundColor: HOME_TONES.surface2,
      paddingHorizontal: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    supersetBtnText: {
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.heading,
      fontSize: 13,
      lineHeight: 16,
    },
    addBtn: {
      width: 42,
      height: 42,
      borderRadius: 14,
      backgroundColor: colors.highlight1,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
