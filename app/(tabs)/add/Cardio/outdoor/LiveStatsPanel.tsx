import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/Colors';
import { formatDistanceM, formatPace, formatTime } from '@/lib/outdoor/geo';

const CARD = Colors.dark.card;
const BORDER = Colors.dark.border ?? '#1F2937';
const TEXT = Colors.dark.text;
const MUTED = Colors.dark.textMuted ?? '#9AA4BF';

export default function LiveStatsPanel(props: {
  elapsed_s: number;
  distance_m: number;
  current_pace_s_per_km: number | null;
  avg_pace_s_per_km: number | null;
}) {
  return (
    <View style={styles.wrap}>
      <View style={styles.primaryRow}>
        <StatBlock label="Time" value={formatTime(props.elapsed_s)} />
        <StatBlock label="Distance (km)" value={formatDistanceM(props.distance_m)} />
      </View>

      <View style={styles.secondaryRow}>
        <StatBlock label="Pace" value={formatPace(props.current_pace_s_per_km)} />
        <StatBlock label="Avg Pace" value={formatPace(props.avg_pace_s_per_km)} />
      </View>
    </View>
  );
}

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.block}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  primaryRow: { flexDirection: 'row', gap: 12 },
  secondaryRow: { flexDirection: 'row', gap: 12 },
  block: { flex: 1 },
  label: { color: MUTED, fontSize: 12, fontWeight: '600' },
  value: { color: TEXT, fontSize: 22, fontWeight: '800', marginTop: 4 },
});
