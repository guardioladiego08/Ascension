import { supabase } from '@/lib/supabase';

import type { JsonObject, JsonValue } from '@/lib/nutrition/dataAccess';

export type ExtractedFoodFields = {
  foodName: string;
  brand: string;
  barcode: string;
  servingSize: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  fiber: string;
  sodium: string;
  ingredientsText: string;
};

export type NutritionOcrInput = {
  barcode: string | null;
  nutritionFactsImageUrl: string;
  ingredientsImageUrl: string;
  frontPackageImageUrl: string | null;
};

export type NutritionOcrResult = {
  provider: 'edge_function' | 'mock';
  rawText: string | null;
  extracted: ExtractedFoodFields;
  rawPayload: JsonValue | null;
};

type NutritionOcrProvider = {
  extract(input: NutritionOcrInput): Promise<NutritionOcrResult>;
};

const EDGE_FUNCTION_NAME = process.env.EXPO_PUBLIC_NUTRITION_OCR_FUNCTION_NAME ?? null;

function toCleanString(value: unknown, fallback = '') {
  const next = String(value ?? '').trim();
  return next || fallback;
}

function toExtractedFoodFields(value: unknown, fallbackBarcode: string | null): ExtractedFoodFields {
  const parsed =
    value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};

  return {
    foodName: toCleanString(parsed.foodName ?? parsed.name),
    brand: toCleanString(parsed.brand),
    barcode: toCleanString(parsed.barcode ?? fallbackBarcode),
    servingSize: toCleanString(parsed.servingSize ?? parsed.serving_size, '1 serving'),
    calories: toCleanString(parsed.calories),
    protein: toCleanString(parsed.protein),
    carbs: toCleanString(parsed.carbs),
    fat: toCleanString(parsed.fat),
    fiber: toCleanString(parsed.fiber),
    sodium: toCleanString(parsed.sodium),
    ingredientsText: toCleanString(parsed.ingredientsText ?? parsed.ingredients_text),
  };
}

const mockOcrProvider: NutritionOcrProvider = {
  async extract(input) {
    const barcodeSuffix = input.barcode ? input.barcode.slice(-4) : '';
    const inferredName = barcodeSuffix ? `Scanned Product ${barcodeSuffix}` : '';

    return {
      provider: 'mock',
      rawText: null,
      extracted: {
        foodName: inferredName,
        brand: '',
        barcode: input.barcode ?? '',
        servingSize: '1 serving',
        calories: '',
        protein: '',
        carbs: '',
        fat: '',
        fiber: '',
        sodium: '',
        ingredientsText: '',
      },
      rawPayload: {
        mock: true,
      } satisfies JsonObject,
    };
  },
};

function buildEdgeFunctionProvider(functionName: string): NutritionOcrProvider {
  return {
    async extract(input) {
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: input,
      });

      if (error) throw error;

      const parsed =
        data && typeof data === 'object' && !Array.isArray(data)
          ? (data as Record<string, unknown>)
          : {};

      return {
        provider: 'edge_function',
        rawText: toCleanString(parsed.rawText ?? parsed.raw_text) || null,
        extracted: toExtractedFoodFields(parsed.extracted ?? parsed, input.barcode),
        rawPayload: (data ?? null) as JsonValue | null,
      };
    },
  };
}

export async function extractFoodFieldsFromLabelPhotos(
  input: NutritionOcrInput
): Promise<NutritionOcrResult> {
  if (!EDGE_FUNCTION_NAME) {
    return mockOcrProvider.extract(input);
  }

  try {
    const edgeProvider = buildEdgeFunctionProvider(EDGE_FUNCTION_NAME);
    return await edgeProvider.extract(input);
  } catch (error) {
    console.warn('[Nutrition OCR] Edge function failed, falling back to mock parser.', error);
    return mockOcrProvider.extract(input);
  }
}
