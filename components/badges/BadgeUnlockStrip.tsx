import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '@/providers/AppThemeProvider';

import type { BadgeUnlockItem } from '@/lib/badges/types';

import BadgeChip from './BadgeChip';

export default function BadgeUnlockStrip({
  title,
  badges,
  compact = false,
  emptyText,
}: {
  title: string;
  badges: BadgeUnlockItem[];
  compact?: boolean;
  emptyText?: string;
}) {
  const { colors, fonts } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);

  if (badges.length === 0) {
    if (!emptyText) return null;
    return <Text style={styles.emptyText}>{emptyText}</Text>;
  }

  return (
    <View style={styles.section}>
      <Text style={styles.title}>{title}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {badges.map((badge) => (
          <BadgeChip
            key={badge.unlockId}
            domain={badge.domain}
            iconPlaceholder={badge.tierIconPlaceholder || badge.seriesIconPlaceholder}
            label={badge.name}
            tierName={badge.tierName}
            compact={compact}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function createStyles(
  colors: ReturnType<typeof useAppTheme>['colors'],
  fonts: ReturnType<typeof useAppTheme>['fonts']
) {
  return StyleSheet.create({
    section: {
      gap: 10,
    },
    title: {
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 15,
      lineHeight: 18,
    },
    row: {
      gap: 10,
      paddingRight: 4,
    },
    emptyText: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 17,
    },
  });
}
