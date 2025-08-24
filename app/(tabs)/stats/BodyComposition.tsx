// app/(tabs)/stats/BodyComposition.tsx
// UPDATED: Removed the StepLayeredCompositionChart.
// - This screen now only shows your Weight RangeChart (same dataset shape as before).
import React from 'react';
import { SafeAreaView, View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import RangeChart from '@/components/my components/charts/ChartComponent';
import LogoHeader from '@/components/my components/logoHeader';

const BG = '#3f3f3f';
const WHITE = '#FFFFFF';

export default function BodyCompositionScreen() {
  const router = useRouter();

  // Weight chart dataset (example)
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
      <LogoHeader></LogoHeader>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backTxt}>{'‹'}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>BODY COMPOSITION</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        {/* Weight chart only */}
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
