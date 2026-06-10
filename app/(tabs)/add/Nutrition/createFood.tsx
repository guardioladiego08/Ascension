import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import LogoHeader from '@/components/my components/logoHeader';
import FoodSubmissionField from './components/FoodSubmissionField';
import {
  createCanonicalFood,
  type FoodKind,
} from '@/lib/nutrition/dataAccess';
import { NUTRITION_ROUTES } from '@/lib/nutrition/navigation';
import { firstRouteParam } from '@/lib/nutrition/routeParams';
import {
  buildServingReferenceFromDraft,
  convertServingValueToPer100g,
  parseServingQuantityInput,
  sanitizeMetricInput,
  sanitizeServingQuantityInput,
} from '@/lib/nutrition/serving';
import { useAppTheme } from '@/providers/AppThemeProvider';
import { HOME_TONES } from '../../home/tokens';

type FormState = {
  foodName: string;
  brand: string;
  barcode: string;
  servingQuantityInput: string;
  servingUnit: string;
  servingMetricGramsInput: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  fiber: string;
  sodium: string;
  ingredientsText: string;
};

function cleanString(value: unknown) {
  const trimmed = String(value ?? '').trim();
  return trimmed || '';
}

function toNullableNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) {
    return cleanString(error.message) || fallback;
  }

  if (error && typeof error === 'object' && 'message' in error) {
    return cleanString((error as { message?: unknown }).message) || fallback;
  }

  return fallback;
}

export default function CreateFood() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    q?: string | string[];
    barcode?: string | string[];
  }>();
  const { colors, fonts, globalStyles } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);

  const prefillName = firstRouteParam(params.q);
  const prefillBarcode = firstRouteParam(params.barcode);

  const [foodKind, setFoodKind] = useState<FoodKind>('packaged');
  const [form, setForm] = useState<FormState>({
    foodName: cleanString(prefillName),
    brand: '',
    barcode: cleanString(prefillBarcode),
    servingQuantityInput: '1',
    servingUnit: 'serving',
    servingMetricGramsInput: '',
    calories: '',
    protein: '',
    carbs: '',
    fat: '',
    fiber: '',
    sodium: '',
    ingredientsText: '',
  });
  const [saving, setSaving] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const updateField = (key: keyof FormState, value: string) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleCreateFood = async () => {
    const name = cleanString(form.foodName);
    if (!name) {
      Alert.alert('Food name required', 'Please enter a food name.');
      return;
    }

    const servingQuantity = parseServingQuantityInput(form.servingQuantityInput);
    const servingUnit = cleanString(form.servingUnit);
    const servingGrams = parseServingQuantityInput(form.servingMetricGramsInput);

    if (servingQuantity == null || servingQuantity <= 0) {
      Alert.alert(
        'Serving quantity required',
        'Enter the serving amount, for example 1, 2, or 2/3.'
      );
      return;
    }

    if (!servingUnit) {
      Alert.alert(
        'Serving unit required',
        'Enter the food unit, for example egg, slice, bar, cup, or cookie.'
      );
      return;
    }

    if (servingGrams == null || servingGrams <= 0) {
      Alert.alert(
        'Grams required',
        'Enter how many grams correspond to that food unit.'
      );
      return;
    }

    setSaving(true);
    setErrorText(null);

    try {
      const servingReference = buildServingReferenceFromDraft({
        commonQuantityInput: form.servingQuantityInput,
        commonUnit: form.servingUnit,
        metricGramsInput: form.servingMetricGramsInput,
      });

      const created = await createCanonicalFood({
        foodKind,
        name,
        brand: cleanString(form.brand) || null,
        barcode: cleanString(form.barcode) || null,
        servingReference,
        calories: convertServingValueToPer100g(toNullableNumber(form.calories), servingGrams),
        protein: convertServingValueToPer100g(toNullableNumber(form.protein), servingGrams),
        carbs: convertServingValueToPer100g(toNullableNumber(form.carbs), servingGrams),
        fat: convertServingValueToPer100g(toNullableNumber(form.fat), servingGrams),
        fiber: convertServingValueToPer100g(toNullableNumber(form.fiber), servingGrams),
        sodiumMg: convertServingValueToPer100g(toNullableNumber(form.sodium), servingGrams),
        ingredientsText: cleanString(form.ingredientsText) || null,
        source: cleanString(form.barcode) ? 'barcode' : 'manual',
        verificationStatus: 'user_confirmed',
      });

      router.replace({
        pathname: NUTRITION_ROUTES.logFood,
        params: {
          foodId: created.id,
          barcode: created.barcode ?? '',
        },
      });
    } catch (error) {
      console.warn('[CreateFood] Failed to create canonical food', error);
      setErrorText(getErrorMessage(error, 'Could not create this food right now.'));
    } finally {
      setSaving(false);
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
            <Text style={styles.eyebrow}>Public Food Catalog</Text>
            <Text style={styles.header}>Create individual food</Text>
            <Text style={styles.heroText}>
              Add a single food so other users can search and log it. Entries publish as
              user-confirmed after save.
            </Text>
          </View>

          <View style={styles.formCard}>
            <View style={styles.kindRow}>
              {([
                ['packaged', 'Packaged'],
                ['ingredient', 'Ingredient'],
              ] as Array<[FoodKind, string]>).map(([kind, label]) => {
                const active = foodKind === kind;
                return (
                  <TouchableOpacity
                    key={kind}
                    style={[styles.kindChip, active ? styles.kindChipActive : null]}
                    activeOpacity={0.9}
                    onPress={() => setFoodKind(kind)}
                  >
                    <Text style={[styles.kindChipText, active ? styles.kindChipTextActive : null]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <FoodSubmissionField
              label="Food Name"
              value={form.foodName}
              onChangeText={(value) => updateField('foodName', value)}
              required
              placeholder="Product or ingredient name"
            />

            <FoodSubmissionField
              label="Brand (Optional)"
              value={form.brand}
              onChangeText={(value) => updateField('brand', value)}
              placeholder="Brand"
            />

            <FoodSubmissionField
              label="Barcode (Optional)"
              value={form.barcode}
              onChangeText={(value) => updateField('barcode', sanitizeMetricInput(value))}
              keyboardType="number-pad"
              placeholder="Digits only"
            />

            <View style={styles.row}>
              <View style={styles.rowItem}>
                <FoodSubmissionField
                  label="Serving Quantity"
                  value={form.servingQuantityInput}
                  onChangeText={(value) =>
                    updateField('servingQuantityInput', sanitizeServingQuantityInput(value))
                  }
                  required
                  keyboardType="decimal-pad"
                  placeholder="1"
                />
              </View>
              <View style={styles.rowItem}>
                <FoodSubmissionField
                  label="Food Unit"
                  value={form.servingUnit}
                  onChangeText={(value) => updateField('servingUnit', value)}
                  required
                  placeholder="bar, cup, slice"
                />
              </View>
            </View>

            <FoodSubmissionField
              label="Grams per Food Unit"
              value={form.servingMetricGramsInput}
              onChangeText={(value) =>
                updateField('servingMetricGramsInput', sanitizeMetricInput(value))
              }
              required
              keyboardType="decimal-pad"
              placeholder="68"
            />

            <View style={styles.row}>
              <View style={styles.rowItem}>
                <FoodSubmissionField
                  label="Calories"
                  value={form.calories}
                  onChangeText={(value) => updateField('calories', sanitizeMetricInput(value))}
                  keyboardType="decimal-pad"
                  placeholder="250"
                />
              </View>
              <View style={styles.rowItem}>
                <FoodSubmissionField
                  label="Protein (g)"
                  value={form.protein}
                  onChangeText={(value) => updateField('protein', sanitizeMetricInput(value))}
                  keyboardType="decimal-pad"
                  placeholder="11"
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.rowItem}>
                <FoodSubmissionField
                  label="Carbs (g)"
                  value={form.carbs}
                  onChangeText={(value) => updateField('carbs', sanitizeMetricInput(value))}
                  keyboardType="decimal-pad"
                  placeholder="43"
                />
              </View>
              <View style={styles.rowItem}>
                <FoodSubmissionField
                  label="Fat (g)"
                  value={form.fat}
                  onChangeText={(value) => updateField('fat', sanitizeMetricInput(value))}
                  keyboardType="decimal-pad"
                  placeholder="6"
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.rowItem}>
                <FoodSubmissionField
                  label="Fiber (g)"
                  value={form.fiber}
                  onChangeText={(value) => updateField('fiber', sanitizeMetricInput(value))}
                  keyboardType="decimal-pad"
                  placeholder="5"
                />
              </View>
              <View style={styles.rowItem}>
                <FoodSubmissionField
                  label="Sodium (mg)"
                  value={form.sodium}
                  onChangeText={(value) => updateField('sodium', sanitizeMetricInput(value))}
                  keyboardType="decimal-pad"
                  placeholder="180"
                />
              </View>
            </View>

            <FoodSubmissionField
              label="Ingredients (Optional)"
              value={form.ingredientsText}
              onChangeText={(value) => updateField('ingredientsText', value)}
              multiline
              placeholder="Ingredient list"
            />
          </View>

          {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}

          <TouchableOpacity
            style={[styles.buttonPrimary, styles.saveButton]}
            activeOpacity={0.9}
            onPress={handleCreateFood}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={colors.blkText} />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={18} color={colors.blkText} />
                <Text style={styles.buttonTextPrimary}>Create Public Food</Text>
              </>
            )}
          </TouchableOpacity>
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
    hero: {
      borderRadius: 24,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      backgroundColor: HOME_TONES.surface1,
      paddingHorizontal: 18,
      paddingVertical: 16,
      gap: 6,
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
      fontSize: 28,
      lineHeight: 31,
      letterSpacing: -0.6,
    },
    heroText: {
      color: HOME_TONES.textSecondary,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 18,
    },
    formCard: {
      borderRadius: 20,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      backgroundColor: HOME_TONES.surface1,
      paddingHorizontal: 14,
      paddingVertical: 14,
      gap: 12,
    },
    kindRow: {
      flexDirection: 'row',
      gap: 8,
    },
    kindChip: {
      flex: 1,
      minHeight: 42,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      backgroundColor: HOME_TONES.surface2,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 10,
    },
    kindChipActive: {
      borderColor: colors.highlight1,
      backgroundColor: 'rgba(28, 191, 115, 0.14)',
    },
    kindChipText: {
      color: HOME_TONES.textSecondary,
      fontFamily: fonts.heading,
      fontSize: 13,
      lineHeight: 17,
    },
    kindChipTextActive: {
      color: HOME_TONES.textPrimary,
    },
    row: {
      flexDirection: 'row',
      gap: 10,
    },
    rowItem: {
      flex: 1,
    },
    errorText: {
      color: colors.danger,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 17,
    },
    buttonPrimary: {
      height: 50,
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
    buttonTextPrimary: {
      color: colors.blkText,
      fontFamily: fonts.heading,
      fontSize: 14,
      lineHeight: 18,
    },
    saveButton: {
      marginTop: 2,
    },
  });
}
