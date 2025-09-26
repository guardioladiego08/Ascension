// app/(tabs)/stats/BodyComposition.tsx
// UPDATED: Removed the StepLayeredCompositionChart.
// - This screen now only shows your Weight RangeChart (same dataset shape as before).
import React from 'react';
import { SafeAreaView, View, Text, Alert, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import RangeChart from '@/components/my components/charts/RangeChart';
import LogoHeader from '@/components/my components/logoHeader';
import BasicChart, { WeightPoint } from '@/components/my components/charts/BasicChart';
import { GlobalStyles } from '@/constants/GlobalStyles';
import { Colors } from '@/constants/Colors';

import { supabase } from '@/lib/supabase';

export default function BodyCompositionScreen() {
  const [weightData, setWeightData] = React.useState<WeightPoint[]>([]);
  const [loading, setLoading] = React.useState(true);
  const router = useRouter();
   /** Fetch weight history from Supabase */
    React.useEffect(() => {
      const fetchWeights = async () => {
        setLoading(true);
  
        const {
          data: { user },
        } = await supabase.auth.getUser();
  
        if (!user) {
          setWeightData([]);
          setLoading(false);
          return;
        }
  
        const { data, error } = await supabase
          .from('body_comp')
          .select('created_at, weight')
          .eq('user_id', user.id) // optional (policy already enforces it)
          .order('created_at', { ascending: true });
  
        if (error) {
          console.error('Error fetching body_comp:', error);
          Alert.alert('Error', error.message);
        } else if (data) {
          const mapped: WeightPoint[] = data.map((row) => ({
            label: row.created_at.split('T')[0], // e.g. 2025-09-26
            value: row.weight,
          }));
          setWeightData(mapped);
        }
  
        setLoading(false);
      };
  
      fetchWeights();
    }, []);

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
