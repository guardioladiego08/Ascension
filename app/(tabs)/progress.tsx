import React, { useMemo, useState } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';

const dummyWeeklyData = [24, 40, 32, 60, 52, 36, 18];

const BG = Colors.dark.background;
const PRIMARY = Colors.dark.highlight1;
const TEXT_PRIMARY = Colors.dark.text;
const TEXT_MUTED = Colors.dark.textMuted;

/* ------------------ DATE HELPERS ------------------ */

function getWeekRange(weekOffset: number) {
  const today = new Date();

  const base = new Date(today);
  base.setDate(base.getDate() + weekOffset * 7);

  const day = base.getDay(); // 0 (Sun) - 6 (Sat)
  const diffToMonday = day === 0 ? -6 : 1 - day;

  const start = new Date(base);
  start.setDate(base.getDate() + diffToMonday);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  return { start, end };
}

function formatRange(start: Date, end: Date) {
  const opts: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
  };

  const startStr = start.toLocaleDateString(undefined, opts);
  const endStr = end.toLocaleDateString(undefined, opts);

  return `${startStr} - ${endStr}`;
}

/* ------------------ SCREEN ------------------ */

const ProgressScreen: React.FC = () => {
  const [weekOffset, setWeekOffset] = useState(0);

  const { start, end } = useMemo(
    () => getWeekRange(weekOffset),
    [weekOffset]
  );

  const dateLabel = useMemo(
    () => formatRange(start, end),
    [start, end]
  );

  const today = new Date();
  const isCurrentWeek = weekOffset === 0;

  return (
    <LinearGradient
      colors={['#3a3a3bff', '#1e1e1eff', BG]}
      start={{ x: 0.2, y: 0 }}
      end={{ x: 0.8, y: 1 }}
      style={{ flex: 1 }}
    >
      <View style={GlobalStyles.container}>
        <LogoHeader />

        <ScrollView
          contentContainerStyle={{ paddingBottom: 90 }}
          showsVerticalScrollIndicator={false}
        >
          {/* HEADER */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Progress</Text>
              <View style={styles.dateRow}>
                <Text style={styles.dateText}>{dateLabel}</Text>
              </View>
            </View>

            <View style={styles.weekNav}>
              <TouchableOpacity
                style={styles.navBtn}
                onPress={() => setWeekOffset((prev) => prev - 1)}
              >
                <Ionicons name="chevron-back" size={18} color="#9DA4C4" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.navBtn}
                onPress={() => {
                  if (weekOffset < 0) {
                    setWeekOffset((prev) => prev + 1);
                  }
                }}
              >
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={weekOffset < 0 ? '#9DA4C4' : '#4B5563'}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* TOP METRIC CARDS */}
          <TopMetricCards
            onExercisesPress={() =>
              router.push('/progress/strength/exercises')
            }
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
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, idx) => {
                const dayDate = new Date(start);
                dayDate.setDate(start.getDate() + idx);

                const isToday =
                  isCurrentWeek &&
                  dayDate.toDateString() === today.toDateString();

                return (
                  <Text
                    key={idx}
                    style={[
                      styles.dayLabel,
                      isToday && styles.dayLabelActive,
                    ]}
                  >
                    {d}
                  </Text>
                );
              })}
            </View>
          </View>

          {/* VIEW DETAILS */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>VIEW DETAILS</Text>
          </View>

          <ProgressDetailsSection />

          <View style={{ height: 32 }} />
        </ScrollView>
      </View>
    </LinearGradient>
  );
};

/* ------------------ STYLES ------------------ */

const styles = StyleSheet.create({
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
    fontWeight: '600',
  },
});

export default ProgressScreen;
