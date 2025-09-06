// components/my components/strength/StrengthHeader.tsx
// -----------------------------------------------------------------------------
// Page header showing the screen title and workout metrics
// -----------------------------------------------------------------------------

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GlobalStyles } from '@/constants/GlobalStyles';
import { Colors } from '@/constants/Colors';

type Props = { seconds: number; totalWeight: number };

// Helper: mm:ss
const formatTime = (s: number) => {
  const m = Math.floor(s / 60).toString().padStart(2, '0');
  const sec = (s % 60).toString().padStart(2, '0');
  return `${m}:${sec}`;
};

const StrengthHeader: React.FC<Props> = ({ seconds, totalWeight }) => (
  <View style={styles.containerHeader}>
    <Text style={GlobalStyles.title}>STRENGTH TRAINING</Text>
    <View style={GlobalStyles.underline} />
    <View style={styles.metricRow}>
      <View style={styles.metricBox}>
        <Text style={styles.label}>Time</Text>
        <Text style={styles.value}>{formatTime(seconds)}</Text>
      </View>
      <View style={styles.metricBox}>
        <Text style={styles.label}>Total Weight</Text>
        <Text style={styles.value}>{totalWeight} lbs</Text>
      </View>
    </View>
  </View>
);

export default StrengthHeader;

const styles = StyleSheet.create({
  containerHeader: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 8,
    backgroundColor: Colors.dark.background,
  },
  metricRow: { flexDirection: 'row', justifyContent: 'space-between' },
  metricBox: { flexDirection: 'column' },
  label: { color: Colors.dark.text, fontSize: 18, marginBottom: 4 },
  value: { fontSize: 24, color: '#fff', fontWeight: 'bold' },
});
