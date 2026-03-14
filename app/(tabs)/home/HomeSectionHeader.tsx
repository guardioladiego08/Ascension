import React from 'react';
import { Text, View } from 'react-native';

import type { useAppTheme } from '@/providers/AppThemeProvider';
import type { HomeStyles } from './styles';

export function HomeSectionHeader({
  eyebrow,
  title,
  subtitle,
  styles,
  globalStyles,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  styles: HomeStyles;
  globalStyles: ReturnType<typeof useAppTheme>['globalStyles'];
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={globalStyles.eyebrow}>{eyebrow}</Text>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionSubtitle}>{subtitle}</Text>
    </View>
  );
}
