import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

import AppPopup from '@/components/ui/AppPopup';
import { useAppTheme } from '@/providers/AppThemeProvider';

type Props = {
  visible: boolean;
  title?: string;
  subtitle?: string;
  onResume: () => void;
  onFinish: () => void;
  onCancel: () => void;
};

export default function PauseOptionsModal({
  visible,
  title = 'Paused',
  subtitle = 'Resume when you’re ready, or finish or cancel this session.',
  onResume,
  onFinish,
  onCancel,
}: Props) {
  const { colors, fonts, globalStyles } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);

  return (
    <AppPopup
      visible={visible}
      onClose={onResume}
      eyebrow="Paused"
      title={title}
      subtitle={subtitle}
    >
      <View style={styles.column}>
        <TouchableOpacity
          activeOpacity={0.92}
          style={[globalStyles.buttonPrimary, styles.primaryBtn]}
          onPress={onResume}
        >
          <Text style={globalStyles.buttonTextPrimary}>Resume</Text>
        </TouchableOpacity>

        <View style={styles.row}>
          <TouchableOpacity
            activeOpacity={0.92}
            style={[globalStyles.buttonSecondary, styles.button]}
            onPress={onFinish}
          >
            <Text style={globalStyles.buttonTextSecondary}>Finish</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.92}
            style={[styles.cancelBtn, styles.button]}
            onPress={onCancel}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </AppPopup>
  );
}

function createStyles(
  colors: ReturnType<typeof useAppTheme>['colors'],
  fonts: ReturnType<typeof useAppTheme>['fonts']
) {
  return StyleSheet.create({
    column: {
      gap: 12,
      marginTop: 18,
    },
    primaryBtn: {
      minHeight: 48,
    },
    row: {
      flexDirection: 'row',
      gap: 12,
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
    },
    cancelText: {
      color: colors.danger,
      fontFamily: fonts.heading,
      fontSize: 14,
      lineHeight: 18,
    },
  });
}
