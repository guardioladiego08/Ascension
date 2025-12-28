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
  title?: string;
  subtitle?: string;

  onResume: () => void;
  onFinish: () => void;
  onCancel: () => void;
};

export default function PauseOptionsModal({
  visible,
  title = 'Paused',
  subtitle = 'Resume when you’re ready, or finish/cancel this session.',
  onResume,
  onFinish,
  onCancel,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={styles.backdrop} onPress={onResume}>
        <Pressable style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>

          <View style={styles.btnCol}>
            <TouchableOpacity style={styles.primaryBtn} onPress={onResume}>
              <Text style={styles.primaryText}>Resume</Text>
            </TouchableOpacity>

            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.keepBtn} onPress={onFinish}>
                <Text style={styles.keepText}>Finish</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.discardBtn} onPress={onCancel}>
                <Text style={styles.discardText}>Cancel</Text>
              </TouchableOpacity>
            </View>
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
    marginBottom: 18,
  },
  btnCol: { gap: 12 },
  primaryBtn: {
    borderRadius: 12,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.dark.card,
  },
  primaryText: { color: Colors.dark.text, fontSize: 15, fontWeight: '800' },

  btnRow: { flexDirection: 'row', gap: 12 },
  keepBtn: {
    flex: 1,
    borderRadius: 12,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keepText: { color: Colors.dark.text, fontSize: 15, fontWeight: '800' },

  discardBtn: {
    flex: 1,
    borderRadius: 12,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  discardText: { color: '#e04b4b', fontSize: 15, fontWeight: '800' },
});
