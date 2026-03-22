import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { useAppTheme } from '@/providers/AppThemeProvider';
import { HOME_TONES } from '../../../../home/tokens';
import {
  formatDuration,
  formatDistance,
  formatPaceForUnit,
  type DistanceUnit,
} from '@/lib/OutdoorSession/outdoorUtils';

type Props = {
  elapsedSeconds: number;
  distanceMeters: number;
  currentPaceSecPerKm: number | null;
  distanceUnit: DistanceUnit;
};

export default function OutdoorMetrics({
  elapsedSeconds,
  distanceMeters,
  currentPaceSecPerKm,
  distanceUnit,
}: Props) {
  const { colors, fonts } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);

  return (
    <View style={styles.wrap}>
      <StatBox
        label="Distance"
        value={formatDistance(distanceMeters, distanceUnit)}
        styles={styles}
      />
      <StatBox label="Time" value={formatDuration(elapsedSeconds)} styles={styles} />
      <StatBox
        label="Pace"
        value={formatPaceForUnit(currentPaceSecPerKm, distanceUnit)}
        styles={styles}
      />
    </View>
  );
}

function StatBox({
  label,
  value,
  styles,
}: {
  label: string;
  value: string;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statLabel} numberOfLines={1} ellipsizeMode="tail">
        {label}
      </Text>

      <Text
        style={styles.statValue}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.75}
      >
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
      flexDirection: 'row',
      gap: 10,
      width: '100%',
    },
    statBox: {
      flex: 1,
      minWidth: 0,
      backgroundColor: HOME_TONES.surface2,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      paddingVertical: 14,
      paddingHorizontal: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    statLabel: {
      color: HOME_TONES.textTertiary,
      fontFamily: fonts.label,
      fontSize: 10,
      lineHeight: 14,
      letterSpacing: 1,
      marginBottom: 6,
      width: '100%',
      textAlign: 'center',
      textTransform: 'uppercase',
    },
    statValue: {
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.heading,
      fontSize: 16,
      lineHeight: 20,
      width: '100%',
      textAlign: 'center',
    },
  });
}
