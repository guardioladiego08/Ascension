// @ts-nocheck
/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

const OPENAI_API_URL = 'https://api.openai.com/v1/responses';
const OPENAI_MODEL = Deno.env.get('OPENAI_MODEL') ?? 'gpt-5-nano';

const EXTRACTED_FIELDS = {
  type: 'object',
  additionalProperties: false,
  required: [
    'foodName',
    'brand',
    'barcode',
    'servingSize',
    'calories',
    'protein',
    'carbs',
    'fat',
    'fiber',
    'sodium',
    'ingredientsText',
  ],
  properties: {
    foodName: { type: 'string' },
    brand: { type: 'string' },
    barcode: { type: 'string' },
    servingSize: { type: 'string' },
    calories: { type: 'string' },
    protein: { type: 'string' },
    carbs: { type: 'string' },
    fat: { type: 'string' },
    fiber: { type: 'string' },
    sodium: { type: 'string' },
    ingredientsText: { type: 'string' },
  },
} as const;

const RESPONSE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['rawText', 'extracted'],
  properties: {
    rawText: { type: 'string' },
    extracted: EXTRACTED_FIELDS,
  },
} as const;

const EXTRACTION_PROMPT = [
  'You extract nutrition label data from packaged food images.',
  'You may receive up to three images: a nutrition facts panel, an ingredients panel, and the front of package.',
  'Return only structured JSON that matches the provided schema.',
  'Rules:',
  '- Read only visible text and do not invent values.',
  '- Use empty strings for fields you cannot read confidently.',
  '- Keep servingSize human-readable, for example "2/3 cup (55g)".',
  '- Return calories, protein, carbs, fat, fiber, and sodium as numeric strings without units.',
  '- Convert sodium to milligrams when possible.',
  '- Prefer the explicit barcode from the request. Only read it from the package if the request barcode is empty.',
  '- ingredientsText should be one readable string from the ingredients panel.',
  '- rawText should be a compact transcription of the nutrition facts and ingredients text you can read.',
].join('\n');

type NutritionOcrRequest = {
  barcode?: string | null;
  nutritionFactsImageUrl?: string;
  ingredientsImageUrl?: string;
  frontPackageImageUrl?: string | null;
};

class HttpError extends Error {
  status: number;
  details: unknown;

  constructor(status: number, message: string, details: unknown = null) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: corsHeaders,
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function toCleanString(value: unknown, fallback = '') {
  const next = String(value ?? '').trim();
  return next || fallback;
}

function normalizeUrl(value: unknown, fieldName: string, required: boolean) {
  const next = toCleanString(value);
  if (!next) {
    if (required) throw new HttpError(400, `${fieldName} is required.`);
    return null;
  }

  try {
    const parsed = new URL(next);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('Unsupported protocol');
    }
  } catch {
    throw new HttpError(400, `${fieldName} must be a valid http(s) URL.`);
  }

  return next;
}

function normalizeRequest(value: unknown) {
  if (!isRecord(value)) {
    throw new HttpError(400, 'Request body must be a JSON object.');
  }

  const request = value as NutritionOcrRequest;

  return {
    barcode: toCleanString(request.barcode),
    nutritionFactsImageUrl: normalizeUrl(
      request.nutritionFactsImageUrl,
      'nutritionFactsImageUrl',
      true
    ),
    ingredientsImageUrl: normalizeUrl(request.ingredientsImageUrl, 'ingredientsImageUrl', true),
    frontPackageImageUrl: normalizeUrl(
      request.frontPackageImageUrl,
      'frontPackageImageUrl',
      false
    ),
  };
}

function normalizeExtracted(value: unknown, fallbackBarcode: string) {
  const parsed = isRecord(value) ? value : {};

  return {
    foodName: toCleanString(parsed.foodName ?? parsed.name),
    brand: toCleanString(parsed.brand),
    barcode: toCleanString(parsed.barcode, fallbackBarcode),
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

function extractOutputText(payload: unknown): string | null {
  if (!isRecord(payload)) return null;

  const direct = payload.output_text;
  if (typeof direct === 'string' && direct.trim()) {
    return direct;
  }

  const output = payload.output;
  if (!Array.isArray(output)) return null;

  for (const item of output) {
    if (!isRecord(item) || item.type !== 'message' || !Array.isArray(item.content)) {
      continue;
    }

    for (const contentItem of item.content) {
      if (isRecord(contentItem) && typeof contentItem.text === 'string' && contentItem.text.trim()) {
        return contentItem.text;
      }
    }
  }

  return null;
}

function normalizeModelResponse(payload: unknown, fallbackBarcode: string) {
  const outputText = extractOutputText(payload);
  if (!outputText) {
    throw new HttpError(502, 'OpenAI response did not include structured output.', payload);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(outputText);
  } catch {
    throw new HttpError(502, 'OpenAI returned invalid JSON output.', outputText);
  }

  const next = isRecord(parsed) ? parsed : {};

  return {
    rawText: toCleanString(next.rawText ?? next.raw_text),
    extracted: normalizeExtracted(next.extracted ?? next, fallbackBarcode),
  };
}

function buildOpenAiRequest(input: ReturnType<typeof normalizeRequest>) {
  const userText = [
    `barcode_from_scan: ${input.barcode || 'not provided'}`,
    'Use the nutrition facts and ingredients images as the source of truth for values.',
    'Use the front-package image only for product name and brand when it helps.',
  ].join('\n');

  const content = [
    {
      type: 'input_text',
      text: userText,
    },
    {
      type: 'input_image',
      image_url: input.nutritionFactsImageUrl,
      detail: 'high',
    },
    {
      type: 'input_image',
      image_url: input.ingredientsImageUrl,
      detail: 'high',
    },
  ] as Array<Record<string, unknown>>;

  if (input.frontPackageImageUrl) {
    content.push({
      type: 'input_image',
      image_url: input.frontPackageImageUrl,
      detail: 'high',
    });
  }

  return {
    model: OPENAI_MODEL,
    reasoning: {
      effort: 'minimal',
    },
    input: [
      {
        role: 'developer',
        content: [
          {
            type: 'input_text',
            text: EXTRACTION_PROMPT,
          },
        ],
      },
      {
        role: 'user',
        content,
      },
    ],
    text: {
      format: {
        type: 'json_schema',
        name: 'nutrition_ocr',
        schema: RESPONSE_SCHEMA,
        strict: true,
      },
    },
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      throw new HttpError(405, 'Method not allowed.');
    }

    const openAiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAiApiKey) {
      throw new HttpError(500, 'OPENAI_API_KEY is not configured in Supabase secrets.');
    }

    const input = normalizeRequest(await req.json());

    const openAiResponse = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openAiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(buildOpenAiRequest(input)),
    });

    const responsePayload = await openAiResponse.json();
    if (!openAiResponse.ok) {
      throw new HttpError(502, 'OpenAI request failed.', responsePayload);
    }

    const normalized = normalizeModelResponse(responsePayload, input.barcode);

    return jsonResponse({
      provider: 'openai',
      model: OPENAI_MODEL,
      rawText: normalized.rawText,
      extracted: normalized.extracted,
      usage: isRecord(responsePayload) ? responsePayload.usage ?? null : null,
    });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    const message = error instanceof Error ? error.message : 'Unexpected OCR function error.';
    const details = error instanceof HttpError ? error.details : null;

    console.error('[nutrition-ocr] request failed', {
      status,
      message,
      details,
    });

    return jsonResponse(
      {
        error: message,
        details,
      },
      status
    );
  }
});
