import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAuthDesignSystem } from '../designSystem';

type AuthButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

export default function AuthButton({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  icon,
  style,
  textStyle,
}: AuthButtonProps) {
  const ui = useAuthDesignSystem();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        button:
          variant === 'primary'
            ? ui.fragments.primaryButton
            : ui.fragments.secondaryButton,
        text:
          variant === 'primary'
            ? ui.fragments.primaryButtonText
            : ui.fragments.secondaryButtonText,
      }),
    [ui, variant]
  );

  const iconColor = variant === 'primary' ? ui.colors.blkText : ui.colors.text;

  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.button,
        (disabled || loading) && ui.fragments.buttonDisabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={iconColor} />
      ) : (
        <>
          <Text style={[styles.text, textStyle]}>{label}</Text>
          {icon ? <Ionicons name={icon} size={18} color={iconColor} /> : null}
        </>
      )}
    </TouchableOpacity>
  );
}
