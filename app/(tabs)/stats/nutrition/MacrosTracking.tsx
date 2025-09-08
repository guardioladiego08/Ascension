// app/(tabs)/stats/macros-tracking.tsx
// FIXED: moved all React hooks (useMemo) inside the function component.
// Hooks cannot be called at the module scope.

import React, { useMemo } from 'react';
import { SafeAreaView, View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import BasicChart from '@/components/my components/charts/BasicChart';
import macrosDataset from '@/assets/data/stats/macrosDataset';
import {
  toProteinSeries,
  toCarbsSeries,
  toFatsSeries,
  toCaloriesSeries,
} from '@/assets/data/stats/macrosSeries';
import { GlobalStyles } from '@/constants/GlobalStyles';
import { Colors } from '@/constants/Colors';
import LogoHeader from '@/components/my components/logoHeader';

export default function MacrosTracking() {
  const router = useRouter();

  // ✅ Hooks are now inside the component body (valid)
  const proteinData = useMemo(() => toProteinSeries(macrosDataset), []);
  const carbsData = useMemo(() => toCarbsSeries(macrosDataset), []);
  const fatsData = useMemo(() => toFatsSeries(macrosDataset), []);
  const caloriesData = useMemo(() => toCaloriesSeries(macrosDataset), []);

  return (
    <SafeAreaView style={GlobalStyles.safeArea}>
      <LogoHeader showBackButton />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={GlobalStyles.header}>NUTRITION TRACKING</Text>

        <View style={styles.section}>
          <BasicChart title="Protein" color={Colors.dark.macroProtein} data={proteinData} height={180} />
          <BasicChart title="Carbs" color={Colors.dark.macroCarbs} data={carbsData} height={180} />
          <BasicChart title="Fats" color={Colors.dark.macroFats} data={fatsData} height={180} />
          <BasicChart title="Calories" color={Colors.dark.highlight2} data={caloriesData} height={180} />
        </View>

        <TouchableOpacity style={styles.viewMealsBtn} onPress={() => router.push('/stats/nutrition/meals')}>
          <Text style={styles.viewMealsTxt}>VIEW MEALS</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 40,
  },
  section: {
    paddingTop: 24,
    paddingBottom: 40,
    gap: 20,
    paddingHorizontal: 16,
  },
  viewMealsBtn: {
    alignSelf: 'center',
    backgroundColor: '#FF950A',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  viewMealsTxt: { color: '#1a1a1a', fontWeight: '800', letterSpacing: 0.5 },
});
