import {
  isHealthDataAvailable,
  queryQuantitySamples,
  requestAuthorization,
} from '@kingstinct/react-native-healthkit';
import { Platform } from 'react-native';

import type { AppleHealthAuthorizationStatus } from '@/lib/health/preferences';

export type AppleHeartRateSample = {
  sampleUuid: string | null;
  sampleStartAt: string;
  sampleEndAt: string;
  bpm: number;
  sourceName: string | null;
  sourceBundleId: string | null;
  deviceName: string | null;
  deviceModel: string | null;
  metadata: Record<string, unknown>;
};

type AppleHealthAuthorizationResult = {
  status: AppleHealthAuthorizationStatus;
  error: string | null;
};

const HEART_RATE_IDENTIFIER = 'HKQuantityTypeIdentifierHeartRate';
const HEART_RATE_UNIT = 'count/min';
const HEALTH_DEBUG_PREFIX = '[HealthDebug]';
const HEART_RATE_QUERY_BUFFER_MS = 2 * 60 * 1000;

function asStringOrNull(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const next = value.trim();
  return next.length > 0 ? next : null;
}

function toJsonSafeValue(value: unknown): unknown {
  if (value == null) return null;

  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map((item) => toJsonSafeValue(item));
  }

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(record).map(([key, nested]) => [key, toJsonSafeValue(nested)])
    );
  }

  return String(value);
}

function asIsoString(value: Date | string | null | undefined): string | null {
  if (!value) return null;

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function clampDateWithBuffer(date: Date, deltaMs: number) {
  return new Date(date.getTime() + deltaMs);
}

function overlapsRange(
  sampleStart: Date,
  sampleEnd: Date,
  rangeStart: Date,
  rangeEnd: Date
) {
  return sampleStart.getTime() <= rangeEnd.getTime() &&
    sampleEnd.getTime() >= rangeStart.getTime();
}

export function isAppleHealthKitAvailable(): boolean {
  if (Platform.OS !== 'ios') return false;

  try {
    return isHealthDataAvailable();
  } catch {
    return false;
  }
}

export function getAppleHealthUnavailableMessage(): string {
  if (Platform.OS !== 'ios') {
    return 'Apple Health is available only on iPhone.';
  }

  return 'Apple HealthKit is not available in this build yet. Create a new iOS dev build with the native HealthKit module enabled and try again.';
}

export function formatAppleHealthError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  if (error && typeof error === 'object' && 'message' in error) {
    const message = asStringOrNull((error as { message?: unknown }).message);
    if (message) return message;
  }

  return 'Apple Health request failed.';
}

export function inferAppleHealthAuthorizationStatusFromError(
  error: unknown
): AppleHealthAuthorizationStatus {
  const message = formatAppleHealthError(error).toLowerCase();

  if (
    message.includes('not available') ||
    message.includes('only available on ios') ||
    message.includes('native') ||
    message.includes('build')
  ) {
    return 'unavailable';
  }

  if (
    message.includes('denied') ||
    message.includes('not authorized') ||
    message.includes('authorization') ||
    message.includes('permission')
  ) {
    return 'denied';
  }

  return 'not_determined';
}

export async function requestAppleHeartRateAuthorization(): Promise<AppleHealthAuthorizationResult> {
  if (!isAppleHealthKitAvailable()) {
    console.log(`${HEALTH_DEBUG_PREFIX} request auth skipped: unavailable`);
    return {
      status: 'unavailable',
      error: getAppleHealthUnavailableMessage(),
    };
  }

  try {
    console.log(`${HEALTH_DEBUG_PREFIX} requesting Apple Health read authorization`, {
      identifier: HEART_RATE_IDENTIFIER,
    });

    const granted = await requestAuthorization({
      toRead: [HEART_RATE_IDENTIFIER],
    });

    if (granted) {
      console.log(`${HEALTH_DEBUG_PREFIX} authorization granted`);
      return {
        status: 'authorized',
        error: null,
      };
    }

    console.log(`${HEALTH_DEBUG_PREFIX} authorization returned false`);
    return {
      // HealthKit doesn't expose a reliable read-permission status query.
      // If the explicit authorization request returns false, treat it as denied.
      status: 'denied',
      error: 'Apple Health access was not granted.',
    };
  } catch (error) {
    console.warn(`${HEALTH_DEBUG_PREFIX} authorization threw`, error);
    return {
      status: inferAppleHealthAuthorizationStatusFromError(error),
      error: formatAppleHealthError(error),
    };
  }
}

export async function getAppleHeartRateSamplesForRange(params: {
  startDate: string;
  endDate: string;
}): Promise<AppleHeartRateSample[]> {
  if (!isAppleHealthKitAvailable()) {
    throw new Error(getAppleHealthUnavailableMessage());
  }

  const exactStart = new Date(params.startDate);
  const exactEnd = new Date(params.endDate);
  const bufferedStart = clampDateWithBuffer(exactStart, -HEART_RATE_QUERY_BUFFER_MS);
  const bufferedEnd = clampDateWithBuffer(exactEnd, HEART_RATE_QUERY_BUFFER_MS);

  console.log(`${HEALTH_DEBUG_PREFIX} querying heart rate samples`, {
    startDate: params.startDate,
    endDate: params.endDate,
    bufferedStartDate: bufferedStart.toISOString(),
    bufferedEndDate: bufferedEnd.toISOString(),
    identifier: HEART_RATE_IDENTIFIER,
    unit: HEART_RATE_UNIT,
  });

  const rawSamples = await queryQuantitySamples(HEART_RATE_IDENTIFIER, {
    unit: HEART_RATE_UNIT,
    limit: 0,
    ascending: true,
    filter: {
      date: {
        startDate: bufferedStart,
        endDate: bufferedEnd,
      },
    },
  });

  const normalizedSamples = rawSamples
    .map((sample) => {
      const sampleStartAt = asIsoString(sample.startDate);
      const sampleEndAt = asIsoString(sample.endDate);

      if (!sampleStartAt || !sampleEndAt || !Number.isFinite(sample.quantity)) {
        return null;
      }

      return {
        sampleUuid: asStringOrNull(sample.uuid),
        sampleStartAt,
        sampleEndAt,
        bpm: Number(sample.quantity.toFixed(2)),
        sourceName: asStringOrNull(sample.sourceRevision?.source?.name),
        sourceBundleId: asStringOrNull(sample.sourceRevision?.source?.bundleIdentifier),
        deviceName: asStringOrNull(sample.device?.name),
        deviceModel: asStringOrNull(sample.device?.model),
        metadata: (toJsonSafeValue(sample.metadata) as Record<string, unknown>) ?? {},
      };
    })
    .filter((sample): sample is AppleHeartRateSample => sample != null)
    .filter((sample) => {
      const sampleStart = new Date(sample.sampleStartAt);
      const sampleEnd = new Date(sample.sampleEndAt);
      return overlapsRange(sampleStart, sampleEnd, exactStart, exactEnd);
    });

  console.log(`${HEALTH_DEBUG_PREFIX} heart rate query completed`, {
    rawReturnedCount: rawSamples.length,
    returnedCount: normalizedSamples.length,
    firstSample: normalizedSamples[0] ?? null,
    lastSample:
      normalizedSamples.length > 0
        ? normalizedSamples[normalizedSamples.length - 1]
        : null,
  });

  return normalizedSamples;
}
