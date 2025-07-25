// components/Home/StatsComparison.tsx
import { Colors } from '@/constants/Colors';
import { AntDesign } from '@expo/vector-icons';
import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

type WeekData = {
  totalActivities: number;
  totalWeight: number;
  totalDistance: number;
  totalCal: number;
  weight: number;
};

type StatsComparisonProps = {
  data: {
    lastWeek: WeekData;
    thisWeek: WeekData;
  };
};

const METRICS = [
  { key: 'totalActivities', label: 'Activities' },
  { key: 'totalWeight', label: 'Weight Lifted' },
  { key: 'totalDistance', label: 'Distance' },
  { key: 'totalCal', label: 'Calories' },
  { key: 'weight', label: 'Body Weight' },
] as const;

const StatsComparison: React.FC<StatsComparisonProps> = ({ data }) => {
  const renderCard = ({ item }: { item: typeof METRICS[number] }) => {
    const prev = data.lastWeek[item.key];
    const curr = data.thisWeek[item.key];
    const diff = curr - prev;
    const pct = prev > 0 ? Math.round((diff / prev) * 100) : 0;
    const improved = diff >= 0;

    return (
      <View style={styles.metricCard}>
        <Text style={styles.metricLabel}>{item.label}</Text>

        <View style={styles.metricValues}>
          <Text style={styles.currentValue}>{curr}</Text>
          <View
            style={[
              styles.badge,
              { backgroundColor: improved ? Colors.dark.successLight : Colors.dark.errorLight },
            ]}>
            <AntDesign
              name={improved ? 'arrowup' : 'arrowdown'}
              size={12}
              color={improved ? Colors.dark.success : Colors.dark.error}
            />
            <Text
              style={[
                styles.badgeText,
                { color: improved ? Colors.dark.success : Colors.dark.error },
              ]}>
              {Math.abs(pct)}%
            </Text>
          </View>
        </View>

        <Text style={styles.subText}>
          Last: <Text style={styles.prevValue}>{prev}</Text>
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Weekly Progress</Text>
      <FlatList
        data={METRICS}
        keyExtractor={(m) => m.key}
        renderItem={renderCard}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: Colors.dark.background,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.dark.text,
    marginBottom: 12,
  },
  list: {
    paddingBottom: 8,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: Colors.dark.background,
    borderRadius: 10,
    padding: 12,
    marginHorizontal: 4,
  },
  metricLabel: {
    fontSize: 14,
    color: Colors.dark.text,
    marginBottom: 6,
  },
  metricValues: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currentValue: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.dark.text,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  subText: {
    fontSize: 12,
    color: Colors.dark.text,
    marginTop: 4,
  },
  prevValue: {
    color: Colors.dark.text,
    fontWeight: '600',
  },
});

export default StatsComparison;
