import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '@/constants/Colors';

const CARD = Colors.dark.card;
const BORDER = Colors.dark.border ?? '#1F2937';
const TEXT = Colors.dark.text;
const MUTED = Colors.dark.textMuted ?? '#9AA4BF';
const PRIMARY = Colors.dark.highlight1;

export default function ConfirmSessionModal({
  visible,
  title,
  message,
  confirmText,
  destructive,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmText: string;
  destructive?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.msg}>{message}</Text>

          <View style={styles.row}>
            <TouchableOpacity onPress={onCancel} style={[styles.btn, styles.btnGhost]} activeOpacity={0.9}>
              <Text style={styles.btnGhostText}>Back</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onConfirm}
              style={[
                styles.btn,
                { backgroundColor: destructive ? '#B91C1C' : PRIMARY, borderColor: 'transparent' },
              ]}
              activeOpacity={0.9}
            >
              <Text style={[styles.btnPrimaryText, { color: destructive ? '#fff' : '#0E151F' }]}>
                {confirmText}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: 18 },
  card: {
    backgroundColor: CARD,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
  },
  title: { color: TEXT, fontWeight: '900', fontSize: 16 },
  msg: { color: MUTED, marginTop: 8, lineHeight: 18 },
  row: { flexDirection: 'row', gap: 12, marginTop: 14 },
  btn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  btnGhost: { backgroundColor: 'transparent', borderColor: BORDER },
  btnGhostText: { color: TEXT, fontWeight: '900' },
  btnPrimaryText: { fontWeight: '900' },
});
