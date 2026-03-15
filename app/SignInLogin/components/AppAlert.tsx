import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import AppPopup from '@/components/ui/AppPopup';
import { useAppTheme } from '@/providers/AppThemeProvider';
import AuthButton from './AuthButton';
import { buildAuthDesignSystem } from '../designSystem';

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
  const ui = buildAuthDesignSystem(colors, fonts);
  const styles = createStyles(colors, fonts, ui);

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

        <AuthButton
          label={confirmLabel}
          onPress={onClose}
          style={styles.button}
        />
      </View>
    </AppPopup>
  );
};

function createStyles(
  colors: ReturnType<typeof useAppTheme>['colors'],
  fonts: ReturnType<typeof useAppTheme>['fonts'],
  ui: ReturnType<typeof buildAuthDesignSystem>
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
      marginTop: ui.spacing.s20,
    },
  });
}

export default AppAlert;
