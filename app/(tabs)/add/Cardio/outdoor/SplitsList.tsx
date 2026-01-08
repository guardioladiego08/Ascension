import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/Colors';
import type { Split } from '@/lib/outdoor/types';
import { formatDuration } from '@/lib/outdoor/compute';

const CARD = Colors.dark.card;
const BORDER = Colors.dark.border ?? '#1F2937';
const TEXT = Colors.dark.text;
const MUTED = Colors.dark.textMuted ?? '#9AA4BF';

export default function SplitsList({ splits }: { splits: Split[] }) {
  if (!splits || splits.length === 0) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>Splits</Text>
        <Text style={styles.muted}>No splits recorded.</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Splits</Text>

      <View style={styles.headerRow}>
        <Text style={[styles.h, { flex: 1 }]}>#</Text>
        <Text style={[styles.h, { flex: 2 }]}>TYPE</Text>
        <Text style={[styles.h, { flex: 2, textAlign: 'right' }]}>TIME</Text>
      </View>

      {splits.slice(0, 50).map((s) => (
        <View key={`${s.kind}-${s.index}-${s.end_elapsed_s}`} style={styles.row}>
          <Text style={[styles.cell, { flex: 1 }]}>{s.index}</Text>
          <Text style={[styles.cell, { flex: 2 }]}>{s.kind === 'auto_km' ? 'KM' : 'LAP'}</Text>
          <Text style={[styles.cell, { flex: 2, textAlign: 'right' }]}>{formatDuration(s.duration_s)}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 18,
    padding: 14,
    marginTop: 12,
  },
  title: { color: TEXT, fontWeight: '900' },
  muted: { color: MUTED, marginTop: 8 },
  headerRow: { flexDirection: 'row', marginTop: 12, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: BORDER },
  h: { color: MUTED, fontWeight: '800', fontSize: 11, letterSpacing: 1.0 },
  row: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  cell: { color: TEXT, fontWeight: '700' },
});
