# `nutrition-ocr`

Supabase Edge Function that extracts nutrition facts from uploaded label images.

## Request

```json
{
  "barcode": "012345678905",
  "nutritionFactsImageUrl": "https://...",
  "ingredientsImageUrl": "https://...",
  "frontPackageImageUrl": "https://..."
}
```

## Response

```json
{
  "provider": "openai",
  "model": "gpt-4o",
  "rawText": "Nutrition Facts ... Ingredients ...",
  "extracted": {
    "foodName": "Example Product",
    "brand": "Example Brand",
    "barcode": "012345678905",
    "servingSize": "2/3 cup (55g)",
    "calories": "230",
    "protein": "3",
    "carbs": "37",
    "fat": "8",
    "fiber": "4",
    "sodium": "160",
    "ingredientsText": "Whole grain oats, sugar, salt"
  }
}
```

## Required Secrets

- `OPENAI_API_KEY`
- `OPENAI_MODEL` optional, defaults to `gpt-5-nano`

## Deploy

```bash
npx supabase functions deploy nutrition-ocr --project-ref cfqluyvpdoequabmbbnc
```

## Set Secrets

```bash
npx supabase secrets set OPENAI_API_KEY=YOUR_KEY OPENAI_MODEL=gpt-5-nano --project-ref cfqluyvpdoequabmbbnc
```

## App Env

Set this Expo env locally and in EAS:

```bash
EXPO_PUBLIC_NUTRITION_OCR_FUNCTION_NAME=nutrition-ocr
```
