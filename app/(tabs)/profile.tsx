import React, { useMemo, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import dayjs from 'dayjs';

import { Colors } from '@/constants/Colors';
import LogoHeader from '@/components/my components/logoHeader';

const BG = Colors.dark?.background ?? '#050816';
const CARD = Colors.dark?.card ?? '#13182B';
const BORDER = Colors.dark?.border ?? '#1F2937';
const TEXT_PRIMARY = Colors.dark?.textPrimary ?? '#EAF2FF';
const TEXT_MUTED = Colors.dark?.textMuted ?? '#9AA4BF';
const ACCENT = Colors.primary ?? '#6366F1';

// ---------- DUMMY DATA ----------
const DUMMY_POSTS = Array.from({ length: 12 }).map((_, i) => ({
  id: `post-${i + 1}`,
  label: `S${i + 1}`,
}));

const DUMMY_ACTIVITIES = [
  {
    id: 'a1',
    type: 'Run',
    title: 'Morning Run',
    subtitle: '5.4 mi • 7:52 /mi',
    stat1Label: 'Duration',
    stat1Value: '42:20',
    stat2Label: 'Calories',
    stat2Value: '520',
  },
  {
    id: 'a2',
    type: 'Strength',
    title: 'Upper Body Push',
    subtitle: '22 sets • 14,280 lb',
    stat1Label: 'Duration',
    stat1Value: '68 min',
    stat2Label: 'Reps',
    stat2Value: '152',
  },
  {
    id: 'a3',
    type: 'Run',
    title: 'Tempo Run',
    subtitle: '3.2 mi • 7:05 /mi',
    stat1Label: 'Duration',
    stat1Value: '22:45',
    stat2Label: 'HR Avg',
    stat2Value: '158',
  },
  {
    id: 'a4',
    type: 'Strength',
    title: 'Leg Day',
    subtitle: '18 sets • 19,340 lb',
    stat1Label: 'Duration',
    stat1Value: '75 min',
    stat2Label: 'Sets',
    stat2Value: '18',
  },
];

type GoalFlags = {
  strength: boolean;
  cardio: boolean;
  nutrition: boolean;
};

const GOAL_COLORS: Record<string, string> = {
  none: '#111827',
  strength: '#F97373',
  cardio: '#38BDF8',
  nutrition: '#FACC15',
  strengthCardio: '#FB7185',
  strengthNutrition: '#FDBA74',
  cardioNutrition: '#4ADE80',
  all: '#6366F1',
};

function getGoalKey(flags?: GoalFlags) {
  if (!flags) return 'none';
  const { strength, cardio, nutrition } = flags;
  if (!strength && !cardio && !nutrition) return 'none';
  if (strength && cardio && nutrition) return 'all';
  if (strength && cardio) return 'strengthCardio';
  if (strength && nutrition) return 'strengthNutrition';
  if (cardio && nutrition) return 'cardioNutrition';
  if (strength) return 'strength';
  if (cardio) return 'cardio';
  if (nutrition) return 'nutrition';
  return 'none';
}

export default function ProfileScreen() {
  const router = useRouter();
  const [detailTab, setDetailTab] = useState<'grid' | 'stats' | 'calendar'>(
    'grid'
  );
  const [currentMonth, setCurrentMonth] = useState(dayjs());

  // dummy goal data for calendar
  const goalData: Record<string, GoalFlags> = useMemo(() => {
    const data: Record<string, GoalFlags> = {};
    const daysInMonth = currentMonth.daysInMonth();
    for (let day = 1; day <= daysInMonth; day++) {
      const date = currentMonth.date(day);
      const key = date.format('YYYY-MM-DD');
      const strength = day % 2 === 0;
      const cardio = day % 3 === 0;
      const nutrition = day % 5 === 0;
      if (strength || cardio || nutrition) {
        data[key] = { strength, cardio, nutrition };
      }
    }
    return data;
  }, [currentMonth]);

  const calendarDays = useMemo(() => {
    const startOfMonth = currentMonth.startOf('month');
    const daysInMonth = currentMonth.daysInMonth();
    const offset = startOfMonth.day(); // 0 = Sunday

    const days: (number | null)[] = [];
    for (let i = 0; i < offset; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);
    while (days.length % 7 !== 0) days.push(null);
    return days;
  }, [currentMonth]);

  const weeks: (number | null)[][] = [];
  for (let i = 0; i < calendarDays.length; i += 7) {
    weeks.push(calendarDays.slice(i, i + 7));
  }

  const handlePrevMonth = () => setCurrentMonth(m => m.subtract(1, 'month'));
  const handleNextMonth = () => setCurrentMonth(m => m.add(1, 'month'));

  const goToSettings = () => {
    router.push('/profile/settings'); // uses app/settings/index.tsx
  };

  // ---------- RENDER HELPERS ----------
  const renderDetailTabs = () => (
    <View style={styles.detailTabs}>
      <TabButton
        label="Posts"
        icon="grid-outline"
        active={detailTab === 'grid'}
        onPress={() => setDetailTab('grid')}
      />
      <TabButton
        label="Activity"
        icon="bar-chart-outline"
        active={detailTab === 'stats'}
        onPress={() => setDetailTab('stats')}
      />
      <TabButton
        label="Calendar"
        icon="calendar-outline"
        active={detailTab === 'calendar'}
        onPress={() => setDetailTab('calendar')}
      />
    </View>
  );

  const renderGridPosts = () => (
    <View style={styles.gridContainer}>
      {DUMMY_POSTS.map((post, index) => (
        <View key={post.id} style={styles.gridItem}>
          <Text style={styles.gridLabel}>{post.label}</Text>
        </View>
      ))}
    </View>
  );

  const renderActivityStats = () => (
    <View style={styles.activityGrid}>
      {DUMMY_ACTIVITIES.map(item => (
        <View key={item.id} style={styles.activityCard}>
          <View style={styles.activityHeader}>
            <Text style={styles.activityType}>{item.type}</Text>
            <Ionicons
              name={item.type === 'Run' ? 'walk-outline' : 'barbell-outline'}
              size={18}
              color={TEXT_MUTED}
            />
          </View>
          <Text style={styles.activityTitle}>{item.title}</Text>
          <Text style={styles.activitySubtitle}>{item.subtitle}</Text>
          <View style={styles.activityStatsRow}>
            <View style={styles.activityStatCol}>
              <Text style={styles.activityStatLabel}>{item.stat1Label}</Text>
              <Text style={styles.activityStatValue}>{item.stat1Value}</Text>
            </View>
            <View style={styles.activityStatCol}>
              <Text style={styles.activityStatLabel}>{item.stat2Label}</Text>
              <Text style={styles.activityStatValue}>{item.stat2Value}</Text>
            </View>
          </View>
        </View>
      ))}
    </View>
  );

  const renderCalendar = () => (
    <View style={styles.calendarContainer}>
      <View style={styles.calendarHeader}>
        <TouchableOpacity onPress={handlePrevMonth} style={styles.monthNavBtn}>
          <Ionicons name="chevron-back" size={18} color={TEXT_MUTED} />
        </TouchableOpacity>
        <Text style={styles.monthTitle}>{currentMonth.format('MMMM YYYY')}</Text>
        <TouchableOpacity onPress={handleNextMonth} style={styles.monthNavBtn}>
          <Ionicons name="chevron-forward" size={18} color={TEXT_MUTED} />
        </TouchableOpacity>
      </View>

      <View style={styles.weekdayRow}>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => (
          <Text key={d} style={styles.weekdayLabel}>
            {d}
          </Text>
        ))}
      </View>

      <View style={styles.weeksWrapper}>
        {weeks.map((week, wi) => (
          <View key={`week-${wi}`} style={styles.calendarRow}>
            {week.map((day, di) => {
              if (!day) {
                return (
                  <View
                    key={`empty-${wi}-${di}`}
                    style={styles.calendarCellEmpty}
                  />
                );
              }
              const dateObj = currentMonth.date(day);
              const key = dateObj.format('YYYY-MM-DD');
              const flags = goalData[key];
              const colorKey = getGoalKey(flags);
              const bgColor = GOAL_COLORS[colorKey];

              return (
                <View
                  key={`day-${wi}-${di}`}
                  style={[styles.calendarCell, { backgroundColor: bgColor }]}
                >
                  <Text style={styles.calendarDayText}>{day}</Text>
                </View>
              );
            })}
          </View>
        ))}
      </View>

      <View style={styles.legendRow}>
        <LegendItem color={GOAL_COLORS.strength} label="Strength goal" />
        <LegendItem color={GOAL_COLORS.cardio} label="Cardio goal" />
        <LegendItem color={GOAL_COLORS.nutrition} label="Nutrition goal" />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <LogoHeader></LogoHeader>
      {/* Instagram-style top bar */}
      <View style={styles.topBar}>
        <Text style={styles.topBarUsername}>marcusj_fit</Text>
        <View style={styles.topBarIcons}>
          <TouchableOpacity onPress={goToSettings} style={styles.iconButton}>
            <Ionicons name="settings-outline" size={22} color={TEXT_PRIMARY} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header: avatar + stats */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarWrapper}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitials}>MJ</Text>
            </View>
          </View>

          <View style={styles.headerStatsRow}>
            <ProfileStat label="Posts" value="128" />
            <ProfileStat label="Followers" value="1,248" />
            <ProfileStat label="Following" value="712" />
          </View>
        </View>

        {/* Bio */}
        <View style={styles.bioSection}>
          <Text style={styles.nameText}>Marcus Johnson</Text>
          <Text style={styles.usernameText}>@marcusj_fit</Text>
          <Text style={styles.bioText}>
            Fitness enthusiast | Marathon runner | Strength training advocate.
            On a journey to be the best version of myself 💪
          </Text>

          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Follow</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Message</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Lifetime stat badges */}
        <View style={styles.lifetimeCard}>
          <Text style={styles.sectionTitle}>Lifetime Stats</Text>
          <View style={styles.lifetimeRow}>
            <LifetimeStat label="Workouts" value="342" icon="barbell-outline" />
            <LifetimeStat label="Miles" value="1,248" icon="trail-sign-outline" />
            <LifetimeStat
              label="Lbs Lifted"
              value="284K"
              icon="fitness-outline"
            />
          </View>
        </View>

        {/* Detail tabs */}
        {renderDetailTabs()}

        {/* Tab content */}
        {detailTab === 'grid' && renderGridPosts()}
        {detailTab === 'stats' && renderActivityStats()}
        {detailTab === 'calendar' && renderCalendar()}
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------- SMALL COMPONENTS ----------

function ProfileStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.profileStat}>
      <Text style={styles.profileStatValue}>{value}</Text>
      <Text style={styles.profileStatLabel}>{label}</Text>
    </View>
  );
}

function LifetimeStat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: any;
}) {
  return (
    <View style={styles.lifetimeStat}>
      <Ionicons name={icon} size={20} color={TEXT_MUTED} />
      <Text style={styles.lifetimeValue}>{value}</Text>
      <Text style={styles.lifetimeLabel}>{label}</Text>
    </View>
  );
}

function TabButton({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon: any;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.tabButton, active && styles.tabButtonActive]}
      onPress={onPress}
    >
      <Ionicons
        name={icon}
        size={18}
        color={active ? TEXT_PRIMARY : TEXT_MUTED}
      />
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

// ---------- STYLES ----------

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BG,
  },
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    backgroundColor: BG,
  },
  topBarUsername: {
    color: TEXT_PRIMARY,
    fontSize: 18,
    fontWeight: '700',
  },
  topBarIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    padding: 6,
    borderRadius: 20,
  },

  // Header
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  avatarWrapper: {
    marginRight: 24,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '700',
  },
  headerStatsRow: {
    flexDirection: 'row',
    flex: 1,
    justifyContent: 'space-between',
  },
  profileStat: {
    alignItems: 'center',
  },
  profileStatValue: {
    color: TEXT_PRIMARY,
    fontSize: 18,
    fontWeight: '700',
  },
  profileStatLabel: {
    color: TEXT_MUTED,
    fontSize: 12,
    marginTop: 2,
  },

  // Bio
  bioSection: {
    marginTop: 12,
  },
  nameText: {
    color: TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: '700',
  },
  usernameText: {
    color: TEXT_MUTED,
    fontSize: 13,
    marginTop: 2,
  },
  bioText: {
    color: TEXT_PRIMARY,
    fontSize: 13,
    marginTop: 6,
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 8,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: ACCENT,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  secondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: BORDER,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: TEXT_PRIMARY,
    fontWeight: '500',
    fontSize: 14,
  },

  // Lifetime stats
  lifetimeCard: {
    backgroundColor: CARD,
    borderRadius: 16,
    padding: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: BORDER,
  },
  sectionTitle: {
    color: TEXT_MUTED,
    fontSize: 12,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  lifetimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  lifetimeStat: {
    flex: 1,
    alignItems: 'center',
  },
  lifetimeValue: {
    color: TEXT_PRIMARY,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 4,
  },
  lifetimeLabel: {
    color: TEXT_MUTED,
    fontSize: 11,
    marginTop: 2,
  },

  // Detail tabs
  detailTabs: {
    flexDirection: 'row',
    marginTop: 18,
    backgroundColor: CARD,
    borderRadius: 999,
    padding: 4,
    borderWidth: 1,
    borderColor: BORDER,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 999,
    gap: 6,
  },
  tabButtonActive: {
    backgroundColor: '#1F2937',
  },
  tabLabel: {
    color: TEXT_MUTED,
    fontSize: 12,
    fontWeight: '500',
  },
  tabLabelActive: {
    color: TEXT_PRIMARY,
  },

  // Grid posts – **3 per row**
  gridContainer: {
    marginTop: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between', // keeps 3 per row with equal gaps
  },
  gridItem: {
    width: '32%', // 3 * 32 = 96, space-between fills the rest
    aspectRatio: 1,
    marginBottom: 6,
    borderRadius: 8,
    backgroundColor: '#1F2937',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridLabel: {
    color: TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: '600',
  },

  // Activity stats (tab 2)
  activityGrid: {
    marginTop: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  activityCard: {
    width: '48%',
    aspectRatio: 1,
    backgroundColor: CARD,
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: BORDER,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activityType: {
    color: TEXT_MUTED,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  activityTitle: {
    color: TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  activitySubtitle: {
    color: TEXT_MUTED,
    fontSize: 12,
    marginTop: 2,
  },
  activityStatsRow: {
    flexDirection: 'row',
    marginTop: 10,
    justifyContent: 'space-between',
  },
  activityStatCol: {
    flex: 1,
  },
  activityStatLabel: {
    color: TEXT_MUTED,
    fontSize: 11,
  },
  activityStatValue: {
    color: TEXT_PRIMARY,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },

  // Calendar (tab 3)
  calendarContainer: {
    marginTop: 16,
    backgroundColor: CARD,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: BORDER,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  monthTitle: {
    color: TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: '600',
  },
  monthNavBtn: {
    padding: 4,
    borderRadius: 999,
  },
  weekdayRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  weekdayLabel: {
    flex: 1,
    textAlign: 'center',
    color: TEXT_MUTED,
    fontSize: 11,
  },
  weeksWrapper: {
    marginTop: 6,
  },
  calendarRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  calendarCellEmpty: {
    flex: 1,
    aspectRatio: 1,
    marginHorizontal: 2,
  },
  calendarCell: {
    flex: 1,
    aspectRatio: 1,
    marginHorizontal: 2,
    borderRadius: 8,
    padding: 4,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  calendarDayText: {
    color: '#F9FAFB',
    fontSize: 11,
    fontWeight: '600',
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
    gap: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    color: TEXT_MUTED,
    fontSize: 11,
  },
});
