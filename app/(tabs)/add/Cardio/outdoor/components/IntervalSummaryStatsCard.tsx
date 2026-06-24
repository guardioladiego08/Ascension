import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { formatIntervalDuration } from '@/lib/intervals/plans';
import {
  summarizeIntervalSessionSteps,
  type IntervalStepTimelineItem,
} from '@/lib/intervals/summary';
import { useAppTheme } from '@/providers/AppThemeProvider';

type Props = {
  name: string;
  description?: string | null;
  benefit?: string | null;
  steps: IntervalStepTimelineItem[];
  completedIntervalsCount?: number | null;
  totalIntervalsCount?: number | null;
};

export default function IntervalSummaryStatsCard({
  name,
  description,
  benefit,
  steps,
  completedIntervalsCount,
  totalIntervalsCount,
}: Props) {
  const { colors, fonts, globalStyles } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);

  const breakdown = useMemo(() => summarizeIntervalSessionSteps(steps), [steps]);

  const qualityCount =
    typeof completedIntervalsCount === 'number'
      ? completedIntervalsCount
      : breakdown.completedWorkIntervals;
  const qualityTotal =
    typeof totalIntervalsCount === 'number'
      ? totalIntervalsCount
      : breakdown.totalWorkIntervals;

  const metricItems = [
    {
      label: 'Completed reps',
      value: `${qualityCount}/${Math.max(qualityTotal, qualityCount)}`,
      accent: true,
    },
    {
      label: 'Work time',
      value: formatIntervalDuration(breakdown.actualDurationByKind.work),
    },
    {
      label: 'Break time',
      value: formatIntervalDuration(breakdown.actualDurationByKind.recovery),
    },
    {
      label: 'Rest time',
      value: formatIntervalDuration(breakdown.actualDurationByKind.rest),
    },
    {
      label: 'Warm/Cool',
      value: formatIntervalDuration(
        breakdown.actualDurationByKind.warmup + breakdown.actualDurationByKind.cooldown
      ),
    },
    {
      label: 'Steps',
      value: `${breakdown.completedSteps}/${breakdown.totalSteps}`,
    },
  ];

  return (
    <View style={[globalStyles.panelSoft, styles.card]}>
      <Text style={globalStyles.eyebrow}>Interval recap</Text>
      <Text style={styles.title}>{name}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
      {benefit ? <Text style={styles.benefit}>{benefit}</Text> : null}

      <View style={styles.metricGrid}>
        {metricItems.map((item) => (
          <View
            key={item.label}
            style={[
              styles.metricTile,
              item.accent ? styles.metricTileAccent : null,
            ]}
          >
            <Text style={styles.metricLabel}>{item.label}</Text>
            <Text style={styles.metricValue}>{item.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function createStyles(
  colors: ReturnType<typeof useAppTheme>['colors'],
  fonts: ReturnType<typeof useAppTheme>['fonts']
) {
  return StyleSheet.create({
    card: {
      gap: 10,
      marginBottom: 12,
    },
    title: {
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 22,
      lineHeight: 26,
      letterSpacing: -0.5,
    },
    description: {
      color: colors.text,
      fontFamily: fonts.body,
      fontSize: 14,
      lineHeight: 20,
    },
    benefit: {
      color: colors.highlight2,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 19,
    },
    metricGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginTop: 4,
    },
    metricTile: {
      width: '31%',
      minWidth: 96,
      flexGrow: 1,
      borderRadius: 18,
      backgroundColor: colors.card3,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      paddingVertical: 14,
      gap: 8,
    },
    metricTileAccent: {
      backgroundColor: colors.accentSoft,
      borderColor: colors.highlight1,
    },
    metricLabel: {
      color: colors.textOffSt,
      fontFamily: fonts.label,
      fontSize: 10,
      lineHeight: 13,
      letterSpacing: 0.9,
      textTransform: 'uppercase',
    },
    metricValue: {
      color: colors.text,
      fontFamily: fonts.display,
      fontSize: 18,
      lineHeight: 22,
      letterSpacing: -0.4,
    },
  });
}
