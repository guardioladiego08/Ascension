import { Linking, Platform } from 'react-native';

import {
  formatAppleHealthError,
  getAppleHeartRateSamplesForRange,
  getAppleHealthUnavailableMessage,
  isAppleHealthKitAvailable,
  requestAppleHeartRateAuthorization,
} from '@/lib/health/appleHealthKit';
import {
  formatHealthConnectError,
  getHealthConnectHeartRateSamplesForRange,
  getHealthConnectUnavailableMessage,
  isHealthConnectAvailable,
  openHealthConnectSettings,
  requestHealthConnectHeartRateAuthorization,
} from '@/lib/health/androidHealthConnect';
import { getHealthProviderDescriptor } from '@/lib/health/copy';
import type {
  HealthAuthorizationResult,
  HealthHeartRateSample,
  HealthProviderDescriptor,
  HealthProviderId,
} from '@/lib/health/types';

export function getCurrentHealthProviderId(): HealthProviderId {
  return Platform.OS === 'android' ? 'health_connect' : 'apple_health';
}

export function getCurrentHealthProviderDescriptor(): HealthProviderDescriptor {
  return getHealthProviderDescriptor(getCurrentHealthProviderId());
}

export function getCurrentHealthProviderLabel(): string {
  return getCurrentHealthProviderDescriptor().providerLabel;
}

export async function isCurrentHealthProviderAvailable(): Promise<boolean> {
  if (Platform.OS === 'android') {
    return isHealthConnectAvailable();
  }

  return isAppleHealthKitAvailable();
}

export async function getCurrentHealthProviderUnavailableMessage(): Promise<string> {
  if (Platform.OS === 'android') {
    return getHealthConnectUnavailableMessage();
  }

  return getAppleHealthUnavailableMessage();
}

export async function requestCurrentHeartRateAuthorization(): Promise<HealthAuthorizationResult> {
  if (Platform.OS === 'android') {
    return requestHealthConnectHeartRateAuthorization();
  }

  return requestAppleHeartRateAuthorization();
}

export async function getCurrentHeartRateSamplesForRange(params: {
  startDate: string;
  endDate: string;
}): Promise<HealthHeartRateSample[]> {
  if (Platform.OS === 'android') {
    return getHealthConnectHeartRateSamplesForRange(params);
  }

  return getAppleHeartRateSamplesForRange(params);
}

export function formatCurrentHealthError(error: unknown): string {
  if (Platform.OS === 'android') {
    return formatHealthConnectError(error);
  }

  return formatAppleHealthError(error);
}

export async function openCurrentHealthProviderSettings(): Promise<void> {
  if (Platform.OS === 'android') {
    await openHealthConnectSettings();
    return;
  }

  await Linking.openSettings();
}
