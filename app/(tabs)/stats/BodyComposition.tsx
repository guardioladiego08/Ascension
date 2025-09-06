// app/(tabs)/stats/BodyComposition.tsx
// UPDATED: Removed the StepLayeredCompositionChart.
// - This screen now only shows your Weight RangeChart (same dataset shape as before).
import React from 'react';
import { SafeAreaView, View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import RangeChart from '@/components/my components/charts/RangeChart';
import LogoHeader from '@/components/my components/logoHeader';
import BasicChart from '@/components/my components/charts/BasicChart';
import { GlobalStyles } from '@/constants/GlobalStyles';
import { Colors } from '@/constants/Colors';

import weightData from '@/assets/data/home/weightRangeData.tsx';

export default function BodyCompositionScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={GlobalStyles.safeArea}>
      <LogoHeader showBackButton/>
      <Text style={GlobalStyles.header}>BODY COMPOSITION</Text>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        {/* Weight chart only */}
        <View style={styles.section}>
          <BasicChart
            title="Body Weight"
            color={Colors.dark.highlight2}
            data={weightData}
            height={250}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 8, paddingTop: 8 },
  cta: { alignSelf: 'center', marginTop: 12, paddingHorizontal: 18, paddingVertical: 10, backgroundColor: '#1f1f1f', borderRadius: 14 },
  ctaTxt: { color: Colors.dark.text, fontWeight: '700' },
});
