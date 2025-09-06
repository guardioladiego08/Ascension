// components/my components/strength/FooterActions.tsx
// -----------------------------------------------------------------------------
// Footer with Pause/Resume and Finish buttons
// -----------------------------------------------------------------------------

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

type Props = {
  isRunning: boolean;
  onToggleTimer: () => void;
  onFinish: () => void;
};

const FooterActions: React.FC<Props> = ({ isRunning, onToggleTimer, onFinish }) => {
  return (
    <View style={styles.actions}>
      <TouchableOpacity style={styles.pauseButton} onPress={onToggleTimer}>
        <Text style={styles.buttonText}>{isRunning ? 'Pause' : 'Resume'}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.finishButton} onPress={onFinish}>
        <Text style={styles.buttonText}>Finish</Text>
      </TouchableOpacity>
    </View>
  );
};

export default FooterActions;

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 16 },
  pauseButton: {
    backgroundColor: '#444', paddingVertical: 12, paddingHorizontal: 24,
    borderRadius: 8, flex: 1, marginRight: 8, alignItems: 'center',
  },
  finishButton: {
    backgroundColor: '#FF950A', paddingVertical: 12, paddingHorizontal: 24,
    borderRadius: 8, flex: 1, marginLeft: 8, alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
