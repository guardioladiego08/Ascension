import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export interface ActivityStatsProps {
  totalActivities: number;
  totalWeight: string;
  totalDistance: string;
  totalTime: string;
  totalCal: string;
}

const ActivityStats: React.FC<ActivityStatsProps> = ({
  totalActivities,
  totalWeight,
  totalDistance,
  totalTime,
  totalCal,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.header}>ACTIVITY</Text>
      <View style={styles.separator} />
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.label}>Total{'\n'}Activities</Text>
          <Text style={styles.value}>{totalActivities}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.label}>Total{'\n'}Weight</Text>
          <Text style={styles.value}>{totalWeight}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.label}>Total{'\n'}Distance</Text>
          <Text style={styles.value}>{totalDistance}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.label}>Total{'\n'}Time</Text>
          <Text style={styles.value}>{totalTime}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.label}>Total{'\n'}Cal</Text>
          <Text style={styles.value}>{totalCal}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 8,
  },
  header: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 18,
    marginBottom: 8,
  },
  separator: {
    height: 1,
    backgroundColor: '#888888',
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  label: {
    color: '#CCCCCC',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 14,
  },
  value: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
    marginTop: 4,
  },
});

export default ActivityStats;
