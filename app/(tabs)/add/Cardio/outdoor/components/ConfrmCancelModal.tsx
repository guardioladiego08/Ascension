import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '@/constants/Colors';

type Props = {
  visible: boolean;
  onClose: () => void;
  onConfirmCancel: () => void;
};

const CARD = Colors.dark.card;
const TEXT = Colors.dark.text;

export default function ConfirmCancelModal({ visible, onClose, onConfirmCancel }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Cancel workout?</Text>
          <Text style={styles.body}>
            If you cancel, the workout will not be saved.
          </Text>

          <View style={styles.row}>
            <TouchableOpacity style={[styles.btn, styles.keepBtn]} onPress={onClose}>
              <Text style={styles.keepText}>Keep</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.btn, styles.cancelBtn]} onPress={onConfirmCancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: CARD,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  title: { fontSize: 16, fontWeight: '900', color: TEXT, letterSpacing: 0.2 },
  body: { marginTop: 8, fontSize: 13, color: TEXT, opacity: 0.75, lineHeight: 18 },

  row: { flexDirection: 'row', gap: 12, marginTop: 14 },
  btn: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.dark.card,
  },

  keepBtn: {},
  keepText: { color: TEXT, fontSize: 14, fontWeight: '900' },

  cancelBtn: {},
  cancelText: { color: '#e04b4b', fontSize: 14, fontWeight: '900' },
});
