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

const BG = Colors.dark?.background ?? '#050816';
const CARD = Colors.dark?.card ?? '#13182B';
const BORDER = Colors.dark?.border ?? '#1F2937';
const TEXT_PRIMARY = Colors.dark.text;
const TEXT_MUTED = Colors.dark.textMuted;

type RingStatus = {
  active: boolean; // at least one metric enabled for that ring
  met: boolean; // all enabled metrics met
};

type GoalFlags = {
  strength: RingStatus;
  cardio: RingStatus;
  nutrition: RingStatus;
};

type DailyGoalResultsRow = {
  date?: string; // daily_goal_results.date

  // Strength
  strength_use_time?: boolean | null;
  strength_use_volume?: boolean | null;
  met_strength_time?: boolean | null;
  met_strength_volume?: boolean | null;

  // Cardio
  cardio_use_time?: boolean | null;
  cardio_use_distance?: boolean | null;
  met_cardio_time?: boolean | null;
  met_cardio_distance?: boolean | null;

  // Nutrition
  protein_enabled?: boolean | null;
  carbs_enabled?: boolean | null;
  fats_enabled?: boolean | null;
  calorie_goal_mode?: string | null;
  met_protein?: boolean | null;
  met_carbs?: boolean | null;
  met_fats?: boolean | null;
  met_calories?: boolean | null;

  // Backwards compatibility (if you keep a view/table emitting these)
  goal_date?: string;
  strength_met?: boolean | null;
  cardio_met?: boolean | null;
  nutrition_met?: boolean | null;
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

const asBool = (v: unknown) => v === true;

function deriveRingStatus(opts: { enabled: boolean[]; met: boolean[] }): RingStatus {
  const active = opts.enabled.some(Boolean);
  if (!active) return { active: false, met: false };

  // all enabled must be met
  for (let i = 0; i < opts.enabled.length; i++) {
    if (opts.enabled[i] && !opts.met[i]) return { active: true, met: false };
  }
  return { active: true, met: true };
}

function deriveFlags(row: DailyGoalResultsRow): { key: string; flags: GoalFlags } | null {
  const key = row.date ?? row.goal_date;
  if (!key) return null;

  // If you have aggregated booleans already, prefer them.
  const hasAggregate =
    typeof row.strength_met === 'boolean' ||
    typeof row.cardio_met === 'boolean' ||
    typeof row.nutrition_met === 'boolean';

  if (hasAggregate) {
    return {
      key,
      flags: {
        strength: { active: true, met: asBool(row.strength_met) },
        cardio: { active: true, met: asBool(row.cardio_met) },
        nutrition: { active: true, met: asBool(row.nutrition_met) },
      },
    };
  }

  // Strength ring
  const strengthEnabled = [asBool(row.strength_use_time), asBool(row.strength_use_volume)];
  const strengthMet = [asBool(row.met_strength_time), asBool(row.met_strength_volume)];

  // Cardio ring
  const cardioEnabled = [asBool(row.cardio_use_time), asBool(row.cardio_use_distance)];
  const cardioMet = [asBool(row.met_cardio_time), asBool(row.met_cardio_distance)];

  // Nutrition ring
  const calorieEnabled =
    row.calorie_goal_mode != null && String(row.calorie_goal_mode).toLowerCase() !== 'disabled';

  const nutritionEnabled = [
    asBool(row.protein_enabled),
    asBool(row.carbs_enabled),
    asBool(row.fats_enabled),
    calorieEnabled,
  ];
  const nutritionMet = [
    asBool(row.met_protein),
    asBool(row.met_carbs),
    asBool(row.met_fats),
    asBool(row.met_calories),
  ];

  return {
    key,
    flags: {
      strength: deriveRingStatus({ enabled: strengthEnabled, met: strengthMet }),
      cardio: deriveRingStatus({ enabled: cardioEnabled, met: cardioMet }),
      nutrition: deriveRingStatus({ enabled: nutritionEnabled, met: nutritionMet }),
    },
  };
}

const GoalCalendar: React.FC<Props> = ({ initialMonth }) => {
  const [currentMonth, setCurrentMonth] = useState<Dayjs>(initialMonth ?? dayjs());
  const [goalData, setGoalData] = useState<Record<string, GoalFlags>>({});
  const [loading, setLoading] = useState(false);

  const fetchMonthGoals = useCallback(async () => {
    setLoading(true);
    try {
      const start = currentMonth.startOf('month').format('YYYY-MM-DD');
      const end = currentMonth.endOf('month').format('YYYY-MM-DD');

      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      if (!user) throw new Error('Not signed in');

      const { data, error } = await supabase
        .schema('user')
        .from('daily_goal_results')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', start)
        .lte('date', end);

      if (error) throw error;

      const map: Record<string, GoalFlags> = {};
      (data as DailyGoalResultsRow[] | null)?.forEach((row) => {
        const derived = deriveFlags(row);
        if (!derived) return;
        map[derived.key] = derived.flags;
      });

      setGoalData(map);
    } catch (err) {
      console.warn('[GoalCalendar] fetchMonthGoals failed', err);
      setGoalData({});
    } finally {
      setLoading(false);
    }
  }, [currentMonth]);

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

              const dateObj = currentMonth.date(day);
              const key = dateObj.format('YYYY-MM-DD');
              const flags = goalData[key];

              return (
                <View key={`day-${wi}-${di}`} style={styles.calendarCell}>
                  <GoalRings flags={flags} />
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

const GoalRings = ({ flags }: { flags?: GoalFlags }) => {
  const strength = flags?.strength ?? { active: false, met: false };
  const cardio = flags?.cardio ?? { active: false, met: false };
  const nutrition = flags?.nutrition ?? { active: false, met: false };

  return (
    <View style={styles.ringsWrap}>
      <Svg width={26} height={26} viewBox="0 0 32 32">
        {/* Outer: Strength */}
        <Ring r={13} strokeWidth={3} active={strength.active} met={strength.met} color={GOAL_COLORS.strength} />
        {/* Middle: Cardio */}
        <Ring r={9} strokeWidth={3} active={cardio.active} met={cardio.met} color={GOAL_COLORS.cardio} />
        {/* Inner: Nutrition */}
        <Ring r={5} strokeWidth={3} active={nutrition.active} met={nutrition.met} color={GOAL_COLORS.nutrition} />
      </Svg>
    </View>
  );
};

const Ring = ({
  r,
  strokeWidth,
  active,
  met,
  color,
}: {
  r: number;
  strokeWidth: number;
  active: boolean;
  met: boolean;
  color: string;
}) => {
  const baseOpacity = active ? 0.85 : 0.35;

  return (
    <>
      <Circle cx={16} cy={16} r={r} fill="none" stroke={BORDER} strokeWidth={strokeWidth} opacity={baseOpacity} />
      {met ? <Circle cx={16} cy={16} r={r} fill="none" stroke={color} strokeWidth={strokeWidth} /> : null}
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
