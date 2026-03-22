# Nutrition OCR Deployment

## What `EXPO_PUBLIC_NUTRITION_OCR_FUNCTION_NAME` Is

This is not a credential issued by Expo or Supabase.

It is the name of the deployed Supabase Edge Function that the mobile app should invoke. In this repo the intended name is:

```bash
nutrition-ocr
```

That means:

```bash
EXPO_PUBLIC_NUTRITION_OCR_FUNCTION_NAME=nutrition-ocr
```

## Services Involved

1. Expo / React Native app
2. Supabase Storage for uploaded nutrition-label photos
3. Supabase Edge Functions for server-side OCR orchestration
4. OpenAI Responses API for image understanding and structured extraction
5. Supabase Postgres for storing the raw OCR payload and the user-confirmed food

## Runtime Flow

1. The app captures nutrition facts, ingredients, and optionally the front package.
2. The app uploads those photos to Supabase Storage and gets public URLs back.
3. The app calls `supabase.functions.invoke('nutrition-ocr', { body })`.
4. The `nutrition-ocr` edge function sends the image URLs to OpenAI.
5. OpenAI returns structured JSON for the nutrition fields.
6. The app stores the OCR payload in `nutrition.food_submissions`.
7. The user reviews and confirms the extracted data before it becomes a canonical food.

## Local App Env

`.env`

```bash
EXPO_PUBLIC_NUTRITION_OCR_FUNCTION_NAME=nutrition-ocr
```

## Supabase Secrets

Set these in the Supabase project before deploying or invoking the function:

```bash
npx supabase secrets set OPENAI_API_KEY=YOUR_KEY OPENAI_MODEL=gpt-5-nano --project-ref cfqluyvpdoequabmbbnc
```

`OPENAI_MODEL` is optional. The function defaults to `gpt-5-nano`.

## Deploy Command

```bash
npx supabase functions deploy nutrition-ocr --project-ref cfqluyvpdoequabmbbnc
```

## Local Serving Command

```bash
npx supabase functions serve nutrition-ocr --env-file supabase/.env.local
```

For local serving, create `supabase/.env.local` with:

```bash
OPENAI_API_KEY=YOUR_KEY
OPENAI_MODEL=gpt-5-nano
```

## EAS / Remote Builds

The app also needs `EXPO_PUBLIC_NUTRITION_OCR_FUNCTION_NAME=nutrition-ocr` in the EAS environment used for device builds, otherwise the bundled app will keep falling back to the mock OCR provider.
