import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/Colors';
import { paceSecPerKmFromSpeed, formatPace } from '@/lib/outdoor/compute';

const CARD = Colors.dark.card;
const BORDER = Colors.dark.border ?? '#1F2937';
const TEXT = Colors.dark.text;
const MUTED = Colors.dark.textMuted ?? '#9AA4BF';

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.card}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

export default function SecondaryStats({
  elevGainM,
  currentSpeedMps,
  maxSpeedMps,
}: {
  elevGainM: number;
  currentSpeedMps: number | null;
  maxSpeedMps: number | null;
}) {
  const curPace = formatPace(paceSecPerKmFromSpeed(currentSpeedMps ?? null), 'mi');
  const maxPace = formatPace(paceSecPerKmFromSpeed(maxSpeedMps ?? null), 'mi');

  return (
    <View style={styles.grid}>
      <StatCard label="ELEV GAIN" value={`${Math.round(elevGainM)} m`} />
      <StatCard label="CURRENT PACE" value={curPace} />
      <StatCard label="BEST PACE" value={maxPace} />
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 18,
    paddingBottom: 10,
  },
  card: {
    flex: 1,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 16,
    padding: 12,
  },
  value: { color: TEXT, fontWeight: '900', fontSize: 14 },
  label: { color: MUTED, marginTop: 6, fontSize: 10, fontWeight: '800', letterSpacing: 1.0 },
});
