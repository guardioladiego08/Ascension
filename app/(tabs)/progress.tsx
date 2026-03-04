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
import WeeklyOverviewDashboard from './progress/WeeklyOverviewDashboard';

const BG = Colors.dark.background;
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
            rangeStart={start}
            rangeEnd={end}
            onExercisesPress={() =>
              router.push('/progress/strength/exercises')
            }
          />

          {/* WEEKLY OVERVIEW */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>WEEKLY OVERVIEW</Text>
          </View>

          <WeeklyOverviewDashboard rangeStart={start} rangeEnd={end} />

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
});

export default ProgressScreen;
