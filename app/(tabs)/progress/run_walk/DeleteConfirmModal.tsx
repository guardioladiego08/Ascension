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
  onCancel: () => void;
  onDelete: () => void;
};

export default function DeleteConfirmModal({
  visible,
  onCancel,
  onDelete,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      {/* Backdrop press → cancel */}
      <Pressable style={styles.backdrop} onPress={onCancel}>
        {/* Card */}
        <Pressable style={styles.card}>
          <Text style={styles.title}>Delete session?</Text>
          <Text style={styles.subtitle}>
            This will permanently delete this session and remove it from your
            lifetime and weekly stats.
          </Text>

          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.deleteBtn} onPress={onDelete}>
              <Text style={styles.deleteText}>Delete</Text>
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
  cancelBtn: {
    flex: 1,
    borderRadius: 12,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelText: {
    color: Colors.dark.text,
    fontSize: 15,
    fontWeight: '700',
  },
  deleteBtn: {
    flex: 1,
    borderRadius: 12,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteText: {
    color: '#e04b4b',
    fontSize: 15,
    fontWeight: '800',
  },
});
