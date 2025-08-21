// app/(tabs)/stats/body-composition.tsx
// 🔁 Updated to use the new layered “step” chart on top with macro data.
// Bottom chart still uses your existing RangeChart from ChartComponent.tsx.

import React from 'react';
import { SafeAreaView, View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import RangeChart from '@/components/my components/charts/ChartComponent';
import StepLayeredCompositionChart, {MacroDataset} from '@/components/my components/charts/StepRangeChart';

const BG = '#3f3f3f';
const WHITE = '#FFFFFF';

export default function BodyCompositionScreen() {
  const router = useRouter();

  // --- Mock Macro Data (week/month/year) ---
  // The week is Mon–Sun. Month holds 60 to allow paging; Year is 12 months.
  // Feel free to replace with your API results; the component only needs this shape.
  const macros: MacroDataset = {
    dailyData: [
      // grams per day
      { label: '2025-06-20', protein: 150, carbs: 220, fat: 70 },
      { label: '2025-06-21', protein: 155, carbs: 180, fat: 72 },
      { label: '2025-06-22', protein: 160, carbs: 190, fat: 68 },
      { label: '2025-06-23', protein: 165, carbs: 210, fat: 75 },
      { label: '2025-06-24', protein: 158, carbs: 205, fat: 73 },
      { label: '2025-06-25', protein: 152, carbs: 195, fat: 69 },
      { label: '2025-06-26', protein: 150, carbs: 185, fat: 70 },
    ],
    monthlyData: Array.from({ length: 60 }).map((_, i) => {
      // create realistic macro waves
      const p = 150 + ((i * 3) % 20);
      const c = 180 + ((i * 7) % 60);
      const f = 65 + ((i * 2) % 15);
      return { label: `2025-01-${String((i % 30) + 1).padStart(2, '0')}`, protein: p, carbs: c, fat: f };
    }),
    yearlyData: Array.from({ length: 12 }).map((_, i) => {
      const p = 150 + ((i * 5) % 25);
      const c = 200 + ((i * 9) % 80);
      const f = 70 + ((i * 2) % 18);
      return { label: `2025-${String(i + 1).padStart(2, '0')}-01`, protein: p, carbs: c, fat: f };
    }),
  };

  // Bottom chart — reusing your RangeChart with dummy weights
  const weightDataset = {
    dailyData: [
      { label: '2025-06-20', value: 222 },
      { label: '2025-06-21', value: 223 },
      { label: '2025-06-22', value: 219 },
      { label: '2025-06-23', value: 224 },
      { label: '2025-06-24', value: 221 },
      { label: '2025-06-25', value: 223 },
      { label: '2025-06-26', value: 225 },
    ],
    monthlyData: Array.from({ length: 60 }).map((_, i) => ({
      label: `2025-01-${String((i % 30) + 1).padStart(2, '0')}`,
      value: 218 + ((i * 3) % 8),
    })),
    yearlyData: Array.from({ length: 12 }).map((_, i) => ({
      label: `2025-${String(i + 1).padStart(2, '0')}-01`,
      value: 220 + ((i * 2) % 10),
    })),
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backTxt}>{'‹'}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>BODY COMPOSITION</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        {/* Top layered step chart (MACROS + Calories line) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>COMPOSITION</Text>
          <View style={styles.hr} />
          <StepLayeredCompositionChart
            dataset={macros}
            initialRange="week"
            height={180}
            title=""
            colors={{
              caloriesLine: '#D7D7D7',
              carbs: '#F3C969',
              protein: '#E0B64F',
              fat: '#B5892E',
            }}
          />
        </View>

        {/* Bottom weight chart (existing RangeChart) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>WEIGHT</Text>
          <View style={styles.hr} />
          <RangeChart
            title=""
            dataset={weightDataset}
            chartColor="#6AE5E5"
            chartHeight={200}
            initialRange="month"
          />
          <TouchableOpacity style={styles.cta}>
            <Text style={styles.ctaTxt}>VIEW MEALS</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG, paddingHorizontal: 16 },
  topBar: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#2a2a2a', alignItems: 'center', justifyContent: 'center' },
  backTxt: { color: WHITE, fontSize: 24, fontWeight: '800' },
  title: { color: WHITE, fontSize: 18, fontWeight: '800', letterSpacing: 1 },
  section: { marginTop: 8, paddingTop: 8 },
  sectionTitle: { color: WHITE, fontWeight: '700', letterSpacing: 1 },
  hr: { height: 1, backgroundColor: WHITE, marginVertical: 8, opacity: 0.85 },
  cta: { alignSelf: 'center', marginTop: 12, paddingHorizontal: 18, paddingVertical: 10, backgroundColor: '#1f1f1f', borderRadius: 14 },
  ctaTxt: { color: WHITE, fontWeight: '700' },
});
