// Home.js
import MacroTracker from '@/components/Home/MacrosPieChart';
import ProfileCard from '@/components/Home/ProfileCard';
import { Colors } from '@/constants/Colors';

import React from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';

export default function Home() {

  return (
    <SafeAreaView style={styles.container}>
      <ProfileCard></ProfileCard>
      <MacroTracker protein={50} carbs={30} fats={20} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
  },
});
