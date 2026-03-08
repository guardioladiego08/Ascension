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
import { LinearGradient } from 'expo-linear-gradient';

import LogoHeader from '@/components/my components/logoHeader';
import { useAppTheme } from '@/providers/AppThemeProvider';

import TopMetricCards from './progress/TopMetricCards';
import ProgressDetailsSection from './progress/ProgressDetailsSection';
import WeeklyOverviewDashboard from './progress/WeeklyOverviewDashboard';

function getWeekRange(weekOffset: number) {
  const today = new Date();

  const base = new Date(today);
  base.setDate(base.getDate() + weekOffset * 7);

  const day = base.getDay();
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

const ProgressScreen: React.FC = () => {
  const { colors, fonts, globalStyles } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);
  const [weekOffset, setWeekOffset] = useState(0);

  const { start, end } = useMemo(() => getWeekRange(weekOffset), [weekOffset]);
  const dateLabel = useMemo(() => formatRange(start, end), [start, end]);
  const visibleDays = useMemo(
    () => Math.round((end.getTime() - start.getTime()) / 86400000) + 1,
    [end, start]
  );

  return (
    <LinearGradient
      colors={[colors.gradientTop, colors.gradientMid, colors.gradientBottom]}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={globalStyles.page}
    >
      <ScrollView
        contentContainerStyle={[globalStyles.container, styles.content]}
        showsVerticalScrollIndicator={false}
      >
        <LogoHeader />

        <View style={[globalStyles.panel, styles.heroCard]}>
          <View style={styles.heroHeaderRow}>
            <View style={styles.heroCopy}>
              <Text style={globalStyles.eyebrow}>Training archive</Text>
              <Text style={styles.title}>Progress</Text>
              <Text style={styles.subtitle}>
                Weekly training volume, activity rhythm, and logged nutrition in
                one focused view.
              </Text>
            </View>

            <View style={styles.livePill}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>Weekly view</Text>
            </View>
          </View>

          <View style={styles.dateRow}>
            <View style={styles.dateBlock}>
              <Text style={styles.dateLabel}>Current range</Text>
              <Text style={styles.dateText}>{dateLabel}</Text>
            </View>

            <View style={styles.weekNav}>
              <TouchableOpacity
                style={styles.navBtn}
                onPress={() => setWeekOffset((prev) => prev - 1)}
              >
                <Ionicons name="chevron-back" size={18} color={colors.textMuted} />
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
                  color={weekOffset < 0 ? colors.textMuted : colors.textOffSt}
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.heroFooter}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>
                {weekOffset === 0 ? 'Live' : `${Math.abs(weekOffset)}w`}
              </Text>
              <Text style={styles.heroStatLabel}>
                {weekOffset === 0 ? 'this week' : 'offset'}
              </Text>
            </View>

            <View style={[styles.heroStat, styles.heroStatAccent]}>
              <Text style={styles.heroStatValue}>{visibleDays}</Text>
              <Text style={styles.heroStatLabel}>tracked days</Text>
            </View>
          </View>
        </View>

        <TopMetricCards
          rangeStart={start}
          rangeEnd={end}
          onExercisesPress={() => router.push('/progress/strength/exercises')}
        />

        <View style={styles.sectionHeaderRow}>
          <Text style={globalStyles.eyebrow}>Weekly overview</Text>
          <View style={styles.sectionRule} />
        </View>

        <WeeklyOverviewDashboard rangeStart={start} rangeEnd={end} />

        <View style={styles.sectionHeaderRow}>
          <Text style={globalStyles.eyebrow}>View details</Text>
          <View style={styles.sectionRule} />
        </View>

        <ProgressDetailsSection />

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </LinearGradient>
  );
};

function createStyles(
  colors: ReturnType<typeof useAppTheme>['colors'],
  fonts: ReturnType<typeof useAppTheme>['fonts']
) {
  return StyleSheet.create({
    content: {
      paddingBottom: 90,
    },
    heroCard: {
      marginTop: 10,
      paddingBottom: 18,
    },
    heroHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 12,
    },
    heroCopy: {
      flex: 1,
    },
    title: {
      marginTop: 8,
      color: colors.text,
      fontFamily: fonts.display,
      fontSize: 34,
      lineHeight: 38,
      letterSpacing: -1,
    },
    subtitle: {
      marginTop: 10,
      maxWidth: 280,
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 14,
      lineHeight: 20,
    },
    livePill: {
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: colors.accentSoft,
      borderWidth: 1,
      borderColor: colors.glowPrimary,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    liveDot: {
      width: 8,
      height: 8,
      borderRadius: 999,
      backgroundColor: colors.highlight1,
    },
    liveText: {
      color: colors.highlight1,
      fontFamily: fonts.label,
      fontSize: 11,
      lineHeight: 14,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    dateRow: {
      marginTop: 22,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 16,
    },
    dateBlock: {
      flex: 1,
    },
    dateLabel: {
      color: colors.textOffSt,
      fontFamily: fonts.label,
      fontSize: 11,
      lineHeight: 14,
      letterSpacing: 0.7,
      textTransform: 'uppercase',
    },
    dateText: {
      marginTop: 6,
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 16,
      lineHeight: 20,
    },
    weekNav: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    navBtn: {
      width: 38,
      height: 38,
      borderRadius: 14,
      backgroundColor: colors.card2,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroFooter: {
      marginTop: 18,
      flexDirection: 'row',
      gap: 10,
    },
    heroStat: {
      flex: 1,
      borderRadius: 18,
      backgroundColor: colors.card2,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 14,
      paddingVertical: 14,
    },
    heroStatAccent: {
      backgroundColor: colors.card3,
      borderColor: colors.glowTertiary,
    },
    heroStatValue: {
      color: colors.text,
      fontFamily: fonts.display,
      fontSize: 22,
      lineHeight: 26,
      letterSpacing: -0.8,
    },
    heroStatLabel: {
      marginTop: 4,
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 16,
    },
    sectionHeaderRow: {
      marginTop: 24,
      marginBottom: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    sectionRule: {
      flex: 1,
      height: 1,
      backgroundColor: colors.border,
    },
    bottomSpacer: {
      height: 32,
    },
  });
}

export default ProgressScreen;
