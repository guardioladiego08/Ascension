import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import StrengthRadarPreview from '@/components/strength/StrengthRadarPreview';
import {
  getDominantStrengthMuscle,
  STRENGTH_MUSCLE_LABELS,
  STRENGTH_MUSCLE_RADAR_AXES,
  type StrengthMuscleProfile,
} from '@/lib/strength/muscleProfile';
import { useAppTheme } from '@/providers/AppThemeProvider';

type Props = {
  profile: StrengthMuscleProfile;
};

export default function WorkoutMuscleProfileCard({ profile }: Props) {
  const { colors, fonts, globalStyles } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);
  const dominantMuscle = useMemo(
    () => getDominantStrengthMuscle(profile),
    [profile]
  );

  return (
    <View style={[globalStyles.panelSoft, styles.card]}>
      <View style={styles.headerRow}>
        <View style={styles.headerCopy}>
          <Text style={globalStyles.eyebrow}>Session fingerprint</Text>
          <Text style={styles.title}>Body-part radar</Text>
          <Text style={styles.subtitle}>
            Relative emphasis across the muscles you trained in this workout.
          </Text>
        </View>

        {dominantMuscle ? (
          <View style={styles.dominantPill}>
            <Text style={styles.dominantPillLabel}>Highest</Text>
            <Text style={styles.dominantPillValue}>{dominantMuscle.label}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.chartWrap}>
        <StrengthRadarPreview
          profile={profile}
          backgroundColor={colors.cardDark}
          accentColor={colors.accentSoft}
          glowColor={colors.highlight2}
          gridColor={colors.borderStrong}
          strokeColor={colors.highlight1}
          variant="detailed"
          showAxisLabels
          labelColor={colors.textMuted}
          labelFontSize={9.5}
          minimumValue={0}
        />
      </View>

      <View style={styles.legendGrid}>
        {STRENGTH_MUSCLE_RADAR_AXES.map((axisKey) => {
          const value = Math.round((profile[axisKey] ?? 0) * 100);
          return (
            <View key={axisKey} style={styles.legendItem}>
              <View style={styles.legendTextRow}>
                <Text style={styles.legendLabel}>{STRENGTH_MUSCLE_LABELS[axisKey]}</Text>
                <Text style={styles.legendValue}>{value}%</Text>
              </View>
              <View style={styles.legendTrack}>
                <View style={[styles.legendFill, { width: `${Math.max(value, 4)}%` }]} />
              </View>
            </View>
          );
        })}
      </View>

      <Text style={styles.footnote}>
        Normalized to your most-loaded muscle group in this session.
      </Text>
    </View>
  );
}

function createStyles(
  colors: ReturnType<typeof useAppTheme>['colors'],
  fonts: ReturnType<typeof useAppTheme>['fonts']
) {
  return StyleSheet.create({
    card: {
      marginBottom: 18,
      padding: 16,
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
    title: {
      marginTop: 8,
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 26,
      lineHeight: 30,
      letterSpacing: -0.5,
    },
    subtitle: {
      marginTop: 8,
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 19,
      maxWidth: 280,
    },
    dominantPill: {
      minWidth: 104,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.borderStrong,
      backgroundColor: colors.card2,
      alignItems: 'flex-start',
    },
    dominantPillLabel: {
      color: colors.textOffSt,
      fontFamily: fonts.label,
      fontSize: 10,
      lineHeight: 12,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    dominantPillValue: {
      marginTop: 4,
      color: colors.highlight1,
      fontFamily: fonts.heading,
      fontSize: 14,
      lineHeight: 18,
    },
    chartWrap: {
      height: 312,
      marginTop: 14,
      borderRadius: 22,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.cardDark,
      padding: 8,
    },
    legendGrid: {
      marginTop: 14,
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      gap: 10,
    },
    legendItem: {
      width: '48%',
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card2,
      paddingHorizontal: 10,
      paddingVertical: 9,
    },
    legendTextRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    legendLabel: {
      flex: 1,
      color: colors.text,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 15,
    },
    legendValue: {
      color: colors.highlight1,
      fontFamily: fonts.heading,
      fontSize: 12,
      lineHeight: 15,
    },
    legendTrack: {
      height: 7,
      marginTop: 8,
      borderRadius: 999,
      overflow: 'hidden',
      backgroundColor: colors.card3,
    },
    legendFill: {
      height: '100%',
      borderRadius: 999,
      backgroundColor: colors.highlight1,
    },
    footnote: {
      marginTop: 12,
      color: colors.textOffSt,
      fontFamily: fonts.body,
      fontSize: 11,
      lineHeight: 16,
    },
  });
}
