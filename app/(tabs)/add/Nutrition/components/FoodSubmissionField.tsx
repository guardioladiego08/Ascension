import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, KeyboardTypeOptions } from 'react-native';

import { useAppTheme } from '@/providers/AppThemeProvider';
import { HOME_TONES } from '../../../home/tokens';

type FoodSubmissionFieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  required?: boolean;
  keyboardType?: KeyboardTypeOptions;
  multiline?: boolean;
  placeholder?: string;
};

export default function FoodSubmissionField({
  label,
  value,
  onChangeText,
  required = false,
  keyboardType = 'default',
  multiline = false,
  placeholder,
}: FoodSubmissionFieldProps) {
  const { colors, fonts } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);

  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>

      <TextInput
        style={[styles.input, multiline ? styles.inputMultiline : null]}
        placeholder={placeholder}
        placeholderTextColor={HOME_TONES.textTertiary}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        multiline={multiline}
      />
    </View>
  );
}

function createStyles(
  colors: ReturnType<typeof useAppTheme>['colors'],
  fonts: ReturnType<typeof useAppTheme>['fonts']
) {
  return StyleSheet.create({
    fieldWrap: {
      gap: 6,
    },
    fieldLabel: {
      color: HOME_TONES.textSecondary,
      fontFamily: fonts.label,
      fontSize: 11,
      lineHeight: 14,
      letterSpacing: 0.45,
      textTransform: 'uppercase',
    },
    required: {
      color: colors.danger,
    },
    input: {
      minHeight: 46,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      backgroundColor: HOME_TONES.surface2,
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.body,
      fontSize: 14,
      lineHeight: 18,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    inputMultiline: {
      minHeight: 86,
      textAlignVertical: 'top',
    },
  });
}
