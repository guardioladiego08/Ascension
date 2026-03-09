import { Linking, Platform } from 'react-native';

import type {
  HealthAuthorizationResult,
  HealthAvailabilityStatus,
  HealthHeartRateSample,
} from '@/lib/health/types';

const HEALTH_DEBUG_PREFIX = '[HealthDebug]';
const HEALTH_CONNECT_PROVIDER_PACKAGE = 'com.google.android.apps.healthdata';
const HEALTH_CONNECT_STORE_URI =
  'market://details?id=com.google.android.apps.healthdata&url=healthconnect%3A%2F%2Fonboarding';
const HEALTH_CONNECT_WEB_URI =
  'https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata&url=healthconnect%3A%2F%2Fonboarding';
const HEALTH_CONNECT_HEART_RATE_PERMISSION = {
  accessType: 'read',
  recordType: 'HeartRate',
} as const;

let healthConnectLoadLogged = false;
let healthConnectLoadErrorMessage: string | null = null;
let healthConnectLoadFailed = false;

type HealthConnectPermission = {
  accessType?: unknown;
  recordType?: unknown;
};

type HealthConnectGrantedPermission = string | HealthConnectPermission;

type HealthConnectHeartRateSample = {
  time?: unknown;
  beatsPerMinute?: unknown;
};

type HealthConnectHeartRateRecord = {
  startTime?: unknown;
  endTime?: unknown;
  samples?: unknown;
  metadata?: {
    id?: unknown;
    dataOrigin?: unknown;
    device?: {
      manufacturer?: unknown;
      model?: unknown;
      type?: unknown;
    } | null;
  } | null;
};

type HealthConnectModule = {
  getSdkStatus?: (providerPackageName?: string) => Promise<unknown>;
  initialize?: () => Promise<void>;
  getGrantedPermissions?: () => Promise<HealthConnectGrantedPermission[]>;
  requestPermission?: (
    permissions: Array<{ accessType: string; recordType: string }>
  ) => Promise<HealthConnectGrantedPermission[]>;
  readRecords?: (
    recordType: 'HeartRate',
    options: {
      timeRangeFilter: {
        operator: 'between';
        startTime: Date;
        endTime: Date;
      };
      pageSize?: number;
      ascendingOrder?: boolean;
    }
  ) => Promise<{ records?: HealthConnectHeartRateRecord[] }>;
  openHealthConnectSettings?: () => Promise<void>;
};

function asStringOrNull(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const next = value.trim();
  return next.length > 0 ? next : null;
}

function asDataOrigin(value: unknown): string | null {
  if (typeof value === 'string') {
    return asStringOrNull(value);
  }

  if (value && typeof value === 'object' && 'packageName' in value) {
    return asStringOrNull((value as { packageName?: unknown }).packageName);
  }

  return null;
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

function asIsoString(value: unknown): string | null {
  if (!value) return null;

  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function getHealthConnectModule(): HealthConnectModule | null {
  if (Platform.OS !== 'android') return null;
  if (healthConnectLoadFailed) return null;

  try {
    healthConnectLoadErrorMessage = null;
    return require('react-native-health-connect') as HealthConnectModule;
  } catch (error) {
    healthConnectLoadFailed = true;
    const message = asStringOrNull(
      error && typeof error === 'object' && 'message' in error
        ? (error as { message?: unknown }).message
        : error
    );
    healthConnectLoadErrorMessage =
      message ??
      'The Health Connect native module is not installed in this Android build.';

    if (!healthConnectLoadLogged) {
      healthConnectLoadLogged = true;
      console.warn(
        `${HEALTH_DEBUG_PREFIX} health connect module load failed: ${healthConnectLoadErrorMessage}`
      );
    }

    return null;
  }
}

function permissionMatches(
  permission: HealthConnectGrantedPermission,
  accessType: 'read' | 'write',
  recordType: string
) {
  if (typeof permission === 'string') {
    const lower = permission.toLowerCase();
    return lower.includes(accessType) && lower.includes(recordType.toLowerCase());
  }

  return (
    String(permission?.accessType ?? '').toLowerCase() === accessType &&
    String(permission?.recordType ?? '').toLowerCase() === recordType.toLowerCase()
  );
}

function mapSdkStatus(value: unknown): HealthAvailabilityStatus {
  const normalized = String(value ?? '').trim().toUpperCase();

  if (
    normalized === '3' ||
    (normalized.includes('AVAILABLE') && !normalized.includes('UNAVAILABLE'))
  ) {
    return 'available';
  }

  if (
    normalized === '2' ||
    normalized.includes('PROVIDER_UPDATE_REQUIRED') ||
    normalized.includes('UPDATE_REQUIRED')
  ) {
    return 'provider_update_required';
  }

  return 'unavailable';
}

async function ensureInitialized(module: HealthConnectModule) {
  if (!module.initialize) {
    throw new Error(
      'The installed Health Connect bridge is missing initialize(). Reinstall the Android build.'
    );
  }

  await module.initialize();
}

async function getGrantedPermissions(
  module: HealthConnectModule
): Promise<HealthConnectGrantedPermission[]> {
  if (!module.getGrantedPermissions) return [];
  return module.getGrantedPermissions();
}

function normalizeHeartRateRecords(
  records: HealthConnectHeartRateRecord[]
): HealthHeartRateSample[] {
  const normalized: HealthHeartRateSample[] = [];

  for (const record of records) {
    const recordStartAt = asIsoString(record.startTime);
    const recordEndAt = asIsoString(record.endTime);
    const metadata = (toJsonSafeValue(record.metadata) as Record<string, unknown>) ?? {};
    const recordId = asStringOrNull(record.metadata?.id);
    const dataOrigin = asDataOrigin(record.metadata?.dataOrigin);
    const deviceManufacturer = asStringOrNull(record.metadata?.device?.manufacturer);
    const deviceModel = asStringOrNull(record.metadata?.device?.model);
    const samples = Array.isArray(record.samples)
      ? (record.samples as HealthConnectHeartRateSample[])
      : [];

    for (const sample of samples) {
      const sampleAt = asIsoString(sample.time);
      const bpm = Number(sample.beatsPerMinute);
      if (!sampleAt || !Number.isFinite(bpm)) continue;

      normalized.push({
        sampleUuid: recordId ? `${recordId}:${sampleAt}` : sampleAt,
        sampleStartAt: sampleAt,
        sampleEndAt: sampleAt,
        bpm: Number(bpm.toFixed(2)),
        sourceName: null,
        sourceBundleId: dataOrigin,
        deviceName: deviceManufacturer,
        deviceModel,
        metadata: {
          ...metadata,
          record_start_at: recordStartAt,
          record_end_at: recordEndAt,
        },
      });
    }
  }

  return normalized.sort((a, b) => {
    return new Date(a.sampleStartAt).getTime() - new Date(b.sampleStartAt).getTime();
  });
}

export async function getHealthConnectAvailabilityStatus(): Promise<HealthAvailabilityStatus> {
  if (Platform.OS !== 'android') return 'unavailable';

  const healthConnect = getHealthConnectModule();
  if (!healthConnect?.getSdkStatus) return 'unavailable';

  try {
    const sdkStatus = await healthConnect.getSdkStatus(HEALTH_CONNECT_PROVIDER_PACKAGE);
    return mapSdkStatus(sdkStatus);
  } catch (error) {
    console.warn(`${HEALTH_DEBUG_PREFIX} getSdkStatus failed`, error);
    return 'unavailable';
  }
}

export async function isHealthConnectAvailable(): Promise<boolean> {
  return (await getHealthConnectAvailabilityStatus()) === 'available';
}

export async function getHealthConnectUnavailableMessage(): Promise<string> {
  if (Platform.OS !== 'android') {
    return 'Health Connect is available only on Android.';
  }

  if (healthConnectLoadErrorMessage) {
    return `${healthConnectLoadErrorMessage} Install react-native-health-connect, add the expo-health-connect plugin, and rebuild the Android app.`;
  }

  const availability = await getHealthConnectAvailabilityStatus();
  if (availability === 'provider_update_required') {
    return 'Health Connect needs to be installed or updated from Google Play before Ascension can read heart-rate data.';
  }

  return 'Health Connect is not available on this Android device.';
}

export function formatHealthConnectError(error: unknown): string {
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

  return 'Health Connect request failed.';
}

export async function requestHealthConnectHeartRateAuthorization(): Promise<HealthAuthorizationResult> {
  const healthConnect = getHealthConnectModule();
  if (!healthConnect) {
    return {
      status: 'unavailable',
      error: await getHealthConnectUnavailableMessage(),
    };
  }

  const availability = await getHealthConnectAvailabilityStatus();
  if (availability !== 'available') {
    return {
      status: 'unavailable',
      error: await getHealthConnectUnavailableMessage(),
    };
  }

  try {
    await ensureInitialized(healthConnect);

    const existingPermissions = await getGrantedPermissions(healthConnect);
    if (
      existingPermissions.some((permission) =>
        permissionMatches(permission, 'read', HEALTH_CONNECT_HEART_RATE_PERMISSION.recordType)
      )
    ) {
      return { status: 'authorized', error: null };
    }

    if (!healthConnect.requestPermission) {
      throw new Error(
        'The installed Health Connect bridge is missing requestPermission(). Reinstall the Android build.'
      );
    }

    const grantedPermissions = await healthConnect.requestPermission([
      HEALTH_CONNECT_HEART_RATE_PERMISSION,
    ]);

    const authorized = grantedPermissions.some((permission) =>
      permissionMatches(permission, 'read', HEALTH_CONNECT_HEART_RATE_PERMISSION.recordType)
    );

    return authorized
      ? { status: 'authorized', error: null }
      : { status: 'denied', error: 'Health Connect access was not granted.' };
  } catch (error) {
    console.warn(`${HEALTH_DEBUG_PREFIX} health connect authorization failed`, error);
    return {
      status: 'denied',
      error: formatHealthConnectError(error),
    };
  }
}

export async function getHealthConnectHeartRateSamplesForRange(params: {
  startDate: string;
  endDate: string;
}): Promise<HealthHeartRateSample[]> {
  const healthConnect = getHealthConnectModule();
  if (!healthConnect) {
    throw new Error(await getHealthConnectUnavailableMessage());
  }

  const availability = await getHealthConnectAvailabilityStatus();
  if (availability !== 'available') {
    throw new Error(await getHealthConnectUnavailableMessage());
  }

  if (!healthConnect.readRecords) {
    throw new Error(
      'The installed Health Connect bridge is missing readRecords(). Reinstall the Android build.'
    );
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

  await ensureInitialized(healthConnect);

  const grantedPermissions = await getGrantedPermissions(healthConnect);
  const authorized = grantedPermissions.some((permission) =>
    permissionMatches(permission, 'read', HEALTH_CONNECT_HEART_RATE_PERMISSION.recordType)
  );

  if (!authorized) {
    throw new Error('Health Connect heart-rate permission has not been granted.');
  }

  const result = await healthConnect.readRecords('HeartRate', {
    timeRangeFilter: {
      operator: 'between',
      startTime: exactStart,
      endTime: exactEnd,
    },
    ascendingOrder: true,
  });

  return normalizeHeartRateRecords(result.records ?? []);
}

export async function openHealthConnectSettings(): Promise<void> {
  const healthConnect = getHealthConnectModule();

  if (healthConnect?.openHealthConnectSettings) {
    await healthConnect.openHealthConnectSettings();
    return;
  }

  const availability = await getHealthConnectAvailabilityStatus();
  const target =
    availability === 'provider_update_required' ? HEALTH_CONNECT_STORE_URI : HEALTH_CONNECT_WEB_URI;

  try {
    await Linking.openURL(target);
  } catch {
    await Linking.openURL(HEALTH_CONNECT_WEB_URI);
  }
}
