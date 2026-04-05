import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import BadgeCard from '@/components/badges/BadgeCard';
import { getBadgeProgress } from '@/lib/badges/api';
import type { BadgeProgressItem } from '@/lib/badges/types';
import { useAppTheme } from '@/providers/AppThemeProvider';

function formatMetricValue(value: number) {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(1);
}

function buildProgressText(item: BadgeProgressItem) {
  if (item.nextThresholdValue == null) {
    return item.highestTierName ? `${item.highestTierName} unlocked` : 'Unlocked';
  }

  return `${formatMetricValue(item.progressValue)} / ${formatMetricValue(item.nextThresholdValue)}`;
}

function buildDetailText(item: BadgeProgressItem) {
  if (item.nextTierName && item.remainingToNext != null) {
    return `${formatMetricValue(item.remainingToNext)} remaining to ${item.nextTierName}.`;
  }

  if (item.highestTierName) {
    return `${item.highestTierName} is your highest unlocked tier.`;
  }

  return 'Complete more strength training to unlock this badge.';
}

export default function StrengthBadgesSection() {
  const { colors, fonts } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);

  const [badges, setBadges] = useState<BadgeProgressItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setErrorText(null);
      const rows = await getBadgeProgress({
        domain: 'strength',
        limit: 24,
      });
      setBadges(rows);
    } catch (error: any) {
      console.warn('[StrengthBadgesSection] Failed to load badges', error);
      setBadges([]);
      setErrorText(error?.message ?? 'Could not load strength badges.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
      return undefined;
    }, [load])
  );

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>Strength badges</Text>
          <Text style={styles.title}>Track milestones, streaks, and records</Text>
          <Text style={styles.subtitle}>
            Every strength badge series shares the same schema and progress model, so your workout,
            streak, and PR achievements live together in one section.
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.stateCard}>
          <ActivityIndicator size="small" color={colors.highlight1} />
          <Text style={styles.stateText}>Loading strength badges...</Text>
        </View>
      ) : null}

      {errorText ? (
        <View style={styles.errorCard}>
          <View style={styles.errorRow}>
            <Ionicons name="alert-circle-outline" size={18} color={colors.warning} />
            <Text style={styles.errorText}>{errorText}</Text>
          </View>
        </View>
      ) : null}

      {!loading && !errorText ? (
        <View style={styles.grid}>
          {badges.map((badge) => (
            <View key={badge.badgeSeriesId} style={styles.gridItem}>
              <BadgeCard
                domain={badge.domain}
                iconPlaceholder={
                  badge.highestIconPlaceholder ??
                  badge.nextIconPlaceholder ??
                  badge.seriesIconPlaceholder
                }
                title={badge.name}
                description={badge.description}
                tierName={badge.highestTierName}
                progressText={buildProgressText(badge)}
                detailText={buildDetailText(badge)}
              />
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function createStyles(
  colors: ReturnType<typeof useAppTheme>['colors'],
  fonts: ReturnType<typeof useAppTheme>['fonts']
) {
  return StyleSheet.create({
    section: {
      marginTop: 26,
      gap: 16,
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
      marginTop: 10,
      color: colors.text,
      fontFamily: fonts.display,
      fontSize: 26,
      lineHeight: 29,
      letterSpacing: -0.8,
    },
    subtitle: {
      marginTop: 10,
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 18,
      maxWidth: 340,
    },
    stateCard: {
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card2,
      paddingHorizontal: 18,
      paddingVertical: 18,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    stateText: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 18,
    },
    errorCard: {
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.glowSecondary,
      backgroundColor: colors.accentSecondarySoft,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    errorRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    errorText: {
      flex: 1,
      color: colors.text,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 18,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    gridItem: {
      width: '100%',
    },
  });
}
