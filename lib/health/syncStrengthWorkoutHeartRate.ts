import {
  formatAppleHealthError,
  inferAppleHealthAuthorizationStatusFromError,
} from '@/lib/health/appleHealthKit';
import { getCurrentHealthProviderId, getCurrentHealthProviderLabel } from '@/lib/health/provider';
import {
  formatCurrentHealthError,
  getCurrentHeartRateSamplesForRange,
  getCurrentHealthProviderUnavailableMessage,
  isCurrentHealthProviderAvailable,
} from '@/lib/health/provider';
import { getHealthPreferences, updateHealthPreferences } from '@/lib/health/preferences';
import { supabase } from '@/lib/supabase';

const HEALTH_DEBUG_PREFIX = '[HealthDebug]';

export type SyncStrengthWorkoutHeartRateResult =
  | {
      status: 'skipped';
      insertedCount: 0;
      reason: string;
    }
  | {
      status: 'synced';
      insertedCount: number;
    }
  | {
      status: 'failed';
      insertedCount: 0;
      reason: string;
    };

export async function syncStrengthWorkoutHeartRateSamples(params: {
  userId: string;
  workoutId: string;
  startedAtISO: string;
  endedAtISO: string;
}): Promise<SyncStrengthWorkoutHeartRateResult> {
  const preferences = await getHealthPreferences();
  const providerId = getCurrentHealthProviderId();
  const providerLabel = getCurrentHealthProviderLabel();
  console.log(`${HEALTH_DEBUG_PREFIX} sync start`, {
    workoutId: params.workoutId,
    userId: params.userId,
    startedAtISO: params.startedAtISO,
    endedAtISO: params.endedAtISO,
    providerId,
    syncEnabled: preferences.syncEnabled,
    authorizationStatus: preferences.authorizationStatus,
    nativeAvailable: await isCurrentHealthProviderAvailable(),
  });

  if (!preferences.syncEnabled) {
    console.log(`${HEALTH_DEBUG_PREFIX} sync skipped`, {
      reason: `${providerLabel} sync is turned off.`,
    });
    return {
      status: 'skipped',
      insertedCount: 0,
      reason: `${providerLabel} sync is turned off.`,
    };
  }

  if (preferences.authorizationStatus !== 'authorized') {
    console.log(`${HEALTH_DEBUG_PREFIX} sync skipped`, {
      reason: `${providerLabel} permission has not been granted.`,
      authorizationStatus: preferences.authorizationStatus,
    });
    return {
      status: 'skipped',
      insertedCount: 0,
      reason: `${providerLabel} permission has not been granted.`,
    };
  }

  if (!(await isCurrentHealthProviderAvailable())) {
    const message = await getCurrentHealthProviderUnavailableMessage();
    console.warn(`${HEALTH_DEBUG_PREFIX} sync failed: unavailable`, { message });
    await updateHealthPreferences({
      providerId,
      syncEnabled: false,
      authorizationStatus: 'unavailable',
      lastError: message,
    });

    return {
      status: 'failed',
      insertedCount: 0,
      reason: message,
    };
  }

  try {
    let samples;

    try {
      samples = await getCurrentHeartRateSamplesForRange({
        startDate: params.startedAtISO,
        endDate: params.endedAtISO,
      });
      console.log(`${HEALTH_DEBUG_PREFIX} sample query returned`, {
        workoutId: params.workoutId,
        sampleCount: samples.length,
      });
    } catch (error) {
      const message = formatCurrentHealthError(error);
      const authorizationStatus = inferAppleHealthAuthorizationStatusFromError(error);
      console.warn(`${HEALTH_DEBUG_PREFIX} sample query failed`, {
        workoutId: params.workoutId,
        message,
        authorizationStatus,
      });

      await updateHealthPreferences({
        providerId,
        syncEnabled:
          authorizationStatus === 'authorized'
            ? preferences.syncEnabled
            : false,
        authorizationStatus:
          authorizationStatus === 'not_determined'
            ? preferences.authorizationStatus
            : authorizationStatus,
        lastError: message,
      });

      return {
        status: 'failed',
        insertedCount: 0,
        reason: message,
      };
    }

    if (samples.length > 0) {
      const payload = samples.map((sample) => ({
        user_id: params.userId,
        strength_workout_id: params.workoutId,
        source: providerId,
        sample_uuid: sample.sampleUuid,
        sample_start_at: sample.sampleStartAt,
        sample_end_at: sample.sampleEndAt,
        bpm: sample.bpm,
        source_name: sample.sourceName,
        source_bundle_id: sample.sourceBundleId,
        device_name: sample.deviceName,
        device_model: sample.deviceModel,
        metadata: sample.metadata,
      }));

      console.log(`${HEALTH_DEBUG_PREFIX} inserting heart rate samples`, {
        workoutId: params.workoutId,
        insertCount: payload.length,
      });

      const { error } = await supabase
        .schema('health')
        .from('strength_workout_heart_rate_samples')
        .upsert(payload, {
          onConflict: 'strength_workout_id,sample_start_at,sample_end_at,bpm',
        });

      if (error) {
        console.warn(`${HEALTH_DEBUG_PREFIX} insert failed`, {
          workoutId: params.workoutId,
          error,
        });
        throw error;
      }

      console.log(`${HEALTH_DEBUG_PREFIX} insert succeeded`, {
        workoutId: params.workoutId,
        insertCount: payload.length,
      });
    } else {
      console.log(`${HEALTH_DEBUG_PREFIX} no heart rate samples returned for workout`, {
        workoutId: params.workoutId,
      });
    }

    await updateHealthPreferences({
      providerId,
      lastSyncAt: new Date().toISOString(),
      lastError: null,
    });

    console.log(`${HEALTH_DEBUG_PREFIX} sync completed`, {
      workoutId: params.workoutId,
      insertedCount: samples.length,
    });

    return {
      status: 'synced',
      insertedCount: samples.length,
    };
  } catch (error) {
    const message =
      providerId === 'apple_health'
        ? formatAppleHealthError(error)
        : formatCurrentHealthError(error);
    console.warn(`${HEALTH_DEBUG_PREFIX} sync failed`, {
      workoutId: params.workoutId,
      message,
      error,
    });

    await updateHealthPreferences({
      providerId,
      lastError: message,
    });

    return {
      status: 'failed',
      insertedCount: 0,
      reason: message,
    };
  }
}
