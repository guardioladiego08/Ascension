import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/Colors';
import { formatDuration, formatKm, formatPace } from '@/lib/OutdoorSession/outdoorUtils';

type Props = {
  elapsedSeconds: number;
  distanceMeters: number;
  currentPaceSecPerKm: number | null;
};

const CARD = Colors.dark.card;
const TEXT = Colors.dark.text;

export default function OutdoorMetrics({
  elapsedSeconds,
  distanceMeters,
  currentPaceSecPerKm,
}: Props) {
  return (
    <View style={styles.wrap}>
      <StatBox label="DISTANCE" value={`${formatKm(distanceMeters)}km`} />
      <StatBox label="TIME" value={formatDuration(elapsedSeconds)} />
      <StatBox label="PACE" value={formatPace(currentPaceSecPerKm)} />
    </View>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
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

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  statBox: {
    flex: 1,
    minWidth: 0, // critical: lets the card actually shrink
    backgroundColor: CARD,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabel: {
    color: TEXT,
    opacity: 0.7,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
    marginBottom: 6,
    width: '100%',
    textAlign: 'center',
  },
  statValue: {
    color: TEXT,
    fontSize: 16,
    fontWeight: '900',
    width: '100%',
    textAlign: 'center',
  },
});
