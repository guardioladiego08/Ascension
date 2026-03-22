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
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import LogoHeader from '@/components/my components/logoHeader';
import {
  copyDiaryEntryToDate,
  createDiaryEntry,
  getFavoriteFoods,
  getCanonicalFoodById,
  getFoodByBarcode,
  getLastFoodDiaryUsage,
  getRecentFoods,
  getUserFavoriteFoodIds,
  setFoodFavorite,
  searchFoods,
  type CanonicalFoodRow,
  type MealSlot,
  type NutritionSnapshot,
  type RecentFoodRow,
} from '@/lib/nutrition/dataAccess';
import {
  FOOD_LOG_MEAL_SLOTS,
  getDefaultMealSlotForNow,
  mealSlotLabel,
  mealSlotToMealType,
} from '@/lib/nutrition/logging';
import {
  NUTRITION_ROUTES,
  nutritionDailySummaryHref,
} from '@/lib/nutrition/navigation';
import { firstRouteParam } from '@/lib/nutrition/routeParams';
import {
  type ServingEntryMode,
  formatServingQuantity,
  getServingModePresetFromReference,
  inferServingModeFromUnitLabel,
} from '@/lib/nutrition/serving';
import { syncAndFetchMyDailyGoalResult, toLocalISODate } from '@/lib/goals/client';
import FoodQuickLogRow from './components/FoodQuickLogRow';
import { useAppTheme } from '@/providers/AppThemeProvider';
import { HOME_TONES } from '../../home/tokens';

function toNumber(value: number | string | null | undefined, fallback = 0) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function toNullableNumber(value: string | number | null | undefined) {
  if (value == null) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function round(value: number, precision = 2) {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function formatQuantity(value: number) {
  return formatServingQuantity(value, 2);
}

function normalizeQuantityInput(value: string) {
  return value.replace(',', '.').replace(/[^\d.]/g, '');
}

function parsePositiveQuantity(value: string) {
  const parsed = Number(normalizeQuantityInput(value));
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

function buildFoodSnapshot(
  food: CanonicalFoodRow,
  quantity: number,
  gramsPerUnit: number
): NutritionSnapshot {
  const safeQuantity = quantity > 0 ? quantity : 1;
  const safeGramsPerUnit = gramsPerUnit > 0 ? gramsPerUnit : 100;
  const grams = round(safeQuantity * safeGramsPerUnit, 2);
  const factor = grams / 100;

  return {
    kcal: Math.round(toNumber(food.calories, 0) * factor),
    protein: round(toNumber(food.protein, 0) * factor),
    carbs: round(toNumber(food.carbs, 0) * factor),
    fat: round(toNumber(food.fat, 0) * factor),
    fiber:
      food.fiber == null ? null : round(toNumber(food.fiber, 0) * factor),
    sugar: null,
    sodium:
      food.sodium_mg == null ? null : round(toNumber(food.sodium_mg, 0) * factor),
    grams,
  };
}

export default function LogFood() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    foodId?: string | string[];
    barcode?: string | string[];
  }>();

  const { colors, fonts, globalStyles } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);

  const initialFoodId = firstRouteParam(params.foodId);
  const initialBarcode = firstRouteParam(params.barcode);
  const todayDate = useMemo(() => toLocalISODate(), []);

  const [mealSlot, setMealSlot] = useState<MealSlot>(getDefaultMealSlotForNow);
  const [selectedFood, setSelectedFood] = useState<CanonicalFoodRow | null>(null);
  const [selectionLoading, setSelectionLoading] = useState(false);
  const [selectionError, setSelectionError] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<CanonicalFoodRow[]>([]);

  const [recentFoods, setRecentFoods] = useState<RecentFoodRow[]>([]);
  const [recentLoading, setRecentLoading] = useState(false);
  const [recentError, setRecentError] = useState<string | null>(null);
  const [logAgainEntryId, setLogAgainEntryId] = useState<string | null>(null);
  const [favoriteFoods, setFavoriteFoods] = useState<CanonicalFoodRow[]>([]);
  const [favoriteFoodIds, setFavoriteFoodIds] = useState<string[]>([]);
  const [favoritesLoading, setFavoritesLoading] = useState(false);
  const [favoritesError, setFavoritesError] = useState<string | null>(null);
  const [favoriteActionFoodId, setFavoriteActionFoodId] = useState<string | null>(null);

  const [quantityInput, setQuantityInput] = useState('1');
  const [servingMode, setServingMode] = useState<ServingEntryMode>('food');
  const [unitLabel, setUnitLabel] = useState('serving');
  const [gramsPerUnitInput, setGramsPerUnitInput] = useState('100');
  const [confirming, setConfirming] = useState(false);

  const quantity = useMemo(() => parsePositiveQuantity(quantityInput), [quantityInput]);
  const gramsPerUnit = useMemo(
    () => toNullableNumber(gramsPerUnitInput) ?? 100,
    [gramsPerUnitInput]
  );

  const snapshotPreview = useMemo(() => {
    if (!selectedFood || quantity == null) return null;
    return buildFoodSnapshot(selectedFood, quantity, gramsPerUnit);
  }, [gramsPerUnit, quantity, selectedFood]);

  const favoriteFoodIdSet = useMemo(() => new Set(favoriteFoodIds), [favoriteFoodIds]);

  const loadRecentFoods = useCallback(async () => {
    setRecentLoading(true);
    setRecentError(null);

    try {
      const rows = await getRecentFoods(undefined, 8);
      setRecentFoods(rows);
    } catch (error) {
      console.warn('[LogFood] Failed to load recent foods', error);
      setRecentError(
        error instanceof Error ? error.message : 'Could not load recent foods.'
      );
    } finally {
      setRecentLoading(false);
    }
  }, []);

  const loadFavoriteFoods = useCallback(async () => {
    setFavoritesLoading(true);
    setFavoritesError(null);

    try {
      const [foods, ids] = await Promise.all([
        getFavoriteFoods(undefined, 8),
        getUserFavoriteFoodIds(),
      ]);
      setFavoriteFoods(foods);
      setFavoriteFoodIds(ids);
    } catch (error) {
      console.warn('[LogFood] Failed to load favorite foods', error);
      setFavoritesError(
        error instanceof Error ? error.message : 'Could not load favorite foods.'
      );
    } finally {
      setFavoritesLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void Promise.all([loadRecentFoods(), loadFavoriteFoods()]);
    }, [loadFavoriteFoods, loadRecentFoods])
  );

  useEffect(() => {
    let active = true;

    const loadFromParams = async () => {
      if (!initialFoodId && !initialBarcode) return;

      setSelectionLoading(true);
      setSelectionError(null);

      try {
        let food: CanonicalFoodRow | null = null;

        if (initialFoodId) {
          food = await getCanonicalFoodById(initialFoodId);
        }

        if (!food && initialBarcode) {
          food = await getFoodByBarcode(initialBarcode);
        }

        if (!food) {
          throw new Error('Food item was not found in the public catalog.');
        }

        if (!active) return;
        setSelectedFood(food);
        setQuery('');
        setSearchResults([]);
      } catch (error) {
        console.warn('[LogFood] Failed to load initial food', error);
        if (!active) return;
        setSelectionError(
          error instanceof Error ? error.message : 'Could not load this food item.'
        );
      } finally {
        if (active) setSelectionLoading(false);
      }
    };

    loadFromParams();

    return () => {
      active = false;
    };
  }, [initialBarcode, initialFoodId]);

  useEffect(() => {
    let active = true;
    const trimmed = query.trim();

    if (!trimmed) {
      setSearching(false);
      setSearchError(null);
      setSearchResults([]);
      return () => {
        active = false;
      };
    }

    const timeout = setTimeout(async () => {
      setSearching(true);
      setSearchError(null);

      try {
        const rows = await searchFoods(trimmed, 20);
        if (!active) return;
        setSearchResults(rows);
      } catch (error) {
        console.warn('[LogFood] Food search failed', error);
        if (!active) return;
        setSearchResults([]);
        setSearchError(
          error instanceof Error ? error.message : 'Could not search foods right now.'
        );
      } finally {
        if (active) setSearching(false);
      }
    }, 260);

    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [query]);

  useEffect(() => {
    let active = true;

    if (!selectedFood) return () => void 0;

    const preset = getServingModePresetFromReference(
      selectedFood.serving_reference,
      'food',
      'serving'
    );
    setServingMode('food');
    setQuantityInput(formatQuantity(preset.quantity));
    setUnitLabel(preset.unitLabel);
    setGramsPerUnitInput(formatQuantity(preset.gramsPerUnit));

    const hydrateFromLastUsage = async () => {
      try {
        const usage = await getLastFoodDiaryUsage(selectedFood.id);
        if (!active || !usage) return;

        const safeQuantity = usage.quantity > 0 ? usage.quantity : 1;
        const nextGramsPerUnit =
          usage.grams != null && usage.grams > 0
            ? usage.grams / safeQuantity
            : usage.snapshot.grams != null && usage.snapshot.grams > 0
              ? usage.snapshot.grams / safeQuantity
              : null;

        setServingMode(inferServingModeFromUnitLabel(usage.unitLabel));
        setQuantityInput(formatQuantity(safeQuantity));
        setUnitLabel(usage.unitLabel || preset.unitLabel);
        if (nextGramsPerUnit != null && Number.isFinite(nextGramsPerUnit)) {
          setGramsPerUnitInput(formatQuantity(nextGramsPerUnit));
        }
      } catch (error) {
        console.warn('[LogFood] Failed to load last usage preset', error);
      }
    };

    hydrateFromLastUsage();

    return () => {
      active = false;
    };
  }, [selectedFood]);

  const handleSelectFood = (food: CanonicalFoodRow) => {
    setSelectedFood(food);
    setSelectionError(null);
  };

  const applyServingMode = (mode: ServingEntryMode) => {
    if (!selectedFood) return;

    const preset = getServingModePresetFromReference(
      selectedFood.serving_reference,
      mode,
      'serving'
    );

    setServingMode(mode);
    setQuantityInput(formatQuantity(preset.quantity));
    setUnitLabel(preset.unitLabel);
    setGramsPerUnitInput(formatQuantity(preset.gramsPerUnit));
  };

  const adjustQuantity = (delta: number) => {
    const current = parsePositiveQuantity(quantityInput) ?? 1;
    const next = Math.max(0.25, round(current + delta, 2));
    setQuantityInput(formatQuantity(next));
  };

  const handleToggleFoodFavorite = async (food: CanonicalFoodRow) => {
    setFavoriteActionFoodId(food.id);

    try {
      const isCurrentlyFavorite = favoriteFoodIdSet.has(food.id);
      await setFoodFavorite(food.id, !isCurrentlyFavorite);
      await loadFavoriteFoods();
    } catch (error) {
      console.warn('[LogFood] Failed to update favorite food', error);
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Could not update favorites.'
      );
    } finally {
      setFavoriteActionFoodId(null);
    }
  };

  const confirmLog = async () => {
    if (!selectedFood || quantity == null || !snapshotPreview) {
      Alert.alert('Select food', 'Choose a food item and valid quantity first.');
      return;
    }

    setConfirming(true);

    try {
      await createDiaryEntry({
        date: todayDate,
        foodId: selectedFood.id,
        mealSlot,
        mealType: mealSlotToMealType(mealSlot),
        quantity,
        unitLabel: unitLabel.trim() || 'serving',
        grams: snapshotPreview.grams,
        snapshot: snapshotPreview,
      });

      try {
        await syncAndFetchMyDailyGoalResult(todayDate);
      } catch (goalError) {
        console.warn('[LogFood] Goal sync failed after food log', goalError);
      }

      router.replace(nutritionDailySummaryHref(todayDate));
    } catch (error) {
      console.warn('[LogFood] Failed to create diary entry', error);
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Could not log this food.'
      );
    } finally {
      setConfirming(false);
    }
  };

  const handleLogAgain = async (recent: RecentFoodRow) => {
    setLogAgainEntryId(recent.lastUsage.entryId);

    try {
      const copiedEntry = await copyDiaryEntryToDate(recent.lastUsage.entryId, todayDate);
      if (!copiedEntry) {
        throw new Error('Could not find the source entry to copy.');
      }

      try {
        await syncAndFetchMyDailyGoalResult(todayDate);
      } catch (goalError) {
        console.warn('[LogFood] Goal sync failed after log again', goalError);
      }

      router.replace(nutritionDailySummaryHref(todayDate));
    } catch (error) {
      console.warn('[LogFood] Failed to log again', error);
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Could not log this food again.'
      );
    } finally {
      setLogAgainEntryId(null);
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
            <Text style={styles.eyebrow}>Quick Food Log</Text>
            <Text style={styles.header}>Log an item fast</Text>
            <Text style={styles.heroText}>
              Search public foods, use recents, or scan a barcode and confirm in one
              flow.
            </Text>
          </View>

          <View style={styles.topActionRow}>
            <View style={styles.datePill}>
              <Text style={styles.dateLabel}>Date</Text>
              <Text style={styles.dateValue}>{todayDate}</Text>
            </View>

            <TouchableOpacity
              style={[styles.buttonSecondary, styles.scanButton]}
              activeOpacity={0.9}
              onPress={() => router.replace(NUTRITION_ROUTES.scanFood)}
            >
              <MaterialCommunityIcons
                name="barcode-scan"
                size={16}
                color={HOME_TONES.textPrimary}
              />
              <Text style={styles.buttonTextSecondary}>Scan Barcode</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.searchCard}>
            <Ionicons name="search" size={16} color={colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search public foods"
              placeholderTextColor={HOME_TONES.textTertiary}
              value={query}
              onChangeText={setQuery}
              returnKeyType="search"
              autoCapitalize="none"
            />
            {query ? (
              <TouchableOpacity
                onPress={() => setQuery('')}
                style={styles.clearButton}
                activeOpacity={0.8}
              >
                <Ionicons name="close-circle" size={16} color={HOME_TONES.textTertiary} />
              </TouchableOpacity>
            ) : null}
          </View>

          {searching ? (
            <View style={[styles.panelSoft, styles.inlineState]}>
              <ActivityIndicator size="small" color={colors.highlight1} />
              <Text style={styles.stateText}>Searching foods...</Text>
            </View>
          ) : null}

          {searchError ? <Text style={styles.errorText}>{searchError}</Text> : null}
          {selectionError ? <Text style={styles.errorText}>{selectionError}</Text> : null}

          {selectionLoading ? (
            <View style={[styles.panelSoft, styles.inlineState]}>
              <ActivityIndicator size="small" color={colors.highlight1} />
              <Text style={styles.stateText}>Loading selected food...</Text>
            </View>
          ) : null}

          {selectedFood ? (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Selected Food</Text>
                <Text style={styles.sectionHint}>Prefilled from your last usage when available</Text>
              </View>

              <FoodQuickLogRow
                selected
                name={selectedFood.name}
                brand={selectedFood.brand}
                calories={selectedFood.calories}
                protein={selectedFood.protein}
                carbs={selectedFood.carbs}
                fat={selectedFood.fat}
                subtitle={selectedFood.barcode ? `Barcode ${selectedFood.barcode}` : null}
                onPress={() => void 0}
                isFavorite={favoriteFoodIdSet.has(selectedFood.id)}
                favoriteLoading={favoriteActionFoodId === selectedFood.id}
                onToggleFavorite={() => handleToggleFoodFavorite(selectedFood)}
              />

              <View style={styles.adjustCard}>
                <View style={styles.adjustBlock}>
                  <Text style={styles.adjustLabel}>Serving Type</Text>
                  <View style={styles.modeChipRow}>
                    {([
                      ['food', 'Food Serving'],
                      ['g', 'Grams'],
                      ['oz', 'Ounces'],
                    ] as Array<[ServingEntryMode, string]>).map(([mode, label]) => {
                      const isActive = servingMode === mode;
                      return (
                        <TouchableOpacity
                          key={mode}
                          style={[
                            styles.modeChip,
                            isActive ? styles.modeChipActive : null,
                          ]}
                          activeOpacity={0.88}
                          onPress={() => applyServingMode(mode)}
                        >
                          <Text
                            style={[
                              styles.modeChipText,
                              isActive ? styles.modeChipTextActive : null,
                            ]}
                          >
                            {label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                <View style={styles.adjustRow}>
                  <Text style={styles.adjustLabel}>Quantity</Text>
                  <View style={styles.stepper}>
                    <TouchableOpacity
                      style={styles.stepperButton}
                      activeOpacity={0.9}
                      onPress={() => adjustQuantity(-0.5)}
                    >
                      <Ionicons name="remove" size={15} color={HOME_TONES.textPrimary} />
                    </TouchableOpacity>
                    <TextInput
                      style={styles.quantityInput}
                      keyboardType="decimal-pad"
                      value={quantityInput}
                      onChangeText={(value) => setQuantityInput(normalizeQuantityInput(value))}
                    />
                    <TouchableOpacity
                      style={styles.stepperButton}
                      activeOpacity={0.9}
                      onPress={() => adjustQuantity(0.5)}
                    >
                      <Ionicons name="add" size={15} color={HOME_TONES.textPrimary} />
                    </TouchableOpacity>
                  </View>
                </View>

                {servingMode === 'food' ? (
                  <>
                    <View style={styles.adjustRow}>
                      <Text style={styles.adjustLabel}>Food Unit</Text>
                      <TextInput
                        style={styles.unitInput}
                        value={unitLabel}
                        onChangeText={setUnitLabel}
                        placeholder="serving"
                        placeholderTextColor={HOME_TONES.textTertiary}
                      />
                    </View>

                    <View style={styles.adjustRow}>
                      <Text style={styles.adjustLabel}>Grams per food unit</Text>
                      <TextInput
                        style={styles.gramsInput}
                        keyboardType="decimal-pad"
                        value={gramsPerUnitInput}
                        onChangeText={(value) => setGramsPerUnitInput(normalizeQuantityInput(value))}
                      />
                    </View>
                  </>
                ) : (
                  <View style={styles.adjustMetaCard}>
                    <Text style={styles.adjustMetaLabel}>Universal Unit</Text>
                    <Text style={styles.adjustMetaValue}>{unitLabel}</Text>
                    <Text style={styles.adjustMetaHint}>
                      1 {unitLabel} = {formatQuantity(gramsPerUnit)} g
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Meal Slot</Text>
                <Text style={styles.sectionHint}>
                  Defaulted to {mealSlotLabel(getDefaultMealSlotForNow())}
                </Text>
              </View>

              <View style={styles.slotGrid}>
                {FOOD_LOG_MEAL_SLOTS.map((slot) => {
                  const isActive = mealSlot === slot.value;

                  return (
                    <TouchableOpacity
                      key={slot.value}
                      style={[
                        styles.slotChip,
                        isActive ? styles.slotChipActive : null,
                      ]}
                      activeOpacity={0.88}
                      onPress={() => setMealSlot(slot.value)}
                    >
                      <Text
                        style={[
                          styles.slotChipText,
                          isActive ? styles.slotChipTextActive : null,
                        ]}
                      >
                        {slot.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {snapshotPreview ? (
                <View style={styles.previewCard}>
                  <Text style={styles.previewTitle}>Nutrition Snapshot</Text>
                  <Text style={styles.previewText}>
                    {snapshotPreview.kcal} kcal • {snapshotPreview.protein}g P • {snapshotPreview.carbs}g C •{' '}
                    {snapshotPreview.fat}g F
                  </Text>
                </View>
              ) : (
                <Text style={styles.errorText}>Enter a valid quantity above zero.</Text>
              )}

              <TouchableOpacity
                style={[styles.buttonPrimary, styles.confirmButton]}
                activeOpacity={0.9}
                onPress={confirmLog}
                disabled={confirming || snapshotPreview == null}
              >
                {confirming ? (
                  <ActivityIndicator color={colors.blkText} />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={18} color={colors.blkText} />
                    <Text style={styles.buttonTextPrimary}>Log Food</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : null}

          {!query.trim() ? (
            <View style={styles.section}>
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Favorite Foods</Text>
                  <Text style={styles.sectionHint}>Pinned for repeat logs</Text>
                </View>

                {favoritesLoading ? (
                  <View style={[styles.panelSoft, styles.inlineState]}>
                    <ActivityIndicator size="small" color={colors.highlight1} />
                    <Text style={styles.stateText}>Loading favorites...</Text>
                  </View>
                ) : favoritesError ? (
                  <Text style={styles.errorText}>{favoritesError}</Text>
                ) : favoriteFoods.length === 0 ? (
                  <View style={[styles.panelSoft, styles.inlineState]}>
                    <Text style={styles.stateText}>
                      Star foods from search or recents to pin them here.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.list}>
                    {favoriteFoods.map((food) => (
                      <FoodQuickLogRow
                        key={food.id}
                        name={food.name}
                        brand={food.brand}
                        calories={food.calories}
                        protein={food.protein}
                        carbs={food.carbs}
                        fat={food.fat}
                        subtitle={food.barcode ? `Barcode ${food.barcode}` : null}
                        selected={selectedFood?.id === food.id}
                        onPress={() => handleSelectFood(food)}
                        isFavorite={favoriteFoodIdSet.has(food.id)}
                        favoriteLoading={favoriteActionFoodId === food.id}
                        onToggleFavorite={() => handleToggleFoodFavorite(food)}
                      />
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Recent Foods</Text>
                  <Text style={styles.sectionHint}>Copy prior entries into today</Text>
                </View>

                {recentLoading ? (
                  <View style={[styles.panelSoft, styles.inlineState]}>
                    <ActivityIndicator size="small" color={colors.highlight1} />
                    <Text style={styles.stateText}>Loading recent foods...</Text>
                  </View>
                ) : recentError ? (
                  <Text style={styles.errorText}>{recentError}</Text>
                ) : recentFoods.length === 0 ? (
                  <View style={[styles.panelSoft, styles.inlineState]}>
                    <Text style={styles.stateText}>No recent foods yet.</Text>
                  </View>
                ) : (
                  <View style={styles.list}>
                    {recentFoods.map((recent) => (
                      <FoodQuickLogRow
                        key={recent.lastUsage.entryId}
                        name={recent.food.name}
                        brand={recent.food.brand}
                        calories={recent.food.calories}
                        protein={recent.food.protein}
                        carbs={recent.food.carbs}
                        fat={recent.food.fat}
                        subtitle={`${mealSlotLabel(recent.lastUsage.mealSlot)} • ${formatQuantity(recent.lastUsage.quantity)} ${recent.lastUsage.unitLabel}`}
                        selected={selectedFood?.id === recent.food.id}
                        onPress={() => handleSelectFood(recent.food)}
                        actionLabel="Copy Today"
                        actionLoading={logAgainEntryId === recent.lastUsage.entryId}
                        onActionPress={() => handleLogAgain(recent)}
                        isFavorite={favoriteFoodIdSet.has(recent.food.id)}
                        favoriteLoading={favoriteActionFoodId === recent.food.id}
                        onToggleFavorite={() => handleToggleFoodFavorite(recent.food)}
                      />
                    ))}
                  </View>
                )}
              </View>
            </View>
          ) : (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Search Results</Text>
                <Text style={styles.sectionHint}>Tap a food to prefill and log</Text>
              </View>

              {searchResults.length === 0 && !searching ? (
                <View style={[styles.panelSoft, styles.inlineState]}>
                  <Text style={styles.stateText}>No foods found for this search.</Text>
                </View>
              ) : (
                <View style={styles.list}>
                  {searchResults.map((food) => (
                    <FoodQuickLogRow
                      key={food.id}
                      name={food.name}
                      brand={food.brand}
                      calories={food.calories}
                      protein={food.protein}
                      carbs={food.carbs}
                      fat={food.fat}
                      subtitle={food.barcode ? `Barcode ${food.barcode}` : null}
                      selected={selectedFood?.id === food.id}
                      onPress={() => handleSelectFood(food)}
                      isFavorite={favoriteFoodIdSet.has(food.id)}
                      favoriteLoading={favoriteActionFoodId === food.id}
                      onToggleFavorite={() => handleToggleFoodFavorite(food)}
                    />
                  ))}
                </View>
              )}
            </View>
          )}
        </ScrollView>
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
      paddingBottom: 30,
      gap: 14,
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
    topActionRow: {
      flexDirection: 'row',
      gap: 10,
      alignItems: 'center',
    },
    datePill: {
      flex: 1,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      backgroundColor: HOME_TONES.surface2,
      paddingHorizontal: 12,
      paddingVertical: 10,
      gap: 2,
    },
    dateLabel: {
      color: HOME_TONES.textTertiary,
      fontFamily: fonts.label,
      fontSize: 10,
      lineHeight: 12,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    dateValue: {
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.heading,
      fontSize: 14,
      lineHeight: 18,
    },
    scanButton: {
      flexDirection: 'row',
      gap: 6,
      minWidth: 148,
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
      gap: 8,
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
      fontSize: 13,
      lineHeight: 17,
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
    searchCard: {
      borderRadius: 18,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      backgroundColor: HOME_TONES.surface2,
      minHeight: 52,
      paddingHorizontal: 14,
      alignItems: 'center',
      flexDirection: 'row',
      gap: 10,
    },
    searchInput: {
      flex: 1,
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.body,
      fontSize: 15,
      lineHeight: 19,
    },
    clearButton: {
      padding: 2,
    },
    section: {
      gap: 10,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 10,
      alignItems: 'center',
    },
    sectionTitle: {
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.heading,
      fontSize: 16,
      lineHeight: 20,
    },
    sectionHint: {
      color: HOME_TONES.textTertiary,
      fontFamily: fonts.label,
      fontSize: 10,
      lineHeight: 12,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
      flexShrink: 1,
      textAlign: 'right',
    },
    adjustCard: {
      borderRadius: 18,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      backgroundColor: HOME_TONES.surface2,
      paddingHorizontal: 12,
      paddingVertical: 12,
      gap: 10,
    },
    adjustBlock: {
      gap: 8,
    },
    adjustRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    adjustLabel: {
      color: HOME_TONES.textSecondary,
      fontFamily: fonts.label,
      fontSize: 11,
      lineHeight: 14,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    },
    modeChipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    modeChip: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      backgroundColor: HOME_TONES.surface1,
      paddingHorizontal: 12,
      paddingVertical: 9,
    },
    modeChipActive: {
      borderColor: colors.highlight1,
      backgroundColor: HOME_TONES.surface2,
    },
    modeChipText: {
      color: HOME_TONES.textSecondary,
      fontFamily: fonts.heading,
      fontSize: 12,
      lineHeight: 16,
    },
    modeChipTextActive: {
      color: HOME_TONES.textPrimary,
    },
    stepper: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      backgroundColor: HOME_TONES.surface1,
      overflow: 'hidden',
    },
    stepperButton: {
      width: 34,
      height: 34,
      alignItems: 'center',
      justifyContent: 'center',
    },
    quantityInput: {
      minWidth: 72,
      height: 34,
      paddingHorizontal: 10,
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.heading,
      fontSize: 14,
      textAlign: 'center',
      borderLeftWidth: 1,
      borderRightWidth: 1,
      borderColor: HOME_TONES.borderSoft,
    },
    unitInput: {
      minWidth: 116,
      height: 36,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      backgroundColor: HOME_TONES.surface1,
      paddingHorizontal: 10,
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.body,
      fontSize: 14,
      textAlign: 'right',
    },
    adjustMetaCard: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      backgroundColor: HOME_TONES.surface1,
      paddingHorizontal: 12,
      paddingVertical: 10,
      gap: 2,
    },
    adjustMetaLabel: {
      color: HOME_TONES.textTertiary,
      fontFamily: fonts.label,
      fontSize: 10,
      lineHeight: 12,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    },
    adjustMetaValue: {
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.heading,
      fontSize: 14,
      lineHeight: 18,
    },
    adjustMetaHint: {
      color: HOME_TONES.textSecondary,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 16,
    },
    gramsInput: {
      minWidth: 88,
      height: 36,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      backgroundColor: HOME_TONES.surface1,
      paddingHorizontal: 10,
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.body,
      fontSize: 14,
      textAlign: 'right',
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
    previewCard: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      backgroundColor: HOME_TONES.surface2,
      paddingHorizontal: 12,
      paddingVertical: 10,
      gap: 4,
    },
    previewTitle: {
      color: HOME_TONES.textTertiary,
      fontFamily: fonts.label,
      fontSize: 10,
      lineHeight: 12,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    },
    previewText: {
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.heading,
      fontSize: 13,
      lineHeight: 17,
    },
    confirmButton: {
      width: '100%',
    },
    list: {
      gap: 10,
    },
  });
}
