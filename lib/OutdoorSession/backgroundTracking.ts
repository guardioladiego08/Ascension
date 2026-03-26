import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';

import {
  getActiveRunWalkSession,
  setActiveRunWalkSession,
  type ActiveOutdoorSession,
} from '@/lib/activeRunWalkSessionStore';

import { appendOutdoorLocations } from './locationTracking';

export const OUTDOOR_LOCATION_TASK = 'tensr-outdoor-location-task';

const OUTDOOR_TRACKING_READY_KEY = 'tensr:outdoor-background-permission-ready';
type TaskManagerModule = typeof import('expo-task-manager');

let taskManagerModule: TaskManagerModule | null = null;

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
    } catch (taskError) {
      console.warn('[OutdoorBackgroundTracking] failed to persist background updates', taskError);
    }
  });
}

export async function prepareOutdoorBackgroundTracking(): Promise<boolean> {
  if (!taskManagerModule) {
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
      background.status === 'granted'
        ? background.status
        : (await Location.requestBackgroundPermissionsAsync()).status;
    const granted = backgroundStatus === 'granted';
    if (granted) {
      await AsyncStorage.setItem(OUTDOOR_TRACKING_READY_KEY, 'true');
    }
    return granted;
  } catch (error) {
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
    if (cached === 'true') return true;
    const background = await Location.getBackgroundPermissionsAsync();
    return background.status === 'granted';
  } catch {
    return false;
  }
}

export async function startOutdoorBackgroundTracking(): Promise<boolean> {
  if (!taskManagerModule) {
    return false;
  }

  try {
    const ready = await hasPreparedOutdoorBackgroundTracking();
    if (!ready) return false;

    const alreadyStarted = await Location.hasStartedLocationUpdatesAsync(OUTDOOR_LOCATION_TASK);
    if (alreadyStarted) {
      return true;
    }

    await Location.startLocationUpdatesAsync(OUTDOOR_LOCATION_TASK, {
      accuracy: Location.Accuracy.Highest,
      timeInterval: 1000,
      distanceInterval: 2,
      pausesUpdatesAutomatically: false,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: 'Outdoor session in progress',
        notificationBody: 'Tensr is tracking your route while the app is in the background.',
      },
    });

    return true;
  } catch (error) {
    console.warn('[OutdoorBackgroundTracking] failed to start', error);
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
    }
  } catch (error) {
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
