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
  onKeepGoing: () => void;
  onFinish: () => void;
};

export default function FinishConfirmModal({ visible, onKeepGoing, onFinish }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={styles.backdrop} onPress={onKeepGoing}>
        <Pressable style={styles.card}>
          <Text style={styles.title}>Finish session?</Text>
          <Text style={styles.subtitle}>
            This will save your indoor run/walk to your history.
          </Text>

          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.keepBtn} onPress={onKeepGoing}>
              <Text style={styles.keepText}>Keep going</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.finishBtn} onPress={onFinish}>
              <Text style={styles.finishText}>Finish</Text>
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
  finishBtn: {
    flex: 1,
    borderRadius: 12,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  finishText: { color: Colors.dark.text, fontSize: 15, fontWeight: '800' },
});
