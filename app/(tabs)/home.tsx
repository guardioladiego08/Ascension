import Chart from '@/assets/charts/Chart1';
import LogoHeader from '@/components/Header/LogoHeader';
import MacroTracker from '@/components/Home/MacrosPieChart';
import ProfileCard from '@/components/Home/ProfileCard';
import { Colors } from '@/constants/Colors';

import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet } from 'react-native';

export default function Home() {
  return (
    <SafeAreaView style={styles.container}>
      <LogoHeader />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <ProfileCard />
        <MacroTracker protein={50} carbs={30} fats={20} />
        <Chart />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingBottom: 20,
    paddingHorizontal: 0,
    gap: 20, // optional: adds vertical spacing between items
  },
});
