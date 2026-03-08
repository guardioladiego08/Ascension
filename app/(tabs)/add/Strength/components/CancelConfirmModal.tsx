import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

import { useAppTheme } from '@/providers/AppThemeProvider';
import AppPopup from '@/components/ui/AppPopup';

type Props = {
  visible: boolean;
  onKeep: () => void;
  onDiscard: () => void;
};

export default function CancelConfirmModal({ visible, onKeep, onDiscard }: Props) {
  const { colors, fonts, globalStyles } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);

  return (
    <AppPopup
      visible={visible}
      onClose={onKeep}
      eyebrow="Discard session"
      title="Cancel this workout?"
      subtitle="This removes the current strength session and any unsaved set logging."
    >
      <View style={styles.btnRow}>
        <TouchableOpacity
          activeOpacity={0.92}
          style={[globalStyles.buttonSecondary, styles.button]}
          onPress={onKeep}
        >
          <Text style={globalStyles.buttonTextSecondary}>Keep workout</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.92}
          style={[styles.discardBtn, styles.button]}
          onPress={onDiscard}
        >
          <Text style={styles.discardText}>Discard</Text>
        </TouchableOpacity>
      </View>
    </AppPopup>
  );
}

function createStyles(
  colors: ReturnType<typeof useAppTheme>['colors'],
  fonts: ReturnType<typeof useAppTheme>['fonts']
) {
  return StyleSheet.create({
    btnRow: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 18,
    },
    button: {
      flex: 1,
    },
    discardBtn: {
      height: 48,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.danger,
      backgroundColor: colors.accentSecondarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 18,
    },
    discardText: {
      color: colors.danger,
      fontFamily: fonts.heading,
      fontSize: 14,
      lineHeight: 18,
    },
  });
}
