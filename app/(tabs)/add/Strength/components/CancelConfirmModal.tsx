import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
} from 'react-native';
import { Colors } from '@/constants/Colors';

type Props = {
  visible: boolean;
  onKeep: () => void;
  onDiscard: () => void;
};

export default function CancelConfirmModal({ visible, onKeep, onDiscard }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      {/* Backdrop press → Keep workout */}
      <Pressable style={styles.backdrop} onPress={onKeep}>
        {/* Card – pressable but doesn't close modal */}
        <Pressable style={styles.card}>
          <Text style={styles.title}>Cancel workout?</Text>
          <Text style={styles.subtitle}>
            This will discard your current session.
          </Text>

          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.keepBtn} onPress={onKeep}>
              <Text style={styles.keepText}>Keep</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.discardBtn} onPress={onDiscard}>
              <Text style={styles.discardText}>Discard</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    backgroundColor: Colors.dark.popUpCard,
    borderRadius: 16,
    paddingVertical: 22,
    paddingHorizontal: 20,
  },
  title: {
    color: Colors.dark.text,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
  },
  subtitle: {
    color: Colors.dark.text,
    fontSize: 14,
    marginBottom: 20,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  keepBtn: {
    flex: 1,
    borderRadius: 12,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keepText: { color: Colors.dark.text, fontSize: 15, fontWeight: '700' },
  discardBtn: {
    flex: 1,
    borderRadius: 12,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  discardText: { color: '#e04b4b', fontSize: 15, fontWeight: '800' },
});
