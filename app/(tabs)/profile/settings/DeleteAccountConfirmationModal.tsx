import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { useAppTheme } from '@/providers/AppThemeProvider';

type Props = {
  confirmationText: string;
  errorText: string | null;
  isDeleting: boolean;
  typedConfirmation: string;
  visible: boolean;
  onChangeTypedConfirmation: (value: string) => void;
  onClose: () => void;
  onDelete: () => void;
};

export default function DeleteAccountConfirmationModal({
  confirmationText,
  errorText,
  isDeleting,
  typedConfirmation,
  visible,
  onChangeTypedConfirmation,
  onClose,
  onDelete,
}: Props) {
  const { colors, fonts } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);
  const isConfirmed = typedConfirmation.trim() === confirmationText;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={styles.overlay} onPress={isDeleting ? undefined : onClose}>
        <Pressable style={styles.card} onPress={(event) => event.stopPropagation()}>
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={styles.title}>Delete account</Text>
              <Text style={styles.subtitle}>
                This permanently removes your profile, workouts, nutrition logs, social activity,
                and uploaded files from Supabase.
              </Text>
            </View>

            <TouchableOpacity
              accessibilityLabel="Close delete account confirmation"
              disabled={isDeleting}
              onPress={onClose}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={styles.warningCard}>
            <Text style={styles.warningLabel}>Required confirmation</Text>
            <Text style={styles.warningBody}>
              Type the exact phrase below to enable permanent account deletion.
            </Text>
            <View style={styles.confirmationBadge}>
              <Text style={styles.confirmationBadgeText}>{confirmationText}</Text>
            </View>
          </View>

          <TextInput
            autoCapitalize="characters"
            autoCorrect={false}
            editable={!isDeleting}
            onChangeText={onChangeTypedConfirmation}
            placeholder={confirmationText}
            placeholderTextColor={colors.textMuted}
            selectionColor={colors.highlight1}
            spellCheck={false}
            style={styles.input}
            value={typedConfirmation}
          />

          {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}

          <View style={styles.footer}>
            <TouchableOpacity
              disabled={isDeleting}
              onPress={onClose}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              disabled={!isConfirmed || isDeleting}
              onPress={onDelete}
              style={[
                styles.deleteButton,
                (!isConfirmed || isDeleting) && styles.deleteButtonDisabled,
              ]}
            >
              {isDeleting ? (
                <ActivityIndicator color={colors.background} size="small" />
              ) : (
                <>
                  <Ionicons name="trash-outline" size={16} color={colors.background} />
                  <Text style={styles.deleteButtonText}>Delete account</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function createStyles(
  colors: ReturnType<typeof useAppTheme>['colors'],
  fonts: ReturnType<typeof useAppTheme>['fonts']
) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(4, 7, 10, 0.72)',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 20,
    },
    card: {
      width: '100%',
      borderRadius: 22,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.borderStrong,
      padding: 18,
      gap: 16,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
    },
    headerCopy: {
      flex: 1,
      gap: 6,
    },
    title: {
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 18,
      lineHeight: 22,
    },
    subtitle: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 19,
    },
    closeButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.card2,
    },
    warningCard: {
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.danger,
      backgroundColor: 'rgba(255, 122, 144, 0.09)',
      padding: 14,
      gap: 8,
    },
    warningLabel: {
      color: colors.danger,
      fontFamily: fonts.label,
      fontSize: 11,
      lineHeight: 14,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    warningBody: {
      color: colors.text,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 19,
    },
    confirmationBadge: {
      alignSelf: 'flex-start',
      borderRadius: 999,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.borderStrong,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    confirmationBadgeText: {
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 12,
      lineHeight: 16,
      letterSpacing: 0.6,
    },
    input: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.borderStrong,
      backgroundColor: colors.card2,
      paddingHorizontal: 14,
      paddingVertical: 14,
      color: colors.text,
      fontFamily: fonts.body,
      fontSize: 15,
      lineHeight: 20,
    },
    errorText: {
      color: colors.danger,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 18,
    },
    footer: {
      flexDirection: 'row',
      gap: 10,
    },
    secondaryButton: {
      flex: 1,
      minHeight: 48,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card2,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 16,
    },
    secondaryButtonText: {
      color: colors.text,
      fontFamily: fonts.body,
      fontSize: 14,
      lineHeight: 18,
    },
    deleteButton: {
      flex: 1.2,
      minHeight: 48,
      borderRadius: 16,
      backgroundColor: colors.danger,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: 16,
    },
    deleteButtonDisabled: {
      opacity: 0.45,
    },
    deleteButtonText: {
      color: colors.background,
      fontFamily: fonts.heading,
      fontSize: 14,
      lineHeight: 18,
    },
  });
}

