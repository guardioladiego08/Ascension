import { supabase } from '@/lib/supabase';

export type AppleHealthAuthorizationStatus =
  | 'authorized'
  | 'denied'
  | 'not_determined'
  | 'unavailable';

export type AppleHealthPreferences = {
  syncEnabled: boolean;
  authorizationStatus: AppleHealthAuthorizationStatus;
  lastConnectedAt: string | null;
  lastSyncAt: string | null;
  lastError: string | null;
};

type AppleHealthPreferencesRow = {
  apple_health_sync_enabled: boolean | null;
  apple_health_authorization_status: string | null;
  apple_health_last_connected_at: string | null;
  apple_health_last_sync_at: string | null;
  apple_health_last_error: string | null;
};

const SCHEMA = 'user';
const TABLE = 'user_preferences';

const DEFAULT_PREFERENCES: AppleHealthPreferences = {
  syncEnabled: false,
  authorizationStatus: 'not_determined',
  lastConnectedAt: null,
  lastSyncAt: null,
  lastError: null,
};

export function normalizeAppleHealthAuthorizationStatus(
  value: unknown
): AppleHealthAuthorizationStatus {
  const raw = String(value ?? '').trim().toLowerCase();
  if (raw === 'authorized') return 'authorized';
  if (raw === 'denied') return 'denied';
  if (raw === 'unavailable') return 'unavailable';
  return 'not_determined';
}

function mapRowToPreferences(
  row: AppleHealthPreferencesRow | null | undefined
): AppleHealthPreferences {
  if (!row) return DEFAULT_PREFERENCES;

  return {
    syncEnabled: Boolean(row.apple_health_sync_enabled),
    authorizationStatus: normalizeAppleHealthAuthorizationStatus(
      row.apple_health_authorization_status
    ),
    lastConnectedAt: row.apple_health_last_connected_at ?? null,
    lastSyncAt: row.apple_health_last_sync_at ?? null,
    lastError: row.apple_health_last_error ?? null,
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

export async function getAppleHealthPreferences(): Promise<AppleHealthPreferences> {
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .schema(SCHEMA)
    .from(TABLE)
    .select(
      'apple_health_sync_enabled, apple_health_authorization_status, apple_health_last_connected_at, apple_health_last_sync_at, apple_health_last_error'
    )
    .eq('user_id', userId)
    .maybeSingle<AppleHealthPreferencesRow>();

  if (error) throw error;
  return mapRowToPreferences(data);
}

export async function updateAppleHealthPreferences(
  patch: Partial<AppleHealthPreferences>
): Promise<AppleHealthPreferences> {
  const userId = await getCurrentUserId();
  const payload: Record<string, unknown> = { user_id: userId };

  if ('syncEnabled' in patch) {
    payload.apple_health_sync_enabled = Boolean(patch.syncEnabled);
  }

  if ('authorizationStatus' in patch) {
    payload.apple_health_authorization_status = normalizeAppleHealthAuthorizationStatus(
      patch.authorizationStatus
    );
  }

  if ('lastConnectedAt' in patch) {
    payload.apple_health_last_connected_at = patch.lastConnectedAt ?? null;
  }

  if ('lastSyncAt' in patch) {
    payload.apple_health_last_sync_at = patch.lastSyncAt ?? null;
  }

  if ('lastError' in patch) {
    payload.apple_health_last_error = patch.lastError ?? null;
  }

  const { error } = await supabase
    .schema(SCHEMA)
    .from(TABLE)
    .upsert(payload, { onConflict: 'user_id' });

  if (error) throw error;
  return getAppleHealthPreferences();
}

export function getAppleHealthStatusLabel(
  prefs: AppleHealthPreferences
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
