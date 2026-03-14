import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Text, TouchableOpacity, View } from 'react-native';

import type { useAppTheme } from '@/providers/AppThemeProvider';
import type { HomeStyles } from './styles';

export function HomeActionTile({
  title,
  subtitle,
  icon,
  accentColor,
  onPress,
  styles,
  globalStyles,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  accentColor: string;
  onPress: () => void;
  styles: HomeStyles;
  globalStyles: ReturnType<typeof useAppTheme>['globalStyles'];
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.92}
      style={[globalStyles.panelSoft, styles.actionTile]}
      onPress={onPress}
    >
      <View style={[styles.actionIconWrap, { backgroundColor: accentColor }]}>{icon}</View>
      <Text style={styles.actionTitle}>{title}</Text>
      <Text style={styles.actionSubtitle}>{subtitle}</Text>
      <View style={styles.actionFooter}>
        <Text style={styles.actionFooterText}>Open</Text>
        <Ionicons name="arrow-forward" size={14} color="#F5F7FA" />
      </View>
    </TouchableOpacity>
  );
}
