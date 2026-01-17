// lib/errors.ts
export function formatSupabaseishError(err: any): string {
  if (!err) return 'Unknown error';
  if (typeof err === 'string') return err;

  const parts = [
    typeof err.message === 'string' ? err.message.trim() : '',
    typeof err.details === 'string' ? err.details.trim() : '',
    typeof err.hint === 'string' ? err.hint.trim() : '',
    typeof err.code === 'string' ? `code=${err.code}` : '',
    typeof err.status === 'number' ? `status=${err.status}` : '',
  ].filter(Boolean);

  if (parts.length) return parts.join(' • ');

  try {
    const s = JSON.stringify(err, Object.getOwnPropertyNames(err));
    return s && s !== '{}' ? s : 'Unknown error';
  } catch {
    return 'Unknown error';
  }
}

/**
 * Ensures the thrown value has a useful, non-empty `.message`.
 * - Preserves original object fields (code/details/hint/etc)
 * - Avoids `{"message": ""}` downstream
 */
export function normalizeThrown(err: any, fallbackMessage = 'Unknown error') {
  if (!err) return new Error(fallbackMessage);

  // If it’s already an Error with a good message, keep it.
  if (err instanceof Error) {
    if (err.message?.trim()) return err;
    err.message = fallbackMessage;
    return err;
  }

  // If it’s a plain object (Supabase/PostgREST errors often are),
  // force a non-empty message while preserving fields.
  const msg =
    (typeof err?.message === 'string' && err.message.trim()) ||
    (typeof err?.error_description === 'string' && err.error_description.trim()) ||
    fallbackMessage;

  try {
    (err as any).message = msg;
    return err;
  } catch {
    return new Error(msg);
  }
}
