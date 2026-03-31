import { FunctionsHttpError } from '@supabase/functions-js';

import { supabase } from '@/lib/supabase';
import { DELETE_ACCOUNT_CONFIRMATION_TEXT } from '@/lib/accountDeletion/constants';

const DELETE_ACCOUNT_FUNCTION_NAME =
  process.env.EXPO_PUBLIC_DELETE_ACCOUNT_FUNCTION_NAME ?? 'delete-account';

function toCleanString(value: unknown) {
  return String(value ?? '').trim();
}

function sanitizeFunctionErrorText(value: unknown): string | null {
  const message = toCleanString(value).replace(/\s+/g, ' ');
  if (!message) return null;

  const lowerMessage = message.toLowerCase();
  if (lowerMessage.includes('<html') || lowerMessage.startsWith('<!doctype')) {
    return null;
  }

  return message;
}

function mapFunctionErrorPayload(payload: Record<string, unknown>): string | null {
  const code = toCleanString(payload.code).toUpperCase();
  const errorMessage =
    sanitizeFunctionErrorText(payload.error) ?? sanitizeFunctionErrorText(payload.message);

  if (code === 'NOT_FOUND') {
    return `The "${DELETE_ACCOUNT_FUNCTION_NAME}" edge function is not deployed on the connected Supabase project.`;
  }

  return errorMessage;
}

async function readFunctionHttpErrorMessage(response: Response): Promise<string | null> {
  const jsonResponse = typeof response.clone === 'function' ? response.clone() : response;

  if (typeof jsonResponse.json === 'function') {
    try {
      const payload = await jsonResponse.json();
      if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
        const message = mapFunctionErrorPayload(payload as Record<string, unknown>);
        if (message) return message;
      }
    } catch {
      // Fall back to plain-text/platform responses below.
    }
  }

  const textResponse = typeof response.clone === 'function' ? response.clone() : response;

  if (typeof textResponse.text === 'function') {
    try {
      const message = sanitizeFunctionErrorText(await textResponse.text());
      if (message) return message;
    } catch {
      return null;
    }
  }

  return null;
}

function formatFunctionHttpStatus(response: Response): string | null {
  const status = typeof response.status === 'number' ? response.status : 0;
  if (!status) return null;

  if (status === 401) {
    return 'Your session expired. Sign in again and retry account deletion.';
  }

  if (status === 404) {
    return `The "${DELETE_ACCOUNT_FUNCTION_NAME}" edge function is unavailable.`;
  }

  if (status >= 500) {
    return 'The delete-account function failed on the server. Please retry.';
  }

  return `Account deletion failed with HTTP ${status}.`;
}

async function parseFunctionHttpError(error: FunctionsHttpError): Promise<string | null> {
  const response = error.context;
  if (!response) return null;

  return (await readFunctionHttpErrorMessage(response)) ?? formatFunctionHttpStatus(response);
}

async function formatDeleteAccountError(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    const message = await parseFunctionHttpError(error);
    if (message) return message;
  }

  if (error instanceof Error && toCleanString(error.message)) {
    return error.message.trim();
  }

  return 'Failed to delete account.';
}

export async function deleteMyAccount(confirmation: string): Promise<void> {
  const normalizedConfirmation = toCleanString(confirmation);

  if (normalizedConfirmation !== DELETE_ACCOUNT_CONFIRMATION_TEXT) {
    throw new Error(`Type "${DELETE_ACCOUNT_CONFIRMATION_TEXT}" to confirm account deletion.`);
  }

  const { error } = await supabase.functions.invoke(DELETE_ACCOUNT_FUNCTION_NAME, {
    body: {
      confirmation: normalizedConfirmation,
    },
  });

  if (error) {
    throw new Error(await formatDeleteAccountError(error));
  }
}
