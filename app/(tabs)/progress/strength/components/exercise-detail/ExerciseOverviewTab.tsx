import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { WeightUnit } from '@/contexts/UnitsContext';
import { useAppTheme } from '@/providers/AppThemeProvider';

import {
  formatDateBadge,
  formatDurationDetailed,
  formatMassFromKg,
  formatSetPerformance,
  formatSignedMassDelta,
  type StrengthExerciseDetailModel,
} from './strengthExerciseDetailUtils';

type Props = {
  detail: StrengthExerciseDetailModel;
  weightUnit: WeightUnit;
  onOpenHistory: () => void;
};

type RecordCard = {
  key: string;
  label: string;
  value: string;
  detail: string;
  date: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone: 'primary' | 'secondary' | 'tertiary' | 'warning';
};

export default function ExerciseOverviewTab({
  detail,
  weightUnit,
  onOpenHistory,
}: Props) {
  const { colors, fonts } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);

  if (detail.metrics.totalSessions === 0) {
    return (
      <View style={styles.emptyCard}>
        <Text style={styles.emptyTitle}>No records yet</Text>
        <Text style={styles.emptyText}>
          Log this exercise in a completed workout to populate personal records,
          best-set history, and trend charts.
        </Text>
      </View>
    );
  }

  const recordCards: RecordCard[] = [
    {
      key: 'one-rm',
      label: 'One-rep max',
      value: formatMassFromKg(detail.records.oneRepMax?.est1RmKg, weightUnit, 0),
      detail: detail.records.oneRepMax
        ? formatSetPerformance(detail.records.oneRepMax, weightUnit)
        : 'No max set yet',
      date: formatDateBadge(detail.records.oneRepMax?.performedAt),
      icon: 'trophy-outline',
      tone: 'primary',
    },
    {
      key: 'best-set',
      label: 'Best set',
      value: formatSetPerformance(detail.records.bestSet, weightUnit),
      detail: detail.records.bestSet
        ? `${formatMassFromKg(detail.records.bestSet.est1RmKg, weightUnit, 0)} est. 1RM`
        : 'No standout set yet',
      date: formatDateBadge(detail.records.bestSet?.performedAt),
      icon: 'flash-outline',
      tone: 'secondary',
    },
    {
      key: 'max-volume',
      label: 'Max volume',
      value: formatMassFromKg(detail.records.maxVolumeSession?.volumeKg, weightUnit, 0),
      detail: detail.records.maxVolumeSession
        ? `${detail.records.maxVolumeSession.setCount} sets • ${detail.records.maxVolumeSession.totalReps} reps`
        : 'No volume PR yet',
      date: formatDateBadge(detail.records.maxVolumeSession?.occurredAt),
      icon: 'barbell-outline',
      tone: 'tertiary',
    },
    {
      key: 'heaviest',
      label: 'Heaviest set',
      value: formatSetPerformance(detail.records.strongestSet, weightUnit),
      detail: detail.records.strongestSet
        ? `${formatMassFromKg(detail.records.strongestSet.est1RmKg, weightUnit, 0)} est. 1RM`
        : 'No heavy set yet',
      date: formatDateBadge(detail.records.strongestSet?.performedAt),
      icon: 'speedometer-outline',
      tone: 'warning',
    },
  ];

  const footprintCards = [
    {
      key: 'sessions',
      label: 'Sessions',
      value: `${detail.metrics.totalSessions}`,
      detail: 'completed workouts',
    },
    {
      key: 'sets',
      label: 'Total sets',
      value: `${detail.metrics.totalSets}`,
      detail: 'logged for this exercise',
    },
    {
      key: 'reps',
      label: 'Total reps',
      value: `${detail.metrics.totalReps}`,
      detail: 'completed overall',
    },
    {
      key: 'avg-session',
      label: 'Avg / session',
      value: formatMassFromKg(detail.metrics.avgVolumeKgPerSession, weightUnit, 0),
      detail: 'average exercise volume',
    },
    {
      key: 'time',
      label: 'Total time',
      value: formatDurationDetailed(detail.metrics.totalDurationSeconds),
      detail: 'workouts with end times',
    },
  ];

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionEyebrow}>Personal records</Text>
        <Text style={styles.sectionTitle}>Your best logged performances</Text>
        <Text style={styles.sectionText}>
          These records update from every completed strength workout tied to this
          exercise.
        </Text>
      </View>

      <View style={styles.recordGrid}>
        {recordCards.map((card) => (
          <View key={card.key} style={styles.recordCard}>
            <View style={styles.recordHeader}>
              <View style={[styles.recordIconWrap, toneStyle(card.tone, colors)]}>
                <Ionicons name={card.icon} size={16} color={colors.text} />
              </View>
              <Text style={styles.recordLabel}>{card.label}</Text>
            </View>

            <Text style={styles.recordValue}>{card.value}</Text>
            <Text style={styles.recordDetail}>{card.detail}</Text>
            <Text style={styles.recordDate}>{card.date}</Text>
          </View>
        ))}
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={onOpenHistory}
        style={styles.historyButton}
      >
        <Text style={styles.historyButtonText}>View Full Set History</Text>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </Pressable>

      <View style={styles.momentumCard}>
        <View style={styles.momentumHeader}>
          <Text style={styles.momentumLabel}>Momentum</Text>
          <Text style={styles.momentumSubtext}>
            {formatDateBadge(detail.firstLoggedAt)} to {formatDateBadge(detail.lastLoggedAt)}
          </Text>
        </View>

        <View style={styles.momentumRow}>
          <View style={styles.momentumStat}>
            <Text style={styles.momentumValue}>
              {formatSignedMassDelta(detail.progressDelta.oneRmKg, weightUnit)}
            </Text>
            <Text style={styles.momentumStatLabel}>Best 1RM change</Text>
          </View>

          <View style={styles.momentumDivider} />

          <View style={styles.momentumStat}>
            <Text style={styles.momentumValue}>
              {formatSignedMassDelta(detail.progressDelta.volumeKg, weightUnit)}
            </Text>
            <Text style={styles.momentumStatLabel}>Session volume change</Text>
          </View>
        </View>
      </View>

      <View style={styles.footprintCard}>
        <Text style={styles.subsectionLabel}>Lifting footprint</Text>
        <View style={styles.footprintGrid}>
          {footprintCards.map((card) => (
            <View key={card.key} style={styles.footprintTile}>
              <Text style={styles.footprintValue}>{card.value}</Text>
              <Text style={styles.footprintLabel}>{card.label}</Text>
              <Text style={styles.footprintDetail}>{card.detail}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.tableCard}>
        <View style={styles.tableHeaderRow}>
          <Text style={styles.subsectionLabel}>Rep records</Text>
          <Text style={styles.tableHint}>Best performed set for each rep count</Text>
        </View>

        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderText, styles.repCol]}>Reps</Text>
          <Text style={[styles.tableHeaderText, styles.setCol]}>Best set</Text>
          <Text style={[styles.tableHeaderText, styles.predictedCol]}>Est. 1RM</Text>
        </View>

        {detail.repRecords.map((record) => (
          <View key={record.reps} style={styles.tableRow}>
            <Text style={[styles.repValue, styles.repCol]}>{record.reps}</Text>
            <View style={styles.setCol}>
              <Text style={styles.tablePrimaryText}>
                {formatSetPerformance(record.set, weightUnit)}
              </Text>
              <Text style={styles.tableSecondaryText}>
                {formatDateBadge(record.set.performedAt)}
              </Text>
            </View>
            <Text style={[styles.predictedValue, styles.predictedCol]}>
              {formatMassFromKg(record.set.est1RmKg, weightUnit, 0)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function toneStyle(
  tone: RecordCard['tone'],
  colors: ReturnType<typeof useAppTheme>['colors']
) {
  switch (tone) {
    case 'secondary':
      return { backgroundColor: colors.accentSecondarySoft };
    case 'tertiary':
      return { backgroundColor: colors.accentTertiarySoft };
    case 'warning':
      return { backgroundColor: 'rgba(255, 195, 122, 0.18)' };
    case 'primary':
    default:
      return { backgroundColor: colors.accentSoft };
  }
}

function createStyles(
  colors: ReturnType<typeof useAppTheme>['colors'],
  fonts: ReturnType<typeof useAppTheme>['fonts']
) {
  return StyleSheet.create({
    section: {
      gap: 18,
    },
    sectionHeader: {
      gap: 6,
    },
    sectionEyebrow: {
      color: colors.highlight2,
      fontFamily: fonts.label,
      fontSize: 11,
      lineHeight: 14,
      letterSpacing: 0.9,
      textTransform: 'uppercase',
    },
    sectionTitle: {
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 20,
      lineHeight: 25,
    },
    sectionText: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 19,
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
    recordGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    recordCard: {
      width: '48%',
      minWidth: 150,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card2,
      paddingHorizontal: 14,
      paddingVertical: 14,
      gap: 10,
    },
    recordHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    recordIconWrap: {
      width: 30,
      height: 30,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    recordLabel: {
      flex: 1,
      color: colors.textMuted,
      fontFamily: fonts.label,
      fontSize: 11,
      lineHeight: 14,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    recordValue: {
      color: colors.text,
      fontFamily: fonts.mono,
      fontSize: 18,
      lineHeight: 22,
      fontVariant: ['tabular-nums'],
    },
    recordDetail: {
      color: colors.text,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 18,
    },
    recordDate: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 16,
    },
    historyButton: {
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.borderStrong,
      backgroundColor: colors.card3,
      paddingHorizontal: 18,
      paddingVertical: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    historyButtonText: {
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 17,
      lineHeight: 21,
    },
    momentumCard: {
      borderRadius: 24,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      paddingHorizontal: 16,
      paddingVertical: 16,
      gap: 14,
    },
    momentumHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    momentumLabel: {
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 16,
      lineHeight: 20,
    },
    momentumSubtext: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 16,
      textAlign: 'right',
    },
    momentumRow: {
      flexDirection: 'row',
      alignItems: 'stretch',
      gap: 14,
    },
    momentumStat: {
      flex: 1,
      gap: 4,
    },
    momentumDivider: {
      width: 1,
      backgroundColor: colors.border,
    },
    momentumValue: {
      color: colors.text,
      fontFamily: fonts.mono,
      fontSize: 20,
      lineHeight: 24,
      fontVariant: ['tabular-nums'],
    },
    momentumStatLabel: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 16,
    },
    footprintCard: {
      borderRadius: 24,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card2,
      paddingHorizontal: 16,
      paddingVertical: 16,
      gap: 14,
    },
    subsectionLabel: {
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 16,
      lineHeight: 20,
    },
    footprintGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    footprintTile: {
      width: '48%',
      minWidth: 140,
      borderRadius: 18,
      backgroundColor: colors.card3,
      paddingHorizontal: 12,
      paddingVertical: 12,
      gap: 4,
    },
    footprintValue: {
      color: colors.text,
      fontFamily: fonts.mono,
      fontSize: 17,
      lineHeight: 21,
      fontVariant: ['tabular-nums'],
    },
    footprintLabel: {
      color: colors.text,
      fontFamily: fonts.label,
      fontSize: 11,
      lineHeight: 14,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    footprintDetail: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 16,
    },
    tableCard: {
      borderRadius: 24,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card2,
      paddingHorizontal: 16,
      paddingVertical: 16,
      gap: 14,
    },
    tableHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    tableHint: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 16,
      textAlign: 'right',
    },
    tableHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    tableHeaderText: {
      color: colors.textMuted,
      fontFamily: fonts.label,
      fontSize: 11,
      lineHeight: 14,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    tableRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    repCol: {
      width: 42,
    },
    setCol: {
      flex: 1,
    },
    predictedCol: {
      width: 90,
      alignItems: 'flex-end',
    },
    repValue: {
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 16,
      lineHeight: 20,
      textAlign: 'left',
    },
    tablePrimaryText: {
      color: colors.text,
      fontFamily: fonts.body,
      fontSize: 14,
      lineHeight: 18,
    },
    tableSecondaryText: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 16,
      marginTop: 2,
    },
    predictedValue: {
      color: colors.text,
      fontFamily: fonts.mono,
      fontSize: 14,
      lineHeight: 18,
      textAlign: 'right',
      fontVariant: ['tabular-nums'],
    },
  });
}
