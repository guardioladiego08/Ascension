import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '@/constants/Colors';

const BG = Colors.dark.background;
const CARD = Colors.dark.card;
const TEXT = Colors.dark.text;
const MUTED = Colors.dark.textMuted ?? '#9AA4BF';
const BORDER = Colors.dark.border ?? '#1F2937';
const PRIMARY = Colors.dark.highlight1;

export default function ConfirmActionModal(props: {
  visible: boolean;
  title: string;
  message: string;
  confirmText: string;
  confirmTone?: 'danger' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const tone = props.confirmTone ?? 'primary';

  return (
    <Modal visible={props.visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{props.title}</Text>
          <Text style={styles.msg}>{props.message}</Text>

          <View style={styles.row}>
            <TouchableOpacity style={[styles.btn, styles.btnGhost]} onPress={props.onCancel}>
              <Text style={[styles.btnText, { color: MUTED }]}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.btn,
                tone === 'danger' ? styles.btnDanger : styles.btnPrimary,
              ]}
              onPress={props.onConfirm}
            >
              <Text style={styles.btnText}>{props.confirmText}</Text>
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
    backgroundColor: 'rgba(0,0,0,0.62)',
    justifyContent: 'center',
    padding: 18,
  },
  card: {
    backgroundColor: CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
  },
  title: { color: TEXT, fontSize: 18, fontWeight: '700' },
  msg: { color: MUTED, marginTop: 8, lineHeight: 18 },
  row: { flexDirection: 'row', gap: 10, marginTop: 14 },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  btnGhost: { backgroundColor: 'transparent', borderColor: BORDER },
  btnPrimary: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  btnDanger: { backgroundColor: '#B91C1C', borderColor: '#B91C1C' },
  btnText: { color: 'white', fontWeight: '700' },
});
