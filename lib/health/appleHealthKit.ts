import { Platform } from 'react-native';

import type {
  HealthAuthorizationResult,
  HealthAuthorizationStatus,
  HealthHeartRateSample,
} from '@/lib/health/types';

export type AppleHeartRateSample = HealthHeartRateSample;

const HEART_RATE_IDENTIFIER = 'HKQuantityTypeIdentifierHeartRate';
const HEART_RATE_UNIT = 'count/min';
const HEALTH_DEBUG_PREFIX = '[HealthDebug]';
const HEART_RATE_QUERY_BUFFER_MS = 2 * 60 * 1000;
let healthKitLoadLogged = false;
let healthKitLoadErrorMessage: string | null = null;
let cachedHealthKitModule: HealthKitModule | null = null;

type HealthKitQuantitySample = {
  uuid?: unknown;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  quantity?: unknown;
  sourceRevision?: {
    source?: {
      name?: unknown;
      bundleIdentifier?: unknown;
    } | null;
  } | null;
  device?: {
    name?: unknown;
    model?: unknown;
  } | null;
  metadata?: unknown;
};

type HealthKitModule = {
  isHealthDataAvailable?: () => boolean;
  requestAuthorization?: (params: {
    toRead?: string[];
    toShare?: string[];
  }) => Promise<boolean>;
  queryQuantitySamples?: (
    identifier: string,
    options: {
      unit?: string;
      limit?: number;
      ascending?: boolean;
      filter?: {
        date?: {
          startDate?: Date;
          endDate?: Date;
        };
      };
    }
  ) => Promise<HealthKitQuantitySample[]>;
};

function asStringOrNull(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const next = value.trim();
  return next.length > 0 ? next : null;
}

function getHealthKitModuleCandidates(value: unknown): Array<Record<string, unknown>> {
  if (!value || typeof value !== 'object') return [];

  const record = value as Record<string, unknown>;
  const candidates: Array<Record<string, unknown>> = [record];

  if (record.default && typeof record.default === 'object') {
    candidates.push(record.default as Record<string, unknown>);
  }

  return candidates;
}

function getFunctionFromCandidates<T extends (...args: any[]) => any>(
  candidates: Array<Record<string, unknown>>,
  key: string
): T | undefined {
  for (const candidate of candidates) {
    const value = candidate[key];
    if (typeof value === 'function') {
      return value as T;
    }
  }

  return undefined;
}

function normalizeHealthKitModule(value: unknown): HealthKitModule | null {
  const candidates = getHealthKitModuleCandidates(value);
  if (candidates.length === 0) return null;

  const isHealthDataAvailable = getFunctionFromCandidates<
    NonNullable<HealthKitModule['isHealthDataAvailable']>
  >(candidates, 'isHealthDataAvailable');
  const requestAuthorization = getFunctionFromCandidates<
    NonNullable<HealthKitModule['requestAuthorization']>
  >(candidates, 'requestAuthorization');
  const queryQuantitySamples = getFunctionFromCandidates<
    NonNullable<HealthKitModule['queryQuantitySamples']>
  >(candidates, 'queryQuantitySamples');

  if (!isHealthDataAvailable || !requestAuthorization || !queryQuantitySamples) {
    return null;
  }

  return {
    isHealthDataAvailable,
    requestAuthorization,
    queryQuantitySamples,
  };
}

function getHealthKitModule(): HealthKitModule | null {
  if (Platform.OS !== 'ios') return null;
  if (cachedHealthKitModule) return cachedHealthKitModule;

  try {
    const module = normalizeHealthKitModule(require('@kingstinct/react-native-healthkit'));

    if (!module) {
      healthKitLoadErrorMessage =
        'The Apple Health native module loaded without the required API surface.';
      return null;
    }

    cachedHealthKitModule = module;
    healthKitLoadErrorMessage = null;
    return module;
  } catch (error) {
    const asErrString = asStringOrNull(
      error && typeof error === 'object' && 'message' in error
        ? (error as { message?: unknown }).message
        : error
    );
    healthKitLoadErrorMessage = asErrString ?? 'Native NitroModules were not found in this build.';

    if (!healthKitLoadLogged) {
      healthKitLoadLogged = true;
      console.warn(
        `${HEALTH_DEBUG_PREFIX} native module load failed: ${healthKitLoadErrorMessage}`
      );
    }
    return null;
  }
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
  const healthKit = getHealthKitModule();
  if (!healthKit?.isHealthDataAvailable) return false;

  try {
    return healthKit.isHealthDataAvailable();
  } catch {
    return false;
  }
}

export function getAppleHealthUnavailableMessage(): string {
  if (Platform.OS !== 'ios') {
    return 'Apple Health is available only on iPhone.';
  }

  if (healthKitLoadErrorMessage) {
    return `${healthKitLoadErrorMessage} Rebuild the iOS dev client after prebuild so NitroModules and HealthKit are linked.`;
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
): HealthAuthorizationStatus {
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

export async function requestAppleHeartRateAuthorization(): Promise<HealthAuthorizationResult> {
  const healthKit = getHealthKitModule();
  if (!healthKit?.requestAuthorization || !isAppleHealthKitAvailable()) {
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

    const granted = await healthKit.requestAuthorization({
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
}): Promise<HealthHeartRateSample[]> {
  const healthKit = getHealthKitModule();
  if (!healthKit?.queryQuantitySamples || !isAppleHealthKitAvailable()) {
    throw new Error(getAppleHealthUnavailableMessage());
  }

  const requestedStart = new Date(params.startDate);
  const requestedEnd = new Date(params.endDate);
  if (
    Number.isNaN(requestedStart.getTime()) ||
    Number.isNaN(requestedEnd.getTime())
  ) {
    throw new Error('Invalid workout time window. Start/end timestamps are not valid ISO dates.');
  }

  const needsSwap = requestedStart.getTime() > requestedEnd.getTime();
  const exactStart = needsSwap ? requestedEnd : requestedStart;
  const exactEnd = needsSwap ? requestedStart : requestedEnd;
  const bufferedStart = clampDateWithBuffer(exactStart, -HEART_RATE_QUERY_BUFFER_MS);
  const bufferedEnd = clampDateWithBuffer(exactEnd, HEART_RATE_QUERY_BUFFER_MS);

  if (needsSwap) {
    console.warn(`${HEALTH_DEBUG_PREFIX} heart rate range was inverted; swapped start/end`, {
      requestedStartDate: params.startDate,
      requestedEndDate: params.endDate,
      resolvedStartDate: exactStart.toISOString(),
      resolvedEndDate: exactEnd.toISOString(),
    });
  }

  console.log(`${HEALTH_DEBUG_PREFIX} querying heart rate samples`, {
    startDate: exactStart.toISOString(),
    endDate: exactEnd.toISOString(),
    bufferedStartDate: bufferedStart.toISOString(),
    bufferedEndDate: bufferedEnd.toISOString(),
    identifier: HEART_RATE_IDENTIFIER,
    unit: HEART_RATE_UNIT,
  });

  const rawSamples = await healthKit.queryQuantitySamples(HEART_RATE_IDENTIFIER, {
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
      const quantity = Number(sample.quantity);

      if (!sampleStartAt || !sampleEndAt || !Number.isFinite(quantity)) {
        return null;
      }

      return {
        sampleUuid: asStringOrNull(sample.uuid),
        sampleStartAt,
        sampleEndAt,
        bpm: Number(quantity.toFixed(2)),
        sourceName: asStringOrNull(sample.sourceRevision?.source?.name),
        sourceBundleId: asStringOrNull(sample.sourceRevision?.source?.bundleIdentifier),
        deviceName: asStringOrNull(sample.device?.name),
        deviceModel: asStringOrNull(sample.device?.model),
        metadata: (toJsonSafeValue(sample.metadata) as Record<string, unknown>) ?? {},
      };
    })
    .filter((sample): sample is HealthHeartRateSample => sample != null)
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
