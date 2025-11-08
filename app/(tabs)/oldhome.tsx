// app/(tabs)/home.tsx
import * as React from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Text,
  View,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';

import LogoHeader from '@/components/my components/logoHeader';
import MacroTracker from '@/components/my components/Home/MacrosPieChart';
import ProfileCard from '@/components/my components/Home/ProfileCard';
import BasicChart, { WeightPoint } from '@/components/my components/charts/BasicChart';
import ActivityStats from '@/components/my components/Home/Activity';
import StatsComparison from '@/components/my components/Home/ActivityComparison';

import activityStatsData from '@/assets/data/home/activityStatsData';
import milesRanData from '@/assets/data/home/milesRanData';
import weightLiftedData from '@/assets/data/home/weightLiftedData';
import statsComparisonData from '@/assets/data/home/ComparisonData';

import { GlobalStyles } from '@/constants/GlobalStyles';
import { Colors } from '@/constants/Colors';

import { supabase } from '@/lib/supabase';

export default function HomeScreen() {
  const router = useRouter();
  const [weightData, setWeightData] = React.useState<WeightPoint[]>([]);
  const [loading, setLoading] = React.useState(true);

  /** Logout */
  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      router.replace('/');
    }
  };

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

  /** FlatList needs some data */
  const data = React.useMemo(() => [], []);

  const ListHeader = () => (
    <View style={styles.stack}>
      <LogoHeader />
      <ProfileCard />
      <MacroTracker protein={50} carbs={30} fats={20} />

      {loading ? (
        <ActivityIndicator size="large" color="#fff" />
      ) : weightData.length > 0 ? (
        <BasicChart
          title="Body Weight"
          color={Colors.dark.highlight2}
          data={weightData}
          height={250}
        />
      ) : (
        <Text style={{ color: '#fff', textAlign: 'center' }}>
          No weight data yet
        </Text>
      )}

      <ActivityStats {...activityStatsData} />

      <BasicChart
        title="Miles Ran"
        color={Colors.dark.milesRan}
        data={milesRanData}
        height={175}
      />

      <BasicChart
        title="Weight Lifted"
        color={Colors.dark.weightLifted}
        data={weightLiftedData}
        height={175}
      />

      <StatsComparison
        data={statsComparisonData}
        units={{
          totalWeight: { suffix: ' lb' },
          totalDistance: { suffix: ' mi' },
          totalCal: { suffix: ' kcal' },
          weight: { suffix: ' lb' },
        }}
        onPressMetric={(m) => console.log('Pressed metric:', m)}
      />
    </View>
  );

  const ListFooter = () => (
    <View style={styles.footer}>
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
      <View style={{ height: 16 }} />
    </View>
  );

  return (
    <SafeAreaView style={GlobalStyles.safeArea}>
      <FlatList
        data={data}
        keyExtractor={(_, idx) => `empty-${idx}`}
        renderItem={null as unknown as any}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={ListFooter}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  listContent: { paddingBottom: 40 },
  stack: { gap: 16 },
  footer: { paddingTop: 8 },
  logoutButton: {
    backgroundColor: '#E53935',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 16,
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
