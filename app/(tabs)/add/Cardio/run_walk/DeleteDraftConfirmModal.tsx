import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';

const BG = Colors.dark.background;
const CARD = Colors.dark.card;
const TEXT = Colors.dark.text;

type Props = {
  visible: boolean;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  isBusy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function DeleteDraftConfirmModal({
  visible,
  title = 'Delete session?',
  message = 'If you delete this session, the data will be lost forever. This action cannot be undone.',
  confirmText = 'Delete',
  cancelText = 'Cancel',
  isBusy = false,
  onCancel,
  onConfirm,
}: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.header}>
            <View style={styles.iconWrap}>
              <Ionicons name="warning-outline" size={20} color="#e04b4b" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.message}>{message}</Text>
            </View>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              activeOpacity={0.9}
              style={[styles.cancelBtn, isBusy && { opacity: 0.6 }]}
              onPress={onCancel}
              disabled={isBusy}
            >
              <Text style={styles.cancelText}>{cancelText}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.9}
              style={[styles.deleteBtn, isBusy && { opacity: 0.6 }]}
              onPress={onConfirm}
              disabled={isBusy}
            >
              {isBusy ? (
                <ActivityIndicator />
              ) : (
                <>
                  <Ionicons name="trash-outline" size={18} color="#0E151F" />
                  <Text style={styles.deleteText}>{confirmText}</Text>
                </>
              )}
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
    padding: 16,
    justifyContent: 'center',
  },
  sheet: {
    backgroundColor: CARD,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  header: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(224,75,75,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  title: {
    color: TEXT,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  message: {
    marginTop: 6,
    color: TEXT,
    opacity: 0.75,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  actions: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    color: TEXT,
    opacity: 0.9,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  deleteBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#e04b4b',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  deleteText: {
    color: '#0E151F',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
});
