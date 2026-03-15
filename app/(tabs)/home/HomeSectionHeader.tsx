import React from 'react';
import { Text, View } from 'react-native';

import type { HomeStyles } from './styles';

export function HomeSectionHeader({
  eyebrow,
  title,
  subtitle,
  styles,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  styles: HomeStyles;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionSubtitle}>{subtitle}</Text>
    </View>
  );
}
