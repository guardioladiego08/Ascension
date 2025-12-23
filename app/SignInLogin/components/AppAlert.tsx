// components/my components/AppAlert.tsx
import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { Colors } from '@/constants/Colors';

const BG_OVERLAY = 'rgba(0,0,0,0.6)';
const CARD = Colors.dark.popUpCard;
const TEXT_PRIMARY = Colors.dark.text;
const TEXT_MUTED = '#9AA4BF';
const PRIMARY = Colors.dark.tint;

type AppAlertProps = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onClose: () => void;
};

const AppAlert: React.FC<AppAlertProps> = ({
  visible,
  title,
  message,
  confirmLabel = 'OK',
  onClose,
}) => {
  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <TouchableOpacity style={styles.button} onPress={onClose}>
            <Text style={styles.buttonText}>{confirmLabel}</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: BG_OVERLAY,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: CARD,
    borderRadius: 18,
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: TEXT_PRIMARY,
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: TEXT_MUTED,
    marginBottom: 16,
  },
  button: {
    alignSelf: 'flex-end',
    borderRadius: 999,
    backgroundColor: PRIMARY,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  buttonText: {
    color: TEXT_PRIMARY,
    fontWeight: '600',
    fontSize: 14,
  },
});

export default AppAlert;
