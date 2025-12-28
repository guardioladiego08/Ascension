// app/(tabs)/nutrition/components/MealsFoodsList.tsx
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
import { Colors } from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';

const CARD = Colors.dark.card;
const PRIMARY = Colors.dark.highlight1;
const TEXT_PRIMARY = Colors.dark.text;
const TEXT_MUTED = Colors.dark.textMuted;

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

// Pull fields from nutrition.recipes
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

  const subtitle = parts.join(' • ');

  return {
    name,
    kcal: kcal != null ? Number(kcal) : undefined,
    protein: protein != null ? Number(protein) : undefined,
    carbs: carbs != null ? Number(carbs) : undefined,
    fat: fat != null ? Number(fat) : undefined,
    subtitle: subtitle || undefined,
  };
};

const MealsFoodsList: React.FC<MealsFoodsListProps> = ({
  activeTab,
  searchQuery,
}) => {
  const router = useRouter();
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

        // RLS on nutrition.recipes should already allow: own + public recipes
        const { data, error } = await supabase
          .schema('nutrition')
          .from('recipes')
          .select('*');

        if (error) throw error;

        const items: ListItem[] =
          data?.map((row: RawRecipeRow) => {
            const {
              name,
              kcal,
              protein,
              carbs,
              fat,
              subtitle,
            } = getRecipeDisplayFields(row);
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

        // Sort alphabetically by name
        items.sort((a, b) =>
          a.name.toLowerCase().localeCompare(b.name.toLowerCase())
        );

        if (isMounted) setMeals(items);
      } catch (err: any) {
        console.warn('Error loading meals list', err);
        if (isMounted) {
          setErrorMsg(
            err?.message ?? 'Something went wrong while loading meals.'
          );
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
      return items.filter(item =>
        item.name.toLowerCase().includes(query)
      );
    };

    if (!userId) {
      if (activeTab === 'My Foods') return [];
      return filterByQuery(meals);
    }

    switch (activeTab) {
      case 'My Meals': {
        const own = meals.filter(m => m.ownerId === userId);
        return filterByQuery(own);
      }
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

      // Use "today" for now – you can later pass a picked date
      const today = new Date();
      const dateStr = today.toISOString().slice(0, 10); // YYYY-MM-DD
      const timezoneStr =
        Intl.DateTimeFormat().resolvedOptions().timeZone ?? null;

      // 1) Ensure diary_day exists
      const { data: existingDay, error: dayErr } = await supabase
        .schema('nutrition')
        .from('diary_days')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', dateStr)
        .maybeSingle();

      let diaryDay = existingDay;

      if (dayErr && dayErr.code !== 'PGRST116') {
        // PGRST116 = row not found; anything else is real error
        throw dayErr;
      }

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

      // 2) Insert diary_item for this recipe
      const protein = item.protein ?? 0;
      const carbs = item.carbs ?? 0;
      const fat = item.fat ?? 0;
      const kcal =
        item.calories ?? Math.round(protein * 4 + carbs * 4 + fat * 9);

      const { error: itemErr } = await supabase
        .schema('nutrition')
        .from('diary_items')
        .insert({
          user_id: user.id,
          diary_day_id: diaryDay.id,
          // TODO: use real meal_type (e.g. 'breakfast' | 'lunch' | 'dinner' | 'snack')
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

      // At this point, your DB trigger on nutrition.diary_items
      // will update nutrition.diary_days totals + targets.

      // 3) Redirect to the daily summary page for that date
      router.push({
        pathname: '../../../progress/nutrition/dailyNutritionSummary',
        params: { date: dateStr },
      });
    } catch (err: any) {
      console.warn('Error adding meal to diary', err);
      Alert.alert(
        'Error',
        err?.message ?? 'Could not add meal to diary.'
      );
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.stateContainer}>
        <ActivityIndicator size="small" />
        <Text style={styles.stateText}>Loading meals…</Text>
      </View>
    );
  }

  if (errorMsg) {
    return (
      <View style={styles.stateContainer}>
        <Text style={styles.errorText}>{errorMsg}</Text>
      </View>
    );
  }

  if (activeTab === 'My Foods') {
    return (
      <View style={styles.stateContainer}>
        <Ionicons name="fast-food-outline" size={22} color={TEXT_MUTED} />
        <Text style={styles.stateText}>
          My Foods isn&apos;t wired up yet. Once your foods table is ready,
          we&apos;ll hook it in here.
        </Text>
      </View>
    );
  }

  if (!visibleItems.length) {
    return (
      <View style={styles.stateContainer}>
        <Ionicons name="restaurant-outline" size={22} color={TEXT_MUTED} />
        <Text style={styles.stateText}>
          No meals found. Create a meal to get started.
        </Text>
      </View>
    );
  }

  return (
    <View>
      {visibleItems.map(item => (
        <View key={item.id} style={styles.itemCard}>
          <View style={styles.itemTextWrap}>
            <View style={styles.itemTitleRow}>
              <Text style={styles.itemTitle}>{item.name}</Text>
              <View style={styles.itemTag}>
                <Text style={styles.itemTagText}>{item.tag}</Text>
              </View>
            </View>
            <View style={styles.itemMetaRow}>
              {typeof item.calories === 'number' && (
                <View style={styles.metaItem}>
                  <Ionicons name="flame" size={12} color={TEXT_PRIMARY} />
                  <Text style={styles.metaText}>{item.calories} kcal</Text>
                </View>
              )}
              {!!item.subtitle && (
                <Text style={styles.itemSubtitle}>{item.subtitle}</Text>
              )}
            </View>
          </View>

          <TouchableOpacity
            style={styles.plusBtn}
            activeOpacity={0.8}
            disabled={savingId === item.id}
            onPress={() => handleAddMealToDiary(item)}
          >
            {savingId === item.id ? (
              <ActivityIndicator size="small" />
            ) : (
              <Ionicons name="add" size={18} color="#05101F" />
            )}
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  stateContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  stateText: {
    color: TEXT_PRIMARY,
    fontSize: 13,
    marginTop: 6,
    textAlign: 'center',
  },
  errorText: {
    color: '#FF6B81',
    fontSize: 13,
    textAlign: 'center',
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
  },
  itemTextWrap: {
    flex: 1,
  },
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  itemTitle: {
    color: TEXT_PRIMARY,
    fontWeight: '600',
    fontSize: 14,
    flexShrink: 1,
  },
  itemTag: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 90,
    backgroundColor: Colors.dark.card2,
  },
  itemTagText: {
    color: TEXT_PRIMARY,
    fontSize: 10,
    fontWeight: '600',
  },
  itemMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  metaText: {
    color: TEXT_PRIMARY,
    fontSize: 11,
    marginLeft: 4,
  },
  itemSubtitle: {
    color: TEXT_PRIMARY,
    fontSize: 11,
  },
  plusBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
});

export default MealsFoodsList;
