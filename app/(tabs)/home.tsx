// app/(tabs)/home.tsx
import React from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
} from 'react-native';

import LogoHeader from '@/components/my components/logoHeader';
import MacroTracker from '@/components/my components/Home/MacrosPieChart';
import ProfileCard from '@/components/my components/Home/ProfileCard';
import BasicChart from '@/components/my components/charts/BasicChart';
import ActivityStats from '@/components/my components/Home/Activity';
import StatsComparison from '@/components/my components/Home/ActivityComparison';
import { GlobalStyles } from '@/constants/GlobalStyles';
import { Colors } from '@/constants/Colors';

import weightData from '@/assets/data/home/weightRangeData.tsx';
import activityStatsData from '@/assets/data/home/activityStatsData';
import milesRanData from '@/assets/data/home/milesRanData';
import weightLiftedData from '@/assets/data/home/weightLiftedData';
import statsComparisonData from '@/assets/data/home/ComparisonData';

export default function Home() {
  return (
    <SafeAreaView style={GlobalStyles.safeArea}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
      >
        <LogoHeader />
        <ProfileCard />
        <MacroTracker protein={50} carbs={30} fats={20} />
        <BasicChart
          title="Body Weight"
          color={Colors.dark.highlight2}
          data={weightData}
          height={250}
        />
        <ActivityStats
          {...activityStatsData} 
        />
        <BasicChart
          title="Miles Ran"
          color={Colors.dark.milesRan}
          data={milesRanData}
          height={175}
        />
        <BasicChart
          title="Weight Lifted"
          color={Colors.dark.weightLifted}
          data={weightLiftedData}
          height={175}
        />
        <StatsComparison
  data={{
    lastWeek: { totalActivities: 8, totalWeight: 14500, totalDistance: 12.4, totalCal: 9800, weight: 222.4 },
    thisWeek: { totalActivities: 10, totalWeight: 16750, totalDistance: 15.1, totalCal: 11200, weight: 221.6 },
  }}
  units={{
    totalWeight: { suffix: ' lb' },
    totalDistance: { suffix: ' mi' },
    totalCal: { suffix: ' kcal' },
    weight: { suffix: ' lb' },
  }}
  onPressMetric={(m) => console.log('Pressed:', m)}
/>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 40, // adds space at bottom
  },
});
