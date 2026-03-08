import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { supabase } from '@/lib/supabase';
import {
  getDeviceTimezone,
  syncAndFetchMyDailyGoalResult,
  toLocalISODate,
} from '@/lib/goals/client';
import { useAppTheme } from '@/providers/AppThemeProvider';

export type TabKey = 'My Meals' | 'My Foods' | 'All';

type MealsFoodsListProps = {
  activeTab: TabKey;
  searchQuery: string;
};

type RawRecipeRow = { [key: string]: any };

type ListItem = {
  id: string;
  name: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  defaultPortionGrams?: number;
  subtitle?: string;
  tag: 'Meal' | 'Food';
  ownerId: string | null;
};

const getRecipeDisplayFields = (row: RawRecipeRow) => {
  const name = (row.name ?? 'Untitled meal') as string;
  const kcal = row.kcal ?? null;
  const protein = row.protein ?? null;
  const carbs = row.carbs ?? null;
  const fat = row.fat ?? null;

  const parts: string[] = [];
  if (protein != null) parts.push(`${Number(protein)}g P`);
  if (carbs != null) parts.push(`${Number(carbs)}g C`);
  if (fat != null) parts.push(`${Number(fat)}g F`);

  return {
    name,
    kcal: kcal != null ? Number(kcal) : undefined,
    protein: protein != null ? Number(protein) : undefined,
    carbs: carbs != null ? Number(carbs) : undefined,
    fat: fat != null ? Number(fat) : undefined,
    subtitle: parts.join(' • ') || undefined,
  };
};

const MealsFoodsList: React.FC<MealsFoodsListProps> = ({
  activeTab,
  searchQuery,
}) => {
  const router = useRouter();
  const { colors, fonts, globalStyles } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);

  const [userId, setUserId] = useState<string | null>(null);
  const [meals, setMeals] = useState<ListItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchRecipes = async () => {
      try {
        setLoading(true);
        setErrorMsg(null);

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) throw userError;
        if (!user) throw new Error('No authenticated user found.');
        if (isMounted) setUserId(user.id);

        const { data, error } = await supabase
          .schema('nutrition')
          .from('recipes')
          .select('*');

        if (error) throw error;

        const items: ListItem[] =
          data?.map((row: RawRecipeRow) => {
            const { name, kcal, protein, carbs, fat, subtitle } =
              getRecipeDisplayFields(row);

            return {
              id: String(row.id ?? name),
              name,
              calories: kcal,
              protein,
              carbs,
              fat,
              defaultPortionGrams:
                row.default_portion_grams != null
                  ? Number(row.default_portion_grams)
                  : undefined,
              subtitle,
              tag: 'Meal' as const,
              ownerId: row.user_id ?? null,
            };
          }) ?? [];

        items.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
        if (isMounted) setMeals(items);
      } catch (err: any) {
        console.warn('Error loading meals list', err);
        if (isMounted) {
          setErrorMsg(err?.message ?? 'Something went wrong while loading meals.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchRecipes();

    return () => {
      isMounted = false;
    };
  }, []);

  const visibleItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const filterByQuery = (items: ListItem[]) => {
      if (!query) return items;
      return items.filter((item) => item.name.toLowerCase().includes(query));
    };

    if (!userId) {
      if (activeTab === 'My Foods') return [];
      return filterByQuery(meals);
    }

    switch (activeTab) {
      case 'My Meals':
        return filterByQuery(meals.filter((meal) => meal.ownerId === userId));
      case 'All':
        return filterByQuery(meals);
      case 'My Foods':
      default:
        return [];
    }
  }, [activeTab, meals, searchQuery, userId]);

  const handleAddMealToDiary = async (item: ListItem) => {
    try {
      setSavingId(item.id);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error('No authenticated user found.');

      const dateStr = toLocalISODate();
      const timezoneStr = getDeviceTimezone();

      const { data: existingDay, error: dayErr } = await supabase
        .schema('nutrition')
        .from('diary_days')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', dateStr)
        .maybeSingle();

      let diaryDay = existingDay;

      if (dayErr && dayErr.code !== 'PGRST116') throw dayErr;

      if (!diaryDay) {
        const { data: newDay, error: insertDayErr } = await supabase
          .schema('nutrition')
          .from('diary_days')
          .insert({
            user_id: user.id,
            date: dateStr,
            timezone_str: timezoneStr,
          })
          .select()
          .single();

        if (insertDayErr) throw insertDayErr;
        diaryDay = newDay;
      }

      if (!diaryDay) {
        throw new Error('Failed to create or fetch diary day.');
      }

      const protein = item.protein ?? 0;
      const carbs = item.carbs ?? 0;
      const fat = item.fat ?? 0;
      const kcal = item.calories ?? Math.round(protein * 4 + carbs * 4 + fat * 9);

      const { error: itemErr } = await supabase
        .schema('nutrition')
        .from('diary_items')
        .insert({
          user_id: user.id,
          diary_day_id: diaryDay.id,
          meal_type: 'dinner',
          food_id: null,
          recipe_id: item.id,
          quantity: 1,
          unit_label: 'serving',
          grams: item.defaultPortionGrams ?? 0,
          kcal,
          protein,
          carbs,
          fat,
          fiber: null,
          sugar: null,
          sodium: null,
          note: null,
        });

      if (itemErr) throw itemErr;

      try {
        await syncAndFetchMyDailyGoalResult(dateStr);
      } catch (goalErr) {
        console.warn('Error refreshing goal results after meal log', goalErr);
      }

      router.push({
        pathname: '../../../progress/nutrition/dailyNutritionSummary',
        params: { date: dateStr },
      });
    } catch (err: any) {
      console.warn('Error adding meal to diary', err);
      Alert.alert('Error', err?.message ?? 'Could not add meal to diary.');
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return (
      <View style={[globalStyles.panelSoft, styles.stateContainer]}>
        <ActivityIndicator size="small" color={colors.highlight1} />
        <Text style={styles.stateText}>Loading meals...</Text>
      </View>
    );
  }

  if (errorMsg) {
    return (
      <View style={[globalStyles.panelSoft, styles.stateContainer]}>
        <Text style={styles.errorText}>{errorMsg}</Text>
      </View>
    );
  }

  if (activeTab === 'My Foods') {
    return (
      <View style={[globalStyles.panelSoft, styles.stateContainer]}>
        <Ionicons name="fast-food-outline" size={22} color={colors.textMuted} />
        <Text style={styles.stateText}>
          My Foods is still pending. Once your personal foods table is wired up, it
          will appear here with the same theme.
        </Text>
      </View>
    );
  }

  if (visibleItems.length === 0) {
    return (
      <View style={[globalStyles.panelSoft, styles.stateContainer]}>
        <Text style={styles.stateText}>
          {searchQuery.trim()
            ? 'No meals match your search.'
            : 'No meals found. Create a meal to get started.'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {visibleItems.map((item) => {
        const isSaving = savingId === item.id;

        return (
          <View key={item.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.copyWrap}>
                <View style={styles.tag}>
                  <Text style={styles.tagText}>{item.tag}</Text>
                </View>
                <Text style={styles.title}>{item.name}</Text>
                {item.subtitle ? <Text style={styles.subtitle}>{item.subtitle}</Text> : null}
              </View>
              {typeof item.calories === 'number' ? (
                <View style={styles.kcalPill}>
                  <Text style={styles.kcalValue}>{item.calories} kcal</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.metaRow}>
              <MiniMetric label="Protein" value={`${Math.round(item.protein ?? 0)}g`} styles={styles} />
              <MiniMetric label="Carbs" value={`${Math.round(item.carbs ?? 0)}g`} styles={styles} />
              <MiniMetric label="Fat" value={`${Math.round(item.fat ?? 0)}g`} styles={styles} />
            </View>

            <TouchableOpacity
              activeOpacity={0.9}
              style={[globalStyles.buttonPrimary, styles.addButton]}
              onPress={() => handleAddMealToDiary(item)}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color={colors.blkText} />
              ) : (
                <>
                  <Ionicons name="add-circle" size={16} color={colors.blkText} />
                  <Text style={globalStyles.buttonTextPrimary}>Add to diary</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        );
      })}
    </View>
  );
};

function MiniMetric({
  label,
  value,
  styles,
}: {
  label: string;
  value: string;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.metricChip}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function createStyles(
  colors: ReturnType<typeof useAppTheme>['colors'],
  fonts: ReturnType<typeof useAppTheme>['fonts']
) {
  return StyleSheet.create({
    list: {
      gap: 12,
    },
    stateContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 24,
      gap: 8,
    },
    stateText: {
      color: colors.textMuted,
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
    card: {
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card2,
      padding: 15,
      gap: 14,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
    },
    copyWrap: {
      flex: 1,
      gap: 6,
    },
    tag: {
      alignSelf: 'flex-start',
      borderRadius: 999,
      backgroundColor: colors.accentSoft,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    tagText: {
      color: colors.highlight1,
      fontFamily: fonts.label,
      fontSize: 10,
      lineHeight: 12,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    },
    title: {
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 17,
      lineHeight: 22,
    },
    subtitle: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 18,
    },
    kcalPill: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card3,
      paddingHorizontal: 10,
      paddingVertical: 8,
    },
    kcalValue: {
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 12,
      lineHeight: 15,
    },
    metaRow: {
      flexDirection: 'row',
      gap: 8,
    },
    metricChip: {
      flex: 1,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card3,
      paddingHorizontal: 10,
      paddingVertical: 10,
    },
    metricLabel: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 11,
      lineHeight: 14,
    },
    metricValue: {
      marginTop: 4,
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 13,
      lineHeight: 16,
    },
    addButton: {
      gap: 8,
      flexDirection: 'row',
    },
  });
}

export default MealsFoodsList;
