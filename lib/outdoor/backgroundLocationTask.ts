// lib/outdoor/backgroundLocationTask.ts
// Safe background task wrapper:
// - Works in dev builds with expo-task-manager installed
// - Does NOT crash in Expo Go / environments where the native module is missing

import type * as LocationType from 'expo-location';

import { getActiveOutdoorSessionId } from './activeSession';
import { insertOutdoorSamples } from './supabase';
import type { OutdoorSampleInsert } from './types';

export const OUTDOOR_LOCATION_TASK = 'tensr-outdoor-location-task';

type TaskManagerModule = typeof import('expo-task-manager');
type LocationModule = typeof import('expo-location');

function safeRequireTaskManager(): TaskManagerModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('expo-task-manager') as TaskManagerModule;
  } catch {
    return null;
  }
}

function safeRequireLocation(): LocationModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('expo-location') as LocationModule;
  } catch {
    return null;
  }
}

const TaskManager = safeRequireTaskManager();
const Location = safeRequireLocation();

const isBgAvailable = !!TaskManager && !!Location;

// Define task only if modules exist
if (isBgAvailable) {
  TaskManager!.defineTask(OUTDOOR_LOCATION_TASK, async ({ data, error }) => {
    try {
      if (error) return;

      const sessionId = await getActiveOutdoorSessionId();
      if (!sessionId) return;

      const payload = data as any;
      const locations: LocationType.LocationObject[] = payload?.locations ?? [];
      if (!Array.isArray(locations) || locations.length === 0) return;

      const samples: OutdoorSampleInsert[] = locations.map((loc) => ({
        session_id: sessionId,
        ts: new Date(loc.timestamp).toISOString(),
        elapsed_s: 0, // background elapsed can be derived later if desired

        lat: loc.coords.latitude ?? null,
        lon: loc.coords.longitude ?? null,
        altitude_m: loc.coords.altitude ?? null,

        accuracy_m: loc.coords.accuracy ?? null,
        speed_mps: loc.coords.speed ?? null,
        bearing_deg: loc.coords.heading ?? null,

        hr_bpm: null,
        cadence_spm: null,

        grade_pct: null,
        distance_m: null,

        is_moving: null,
        source: 'bg',
      }));

      await insertOutdoorSamples(samples);
    } catch {
      // swallow background errors
    }
  });
}

export async function startBackgroundUpdates() {
  if (!isBgAvailable) return;

  const started = await Location!.hasStartedLocationUpdatesAsync(OUTDOOR_LOCATION_TASK);
  if (started) return;

  await Location!.startLocationUpdatesAsync(OUTDOOR_LOCATION_TASK, {
    accuracy: Location!.Accuracy.BestForNavigation,
    timeInterval: 2000,
    distanceInterval: 5,
    deferredUpdatesInterval: 5000,
    deferredUpdatesDistance: 15,
    showsBackgroundLocationIndicator: true,
    pausesUpdatesAutomatically: false,
    foregroundService: {
      notificationTitle: 'Tensr',
      notificationBody: 'Recording outdoor session',
    },
  });
}

export async function stopBackgroundUpdates() {
  if (!isBgAvailable) return;

  const started = await Location!.hasStartedLocationUpdatesAsync(OUTDOOR_LOCATION_TASK);
  if (!started) return;

  await Location!.stopLocationUpdatesAsync(OUTDOOR_LOCATION_TASK);
}

export async function isTaskManagerAvailable() {
  // A runtime check you can use to display a warning in UI if needed
  if (!TaskManager) return false;
  return TaskManager.isAvailableAsync(); // doc’d API :contentReference[oaicite:2]{index=2}
}
