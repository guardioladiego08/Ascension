import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import BadgeCard from '@/components/badges/BadgeCard';
import { getBadgeProgress } from '@/lib/badges/api';
import type { BadgeProgressItem } from '@/lib/badges/types';
import { useAppTheme } from '@/providers/AppThemeProvider';

function formatNutritionValue(item: BadgeProgressItem, value: number | null) {
  if (value == null || !Number.isFinite(value)) {
    return '—';
  }

  if (value <= 0) {
    switch (item.code) {
      case 'weekly_consistency_weeks':
        return '0 wk';
      case 'protein_day_record':
        return '0 g';
      case 'meal_entry_record':
        return '0 entries';
      default:
        return '0 days';
    }
  }

  switch (item.code) {
    case 'weekly_consistency_weeks':
      return `${Math.round(value)} wk`;
    case 'protein_day_record':
      return `${Math.round(value)} g`;
    case 'meal_entry_record':
      return `${Math.round(value)} entries`;
    default:
      return `${Math.round(value)} days`;
  }
}

function formatNutritionRemaining(item: BadgeProgressItem, value: number | null) {
  if (value == null || !Number.isFinite(value) || value <= 0) return '—';

  switch (item.code) {
    case 'weekly_consistency_weeks':
      return `${Math.round(value)} weeks`;
    case 'protein_day_record':
      return `${Math.round(value)} g`;
    case 'meal_entry_record':
      return `${Math.round(value)} entries`;
    default:
      return `${Math.round(value)} days`;
  }
}

function buildProgressText(item: BadgeProgressItem) {
  const current = formatNutritionValue(item, item.progressValue);

  if (item.nextThresholdValue == null) {
    return current === '—'
      ? item.highestTierName
        ? `${item.highestTierName} unlocked`
        : 'Unlocked'
      : current;
  }

  const next = formatNutritionValue(item, item.nextThresholdValue);
  return `${current} / ${next}`;
}

function buildDetailText(item: BadgeProgressItem) {
  switch (item.code) {
    case 'logging_streak':
      return `Current streak: ${Math.round(item.currentValue)} days. Best streak: ${Math.round(item.progressValue)} days.`;
    case 'goal_hit_streak':
      return `Current streak: ${Math.round(item.currentValue)} goal-hit days. Best streak: ${Math.round(item.progressValue)} days.`;
    case 'protein_day_record':
      return item.nextThresholdValue == null
        ? `Best logged protein day: ${Math.round(item.progressValue)} g.`
        : `Best logged protein day: ${Math.round(item.progressValue)} g. Next target: ${Math.round(item.nextThresholdValue)} g.`;
    case 'meal_entry_record':
      return item.nextThresholdValue == null
        ? `Most logged entries in one day: ${Math.round(item.progressValue)}.`
        : `Most logged entries in one day: ${Math.round(item.progressValue)}. Next target: ${Math.round(item.nextThresholdValue)} entries.`;
    case 'weekly_consistency_weeks':
      return `Weeks with at least five logged days: ${Math.round(item.progressValue)}.`;
    default:
      if (item.nextTierName && item.remainingToNext != null) {
        return `${formatNutritionRemaining(item, item.remainingToNext)} remaining to ${item.nextTierName}.`;
      }

      if (item.highestTierName) {
        return `${item.highestTierName} is your highest unlocked tier.`;
      }

      return 'Keep logging full nutrition days to unlock this badge.';
  }
}

export default function NutritionBadgesSection() {
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
        domain: 'nutrition',
        limit: 24,
      });
      setBadges(rows);
    } catch (error: any) {
      console.warn('[NutritionBadgesSection] Failed to load badges', error);
      setBadges([]);
      setErrorText(error?.message ?? 'Could not load nutrition badges.');
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
          <Text style={styles.eyebrow}>Nutrition badges</Text>
          <Text style={styles.title}>Track logging depth, consistency, and meal coverage</Text>
          <Text style={styles.subtitle}>
            Nutrition badges reuse the shared badge schema, but progress is driven by diary-day totals,
            goal-hit days, meal-slot coverage, and single-day logging records.
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.stateCard}>
          <ActivityIndicator size="small" color={colors.highlight1} />
          <Text style={styles.stateText}>Loading nutrition badges...</Text>
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
      color: colors.highlight1,
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
