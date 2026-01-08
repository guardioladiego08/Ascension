import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/Colors';
import { formatDistance, formatDuration, formatPace } from '@/lib/outdoor/compute';

const TEXT = Colors.dark.text;
const MUTED = Colors.dark.textMuted ?? '#9AA4BF';

export default function PrimaryStats({
  elapsedS,
  distanceM,
  paceSecPerKm,
  unit = 'mi',
}: {
  elapsedS: number;
  distanceM: number;
  paceSecPerKm: number | null;
  unit?: 'mi' | 'km';
}) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.time}>{formatDuration(elapsedS)}</Text>

      <View style={styles.row}>
        <View style={styles.block}>
          <Text style={styles.big}>{formatDistance(distanceM, unit)}</Text>
          <Text style={styles.label}>DISTANCE</Text>
        </View>
        <View style={styles.block}>
          <Text style={styles.big}>{formatPace(paceSecPerKm, unit)}</Text>
          <Text style={styles.label}>PACE</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 14 },
  time: {
    color: TEXT,
    fontSize: 44,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  row: { flexDirection: 'row', marginTop: 10, gap: 14 },
  block: { flex: 1 },
  big: { color: TEXT, fontSize: 18, fontWeight: '900' },
  label: { color: MUTED, fontSize: 11, marginTop: 4, fontWeight: '800', letterSpacing: 1.1 },
});
