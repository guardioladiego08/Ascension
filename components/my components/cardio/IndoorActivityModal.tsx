// components/cardio/modals/IndoorActivityModal.tsx
// Indoor summary modal template (e.g., treadmill details).
// You can expand metrics later.

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { CardioActivity } from '@/assets/data/cardio/cardioActivities';

const WHITE = '#FFFFFF';
const ORANGE = '#f58025';

export default function IndoorActivityModal({
  activity,
  onClose,
}: {
  activity: CardioActivity;
  onClose: () => void;
}) {
  return (
    <View style={styles.backdrop}>
      <View style={styles.sheet}>
        <Text style={styles.title}>Indoor Summary</Text>
        <Text style={styles.name}>{activity.name}</Text>
        <View style={styles.row}>
          <Metric label="Distance" value={`${activity.distance.toFixed(2)} mi`} />
          <Metric label="Time" value={activity.time} />
          <Metric label="Pace" value={`${activity.pace} /mi`} />
        </View>
        <View style={{ height: 8 }} />
        <Text style={styles.small}>Location: {activity.location}</Text>
        <Text style={styles.small}>Type: {activity.type.toUpperCase()}</Text>
        <TouchableOpacity style={styles.btn} onPress={onClose}>
          <Text style={styles.btnText}>Close</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricVal}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: '#0009',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#2f2f2f',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    gap: 8,
  },
  title: { color: WHITE, fontWeight: '800', fontSize: 16 },
  name: { color: WHITE, fontWeight: '700' },
  row: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 8 },
  metricLabel: { color: WHITE, opacity: 0.9, fontSize: 12 },
  metricVal: { color: WHITE, fontWeight: '800', marginTop: 2 },
  small: { color: WHITE, opacity: 0.85, fontSize: 12 },
  btn: {
    backgroundColor: ORANGE,
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 10,
  },
  btnText: { color: WHITE, textAlign: 'center', fontWeight: '800' },
});
