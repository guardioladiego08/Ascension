import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

import AppPopup from '@/components/ui/AppPopup';
import { useAppTheme } from '@/providers/AppThemeProvider';

type Props = {
  visible: boolean;
  onKeepGoing: () => void;
  onFinish: () => void;
};

export default function FinishConfirmModal({ visible, onKeepGoing, onFinish }: Props) {
  const { globalStyles } = useAppTheme();

  return (
    <AppPopup
      visible={visible}
      onClose={onKeepGoing}
      eyebrow="Finish session"
      title="Wrap up this indoor session?"
      subtitle="This will save your indoor run or walk to your history."
    >
      <View style={styles.row}>
        <TouchableOpacity
          activeOpacity={0.92}
          style={[globalStyles.buttonSecondary, styles.button]}
          onPress={onKeepGoing}
        >
          <Text style={globalStyles.buttonTextSecondary}>Keep going</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.92}
          style={[globalStyles.buttonPrimary, styles.button]}
          onPress={onFinish}
        >
          <Text style={globalStyles.buttonTextPrimary}>Finish</Text>
        </TouchableOpacity>
      </View>
    </AppPopup>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
  },
  button: {
    flex: 1,
  },
});
