export const NUTRITION_BARCODE_TYPES = ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128'] as const;

export function normalizeScannedBarcode(rawValue: string | null | undefined) {
  const trimmed = String(rawValue ?? '').trim();
  if (!trimmed) return null;
  return trimmed;
}

export function isDuplicateBarcodeScan(
  currentValue: string,
  previousValue: string | null,
  elapsedMs: number,
  cooldownMs = 1400
) {
  return previousValue === currentValue && elapsedMs >= 0 && elapsedMs < cooldownMs;
}
