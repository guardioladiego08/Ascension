import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

import AppPopup from '@/components/ui/AppPopup';
import { useAppTheme } from '@/providers/AppThemeProvider';

type Props = {
  visible: boolean;
  onClose: () => void;
  onConfirmCancel: () => void;
};

export default function ConfirmCancelModal({
  visible,
  onClose,
  onConfirmCancel,
}: Props) {
  const { colors, fonts, globalStyles } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);

  return (
    <AppPopup
      visible={visible}
      onClose={onClose}
      eyebrow="Discard session"
      title="Cancel workout?"
      subtitle="If you cancel now, the workout will not be saved."
    >
      <View style={styles.row}>
        <TouchableOpacity
          activeOpacity={0.92}
          style={[globalStyles.buttonSecondary, styles.button]}
          onPress={onClose}
        >
          <Text style={globalStyles.buttonTextSecondary}>Keep</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.92}
          style={[styles.cancelBtn, styles.button]}
          onPress={onConfirmCancel}
        >
          <Text style={styles.cancelText}>Cancel workout</Text>
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
    row: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 18,
    },
    button: {
      flex: 1,
    },
    cancelBtn: {
      height: 48,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.danger,
      backgroundColor: colors.accentSecondarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 14,
    },
    cancelText: {
      color: colors.danger,
      fontFamily: fonts.heading,
      fontSize: 14,
      lineHeight: 18,
      textAlign: 'center',
    },
  });
}
