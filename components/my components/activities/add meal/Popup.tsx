// components/addMeal/Popup.tsx
import React from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AM_COLORS as C } from './theme';

type Props = { visible: boolean; onClose: () => void; title: string; children?: React.ReactNode };

const Popup: React.FC<Props> = ({ visible, onClose, title, children }) => {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <View style={styles.line} />
          {children}
          <TouchableOpacity onPress={onClose} style={[styles.btn, { marginTop: 16 }]}>
            <Text style={styles.btnText}>CLOSE</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export default Popup;

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', backgroundColor: C.bg, borderRadius: 12, padding: 16 },
  title: { color: C.text, fontWeight: 'bold', fontSize: 18 },
  line: { height: 1, backgroundColor: C.line, marginVertical: 10 },
  btn: { backgroundColor: C.darkBtn, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, alignItems: 'center' },
  btnText: { color: C.text, fontWeight: 'bold' },
});
