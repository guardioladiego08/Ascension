// app/(tabs)/home.tsx
// ✅ Fixes "VirtualizedLists should never be nested inside plain ScrollViews".
//    We replace the <ScrollView> with a single <FlatList> that drives the page scroll.
//    All non-list UI lives in ListHeaderComponent / ListFooterComponent.

import React, { useMemo } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Text,
  View,
  FlatList,
} from 'react-native';

import LogoHeader from '@/components/my components/logoHeader';
import MacroTracker from '@/components/my components/Home/MacrosPieChart';
import ProfileCard from '@/components/my components/Home/ProfileCard';
import BasicChart from '@/components/my components/charts/BasicChart';
import ActivityStats from '@/components/my components/Home/Activity';
import StatsComparison from '@/components/my components/Home/ActivityComparison';
import { GlobalStyles } from '@/constants/GlobalStyles';
import { Colors } from '@/constants/Colors';

import weightData from '@/assets/data/home/weightRangeData.tsx';
import activityStatsData from '@/assets/data/home/activityStatsData';
import milesRanData from '@/assets/data/home/milesRanData';
import weightLiftedData from '@/assets/data/home/weightLiftedData';
import statsComparisonData from '@/assets/data/home/ComparisonData';

import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';

export default function Home(): JSX.Element {
  const router = useRouter();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      // RootLayout listens for session changes and will render <Auth />
      router.replace('/');
    }
  };

  // We use an empty array for data; the screen is composed via header/footer.
  const data = useMemo(() => [], []);

  const ListHeader = () => (
    <View style={styles.stack}>
      <LogoHeader />
      <ProfileCard />
      <MacroTracker protein={50} carbs={30} fats={20} />

      <BasicChart
        title="Body Weight"
        color={Colors.dark.highlight2}
        data={weightData}
        height={250}
      />

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
        data={statsComparisonData ?? {
          lastWeek: { totalActivities: 8, totalWeight: 14500, totalDistance: 12.4, totalCal: 9800, weight: 222.4 },
          thisWeek: { totalActivities: 10, totalWeight: 16750, totalDistance: 15.1, totalCal: 11200, weight: 221.6 },
        }}
        units={{
          totalWeight: { suffix: ' lb' },
          totalDistance: { suffix: ' mi' },
          totalCal: { suffix: ' kcal' },
          weight: { suffix: ' lb' },
        }}
        onPressMetric={(m) => console.log('Pressed:', m)}
      />
    </View>
  );

  // Place Logout at the bottom of the screen
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
        renderItem={null as unknown as any} // no rows; header/footer only
        ListHeaderComponent={ListHeader}
        ListFooterComponent={ListFooter}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        removeClippedSubviews
        windowSize={7}
        initialNumToRender={1}
        maxToRenderPerBatch={1}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: 40,
  },
  stack: {
    gap: 16,
  },
  footer: {
    paddingTop: 8,
  },
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
