import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

import LogoHeader from '@/components/my components/logoHeader';
import MealSummaryCard from './components/MealSummaryCard';
import IngredientsList from './components/IngredientsList';
import AppPopup from '@/components/ui/AppPopup';
import { supabase } from '@/lib/supabase';
import {
  getDeviceTimezone,
  syncAndFetchMyDailyGoalResult,
  toLocalISODate,
} from '@/lib/goals/client';
import { useAppTheme } from '@/providers/AppThemeProvider';

type Ingredient = {
  food_id: string;
  description: string;
  baseKcal: number;
  baseProtein: number;
  baseCarbs: number;
  baseFat: number;
  serving_size: number | null;
  serving_unit: string | null;
  quantity: number;
};

export default function CreateMeal() {
  const router = useRouter();
  const { colors, fonts, globalStyles } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);

  const params = useLocalSearchParams<{
    foodId?: string;
    description?: string;
    kcal?: string;
    protein?: string;
    carbs?: string;
    fat?: string;
    serving_size?: string;
    serving_unit?: string;
    quantity?: string;
  }>();

  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [recipeName, setRecipeName] = useState('');
  const [recipeDescription, setRecipeDescription] = useState('');
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        console.error('Error getting user in CreateMeal', error);
        return;
      }
      if (data.user) setUserId(data.user.id);
    };

    loadUser();
  }, []);

  useEffect(() => {
    if (!params.foodId) return;

    const foodId = params.foodId;
    const quantity = params.quantity ? Number(params.quantity) : 1;

    setIngredients((prev) => [
      ...prev,
      {
        food_id: foodId,
        description: params.description ?? '',
        baseKcal: params.kcal ? Number(params.kcal) : 0,
        baseProtein: params.protein ? Number(params.protein) : 0,
        baseCarbs: params.carbs ? Number(params.carbs) : 0,
        baseFat: params.fat ? Number(params.fat) : 0,
        serving_size: params.serving_size ? Number(params.serving_size) : null,
        serving_unit: params.serving_unit ?? null,
        quantity: Number.isNaN(quantity) ? 1 : quantity,
      },
    ]);
  }, [
    params.foodId,
    params.description,
    params.kcal,
    params.protein,
    params.carbs,
    params.fat,
    params.serving_size,
    params.serving_unit,
    params.quantity,
  ]);

  const { totalKcal, totalProtein, totalCarbs, totalFat } = useMemo(() => {
    return ingredients.reduce(
      (acc, ingredient) => {
        const quantity = ingredient.quantity || 0;
        acc.totalKcal += ingredient.baseKcal * quantity;
        acc.totalProtein += ingredient.baseProtein * quantity;
        acc.totalCarbs += ingredient.baseCarbs * quantity;
        acc.totalFat += ingredient.baseFat * quantity;
        return acc;
      },
      {
        totalKcal: 0,
        totalProtein: 0,
        totalCarbs: 0,
        totalFat: 0,
      }
    );
  }, [ingredients]);

  const totalGrams = useMemo(() => {
    return ingredients.reduce((acc, ingredient) => {
      const quantity = ingredient.quantity || 0;
      if (!ingredient.serving_size) return acc;
      return acc + ingredient.serving_size * quantity;
    }, 0);
  }, [ingredients]);

  const handleQuantityChange = (index: number, value: string) => {
    const cleaned = value.replace(',', '.');
    const num = parseFloat(cleaned);

    setIngredients((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        quantity: Number.isNaN(num) ? 0 : num,
      };
      return copy;
    });
  };

  const handleSubmitPress = () => {
    if (!recipeName.trim()) {
      Alert.alert('Name required', 'Please give your recipe a name.');
      return;
    }

    if (ingredients.length === 0) {
      Alert.alert('Add ingredients', 'Add at least one ingredient first.');
      return;
    }

    if (!userId) {
      Alert.alert('User missing', 'Please sign in again before saving.');
      return;
    }

    setShowSubmitConfirm(true);
  };

  const createRecipeInDb = async () => {
    if (!userId) {
      Alert.alert('User missing', 'Please sign in again before saving.');
      return null;
    }

    setSaving(true);

    const totalGramsRounded = totalGrams > 0 ? Number(totalGrams.toFixed(2)) : 0;
    const ingredientsPayload = ingredients.map((ingredient) => ({
      food_id: ingredient.food_id,
      description: ingredient.description,
      quantity: ingredient.quantity,
      serving_size: ingredient.serving_size,
      serving_unit: ingredient.serving_unit,
      base_kcal: ingredient.baseKcal,
      base_protein: ingredient.baseProtein,
      base_carbs: ingredient.baseCarbs,
      base_fat: ingredient.baseFat,
    }));

    const { data, error } = await supabase
      .schema('nutrition')
      .from('recipes')
      .insert({
        user_id: userId,
        name: recipeName.trim(),
        kcal: Math.round(totalKcal),
        protein: Number(totalProtein.toFixed(2)),
        carbs: Number(totalCarbs.toFixed(2)),
        fat: Number(totalFat.toFixed(2)),
        fiber: null,
        sugar: null,
        sodium: null,
        default_portion_grams: totalGramsRounded,
        ingredients: ingredientsPayload,
        is_private: true,
      })
      .select()
      .single();

    setSaving(false);

    if (error) {
      console.error('Error creating recipe', error);
      Alert.alert('Error', 'Could not save recipe. Please try again.');
      return null;
    }

    return data;
  };

  const handleSubmitRecipeOnly = async () => {
    setShowSubmitConfirm(false);
    const recipe = await createRecipeInDb();
    if (!recipe) return;
    router.back();
  };

  const handleCreateAndAdd = async () => {
    setShowSubmitConfirm(false);
    const recipe = await createRecipeInDb();
    if (!recipe || !userId) return;

    const totalGramsRounded = totalGrams > 0 ? Number(totalGrams.toFixed(2)) : 0;
    const todayStr = toLocalISODate();
    const timezoneStr = getDeviceTimezone();

    const { data: diaryDay, error: diaryDayError } = await supabase
      .schema('nutrition')
      .from('diary_days')
      .upsert(
        {
          user_id: userId,
          date: todayStr,
          timezone_str: timezoneStr,
        },
        { onConflict: 'user_id,date' }
      )
      .select()
      .single();

    if (diaryDayError || !diaryDay) {
      console.error('Error upserting diary_day', diaryDayError);
      Alert.alert('Error', "Could not add to today's diary.");
      return;
    }

    const { error: diaryItemError } = await supabase.schema('nutrition').from('diary_items').insert({
      user_id: userId,
      diary_day_id: diaryDay.id,
      meal_type: 'other',
      food_id: null,
      recipe_id: recipe.id,
      quantity: 1,
      unit_label: 'portion',
      grams: totalGramsRounded,
      kcal: Math.round(totalKcal),
      protein: Number(totalProtein.toFixed(2)),
      carbs: Number(totalCarbs.toFixed(2)),
      fat: Number(totalFat.toFixed(2)),
      fiber: null,
      sugar: null,
      sodium: null,
      note: null,
    });

    if (diaryItemError) {
      console.error('Error inserting diary_item', diaryItemError);
      Alert.alert(
        'Partial success',
        `Recipe was created but diary insert failed:\n\n${
          diaryItemError.message ?? JSON.stringify(diaryItemError, null, 2)
        }`
      );
      return;
    }

    try {
      await syncAndFetchMyDailyGoalResult(todayStr);
    } catch (goalErr) {
      console.warn('Error refreshing goal results after create-and-add meal', goalErr);
    }

    router.back();
  };

  const confirmCancel = () => {
    setShowCancelConfirm(false);
    router.back();
  };

  return (
    <LinearGradient
      colors={[colors.gradientTop, colors.gradientMid, colors.gradientBottom]}
      start={{ x: 0.2, y: 0 }}
      end={{ x: 0.8, y: 1 }}
      style={globalStyles.page}
    >
      <View style={globalStyles.safeArea}>
        <LogoHeader showBackButton />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <Text style={globalStyles.eyebrow}>Recipe Builder</Text>
            <Text style={globalStyles.header}>Create meal</Text>
            <Text style={styles.heroText}>
              Build a reusable meal, tune portions, and save it as a recipe or log it
              into today&apos;s diary immediately.
            </Text>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.fieldLabel}>Recipe Name</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Name your recipe"
              placeholderTextColor={colors.textOffSt}
              value={recipeName}
              onChangeText={setRecipeName}
            />

            <Text style={[styles.fieldLabel, styles.secondaryLabel]}>Description</Text>
            <TextInput
              style={[styles.textInput, styles.descriptionInput]}
              placeholder="Add a short description (optional)"
              placeholderTextColor={colors.textOffSt}
              value={recipeDescription}
              onChangeText={setRecipeDescription}
              multiline
            />
          </View>

          <MealSummaryCard
            totalKcal={totalKcal}
            totalProtein={totalProtein}
            totalCarbs={totalCarbs}
            totalFat={totalFat}
          />

          <View style={styles.sectionHeader}>
            <View>
              <Text style={globalStyles.eyebrow}>Ingredients</Text>
              <Text style={styles.sectionTitle}>Meal composition</Text>
            </View>
            <TouchableOpacity
              style={[globalStyles.buttonSecondary, styles.inlineButton]}
              activeOpacity={0.9}
              onPress={() => router.push('./addIngredient')}
              disabled={saving}
            >
              <Ionicons name="add" size={16} color={colors.text} />
              <Text style={globalStyles.buttonTextSecondary}>Add Ingredient</Text>
            </TouchableOpacity>
          </View>

          <IngredientsList
            ingredients={ingredients}
            onChangeQuantity={handleQuantityChange}
          />
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[globalStyles.buttonSecondary, styles.footerButton]}
            activeOpacity={0.9}
            onPress={() => setShowCancelConfirm(true)}
            disabled={saving}
          >
            <Text style={globalStyles.buttonTextSecondary}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[globalStyles.buttonPrimary, styles.footerButton]}
            activeOpacity={0.9}
            onPress={handleSubmitPress}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={colors.blkText} />
            ) : (
              <Text style={globalStyles.buttonTextPrimary}>Save Recipe</Text>
            )}
          </TouchableOpacity>
        </View>

        <AppPopup
          visible={showSubmitConfirm}
          onClose={() => setShowSubmitConfirm(false)}
          eyebrow="Save Recipe"
          title="Create this recipe?"
          subtitle="Choose whether to just save it or save and add it to today’s diary."
          showCloseButton
          footer={
            <View style={styles.popupFooterStack}>
              <TouchableOpacity
                style={globalStyles.buttonSecondary}
                onPress={() => setShowSubmitConfirm(false)}
              >
                <Text style={globalStyles.buttonTextSecondary}>Go Back</Text>
              </TouchableOpacity>
              <View style={styles.popupFooterRow}>
                <TouchableOpacity
                  style={[globalStyles.buttonSecondary, styles.popupFooterButton]}
                  onPress={handleSubmitRecipeOnly}
                >
                  <Text style={globalStyles.buttonTextSecondary}>Save Only</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[globalStyles.buttonPrimary, styles.popupFooterButton]}
                  onPress={handleCreateAndAdd}
                >
                  <Text style={globalStyles.buttonTextPrimary}>Create & Add</Text>
                </TouchableOpacity>
              </View>
            </View>
          }
        >
          <View style={styles.popupBody}>
            <View style={styles.popupMetric}>
              <Text style={styles.popupMetricLabel}>Recipe</Text>
              <Text style={styles.popupMetricValue}>{recipeName.trim() || 'Untitled recipe'}</Text>
            </View>
            <View style={styles.popupMetric}>
              <Text style={styles.popupMetricLabel}>Ingredients</Text>
              <Text style={styles.popupMetricValue}>{ingredients.length}</Text>
            </View>
          </View>
        </AppPopup>

        <AppPopup
          visible={showCancelConfirm}
          onClose={() => setShowCancelConfirm(false)}
          eyebrow="Discard Changes"
          title="Discard this recipe?"
          subtitle="Any changes you made in the builder will be lost."
          showCloseButton
          footer={
            <View style={styles.popupFooterRow}>
              <TouchableOpacity
                style={[globalStyles.buttonSecondary, styles.popupFooterButton]}
                onPress={() => setShowCancelConfirm(false)}
              >
                <Text style={globalStyles.buttonTextSecondary}>Keep Editing</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[globalStyles.buttonPrimary, styles.popupFooterButton, styles.dangerButton]}
                onPress={confirmCancel}
              >
                <Text style={globalStyles.buttonTextPrimary}>Discard</Text>
              </TouchableOpacity>
            </View>
          }
        >
          <Text style={styles.popupBodyText}>
            Save the recipe first if you want it to appear in your meal library.
          </Text>
        </AppPopup>
      </View>
    </LinearGradient>
  );
}

function createStyles(
  colors: ReturnType<typeof useAppTheme>['colors'],
  fonts: ReturnType<typeof useAppTheme>['fonts']
) {
  return StyleSheet.create({
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
      borderColor: colors.border,
      backgroundColor: colors.card,
      padding: 20,
      gap: 8,
    },
    heroText: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 14,
      lineHeight: 20,
    },
    formCard: {
      borderRadius: 24,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card2,
      padding: 16,
    },
    fieldLabel: {
      color: colors.textMuted,
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
      borderColor: colors.border,
      backgroundColor: colors.background,
      color: colors.text,
      paddingHorizontal: 14,
      paddingVertical: 13,
      fontFamily: fonts.body,
      fontSize: 15,
    },
    descriptionInput: {
      minHeight: 96,
      textAlignVertical: 'top',
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    sectionTitle: {
      marginTop: 8,
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 20,
      lineHeight: 24,
      letterSpacing: -0.4,
    },
    inlineButton: {
      paddingHorizontal: 14,
      gap: 6,
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
    popupBody: {
      flexDirection: 'row',
      gap: 10,
    },
    popupMetric: {
      flex: 1,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card2,
      padding: 14,
    },
    popupMetricLabel: {
      color: colors.textMuted,
      fontFamily: fonts.label,
      fontSize: 10,
      lineHeight: 12,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    },
    popupMetricValue: {
      marginTop: 8,
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 15,
      lineHeight: 19,
    },
    popupFooterStack: {
      gap: 10,
    },
    popupFooterRow: {
      flexDirection: 'row',
      gap: 10,
    },
    popupFooterButton: {
      flex: 1,
    },
    popupBodyText: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 14,
      lineHeight: 20,
    },
    dangerButton: {
      backgroundColor: colors.danger,
    },
  });
}
