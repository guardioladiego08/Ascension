import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '@/providers/AppThemeProvider';

import type { NutritionDayActivity } from './nutritionProgressUtils';

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

type Props = {
  activities: NutritionDayActivity[];
};

type CalendarCell = {
  key: string;
  dayLabel: string;
  dateKey: string | null;
  inMonth: boolean;
  isToday: boolean;
  activity: NutritionDayActivity | null;
};

function startOfMonth(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), 1);
}

function addMonths(value: Date, amount: number) {
  return new Date(value.getFullYear(), value.getMonth() + amount, 1);
}

function toDateKey(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function monthTitle(value: Date) {
  return value.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
}

function sameMonth(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth();
}

function monthDistance(left: Date, right: Date) {
  return (left.getFullYear() - right.getFullYear()) * 12 + (left.getMonth() - right.getMonth());
}

function buildCalendarCells(
  month: Date,
  activityByDate: Map<string, NutritionDayActivity>,
  todayKey: string
) {
  const monthStart = startOfMonth(month);
  const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const offset = monthStart.getDay();
  const totalDays = monthEnd.getDate();
  const cells: CalendarCell[] = [];

  for (let index = 0; index < offset; index += 1) {
    cells.push({
      key: `leading-${index}`,
      dayLabel: '',
      dateKey: null,
      inMonth: false,
      isToday: false,
      activity: null,
    });
  }

  for (let day = 1; day <= totalDays; day += 1) {
    const date = new Date(month.getFullYear(), month.getMonth(), day);
    const dateKey = toDateKey(date);
    cells.push({
      key: dateKey,
      dayLabel: String(day),
      dateKey,
      inMonth: true,
      isToday: dateKey === todayKey,
      activity: activityByDate.get(dateKey) ?? null,
    });
  }

  while (cells.length % 7 !== 0) {
    cells.push({
      key: `trailing-${cells.length}`,
      dayLabel: '',
      dateKey: null,
      inMonth: false,
      isToday: false,
      activity: null,
    });
  }

  return Array.from({ length: Math.ceil(cells.length / 7) }, (_, index) =>
    cells.slice(index * 7, index * 7 + 7)
  );
}

function createInitialMonth(activities: NutritionDayActivity[]) {
  const latestDateKey = activities[activities.length - 1]?.date;
  if (!latestDateKey) return startOfMonth(new Date());
  const latestDate = new Date(`${latestDateKey}T12:00:00`);
  if (Number.isNaN(latestDate.getTime())) return startOfMonth(new Date());
  return startOfMonth(latestDate);
}

export default function NutritionGoalCalendar({ activities }: Props) {
  const { colors, fonts } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);

  const [activeMonth, setActiveMonth] = useState(() => createInitialMonth(activities));

  const activityByDate = useMemo(
    () => new Map(activities.map((activity) => [activity.date, activity])),
    [activities]
  );

  const todayMonth = useMemo(() => startOfMonth(new Date()), []);
  const earliestMonth = useMemo(() => {
    const firstDateKey = activities[0]?.date;
    if (!firstDateKey) return todayMonth;
    const firstDate = new Date(`${firstDateKey}T12:00:00`);
    return Number.isNaN(firstDate.getTime()) ? todayMonth : startOfMonth(firstDate);
  }, [activities, todayMonth]);

  useEffect(() => {
    setActiveMonth((previous) => {
      if (monthDistance(previous, earliestMonth) < 0) {
        return earliestMonth;
      }
      if (monthDistance(previous, todayMonth) > 0) {
        return todayMonth;
      }
      return previous;
    });
  }, [earliestMonth, todayMonth]);

  const todayKey = useMemo(() => toDateKey(new Date()), []);

  const weeks = useMemo(
    () => buildCalendarCells(activeMonth, activityByDate, todayKey),
    [activeMonth, activityByDate, todayKey]
  );

  const monthSummary = useMemo(() => {
    const monthActivities = activities.filter((activity) => {
      const date = new Date(`${activity.date}T12:00:00`);
      return !Number.isNaN(date.getTime()) && sameMonth(date, activeMonth);
    });

    return {
      loggedDays: monthActivities.length,
      goalHitDays: monthActivities.filter((activity) => activity.goalHit).length,
      fullDayDays: monthActivities.filter((activity) => {
        const breakfastCount = activity.mealSlotCounts.breakfast ?? 0;
        const lunchCount = activity.mealSlotCounts.lunch ?? 0;
        const dinnerCount = activity.mealSlotCounts.dinner ?? 0;
        return breakfastCount > 0 && lunchCount > 0 && dinnerCount > 0;
      }).length,
    };
  }, [activeMonth, activities]);

  const canGoBack = monthDistance(activeMonth, earliestMonth) > 0;
  const canGoForward = monthDistance(activeMonth, todayMonth) < 0;

  return (
    <View style={styles.shell}>
      <View style={styles.headerRow}>
        <View style={styles.headerCopy}>
          <Text style={styles.monthTitle}>{monthTitle(activeMonth)}</Text>
          <Text style={styles.monthSubtitle}>
            Bright cells are goal-hit days. Bottom capsules show calorie, protein, and carb targets.
          </Text>
        </View>

        <View style={styles.navRow}>
          <Pressable
            accessibilityRole="button"
            disabled={!canGoBack}
            onPress={() => setActiveMonth((month) => addMonths(month, -1))}
            style={[styles.navButton, !canGoBack ? styles.navButtonDisabled : null]}
          >
            <Ionicons
              name="chevron-back"
              size={16}
              color={canGoBack ? colors.text : colors.textMuted}
            />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            disabled={!canGoForward}
            onPress={() => setActiveMonth((month) => addMonths(month, 1))}
            style={[styles.navButton, !canGoForward ? styles.navButtonDisabled : null]}
          >
            <Ionicons
              name="chevron-forward"
              size={16}
              color={canGoForward ? colors.text : colors.textMuted}
            />
          </Pressable>
        </View>
      </View>

      <View style={styles.monthStatsRow}>
        <View style={styles.monthStat}>
          <Text style={styles.monthStatLabel}>Logged</Text>
          <Text style={styles.monthStatValue}>{monthSummary.loggedDays}</Text>
        </View>
        <View style={styles.monthStat}>
          <Text style={styles.monthStatLabel}>Goal hit</Text>
          <Text style={styles.monthStatValue}>{monthSummary.goalHitDays}</Text>
        </View>
        <View style={styles.monthStat}>
          <Text style={styles.monthStatLabel}>Full day</Text>
          <Text style={styles.monthStatValue}>{monthSummary.fullDayDays}</Text>
        </View>
      </View>

      <View style={styles.weekdayRow}>
        {WEEKDAY_LABELS.map((label, index) => (
          <Text key={`${label}-${index}`} style={styles.weekdayLabel}>
            {label}
          </Text>
        ))}
      </View>

      <View style={styles.calendarGrid}>
        {weeks.map((week, weekIndex) => (
          <View key={`week-${weekIndex}`} style={styles.calendarRow}>
            {week.map((cell) => {
              if (!cell.inMonth) {
                return <View key={cell.key} style={styles.emptyCell} />;
              }

              const activity = cell.activity;
              const mainMealLogged =
                activity != null &&
                (activity.mealSlotCounts.breakfast ?? 0) > 0 &&
                (activity.mealSlotCounts.lunch ?? 0) > 0 &&
                (activity.mealSlotCounts.dinner ?? 0) > 0;

              return (
                <View
                  key={cell.key}
                  style={[
                    styles.dayCell,
                    activity ? styles.dayCellLogged : styles.dayCellIdle,
                    activity?.goalHit ? styles.dayCellGoalHit : null,
                    mainMealLogged ? styles.dayCellFull : null,
                    cell.isToday ? styles.dayCellToday : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayLabel,
                      activity ? styles.dayLabelActive : null,
                      activity?.goalHit ? styles.dayLabelGoalHit : null,
                    ]}
                  >
                    {cell.dayLabel}
                  </Text>

                  <View style={styles.targetCapsuleRow}>
                    <View
                      style={[
                        styles.targetCapsule,
                        activity?.calorieTargetHit ? styles.targetCapsuleCalories : null,
                      ]}
                    />
                    <View
                      style={[
                        styles.targetCapsule,
                        activity?.proteinTargetHit ? styles.targetCapsuleProtein : null,
                      ]}
                    />
                    <View
                      style={[
                        styles.targetCapsule,
                        activity?.carbsTargetHit ? styles.targetCapsuleCarbs : null,
                      ]}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        ))}
      </View>

      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, styles.legendLogged]} />
          <Text style={styles.legendLabel}>Logged day</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, styles.legendGoalHit]} />
          <Text style={styles.legendLabel}>Goal hit</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, styles.legendFull]} />
          <Text style={styles.legendLabel}>Full breakfast/lunch/dinner</Text>
        </View>
      </View>
    </View>
  );
}

function createStyles(
  colors: ReturnType<typeof useAppTheme>['colors'],
  fonts: ReturnType<typeof useAppTheme>['fonts']
) {
  return StyleSheet.create({
    shell: {
      borderRadius: 24,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card2,
      paddingHorizontal: 16,
      paddingVertical: 16,
      gap: 14,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
    },
    headerCopy: {
      flex: 1,
      gap: 4,
    },
    monthTitle: {
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 16,
      lineHeight: 20,
    },
    monthSubtitle: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 17,
    },
    navRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    navButton: {
      width: 34,
      height: 34,
      borderRadius: 17,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card3,
      alignItems: 'center',
      justifyContent: 'center',
    },
    navButtonDisabled: {
      opacity: 0.45,
    },
    monthStatsRow: {
      flexDirection: 'row',
      gap: 10,
    },
    monthStat: {
      flex: 1,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card3,
      paddingHorizontal: 12,
      paddingVertical: 10,
      gap: 4,
    },
    monthStatLabel: {
      color: colors.textMuted,
      fontFamily: fonts.label,
      fontSize: 10,
      lineHeight: 13,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    monthStatValue: {
      color: colors.text,
      fontFamily: fonts.mono,
      fontSize: 17,
      lineHeight: 21,
      fontVariant: ['tabular-nums'],
    },
    weekdayRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 8,
    },
    weekdayLabel: {
      flex: 1,
      textAlign: 'center',
      color: colors.textMuted,
      fontFamily: fonts.label,
      fontSize: 10,
      lineHeight: 13,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    calendarGrid: {
      gap: 8,
    },
    calendarRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 8,
    },
    emptyCell: {
      flex: 1,
      aspectRatio: 0.86,
    },
    dayCell: {
      flex: 1,
      aspectRatio: 0.86,
      borderRadius: 16,
      borderWidth: 1,
      paddingHorizontal: 6,
      paddingVertical: 6,
      justifyContent: 'space-between',
    },
    dayCellIdle: {
      borderColor: colors.border,
      backgroundColor: colors.card3,
    },
    dayCellLogged: {
      borderColor: colors.borderStrong,
      backgroundColor: colors.accentSecondarySoft,
    },
    dayCellGoalHit: {
      borderColor: colors.highlight1,
      backgroundColor: colors.accentSoft,
    },
    dayCellFull: {
      shadowColor: colors.highlight3,
      shadowOpacity: 0.18,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 6 },
      elevation: 2,
    },
    dayCellToday: {
      borderColor: colors.text,
    },
    dayLabel: {
      color: colors.textMuted,
      fontFamily: fonts.mono,
      fontSize: 12,
      lineHeight: 16,
      fontVariant: ['tabular-nums'],
    },
    dayLabelActive: {
      color: colors.text,
    },
    dayLabelGoalHit: {
      color: colors.text,
    },
    targetCapsuleRow: {
      flexDirection: 'row',
      gap: 4,
    },
    targetCapsule: {
      flex: 1,
      height: 5,
      borderRadius: 999,
      backgroundColor: colors.card,
      opacity: 0.85,
    },
    targetCapsuleCalories: {
      backgroundColor: colors.highlight1,
    },
    targetCapsuleProtein: {
      backgroundColor: colors.highlight2,
    },
    targetCapsuleCarbs: {
      backgroundColor: colors.highlight3,
    },
    legendRow: {
      gap: 8,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    legendSwatch: {
      width: 14,
      height: 14,
      borderRadius: 5,
      borderWidth: 1,
    },
    legendLogged: {
      borderColor: colors.borderStrong,
      backgroundColor: colors.accentSecondarySoft,
    },
    legendGoalHit: {
      borderColor: colors.highlight1,
      backgroundColor: colors.accentSoft,
    },
    legendFull: {
      borderColor: colors.text,
      backgroundColor: colors.card3,
    },
    legendLabel: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 16,
    },
  });
}
