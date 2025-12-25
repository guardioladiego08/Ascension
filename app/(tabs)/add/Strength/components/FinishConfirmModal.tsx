import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '@/constants/Colors';

type Props = {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function FinishConfirmModal({ visible, onConfirm, onCancel }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.box}>
          <Text style={styles.title}>Finish Workout?</Text>
          <Text style={styles.subtitle}>
            Are you sure you want to finish this workout?
          </Text>

          <View style={styles.row}>
            <TouchableOpacity style={[styles.btn, styles.cancelBtn]} onPress={onCancel}>
              <Text style={styles.cancelText}>Keep Going</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.btn, styles.confirmBtn]} onPress={onConfirm}>
              <Text style={styles.confirmText}>Finish</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  box: {
    width: '80%',
    backgroundColor: Colors.dark.popUpCard,
    padding: 24,
    borderRadius: 20,
  },
  title: {
    color: Colors.dark.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    color: Colors.dark.text,
    fontSize: 14,
    marginBottom: 24,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelBtn: {
    borderColor: '#fff',
    borderWidth: 1,
    marginRight: 10,
  },
  confirmBtn: {
    borderColor: '#fff',
    borderWidth: 1,
    marginLeft: 10,
  },
  cancelText: {
    color: '#fff',
    fontSize: 15,
  },
  confirmText: {
    color: '#5c976eff',
    fontSize: 15,
    fontWeight: '600',
  },
});
