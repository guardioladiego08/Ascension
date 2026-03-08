import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import LogoHeader from '@/components/my components/logoHeader';
import { Colors } from '@/constants/Colors';
import { GlobalStyles } from '@/constants/GlobalStyles';
import {
  fetchFoodById,
  findFoodByBarcode,
  getDefaultServing,
  getNutritionPer100g,
  getPortionNutrition,
  type FoodRow,
} from '@/lib/nutrition/foodLookup';
import { supabase } from '@/lib/supabase';
import {
  getDeviceTimezone,
  syncAndFetchMyDailyGoalResult,
  toLocalISODate,
} from '@/lib/goals/client';

const BG = Colors.dark.background;
const CARD = Colors.dark.card;
const PRIMARY = Colors.dark.highlight1;
const TEXT_PRIMARY = Colors.dark.text;
const TEXT_MUTED = Colors.dark.textMuted;

type AddMode = 'snack' | 'meal';

function firstParam(value: string | string[] | undefined) {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export default function ScanFoodResult() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    foodId?: string | string[];
    barcode?: string | string[];
  }>();

  const foodId = firstParam(params.foodId);
  const barcode = firstParam(params.barcode);

  const [food, setFood] = useState<FoodRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [savingAs, setSavingAs] = useState<AddMode | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadFood = async () => {
      setLoading(true);
      setErrorText(null);

      try {
        let nextFood: FoodRow | null = null;
        if (foodId) {
          nextFood = await fetchFoodById(foodId);
        } else if (barcode) {
          nextFood = await findFoodByBarcode(barcode);
        }

        if (!nextFood) {
          if (isMounted) {
            setErrorText(
              'No matching food was found in your database. Try scanning again or search manually.'
            );
          }
          return;
        }

        if (isMounted) setFood(nextFood);
      } catch (error: any) {
        console.warn('Error loading scanned food details', error);
        if (isMounted) {
          setErrorText(error?.message ?? 'Could not load this food.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadFood();

    return () => {
      isMounted = false;
    };
  }, [barcode, foodId]);

  const nutrition100g = useMemo(() => (food ? getNutritionPer100g(food) : null), [food]);
  const defaultServing = useMemo(() => (food ? getDefaultServing(food) : null), [food]);
  const servingNutrition = useMemo(() => {
    if (!nutrition100g || !defaultServing) return null;
    return getPortionNutrition(nutrition100g, defaultServing.grams);
  }, [defaultServing, nutrition100g]);

  const handleAddToDiary = async (mode: AddMode) => {
    if (!food || !nutrition100g || !defaultServing || !servingNutrition) return;

    setSavingAs(mode);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error('No authenticated user found.');

      const dateStr = toLocalISODate();
      const timezoneStr = getDeviceTimezone();
      const grams = Number(defaultServing.grams.toFixed(2));

      const { data: diaryDay, error: dayError } = await supabase
        .schema('nutrition')
        .from('diary_days')
        .upsert(
          {
            user_id: user.id,
            date: dateStr,
            timezone_str: timezoneStr,
          },
          { onConflict: 'user_id,date' }
        )
        .select()
        .single();

      if (dayError || !diaryDay) throw dayError ?? new Error('Could not open diary day.');

      const mealType = mode === 'snack' ? 'snack' : 'other';

      const insertDiaryItem = async (insertMealType: string) => {
        const { error } = await supabase.schema('nutrition').from('diary_items').insert({
          user_id: user.id,
          diary_day_id: diaryDay.id,
          meal_type: insertMealType,
          food_id: food.id,
          recipe_id: null,
          quantity: defaultServing.quantity,
          unit_label: defaultServing.unitLabel,
          grams,
          kcal: servingNutrition.calories,
          protein: servingNutrition.protein,
          carbs: servingNutrition.carbs,
          fat: servingNutrition.fat,
          fiber: servingNutrition.fiber,
          sugar: servingNutrition.sugar,
          sodium: servingNutrition.sodium,
          note: null,
        });
        return error;
      };

      let diaryItemError = await insertDiaryItem(mealType);

      // Some existing schemas only support generic meal values.
      if (diaryItemError && mode === 'snack') {
        diaryItemError = await insertDiaryItem('other');
      }

      if (diaryItemError) throw diaryItemError;

      try {
        await syncAndFetchMyDailyGoalResult(dateStr);
      } catch (goalError) {
        console.warn('Error refreshing goals after scanned food add', goalError);
      }

      router.replace({
        pathname: '/progress/nutrition/dailyNutritionSummary',
        params: { date: dateStr },
      });
    } catch (error: any) {
      console.warn('Error adding scanned food to diary', error);
      Alert.alert('Error', error?.message ?? 'Could not add this food to your diary.');
    } finally {
      setSavingAs(null);
    }
  };

  return (
    <LinearGradient
      colors={['#3a3a3bff', '#1e1e1eff', BG]}
      start={{ x: 0.2, y: 0 }}
      end={{ x: 0.8, y: 1 }}
      style={{ flex: 1 }}
    >
      <View style={GlobalStyles.safeArea}>
        <LogoHeader showBackButton />
        <View style={styles.main}>
          <Text style={GlobalStyles.header}>Scanned Food</Text>

          {loading ? (
            <View style={styles.centeredState}>
              <ActivityIndicator color={PRIMARY} />
              <Text style={styles.stateText}>Loading food data...</Text>
            </View>
          ) : errorText ? (
            <View style={styles.centeredState}>
              <Ionicons name="alert-circle-outline" size={26} color="#FF6B81" />
              <Text style={styles.stateText}>{errorText}</Text>
              <TouchableOpacity
                style={styles.secondaryButton}
                activeOpacity={0.9}
                onPress={() => router.replace('./scanFood')}
              >
                <Text style={styles.secondaryButtonText}>Scan Again</Text>
              </TouchableOpacity>
            </View>
          ) : food && nutrition100g && defaultServing && servingNutrition ? (
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.card}>
                <Text style={styles.foodName}>{food.name || 'Unnamed food'}</Text>
                <Text style={styles.foodMeta}>
                  {[food.type, food.ean_13].filter(Boolean).join(' | ') || 'No metadata available'}
                </Text>
                {food.description ? (
                  <Text style={styles.foodDescription}>{food.description}</Text>
                ) : null}
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Nutrition (per 100g)</Text>
                <View style={styles.metricGrid}>
                  <MetricPill label="Calories" value={`${nutrition100g.calories} kcal`} />
                  <MetricPill label="Protein" value={`${nutrition100g.protein} g`} />
                  <MetricPill label="Carbs" value={`${nutrition100g.carbs} g`} />
                  <MetricPill label="Fat" value={`${nutrition100g.fat} g`} />
                </View>
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Default Add Portion</Text>
                <Text style={styles.foodMeta}>
                  {defaultServing.quantity} {defaultServing.unitLabel} (~{defaultServing.grams} g)
                </Text>
                <View style={styles.metricGrid}>
                  <MetricPill label="Calories" value={`${servingNutrition.calories} kcal`} />
                  <MetricPill label="Protein" value={`${servingNutrition.protein} g`} />
                  <MetricPill label="Carbs" value={`${servingNutrition.carbs} g`} />
                  <MetricPill label="Fat" value={`${servingNutrition.fat} g`} />
                </View>
              </View>

              {food.ingredients ? (
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Ingredients</Text>
                  <Text style={styles.foodDescription}>{food.ingredients}</Text>
                </View>
              ) : null}
            </ScrollView>
          ) : null}

          {!loading && !errorText && food ? (
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.primaryButton}
                activeOpacity={0.9}
                disabled={savingAs != null}
                onPress={() => handleAddToDiary('snack')}
              >
                {savingAs === 'snack' ? (
                  <ActivityIndicator color="#05101F" />
                ) : (
                  <>
                    <Ionicons name="cafe-outline" size={17} color="#05101F" />
                    <Text style={styles.primaryButtonText}>Add as Snack</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                activeOpacity={0.9}
                disabled={savingAs != null}
                onPress={() => handleAddToDiary('meal')}
              >
                {savingAs === 'meal' ? (
                  <ActivityIndicator color={TEXT_PRIMARY} />
                ) : (
                  <>
                    <Ionicons name="restaurant-outline" size={17} color={TEXT_PRIMARY} />
                    <Text style={styles.secondaryButtonText}>Add as Meal</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </View>
    </LinearGradient>
  );
}

type MetricPillProps = {
  label: string;
  value: string;
};

function MetricPill({ label, value }: MetricPillProps) {
  return (
    <View style={styles.metricPill}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  main: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 8,
  },
  centeredState: {
    marginTop: 20,
    padding: 20,
    borderRadius: 16,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: '#1F2A3A',
    alignItems: 'center',
    gap: 8,
  },
  stateText: {
    color: TEXT_PRIMARY,
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 18,
  },
  scroll: {
    flex: 1,
    marginTop: 10,
  },
  scrollContent: {
    paddingBottom: 18,
    gap: 10,
  },
  card: {
    backgroundColor: CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1F2A3A',
    padding: 14,
    gap: 8,
  },
  cardTitle: {
    color: TEXT_MUTED,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  foodName: {
    color: TEXT_PRIMARY,
    fontSize: 20,
    fontWeight: '900',
  },
  foodMeta: {
    color: TEXT_MUTED,
    fontSize: 12,
    fontWeight: '700',
  },
  foodDescription: {
    color: TEXT_PRIMARY,
    fontSize: 13,
    lineHeight: 19,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metricPill: {
    width: '48%',
    backgroundColor: Colors.dark.card2,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#26324A',
  },
  metricLabel: {
    color: TEXT_MUTED,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  metricValue: {
    color: TEXT_PRIMARY,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 4,
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: 12,
    marginBottom: 12,
    gap: 10,
  },
  primaryButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: PRIMARY,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  primaryButtonText: {
    color: '#05101F',
    fontSize: 13,
    fontWeight: '800',
  },
  secondaryButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: '#26324A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 14,
  },
  secondaryButtonText: {
    color: TEXT_PRIMARY,
    fontSize: 13,
    fontWeight: '700',
  },
});
