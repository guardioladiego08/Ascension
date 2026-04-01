import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import AppPopup from '@/components/ui/AppPopup';
import { useAppTheme } from '@/providers/AppThemeProvider';
import { HOME_TONES } from '../../../home/tokens';

type Props = {
  visible: boolean;
  value: string;
  loading: boolean;
  onChangeText: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
};

export default function SaveTemplateModal({
  visible,
  value,
  loading,
  onChangeText,
  onClose,
  onSave,
}: Props) {
  const { colors, fonts } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);

  return (
    <AppPopup
      visible={visible}
      onClose={onClose}
      eyebrow="Save template"
      title="Create a reusable workout"
      subtitle="This stores exercise order and set counts. Weight and rep inputs stay live so your latest performance can keep filling the placeholders."
      showCloseButton
    >
      <View style={styles.fieldWrap}>
        <Text style={styles.label}>Template name</Text>
        <TextInput
          style={styles.input}
          placeholder="Push day template"
          placeholderTextColor={HOME_TONES.textTertiary}
          value={value}
          onChangeText={onChangeText}
          autoCapitalize="words"
          autoCorrect={false}
          editable={!loading}
          maxLength={120}
        />
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          activeOpacity={0.92}
          style={[styles.buttonSecondary, styles.actionButton]}
          onPress={onClose}
          disabled={loading}
        >
          <Text style={styles.buttonTextSecondary}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.92}
          style={[styles.buttonPrimary, styles.actionButton, loading ? styles.buttonBusy : null]}
          onPress={onSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.blkText} />
          ) : (
            <Text style={styles.buttonTextPrimary}>Save template</Text>
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
    fieldWrap: {
      marginTop: 18,
      gap: 10,
    },
    label: {
      color: HOME_TONES.textSecondary,
      fontFamily: fonts.label,
      fontSize: 11,
      lineHeight: 14,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    input: {
      minHeight: 52,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      backgroundColor: HOME_TONES.surface2,
      paddingHorizontal: 16,
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.body,
      fontSize: 15,
      lineHeight: 20,
    },
    actions: {
      marginTop: 18,
      flexDirection: 'row',
      gap: 10,
    },
    actionButton: {
      flex: 1,
    },
    buttonPrimary: {
      minHeight: 48,
      borderRadius: 16,
      paddingHorizontal: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.highlight1,
      borderWidth: 1,
      borderColor: colors.highlight1,
    },
    buttonSecondary: {
      minHeight: 48,
      borderRadius: 16,
      paddingHorizontal: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: HOME_TONES.surface2,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
    },
    buttonTextPrimary: {
      color: colors.blkText,
      fontFamily: fonts.heading,
      fontSize: 14,
      lineHeight: 18,
    },
    buttonTextSecondary: {
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.heading,
      fontSize: 14,
      lineHeight: 18,
    },
    buttonBusy: {
      opacity: 0.88,
    },
  });
}
