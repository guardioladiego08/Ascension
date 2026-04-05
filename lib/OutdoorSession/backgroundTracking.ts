import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { Platform } from 'react-native';

import {
  getActiveRunWalkSession,
  setActiveRunWalkSession,
  type ActiveOutdoorSession,
} from '@/lib/activeRunWalkSessionStore';

import { appendOutdoorLocations } from './locationTracking';

export const OUTDOOR_LOCATION_TASK = 'tensr-outdoor-location-task';

const OUTDOOR_TRACKING_READY_KEY = 'tensr:outdoor-background-permission-ready';
const OUTDOOR_TRACKING_LAST_ERROR_KEY = 'tensr:outdoor-background-last-error';
const OUTDOOR_TRACKING_DEBUG_EVENTS_KEY = 'tensr:outdoor-background-debug-events';
const MAX_DEBUG_EVENTS = 24;
type TaskManagerModule = typeof import('expo-task-manager');

export type OutdoorBackgroundTrackingDebugEvent = {
  timestampISO: string;
  source: 'screen' | 'background';
  message: string;
  details: string | null;
};

export type OutdoorBackgroundTrackingDiagnostics = {
  taskManagerAvailable: boolean;
  backgroundLocationAvailable: boolean;
  backgroundPermissionStatus: Location.LocationPermissionResponse['status'] | 'unavailable';
  backgroundPermissionScope: 'whenInUse' | 'always' | 'none' | null;
  cachedPermissionReady: boolean;
  backgroundUpdatesStarted: boolean;
  lastStartError: string | null;
};

let taskManagerModule: TaskManagerModule | null = null;
let lastBackgroundLocationDebugAt = 0;

function stringifyDebugDetails(details?: unknown) {
  if (details == null) {
    return null;
  }

  if (typeof details === 'string') {
    return details;
  }

  try {
    return JSON.stringify(details);
  } catch {
    return String(details);
  }
}

async function readDebugEvents(): Promise<OutdoorBackgroundTrackingDebugEvent[]> {
  const raw = await AsyncStorage.getItem(OUTDOOR_TRACKING_DEBUG_EVENTS_KEY).catch(() => null);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as OutdoorBackgroundTrackingDebugEvent[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function recordOutdoorBackgroundTrackingDebugEvent(
  message: string,
  details?: unknown,
  source: OutdoorBackgroundTrackingDebugEvent['source'] = 'background'
) {
  const nextEvent: OutdoorBackgroundTrackingDebugEvent = {
    timestampISO: new Date().toISOString(),
    source,
    message,
    details: stringifyDebugDetails(details),
  };

  const existing = await readDebugEvents();
  const nextEvents = [nextEvent, ...existing].slice(0, MAX_DEBUG_EVENTS);
  await AsyncStorage.setItem(
    OUTDOOR_TRACKING_DEBUG_EVENTS_KEY,
    JSON.stringify(nextEvents)
  ).catch(() => null);
}

export async function getOutdoorBackgroundTrackingDebugEvents(): Promise<
  OutdoorBackgroundTrackingDebugEvent[]
> {
  return await readDebugEvents();
}

export async function clearOutdoorBackgroundTrackingDebugEvents() {
  await AsyncStorage.removeItem(OUTDOOR_TRACKING_DEBUG_EVENTS_KEY).catch(() => null);
}

try {
  taskManagerModule = require('expo-task-manager') as TaskManagerModule;
} catch (error) {
  console.warn(
    '[OutdoorBackgroundTracking] expo-task-manager unavailable; background tracking is disabled for this build'
  );
}

if (
  taskManagerModule &&
  !taskManagerModule.isTaskDefined(OUTDOOR_LOCATION_TASK)
) {
  taskManagerModule.defineTask(OUTDOOR_LOCATION_TASK, async ({ data, error }) => {
    if (error) {
      await recordOutdoorBackgroundTrackingDebugEvent('Task error', error, 'background');
      console.warn('[OutdoorBackgroundTracking] task error', error);
      return;
    }

    const locations = (data as { locations?: Location.LocationObject[] } | undefined)?.locations;
    if (!locations?.length) return;

    try {
      const activeSession = await getActiveRunWalkSession();
      if (!activeSession || activeSession.kind !== 'outdoor' || activeSession.phase !== 'running') {
        return;
      }

      const updatedSession = appendOutdoorLocations(activeSession, locations);
      await setActiveRunWalkSession(updatedSession);
      const now = Date.now();
      if (now - lastBackgroundLocationDebugAt >= 15000) {
        lastBackgroundLocationDebugAt = now;
        await recordOutdoorBackgroundTrackingDebugEvent(
          `Background task stored ${locations.length} location update(s)`,
          {
            totalSamples: updatedSession.samples.length,
            totalCoords: updatedSession.coords.length,
            distanceMeters: updatedSession.distanceMeters,
          },
          'background'
        );
      }
    } catch (taskError) {
      await recordOutdoorBackgroundTrackingDebugEvent(
        'Failed to persist background updates',
        taskError,
        'background'
      );
      console.warn('[OutdoorBackgroundTracking] failed to persist background updates', taskError);
    }
  });
}

function hasGrantedBackgroundPermission(
  permission: Location.LocationPermissionResponse
) {
  if (permission.status !== 'granted') {
    return false;
  }

  if (Platform.OS !== 'ios') {
    return true;
  }

  const scope = permission.ios?.scope ?? null;
  if (scope === 'always') {
    return true;
  }

  if (scope === 'whenInUse' || scope === 'none') {
    return false;
  }

  // Some iOS builds report granted background status but omit ios.scope.
  // In that case, trust the status result to avoid false negatives.
  return true;
}

export async function getOutdoorBackgroundTrackingDiagnostics(): Promise<OutdoorBackgroundTrackingDiagnostics> {
  if (!taskManagerModule) {
    return {
      taskManagerAvailable: false,
      backgroundLocationAvailable: false,
      backgroundPermissionStatus: 'unavailable',
      backgroundPermissionScope: null,
      cachedPermissionReady: false,
      backgroundUpdatesStarted: false,
      lastStartError: null,
    };
  }

  const [cachedReady, lastStartError, backgroundLocationAvailable, backgroundUpdatesStarted] = await Promise.all([
    AsyncStorage.getItem(OUTDOOR_TRACKING_READY_KEY).catch(() => null),
    AsyncStorage.getItem(OUTDOOR_TRACKING_LAST_ERROR_KEY).catch(() => null),
    Location.isBackgroundLocationAvailableAsync().catch(() => false),
    Location.hasStartedLocationUpdatesAsync(OUTDOOR_LOCATION_TASK).catch(() => false),
  ]);
  const backgroundPermission: Location.LocationPermissionResponse | null =
    await Location.getBackgroundPermissionsAsync().catch(() => null);

  return {
    taskManagerAvailable: true,
    backgroundLocationAvailable,
    backgroundPermissionStatus: backgroundPermission?.status ?? 'unavailable',
    backgroundPermissionScope: backgroundPermission?.ios?.scope ?? null,
    cachedPermissionReady: cachedReady === 'true',
    backgroundUpdatesStarted,
    lastStartError,
  };
}

export async function prepareOutdoorBackgroundTracking(): Promise<boolean> {
  if (!taskManagerModule) {
    await recordOutdoorBackgroundTrackingDebugEvent(
      'Skipped permission prep because task manager is unavailable'
    );
    return false;
  }

  try {
    const foreground = await Location.getForegroundPermissionsAsync();
    const foregroundStatus =
      foreground.status === 'granted'
        ? foreground.status
        : (await Location.requestForegroundPermissionsAsync()).status;
    if (foregroundStatus !== 'granted') {
      return false;
    }

    const background = await Location.getBackgroundPermissionsAsync();
    const backgroundStatus =
      hasGrantedBackgroundPermission(background)
        ? background.status
        : (await Location.requestBackgroundPermissionsAsync()).status;
    const granted =
      backgroundStatus === 'granted' &&
      hasGrantedBackgroundPermission(await Location.getBackgroundPermissionsAsync());
    if (granted) {
      await AsyncStorage.setItem(OUTDOOR_TRACKING_READY_KEY, 'true');
    } else {
      await AsyncStorage.removeItem(OUTDOOR_TRACKING_READY_KEY);
    }
    const confirmedBackgroundPermission: Location.LocationPermissionResponse | null =
      await Location.getBackgroundPermissionsAsync().catch(() => null);
    await recordOutdoorBackgroundTrackingDebugEvent('Prepared background permission state', {
      foregroundStatus,
      backgroundStatus,
      granted,
      iosScope: confirmedBackgroundPermission?.ios?.scope ?? null,
    });
    return granted;
  } catch (error) {
    await recordOutdoorBackgroundTrackingDebugEvent('Permission request failed', error);
    console.warn('[OutdoorBackgroundTracking] permission request failed', error);
    return false;
  }
}

export async function hasPreparedOutdoorBackgroundTracking(): Promise<boolean> {
  if (!taskManagerModule) {
    return false;
  }

  try {
    const cached = await AsyncStorage.getItem(OUTDOOR_TRACKING_READY_KEY);
    if (cached === 'true') {
      const background = await Location.getBackgroundPermissionsAsync();
      if (hasGrantedBackgroundPermission(background)) {
        return true;
      }
      await AsyncStorage.removeItem(OUTDOOR_TRACKING_READY_KEY);
      return false;
    }
    const background = await Location.getBackgroundPermissionsAsync();
    return hasGrantedBackgroundPermission(background);
  } catch {
    return false;
  }
}

export async function startOutdoorBackgroundTracking(): Promise<boolean> {
  if (!taskManagerModule) {
    await AsyncStorage.setItem(
      OUTDOOR_TRACKING_LAST_ERROR_KEY,
      'expo-task-manager is unavailable in the current build'
    ).catch(() => null);
    await recordOutdoorBackgroundTrackingDebugEvent(
      'Background tracking start skipped because task manager is unavailable'
    );
    return false;
  }

  try {
    const isBackgroundLocationAvailable =
      await Location.isBackgroundLocationAvailableAsync();
    if (!isBackgroundLocationAvailable) {
      await AsyncStorage.setItem(
        OUTDOOR_TRACKING_LAST_ERROR_KEY,
        'background location is unavailable in the current runtime'
      ).catch(() => null);
      await recordOutdoorBackgroundTrackingDebugEvent(
        'Background tracking start failed because location is unavailable'
      );
      return false;
    }

    const ready = await hasPreparedOutdoorBackgroundTracking();
    if (!ready) {
      const foregroundPermission = await Location.getForegroundPermissionsAsync().catch(() => null);
      const backgroundPermission: Location.LocationPermissionResponse | null =
        await Location.getBackgroundPermissionsAsync().catch(() => null);
      await AsyncStorage.setItem(
        OUTDOOR_TRACKING_LAST_ERROR_KEY,
        'background location permission is not ready'
      ).catch(() => null);
      await recordOutdoorBackgroundTrackingDebugEvent(
        'Background tracking start blocked because permission is not ready',
        {
          platform: Platform.OS,
          foregroundStatus: foregroundPermission?.status ?? null,
          backgroundStatus: backgroundPermission?.status ?? null,
          backgroundScope: backgroundPermission?.ios?.scope ?? null,
          backgroundCanAskAgain: backgroundPermission?.canAskAgain ?? null,
        }
      );
      return false;
    }

    const alreadyStarted = await Location.hasStartedLocationUpdatesAsync(OUTDOOR_LOCATION_TASK);
    if (alreadyStarted) {
      await AsyncStorage.removeItem(OUTDOOR_TRACKING_LAST_ERROR_KEY).catch(() => null);
      await recordOutdoorBackgroundTrackingDebugEvent(
        'Background tracking was already started'
      );
      return true;
    }

    await Location.startLocationUpdatesAsync(OUTDOOR_LOCATION_TASK, {
      accuracy: Location.Accuracy.BestForNavigation,
      timeInterval: 1000,
      distanceInterval: 1,
      deferredUpdatesDistance: 0,
      deferredUpdatesInterval: 1000,
      activityType: Location.ActivityType.Fitness,
      pausesUpdatesAutomatically: false,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: 'Outdoor session in progress',
        notificationBody: 'Tensr is tracking your route while the app is in the background.',
      },
    });

    await AsyncStorage.removeItem(OUTDOOR_TRACKING_LAST_ERROR_KEY).catch(() => null);
    await recordOutdoorBackgroundTrackingDebugEvent('Background tracking started');
    return true;
  } catch (error) {
    console.warn('[OutdoorBackgroundTracking] failed to start', error);
    const message =
      error instanceof Error ? error.message : typeof error === 'string' ? error : JSON.stringify(error);
    await AsyncStorage.setItem(
      OUTDOOR_TRACKING_LAST_ERROR_KEY,
      message || 'unknown background tracking start error'
    ).catch(() => null);
    await recordOutdoorBackgroundTrackingDebugEvent(
      'Background tracking failed to start',
      message
    );
    return false;
  }
}

export async function stopOutdoorBackgroundTracking(): Promise<void> {
  if (!taskManagerModule) {
    return;
  }

  try {
    const started = await Location.hasStartedLocationUpdatesAsync(OUTDOOR_LOCATION_TASK);
    if (started) {
      await Location.stopLocationUpdatesAsync(OUTDOOR_LOCATION_TASK);
      await recordOutdoorBackgroundTrackingDebugEvent('Background tracking stopped');
    }
  } catch (error) {
    await recordOutdoorBackgroundTrackingDebugEvent(
      'Background tracking failed to stop',
      error
    );
    console.warn('[OutdoorBackgroundTracking] failed to stop', error);
  }
}

export async function reloadOutdoorSessionFromStorage(
  mode: ActiveOutdoorSession['mode']
): Promise<ActiveOutdoorSession | null> {
  const session = await getActiveRunWalkSession();
  if (!session || session.kind !== 'outdoor' || session.mode !== mode) {
    return null;
  }

  return session;
}
