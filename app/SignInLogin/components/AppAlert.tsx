import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import AppPopup from '@/components/ui/AppPopup';
import { useAppTheme } from '@/providers/AppThemeProvider';

type AppAlertProps = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onClose: () => void;
};

const AppAlert: React.FC<AppAlertProps> = ({
  visible,
  title,
  message,
  confirmLabel = 'OK',
  onClose,
}) => {
  const { colors, fonts } = useAppTheme();
  const styles = createStyles(colors, fonts);

  return (
    <AppPopup
      visible={visible}
      onClose={onClose}
      title={title}
      animationType="fade"
      dismissOnBackdrop
      contentStyle={styles.popupCard}
      bodyStyle={styles.body}
    >
      <View>
        <Text style={styles.message}>{message}</Text>

        <TouchableOpacity style={styles.button} onPress={onClose} activeOpacity={0.92}>
          <Text style={styles.buttonText}>{confirmLabel}</Text>
        </TouchableOpacity>
      </View>
    </AppPopup>
  );
};

function createStyles(
  colors: ReturnType<typeof useAppTheme>['colors'],
  fonts: ReturnType<typeof useAppTheme>['fonts']
) {
  return StyleSheet.create({
    popupCard: {
      maxWidth: 420,
    },
    body: {
      paddingTop: 8,
    },
    message: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 14,
      lineHeight: 20,
    },
    button: {
      marginTop: 18,
      height: 48,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
    },
    buttonText: {
      color: colors.blkText,
      fontFamily: fonts.heading,
      fontSize: 14,
      lineHeight: 18,
    },
  });
}

export default AppAlert;
