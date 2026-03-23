import type { LocationObject } from 'expo-location';

import type { ActiveOutdoorCoord, ActiveSessionPhase } from '@/lib/activeRunWalkSessionStore';
import type { OutdoorDraftSample } from '@/lib/OutdoorSession/draftStore';
import {
  getRunWalkElapsedSeconds,
  normalizeRunWalkClock,
  type PersistedRunWalkClock,
} from '@/lib/runWalkSessionClock';

import { haversineMeters } from './outdoorUtils';

type OutdoorTrackingSnapshot = {
  phase: ActiveSessionPhase;
  clock?: PersistedRunWalkClock;
  elapsedSeconds: number;
  distanceMeters: number;
  coords: ActiveOutdoorCoord[];
  samples: OutdoorDraftSample[];
};

export function appendOutdoorLocations<T extends OutdoorTrackingSnapshot>(
  session: T,
  locations: readonly LocationObject[]
): T {
  if (session.phase !== 'running' || locations.length === 0) {
    const normalizedClock = normalizeRunWalkClock({
      clock: session.clock,
      elapsedSeconds: session.elapsedSeconds,
      phase: session.phase,
    });
    return {
      ...session,
      clock: normalizedClock,
      elapsedSeconds: getRunWalkElapsedSeconds(normalizedClock),
    };
  }

  const normalizedClock = normalizeRunWalkClock({
    clock: session.clock,
    elapsedSeconds: session.elapsedSeconds,
    phase: session.phase,
  });

  let distanceMeters = session.distanceMeters;
  const coords = [...session.coords];
  const samples = [...session.samples];
  let seq = samples[samples.length - 1]?.seq ?? 0;
  let lastPoint =
    coords.length > 0
      ? {
          lat: coords[coords.length - 1].latitude,
          lng: coords[coords.length - 1].longitude,
        }
      : null;

  for (const location of locations) {
    const { latitude, longitude, accuracy, altitude, speed, heading } = location.coords;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;
    if (accuracy && accuracy > 35) continue;

    const point = { lat: latitude, lng: longitude };
    if (lastPoint) {
      const delta = haversineMeters(lastPoint, point);
      if (delta < 80) {
        distanceMeters += delta;
      }
    }

    lastPoint = point;
    coords.push({ latitude, longitude });
    seq += 1;

    const timestampMs = Number.isFinite(location.timestamp) ? location.timestamp : Date.now();
    samples.push({
      seq,
      ts: new Date(timestampMs).toISOString(),
      elapsed_s: getRunWalkElapsedSeconds(normalizedClock, timestampMs),
      lat: latitude,
      lon: longitude,
      altitude_m: Number.isFinite(altitude) ? altitude : null,
      accuracy_m: Number.isFinite(accuracy) ? accuracy : null,
      speed_mps: Number.isFinite(speed) ? speed : null,
      bearing_deg: Number.isFinite(heading) ? heading : null,
      distance_m: Number(distanceMeters.toFixed(2)),
      is_moving: typeof speed === 'number' ? speed > 0.5 : true,
    });
  }

  return {
    ...session,
    clock: normalizedClock,
    elapsedSeconds: getRunWalkElapsedSeconds(normalizedClock),
    distanceMeters: Number(distanceMeters.toFixed(2)),
    coords,
    samples,
  };
}
