// app/(tabs)/stats/macros-tracking.tsx
// UPDATED: adds a "View Meals" button that routes to /stats/meals
import React, { useMemo } from 'react';
import { SafeAreaView, View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import BasicChart from '@/components/my components/charts/BasicChart';
import macrosDataset from '@/assets/data/stats/macrosDataset';
import { 
  toProteinSeries,
  toCarbsSeries,
  toFatsSeries,
  toCaloriesSeries 
} from '@/assets/data/stats/macrosSeries';
import { GlobalStyles } from '@/constants/GlobalStyles';
import { Colors } from '@/constants/Colors';
import LogoHeader from '@/components/my components/logoHeader';

  const proteinData = useMemo(() => toProteinSeries(macrosDataset), []);
  const carbsData   = useMemo(() => toCarbsSeries(macrosDataset), []);
  const fatsData    = useMemo(() => toFatsSeries(macrosDataset), []);
  const caloriesData= useMemo(() => toCaloriesSeries(macrosDataset), []);

export default function MacrosTracking() {
  const router = useRouter();

  return (
    <SafeAreaView style={GlobalStyles.safeArea}>
      <LogoHeader showBackButton/>
      <ScrollView 
              contentContainerStyle={styles.scrollContent} 
              showsVerticalScrollIndicator={false}
      >
        <Text style={GlobalStyles.header}>NUTRITION TRACKING</Text>
        <BasicChart title="Protein"  color="#5887FF" data={proteinData}  height={220} />
        <BasicChart title="Carbs"    color="#FF950A" data={carbsData}    height={220} />
        <BasicChart title="Fats"     color="#2ECC71" data={fatsData}     height={220} />
        <BasicChart title="Calories" color="#E74C3C" data={caloriesData} height={220} />
        


          <TouchableOpacity style={styles.viewMealsBtn} onPress={() => router.push('/stats/meals')}>
            <Text style={styles.viewMealsTxt}>VIEW MEALS</Text>
          </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
    scrollContent: {
    paddingBottom: 40, // adds space at bottom
  },

  backTxt: { color: Colors.dark.text, fontSize: 26, fontWeight: '800' },
  title: { color: Colors.dark.text, fontSize: 18, fontWeight: '800', letterSpacing: 1, flex: 1 },
  viewMealsBtn: {
    backgroundColor: '#FF950A',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  viewMealsTxt: { color: '#1a1a1a', fontWeight: '800', letterSpacing: 0.5 },
  section: { paddingTop: 24, paddingBottom: 40, gap: 20, paddingHorizontal: 16 },
  chartArea: { paddingTop: 70 },
});
