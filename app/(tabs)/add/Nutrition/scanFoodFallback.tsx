import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

import LogoHeader from '@/components/my components/logoHeader';
import FoodSubmissionPhotoCard from './components/FoodSubmissionPhotoCard';
import {
  createFoodSubmissionFromScan,
  getAuthenticatedNutritionUserId,
} from '@/lib/nutrition/dataAccess';
import { NUTRITION_ROUTES } from '@/lib/nutrition/navigation';
import { firstRouteParam } from '@/lib/nutrition/routeParams';
import { extractFoodFieldsFromLabelPhotos } from '@/lib/nutrition/ocr';
import { uploadNutritionSubmissionPhoto } from '@/lib/nutrition/storage';
import { useAppTheme } from '@/providers/AppThemeProvider';
import { HOME_TONES } from '../../home/tokens';

type PhotoKey = 'nutritionFacts' | 'ingredients' | 'frontPackage';

type PhotoState = {
  nutritionFacts: string | null;
  ingredients: string | null;
  frontPackage: string | null;
};

export default function ScanFoodFallback() {
  const router = useRouter();
  const { colors, fonts, globalStyles } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);

  const params = useLocalSearchParams<{ barcode?: string | string[] }>();
  const barcode = firstRouteParam(params.barcode);
  const hasBarcode = Boolean(barcode?.trim());

  const [photos, setPhotos] = useState<PhotoState>({
    nutritionFacts: null,
    ingredients: null,
    frontPackage: null,
  });
  const [notes, setNotes] = useState('');
  const [capturingKey, setCapturingKey] = useState<PhotoKey | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const capturePhoto = async (key: PhotoKey) => {
    setErrorText(null);
    setCapturingKey(key);

    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission needed',
          'Camera access is required to capture package and nutrition photos.'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });

      if (!result.canceled && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        setPhotos((prev) => ({
          ...prev,
          [key]: uri,
        }));
      }
    } catch (error) {
      console.warn('[ScanFoodFallback] Failed to capture image', error);
      setErrorText('Could not capture photo. Please try again.');
    } finally {
      setCapturingKey(null);
    }
  };

  const submitForReview = async () => {
    if (!hasBarcode) {
      setErrorText('No barcode found. Please rescan the product.');
      return;
    }

    if (!photos.nutritionFacts || !photos.ingredients) {
      Alert.alert(
        'Missing required photos',
        'Please capture both the nutrition facts label and ingredients label.'
      );
      return;
    }

    setSubmitting(true);
    setErrorText(null);

    try {
      const userId = await getAuthenticatedNutritionUserId();

      const nutritionUpload = await uploadNutritionSubmissionPhoto({
        userId,
        localUri: photos.nutritionFacts,
        kind: 'nutrition_facts',
      });

      const ingredientsUpload = await uploadNutritionSubmissionPhoto({
        userId,
        localUri: photos.ingredients,
        kind: 'ingredients',
      });

      const frontUpload = photos.frontPackage
        ? await uploadNutritionSubmissionPhoto({
            userId,
            localUri: photos.frontPackage,
            kind: 'front_package',
          })
        : null;

      const ocrResult = await extractFoodFieldsFromLabelPhotos({
        barcode,
        nutritionFactsImageUrl: nutritionUpload.publicUrl,
        ingredientsImageUrl: ingredientsUpload.publicUrl,
        frontPackageImageUrl: frontUpload?.publicUrl ?? null,
      });

      const labelImageUrls = [
        nutritionUpload.publicUrl,
        ingredientsUpload.publicUrl,
        frontUpload?.publicUrl,
      ].filter(Boolean) as string[];

      const submission = await createFoodSubmissionFromScan({
        barcode,
        labelImageUrls,
        ocrRawText: ocrResult.rawText,
        ocrPayload: {
          provider: ocrResult.provider,
          extracted: ocrResult.extracted,
          raw: ocrResult.rawPayload,
          images: {
            nutrition_facts: nutritionUpload.publicUrl,
            ingredients: ingredientsUpload.publicUrl,
            front_package: frontUpload?.publicUrl ?? null,
          },
        },
        notes: notes.trim() || null,
      });

      router.replace({
        pathname: NUTRITION_ROUTES.scanFoodConfirm,
        params: {
          submissionId: submission.id,
        },
      });
    } catch (error) {
      console.warn('[ScanFoodFallback] Failed to create fallback submission', error);
      setErrorText(
        error instanceof Error
          ? error.message
          : 'Could not submit this product right now. Please try again.'
      );
    } finally {
      setSubmitting(false);
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
            <Text style={styles.eyebrow}>Barcode Not Found</Text>
            <Text style={styles.header}>Capture package labels</Text>
            <Text style={styles.heroText}>
              We could not find this barcode in the food catalog. Capture labels, then
              review extracted fields before publishing.
            </Text>
          </View>

          <View style={styles.metaCard}>
            <Text style={styles.metaLabel}>Scanned Barcode</Text>
            <Text style={styles.metaValue}>{barcode ?? 'Unavailable'}</Text>
            {!hasBarcode ? (
              <Text style={styles.errorText}>Scan again to attach a valid barcode.</Text>
            ) : null}
          </View>

          <View style={styles.photosSection}>
            <FoodSubmissionPhotoCard
              label="Nutrition Facts"
              helperText="Capture the full nutrition facts panel."
              required
              imageUri={photos.nutritionFacts}
              loading={capturingKey === 'nutritionFacts'}
              onCapture={() => capturePhoto('nutritionFacts')}
            />

            <FoodSubmissionPhotoCard
              label="Ingredients"
              helperText="Capture the ingredient list clearly."
              required
              imageUri={photos.ingredients}
              loading={capturingKey === 'ingredients'}
              onCapture={() => capturePhoto('ingredients')}
            />

            <FoodSubmissionPhotoCard
              label="Front Package"
              helperText="Optional, but helps identify the product faster."
              imageUri={photos.frontPackage}
              loading={capturingKey === 'frontPackage'}
              onCapture={() => capturePhoto('frontPackage')}
            />
          </View>

          <View style={styles.notesCard}>
            <Text style={styles.notesLabel}>Extra Notes (Optional)</Text>
            <TextInput
              style={styles.notesInput}
              placeholder="Brand flavor, package size, or anything useful"
              placeholderTextColor={HOME_TONES.textTertiary}
              value={notes}
              onChangeText={setNotes}
            />
          </View>

          {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}

          <TouchableOpacity
            style={[styles.buttonPrimary, styles.submitButton]}
            activeOpacity={0.9}
            onPress={submitForReview}
            disabled={submitting || capturingKey != null || !hasBarcode}
          >
            {submitting ? (
              <ActivityIndicator color={colors.blkText} />
            ) : (
              <>
                <Ionicons name="arrow-forward-circle-outline" size={18} color={colors.blkText} />
                <Text style={styles.buttonTextPrimary}>Continue to Review</Text>
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
      fontSize: 15,
      lineHeight: 19,
    },
    photosSection: {
      gap: 10,
    },
    notesCard: {
      borderRadius: 18,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      backgroundColor: HOME_TONES.surface2,
      paddingHorizontal: 14,
      paddingVertical: 12,
      gap: 8,
    },
    notesLabel: {
      color: HOME_TONES.textTertiary,
      fontFamily: fonts.label,
      fontSize: 10,
      lineHeight: 12,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    notesInput: {
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.body,
      fontSize: 14,
      lineHeight: 18,
      paddingVertical: 4,
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
    submitButton: {
      marginTop: 2,
    },
  });
}
