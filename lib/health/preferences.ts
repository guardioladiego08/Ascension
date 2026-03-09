import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';
import {
  type HealthAuthorizationStatus,
  type HealthProviderId,
} from '@/lib/health/types';

export type HealthPreferences = {
  providerId: HealthProviderId;
  syncEnabled: boolean;
  authorizationStatus: HealthAuthorizationStatus;
  lastConnectedAt: string | null;
  lastSyncAt: string | null;
  lastError: string | null;
};

type HealthPreferencesRow = {
  health_provider: string | null;
  health_sync_enabled: boolean | null;
  health_authorization_status: string | null;
  health_last_connected_at: string | null;
  health_last_sync_at: string | null;
  health_last_error: string | null;
  apple_health_sync_enabled: boolean | null;
  apple_health_authorization_status: string | null;
  apple_health_last_connected_at: string | null;
  apple_health_last_sync_at: string | null;
  apple_health_last_error: string | null;
};

function isMissingGenericHealthPreferenceColumns(error: unknown) {
  const message = String(
    error && typeof error === 'object' && 'message' in error
      ? (error as { message?: unknown }).message
      : error ?? ''
  ).toLowerCase();

  return (
    message.includes('health_provider') ||
    message.includes('health_sync_enabled') ||
    message.includes('health_authorization_status') ||
    message.includes('health_last_connected_at') ||
    message.includes('health_last_sync_at') ||
    message.includes('health_last_error')
  );
}

const SCHEMA = 'user';
const TABLE = 'user_preferences';

function getDefaultProviderId(): HealthProviderId {
  return Platform.OS === 'android' ? 'health_connect' : 'apple_health';
}

const DEFAULT_PREFERENCES: HealthPreferences = {
  providerId: getDefaultProviderId(),
  syncEnabled: false,
  authorizationStatus: 'not_determined',
  lastConnectedAt: null,
  lastSyncAt: null,
  lastError: null,
};

export function normalizeHealthAuthorizationStatus(
  value: unknown
): HealthAuthorizationStatus {
  const raw = String(value ?? '').trim().toLowerCase();
  if (raw === 'authorized') return 'authorized';
  if (raw === 'denied') return 'denied';
  if (raw === 'unavailable') return 'unavailable';
  return 'not_determined';
}

export function normalizeHealthProviderId(value: unknown): HealthProviderId | null {
  const raw = String(value ?? '').trim().toLowerCase();
  if (raw === 'apple_health') return 'apple_health';
  if (raw === 'health_connect') return 'health_connect';
  return null;
}

function mapRowToPreferences(
  row: HealthPreferencesRow | null | undefined
): HealthPreferences {
  if (!row) return DEFAULT_PREFERENCES;

  const providerId =
    normalizeHealthProviderId(row.health_provider) ??
    (row.apple_health_authorization_status != null ||
    row.apple_health_sync_enabled != null ||
    row.apple_health_last_connected_at != null ||
    row.apple_health_last_sync_at != null ||
    row.apple_health_last_error != null
      ? 'apple_health'
      : DEFAULT_PREFERENCES.providerId);

  return {
    providerId,
    syncEnabled: Boolean(
      row.health_sync_enabled ?? row.apple_health_sync_enabled ?? DEFAULT_PREFERENCES.syncEnabled
    ),
    authorizationStatus: normalizeHealthAuthorizationStatus(
      row.health_authorization_status ?? row.apple_health_authorization_status
    ),
    lastConnectedAt:
      row.health_last_connected_at ?? row.apple_health_last_connected_at ?? null,
    lastSyncAt: row.health_last_sync_at ?? row.apple_health_last_sync_at ?? null,
    lastError: row.health_last_error ?? row.apple_health_last_error ?? null,
  };
}

async function getCurrentUserId() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) throw error;
  if (!user) throw new Error('Not signed in');
  return user.id;
}

export async function getHealthPreferences(): Promise<HealthPreferences> {
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .schema(SCHEMA)
    .from(TABLE)
    .select(
      'health_provider, health_sync_enabled, health_authorization_status, health_last_connected_at, health_last_sync_at, health_last_error, apple_health_sync_enabled, apple_health_authorization_status, apple_health_last_connected_at, apple_health_last_sync_at, apple_health_last_error'
    )
    .eq('user_id', userId)
    .maybeSingle<HealthPreferencesRow>();

  if (error) {
    if (!isMissingGenericHealthPreferenceColumns(error)) {
      throw error;
    }

    const legacyResult = await supabase
      .schema(SCHEMA)
      .from(TABLE)
      .select(
        'apple_health_sync_enabled, apple_health_authorization_status, apple_health_last_connected_at, apple_health_last_sync_at, apple_health_last_error'
      )
      .eq('user_id', userId)
      .maybeSingle<HealthPreferencesRow>();

    if (legacyResult.error) throw legacyResult.error;
    return mapRowToPreferences(legacyResult.data);
  }

  return mapRowToPreferences(data);
}

export async function updateHealthPreferences(
  patch: Partial<HealthPreferences>
): Promise<HealthPreferences> {
  const userId = await getCurrentUserId();
  const payload: Record<string, unknown> = { user_id: userId };

  if ('providerId' in patch && patch.providerId) {
    payload.health_provider = normalizeHealthProviderId(patch.providerId);
  }

  if ('syncEnabled' in patch) {
    payload.health_sync_enabled = Boolean(patch.syncEnabled);
  }

  if ('authorizationStatus' in patch) {
    payload.health_authorization_status = normalizeHealthAuthorizationStatus(
      patch.authorizationStatus
    );
  }

  if ('lastConnectedAt' in patch) {
    payload.health_last_connected_at = patch.lastConnectedAt ?? null;
  }

  if ('lastSyncAt' in patch) {
    payload.health_last_sync_at = patch.lastSyncAt ?? null;
  }

  if ('lastError' in patch) {
    payload.health_last_error = patch.lastError ?? null;
  }

  const { error } = await supabase
    .schema(SCHEMA)
    .from(TABLE)
    .upsert(payload, { onConflict: 'user_id' });

  if (error) {
    if (!isMissingGenericHealthPreferenceColumns(error)) {
      throw error;
    }

    if (patch.providerId && patch.providerId !== 'apple_health') {
      throw new Error(
        'The backend is missing provider-agnostic health preference columns. Apply migration 20260308_health_provider_preferences.sql before enabling Health Connect.'
      );
    }

    const legacyPayload: Record<string, unknown> = { user_id: userId };

    if ('syncEnabled' in patch) {
      legacyPayload.apple_health_sync_enabled = Boolean(patch.syncEnabled);
    }

    if ('authorizationStatus' in patch) {
      legacyPayload.apple_health_authorization_status = normalizeHealthAuthorizationStatus(
        patch.authorizationStatus
      );
    }

    if ('lastConnectedAt' in patch) {
      legacyPayload.apple_health_last_connected_at = patch.lastConnectedAt ?? null;
    }

    if ('lastSyncAt' in patch) {
      legacyPayload.apple_health_last_sync_at = patch.lastSyncAt ?? null;
    }

    if ('lastError' in patch) {
      legacyPayload.apple_health_last_error = patch.lastError ?? null;
    }

    const legacyResult = await supabase
      .schema(SCHEMA)
      .from(TABLE)
      .upsert(legacyPayload, { onConflict: 'user_id' });

    if (legacyResult.error) throw legacyResult.error;
    return getHealthPreferences();
  }

  return getHealthPreferences();
}

export function getHealthStatusLabel(
  prefs: HealthPreferences
): string {
  if (prefs.syncEnabled && prefs.authorizationStatus === 'authorized') {
    return 'Connected';
  }

  if (prefs.authorizationStatus === 'authorized') {
    return 'Permission granted';
  }

  if (prefs.authorizationStatus === 'denied') {
    return 'Permission denied';
  }

  if (prefs.authorizationStatus === 'unavailable') {
    return 'Unavailable';
  }

  return 'Not connected';
}

export type AppleHealthAuthorizationStatus = HealthAuthorizationStatus;
export type AppleHealthPreferences = HealthPreferences;

export const normalizeAppleHealthAuthorizationStatus = normalizeHealthAuthorizationStatus;
export const getAppleHealthPreferences = getHealthPreferences;
export const updateAppleHealthPreferences = updateHealthPreferences;
export const getAppleHealthStatusLabel = getHealthStatusLabel;
