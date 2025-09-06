// components/my components/strength/FooterActions.tsx
// -----------------------------------------------------------------------------
// Footer with Pause/Resume and Finish buttons
// -----------------------------------------------------------------------------

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '@/constants/Colors';

type Props = {
  isRunning: boolean;
  onToggleTimer: () => void;
  onFinish: () => void;
};

const FooterActions: React.FC<Props> = ({ isRunning, onToggleTimer, onFinish }) => {
  return (
    <View style={styles.actions}>
      <TouchableOpacity style={styles.pauseButton} onPress={onToggleTimer}>
        <Text style={styles.pauseButtonText}>{isRunning ? 'Pause' : 'Resume'}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.finishButton} onPress={onFinish}>
        <Text style={styles.finishButtonText}>Finish</Text>
      </TouchableOpacity>
    </View>
  );
};

export default FooterActions;

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 16 },
  pauseButton: {
    backgroundColor: '#0a0a0aff', paddingVertical: 12, paddingHorizontal: 24,
    borderRadius: 8, flex: 1, marginRight: 8, alignItems: 'center',
  },
  finishButton: {
    backgroundColor: '#FF950A', paddingVertical: 12, paddingHorizontal: 24,
    borderRadius: 8, flex: 1, marginLeft: 8, alignItems: 'center',
  },
  pauseButtonText: { color: Colors.dark.text, fontSize: 16, fontWeight: '600' },
  finishButtonText: { color: Colors.dark.blkText, fontSize: 16, fontWeight: '600' },
});
