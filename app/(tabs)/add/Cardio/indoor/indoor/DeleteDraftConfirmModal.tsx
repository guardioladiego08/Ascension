import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import AppPopup from '@/components/ui/AppPopup';
import { useAppTheme } from '@/providers/AppThemeProvider';

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
  const { colors, fonts, globalStyles } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);

  return (
    <AppPopup
      visible={visible}
      onClose={onCancel}
      eyebrow="Delete draft"
      title={title}
      subtitle={message}
    >
      <View style={styles.row}>
        <TouchableOpacity
          activeOpacity={0.92}
          style={[globalStyles.buttonSecondary, styles.button, isBusy ? styles.busy : null]}
          onPress={onCancel}
          disabled={isBusy}
        >
          <Text style={globalStyles.buttonTextSecondary}>{cancelText}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.92}
          style={[styles.deleteBtn, styles.button, isBusy ? styles.busy : null]}
          onPress={onConfirm}
          disabled={isBusy}
        >
          {isBusy ? (
            <ActivityIndicator size="small" color={colors.blkText} />
          ) : (
            <>
              <Ionicons name="trash-outline" size={18} color={colors.blkText} />
              <Text style={styles.deleteText}>{confirmText}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </AppPopup>
  );
}

function createStyles(
  colors: ReturnType<typeof useAppTheme>['colors'],
  fonts: ReturnType<typeof useAppTheme>['fonts']
) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 18,
    },
    button: {
      flex: 1,
    },
    deleteBtn: {
      height: 48,
      borderRadius: 16,
      backgroundColor: colors.danger,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: 16,
    },
    deleteText: {
      color: colors.blkText,
      fontFamily: fonts.heading,
      fontSize: 14,
      lineHeight: 18,
    },
    busy: {
      opacity: 0.7,
    },
  });
}
