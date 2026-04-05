import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '@/providers/AppThemeProvider';

import type { BadgeDomain } from '@/lib/badges/types';

import BadgePlaceholderIcon from './BadgePlaceholderIcon';

export default function BadgeCard({
  domain,
  iconPlaceholder,
  title,
  description,
  tierName,
  progressText,
  detailText,
}: {
  domain: BadgeDomain;
  iconPlaceholder: string;
  title: string;
  description: string | null;
  tierName?: string | null;
  progressText?: string | null;
  detailText?: string | null;
}) {
  const { colors, fonts } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <BadgePlaceholderIcon domain={domain} iconPlaceholder={iconPlaceholder} size={48} />
        <View style={styles.headerCopy}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.tier}>{tierName ?? 'Locked'}</Text>
        </View>
      </View>

      {description ? <Text style={styles.description}>{description}</Text> : null}

      {progressText ? (
        <View style={styles.progressPill}>
          <Text style={styles.progressPillText}>{progressText}</Text>
        </View>
      ) : null}

      {detailText ? <Text style={styles.detail}>{detailText}</Text> : null}
    </View>
  );
}

function createStyles(
  colors: ReturnType<typeof useAppTheme>['colors'],
  fonts: ReturnType<typeof useAppTheme>['fonts']
) {
  return StyleSheet.create({
    card: {
      minWidth: 0,
      flex: 1,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card2,
      paddingHorizontal: 16,
      paddingVertical: 16,
      gap: 12,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    headerCopy: {
      flex: 1,
      gap: 4,
    },
    title: {
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 15,
      lineHeight: 18,
    },
    tier: {
      color: colors.textMuted,
      fontFamily: fonts.label,
      fontSize: 11,
      lineHeight: 14,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    description: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 18,
    },
    progressPill: {
      alignSelf: 'flex-start',
      borderRadius: 999,
      backgroundColor: colors.card3,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    progressPillText: {
      color: colors.text,
      fontFamily: fonts.mono,
      fontSize: 12,
      lineHeight: 16,
      fontVariant: ['tabular-nums'],
    },
    detail: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 17,
    },
  });
}
