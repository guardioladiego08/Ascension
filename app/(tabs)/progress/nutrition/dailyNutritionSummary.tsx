// app/(tabs)/nutrition/dailyNutritionSummary.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/Colors';
import { GlobalStyles } from '@/constants/GlobalStyles';
import LogoHeader from '@/components/my components/logoHeader';
import DailyStatsCard from './components/DailyStatsCard';

const CARD = Colors.dark.card;
const TEXT_PRIMARY = '#EAF2FF';
const TEXT_MUTED = '#9AA4BF';
const PRIMARY_GREEN = '#15C779';

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
  const [loading, setLoading] = useState(true);
  const [day, setDay] = useState<DiaryDay | null>(null);
  const [items, setItems] = useState<DisplayItem[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const dayLabel = useMemo(() => {
    const raw = date ?? new Date().toISOString().slice(0, 10);
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return raw;
    return parsed.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }, [date]);

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

        const dateStr = (date as string) ?? new Date().toISOString().slice(0, 10);

        const { data: dayRow, error: dayErr } = await supabase
          .schema('nutrition')
          .from('diary_days')
          .select('*')
          .eq('user_id', user.id)
          .eq('date', dateStr)
          .maybeSingle();

        if (dayErr && dayErr.code !== 'PGRST116') {
          throw dayErr;
        }

        if (!dayRow) {
          if (isMounted) {
            setDay(null);
            setItems([]);
          }
          return;
        }

        if (isMounted) {
          setDay(dayRow as DiaryDay);
        }

        const { data: itemRows, error: itemsErr } = await supabase
          .schema('nutrition')
          .from('diary_items')
          .select('*')
          .eq('diary_day_id', dayRow.id)
          .order('created_at', { ascending: true });

        if (itemsErr) throw itemsErr;

        const itemsTyped = (itemRows ?? []) as DiaryItem[];

        const recipeIds = Array.from(
          new Set(
            itemsTyped
              .map(i => i.recipe_id)
              .filter((id): id is string => !!id)
          )
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
            (acc, r) => ({ ...acc, [r.id]: r.name }),
            {} as Record<string, string>
          );
        }

        const displayItems: DisplayItem[] = itemsTyped.map(i => {
          const nameFromRecipe =
            i.recipe_id && recipeMap[i.recipe_id]
              ? recipeMap[i.recipe_id]
              : undefined;

          const name =
            nameFromRecipe ?? (i.food_id ? `Food #${i.food_id}` : 'Item');

          return {
            id: i.id,
            name,
            quantity: Number(i.quantity ?? 0),
            unitLabel: i.unit_label ?? '',
            kcal: Number(i.kcal ?? 0),
            protein: Number(i.protein ?? 0),
            carbs: Number(i.carbs ?? 0),
            fat: Number(i.fat ?? 0),
          };
        });

        if (isMounted) {
          setItems(displayItems);
        }
      } catch (err: any) {
        console.warn('Error loading daily summary', err);
        if (isMounted) {
          setErrorMsg(
            err?.message ?? 'Something went wrong loading your day.'
          );
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchDay();

    return () => {
      isMounted = false;
    };
  }, [date]);

  const totals = useMemo(() => {
    const baseKcal =
      day?.kcal_total != null
        ? Number(day.kcal_total)
        : items.reduce((sum, i) => sum + (i.kcal || 0), 0);
    const baseProtein =
      day?.protein_g_total != null
        ? Number(day.protein_g_total)
        : items.reduce((sum, i) => sum + (i.protein || 0), 0);
    const baseCarbs =
      day?.carbs_g_total != null
        ? Number(day.carbs_g_total)
        : items.reduce((sum, i) => sum + (i.carbs || 0), 0);
    const baseFat =
      day?.fat_g_total != null
        ? Number(day.fat_g_total)
        : items.reduce((sum, i) => sum + (i.fat || 0), 0);

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
      carbsTarget:
        day?.carbs_g_target != null ? Number(day.carbs_g_target) : null,
      fatTarget: day?.fat_g_target != null ? Number(day.fat_g_target) : null,
    };
  }, [day]);

  return (
    <SafeAreaView style={GlobalStyles.safeArea}>
      <LogoHeader showBackButton />
      <View style={styles.main}>
        <View style={styles.headerRow}>
          <Text style={GlobalStyles.header}>Daily Nutrition</Text>
        </View>
        <Text style={styles.dateLabel}>{dayLabel}</Text>

        {loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="small" />
            <Text style={styles.stateText}>Loading summary…</Text>
          </View>
        ) : errorMsg ? (
          <View style={styles.centerState}>
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Stats card */}
            <View style={{ marginBottom: 16 }}>
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
            </View>

            {/* Items list */}
            <Text style={styles.sectionLabel}>ITEMS CONSUMED</Text>

            {items.length === 0 ? (
              <View style={styles.centerState}>
                <Text style={styles.stateText}>
                  No items logged for this day yet.
                </Text>
              </View>
            ) : (
              items.map(item => (
                <View key={item.id} style={styles.itemCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemTitle}>{item.name}</Text>
                    <Text style={styles.itemSubtitle}>
                      {item.quantity} {item.unitLabel} • {item.kcal} kcal
                    </Text>
                  </View>
                  <View style={styles.macroSummary}>
                    <Text style={styles.macroText}>
                      P {item.protein.toFixed(1)}g
                    </Text>
                    <Text style={styles.macroText}>
                      C {item.carbs.toFixed(1)}g
                    </Text>
                    <Text style={styles.macroText}>
                      F {item.fat.toFixed(1)}g
                    </Text>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  main: {
    flex: 1,
    backgroundColor: Colors.dark.background,
    paddingHorizontal: 18,
    paddingTop: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  dateLabel: {
    color: TEXT_MUTED,
    fontSize: 13,
    marginBottom: 12,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  stateText: {
    color: TEXT_MUTED,
    fontSize: 13,
    marginTop: 6,
    textAlign: 'center',
  },
  errorText: {
    color: '#FF6B81',
    fontSize: 13,
    textAlign: 'center',
  },
  sectionLabel: {
    color: TEXT_MUTED,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 8,
  },
  itemTitle: {
    color: TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: '600',
  },
  itemSubtitle: {
    color: TEXT_MUTED,
    fontSize: 12,
    marginTop: 2,
  },
  macroSummary: {
    alignItems: 'flex-end',
    marginLeft: 12,
  },
  macroText: {
    color: TEXT_PRIMARY,
    fontSize: 11,
  },
});
