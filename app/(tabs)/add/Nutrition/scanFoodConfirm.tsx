import React, { useEffect, useMemo, useState } from 'react';
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
  confirmFoodSubmissionAndCreateCanonicalFood,
  getFoodSubmissionById,
  type FoodSubmissionRow,
} from '@/lib/nutrition/dataAccess';
import { NUTRITION_ROUTES } from '@/lib/nutrition/navigation';
import { firstRouteParam } from '@/lib/nutrition/routeParams';
import {
  buildServingReferenceFromDraft,
  convertServingValueToPer100g,
  getServingReferenceDraft,
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

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function cleanString(value: unknown) {
  const trimmed = String(value ?? '').trim();
  return trimmed || '';
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) {
    return cleanString(error.message) || fallback;
  }

  if (error && typeof error === 'object' && 'message' in error) {
    return cleanString((error as { message?: unknown }).message) || fallback;
  }

  if (typeof error === 'string' || typeof error === 'number') {
    return cleanString(error) || fallback;
  }

  return fallback;
}

function toNullableNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function getInitialForm(submission: FoodSubmissionRow): FormState {
  const payload = asObject(submission.ocr_payload);
  const extracted = asObject(payload?.extracted ?? payload);
  const servingDraft = getServingReferenceDraft(
    null,
    cleanString(extracted?.servingSize ?? extracted?.serving_size)
  );

  return {
    foodName: cleanString(extracted?.foodName ?? extracted?.name),
    brand: cleanString(extracted?.brand),
    barcode: cleanString(extracted?.barcode ?? submission.barcode),
    servingQuantityInput: servingDraft.commonQuantityInput,
    servingUnit: servingDraft.commonUnit,
    servingMetricGramsInput: servingDraft.metricGramsInput,
    calories: cleanString(extracted?.calories),
    protein: cleanString(extracted?.protein),
    carbs: cleanString(extracted?.carbs),
    fat: cleanString(extracted?.fat),
    fiber: cleanString(extracted?.fiber),
    sodium: cleanString(extracted?.sodium),
    ingredientsText: cleanString(extracted?.ingredientsText ?? extracted?.ingredients_text),
  };
}

export default function ScanFoodConfirm() {
  const router = useRouter();
  const { colors, fonts, globalStyles } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);

  const params = useLocalSearchParams<{ submissionId?: string | string[] }>();
  const submissionId = firstRouteParam(params.submissionId);

  const [submission, setSubmission] = useState<FoodSubmissionRow | null>(null);
  const [form, setForm] = useState<FormState>({
    foodName: '',
    brand: '',
    barcode: '',
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const detectedServingText = useMemo(() => {
    const payload = asObject(submission?.ocr_payload);
    const extracted = asObject(payload?.extracted ?? payload);
    const next = cleanString(extracted?.servingSize ?? extracted?.serving_size);
    return next || null;
  }, [submission]);

  useEffect(() => {
    let isMounted = true;

    const loadSubmission = async () => {
      setLoading(true);
      setErrorText(null);

      try {
        if (!submissionId) {
          throw new Error('Submission ID is missing.');
        }

        const nextSubmission = await getFoodSubmissionById(submissionId);
        if (!nextSubmission) {
          throw new Error('Submission not found.');
        }

        if (isMounted) {
          setSubmission(nextSubmission);
          setForm(getInitialForm(nextSubmission));
        }
      } catch (error) {
        console.warn('[ScanFoodConfirm] Failed to load submission', error);
        if (isMounted) {
          setErrorText(getErrorMessage(error, 'Could not load this submission.'));
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadSubmission();

    return () => {
      isMounted = false;
    };
  }, [submissionId]);

  const updateField = (key: keyof FormState, value: string) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleConfirm = async () => {
    if (!submission) return;

    const name = cleanString(form.foodName);
    if (!name) {
      Alert.alert('Food name required', 'Please enter a food name before confirming.');
      return;
    }

    setSaving(true);
    setErrorText(null);

    try {
      const servingQuantity = parseServingQuantityInput(form.servingQuantityInput);
      const servingUnit = cleanString(form.servingUnit);
      const servingGrams = parseServingQuantityInput(form.servingMetricGramsInput);

      if (servingQuantity == null || servingQuantity <= 0) {
        Alert.alert(
          'Serving quantity required',
          'Enter the food-specific serving amount, for example 1, 2, or 2/3.'
        );
        return;
      }

      if (!servingUnit) {
        Alert.alert(
          'Serving unit required',
          'Enter the food-specific unit, for example egg, slice, cup, or cookie.'
        );
        return;
      }

      if (servingGrams == null || servingGrams <= 0) {
        Alert.alert(
          'Metric serving required',
          'Enter the equivalent grams for that serving so the app can support gram and ounce logging.'
        );
        return;
      }

      const servingReference = buildServingReferenceFromDraft({
        commonQuantityInput: form.servingQuantityInput,
        commonUnit: form.servingUnit,
        metricGramsInput: form.servingMetricGramsInput,
      });

      const result = await confirmFoodSubmissionAndCreateCanonicalFood({
        submissionId: submission.id,
        food: {
          foodKind: 'packaged',
          name,
          brand: cleanString(form.brand) || null,
          barcode: cleanString(form.barcode) || submission.barcode || null,
          servingReference,
          calories: convertServingValueToPer100g(
            toNullableNumber(form.calories),
            servingGrams
          ),
          protein: convertServingValueToPer100g(
            toNullableNumber(form.protein),
            servingGrams
          ),
          carbs: convertServingValueToPer100g(
            toNullableNumber(form.carbs),
            servingGrams
          ),
          fat: convertServingValueToPer100g(
            toNullableNumber(form.fat),
            servingGrams
          ),
          fiber: convertServingValueToPer100g(
            toNullableNumber(form.fiber),
            servingGrams
          ),
          sodiumMg: convertServingValueToPer100g(
            toNullableNumber(form.sodium),
            servingGrams
          ),
          ingredientsText: cleanString(form.ingredientsText) || null,
          source: 'ocr',
          imageUrls: submission.label_image_urls,
          verificationStatus: 'user_confirmed',
        },
      });

      router.replace({
        pathname: NUTRITION_ROUTES.logFood,
        params: {
          foodId: result.food.id,
          barcode: result.food.barcode ?? submission.barcode ?? '',
        },
      });
    } catch (error) {
      console.warn('[ScanFoodConfirm] Failed to confirm submission', error);
      setErrorText(getErrorMessage(error, 'Could not create a catalog food right now.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.page}>
        <View style={globalStyles.safeArea}>
          <LogoHeader showBackButton />
          <View style={[styles.panelSoft, styles.centerState]}>
            <ActivityIndicator color={colors.highlight1} />
            <Text style={styles.stateText}>Loading extracted fields...</Text>
          </View>
        </View>
      </View>
    );
  }

  if (!submission) {
    return (
      <View style={styles.page}>
        <View style={globalStyles.safeArea}>
          <LogoHeader showBackButton />
          <View style={[styles.panelSoft, styles.centerState]}>
            <Text style={styles.errorText}>
              {errorText ?? 'This submission could not be loaded.'}
            </Text>
            <TouchableOpacity
              style={styles.buttonPrimary}
              activeOpacity={0.9}
              onPress={() => router.replace(NUTRITION_ROUTES.scanFood)}
            >
              <Text style={styles.buttonTextPrimary}>Back to Scanner</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

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
            <Text style={styles.eyebrow}>Review and Confirm</Text>
            <Text style={styles.header}>Confirm extracted nutrition</Text>
            <Text style={styles.heroText}>
              Review all fields before publishing. This confirmation step is required
              before the food becomes public.
            </Text>
          </View>

          <View style={styles.metaCard}>
            <Text style={styles.metaLabel}>Submission</Text>
            <Text style={styles.metaValue}>{submission?.id ?? 'Unknown'}</Text>
            <Text style={styles.metaHint}>
              {submission?.label_image_urls.length ?? 0} uploaded image(s)
            </Text>
          </View>

          <View style={styles.formCard}>
            <FoodSubmissionField
              label="Food Name"
              value={form.foodName}
              onChangeText={(value) => updateField('foodName', value)}
              required
              placeholder="Product name"
            />

            <FoodSubmissionField
              label="Brand"
              value={form.brand}
              onChangeText={(value) => updateField('brand', value)}
              placeholder="Brand"
            />

            <FoodSubmissionField
              label="Barcode"
              value={form.barcode}
              onChangeText={(value) => updateField('barcode', value)}
              placeholder="UPC/EAN"
            />

            <FoodSubmissionField
              label="Serving Quantity"
              value={form.servingQuantityInput}
              onChangeText={(value) =>
                updateField('servingQuantityInput', sanitizeServingQuantityInput(value))
              }
              placeholder="e.g. 1, 2, 2/3"
            />

            <View style={styles.servingRow}>
              <View style={styles.servingCellWide}>
                <FoodSubmissionField
                  label="Food Unit"
                  value={form.servingUnit}
                  onChangeText={(value) => updateField('servingUnit', value)}
                  placeholder="e.g. egg, slice, cookie, cup"
                />
              </View>
              <View style={styles.servingCellNarrow}>
                <FoodSubmissionField
                  label="Equivalent g"
                  value={form.servingMetricGramsInput}
                  onChangeText={(value) =>
                    updateField('servingMetricGramsInput', sanitizeMetricInput(value))
                  }
                  keyboardType="decimal-pad"
                  placeholder="e.g. 50"
                />
              </View>
            </View>

            <Text style={styles.servingHint}>
              Food-specific serving supports entries like `1 egg` or `1 slice`. The
              gram equivalent powers universal `g` and `oz` logging later.
            </Text>

            {detectedServingText ? (
              <Text style={styles.servingHint}>OCR detected: {detectedServingText}</Text>
            ) : null}

            <FoodSubmissionField
              label="Calories (Per Label Serving)"
              value={form.calories}
              onChangeText={(value) => updateField('calories', value)}
              keyboardType="decimal-pad"
              placeholder="kcal"
            />

            <View style={styles.macroRow}>
              <View style={styles.macroCell}>
                <FoodSubmissionField
                  label="Protein (Per Label Serving)"
                  value={form.protein}
                  onChangeText={(value) => updateField('protein', value)}
                  keyboardType="decimal-pad"
                  placeholder="g"
                />
              </View>
              <View style={styles.macroCell}>
                <FoodSubmissionField
                  label="Carbs (Per Label Serving)"
                  value={form.carbs}
                  onChangeText={(value) => updateField('carbs', value)}
                  keyboardType="decimal-pad"
                  placeholder="g"
                />
              </View>
            </View>

            <View style={styles.macroRow}>
              <View style={styles.macroCell}>
                <FoodSubmissionField
                  label="Fat (Per Label Serving)"
                  value={form.fat}
                  onChangeText={(value) => updateField('fat', value)}
                  keyboardType="decimal-pad"
                  placeholder="g"
                />
              </View>
              <View style={styles.macroCell}>
                <FoodSubmissionField
                  label="Fiber (Per Label Serving)"
                  value={form.fiber}
                  onChangeText={(value) => updateField('fiber', value)}
                  keyboardType="decimal-pad"
                  placeholder="g"
                />
              </View>
            </View>

            <FoodSubmissionField
              label="Sodium (Per Label Serving)"
              value={form.sodium}
              onChangeText={(value) => updateField('sodium', value)}
              keyboardType="decimal-pad"
              placeholder="mg"
            />

            <FoodSubmissionField
              label="Ingredients Text"
              value={form.ingredientsText}
              onChangeText={(value) => updateField('ingredientsText', value)}
              multiline
              placeholder="Ingredient list"
            />
          </View>

          {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}

          <TouchableOpacity
            style={[styles.buttonPrimary, styles.confirmButton]}
            activeOpacity={0.9}
            onPress={handleConfirm}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={colors.blkText} />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={18} color={colors.blkText} />
                <Text style={styles.buttonTextPrimary}>Confirm and Create Food</Text>
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
    panelSoft: {
      backgroundColor: HOME_TONES.surface2,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      padding: 18,
    },
    centerState: {
      marginTop: 12,
      alignItems: 'center',
      gap: 10,
      paddingVertical: 26,
    },
    stateText: {
      color: HOME_TONES.textSecondary,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 18,
    },
    scroll: {
      flex: 1,
    },
    content: {
      paddingTop: 8,
      paddingBottom: 28,
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
    metaCard: {
      borderRadius: 22,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      backgroundColor: HOME_TONES.surface2,
      paddingHorizontal: 16,
      paddingVertical: 14,
      gap: 4,
    },
    metaLabel: {
      color: HOME_TONES.textTertiary,
      fontFamily: fonts.label,
      fontSize: 10,
      lineHeight: 12,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    metaValue: {
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.heading,
      fontSize: 14,
      lineHeight: 18,
    },
    metaHint: {
      color: HOME_TONES.textSecondary,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 16,
    },
    formCard: {
      borderRadius: 22,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      backgroundColor: HOME_TONES.surface1,
      padding: 14,
      gap: 10,
    },
    macroRow: {
      flexDirection: 'row',
      gap: 10,
    },
    macroCell: {
      flex: 1,
    },
    servingRow: {
      flexDirection: 'row',
      gap: 10,
    },
    servingCellWide: {
      flex: 1.2,
    },
    servingCellNarrow: {
      flex: 0.8,
    },
    servingHint: {
      color: HOME_TONES.textSecondary,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 17,
    },
    errorText: {
      color: colors.danger,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 18,
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
    buttonTextPrimary: {
      color: colors.blkText,
      fontFamily: fonts.heading,
      fontSize: 14,
      lineHeight: 18,
    },
    confirmButton: {
      marginTop: 2,
    },
  });
}
