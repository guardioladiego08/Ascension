// app/(tabs)/nutrition/createMeal.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { GlobalStyles } from '@/constants/GlobalStyles';
import { Colors } from '@/constants/Colors';
import LogoHeader from '@/components/my components/logoHeader';
import MealSummaryCard from './components/MealSummaryCard';
import IngredientsList from './components/IngredientsList';
import { supabase } from '@/lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import {
  getDeviceTimezone,
  syncAndFetchMyDailyGoalResult,
  toLocalISODate,
} from '@/lib/goals/client';

const BG = Colors.dark.background;
const CARD = Colors.dark.card;
const TEXT_PRIMARY = Colors.dark.text;
const TEXT_MUTED = Colors.dark.textMuted;
const PRIMARY = Colors.dark.highlight1
const DANGER_RED = '#FF6B81';

type Ingredient = {
  food_id: string;          // 👈 matches foods.id from CSV
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

  const params = useLocalSearchParams<{
    foodId?: string;
    description?: string;
    kcal?: string;
    protein?: string;
    carbs?: string;
    fat?: string;
    serving_size?: string;
    serving_unit?: string;
    quantity?: string;   // 👈 NEW
  }>();

  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [recipeName, setRecipeName] = useState('');
  const [recipeDescription, setRecipeDescription] = useState('');
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  // 🔹 REAL user id from Supabase auth
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        console.error('Error getting user in CreateMeal', error);
        return;
      }
      if (data.user) {
        setUserId(data.user.id);
      }
    };
    loadUser();
  }, []);

  // When returning from AddIngredient with a selected food, add it to ingredients
  // When returning from AddIngredient with a selected food, add it to ingredients
  useEffect(() => {
    if (!params.foodId) return;

    const foodId = params.foodId; // already a string like "fd_F2MYJuH8UsE9"
    const qty = params.quantity ? Number(params.quantity) : 1;

    setIngredients(prev => [
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
        quantity: Number.isNaN(qty) ? 1 : qty,
      },
    ]);
  }, [params.foodId, params.quantity]);



  // Totals for meal summary (kcal + macros)
  const { totalKcal, totalProtein, totalCarbs, totalFat } = useMemo(() => {
    return ingredients.reduce(
      (acc, ing) => {
        const q = ing.quantity || 0;
        acc.totalKcal += ing.baseKcal * q;
        acc.totalProtein += ing.baseProtein * q;
        acc.totalCarbs += ing.baseCarbs * q;
        acc.totalFat += ing.baseFat * q;
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

  // 🔹 Total grams for ONE portion of this recipe
  // (sum of each ingredient's default serving_size in grams * quantity)
  const totalGrams = useMemo(() => {
    return ingredients.reduce((acc, ing) => {
      const q = ing.quantity || 0;
      if (!ing.serving_size) return acc;
      return acc + ing.serving_size * q;
    }, 0);
  }, [ingredients]);

  const handleQuantityChange = (index: number, value: string) => {
    const cleaned = value.replace(',', '.');
    const num = parseFloat(cleaned);
    setIngredients(prev => {
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

  const handleCancelPress = () => {
    setShowCancelConfirm(true);
  };

  /** Helper: create recipe in DB and return the inserted row */
  const createRecipeInDb = async () => {
    if (!userId) {
      Alert.alert('User missing', 'Please sign in again before saving.');
      return null;
    }

    setSaving(true);

    const totalGramsRounded =
      totalGrams > 0 ? Number(totalGrams.toFixed(2)) : 0;

    // Build ingredients JSON payload
    const ingredientsPayload = ingredients.map(ing => ({
      food_id: ing.food_id,
      description: ing.description,
      quantity: ing.quantity,
      serving_size: ing.serving_size,
      serving_unit: ing.serving_unit,
      base_kcal: ing.baseKcal,
      base_protein: ing.baseProtein,
      base_carbs: ing.baseCarbs,
      base_fat: ing.baseFat,
    }));

    const { data, error } = await supabase
      .schema('nutrition')
      .from('recipes')
      .insert({
        user_id: userId,
        name: recipeName.trim(),
        // TODO: add a "description" column in recipes and store recipeDescription
        kcal: Math.round(totalKcal),
        protein: Number(totalProtein.toFixed(2)),
        carbs: Number(totalCarbs.toFixed(2)),
        fat: Number(totalFat.toFixed(2)),
        fiber: null,
        sugar: null,
        sodium: null,
        default_portion_grams: totalGramsRounded, // 🔹 save grams per portion
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

    return data; // recipe row (with id)
  };

  /** Action for the "Submit" button: create recipe only */
  const handleSubmitRecipeOnly = async () => {
    setShowSubmitConfirm(false);
    const recipe = await createRecipeInDb();
    if (!recipe) return;
    router.back();
  };

  /** Action for "Create & Add": create recipe + add to diary for today */
  const handleCreateAndAdd = async () => {
    setShowSubmitConfirm(false);
    const recipe = await createRecipeInDb();
    if (!recipe || !userId) return;

    const totalGramsRounded =
      totalGrams > 0 ? Number(totalGrams.toFixed(2)) : 0;

    // 1) Get or create today's diary_day
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

    // 2) Insert diary_items row referencing the new recipe
    const { error: diaryItemError } = await supabase.schema('nutrition').from('diary_items').insert({
      user_id: userId,
      diary_day_id: diaryDay.id,
      meal_type: 'other', // change if you pass in a specific meal_type
      food_id: null,
      recipe_id: recipe.id,
      quantity: 1,
      unit_label: 'portion',
      grams: totalGramsRounded, // 🔹 NOT NULL now
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
      colors={['#3a3a3bff', '#1e1e1eff', BG]}
      start={{ x: 0.2, y: 0 }}
      end={{ x: 0.8, y: 1 }}
      style={{ flex: 1 }}
    >
      <View style={GlobalStyles.safeArea}>
        <LogoHeader showBackButton />
        <View style={styles.main}>
          {/* Header */}
          <View style={styles.headerRow}>
            <Text style={GlobalStyles.header}>Create Meal</Text>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Recipe name input */}
            <TextInput
              style={styles.nameInput}
              placeholder="Name your recipe..."
              placeholderTextColor={TEXT_MUTED}
              value={recipeName}
              onChangeText={setRecipeName}
            />

            {/* Recipe description */}
            <TextInput
              style={styles.descriptionInput}
              placeholder="Add a short description (optional)"
              placeholderTextColor={TEXT_MUTED}
              value={recipeDescription}
              onChangeText={setRecipeDescription}
              multiline
            />

            {/* Meal summary with donut chart */}
            <MealSummaryCard
              totalKcal={totalKcal}
              totalProtein={totalProtein}
              totalCarbs={totalCarbs}
              totalFat={totalFat}
            />

            {/* Ingredients */}
            <Text style={[styles.sectionLabel, { marginTop: 18 }]}>INGREDIENTS</Text>

            <View style={styles.ingredientsContainer}>
              <IngredientsList
                ingredients={ingredients}
                onChangeQuantity={handleQuantityChange}
              />
            </View>
          </ScrollView>

          {/* Footer: Submit / Cancel + Add Ingredient */}
          <View style={styles.footer}>
            <View style={styles.footerButtonsRow}>
              <TouchableOpacity
                style={[styles.footerBtn, styles.cancelBtn]}
                activeOpacity={0.9}
                onPress={handleCancelPress}
                disabled={saving}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.footerBtn, styles.submitBtn]}
                activeOpacity={0.9}
                onPress={handleSubmitPress}
                disabled={saving}
              >
                <Text style={styles.submitBtnText}>
                  {saving ? 'Saving...' : 'Save Recipe'}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.addIngredientBtn}
              activeOpacity={0.9}
              onPress={() => router.push('./addIngredient')}
              disabled={saving}
            >
              <Ionicons name="add" size={18} color="#05101F" />
              <Text style={styles.addIngredientBtnText}>Add Ingredient</Text>
            </TouchableOpacity>
          </View>

          {/* Submit confirm modal */}
          <Modal
            transparent
            animationType="fade"
            visible={showSubmitConfirm}
            onRequestClose={() => setShowSubmitConfirm(false)}
          >
            <View style={styles.modalBackdrop}>
              <View style={styles.modalCard}>
                <Text style={styles.modalTitle}>Create this recipe?</Text>
                <Text style={styles.modalBody}>
                  Choose whether to just save it, or save and add it to today&apos;s
                  diary.
                </Text>

                <View style={styles.modalButtonsRowMulti}>
                  <TouchableOpacity
                    style={[styles.modalBtn, styles.modalCancelBtn]}
                    onPress={() => setShowSubmitConfirm(false)}
                  >
                    <Text style={styles.modalCancelText}>Go Back</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalBtn, styles.modalConfirmBtn]}
                    onPress={handleSubmitRecipeOnly}
                  >
                    <Text style={styles.modalConfirmText}>Submit</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalBtn, styles.modalAltBtn]}
                    onPress={handleCreateAndAdd}
                  >
                    <Text style={styles.modalAltText}>Create &amp; Add</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          {/* Cancel confirm modal */}
          <Modal
            transparent
            animationType="fade"
            visible={showCancelConfirm}
            onRequestClose={() => setShowCancelConfirm(false)}
          >
            <View style={styles.modalBackdrop}>
              <View style={styles.modalCard}>
                <Text style={styles.modalTitle}>Discard this recipe?</Text>
                <Text style={styles.modalBody}>
                  Any changes you&apos;ve made will be lost.
                </Text>

                <View style={styles.modalButtonsRow}>
                  <TouchableOpacity
                    style={[styles.modalBtn, styles.modalCancelBtn]}
                    onPress={() => setShowCancelConfirm(false)}
                  >
                    <Text style={styles.modalCancelText}>Keep Editing</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalBtn, styles.modalDangerBtn]}
                    onPress={confirmCancel}
                  >
                    <Text style={styles.modalDangerText}>Discard</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  main: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  nameInput: {
    backgroundColor: CARD,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  descriptionInput: {
    backgroundColor: CARD,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: TEXT_PRIMARY,
    fontSize: 13,
    minHeight: 70,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  sectionLabel: {
    color: TEXT_MUTED,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  ingredientsContainer: {
    backgroundColor: CARD,
    borderRadius: 18,
    padding: 14,
    minHeight: 120,
  },
  footer: {
    paddingBottom: 18,
    paddingTop: 8,
    backgroundColor: Colors.dark.background,
  },
  footerButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  footerBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: TEXT_MUTED,
    marginRight: 8,
  },
  submitBtn: {
    backgroundColor: PRIMARY,
    marginLeft: 8,
  },
  cancelBtnText: {
    color: TEXT_MUTED,
    fontWeight: '600',
  },
  submitBtnText: {
    color: '#05101F',
    fontWeight: '700',
  },
  addIngredientBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: '#fff',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 11,
    marginTop: 4,
  },
  addIngredientBtnText: {
    color: TEXT_PRIMARY,
    fontWeight: '700',
    fontSize: 14,
    marginLeft: 6,
  },
  // Modals
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCard: {
    width: '82%',
    backgroundColor: Colors.dark.popUpCard,
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  modalTitle: {
    color: TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  modalBody: {
    color: TEXT_PRIMARY,
    fontSize: 13,
    marginBottom: 14,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalButtonsRowMulti: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
  },
  modalBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginLeft: 8,
    marginTop: 4,
  },
  modalCancelBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: TEXT_PRIMARY,
  },
  modalConfirmBtn: {
    backgroundColor: PRIMARY,
  },
  modalAltBtn: {
    backgroundColor: '#3E8CFF',
  },
  modalDangerBtn: {
    borderColor: DANGER_RED,
    borderWidth: 1,
    borderRadius: 10,
  },
  modalCancelText: {
    color: TEXT_PRIMARY,
    fontWeight: '600',
  },
  modalConfirmText: {
    color: '#05101F',
    fontWeight: '700',
  },
  modalAltText: {
    color: '#05101F',
    fontWeight: '700',
  },
  modalDangerText: {
    color: DANGER_RED,
    fontWeight: '700',
  },
});
