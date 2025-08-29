// app/(tabs)/home.tsx
import TotalWeightChart from '@/components/my components/charts/Chart1';
import RangeChart from '@/components/my components/charts/ChartComponent';
import LogoHeader from '@/components/my components/logoHeader';
import ActivityStats from '@/components/my components/Home/Activity';
import StatsComparison from '@/components/my components/Home/ActivityComparison';
import MacroTracker from '@/components/my components/Home/MacrosPieChart';
import ProfileCard from '@/components/my components/Home/ProfileCard';
import { Colors } from '@/constants/Colors';
import { GlobalStyles } from '@/constants/GlobalStyles';
import React from 'react';
import {
  FlatList,
  ListRenderItemInfo,
  SafeAreaView,
  StyleSheet
} from 'react-native';

import activityStatsData from '@/assets/data/activityStatsData';
import caloriesBurnedData from '@/assets/data/caloriesBurnedData';
import statsComparisonData from '@/assets/data/ComparisonData';
import milesRanData from '@/assets/data/milesRanData';
import weightLiftedData from '@/assets/data/weightLiftedData';

type HomeItem =
  | { key: 'profile' }
  | { key: 'activity' }
  | { key: 'macros' }
  | { key: 'weightChart' }
  | { key: 'milesRan' }
  | { key: 'weightLifted' }
  | { key: 'caloriesBurned' }
  | { key: 'comparison' };

const DATA: HomeItem[] = [
  { key: 'profile' },
  { key: 'activity' },
  { key: 'macros' },
  { key: 'weightChart' },
  { key: 'milesRan' },
  { key: 'weightLifted' },
  { key: 'caloriesBurned' },
  { key: 'comparison' },
];

export default function Home() {
  const renderItem = ({ item }: ListRenderItemInfo<HomeItem>) => {
    switch (item.key) {
      case 'profile':
        return <ProfileCard />;
      case 'activity':
        return <ActivityStats {...activityStatsData} />;
      case 'macros':
        return <MacroTracker protein={50} carbs={30} fats={20}  />;
      case 'weightChart':
        return <TotalWeightChart />;
      case 'milesRan':
        return (
          <RangeChart
            dataset={milesRanData}
            chartColor="#FF7D0A"
            chartHeight={200}
            initialRange="month"
            title="Miles Ran"
          />
        );
      case 'weightLifted':
        return (
          <RangeChart
            dataset={weightLiftedData}
            chartColor="#FF5F0A"
            chartHeight={200}
            initialRange="month"
            title="Weight Lifted"
          />
        );
      case 'caloriesBurned':
        return (
          <RangeChart
            dataset={caloriesBurnedData}
            chartColor="#FFAF0A"
            chartHeight={200}
            initialRange="week"
            title="Calories Burned"
          />
        );
      case 'comparison':
        return <StatsComparison data={statsComparisonData} />;
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={GlobalStyles.safeArea}>
      <LogoHeader/>
      <FlatList
        data={DATA}
        renderItem={renderItem}
        keyExtractor={item => item.key}
        contentContainerStyle={styles.listContent}
        // optional: tweak performance
        removeClippedSubviews
        initialNumToRender={4}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({

  listContent: {
    padding: 20,
    gap: 20,
  },
});
