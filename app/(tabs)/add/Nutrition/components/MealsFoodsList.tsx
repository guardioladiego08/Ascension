import React, { useCallback, useMemo, useState } from 'react';
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
import { useFocusEffect } from '@react-navigation/native';

import {
  copyDiaryEntryToDate,
  copyMealSlotFromDate,
  createDiaryEntry,
  getRecentMealSlotCopyOptions,
  getRecentMeals,
  getUserFavoriteMealIds,
  getUserMeals,
  setMealFavorite,
  type MealSlotCopyOption,
  type RecentMealRow,
  type UserMealWithIngredients,
} from '@/lib/nutrition/dataAccess';
import {
  getDefaultMealSlotForNow,
  mealSlotLabel,
  mealSlotToMealType,
} from '@/lib/nutrition/logging';
import {
  NUTRITION_ROUTES,
  nutritionDailySummaryHref,
} from '@/lib/nutrition/navigation';
import { syncAndFetchMyDailyGoalResult, toLocalISODate } from '@/lib/goals/client';
import { useAppTheme } from '@/providers/AppThemeProvider';
import { HOME_TONES } from '../../../home/tokens';

export type TabKey = 'My Meals' | 'My Foods' | 'All';

type MealsFoodsListProps = {
  activeTab: TabKey;
  searchQuery: string;
};

type ActionKey = 'log' | 'edit-log' | 'edit' | 'copy-entry' | 'copy-slot' | 'favorite';

function shiftDateByDays(dateOnly: string, offsetDays: number) {
  const parsed = new Date(`${dateOnly}T12:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return dateOnly;
  parsed.setUTCDate(parsed.getUTCDate() + offsetDays);
  return parsed.toISOString().slice(0, 10);
}

function formatShortDate(dateOnly: string) {
  const parsed = new Date(`${dateOnly}T12:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return dateOnly;
  return parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const MealsFoodsList: React.FC<MealsFoodsListProps> = ({
  activeTab,
  searchQuery,
}) => {
  const router = useRouter();
  const { colors, fonts } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);

  const [meals, setMeals] = useState<UserMealWithIngredients[]>([]);
  const [recentMeals, setRecentMeals] = useState<RecentMealRow[]>([]);
  const [slotCopyOptions, setSlotCopyOptions] = useState<MealSlotCopyOption[]>([]);
  const [favoriteMealIds, setFavoriteMealIds] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [actionState, setActionState] = useState<{ mealId: string; action: ActionKey } | null>(
    null
  );
  const [slotCopyActionKey, setSlotCopyActionKey] = useState<string | null>(null);

  const todayDate = useMemo(() => toLocalISODate(), []);
  const yesterdayDate = useMemo(() => shiftDateByDays(todayDate, -1), [todayDate]);
  const favoriteMealIdSet = useMemo(() => new Set(favoriteMealIds), [favoriteMealIds]);

  const fetchMeals = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg(null);

      const [rows, recentRows, favoriteIds, slotOptions] = await Promise.all([
        getUserMeals(),
        getRecentMeals(undefined, 8),
        getUserFavoriteMealIds(),
        getRecentMealSlotCopyOptions(undefined, todayDate, 10, 8),
      ]);

      setMeals(rows);
      setRecentMeals(recentRows);
      setFavoriteMealIds(favoriteIds);
      setSlotCopyOptions(slotOptions);
    } catch (err) {
      console.warn('Error loading meals list', err);
      setErrorMsg(
        err instanceof Error ? err.message : 'Something went wrong while loading meals.'
      );
    } finally {
      setLoading(false);
    }
  }, [todayDate]);

  useFocusEffect(
    useCallback(() => {
      fetchMeals();
    }, [fetchMeals])
  );

  const recentMealsById = useMemo(() => {
    return new Map(recentMeals.map((row) => [row.meal.id, row] as const));
  }, [recentMeals]);

  const visibleMeals = useMemo(() => {
    if (activeTab === 'My Foods') return [];

    const query = searchQuery.trim().toLowerCase();
    const filtered = query
      ? meals.filter((meal) => meal.name.toLowerCase().includes(query))
      : meals;

    return [...filtered].sort((a, b) => {
      const aFavorite = favoriteMealIdSet.has(a.id);
      const bFavorite = favoriteMealIdSet.has(b.id);
      if (aFavorite !== bFavorite) {
        return aFavorite ? -1 : 1;
      }

      const aRecentScore = recentMealsById.get(a.id)?.relevanceScore ?? 0;
      const bRecentScore = recentMealsById.get(b.id)?.relevanceScore ?? 0;
      if (aRecentScore !== bRecentScore) {
        return bRecentScore - aRecentScore;
      }

      return Date.parse(b.updated_at) - Date.parse(a.updated_at);
    });
  }, [activeTab, favoriteMealIdSet, meals, recentMealsById, searchQuery]);

  const visibleRecentMeals = useMemo(() => {
    if (activeTab === 'My Foods') return [];
    const query = searchQuery.trim().toLowerCase();
    return recentMeals
      .filter((row) =>
        query ? row.meal.name.toLowerCase().includes(query) : true
      );
  }, [activeTab, recentMeals, searchQuery]);

  const yesterdayRepeatOptions = useMemo(
    () =>
      slotCopyOptions.filter(
        (option) =>
          option.sourceDate === yesterdayDate &&
          (option.mealSlot === 'breakfast' ||
            option.mealSlot === 'lunch' ||
            option.mealSlot === 'dinner')
      ),
    [slotCopyOptions, yesterdayDate]
  );

  const extraSlotCopyOptions = useMemo(
    () => slotCopyOptions.filter((option) => option.sourceDate !== yesterdayDate).slice(0, 5),
    [slotCopyOptions, yesterdayDate]
  );

  const handleLogAsIs = async (meal: UserMealWithIngredients) => {
    const dateStr = toLocalISODate();
    const mealSlot = getDefaultMealSlotForNow();
    setActionState({ mealId: meal.id, action: 'log' });

    try {
      await createDiaryEntry({
        date: dateStr,
        mealId: meal.id,
        mealSlot,
        mealType: mealSlotToMealType(mealSlot),
        quantity: 1,
        unitLabel: 'meal',
      });

      try {
        await syncAndFetchMyDailyGoalResult(dateStr);
      } catch (goalErr) {
        console.warn('Error refreshing goals after meal log', goalErr);
      }

      router.push(nutritionDailySummaryHref(dateStr));
    } catch (error) {
      console.warn('Error adding meal to diary', error);
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Could not add meal to diary.'
      );
    } finally {
      setActionState(null);
    }
  };

  const handleEditMeal = (meal: UserMealWithIngredients, intent: 'edit' | 'edit-log') => {
    setActionState({ mealId: meal.id, action: intent === 'edit' ? 'edit' : 'edit-log' });
    router.push({
      pathname: NUTRITION_ROUTES.createMeal,
      params: {
        recipeId: meal.id,
        intent,
      },
    });
    setActionState(null);
  };

  const handleCopyRecentEntry = async (recent: RecentMealRow) => {
    const dateStr = toLocalISODate();
    setActionState({ mealId: recent.meal.id, action: 'copy-entry' });

    try {
      const copied = await copyDiaryEntryToDate(recent.lastUsage.entryId, dateStr);
      if (!copied) {
        throw new Error('Could not find the original meal entry to copy.');
      }

      try {
        await syncAndFetchMyDailyGoalResult(dateStr);
      } catch (goalErr) {
        console.warn('Error refreshing goals after meal copy', goalErr);
      }

      router.push(nutritionDailySummaryHref(dateStr));
    } catch (error) {
      console.warn('Error copying recent meal entry', error);
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Could not copy this meal entry.'
      );
    } finally {
      setActionState(null);
    }
  };

  const handleToggleFavoriteMeal = async (mealId: string) => {
    setActionState({ mealId, action: 'favorite' });
    try {
      const nextFavoriteState = !favoriteMealIdSet.has(mealId);
      await setMealFavorite(mealId, nextFavoriteState);
      const nextFavoriteIds = await getUserFavoriteMealIds();
      setFavoriteMealIds(nextFavoriteIds);
    } catch (error) {
      console.warn('Error updating favorite meal', error);
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Could not update meal favorites.'
      );
    } finally {
      setActionState(null);
    }
  };

  const handleCopyMealSlotOption = async (option: MealSlotCopyOption) => {
    const dateStr = toLocalISODate();
    const actionKey = `${option.sourceDate}::${option.mealSlot}`;
    setSlotCopyActionKey(actionKey);

    try {
      const rows = await copyMealSlotFromDate(
        option.sourceDate,
        dateStr,
        option.mealSlot
      );
      if (!rows.length) {
        Alert.alert('Nothing to copy', 'No entries were found for that meal slot.');
        return;
      }

      try {
        await syncAndFetchMyDailyGoalResult(dateStr);
      } catch (goalErr) {
        console.warn('Error refreshing goals after slot copy', goalErr);
      }

      router.push(nutritionDailySummaryHref(dateStr));
    } catch (error) {
      console.warn('Error copying meal slot', error);
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Could not copy that meal slot.'
      );
    } finally {
      setSlotCopyActionKey(null);
    }
  };

  if (loading) {
    return (
      <View style={[styles.panelSoft, styles.stateContainer]}>
        <ActivityIndicator size="small" color={colors.highlight1} />
        <Text style={styles.stateText}>Loading meals...</Text>
      </View>
    );
  }

  if (errorMsg) {
    return (
      <View style={[styles.panelSoft, styles.stateContainer]}>
        <Text style={styles.errorText}>{errorMsg}</Text>
      </View>
    );
  }

  if (activeTab === 'My Foods') {
    return (
      <View style={[styles.panelSoft, styles.stateContainer]}>
        <Ionicons name="fast-food-outline" size={22} color={colors.textMuted} />
        <Text style={styles.stateText}>
          My Foods is still pending. Use Quick Log Food to search public foods and log
          directly.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {yesterdayRepeatOptions.length > 0 || extraSlotCopyOptions.length > 0 ? (
        <View style={styles.panelSoft}>
          {yesterdayRepeatOptions.length > 0 ? (
            <View style={styles.quickSection}>
              <Text style={styles.quickTitle}>Repeat Yesterday</Text>
              <View style={styles.quickChipRow}>
                {yesterdayRepeatOptions.map((option) => {
                  const optionKey = `${option.sourceDate}::${option.mealSlot}`;
                  const isCopying = slotCopyActionKey === optionKey;
                  return (
                    <TouchableOpacity
                      key={optionKey}
                      activeOpacity={0.9}
                      style={styles.quickChip}
                      onPress={() => handleCopyMealSlotOption(option)}
                      disabled={isCopying}
                    >
                      {isCopying ? (
                        <ActivityIndicator size="small" color={HOME_TONES.textPrimary} />
                      ) : (
                        <Text style={styles.quickChipText}>
                          {mealSlotLabel(option.mealSlot)}
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ) : null}

          {extraSlotCopyOptions.length > 0 ? (
            <View style={styles.quickSection}>
              <Text style={styles.quickTitle}>Copy A Previous Slot</Text>
              <View style={styles.quickChipRow}>
                {extraSlotCopyOptions.map((option) => {
                  const optionKey = `${option.sourceDate}::${option.mealSlot}`;
                  const isCopying = slotCopyActionKey === optionKey;
                  return (
                    <TouchableOpacity
                      key={optionKey}
                      activeOpacity={0.9}
                      style={styles.quickChip}
                      onPress={() => handleCopyMealSlotOption(option)}
                      disabled={isCopying}
                    >
                      {isCopying ? (
                        <ActivityIndicator size="small" color={HOME_TONES.textPrimary} />
                      ) : (
                        <Text style={styles.quickChipText}>
                          {mealSlotLabel(option.mealSlot)} • {formatShortDate(option.sourceDate)}
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ) : null}
        </View>
      ) : null}

      {visibleRecentMeals.length > 0 ? (
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>Recent Meals</Text>
          <View style={styles.list}>
            {visibleRecentMeals.map((recent) => {
              const isCopying =
                actionState?.mealId === recent.meal.id && actionState.action === 'copy-entry';
              const isFavoriting =
                actionState?.mealId === recent.meal.id && actionState.action === 'favorite';

              return (
                <View key={recent.lastUsage.entryId} style={styles.cardCompact}>
                  <View style={styles.cardHeader}>
                    <View style={styles.copyWrap}>
                      <View style={styles.tag}>
                        <Text style={styles.tagText}>Recent</Text>
                      </View>
                      <Text style={styles.title}>{recent.meal.name}</Text>
                      <Text style={styles.subtitle}>
                        {mealSlotLabel(recent.lastUsage.mealSlot)} •{' '}
                        {Math.round(recent.meal.kcal)} kcal
                      </Text>
                    </View>

                    <TouchableOpacity
                      activeOpacity={0.9}
                      style={styles.favoriteButton}
                      onPress={() => handleToggleFavoriteMeal(recent.meal.id)}
                      disabled={isFavoriting}
                    >
                      {isFavoriting ? (
                        <ActivityIndicator size="small" color={colors.highlight1} />
                      ) : (
                        <Ionicons
                          name={
                            favoriteMealIdSet.has(recent.meal.id) ? 'star' : 'star-outline'
                          }
                          size={16}
                          color={
                            favoriteMealIdSet.has(recent.meal.id)
                              ? colors.highlight1
                              : HOME_TONES.textTertiary
                          }
                        />
                      )}
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    activeOpacity={0.9}
                    style={[styles.buttonSecondary, styles.secondaryAction]}
                    onPress={() => handleCopyRecentEntry(recent)}
                    disabled={isCopying}
                  >
                    {isCopying ? (
                      <ActivityIndicator color={HOME_TONES.textPrimary} />
                    ) : (
                      <>
                        <Ionicons
                          name="duplicate-outline"
                          size={15}
                          color={HOME_TONES.textPrimary}
                        />
                        <Text style={styles.buttonTextSecondary}>Copy Today</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        </View>
      ) : null}

      <View style={styles.sectionBlock}>
        <Text style={styles.sectionTitle}>Saved Meals</Text>
        {visibleMeals.length === 0 ? (
          <View style={[styles.panelSoft, styles.stateContainer]}>
            <Text style={styles.stateText}>
              {searchQuery.trim()
                ? 'No meals match your search.'
                : 'No saved meals yet. Build one with Create Meal.'}
            </Text>
          </View>
        ) : (
          visibleMeals.map((meal) => {
            const isLogging = actionState?.mealId === meal.id && actionState.action === 'log';
            const isEditLog =
              actionState?.mealId === meal.id && actionState.action === 'edit-log';
            const isEditing = actionState?.mealId === meal.id && actionState.action === 'edit';
            const isFavoriting =
              actionState?.mealId === meal.id && actionState.action === 'favorite';

            return (
              <View key={meal.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.copyWrap}>
                    <View style={styles.tag}>
                      <Text style={styles.tagText}>Meal</Text>
                    </View>
                    <Text style={styles.title}>{meal.name}</Text>
                    <Text style={styles.subtitle}>
                      {meal.ingredients.length} ingredient
                      {meal.ingredients.length === 1 ? '' : 's'} • {Math.round(meal.kcal)} kcal
                    </Text>
                  </View>

                  <View style={styles.trailingWrap}>
                    <TouchableOpacity
                      activeOpacity={0.9}
                      style={styles.favoriteButton}
                      onPress={() => handleToggleFavoriteMeal(meal.id)}
                      disabled={isFavoriting}
                    >
                      {isFavoriting ? (
                        <ActivityIndicator size="small" color={colors.highlight1} />
                      ) : (
                        <Ionicons
                          name={favoriteMealIdSet.has(meal.id) ? 'star' : 'star-outline'}
                          size={16}
                          color={
                            favoriteMealIdSet.has(meal.id)
                              ? colors.highlight1
                              : HOME_TONES.textTertiary
                          }
                        />
                      )}
                    </TouchableOpacity>
                    <View style={styles.kcalPill}>
                      <Text style={styles.kcalValue}>{Math.round(meal.kcal)} kcal</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.metaRow}>
                  <MiniMetric
                    label="Protein"
                    value={`${Math.round(meal.protein)}g`}
                    styles={styles}
                  />
                  <MiniMetric label="Carbs" value={`${Math.round(meal.carbs)}g`} styles={styles} />
                  <MiniMetric label="Fat" value={`${Math.round(meal.fat)}g`} styles={styles} />
                </View>

                <TouchableOpacity
                  activeOpacity={0.9}
                  style={[styles.buttonPrimary, styles.primaryAction]}
                  onPress={() => handleLogAsIs(meal)}
                  disabled={isLogging}
                >
                  {isLogging ? (
                    <ActivityIndicator color={colors.blkText} />
                  ) : (
                    <>
                      <Ionicons name="flash" size={16} color={colors.blkText} />
                      <Text style={styles.buttonTextPrimary}>Log As-Is</Text>
                    </>
                  )}
                </TouchableOpacity>

                <View style={styles.secondaryActions}>
                  <TouchableOpacity
                    activeOpacity={0.9}
                    style={[styles.buttonSecondary, styles.secondaryAction]}
                    onPress={() => handleEditMeal(meal, 'edit-log')}
                    disabled={isEditLog}
                  >
                    {isEditLog ? (
                      <ActivityIndicator color={HOME_TONES.textPrimary} />
                    ) : (
                      <>
                        <Ionicons
                          name="create-outline"
                          size={15}
                          color={HOME_TONES.textPrimary}
                        />
                        <Text style={styles.buttonTextSecondary}>Edit & Log</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.9}
                    style={[styles.buttonSecondary, styles.secondaryAction]}
                    onPress={() => handleEditMeal(meal, 'edit')}
                    disabled={isEditing}
                  >
                    {isEditing ? (
                      <ActivityIndicator color={HOME_TONES.textPrimary} />
                    ) : (
                      <>
                        <Ionicons name="pencil" size={15} color={HOME_TONES.textPrimary} />
                        <Text style={styles.buttonTextSecondary}>Edit Meal</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </View>
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
    panelSoft: {
      backgroundColor: HOME_TONES.surface2,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      padding: 18,
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
      gap: 6,
    },
    buttonSecondary: {
      height: 44,
      borderRadius: 14,
      paddingHorizontal: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: HOME_TONES.surface1,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      flexDirection: 'row',
      gap: 6,
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
    list: {
      gap: 12,
    },
    sectionBlock: {
      gap: 10,
    },
    sectionTitle: {
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.heading,
      fontSize: 16,
      lineHeight: 20,
    },
    quickSection: {
      gap: 8,
    },
    quickTitle: {
      color: HOME_TONES.textTertiary,
      fontFamily: fonts.label,
      fontSize: 10,
      lineHeight: 12,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    },
    quickChipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    quickChip: {
      minHeight: 36,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      backgroundColor: HOME_TONES.surface1,
      paddingHorizontal: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    quickChipText: {
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.heading,
      fontSize: 12,
      lineHeight: 16,
    },
    stateContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 24,
      gap: 8,
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
    card: {
      borderRadius: 22,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      backgroundColor: HOME_TONES.surface2,
      padding: 15,
      gap: 12,
    },
    cardCompact: {
      borderRadius: 18,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      backgroundColor: HOME_TONES.surface2,
      padding: 13,
      gap: 10,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
    },
    trailingWrap: {
      alignItems: 'flex-end',
      gap: 6,
    },
    copyWrap: {
      flex: 1,
      gap: 5,
    },
    favoriteButton: {
      width: 30,
      height: 30,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      backgroundColor: HOME_TONES.surface1,
      alignItems: 'center',
      justifyContent: 'center',
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
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.heading,
      fontSize: 17,
      lineHeight: 22,
    },
    subtitle: {
      color: HOME_TONES.textSecondary,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 16,
    },
    kcalPill: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      backgroundColor: HOME_TONES.surface1,
      paddingHorizontal: 10,
      paddingVertical: 8,
    },
    kcalValue: {
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.heading,
      fontSize: 12,
      lineHeight: 16,
    },
    metaRow: {
      flexDirection: 'row',
      gap: 8,
    },
    metricChip: {
      flex: 1,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      backgroundColor: HOME_TONES.surface1,
      paddingHorizontal: 10,
      paddingVertical: 8,
      gap: 3,
    },
    metricLabel: {
      color: HOME_TONES.textTertiary,
      fontFamily: fonts.label,
      fontSize: 10,
      lineHeight: 12,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    metricValue: {
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.heading,
      fontSize: 13,
      lineHeight: 16,
    },
    primaryAction: {
      width: '100%',
    },
    secondaryActions: {
      flexDirection: 'row',
      gap: 8,
    },
    secondaryAction: {
      flex: 1,
    },
  });
}

export default MealsFoodsList;
