import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { supabase } from '@/lib/supabase';
import LogoHeader from '@/components/my components/logoHeader';
import DailyStatsCard from './components/DailyStatsCard';
import GoalAchievementCard from '@/components/goals/GoalAchievementCard';
import { syncAndFetchMyDailyGoalResult, toLocalISODate } from '@/lib/goals/client';
import {
  isGoalCategoryClosed,
  type DailyGoalResults,
} from '@/lib/goals/goalLogic';
import { useAppTheme } from '@/providers/AppThemeProvider';
import { HOME_TONES } from '../../home/tokens';

type DiaryDay = {
  id: string;
  date: string;
  kcal_total: number | string | null;
  protein_g_total: number | string | null;
  carbs_g_total: number | string | null;
  fat_g_total: number | string | null;
  kcal_target: number | string | null;
  protein_g_target: number | string | null;
  carbs_g_target: number | string | null;
  fat_g_target: number | string | null;
};

type DiaryItem = {
  id: string;
  diary_day_id: string;
  recipe_id: string | null;
  food_id: number | null;
  quantity: number | string;
  unit_label: string;
  grams: number | string;
  kcal: number | string | null;
  protein: number | string | null;
  carbs: number | string | null;
  fat: number | string | null;
};

type RecipeRow = {
  id: string;
  name: string;
};

type DisplayItem = {
  id: string;
  name: string;
  quantity: number;
  unitLabel: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
};

export default function DailyNutritionSummary() {
  const { date } = useLocalSearchParams<{ date?: string }>();
  const { colors, fonts, globalStyles } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);

  const [loading, setLoading] = useState(true);
  const [day, setDay] = useState<DiaryDay | null>(null);
  const [items, setItems] = useState<DisplayItem[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [goalResult, setGoalResult] = useState<DailyGoalResults | null>(null);
  const dateStr = useMemo(() => (date as string) ?? toLocalISODate(), [date]);

  const dayLabel = useMemo(() => {
    const parsed = new Date(`${dateStr}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return dateStr;
    return parsed.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }, [dateStr]);

  useEffect(() => {
    let isMounted = true;

    const fetchDay = async () => {
      try {
        setLoading(true);
        setErrorMsg(null);

        const {
          data: { user },
          error: userErr,
        } = await supabase.auth.getUser();

        if (userErr) throw userErr;
        if (!user) throw new Error('No authenticated user found.');

        try {
          const goalRow = await syncAndFetchMyDailyGoalResult(dateStr);
          if (isMounted) setGoalResult(goalRow);
        } catch (goalErr) {
          console.warn('Error refreshing nutrition goal summary', goalErr);
          if (isMounted) setGoalResult(null);
        }

        const { data: dayRow, error: dayErr } = await supabase
          .schema('nutrition')
          .from('diary_days')
          .select('*')
          .eq('user_id', user.id)
          .eq('date', dateStr)
          .maybeSingle();

        if (dayErr && dayErr.code !== 'PGRST116') throw dayErr;

        if (!dayRow) {
          if (isMounted) {
            setDay(null);
            setItems([]);
          }
          return;
        }

        if (isMounted) setDay(dayRow as DiaryDay);

        const { data: itemRows, error: itemsErr } = await supabase
          .schema('nutrition')
          .from('diary_items')
          .select('*')
          .eq('diary_day_id', dayRow.id)
          .order('created_at', { ascending: true });

        if (itemsErr) throw itemsErr;

        const itemsTyped = (itemRows ?? []) as DiaryItem[];
        const recipeIds = Array.from(
          new Set(itemsTyped.map((item) => item.recipe_id).filter((id): id is string => !!id))
        );

        let recipeMap: Record<string, string> = {};
        if (recipeIds.length > 0) {
          const { data: recipes, error: recipesErr } = await supabase
            .schema('nutrition')
            .from('recipes')
            .select('id, name')
            .in('id', recipeIds);

          if (recipesErr) throw recipesErr;
          recipeMap = (recipes as RecipeRow[]).reduce(
            (acc, recipe) => ({ ...acc, [recipe.id]: recipe.name }),
            {} as Record<string, string>
          );
        }

        const displayItems: DisplayItem[] = itemsTyped.map((item) => {
          const nameFromRecipe =
            item.recipe_id && recipeMap[item.recipe_id]
              ? recipeMap[item.recipe_id]
              : undefined;

          const name = nameFromRecipe ?? (item.food_id ? `Food #${item.food_id}` : 'Item');

          return {
            id: item.id,
            name,
            quantity: Number(item.quantity ?? 0),
            unitLabel: item.unit_label ?? '',
            kcal: Number(item.kcal ?? 0),
            protein: Number(item.protein ?? 0),
            carbs: Number(item.carbs ?? 0),
            fat: Number(item.fat ?? 0),
          };
        });

        if (isMounted) setItems(displayItems);
      } catch (err: any) {
        console.warn('Error loading daily summary', err);
        if (isMounted) {
          setErrorMsg(err?.message ?? 'Something went wrong loading your day.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchDay();

    return () => {
      isMounted = false;
    };
  }, [dateStr]);

  const totals = useMemo(() => {
    const baseKcal =
      day?.kcal_total != null
        ? Number(day.kcal_total)
        : items.reduce((sum, item) => sum + (item.kcal || 0), 0);
    const baseProtein =
      day?.protein_g_total != null
        ? Number(day.protein_g_total)
        : items.reduce((sum, item) => sum + (item.protein || 0), 0);
    const baseCarbs =
      day?.carbs_g_total != null
        ? Number(day.carbs_g_total)
        : items.reduce((sum, item) => sum + (item.carbs || 0), 0);
    const baseFat =
      day?.fat_g_total != null
        ? Number(day.fat_g_total)
        : items.reduce((sum, item) => sum + (item.fat || 0), 0);

    return {
      totalKcal: baseKcal || 0,
      totalProtein: baseProtein || 0,
      totalCarbs: baseCarbs || 0,
      totalFat: baseFat || 0,
    };
  }, [day, items]);

  const targets = useMemo(() => {
    return {
      kcalTarget: day?.kcal_target != null ? Number(day.kcal_target) : null,
      proteinTarget:
        day?.protein_g_target != null ? Number(day.protein_g_target) : null,
      carbsTarget: day?.carbs_g_target != null ? Number(day.carbs_g_target) : null,
      fatTarget: day?.fat_g_target != null ? Number(day.fat_g_target) : null,
    };
  }, [day]);

  const macroTotal = totals.totalProtein + totals.totalCarbs + totals.totalFat;

  return (
    <View style={styles.page}>
      <View style={globalStyles.safeArea}>
        <LogoHeader showBackButton />

        <View style={styles.main}>
          <View style={styles.hero}>
            <Text style={styles.eyebrow}>Nutrition History</Text>
            <Text style={styles.header}>Daily nutrition</Text>
            <Text style={styles.heroText}>{dayLabel}</Text>
          </View>

          {loading ? (
            <View style={[styles.panelSoft, styles.centerState]}>
              <ActivityIndicator size="small" color={colors.highlight1} />
              <Text style={styles.stateText}>Loading summary...</Text>
            </View>
          ) : errorMsg ? (
            <View style={[styles.panelSoft, styles.centerState]}>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              <DailyStatsCard
                dateLabel={dayLabel}
                totalKcal={totals.totalKcal}
                totalProtein={totals.totalProtein}
                totalCarbs={totals.totalCarbs}
                totalFat={totals.totalFat}
                kcalTarget={targets.kcalTarget}
                proteinTarget={targets.proteinTarget}
                carbsTarget={targets.carbsTarget}
                fatTarget={targets.fatTarget}
              />

              <View style={styles.macroSnapshot}>
                <MetricCard
                  label="Protein"
                  value={`${totals.totalProtein.toFixed(1)} g`}
                  accentColor={colors.macroProtein}
                  styles={styles}
                />
                <MetricCard
                  label="Carbs"
                  value={`${totals.totalCarbs.toFixed(1)} g`}
                  accentColor={colors.macroCarbs}
                  styles={styles}
                />
                <MetricCard
                  label="Fat"
                  value={`${totals.totalFat.toFixed(1)} g`}
                  accentColor={colors.macroFats}
                  styles={styles}
                />
              </View>

              {goalResult && isGoalCategoryClosed(goalResult, 'nutrition') ? (
                <View style={styles.goalCardWrap}>
                  <GoalAchievementCard
                    title="Nutrition goal complete"
                    description="Your logged nutrition for this day meets the goal you set."
                  />
                </View>
              ) : null}

              <View style={styles.sectionHeader}>
                <View>
                  <Text style={styles.eyebrow}>Logged Items</Text>
                  <Text style={styles.sectionTitle}>What you consumed</Text>
                </View>
                <View style={styles.sectionBadge}>
                  <Text style={styles.sectionBadgeText}>
                    {items.length} item{items.length === 1 ? '' : 's'}
                  </Text>
                </View>
              </View>

              {items.length === 0 ? (
                <View style={[styles.panelSoft, styles.centerState]}>
                  <Text style={styles.stateText}>No items logged for this day yet.</Text>
                </View>
              ) : (
                items.map((item) => {
                  const share = macroTotal > 0 ? ((item.protein + item.carbs + item.fat) / macroTotal) * 100 : 0;

                  return (
                    <View key={item.id} style={styles.itemCard}>
                      <View style={styles.itemTopRow}>
                        <View style={styles.itemCopy}>
                          <Text style={styles.itemTitle}>{item.name}</Text>
                          <Text style={styles.itemSubtitle}>
                            {item.quantity} {item.unitLabel} • {item.kcal} kcal
                          </Text>
                        </View>
                        <View style={styles.itemSharePill}>
                          <Text style={styles.itemShareText}>{Math.round(share)}%</Text>
                        </View>
                      </View>

                      <View style={styles.itemMacroRow}>
                        <MiniMacro label="P" value={`${item.protein.toFixed(1)}g`} styles={styles} />
                        <MiniMacro label="C" value={`${item.carbs.toFixed(1)}g`} styles={styles} />
                        <MiniMacro label="F" value={`${item.fat.toFixed(1)}g`} styles={styles} />
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </View>
  );
}

function MetricCard({
  label,
  value,
  accentColor,
  styles,
}: {
  label: string;
  value: string;
  accentColor: string;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.metricCard}>
      <View style={[styles.metricDot, { backgroundColor: accentColor }]} />
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function MiniMacro({
  label,
  value,
  styles,
}: {
  label: string;
  value: string;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.miniMacro}>
      <Text style={styles.miniMacroLabel}>{label}</Text>
      <Text style={styles.miniMacroValue}>{value}</Text>
    </View>
  );
}

function createStyles(
  colors: ReturnType<typeof useAppTheme>['colors'],
  fonts: ReturnType<typeof useAppTheme>['fonts']
) {
  return StyleSheet.create({
    page: {
      flex: 1,
      backgroundColor: HOME_TONES.background,
    },
    panelSoft: {
      backgroundColor: HOME_TONES.surface2,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      padding: 18,
    },
    eyebrow: {
      color: HOME_TONES.textTertiary,
      fontFamily: fonts.label,
      fontSize: 11,
      lineHeight: 14,
      letterSpacing: 0.9,
      textTransform: 'uppercase',
    },
    header: {
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.display,
      fontSize: 32,
      lineHeight: 36,
      letterSpacing: -0.8,
    },
    main: {
      flex: 1,
      paddingTop: 8,
      gap: 14,
    },
    hero: {
      borderRadius: 28,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      backgroundColor: HOME_TONES.surface1,
      padding: 22,
      gap: 8,
    },
    heroText: {
      color: HOME_TONES.textSecondary,
      fontFamily: fonts.body,
      fontSize: 14,
      lineHeight: 20,
    },
    scrollContent: {
      paddingBottom: 40,
      gap: 14,
    },
    goalCardWrap: {
      marginTop: 2,
    },
    centerState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
      paddingVertical: 28,
      gap: 6,
    },
    stateText: {
      color: HOME_TONES.textSecondary,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 18,
      textAlign: 'center',
    },
    errorText: {
      color: colors.danger,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 18,
      textAlign: 'center',
    },
    macroSnapshot: {
      flexDirection: 'row',
      gap: 10,
    },
    metricCard: {
      flex: 1,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      backgroundColor: HOME_TONES.surface2,
      padding: 14,
      gap: 8,
    },
    metricDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    metricLabel: {
      color: HOME_TONES.textTertiary,
      fontFamily: fonts.label,
      fontSize: 10,
      lineHeight: 12,
      letterSpacing: 0.45,
      textTransform: 'uppercase',
    },
    metricValue: {
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.heading,
      fontSize: 14,
      lineHeight: 18,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 10,
      marginTop: 2,
    },
    sectionTitle: {
      marginTop: 8,
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.heading,
      fontSize: 20,
      lineHeight: 24,
      letterSpacing: -0.4,
    },
    sectionBadge: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      backgroundColor: HOME_TONES.surface2,
      paddingHorizontal: 10,
      paddingVertical: 7,
    },
    sectionBadgeText: {
      color: HOME_TONES.textTertiary,
      fontFamily: fonts.label,
      fontSize: 11,
      lineHeight: 13,
      letterSpacing: 0.35,
      textTransform: 'uppercase',
    },
    itemCard: {
      borderRadius: 22,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      backgroundColor: HOME_TONES.surface2,
      padding: 15,
      gap: 12,
    },
    itemTopRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
    },
    itemCopy: {
      flex: 1,
    },
    itemTitle: {
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.heading,
      fontSize: 15,
      lineHeight: 20,
    },
    itemSubtitle: {
      marginTop: 5,
      color: HOME_TONES.textSecondary,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 17,
    },
    itemSharePill: {
      borderRadius: 14,
      backgroundColor: colors.accentSoft,
      paddingHorizontal: 10,
      paddingVertical: 8,
    },
    itemShareText: {
      color: colors.highlight1,
      fontFamily: fonts.heading,
      fontSize: 12,
      lineHeight: 14,
    },
    itemMacroRow: {
      flexDirection: 'row',
      gap: 8,
    },
    miniMacro: {
      flex: 1,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      backgroundColor: HOME_TONES.surface3,
      paddingHorizontal: 10,
      paddingVertical: 9,
    },
    miniMacroLabel: {
      color: HOME_TONES.textTertiary,
      fontFamily: fonts.label,
      fontSize: 10,
      lineHeight: 12,
      letterSpacing: 0.35,
      textTransform: 'uppercase',
    },
    miniMacroValue: {
      marginTop: 5,
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.heading,
      fontSize: 12,
      lineHeight: 15,
    },
  });
}
