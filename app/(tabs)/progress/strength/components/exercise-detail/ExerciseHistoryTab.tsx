import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { WeightUnit } from '@/contexts/UnitsContext';
import { useAppTheme } from '@/providers/AppThemeProvider';

import {
  EXERCISE_HISTORY_SORT_OPTIONS,
  formatMassFromKg,
  formatSetPerformance,
  sortExerciseHistory,
  type ExerciseHistorySortId,
  type StrengthExerciseDetailModel,
} from './strengthExerciseDetailUtils';

type Props = {
  detail: StrengthExerciseDetailModel;
  weightUnit: WeightUnit;
};

export default function ExerciseHistoryTab({ detail, weightUnit }: Props) {
  const { colors, fonts } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);
  const [sortId, setSortId] = useState<ExerciseHistorySortId>('recent');

  const sortedSets = useMemo(
    () => sortExerciseHistory(detail.sets, sortId),
    [detail.sets, sortId]
  );

  return (
    <View style={styles.section}>
      <View style={styles.headerCard}>
        <Text style={styles.headerEyebrow}>Set history</Text>
        <Text style={styles.headerTitle}>Every logged set for this exercise</Text>
        <Text style={styles.headerText}>
          The default view stays chronological. Switch sorting to surface the
          biggest volume, 1RM, load, or rep performances faster.
        </Text>

        <View style={styles.metaRow}>
          <View style={styles.metaPill}>
            <Text style={styles.metaPillText}>{detail.metrics.totalSets} total sets</Text>
          </View>
          <View style={styles.metaPill}>
            <Text style={styles.metaPillText}>{detail.metrics.totalSessions} workouts</Text>
          </View>
        </View>
      </View>

      <View style={styles.chipRow}>
        {EXERCISE_HISTORY_SORT_OPTIONS.map((option) => {
          const active = option.id === sortId;

          return (
            <Pressable
              key={option.id}
              accessibilityRole="button"
              onPress={() => setSortId(option.id)}
              style={[styles.chip, active ? styles.chipActive : null]}
            >
              <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {sortedSets.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No sets to review</Text>
          <Text style={styles.emptyText}>
            This exercise has not been logged in any completed workout yet.
          </Text>
        </View>
      ) : null}

      {sortedSets.map((set) => (
        <View key={set.id} style={styles.setCard}>
          <View style={styles.setTopRow}>
            <View style={styles.setCopy}>
              <Text style={styles.setDate}>{set.dateTimeLabel}</Text>
              <Text style={styles.setMeta}>
                Set {set.setIndex} • {set.setType}
              </Text>
            </View>

            <Text style={styles.setValue}>{formatSetPerformance(set, weightUnit)}</Text>
          </View>

          <View style={styles.metricRow}>
            <View style={styles.metricPill}>
              <Text style={styles.metricLabel}>Set volume</Text>
              <Text style={styles.metricValue}>
                {formatMassFromKg(set.volumeKg, weightUnit, 0)}
              </Text>
            </View>

            <View style={styles.metricPill}>
              <Text style={styles.metricLabel}>Est. 1RM</Text>
              <Text style={styles.metricValue}>
                {formatMassFromKg(set.est1RmKg, weightUnit, 0)}
              </Text>
            </View>

            <View style={styles.metricPill}>
              <Text style={styles.metricLabel}>Session</Text>
              <Text style={styles.metricValue}>
                {formatMassFromKg(set.sessionVolumeKg, weightUnit, 0)}
              </Text>
            </View>
          </View>

          {set.notes ? <Text style={styles.notes}>{set.notes}</Text> : null}
        </View>
      ))}
    </View>
  );
}

function createStyles(
  colors: ReturnType<typeof useAppTheme>['colors'],
  fonts: ReturnType<typeof useAppTheme>['fonts']
) {
  return StyleSheet.create({
    section: {
      gap: 16,
    },
    headerCard: {
      borderRadius: 24,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card2,
      paddingHorizontal: 16,
      paddingVertical: 16,
      gap: 8,
    },
    headerEyebrow: {
      color: colors.highlight2,
      fontFamily: fonts.label,
      fontSize: 11,
      lineHeight: 14,
      letterSpacing: 0.9,
      textTransform: 'uppercase',
    },
    headerTitle: {
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 20,
      lineHeight: 25,
    },
    headerText: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 19,
    },
    metaRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginTop: 4,
    },
    metaPill: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.borderStrong,
      backgroundColor: colors.card3,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    metaPillText: {
      color: colors.text,
      fontFamily: fonts.label,
      fontSize: 11,
      lineHeight: 14,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    chip: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card2,
      paddingHorizontal: 12,
      paddingVertical: 9,
    },
    chipActive: {
      backgroundColor: colors.card3,
      borderColor: colors.borderStrong,
    },
    chipText: {
      color: colors.textMuted,
      fontFamily: fonts.label,
      fontSize: 11,
      lineHeight: 14,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    chipTextActive: {
      color: colors.text,
    },
    emptyCard: {
      borderRadius: 24,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card2,
      paddingHorizontal: 18,
      paddingVertical: 18,
      gap: 8,
    },
    emptyTitle: {
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 18,
      lineHeight: 22,
    },
    emptyText: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 19,
    },
    setCard: {
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card2,
      paddingHorizontal: 16,
      paddingVertical: 16,
      gap: 12,
    },
    setTopRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
    },
    setCopy: {
      flex: 1,
    },
    setDate: {
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 15,
      lineHeight: 19,
    },
    setMeta: {
      marginTop: 4,
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 16,
      textTransform: 'capitalize',
    },
    setValue: {
      color: colors.text,
      fontFamily: fonts.mono,
      fontSize: 17,
      lineHeight: 21,
      textAlign: 'right',
      fontVariant: ['tabular-nums'],
    },
    metricRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    metricPill: {
      minWidth: 92,
      borderRadius: 16,
      backgroundColor: colors.card3,
      paddingHorizontal: 12,
      paddingVertical: 10,
      gap: 4,
    },
    metricLabel: {
      color: colors.textMuted,
      fontFamily: fonts.label,
      fontSize: 10,
      lineHeight: 13,
      letterSpacing: 0.55,
      textTransform: 'uppercase',
    },
    metricValue: {
      color: colors.text,
      fontFamily: fonts.mono,
      fontSize: 13,
      lineHeight: 17,
      fontVariant: ['tabular-nums'],
    },
    notes: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 17,
    },
  });
}
