import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GlobalStyles } from '@/constants/GlobalStyles';

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
    <View style={GlobalStyles.container}>
      <Text style={GlobalStyles.subtitle}>ACTIVITY</Text>
      <View style={GlobalStyles.underline} />
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={[styles.label, GlobalStyles.text]}>Total{'\n'}Activities</Text>
          <Text style={[styles.value, GlobalStyles.textBold]}>{totalActivities}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.label, GlobalStyles.text]}>Total{'\n'}Weight</Text>
          <Text style={[styles.value, GlobalStyles.textBold]}>{totalWeight}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.label, GlobalStyles.text]}>Total{'\n'}Distance</Text>
          <Text style={[styles.value, GlobalStyles.textBold]}>{totalDistance}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.label, GlobalStyles.text]}>Total{'\n'}Time</Text>
          <Text style={[styles.value, GlobalStyles.textBold]}>{totalTime}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.label, GlobalStyles.text]}>Total{'\n'}Cal</Text>
          <Text style={[styles.value, GlobalStyles.textBold]}>{totalCal}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  label: {
    textAlign: 'center',
  },
  value: {
    marginTop: 4,
  },
});

export default ActivityStats;
