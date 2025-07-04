
import LogoHeader from '@/components/Header/LogoHeader';
import ActivityStats from '@/components/Home/Activity';
import MacroTracker from '@/components/Home/MacrosPieChart';
import ProfileCard from '@/components/Home/ProfileCard';
import TotalWeightChart from '@/components/charts/Chart1';
import RangeChart from '@/components/charts/ChartComponent'; // ✅ new component
import { Colors } from '@/constants/Colors';

import activityStatsData from '@/assets/data/activityStatsData';
import caloriesBurnedData from '@/assets/data/caloriesBurnedData';
import milesRanData from '@/assets/data/milesRanData'; // ✅ fake data
import weightLiftedData from '@/assets/data/weightLiftedData';

import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet } from 'react-native';

export default function Home() {
  return (
    <SafeAreaView style={styles.container}>
      <LogoHeader />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <ProfileCard />
        <ActivityStats {...activityStatsData} />
        <MacroTracker protein={50} carbs={30} fats={20} />
        <TotalWeightChart></TotalWeightChart>
        <RangeChart
          dataset={milesRanData}
          chartColor="#FF7D0A"
          chartHeight={200}
          initialRange="month"
          title="Miles Ran"
        />
        <RangeChart
          dataset={weightLiftedData}
          chartColor="#FF5F0A"
          chartHeight={200}
          initialRange="month"
          title="Weight Lifted"
        />
        <RangeChart
          dataset={caloriesBurnedData}
          chartColor="#FFAF0A"
          chartHeight={200}
          initialRange="week"
          title="Calories Burned"
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background
  },
  scrollContent: {
    paddingBottom: 20,
    paddingHorizontal: 0,
    gap: 20,
  },
});
