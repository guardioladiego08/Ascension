import React from 'react';
import {
  StyleProp,
  Text,
  View,
  ViewStyle,
} from 'react-native';

import { useAuthDesignSystem } from '../designSystem';

type AuthFieldProps = {
  label: string;
  helperText?: React.ReactNode;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export default function AuthField({
  label,
  helperText,
  children,
  style,
}: AuthFieldProps) {
  const ui = useAuthDesignSystem();

  return (
    <View style={[ui.fragments.fieldGroup, style]}>
      <Text style={ui.fragments.label}>{label}</Text>
      {children}
      {helperText ? <Text style={ui.fragments.helperText}>{helperText}</Text> : null}
    </View>
  );
}
