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
import { useFocusEffect } from '@react-navigation/native';
import Svg, { Circle } from 'react-native-svg';

import { Colors } from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import {
  computeRings,
  type DailyGoalResults,
  type Rings,
} from '@/lib/goals/goalLogic';

const BG = Colors.dark?.background ?? '#050816';
const CARD = Colors.dark?.card ?? '#13182B';
const BORDER = Colors.dark?.border ?? '#1F2937';
const TEXT_PRIMARY = Colors.dark.text;
const TEXT_MUTED = Colors.dark.textMuted;

const GOAL_COLORS = {
  strength: '#F97373',
  cardio: '#38BDF8',
  nutrition: '#FACC15',
};

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

type Props = {
  initialMonth?: Dayjs;
  userId?: string;
};

function normalizeGoalDateKey(value: unknown): string | null {
  if (typeof value === 'string') {
    const match = value.match(/\d{4}-\d{2}-\d{2}/);
    return match ? match[0] : null;
  }

  if (value instanceof Date && Number.isFinite(value.getTime())) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return null;
}

function isMissingRpc(error: any, fn: string) {
  const message = String(error?.message ?? '').toLowerCase();
  return String(error?.code ?? '') === 'PGRST202' || message.includes(fn.toLowerCase());
}

const GoalCalendar: React.FC<Props> = ({ initialMonth, userId }) => {
  const [currentMonth, setCurrentMonth] = useState<Dayjs>(initialMonth ?? dayjs());
  const [goalData, setGoalData] = useState<Record<string, Rings>>({});
  const [loading, setLoading] = useState(false);

  const fetchMonthGoals = useCallback(async () => {
    setLoading(true);
    try {
      const start = currentMonth.startOf('month').format('YYYY-MM-DD');
      const end = currentMonth.endOf('month').format('YYYY-MM-DD');

      let targetUserId = userId;
      if (!targetUserId) {
        const {
          data: { user },
          error: userErr,
        } = await supabase.auth.getUser();
        if (userErr) throw userErr;
        if (!user) throw new Error('Not signed in');
        targetUserId = user.id;
      }
      if (!targetUserId) throw new Error('Not signed in');

      let rows: DailyGoalResults[] = [];

      try {
        const { data, error } = await supabase
          .schema('user')
          .rpc('list_visible_goal_calendar_user', {
            p_user_id: targetUserId,
            p_start: start,
            p_end: end,
          });

        if (error) throw error;
        rows = (data as DailyGoalResults[] | null) ?? [];
      } catch (rpcError) {
        if (!isMissingRpc(rpcError, 'list_visible_goal_calendar_user')) throw rpcError;

        const { data, error } = await supabase
          .schema('user')
          .from('daily_goal_results')
          .select('*')
          .eq('user_id', targetUserId)
          .gte('date', start)
          .lte('date', end)
          .order('date', { ascending: true });

        if (error) throw error;
        rows = (data as DailyGoalResults[] | null) ?? [];
      }

      const map: Record<string, Rings> = {};
      rows.forEach((row) => {
        const dateKey = normalizeGoalDateKey(row?.date);
        if (!dateKey) return;
        map[dateKey] = computeRings(row);
      });

      setGoalData(map);
    } catch (err) {
      console.warn('[GoalCalendar] fetchMonthGoals failed', err);
      setGoalData({});
    } finally {
      setLoading(false);
    }
  }, [currentMonth, userId]);

  useEffect(() => {
    fetchMonthGoals();
  }, [fetchMonthGoals]);

  useFocusEffect(
    useCallback(() => {
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

      <View style={styles.weeksWrapper}>
        {weeks.map((week, wi) => (
          <View key={`week-${wi}`} style={styles.calendarRow}>
            {week.map((day, di) => {
              if (!day) {
                return <View key={`empty-${wi}-${di}`} style={styles.calendarCellEmpty} />;
              }

              const key = currentMonth
                .year()
                .toString()
                .concat(
                  '-',
                  String(currentMonth.month() + 1).padStart(2, '0'),
                  '-',
                  String(day).padStart(2, '0')
                );
              const flags = goalData[key];

              return (
                <View key={`day-${wi}-${di}`} style={styles.calendarCell}>
                  <GoalRings rings={flags} />
                  <Text style={styles.calendarDayText}>{day}</Text>
                </View>
              );
            })}
          </View>
        ))}
      </View>

      <View style={styles.legendRow}>
        <LegendItem color={GOAL_COLORS.strength} label="Strength ring closed" />
        <LegendItem color={GOAL_COLORS.cardio} label="Cardio ring closed" />
        <LegendItem color={GOAL_COLORS.nutrition} label="Nutrition ring closed" />
      </View>
    </View>
  );
};

export default GoalCalendar;

// ---- Subcomponents ----

const GoalRings = ({ rings }: { rings?: Rings }) => {
  if (!rings) {
    return (
      <View style={styles.ringsWrap}>
        <Svg width={26} height={26} viewBox="0 0 32 32">
          <Circle cx={16} cy={16} r={13} fill="none" stroke={BORDER} strokeWidth={2} opacity={0.18} />
        </Svg>
      </View>
    );
  }

  const strength = rings?.strength ?? { active: false, closed: false };
  const cardio = rings?.cardio ?? { active: false, closed: false };
  const nutrition = rings?.nutrition ?? { active: false, closed: false };

  return (
    <View style={styles.ringsWrap}>
      <Svg width={26} height={26} viewBox="0 0 32 32">
        {/* Outer: Strength */}
        <Ring r={13} strokeWidth={3} active={strength.active} closed={strength.closed} color={GOAL_COLORS.strength} />
        {/* Middle: Cardio */}
        <Ring r={9} strokeWidth={3} active={cardio.active} closed={cardio.closed} color={GOAL_COLORS.cardio} />
        {/* Inner: Nutrition */}
        <Ring r={5} strokeWidth={3} active={nutrition.active} closed={nutrition.closed} color={GOAL_COLORS.nutrition} />
      </Svg>
    </View>
  );
};

const Ring = ({
  r,
  strokeWidth,
  active,
  closed,
  color,
}: {
  r: number;
  strokeWidth: number;
  active: boolean;
  closed: boolean;
  color: string;
}) => {
  const baseOpacity = active ? 0.85 : 0.35;

  return (
    <>
      <Circle cx={16} cy={16} r={r} fill="none" stroke={BORDER} strokeWidth={strokeWidth} opacity={baseOpacity} />
      {closed ? <Circle cx={16} cy={16} r={r} fill="none" stroke={color} strokeWidth={strokeWidth} /> : null}
    </>
  );
};

const LegendItem = ({ color, label }: { color: string; label: string }) => (
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
  ringsWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: BG,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
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
