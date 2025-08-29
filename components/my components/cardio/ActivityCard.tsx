// components/cardio/ActivityCard.tsx
// Reusable card that visually matches your mock: left title, right date/location,
// bottom row with distance/time/pace.

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { CardioActivity } from '@/assets/data/cardio/cardioActivities';
import { format } from 'date-fns';


const WHITE = '#FFFFFF';

export default function ActivityCard({
  activity,
  onPress,
  style,
}: {
  activity: CardioActivity;
  onPress?: () => void;
  style?: ViewStyle;
}) {
  const dateStr = format(new Date(activity.date), 'yyyy-MM-dd');
  return (
    <TouchableOpacity style={[styles.card, style]} onPress={onPress}>
      <View style={styles.row}>
        <Text style={styles.name}>{activity.name.toUpperCase()}</Text>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.date}>{dateStr}</Text>
          <Text style={styles.loc}>{activity.location}</Text>
        </View>
      </View>

      <View style={styles.metricsRow}>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>DISTANCE</Text>
          <Text style={styles.metricVal}>{activity.distance.toFixed(2)} mi</Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>TIME</Text>
          <Text style={styles.metricVal}>{activity.time}</Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>PACE</Text>
          <Text style={styles.metricVal}>{activity.pace} /mi</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 10,
    padding: 12,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { color: WHITE, fontSize: 16, fontWeight: '800', letterSpacing: 0.8 },
  date: { color: WHITE, opacity: 0.9, fontSize: 12 },
  loc: { color: WHITE, opacity: 0.7, fontSize: 12 },
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
  metricLabel: { color: WHITE, opacity: 0.9, fontSize: 11 },
  metricVal: { color: WHITE, fontWeight: '800', marginTop: 2 },
});
