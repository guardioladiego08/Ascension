// app/(tabs)/stats/macros-tracking.tsx
// UPDATED: adds a "View Meals" button that routes to /stats/meals
import React from 'react';
import { SafeAreaView, View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import StepLayeredCompositionChart from '@/components/my components/charts/StepRangeChart';
import RangeChart from '@/components/my components/charts/ChartComponent';
import macrosDataset from '@/assets/data/macrosData';
import caloriesBurnedData from '@/assets/data/caloriesBurnedData';
import { Colors } from '@/constants/Colors';
import LogoHeader from '@/components/my components/logoHeader';

const WHITE = '#FFFFFF';

export default function MacrosTracking() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <LogoHeader />

      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backTxt}>{'‹'}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>MACROS TRACKING</Text>

        <TouchableOpacity style={styles.viewMealsBtn} onPress={() => router.push('/stats/meals')}>
          <Text style={styles.viewMealsTxt}>VIEW MEALS</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <StepLayeredCompositionChart
            dataset={macrosDataset}
            initialRange="month"
            height={200}
            title=""
            colors={{
              caloriesLine: '#D7D7D7',
              carbs: '#F3C969',
              protein: '#E0B64F',
              fat: '#B5892E',
            }}
          />

          <View style={styles.chartArea}>
            <RangeChart
              dataset={caloriesBurnedData}
              chartColor="#6AE5E5"
              chartHeight={200}
              initialRange="month"
              title="Calories"
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  headerRow: {
    paddingHorizontal: 16,
    paddingTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backTxt: { color: WHITE, fontSize: 26, fontWeight: '800' },
  title: { color: WHITE, fontSize: 18, fontWeight: '800', letterSpacing: 1, flex: 1 },
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
