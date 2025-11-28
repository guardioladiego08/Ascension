import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import LogoHeader from '@/components/my components/logoHeader';
import { Colors } from '@/constants/Colors';
import { GlobalStyles } from '@/constants/GlobalStyles';
import TopMetricCards from './progress/TopMetricCards';
import ProgressDetailsSection from './progress/ProgressDetailsSection';

const dummyWeeklyData = [24, 40, 32, 60, 52, 36, 18];

const ProgressScreen: React.FC = () => {
  return (
    <View style={GlobalStyles.container}>
      <LogoHeader />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: 90 }} // or 48 if your tab bar is tall
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Progress</Text>
            <View style={styles.dateRow}>
              <Text style={styles.dateText}>Dec 11 - Dec 17</Text>
            </View>
          </View>

          <View style={styles.weekNav}>
            <TouchableOpacity style={styles.navBtn}>
              <Ionicons name="chevron-back" size={18} color="#9DA4C4" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.navBtn}>
              <Ionicons name="chevron-forward" size={18} color="#9DA4C4" />
            </TouchableOpacity>
          </View>
        </View>

        {/* TOP METRIC CARDS */}
        <TopMetricCards
          onExercisesPress={() => router.push('/progress/strength/exercises')}
        />

        {/* WEEKLY ACTIVITY */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>WEEKLY ACTIVITY</Text>
        </View>

        <View style={styles.activityCard}>
          <View style={styles.activityTopRow}>
            <Text style={styles.activityTitle}>Calories Burned</Text>
            <Text style={styles.activityRange}>Daily</Text>
          </View>

          <View style={styles.fakeChartRow}>
            {dummyWeeklyData.map((h, idx) => (
              <View key={idx} style={styles.fakeBarWrapper}>
                <View style={[styles.fakeBar, { height: h }]} />
              </View>
            ))}
          </View>

          <View style={styles.daysRow}>
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, idx) => (
              <Text
                key={idx}
                style={[
                  styles.dayLabel,
                  idx === 3 && styles.dayLabelActive,
                ]}
              >
                {d}
              </Text>
            ))}
          </View>
        </View>

        {/* VIEW DETAILS + detail window */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>VIEW DETAILS</Text>
        </View>

        <ProgressDetailsSection />

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  dateRow: {
    marginTop: 6,
  },
  dateText: {
    fontSize: 12,
    color: '#9DA4C4',
  },
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  navBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Colors.dark.card,
    alignItems: 'center',
    justifyContent: 'center',
  },

  sectionHeaderRow: {
    marginTop: 24,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 12,
    letterSpacing: 0.8,
    color: '#9DA4C4',
  },

  activityCard: {
    backgroundColor: Colors.dark.card,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  activityTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activityTitle: {
    fontSize: 13,
    color: '#E5E7F5',
  },
  activityRange: {
    fontSize: 11,
    color: '#6366F1',
  },
  fakeChartRow: {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  fakeBarWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  fakeBar: {
    width: 12,
    borderRadius: 6,
    backgroundColor: '#6366F1',
  },
  daysRow: {
    marginTop: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayLabel: {
    fontSize: 10,
    color: '#4B5563',
  },
  dayLabelActive: {
    color: '#6366F1',
  },
});

export default ProgressScreen;
