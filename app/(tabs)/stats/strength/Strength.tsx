import React, { useMemo, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import LogoHeader from '@/components/my components/logoHeader';
import RangeChart from '@/components/my components/charts/RangeChart';
import { Colors } from '@/constants/Colors';

// Data (manually generated files)
import weightLiftedData from '@/assets/data/home/weightLiftedData';
import sessions from '@/assets/data/strength/StrengthProgressList';

type Range = 'Day' | 'Week' | 'Month';

const ORANGE = '#FF950A';
const BG = Colors?.dark?.background ?? '#3f3f3f';

const StrengthStats: React.FC = () => {
  const router = useRouter();
  const [range, setRange] = useState<Range>('Month');

  // Sort newest first and only take latest 5 for the “Activity” box list
  const recent = useMemo(
    () =>
      [...sessions]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5),
    []
  );

  return (
    <SafeAreaView style={styles.safe}>
      <LogoHeader />

      {/* PAGE TITLE */}
      <View style={{ marginTop: 2, marginBottom: 10 }}>
        <Text style={styles.pageTitle}>STRENGTH</Text>
      </View>

      {/* "TOTAL WEIGHT" SECTION + CHART SHELL */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>TOTAL WEIGHT</Text>


        {/* CHART SHELL (placeholder) */}
  
              <RangeChart
                dataset={weightLiftedData}
                initialRange="month"
                title="Total Weight"
                chartColor="#6AE5E5"
              />
          

      </View>

      {/* ACTIVITY HEADER */}
      <View style={{ marginTop: 6, marginBottom: 4 }}>
        <Text style={styles.activityHeader}>ACTIVITY</Text>
      </View>

      {/* FIVE MOST RECENT CARDS */}
      <FlatList
        data={recent}
        keyExtractor={(item) => item.id}
        style={{ flexGrow: 0 }}
        contentContainerStyle={{ gap: 12 }}
        renderItem={({ item }) => (
          <View style={styles.activityCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={styles.activityTitle}>{item.title.toUpperCase()}</Text>
              <Text style={styles.activityDate}>
                {new Date(item.date).toLocaleDateString('en-CA')}
              </Text>
            </View>

            <View style={styles.activityMetaRow}>
              <View style={styles.metaPill}>
                <Text style={styles.metaLabel}>EXERCISES</Text>
                <Text style={styles.metaValue}>{item.exercisesCount}</Text>
              </View>

              <View style={styles.metaPill}>
                <Text style={styles.metaLabel}>TIME</Text>
                <Text style={styles.metaValue}>{item.durationLabel}</Text>
              </View>

              <View style={styles.metaPill}>
                <Text style={styles.metaLabel}>VOLUME</Text>
                <Text style={styles.metaValue}>
                  {item.volumeLbs.toLocaleString()}lbs
                </Text>
              </View>
            </View>
          </View>
        )}
      />

      {/* ACTION BUTTONS */}
      <TouchableOpacity
        style={[styles.cta, { marginTop: 16 }]}
        onPress={() => router.push('/stats/strength/all-activities')}
      >
        <Text style={styles.ctaText}>VIEW ALL ACTIVITIES</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.cta, { marginTop: 10, marginBottom: 24 }]}
        onPress={() => router.push('/stats/strength/search-exercise')}
      >
        <Text style={styles.ctaText}>SEARCH EXERCISE</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BG,
    paddingHorizontal: 16,
    paddingTop: 6,
  },
  pageTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1,
    textAlign: 'center',
  },
  card: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sectionTitle: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 1,
    alignSelf: 'center',
  },
  underline: {
    height: 1,
    backgroundColor: '#D8D8D8',
    marginTop: 6,
    marginBottom: 10,
    width: '84%',
    alignSelf: 'center',
    opacity: 0.8,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  toggleBtn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: '#5a5a5a',
  },
  toggleSelected: {
    backgroundColor: '#C2C2C2',
  },
  toggleTxt: {
    color: '#fff',
    fontSize: 12.5,
    fontWeight: '600',
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    paddingHorizontal: 8,
  },
  chev: { color: '#fff', fontSize: 18, padding: 4 },
  monthLabel: { color: '#fff', fontSize: 13, fontWeight: '600' },

  chartShell: {
    height: 180,
    borderBottomWidth: 1,
    borderColor: '#CFCFCF',
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chartHint: { color: '#A8A8A8' },

  activityHeader: {
    color: '#CFCFCF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.7,
  },

  activityCard: {
    backgroundColor: '#3a3a3a',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#2c2c2c',
  },
  activityTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  activityDate: {
    color: '#CFCFCF',
    fontSize: 10,
    fontWeight: '600',
  },
  activityMetaRow: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  metaPill: {
    flex: 1,
    backgroundColor: '#5a5a5a',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  metaLabel: {
    color: '#EAEAEA',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  metaValue: {
    color: '#fff',
    marginTop: 2,
    fontWeight: '800',
    fontSize: 12,
  },

  cta: {
    backgroundColor: '#222',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#000',
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  ctaText: {
    color: ORANGE,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});

export default StrengthStats;
