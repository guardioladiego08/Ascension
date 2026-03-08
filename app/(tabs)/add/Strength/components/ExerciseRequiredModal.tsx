import React, { useMemo } from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';

import { useAppTheme } from '@/providers/AppThemeProvider';
import AppPopup from '@/components/ui/AppPopup';

export default function ExerciseRequiredModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { colors, fonts, globalStyles } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);

  return (
    <AppPopup
      visible={visible}
      onClose={onClose}
      eyebrow="Workout incomplete"
      title="Add at least one exercise"
      subtitle="You need at least one logged exercise before the workout can be finished."
    >
      <TouchableOpacity
        activeOpacity={0.92}
        style={[globalStyles.buttonPrimary, styles.button]}
        onPress={onClose}
      >
        <Text style={globalStyles.buttonTextPrimary}>Okay</Text>
      </TouchableOpacity>
    </AppPopup>
  );
}

function createStyles(
  colors: ReturnType<typeof useAppTheme>['colors'],
  fonts: ReturnType<typeof useAppTheme>['fonts']
) {
  return StyleSheet.create({
    button: {
      marginTop: 18,
    },
  });
}
