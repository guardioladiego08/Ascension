import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import dayjs, { Dayjs } from 'dayjs';
import { PieChart } from 'react-native-gifted-charts';
import { useFocusEffect } from '@react-navigation/native';

import { Colors } from '@/constants/Colors';
import { supabase } from '@/lib/supabase';

const BG = Colors.dark?.background ?? '#050816';
const CARD = Colors.dark?.card ?? '#13182B';
const BORDER = Colors.dark?.border ?? '#1F2937';
const TEXT_PRIMARY = Colors.dark?.textPrimary ?? '#EAF2FF';
const TEXT_MUTED = Colors.dark?.textMuted ?? '#9AA4BF';

type GoalFlags = {
  strength: boolean;
  cardio: boolean;
  nutrition: boolean;
};

type DailyGoalRow = {
  goal_date: string;
  strength_met: boolean | null;
  cardio_met: boolean | null;
  nutrition_met: boolean | null;
};

const GOAL_COLORS = {
  strength: '#F97373',
  cardio: '#38BDF8',
  nutrition: '#FACC15',
};

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

type Props = {
  initialMonth?: Dayjs;
};

const GoalCalendar: React.FC<Props> = ({ initialMonth }) => {
  const [currentMonth, setCurrentMonth] = useState<Dayjs>(
    initialMonth ?? dayjs()
  );
  const [goalData, setGoalData] = useState<Record<string, GoalFlags>>({});
  const [loading, setLoading] = useState(false);

  const fetchMonthGoals = useCallback(async () => {
    setLoading(true);
    try {
      const start = currentMonth.startOf('month').format('YYYY-MM-DD');
      const end = currentMonth.endOf('month').format('YYYY-MM-DD');

      const { data, error } = await supabase
        .from('daily_goal_status')
        .select('goal_date, strength_met, cardio_met, nutrition_met')
        .gte('goal_date', start)
        .lte('goal_date', end);

      if (error) {
        console.warn('Error loading daily_goal_status', error);
        setGoalData({});
        return;
      }

      const map: Record<string, GoalFlags> = {};
      (data as DailyGoalRow[]).forEach((row) => {
        map[row.goal_date] = {
          strength: !!row.strength_met,
          cardio: !!row.cardio_met,
          nutrition: !!row.nutrition_met,
        };
      });

      setGoalData(map);
    } finally {
      setLoading(false);
    }
  }, [currentMonth]);

  // Refetch whenever month changes (e.g., arrow nav)
  useEffect(() => {
    fetchMonthGoals();
  }, [fetchMonthGoals]);

  // ALSO refetch whenever the screen regains focus
  useFocusEffect(
    React.useCallback(() => {
      fetchMonthGoals();
    }, [fetchMonthGoals])
  );

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

  const handlePrevMonth = () => setCurrentMonth((m) => m.subtract(1, 'month'));
  const handleNextMonth = () => setCurrentMonth((m) => m.add(1, 'month'));

  return (
    <View style={styles.calendarContainer}>
      {/* Header */}
      <View style={styles.calendarHeader}>
        <TouchableOpacity onPress={handlePrevMonth} style={styles.monthNavBtn}>
          <Ionicons name="chevron-back" size={18} color={TEXT_MUTED} />
        </TouchableOpacity>
        <Text style={styles.monthTitle}>{currentMonth.format('MMMM YYYY')}</Text>
        <TouchableOpacity onPress={handleNextMonth} style={styles.monthNavBtn}>
          <Ionicons name="chevron-forward" size={18} color={TEXT_MUTED} />
        </TouchableOpacity>
      </View>

      {/* Weekday labels */}
      <View style={styles.weekdayRow}>
        {WEEKDAYS.map((d, i) => (
          <Text key={`${d}-${i}`} style={styles.weekdayLabel}>
            {d}
          </Text>
        ))}
      </View>

      {loading && (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={TEXT_MUTED} />
          <Text style={styles.loadingText}>Syncing goals…</Text>
        </View>
      )}

      {/* Calendar grid */}
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

              return (
                <View key={`day-${wi}-${di}`} style={styles.calendarCell}>
                  <GoalDonut flags={flags} />
                  <Text style={styles.calendarDayText}>{day}</Text>
                </View>
              );
            })}
          </View>
        ))}
      </View>

      {/* Legend */}
      <View style={styles.legendRow}>
        <LegendItem color={GOAL_COLORS.strength} label="Strength goal met" />
        <LegendItem color={GOAL_COLORS.cardio} label="Cardio goal met" />
        <LegendItem color={GOAL_COLORS.nutrition} label="Nutrition goal met" />
      </View>
    </View>
  );
};

export default GoalCalendar;

// ---- Subcomponents ----

const GoalDonut = ({ flags }: { flags?: GoalFlags }) => {
  const segments = [];

  if (flags?.strength) {
    segments.push({ value: 1, color: GOAL_COLORS.strength });
  }
  if (flags?.cardio) {
    segments.push({ value: 1, color: GOAL_COLORS.cardio });
  }
  if (flags?.nutrition) {
    segments.push({ value: 1, color: GOAL_COLORS.nutrition });
  }

  if (segments.length === 0) {
    return <View style={styles.emptyDonut} />;
  }

  return (
    <PieChart
      data={segments}
      donut
      radius={14}
      innerRadius={9}
      showText={false}
      focusOnPress={false}
      sectionAutoFocus={false}
      strokeWidth={1}
      strokeColor={BG}
    />
  );
};

const LegendItem = ({
  color,
  label,
}: {
  color: string;
  label: string;
}) => (
  <View style={styles.legendItem}>
    <View style={[styles.legendDot, { backgroundColor: color }]} />
    <Text style={styles.legendLabel}>{label}</Text>
  </View>
);

// ---- Styles ----

const styles = StyleSheet.create({
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
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 6,
  },
  loadingText: {
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
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  emptyDonut: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: BG,
  },
  calendarDayText: {
    position: 'absolute',
    top: 4,
    left: 4,
    color: '#F9FAFB',
    fontSize: 10,
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
