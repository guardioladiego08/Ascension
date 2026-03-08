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

import { useAppTheme } from '@/providers/AppThemeProvider';
import { supabase } from '@/lib/supabase';
import {
  computeRings,
  type DailyGoalResults,
  type Rings,
} from '@/lib/goals/goalLogic';

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
  const { colors, fonts } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);

  const goalColors = useMemo(
    () => ({
      strength: colors.highlight1,
      cardio: colors.highlight2,
      nutrition: colors.highlight3,
    }),
    [colors.highlight1, colors.highlight2, colors.highlight3]
  );

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
    const offset = startOfMonth.day();

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

  return (
    <View style={styles.calendarContainer}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.eyebrow}>Goal calendar</Text>
          <Text style={styles.title}>{currentMonth.format('MMMM YYYY')}</Text>
        </View>

        <View style={styles.navGroup}>
          <TouchableOpacity
            onPress={() => setCurrentMonth((month) => month.subtract(1, 'month'))}
            style={styles.monthNavBtn}
          >
            <Ionicons name="chevron-back" size={18} color={colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setCurrentMonth((month) => month.add(1, 'month'))}
            style={styles.monthNavBtn}
          >
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.weekdayRow}>
        {WEEKDAYS.map((day, index) => (
          <Text key={`${day}-${index}`} style={styles.weekdayLabel}>
            {day}
          </Text>
        ))}
      </View>

      {loading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={colors.highlight1} />
          <Text style={styles.loadingText}>Syncing goals…</Text>
        </View>
      ) : null}

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
              const rings = goalData[key];

              return (
                <View key={`day-${wi}-${di}`} style={styles.calendarCell}>
                  <GoalRings
                    rings={rings}
                    styles={styles}
                    colors={goalColors}
                    borderColor={colors.border}
                    baseBg={colors.cardDark}
                  />
                  <Text style={styles.calendarDayText}>{day}</Text>
                </View>
              );
            })}
          </View>
        ))}
      </View>

      <View style={styles.legendRow}>
        <LegendItem color={goalColors.strength} label="Strength ring closed" styles={styles} />
        <LegendItem color={goalColors.cardio} label="Cardio ring closed" styles={styles} />
        <LegendItem color={goalColors.nutrition} label="Nutrition ring closed" styles={styles} />
      </View>
    </View>
  );
};

function GoalRings({
  rings,
  styles,
  colors,
  borderColor,
  baseBg,
}: {
  rings?: Rings;
  styles: ReturnType<typeof createStyles>;
  colors: { strength: string; cardio: string; nutrition: string };
  borderColor: string;
  baseBg: string;
}) {
  if (!rings) {
    return (
      <View style={[styles.ringsWrap, { backgroundColor: baseBg }]}>
        <Svg width={26} height={26} viewBox="0 0 32 32">
          <Circle cx={16} cy={16} r={13} fill="none" stroke={borderColor} strokeWidth={2} opacity={0.2} />
        </Svg>
      </View>
    );
  }

  const strength = rings?.strength ?? { active: false, closed: false };
  const cardio = rings?.cardio ?? { active: false, closed: false };
  const nutrition = rings?.nutrition ?? { active: false, closed: false };

  return (
    <View style={[styles.ringsWrap, { backgroundColor: baseBg }]}>
      <Svg width={26} height={26} viewBox="0 0 32 32">
        <Ring
          r={13}
          strokeWidth={3}
          active={strength.active}
          closed={strength.closed}
          color={colors.strength}
          borderColor={borderColor}
        />
        <Ring
          r={9}
          strokeWidth={3}
          active={cardio.active}
          closed={cardio.closed}
          color={colors.cardio}
          borderColor={borderColor}
        />
        <Ring
          r={5}
          strokeWidth={3}
          active={nutrition.active}
          closed={nutrition.closed}
          color={colors.nutrition}
          borderColor={borderColor}
        />
      </Svg>
    </View>
  );
}

function Ring({
  r,
  strokeWidth,
  active,
  closed,
  color,
  borderColor,
}: {
  r: number;
  strokeWidth: number;
  active: boolean;
  closed: boolean;
  color: string;
  borderColor: string;
}) {
  const baseOpacity = active ? 0.85 : 0.35;

  return (
    <>
      <Circle
        cx={16}
        cy={16}
        r={r}
        fill="none"
        stroke={borderColor}
        strokeWidth={strokeWidth}
        opacity={baseOpacity}
      />
      {closed ? (
        <Circle cx={16} cy={16} r={r} fill="none" stroke={color} strokeWidth={strokeWidth} />
      ) : null}
    </>
  );
}

function LegendItem({
  color,
  label,
  styles,
}: {
  color: string;
  label: string;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

function createStyles(
  colors: ReturnType<typeof useAppTheme>['colors'],
  fonts: ReturnType<typeof useAppTheme>['fonts']
) {
  return StyleSheet.create({
    calendarContainer: {
      marginTop: 16,
      backgroundColor: colors.card,
      borderRadius: 22,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 12,
    },
    eyebrow: {
      color: colors.textOffSt,
      fontFamily: fonts.label,
      fontSize: 11,
      lineHeight: 14,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    title: {
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 18,
      lineHeight: 22,
      marginTop: 4,
    },
    navGroup: {
      flexDirection: 'row',
      gap: 8,
    },
    monthNavBtn: {
      width: 36,
      height: 36,
      borderRadius: 12,
      backgroundColor: colors.card2,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    weekdayRow: {
      flexDirection: 'row',
      marginTop: 12,
      marginBottom: 4,
    },
    weekdayLabel: {
      flex: 1,
      textAlign: 'center',
      color: colors.textMuted,
      fontFamily: fonts.label,
      fontSize: 11,
      lineHeight: 14,
    },
    loadingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 8,
      gap: 8,
    },
    loadingText: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 11,
      lineHeight: 15,
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
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    ringsWrap: {
      width: 28,
      height: 28,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    calendarDayText: {
      position: 'absolute',
      top: 4,
      left: 4,
      color: colors.text,
      fontFamily: fonts.label,
      fontSize: 10,
      lineHeight: 12,
    },
    legendRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginTop: 12,
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
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 11,
      lineHeight: 15,
    },
  });
}

export default GoalCalendar;
