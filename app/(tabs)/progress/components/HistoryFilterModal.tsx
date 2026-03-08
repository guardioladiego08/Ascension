import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import AppPopup from '@/components/ui/AppPopup';
import { useAppTheme } from '@/providers/AppThemeProvider';

type Props = {
  visible: boolean;
  title: string;
  onClose: () => void;
  onReset: () => void;
  children: React.ReactNode;
};

export default function HistoryFilterModal({
  visible,
  title,
  onClose,
  onReset,
  children,
}: Props) {
  const { colors, fonts, globalStyles } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);

  return (
    <AppPopup
      visible={visible}
      onClose={onClose}
      align="bottom"
      animationType="slide"
      eyebrow="Filters"
      title={title}
      subtitle="Refine the history view without leaving the page."
      showCloseButton
      bodyStyle={styles.body}
      contentStyle={styles.popup}
      footer={
        <View style={styles.footerRow}>
          <TouchableOpacity
            style={[globalStyles.buttonSecondary, styles.button]}
            activeOpacity={0.88}
            onPress={onReset}
          >
            <Text style={globalStyles.buttonTextSecondary}>Reset</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[globalStyles.buttonPrimary, styles.button]}
            activeOpacity={0.88}
            onPress={onClose}
          >
            <Text style={globalStyles.buttonTextPrimary}>Apply</Text>
          </TouchableOpacity>
        </View>
      }
    >
      {children}
    </AppPopup>
  );
}

function createStyles(
  colors: ReturnType<typeof useAppTheme>['colors'],
  fonts: ReturnType<typeof useAppTheme>['fonts']
) {
  return StyleSheet.create({
    popup: {
      backgroundColor: colors.card,
      paddingTop: 20,
    },
    body: {
      gap: 14,
      maxHeight: 420,
    },
    footerRow: {
      flexDirection: 'row',
      gap: 10,
    },
    button: {
      flex: 1,
    },
    helperText: {
      color: colors.textOffSt,
      fontFamily: fonts.body,
      fontSize: 11,
      lineHeight: 16,
    },
  });
}
