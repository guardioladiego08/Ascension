import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { HOME_TONES } from '@/app/(tabs)/home/tokens';
import {
  formatDistance,
  formatDuration,
  formatPaceForUnit,
  type DistanceUnit,
} from '@/lib/OutdoorSession/outdoorUtils';
import { useAppTheme } from '@/providers/AppThemeProvider';

type Props = {
  phase: 'idle' | 'running' | 'paused';
  kicker: string;
  title: string;
  subtitle: string;
  elapsedSeconds: number;
  distanceMeters: number;
  currentPaceSecPerKm: number | null;
  distanceUnit: DistanceUnit;
  children?: React.ReactNode;
};

export default function OutdoorStatsSlide({
  phase,
  kicker,
  title,
  subtitle,
  elapsedSeconds,
  distanceMeters,
  currentPaceSecPerKm,
  distanceUnit,
  children,
}: Props) {
  const { colors, fonts } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);

  const phaseLabel = phase === 'running' ? 'Live' : phase === 'paused' ? 'Paused' : 'Ready';

  return (
    <View style={styles.wrap}>
      <View style={styles.heroCard}>
        <View style={styles.heroHeader}>
          <View style={styles.copyBlock}>
            <Text style={styles.kicker}>{kicker}</Text>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>

          <View
            style={[
              styles.phasePill,
              phase === 'running'
                ? styles.phasePillLive
                : phase === 'paused'
                  ? styles.phasePillPaused
                  : styles.phasePillIdle,
            ]}
          >
            <Text
              style={[
                styles.phaseText,
                phase === 'running'
                  ? styles.phaseTextLive
                  : phase === 'paused'
                    ? styles.phaseTextPaused
                    : styles.phaseTextIdle,
              ]}
            >
              {phaseLabel}
            </Text>
          </View>
        </View>

        <View style={styles.heroMetrics}>
          <MetricBox label="Time" value={formatDuration(elapsedSeconds)} fullWidth styles={styles} />
          <MetricBox
            label="Distance"
            value={formatDistance(distanceMeters, distanceUnit)}
            styles={styles}
          />
          <MetricBox
            label="Pace"
            value={formatPaceForUnit(currentPaceSecPerKm, distanceUnit)}
            styles={styles}
          />
        </View>
      </View>

      {children ? <View style={styles.detailBlock}>{children}</View> : null}
    </View>
  );
}

function MetricBox({
  label,
  value,
  styles,
  fullWidth = false,
}: {
  label: string;
  value: string;
  styles: ReturnType<typeof createStyles>;
  fullWidth?: boolean;
}) {
  return (
    <View style={[styles.metricBox, fullWidth ? styles.metricBoxFull : null]}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
        {value}
      </Text>
    </View>
  );
}

function createStyles(
  colors: ReturnType<typeof useAppTheme>['colors'],
  fonts: ReturnType<typeof useAppTheme>['fonts']
) {
  return StyleSheet.create({
    wrap: {
      gap: 12,
    },
    heroCard: {
      backgroundColor: HOME_TONES.surface1,
      borderRadius: 26,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      padding: 18,
      gap: 18,
    },
    heroHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
    },
    copyBlock: {
      flex: 1,
    },
    kicker: {
      color: HOME_TONES.textTertiary,
      fontFamily: fonts.label,
      fontSize: 11,
      lineHeight: 14,
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    title: {
      marginTop: 8,
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.heading,
      fontSize: 22,
      lineHeight: 26,
    },
    subtitle: {
      marginTop: 6,
      color: HOME_TONES.textSecondary,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 19,
    },
    phasePill: {
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderWidth: 1,
    },
    phasePillLive: {
      backgroundColor: colors.accentSoft,
      borderColor: colors.glowPrimary,
    },
    phasePillPaused: {
      backgroundColor: colors.accentTertiarySoft,
      borderColor: colors.glowTertiary,
    },
    phasePillIdle: {
      backgroundColor: HOME_TONES.surface2,
      borderColor: HOME_TONES.borderSoft,
    },
    phaseText: {
      fontFamily: fonts.label,
      fontSize: 10,
      lineHeight: 12,
      letterSpacing: 0.9,
      textTransform: 'uppercase',
    },
    phaseTextLive: {
      color: colors.highlight1,
    },
    phaseTextPaused: {
      color: colors.highlight3,
    },
    phaseTextIdle: {
      color: HOME_TONES.textSecondary,
    },
    heroMetrics: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    metricBox: {
      flex: 1,
      minWidth: '46%',
      backgroundColor: HOME_TONES.surface2,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      paddingHorizontal: 14,
      paddingVertical: 14,
    },
    metricBoxFull: {
      minWidth: '100%',
    },
    metricLabel: {
      color: HOME_TONES.textTertiary,
      fontFamily: fonts.label,
      fontSize: 10,
      lineHeight: 12,
      letterSpacing: 0.9,
      textTransform: 'uppercase',
    },
    metricValue: {
      marginTop: 8,
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.mono,
      fontSize: 26,
      lineHeight: 30,
    },
    detailBlock: {
      gap: 12,
    },
  });
}
