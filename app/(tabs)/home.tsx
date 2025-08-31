// app/(tabs)/home.tsx
// =====================================================================
// 🔄 REPLACES TotalWeightChart with the new RangeDrivenChart.
// - Remove the old import for Chart1 (TotalWeightChart).
// - Add RangeDrivenChart + weightRangeData imports.
// - Nothing else on the page needs to change.
// =====================================================================

import React from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
} from 'react-native';

import LogoHeader from '@/components/my components/logoHeader';
import ActivityStats from '@/components/my components/Home/Activity';
import StatsComparison from '@/components/my components/Home/ActivityComparison';
import MacroTracker from '@/components/my components/Home/MacrosPieChart';
import ProfileCard from '@/components/my components/Home/ProfileCard';
import BasicChart from '@/components/my components/charts/BasicChart';
import { GlobalStyles } from '@/constants/GlobalStyles';



// Existing data for the other tiles
// Import your generated data + type
import weightData, {
  weightData as generatedWeightData,
  type WeightPoint,
} from '@/assets/data/home/weightRangeData.tsx';
import activityStatsData from '@/assets/data/activityStatsData';
import caloriesBurnedData from '@/assets/data/caloriesBurnedData';
import statsComparisonData from '@/assets/data/ComparisonData';
import milesRanData from '@/assets/data/milesRanData';
import weightLiftedData from '@/assets/data/weightLiftedData';


export default function Home() {
  

  return (
    <SafeAreaView style={GlobalStyles.safeArea}>
      <LogoHeader />
      <ProfileCard></ProfileCard>
      <MacroTracker protein={50} carbs={30} fats={20} />
      <BasicChart
        title="Body Weight"
        color="#6AE5E5"
        data={weightData}
        height={220}
      />
      
    </SafeAreaView>
  );
}

