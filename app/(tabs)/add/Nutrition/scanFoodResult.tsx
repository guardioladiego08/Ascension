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
import { Ionicons } from '@expo/vector-icons';

import LogoHeader from '@/components/my components/logoHeader';
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
import { useAppTheme } from '@/providers/AppThemeProvider';
import { HOME_TONES } from '../../home/tokens';

type AddMode = 'snack' | 'meal';

function firstParam(value: string | string[] | undefined) {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export default function ScanFoodResult() {
  const router = useRouter();
  const { colors, fonts, globalStyles } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);

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
              'No matching food was found. Try scanning again or use manual search.'
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
    <View style={styles.page}>
      <View style={globalStyles.safeArea}>
        <LogoHeader showBackButton />

        <View style={styles.main}>
          <View style={styles.hero}>
            <Text style={styles.eyebrow}>Scan Result</Text>
            <Text style={styles.header}>Review food</Text>
            <Text style={styles.heroText}>
              Confirm the serving and macros before adding this product into your
              nutrition diary.
            </Text>
          </View>

          {loading ? (
            <View style={[styles.panelSoft, styles.centeredState]}>
              <ActivityIndicator color={colors.highlight1} />
              <Text style={styles.stateText}>Loading food data...</Text>
            </View>
          ) : errorText ? (
            <View style={[styles.panelSoft, styles.centeredState]}>
              <Ionicons name="alert-circle-outline" size={26} color={colors.danger} />
              <Text style={styles.stateText}>{errorText}</Text>
              <TouchableOpacity
                style={[styles.buttonSecondary, styles.retryButton]}
                activeOpacity={0.9}
                onPress={() => router.replace('./scanFood')}
              >
                <Text style={styles.buttonTextSecondary}>Scan Again</Text>
              </TouchableOpacity>
            </View>
          ) : food && nutrition100g && defaultServing && servingNutrition ? (
            <>
              <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.infoCard}>
                  <View style={styles.cardHeader}>
                    <View style={styles.cardHeaderCopy}>
                      <Text style={styles.foodName}>{food.name || 'Unnamed food'}</Text>
                      <Text style={styles.foodMeta}>
                        {[food.type, food.ean_13].filter(Boolean).join(' • ') ||
                          'No metadata available'}
                      </Text>
                    </View>
                    <View style={styles.tag}>
                      <Text style={styles.tagText}>Scanned</Text>
                    </View>
                  </View>
                  {food.description ? (
                    <Text style={styles.foodDescription}>{food.description}</Text>
                  ) : null}
                </View>

                <View style={styles.metricSection}>
                  <SectionTitle title="Nutrition per 100g" subtitle="Reference values from the food database." />
                  <View style={styles.metricGrid}>
                    <MetricPill label="Calories" value={`${nutrition100g.calories} kcal`} styles={styles} />
                    <MetricPill label="Protein" value={`${nutrition100g.protein} g`} styles={styles} />
                    <MetricPill label="Carbs" value={`${nutrition100g.carbs} g`} styles={styles} />
                    <MetricPill label="Fat" value={`${nutrition100g.fat} g`} styles={styles} />
                  </View>
                </View>

                <View style={styles.metricSection}>
                  <SectionTitle
                    title="Default serving"
                    subtitle={`${defaultServing.quantity} ${defaultServing.unitLabel} (~${defaultServing.grams} g)`}
                  />
                  <View style={styles.metricGrid}>
                    <MetricPill label="Calories" value={`${servingNutrition.calories} kcal`} styles={styles} />
                    <MetricPill label="Protein" value={`${servingNutrition.protein} g`} styles={styles} />
                    <MetricPill label="Carbs" value={`${servingNutrition.carbs} g`} styles={styles} />
                    <MetricPill label="Fat" value={`${servingNutrition.fat} g`} styles={styles} />
                  </View>
                </View>

                {food.ingredients ? (
                  <View style={styles.infoCard}>
                    <SectionTitle title="Ingredients" subtitle="Parsed from the product entry." />
                    <Text style={styles.foodDescription}>{food.ingredients}</Text>
                  </View>
                ) : null}
              </ScrollView>

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.buttonPrimary, styles.actionButton]}
                  activeOpacity={0.9}
                  disabled={savingAs != null}
                  onPress={() => handleAddToDiary('snack')}
                >
                  {savingAs === 'snack' ? (
                    <ActivityIndicator color={colors.blkText} />
                  ) : (
                    <>
                      <Ionicons name="cafe-outline" size={17} color={colors.blkText} />
                      <Text style={styles.buttonTextPrimary}>Add as Snack</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.buttonSecondary, styles.actionButton]}
                  activeOpacity={0.9}
                  disabled={savingAs != null}
                  onPress={() => handleAddToDiary('meal')}
                >
                  {savingAs === 'meal' ? (
                    <ActivityIndicator color={colors.text} />
                  ) : (
                    <>
                      <Ionicons
                        name="restaurant-outline"
                        size={17}
                        color={colors.text}
                      />
                      <Text style={styles.buttonTextSecondary}>Add as Meal</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </>
          ) : null}
        </View>
      </View>
    </View>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  const { fonts } = useAppTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        title: {
          color: HOME_TONES.textPrimary,
          fontFamily: fonts.heading,
          fontSize: 17,
          lineHeight: 21,
        },
        subtitle: {
          marginTop: 4,
          color: HOME_TONES.textSecondary,
          fontFamily: fonts.body,
          fontSize: 13,
          lineHeight: 18,
        },
      }),
    [fonts]
  );

  return (
    <View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

function MetricPill({
  label,
  value,
  styles,
}: {
  label: string;
  value: string;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.metricPill}>
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
    buttonPrimary: {
      height: 48,
      borderRadius: 16,
      paddingHorizontal: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.highlight1,
      borderWidth: 1,
      borderColor: colors.highlight1,
      flexDirection: 'row',
    },
    buttonSecondary: {
      height: 48,
      borderRadius: 16,
      paddingHorizontal: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: HOME_TONES.surface2,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      flexDirection: 'row',
    },
    buttonTextPrimary: {
      color: colors.blkText,
      fontFamily: fonts.heading,
      fontSize: 14,
      lineHeight: 18,
    },
    buttonTextSecondary: {
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.heading,
      fontSize: 14,
      lineHeight: 18,
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
    centeredState: {
      alignItems: 'center',
      gap: 10,
      paddingVertical: 28,
    },
    stateText: {
      color: HOME_TONES.textSecondary,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 18,
      textAlign: 'center',
    },
    retryButton: {
      minWidth: 140,
      marginTop: 4,
    },
    scroll: {
      flex: 1,
    },
    content: {
      paddingBottom: 18,
      gap: 12,
    },
    infoCard: {
      borderRadius: 24,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      backgroundColor: HOME_TONES.surface2,
      padding: 16,
      gap: 10,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
    },
    cardHeaderCopy: {
      flex: 1,
    },
    tag: {
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
      letterSpacing: 0.35,
      textTransform: 'uppercase',
    },
    foodName: {
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.display,
      fontSize: 24,
      lineHeight: 28,
      letterSpacing: -0.6,
    },
    foodMeta: {
      marginTop: 6,
      color: HOME_TONES.textSecondary,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 17,
    },
    foodDescription: {
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 19,
    },
    metricSection: {
      borderRadius: 24,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      backgroundColor: HOME_TONES.surface2,
      padding: 16,
      gap: 14,
    },
    metricGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    metricPill: {
      width: '48%',
      borderRadius: 18,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      backgroundColor: HOME_TONES.surface3,
      paddingVertical: 10,
      paddingHorizontal: 12,
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
      marginTop: 6,
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.heading,
      fontSize: 14,
      lineHeight: 18,
    },
    actionRow: {
      flexDirection: 'row',
      gap: 10,
      paddingBottom: 12,
    },
    actionButton: {
      flex: 1,
      gap: 8,
    },
  });
}
