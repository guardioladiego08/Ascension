import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import BadgeCard from '@/components/badges/BadgeCard';
import { useUnits } from '@/contexts/UnitsContext';
import { getBadgeProgress } from '@/lib/badges/api';
import type { BadgeProgressItem } from '@/lib/badges/types';
import { useAppTheme } from '@/providers/AppThemeProvider';

import {
  formatDistanceValue,
  formatDurationDetailed,
  formatElevationValue,
  formatPaceValue,
} from './runningProgressUtils';

const M_PER_MI = 1609.344;

function formatClock(totalSeconds: number | null) {
  if (!totalSeconds || !Number.isFinite(totalSeconds) || totalSeconds <= 0) return '—';

  const rounded = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor((rounded % 3600) / 60);
  const seconds = rounded % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function speedToPaceSecondsPerUnit(speedMps: number | null, distanceUnit: 'mi' | 'km') {
  if (!speedMps || !Number.isFinite(speedMps) || speedMps <= 0) return null;
  const unitMeters = distanceUnit === 'mi' ? M_PER_MI : 1000;
  return unitMeters / speedMps;
}

function targetDistanceForCode(code: string) {
  switch (code) {
    case 'fastest_mile':
      return 1609.34;
    case 'fastest_5k':
      return 5000;
    case 'fastest_10k':
      return 10000;
    case 'fastest_half':
      return 21097.5;
    case 'fastest_marathon':
      return 42195;
    default:
      return null;
  }
}

function formatRunningValue(
  item: BadgeProgressItem,
  value: number | null,
  distanceUnit: 'mi' | 'km'
) {
  if (value == null || !Number.isFinite(value) || value <= 0) {
    if (item.code === 'first_run') {
      return '0';
    }
    return '—';
  }

  switch (item.code) {
    case 'first_run':
    case 'total_runs':
    case 'weekly_run_count':
    case 'run_streak_days':
    case 'weekly_run_streak':
      return String(Math.round(value));
    case 'lifetime_distance':
    case 'longest_run':
    case 'distance_milestones':
      return formatDistanceValue(value, distanceUnit, value >= 10000 ? 1 : 2);
    case 'total_time':
      return formatDurationDetailed(value);
    case 'elevation_gain':
      return formatElevationValue(value, distanceUnit);
    case 'pace_record':
      return formatPaceValue(speedToPaceSecondsPerUnit(value, distanceUnit), distanceUnit);
    default: {
      const targetDistance = targetDistanceForCode(item.code);
      if (targetDistance) {
        return formatClock(targetDistance / value);
      }

      return String(Math.round(value));
    }
  }
}

function formatRunningRemaining(
  item: BadgeProgressItem,
  value: number | null,
  distanceUnit: 'mi' | 'km'
) {
  if (value == null || !Number.isFinite(value) || value <= 0) return '—';

  switch (item.code) {
    case 'total_runs':
    case 'weekly_run_count':
      return `${Math.round(value)} runs`;
    case 'run_streak_days':
      return `${Math.round(value)} days`;
    case 'weekly_run_streak':
      return `${Math.round(value)} weeks`;
    case 'lifetime_distance':
    case 'longest_run':
    case 'distance_milestones':
      return formatDistanceValue(value, distanceUnit, value >= 10000 ? 1 : 2);
    case 'total_time':
      return formatDurationDetailed(value);
    case 'elevation_gain':
      return formatElevationValue(value, distanceUnit);
    default:
      return formatRunningValue(item, value, distanceUnit);
  }
}

function buildProgressText(item: BadgeProgressItem, distanceUnit: 'mi' | 'km') {
  const current = formatRunningValue(item, item.progressValue, distanceUnit);

  if (item.nextThresholdValue == null) {
    return current === '—'
      ? item.highestTierName
        ? `${item.highestTierName} unlocked`
        : 'Unlocked'
      : current;
  }

  const next = formatRunningValue(item, item.nextThresholdValue, distanceUnit);
  return `${current} / ${next}`;
}

function buildDetailText(item: BadgeProgressItem, distanceUnit: 'mi' | 'km') {
  switch (item.code) {
    case 'run_streak_days':
      return `Current streak: ${Math.round(item.currentValue)} days. Best streak: ${Math.round(item.progressValue)} days.`;
    case 'weekly_run_count':
      return `Best week: ${Math.round(item.progressValue)} runs. Current week: ${Math.round(item.currentValue)} runs.`;
    case 'weekly_run_streak':
      return `Current streak: ${Math.round(item.currentValue)} weeks with 3+ runs.`;
    case 'pace_record': {
      const bestPace = formatRunningValue(item, item.progressValue, distanceUnit);
      const nextPace = formatRunningValue(item, item.nextThresholdValue, distanceUnit);
      return item.nextThresholdValue == null
        ? `Best average pace: ${bestPace}.`
        : `Best average pace: ${bestPace}. Next target: ${nextPace}.`;
    }
    case 'fastest_mile':
    case 'fastest_5k':
    case 'fastest_10k':
    case 'fastest_half':
    case 'fastest_marathon': {
      const targetDistance = targetDistanceForCode(item.code);
      const targetLabel =
        item.code === 'fastest_mile'
          ? 'mile'
          : item.code === 'fastest_5k'
          ? '5K'
          : item.code === 'fastest_10k'
          ? '10K'
          : item.code === 'fastest_half'
          ? 'half marathon'
          : 'marathon';

      if (!item.progressValue || item.progressValue <= 0) {
        return `Log a run at least ${targetDistance ? formatDistanceValue(targetDistance, distanceUnit, 2) : targetLabel} long to unlock this badge.`;
      }

      const bestTime = formatRunningValue(item, item.progressValue, distanceUnit);
      const nextTime = formatRunningValue(item, item.nextThresholdValue, distanceUnit);
      return item.nextThresholdValue == null
        ? `Best equivalent ${targetLabel} performance: ${bestTime}.`
        : `Best equivalent ${targetLabel} performance: ${bestTime}. Next target: ${nextTime}.`;
    }
    default:
      if (item.nextTierName && item.remainingToNext != null) {
        return `${formatRunningRemaining(item, item.remainingToNext, distanceUnit)} remaining to ${item.nextTierName}.`;
      }

      if (item.highestTierName) {
        return `${item.highestTierName} is your highest unlocked tier.`;
      }

      return 'Complete more runs to unlock this badge.';
  }
}

export default function RunningBadgesSection() {
  const { colors, fonts } = useAppTheme();
  const { distanceUnit } = useUnits();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);

  const [badges, setBadges] = useState<BadgeProgressItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setErrorText(null);
      const rows = await getBadgeProgress({
        domain: 'running',
        limit: 24,
      });
      setBadges(rows);
    } catch (error: any) {
      console.warn('[RunningBadgesSection] Failed to load badges', error);
      setBadges([]);
      setErrorText(error?.message ?? 'Could not load running badges.');
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
          <Text style={styles.eyebrow}>Running badges</Text>
          <Text style={styles.title}>Track streaks, mileage blocks, and pace records</Text>
          <Text style={styles.subtitle}>
            Running badges use the same shared badge schema as strength, with run-specific record,
            distance, time, elevation, and streak progress layered into this section.
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.stateCard}>
          <ActivityIndicator size="small" color={colors.highlight1} />
          <Text style={styles.stateText}>Loading running badges...</Text>
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
                progressText={buildProgressText(badge, distanceUnit)}
                detailText={buildDetailText(badge, distanceUnit)}
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
