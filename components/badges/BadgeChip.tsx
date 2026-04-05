import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '@/providers/AppThemeProvider';

import type { BadgeDomain } from '@/lib/badges/types';

import BadgePlaceholderIcon from './BadgePlaceholderIcon';

export default function BadgeChip({
  domain,
  iconPlaceholder,
  label,
  tierName,
  compact = false,
}: {
  domain: BadgeDomain;
  iconPlaceholder: string;
  label: string;
  tierName?: string | null;
  compact?: boolean;
}) {
  const { colors, fonts } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);

  return (
    <View style={[styles.chip, compact ? styles.chipCompact : null]}>
      <BadgePlaceholderIcon
        domain={domain}
        iconPlaceholder={iconPlaceholder}
        size={compact ? 34 : 40}
      />

      <View style={styles.copy}>
        <Text numberOfLines={1} style={[styles.label, compact ? styles.labelCompact : null]}>
          {label}
        </Text>
        {tierName ? (
          <Text numberOfLines={1} style={styles.tier}>
            {tierName}
          </Text>
        ) : null}
      </View>

      <View style={styles.placeholderPill}>
        <Text style={styles.placeholderPillText}>Icon</Text>
      </View>
    </View>
  );
}

function createStyles(
  colors: ReturnType<typeof useAppTheme>['colors'],
  fonts: ReturnType<typeof useAppTheme>['fonts']
) {
  return StyleSheet.create({
    chip: {
      minWidth: 150,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card2,
      paddingHorizontal: 10,
      paddingVertical: 10,
    },
    chipCompact: {
      minWidth: 132,
      borderRadius: 16,
      paddingHorizontal: 9,
      paddingVertical: 8,
    },
    copy: {
      flex: 1,
      gap: 2,
    },
    label: {
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 13,
      lineHeight: 16,
    },
    labelCompact: {
      fontSize: 12,
      lineHeight: 15,
    },
    tier: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 11,
      lineHeight: 14,
    },
    placeholderPill: {
      borderRadius: 999,
      backgroundColor: colors.card3,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    placeholderPillText: {
      color: colors.textMuted,
      fontFamily: fonts.label,
      fontSize: 9,
      lineHeight: 12,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
  });
}
