import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

import { useAppTheme } from '@/providers/AppThemeProvider';
import AppPopup from '@/components/ui/AppPopup';

type Props = {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function FinishConfirmModal({
  visible,
  onConfirm,
  onCancel,
}: Props) {
  const { colors, fonts, globalStyles } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);

  return (
    <AppPopup
      visible={visible}
      onClose={onCancel}
      eyebrow="Finish workout"
      title="Wrap up this session?"
      subtitle="The workout will be saved and you’ll move into the completion summary."
    >
      <View style={styles.row}>
        <TouchableOpacity
          activeOpacity={0.92}
          style={[globalStyles.buttonSecondary, styles.button]}
          onPress={onCancel}
        >
          <Text style={globalStyles.buttonTextSecondary}>Keep going</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.92}
          style={[globalStyles.buttonPrimary, styles.button]}
          onPress={onConfirm}
        >
          <Text style={globalStyles.buttonTextPrimary}>Finish</Text>
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
  });
}
