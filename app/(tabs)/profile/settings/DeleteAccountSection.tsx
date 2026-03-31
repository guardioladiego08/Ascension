import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import DeleteAccountConfirmationModal from './DeleteAccountConfirmationModal';

import { DELETE_ACCOUNT_CONFIRMATION_TEXT } from '@/lib/accountDeletion/constants';
import { deleteMyAccount } from '@/lib/accountDeletion/deleteAccount';
import { clearAllRunWalkLocalState } from '@/lib/runWalkSessionCleanup';
import { supabase } from '@/lib/supabase';
import { useAppTheme } from '@/providers/AppThemeProvider';
import { useActiveRunWalk } from '@/providers/ActiveRunWalkProvider';

export default function DeleteAccountSection() {
  const router = useRouter();
  const { clearSession } = useActiveRunWalk();
  const { colors, fonts } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);

  const [showModal, setShowModal] = useState(false);
  const [typedConfirmation, setTypedConfirmation] = useState('');
  const [errorText, setErrorText] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (showModal) return;
    setTypedConfirmation('');
    setErrorText(null);
    setIsDeleting(false);
  }, [showModal]);

  const closeModal = useCallback(() => {
    if (isDeleting) return;
    setShowModal(false);
  }, [isDeleting]);

  const finishLocalLogout = useCallback(async () => {
    clearSession();
    await clearAllRunWalkLocalState().catch(() => null);
    await supabase.auth.signOut({ scope: 'local' }).catch(() => null);
  }, [clearSession]);

  const handleDelete = useCallback(async () => {
    try {
      setIsDeleting(true);
      setErrorText(null);

      await deleteMyAccount(typedConfirmation);
      await finishLocalLogout();

      setShowModal(false);
      router.replace('/SignInLogin/FirstPage');
    } catch (error: any) {
      const message = error?.message ?? 'Failed to delete account.';
      setErrorText(message);
      Alert.alert('Account deletion failed', message);
      setIsDeleting(false);
    }
  }, [finishLocalLogout, router, typedConfirmation]);

  return (
    <>
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <View style={styles.headerCopy}>
            <Text style={styles.kicker}>Danger zone</Text>
            <Text style={styles.title}>Delete account</Text>
            <Text style={styles.description}>
              Permanently remove your Supabase auth account, profile, workouts, nutrition history,
              social data, and uploads.
            </Text>
          </View>

          <View style={styles.iconWrap}>
            <Ionicons name="warning-outline" size={18} color={colors.danger} />
          </View>
        </View>

        <View style={styles.noteCard}>
          <Text style={styles.noteTitle}>Before you continue</Text>
          <Text style={styles.noteBody}>
            This action cannot be undone. You will need to type an exact confirmation phrase before
            the delete button is enabled.
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.86}
          onPress={() => setShowModal(true)}
          style={styles.deleteTrigger}
        >
          <Ionicons name="trash-outline" size={16} color={colors.danger} />
          <Text style={styles.deleteTriggerText}>Open delete flow</Text>
        </TouchableOpacity>
      </View>

      <DeleteAccountConfirmationModal
        confirmationText={DELETE_ACCOUNT_CONFIRMATION_TEXT}
        errorText={errorText}
        isDeleting={isDeleting}
        onChangeTypedConfirmation={setTypedConfirmation}
        onClose={closeModal}
        onDelete={() => void handleDelete()}
        typedConfirmation={typedConfirmation}
        visible={showModal}
      />
    </>
  );
}

function createStyles(
  colors: ReturnType<typeof useAppTheme>['colors'],
  fonts: ReturnType<typeof useAppTheme>['fonts']
) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: 'rgba(255, 122, 144, 0.32)',
      padding: 16,
      gap: 14,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
    },
    headerCopy: {
      flex: 1,
      gap: 4,
    },
    kicker: {
      color: colors.danger,
      fontFamily: fonts.label,
      fontSize: 11,
      lineHeight: 14,
      letterSpacing: 0.7,
      textTransform: 'uppercase',
    },
    title: {
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 17,
      lineHeight: 22,
    },
    description: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 19,
    },
    iconWrap: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255, 122, 144, 0.11)',
    },
    noteCard: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card2,
      padding: 12,
      gap: 4,
    },
    noteTitle: {
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 13,
      lineHeight: 18,
    },
    noteBody: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 18,
    },
    deleteTrigger: {
      minHeight: 48,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: 'rgba(255, 122, 144, 0.4)',
      backgroundColor: 'rgba(255, 122, 144, 0.08)',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingHorizontal: 16,
    },
    deleteTriggerText: {
      color: colors.danger,
      fontFamily: fonts.heading,
      fontSize: 14,
      lineHeight: 18,
    },
  });
}

