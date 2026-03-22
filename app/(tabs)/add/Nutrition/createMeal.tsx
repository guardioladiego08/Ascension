import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

import LogoHeader from '@/components/my components/logoHeader';
import MealSummaryCard from './components/MealSummaryCard';
import IngredientsList from './components/IngredientsList';
import {
  createDiaryEntry,
  createUserMeal,
  getCanonicalFoodById,
  getCanonicalFoodsByIds,
  getUserMealById,
  searchFoods,
  updateUserMeal,
  type CanonicalFoodRow,
  type MealSlot,
} from '@/lib/nutrition/dataAccess';
import {
  FOOD_LOG_MEAL_SLOTS,
  getDefaultMealSlotForNow,
  mealSlotToMealType,
} from '@/lib/nutrition/logging';
import {
  computeIngredientNutrition,
  computeMealTotals,
  createDraftIngredientFromFood,
  createDraftIngredientFromSavedRow,
  formatDecimal,
  parsePositiveOrZero,
  sanitizeDecimalInput,
  type MealDraftIngredient,
} from '@/lib/nutrition/mealBuilder';
import { nutritionDailySummaryHref } from '@/lib/nutrition/navigation';
import { firstRouteParam } from '@/lib/nutrition/routeParams';
import { syncAndFetchMyDailyGoalResult, toLocalISODate } from '@/lib/goals/client';
import { useAppTheme } from '@/providers/AppThemeProvider';
import { HOME_TONES } from '../../home/tokens';

const TEMPLATE_NAMES = [
  'Protein Oatmeal',
  'Rice + Chicken Bowl',
  'Smoothie Recipe',
  'Pre-Run Snack',
  'Post-Workout Shake',
] as const;

type SaveMode = 'save' | 'save_log';

function round(value: number, precision = 2) {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

export default function CreateMeal() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    recipeId?: string | string[];
    intent?: string | string[];
    foodId?: string | string[];
    quantity?: string | string[];
    unit?: string | string[];
    gramsPerUnit?: string | string[];
  }>();

  const { colors, fonts, globalStyles } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);

  const recipeId = firstRouteParam(params.recipeId);
  const intent = firstRouteParam(params.intent);
  const initialFoodId = firstRouteParam(params.foodId);
  const initialQuantity = firstRouteParam(params.quantity);
  const initialUnit = firstRouteParam(params.unit);
  const initialGramsPerUnit = firstRouteParam(params.gramsPerUnit);
  const isEditing = Boolean(recipeId);

  const [mealName, setMealName] = useState('');
  const [mealDescription, setMealDescription] = useState('');
  const [mealSlot, setMealSlot] = useState<MealSlot>(getDefaultMealSlotForNow);
  const [ingredients, setIngredients] = useState<MealDraftIngredient[]>([]);

  const [loadingMeal, setLoadingMeal] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [savingMode, setSavingMode] = useState<SaveMode | null>(null);
  const [legacyFoodHydrated, setLegacyFoodHydrated] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CanonicalFoodRow[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const computedIngredients = useMemo(
    () => ingredients.map((item) => computeIngredientNutrition(item)),
    [ingredients]
  );
  const totals = useMemo(() => computeMealTotals(computedIngredients), [computedIngredients]);

  const invalidIngredientCount = useMemo(
    () =>
      computedIngredients.filter(
        (item) => item.quantity <= 0 || item.gramsPerUnit <= 0
      ).length,
    [computedIngredients]
  );

  useEffect(() => {
    let active = true;

    const loadSavedMeal = async () => {
      if (!recipeId) return;

      setLoadingMeal(true);
      setLoadError(null);

      try {
        const meal = await getUserMealById(recipeId);
        if (!meal) {
          throw new Error('Saved meal not found.');
        }

        const foods = await getCanonicalFoodsByIds(
          meal.ingredients.map((item) => item.food_id)
        );
        const foodsById = new Map(foods.map((food) => [food.id, food] as const));

        if (!active) return;

        setMealName(meal.name);
        setMealDescription(meal.description ?? '');
        setIngredients(
          meal.ingredients.map((row) =>
            createDraftIngredientFromSavedRow(row, foodsById.get(row.food_id) ?? null)
          )
        );
      } catch (error) {
        console.warn('[CreateMeal] Failed to load saved meal', error);
        if (!active) return;
        setLoadError(
          error instanceof Error ? error.message : 'Could not load this saved meal.'
        );
      } finally {
        if (active) setLoadingMeal(false);
      }
    };

    loadSavedMeal();

    return () => {
      active = false;
    };
  }, [recipeId]);

  useEffect(() => {
    let active = true;

    const hydrateLegacyFoodParam = async () => {
      if (legacyFoodHydrated || recipeId || !initialFoodId) return;

      try {
        const food = await getCanonicalFoodById(initialFoodId);
        if (!active || !food) return;

        const next = createDraftIngredientFromFood(food);
        if (initialQuantity) next.quantityInput = sanitizeDecimalInput(initialQuantity);
        if (initialUnit) next.unit = initialUnit;
        if (initialGramsPerUnit) {
          next.gramsPerUnitInput = sanitizeDecimalInput(initialGramsPerUnit);
        }

        setIngredients((prev) => [...prev, next]);
      } catch (error) {
        console.warn('[CreateMeal] Failed to hydrate initial ingredient', error);
      } finally {
        if (active) setLegacyFoodHydrated(true);
      }
    };

    hydrateLegacyFoodParam();

    return () => {
      active = false;
    };
  }, [
    initialFoodId,
    initialGramsPerUnit,
    initialQuantity,
    initialUnit,
    legacyFoodHydrated,
    recipeId,
  ]);

  useEffect(() => {
    let active = true;
    const trimmed = searchQuery.trim();

    if (!trimmed) {
      setSearchLoading(false);
      setSearchError(null);
      setSearchResults([]);
      return () => {
        active = false;
      };
    }

    const timeout = setTimeout(async () => {
      setSearchLoading(true);
      setSearchError(null);

      try {
        const rows = await searchFoods(trimmed, 20);
        if (!active) return;
        setSearchResults(rows);
      } catch (error) {
        console.warn('[CreateMeal] Food search failed', error);
        if (!active) return;
        setSearchResults([]);
        setSearchError(
          error instanceof Error ? error.message : 'Could not search foods right now.'
        );
      } finally {
        if (active) setSearchLoading(false);
      }
    }, 220);

    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [searchQuery]);

  const addFoodIngredient = useCallback((food: CanonicalFoodRow) => {
    setIngredients((prev) => [...prev, createDraftIngredientFromFood(food)]);
  }, []);

  const updateIngredient = useCallback(
    (ingredientId: string, updater: (item: MealDraftIngredient) => MealDraftIngredient) => {
      setIngredients((prev) =>
        prev.map((item) => (item.id === ingredientId ? updater(item) : item))
      );
    },
    []
  );

  const handleChangeQuantity = useCallback(
    (ingredientId: string, value: string) => {
      updateIngredient(ingredientId, (item) => ({
        ...item,
        quantityInput: sanitizeDecimalInput(value),
      }));
    },
    [updateIngredient]
  );

  const handleIncrementQuantity = useCallback(
    (ingredientId: string, delta: number) => {
      updateIngredient(ingredientId, (item) => {
        const current = parsePositiveOrZero(item.quantityInput, 1);
        const next = Math.max(0.25, round(current + delta, 2));
        return {
          ...item,
          quantityInput: formatDecimal(next),
        };
      });
    },
    [updateIngredient]
  );

  const handleChangeUnit = useCallback(
    (ingredientId: string, value: string) => {
      updateIngredient(ingredientId, (item) => ({
        ...item,
        unit: value,
      }));
    },
    [updateIngredient]
  );

  const handleChangeGramsPerUnit = useCallback(
    (ingredientId: string, value: string) => {
      updateIngredient(ingredientId, (item) => ({
        ...item,
        gramsPerUnitInput: sanitizeDecimalInput(value),
      }));
    },
    [updateIngredient]
  );

  const handleMoveUp = useCallback((ingredientId: string) => {
    setIngredients((prev) => {
      const index = prev.findIndex((item) => item.id === ingredientId);
      if (index <= 0) return prev;
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  }, []);

  const handleMoveDown = useCallback((ingredientId: string) => {
    setIngredients((prev) => {
      const index = prev.findIndex((item) => item.id === ingredientId);
      if (index < 0 || index >= prev.length - 1) return prev;
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  }, []);

  const handleRemoveIngredient = useCallback((ingredientId: string) => {
    setIngredients((prev) => prev.filter((item) => item.id !== ingredientId));
  }, []);

  const saveMeal = async (mode: SaveMode) => {
    const trimmedName = mealName.trim();
    if (!trimmedName) {
      Alert.alert('Name required', 'Please name this meal first.');
      return;
    }

    if (computedIngredients.length === 0) {
      Alert.alert('Add ingredients', 'Add at least one food item.');
      return;
    }

    if (invalidIngredientCount > 0) {
      Alert.alert(
        'Check quantities',
        'Every ingredient needs quantity and grams per unit greater than zero.'
      );
      return;
    }

    setSavingMode(mode);
    const dateStr = toLocalISODate();

    try {
      const mealPayload = {
        name: trimmedName,
        description: mealDescription.trim() || null,
        notes: null,
        kcal: Math.round(totals.kcal),
        protein: round(totals.protein),
        carbs: round(totals.carbs),
        fat: round(totals.fat),
        fiber: totals.fiber,
        sugar: null,
        sodium: totals.sodium,
        defaultPortionGrams: totals.grams > 0 ? round(totals.grams) : null,
        isPrivate: true,
        ingredients: computedIngredients.map((item, index) => ({
          foodId: item.foodId,
          quantity: item.quantity,
          unit: item.unit.trim() || 'serving',
          grams: item.totalGrams,
          kcal: item.kcal,
          protein: item.protein,
          carbs: item.carbs,
          fat: item.fat,
          fiber: item.fiber,
          sodium: item.sodium,
          note: null,
          position: index,
        })),
      };

      const meal = recipeId
        ? await updateUserMeal({
            mealId: recipeId,
            ...mealPayload,
          })
        : await createUserMeal(mealPayload);

      if (mode === 'save_log') {
        await createDiaryEntry({
          date: dateStr,
          mealId: meal.id,
          mealSlot,
          mealType: mealSlotToMealType(mealSlot),
          quantity: 1,
          unitLabel: 'meal',
          grams: totals.grams > 0 ? round(totals.grams) : null,
        });

        try {
          await syncAndFetchMyDailyGoalResult(dateStr);
        } catch (goalError) {
          console.warn('[CreateMeal] Goal sync failed after meal log', goalError);
        }

        router.replace(nutritionDailySummaryHref(dateStr));
        return;
      }

      Alert.alert(
        isEditing ? 'Meal updated' : 'Meal saved',
        isEditing
          ? 'Your saved meal has been updated.'
          : 'Your meal was saved to your private library.'
      );
      router.back();
    } catch (error) {
      console.warn('[CreateMeal] Failed to save meal', error);
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Could not save this meal.'
      );
    } finally {
      setSavingMode(null);
    }
  };

  return (
    <View style={styles.page}>
      <View style={globalStyles.safeArea}>
        <LogoHeader showBackButton />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <Text style={styles.eyebrow}>Meal Builder</Text>
            <Text style={styles.header}>{isEditing ? 'Edit meal' : 'Create meal'}</Text>
            <Text style={styles.heroText}>
              Build private reusable meals for hybrid training days. Add foods fast,
              reorder ingredients, and save or log in one action.
            </Text>
          </View>

          {loadingMeal ? (
            <View style={[styles.panelSoft, styles.inlineState]}>
              <ActivityIndicator size="small" color={colors.highlight1} />
              <Text style={styles.stateText}>Loading saved meal...</Text>
            </View>
          ) : null}

          {loadError ? <Text style={styles.errorText}>{loadError}</Text> : null}

          <View style={styles.templatesCard}>
            <Text style={styles.templatesLabel}>Quick Start Templates</Text>
            <View style={styles.templateRow}>
              {TEMPLATE_NAMES.map((template) => (
                <TouchableOpacity
                  key={template}
                  style={styles.templateChip}
                  activeOpacity={0.9}
                  onPress={() => setMealName(template)}
                >
                  <Text style={styles.templateText}>{template}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.fieldLabel}>Meal Name</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Protein Oatmeal"
              placeholderTextColor={HOME_TONES.textTertiary}
              value={mealName}
              onChangeText={setMealName}
            />

            <Text style={[styles.fieldLabel, styles.secondaryLabel]}>Description</Text>
            <TextInput
              style={[styles.textInput, styles.descriptionInput]}
              placeholder="Optional notes or prep details"
              placeholderTextColor={HOME_TONES.textTertiary}
              value={mealDescription}
              onChangeText={setMealDescription}
              multiline
            />
          </View>

          <MealSummaryCard
            totalKcal={totals.kcal}
            totalProtein={totals.protein}
            totalCarbs={totals.carbs}
            totalFat={totals.fat}
          />

          <View style={styles.slotSection}>
            <View>
              <Text style={styles.eyebrow}>Save & Log Slot</Text>
              <Text style={styles.sectionTitle}>Where to log this meal</Text>
            </View>
            <View style={styles.slotGrid}>
              {FOOD_LOG_MEAL_SLOTS.map((option) => {
                const isActive = mealSlot === option.value;

                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.slotChip, isActive ? styles.slotChipActive : null]}
                    activeOpacity={0.9}
                    onPress={() => setMealSlot(option.value)}
                  >
                    <Text
                      style={[
                        styles.slotChipText,
                        isActive ? styles.slotChipTextActive : null,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.eyebrow}>Ingredients</Text>
              <Text style={styles.sectionTitle}>
                Meal composition ({computedIngredients.length})
              </Text>
            </View>
          </View>

          <IngredientsList
            ingredients={computedIngredients}
            onChangeQuantity={handleChangeQuantity}
            onIncrementQuantity={handleIncrementQuantity}
            onChangeUnit={handleChangeUnit}
            onChangeGramsPerUnit={handleChangeGramsPerUnit}
            onMoveUp={handleMoveUp}
            onMoveDown={handleMoveDown}
            onRemove={handleRemoveIngredient}
          />

          <View style={styles.searchCard}>
            <View style={styles.searchRow}>
              <Ionicons name="search" size={16} color={colors.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Multi-add foods (public catalog)"
                placeholderTextColor={HOME_TONES.textTertiary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
              />
            </View>

            {searchLoading ? (
              <View style={styles.searchState}>
                <ActivityIndicator size="small" color={colors.highlight1} />
                <Text style={styles.stateText}>Searching foods...</Text>
              </View>
            ) : null}

            {searchError ? <Text style={styles.errorText}>{searchError}</Text> : null}

            {searchQuery.trim().length > 0 && searchResults.length === 0 && !searchLoading ? (
              <Text style={styles.searchEmpty}>No foods found.</Text>
            ) : null}

            {searchResults.length > 0 ? (
              <View style={styles.searchResults}>
                {searchResults.slice(0, 10).map((food) => (
                  <View key={food.id} style={styles.resultRow}>
                    <View style={styles.resultCopy}>
                      <Text style={styles.resultTitle}>{food.name}</Text>
                      <Text style={styles.resultSubtitle}>
                        {food.brand ? `${food.brand} • ` : ''}
                        {Math.round(food.calories ?? 0)} kcal / 100g
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.addResultButton}
                      activeOpacity={0.9}
                      onPress={() => addFoodIngredient(food)}
                    >
                      <Ionicons name="add" size={16} color={colors.blkText} />
                      <Text style={styles.addResultText}>Add</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : null}
          </View>

          {invalidIngredientCount > 0 ? (
            <Text style={styles.errorText}>
              {invalidIngredientCount} ingredient
              {invalidIngredientCount === 1 ? '' : 's'} need valid quantity and grams
              per unit.
            </Text>
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.buttonSecondary, styles.footerButton]}
            activeOpacity={0.9}
            onPress={() => saveMeal('save')}
            disabled={savingMode !== null || loadingMeal}
          >
            {savingMode === 'save' ? (
              <ActivityIndicator color={HOME_TONES.textPrimary} />
            ) : (
              <Text style={styles.buttonTextSecondary}>
                {isEditing ? 'Update Meal' : 'Save Meal'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.buttonPrimary, styles.footerButton]}
            activeOpacity={0.9}
            onPress={() => saveMeal('save_log')}
            disabled={savingMode !== null || loadingMeal}
          >
            {savingMode === 'save_log' ? (
              <ActivityIndicator color={colors.blkText} />
            ) : (
              <Text style={styles.buttonTextPrimary}>
                {intent === 'edit-log' ? 'Update & Log' : isEditing ? 'Update & Log' : 'Save & Log'}
              </Text>
            )}
          </TouchableOpacity>
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
    page: {
      flex: 1,
      backgroundColor: HOME_TONES.background,
    },
    scroll: {
      flex: 1,
    },
    content: {
      paddingTop: 8,
      paddingBottom: 124,
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
    heroText: {
      color: HOME_TONES.textSecondary,
      fontFamily: fonts.body,
      fontSize: 14,
      lineHeight: 20,
    },
    panelSoft: {
      borderRadius: 18,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      backgroundColor: HOME_TONES.surface2,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    inlineState: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    stateText: {
      color: HOME_TONES.textSecondary,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 17,
    },
    errorText: {
      color: colors.danger,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 17,
    },
    templatesCard: {
      borderRadius: 22,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      backgroundColor: HOME_TONES.surface2,
      padding: 14,
      gap: 10,
    },
    templatesLabel: {
      color: HOME_TONES.textTertiary,
      fontFamily: fonts.label,
      fontSize: 10,
      lineHeight: 12,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    templateRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    templateChip: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      backgroundColor: HOME_TONES.surface3,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    templateText: {
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.heading,
      fontSize: 12,
      lineHeight: 16,
    },
    formCard: {
      borderRadius: 24,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      backgroundColor: HOME_TONES.surface2,
      padding: 16,
    },
    fieldLabel: {
      color: HOME_TONES.textTertiary,
      fontFamily: fonts.label,
      fontSize: 11,
      lineHeight: 13,
      letterSpacing: 0.45,
      textTransform: 'uppercase',
    },
    secondaryLabel: {
      marginTop: 14,
    },
    textInput: {
      marginTop: 8,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      backgroundColor: HOME_TONES.surface3,
      color: HOME_TONES.textPrimary,
      paddingHorizontal: 14,
      paddingVertical: 13,
      fontFamily: fonts.body,
      fontSize: 15,
    },
    descriptionInput: {
      minHeight: 96,
      textAlignVertical: 'top',
    },
    slotSection: {
      gap: 10,
    },
    slotGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    slotChip: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      backgroundColor: HOME_TONES.surface2,
      paddingHorizontal: 12,
      paddingVertical: 9,
    },
    slotChipActive: {
      borderColor: colors.highlight1,
      backgroundColor: HOME_TONES.surface1,
    },
    slotChipText: {
      color: HOME_TONES.textSecondary,
      fontFamily: fonts.heading,
      fontSize: 12,
      lineHeight: 16,
    },
    slotChipTextActive: {
      color: HOME_TONES.textPrimary,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    sectionTitle: {
      marginTop: 8,
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.heading,
      fontSize: 20,
      lineHeight: 24,
      letterSpacing: -0.4,
    },
    searchCard: {
      borderRadius: 22,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      backgroundColor: HOME_TONES.surface2,
      padding: 14,
      gap: 12,
    },
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 14,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      backgroundColor: HOME_TONES.surface3,
      paddingHorizontal: 12,
      minHeight: 48,
      gap: 8,
    },
    searchInput: {
      flex: 1,
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.body,
      fontSize: 14,
    },
    searchState: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    searchEmpty: {
      color: HOME_TONES.textSecondary,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 17,
    },
    searchResults: {
      gap: 8,
    },
    resultRow: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      backgroundColor: HOME_TONES.surface3,
      paddingHorizontal: 12,
      paddingVertical: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    resultCopy: {
      flex: 1,
      gap: 2,
    },
    resultTitle: {
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.heading,
      fontSize: 14,
      lineHeight: 18,
    },
    resultSubtitle: {
      color: HOME_TONES.textSecondary,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 16,
    },
    addResultButton: {
      height: 34,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.highlight1,
      backgroundColor: colors.highlight1,
      paddingHorizontal: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    addResultText: {
      color: colors.blkText,
      fontFamily: fonts.heading,
      fontSize: 12,
      lineHeight: 16,
    },
    footer: {
      position: 'absolute',
      left: 18,
      right: 18,
      bottom: 18,
      flexDirection: 'row',
      gap: 10,
    },
    footerButton: {
      flex: 1,
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
  });
}
