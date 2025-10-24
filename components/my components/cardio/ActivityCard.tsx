// components/my components/cardio/ActivityCard.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { format } from 'date-fns';

type Props = {
  session: {
    id: string;
    type: string; // e.g. "Outdoor Run"
    started_at: string;
    total_distance?: number | null;
    total_time?: string | null;
    avg_pace?: number | null;
  };
  onPress?: () => void;
  style?: ViewStyle;
};

export default function ActivityCard({ session, onPress, style }: Props) {
  const dateStr = format(new Date(session.started_at), 'MMM d, yyyy');
  const timeStr = session.total_time ?? '--';

  return (
    <TouchableOpacity style={[styles.card, style]} onPress={onPress}>
      <View style={styles.row}>
        <Text style={styles.name}>{session.type}</Text>
        <Text style={styles.date}>{dateStr}</Text>
      </View>

      <View style={styles.metricsRow}>
        <Metric label="DISTANCE" value={session.total_distance ? `${session.total_distance.toFixed(2)} mi` : '--'} />
        <Metric label="TIME" value={timeStr} />
        <Metric label="PACE" value={session.avg_pace ? `${session.avg_pace.toFixed(2)} /mi` : '--'} />
      </View>
    </TouchableOpacity>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricVal}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 10,
    padding: 12,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.8 },
  date: { color: '#fff', opacity: 0.8, fontSize: 12 },
  metricsRow: {
    marginTop: 10,
    backgroundColor: '#77777755',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metric: { alignItems: 'flex-start' },
  metricLabel: { color: '#fff', opacity: 0.9, fontSize: 11 },
  metricVal: { color: '#fff', fontWeight: '800', marginTop: 2 },
});
