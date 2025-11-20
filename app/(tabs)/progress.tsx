// app/(tabs)/progress/index.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import LogoHeader from '@/components/my components/logoHeader';

const ProgressScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <LogoHeader/>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
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
        <View style={styles.metricGrid}>
          {/* Weights */}
          <View style={styles.metricCard}>
            <View style={styles.metricHeaderRow}>
              <View style={[styles.metricIcon, styles.weightsIcon]}>
                <MaterialCommunityIcons
                  name="dumbbell"
                  size={18}
                  color="#C7D2FF"
                />
              </View>
              <Text style={styles.metricLabel}>WEIGHTS</Text>
            </View>
            <Text style={styles.metricValue}>5</Text>
            <Text style={styles.metricSub}>sessions · 6.2 hrs</Text>
          </View>

          {/* Running */}
          <View style={styles.metricCard}>
            <View style={styles.metricHeaderRow}>
              <View style={[styles.metricIcon, styles.runningIcon]}>
                <Ionicons name="walk-outline" size={18} color="#C7F4FF" />
              </View>
              <Text style={styles.metricLabel}>RUNNING</Text>
            </View>
            <Text style={styles.metricValue}>12.4</Text>
            <Text style={styles.metricSub}>miles · 3 runs</Text>
          </View>

          {/* Cycling */}
          <View style={styles.metricCard}>
            <View style={styles.metricHeaderRow}>
              <View style={[styles.metricIcon, styles.cyclingIcon]}>
                <Ionicons name="bicycle-outline" size={18} color="#E6F3FF" />
              </View>
              <Text style={styles.metricLabel}>CYCLING</Text>
            </View>
            <Text style={styles.metricValue}>38.6</Text>
            <Text style={styles.metricSub}>miles · 2 rides</Text>
          </View>

          {/* Nutrition */}
          <View style={styles.metricCard}>
            <View style={styles.metricHeaderRow}>
              <View style={[styles.metricIcon, styles.nutritionIcon]}>
                <MaterialCommunityIcons
                  name="food-apple-outline"
                  size={18}
                  color="#FFEAD1"
                />
              </View>
              <Text style={styles.metricLabel}>NUTRITION</Text>
            </View>
            <Text style={styles.metricValue}>6/7</Text>
            <Text style={styles.metricSub}>days tracked</Text>
          </View>
        </View>

        {/* WEEKLY ACTIVITY */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>WEEKLY ACTIVITY</Text>
        </View>

        <View style={styles.activityCard}>
          <View style={styles.activityTopRow}>
            <Text style={styles.activityTitle}>Calories Burned</Text>
            <Text style={styles.activityRange}>Daily</Text>
          </View>

          {/* Fake mini chart */}
          <View style={styles.fakeChartRow}>
            {dummyWeeklyData.map((h, idx) => (
              <View key={idx} style={styles.fakeBarWrapper}>
                <View style={[styles.fakeBar, { height: h }]} />
              </View>
            ))}
          </View>

          {/* Day labels */}
          <View style={styles.daysRow}>
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, idx) => (
              <Text
                key={idx}
                style={[
                  styles.dayLabel,
                  idx === 3 && styles.dayLabelActive, // highlight Thursday like mock
                ]}
              >
                {d}
              </Text>
            ))}
          </View>
        </View>

        {/* VIEW DETAILS */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>VIEW DETAILS</Text>
        </View>
        <View style={styles.detailsRow}>
          <TouchableOpacity style={[styles.detailPill, styles.detailPillActive]}>
            <Ionicons name="barbell-outline" size={16} color="#FFFFFF" />
            <Text style={[styles.detailPillText, styles.detailPillTextActive]}>
              Weights
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.detailPill}>
            <Ionicons name="trail-sign-outline" size={16} color="#9DA4C4" />
            <Text style={styles.detailPillText}>Running</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.detailPill}>
            <Ionicons name="bicycle-outline" size={16} color="#9DA4C4" />
            <Text style={styles.detailPillText}>Cycling</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.detailPill}>
            <Ionicons name="fast-food-outline" size={16} color="#9DA4C4" />
            <Text style={styles.detailPillText}>Nutrition</Text>
          </TouchableOpacity>
        </View>

        {/* THIS WEEK'S WINS */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>THIS WEEK'S WINS</Text>
        </View>

        <View style={styles.winCard}>
          <View style={styles.winLeftIcon}>
            <Ionicons name="flame-outline" size={20} color="#FBBF77" />
          </View>
          <View style={styles.winTextBlock}>
            <Text style={styles.winTitle}>5 Day Streak</Text>
            <Text style={styles.winSubtitle}>Keep it going!</Text>
          </View>
          <Ionicons name="sparkles-outline" size={18} color="#FFB86C" />
        </View>

        <View style={styles.winCard}>
          <View style={styles.winLeftIcon}>
            <Ionicons name="trophy-outline" size={20} color="#F9E58A" />
          </View>
          <View style={styles.winTextBlock}>
            <Text style={styles.winTitle}>Personal Best</Text>
            <Text style={styles.winSubtitle}>Bench press 225 lbs</Text>
          </View>
          <Ionicons name="star-outline" size={18} color="#FFC877" />
        </View>

        <View style={styles.winCard}>
          <View style={styles.winLeftIcon}>
            <Ionicons name="calendar-outline" size={20} color="#F9A8D4" />
          </View>
          <View style={styles.winTextBlock}>
            <Text style={styles.winTitle}>Weekly Goal</Text>
            <Text style={styles.winSubtitle}>Hit 10 workouts</Text>
          </View>
          <Ionicons name="checkmark-done-outline" size={18} color="#FF6BB5" />
        </View>

        {/* some bottom spacing so it clears tab bar */}
        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
};

const dummyWeeklyData = [24, 40, 32, 60, 52, 36, 18];

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050816', // deep navy
  },
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
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },

  metricGrid: {
    marginTop: 24,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 14,
  },
  metricCard: {
    width: '48%',
    backgroundColor: '#0B1220',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  metricHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  metricIcon: {
    width: 28,
    height: 28,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  weightsIcon: {
    backgroundColor: '#28307A',
  },
  runningIcon: {
    backgroundColor: '#1C7C72',
  },
  cyclingIcon: {
    backgroundColor: '#1E3A8A',
  },
  nutritionIcon: {
    backgroundColor: '#7C2D12',
  },
  metricLabel: {
    fontSize: 10,
    letterSpacing: 0.9,
    color: '#9DA4C4',
  },
  metricValue: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  metricSub: {
    marginTop: 4,
    fontSize: 11,
    color: '#9DA4C4',
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
    backgroundColor: '#0B1220',
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

  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#0B1220',
    gap: 6,
  },
  detailPillActive: {
    backgroundColor: '#6366F1',
  },
  detailPillText: {
    fontSize: 11,
    color: '#9DA4C4',
  },
  detailPillTextActive: {
    color: '#FFFFFF',
  },

  winCard: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0B1220',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  winLeftIcon: {
    width: 36,
    height: 36,
    borderRadius: 14,
    backgroundColor: '#1F2937',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  winTextBlock: {
    flex: 1,
  },
  winTitle: {
    fontSize: 13,
    color: '#E5E7F5',
    fontWeight: '600',
  },
  winSubtitle: {
    fontSize: 11,
    color: '#9DA4C4',
    marginTop: 2,
  },
});

export default ProgressScreen;
