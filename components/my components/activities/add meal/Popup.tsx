import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View, ScrollView } from 'react-native';
import { AM_COLORS as C } from './theme';
import { GlobalStyles } from '@/constants/GlobalStyles';

type Props = {
  visible: boolean;
  onClose: () => void;
  title: string;
  children?: React.ReactNode;
};

const Popup: React.FC<Props> = ({ visible, onClose, title, children }) => {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={[GlobalStyles.subtitle, { marginBottom: 10 }]}>{title}</Text>

          {/* ✅ Make content scrollable if long */}
          <ScrollView
            style={{ maxHeight: '70%' }}
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>

          <TouchableOpacity onPress={onClose} style={[styles.btn, { marginTop: 16 }]}>
            <Text style={GlobalStyles.textBold}>CLOSE</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default Popup;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    backgroundColor: C.bg,
    borderRadius: 12,
    padding: 16,
  },
  btn: {
    backgroundColor: C.darkBtn,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
});
