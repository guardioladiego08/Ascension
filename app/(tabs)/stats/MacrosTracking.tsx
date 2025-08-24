// app/(tabs)/stats/macros-tracking.tsx
// NEW SCREEN: “Macros Tracking”
// - Shows the StepLayeredCompositionChart only.
// - Data is imported from a separate dataset file: `@/assets/data/macrosData`.
// - Keeps the tab bar visible via your existing Stats stack layout.
//
// Make sure deps are installed (already used elsewhere in your app):
//   yarn add react-native-gifted-charts moment
//
import React from 'react';
import { SafeAreaView, View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import StepLayeredCompositionChart from '@/components/my components/charts/StepRangeChart';
import RangeChart from '@/components/my components/charts/ChartComponent';
import macrosDataset from '@/assets/data/macrosData';
import caloriesBurnedData from '@/assets/data/caloriesBurnedData';
import { Colors } from '@/constants/Colors';
import LogoHeader from '@/components/my components/logoHeader';

const BG = '#3f3f3f';
const WHITE = '#FFFFFF';

export default function MacrosTracking() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <LogoHeader></LogoHeader>
        
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backTxt}>{'‹'}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>MACROS TRACKING</Text>

 
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
  container: {flex: 1, backgroundColor: Colors.dark.background,},
  topBar: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backTxt: { color: WHITE, fontSize: 24, fontWeight: '800' },
  title: { color: WHITE, fontSize: 18, fontWeight: '800', letterSpacing: 1 },
  section: { paddingTop: 60, paddingBottom: 40,  gap: 20, },
  sectionTitle: { color: WHITE, fontWeight: '700', letterSpacing: 1 },
  hr: { height: 1, backgroundColor: WHITE, marginVertical: 8, opacity: 0.85 },
  chartArea: {paddingTop:  70}
});
