import React, { useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '@/providers/AppThemeProvider';

import type { BadgeUnlockItem } from '@/lib/badges/types';

import BadgeChip from './BadgeChip';

export default function BadgeSummarySection({
  title,
  subtitle,
  emptyText,
  loadingText,
  badges,
  loading,
  errorText,
}: {
  title: string;
  subtitle: string;
  emptyText: string;
  loadingText: string;
  badges: BadgeUnlockItem[];
  loading: boolean;
  errorText: string | null;
}) {
  const { colors, fonts, globalStyles } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);

  return (
    <View style={[globalStyles.panelSoft, styles.card]}>
      <View style={styles.headerRow}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>New badges</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.stateRow}>
          <ActivityIndicator size="small" color={colors.highlight1} />
          <Text style={styles.stateText}>{loadingText}</Text>
        </View>
      ) : null}

      {!loading && errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}

      {!loading && !errorText && badges.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.badgeRow}
        >
          {badges.map((badge) => (
            <BadgeChip
              key={badge.unlockId}
              domain={badge.domain}
              iconPlaceholder={badge.tierIconPlaceholder || badge.seriesIconPlaceholder}
              label={badge.name}
              tierName={badge.tierName}
            />
          ))}
        </ScrollView>
      ) : null}

      {!loading && !errorText && badges.length === 0 ? (
        <Text style={styles.emptyText}>{emptyText}</Text>
      ) : null}
    </View>
  );
}

function createStyles(
  colors: ReturnType<typeof useAppTheme>['colors'],
  fonts: ReturnType<typeof useAppTheme>['fonts']
) {
  return StyleSheet.create({
    card: {
      gap: 14,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
    },
    headerCopy: {
      flex: 1,
    },
    eyebrow: {
      color: colors.highlight2,
      fontFamily: fonts.label,
      fontSize: 11,
      lineHeight: 14,
      letterSpacing: 1.1,
      textTransform: 'uppercase',
    },
    title: {
      marginTop: 8,
      color: colors.text,
      fontFamily: fonts.display,
      fontSize: 26,
      lineHeight: 29,
      letterSpacing: -0.6,
    },
    subtitle: {
      marginTop: 8,
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 18,
      maxWidth: 340,
    },
    badgeRow: {
      gap: 10,
      paddingRight: 4,
    },
    stateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    stateText: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 18,
    },
    emptyText: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 18,
    },
    errorText: {
      color: colors.danger,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 18,
    },
  });
}
