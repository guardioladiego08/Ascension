// components/my components/strength/ConfirmOverlay.tsx
// -----------------------------------------------------------------------------
// Dark overlay asking user to confirm finishing the workout
// -----------------------------------------------------------------------------

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

type Props = {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

const ConfirmOverlay: React.FC<Props> = ({ visible, onCancel, onConfirm }) => {
  if (!visible) return null;
  return (
    <View style={styles.sheetOverlay} pointerEvents="auto">
      <View style={styles.confirmBox}>
        <Text style={styles.confirmText}>Are you sure you're finished?</Text>
        <View style={styles.confirmButtons}>
          <TouchableOpacity onPress={onCancel} style={styles.confirmBtn}>
            <Text style={styles.buttonText}>No</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onConfirm} style={styles.confirmBtn}>
            <Text style={styles.buttonText}>Yes</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default ConfirmOverlay;

const styles = StyleSheet.create({
  sheetOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center',
  },
  confirmBox: { backgroundColor: '#333', padding: 24, borderRadius: 12, width: '80%', alignItems: 'center' },
  confirmText: { color: '#fff', fontSize: 18, marginBottom: 20, textAlign: 'center' },
  confirmButtons: { flexDirection: 'row', justifyContent: 'space-between', gap: 20 },
  confirmBtn: { backgroundColor: '#555', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
