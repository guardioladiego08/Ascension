import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Text, TouchableOpacity, View } from 'react-native';

import type { HomeStyles } from './styles';

export function HomeCompletionCard({
  eyebrow,
  title,
  accentColor,
  iconName,
  stats,
  footer,
  onPress,
  styles,
}: {
  eyebrow: string;
  title: string;
  accentColor: string;
  iconName: keyof typeof Ionicons.glyphMap;
  stats: Array<{ label: string; value: string }>;
  footer: string;
  onPress: () => void;
  styles: HomeStyles;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.94}
      style={[styles.panelSoft, styles.completionCard]}
      onPress={onPress}
    >
      <View style={styles.completionHeader}>
        <View>
          <Text style={styles.eyebrow}>{eyebrow}</Text>
          <Text style={styles.cardTitle}>{title}</Text>
        </View>

        <View style={[styles.completionIcon, { backgroundColor: `${accentColor}22` }]}>
          <Ionicons name={iconName} size={18} color={accentColor} />
        </View>
      </View>

      <View style={styles.completionStatsRow}>
        {stats.map((stat) => (
          <View key={stat.label} style={styles.completionStat}>
            <Text style={styles.completionStatLabel}>{stat.label}</Text>
            <Text style={styles.completionStatValue}>{stat.value}</Text>
          </View>
        ))}
      </View>

      <View style={styles.completionFooter}>
        <Text style={styles.completionFooterText}>{footer}</Text>
        <Ionicons name="arrow-forward" size={14} color={accentColor} />
      </View>
    </TouchableOpacity>
  );
}
