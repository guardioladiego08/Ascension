import type { LocationObject } from 'expo-location';

import type { ActiveOutdoorCoord, ActiveSessionPhase } from '@/lib/activeRunWalkSessionStore';
import type { OutdoorDraftSample } from '@/lib/OutdoorSession/draftStore';
import {
  getRunWalkElapsedSeconds,
  normalizeRunWalkClock,
  type PersistedRunWalkClock,
} from '@/lib/runWalkSessionClock';

import { haversineMeters, paceSecPerKm } from './outdoorUtils';

type OutdoorTrackingSnapshot = {
  phase: ActiveSessionPhase;
  clock?: PersistedRunWalkClock;
  elapsedSeconds: number;
  distanceMeters: number;
  coords: ActiveOutdoorCoord[];
  samples: OutdoorDraftSample[];
};

const MAX_NORMAL_ACCURACY_METERS = 35;
const MAX_RECONNECT_ACCURACY_METERS = 60;
const MAX_NORMAL_DELTA_METERS = 80;
const MAX_DUPLICATE_DELTA_METERS = 3;
const MAX_DUPLICATE_GAP_MS = 1500;
const RECONNECT_GAP_MS = 6000;
const MAX_RECONNECT_SPEED_MPS = 12;
const LIVE_PACE_LOOKBACK_SECONDS = 15;
const LIVE_PACE_MAX_WINDOW_SECONDS = 20;
const LIVE_PACE_MIN_DISTANCE_METERS = 15;
const LIVE_PACE_MIN_SPEED_MPS = 0.5;

function parseIsoMs(value: string | null | undefined) {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toFiniteNumber(value: number | null | undefined) {
  return Number.isFinite(value) ? Number(value) : null;
}

function paceSecPerKmFromSpeed(speedMps: number | null | undefined) {
  if (!Number.isFinite(speedMps) || speedMps == null || speedMps < LIVE_PACE_MIN_SPEED_MPS) {
    return null;
  }

  return 1000 / speedMps;
}

export function getLiveOutdoorPaceSecPerKm(
  samples: readonly OutdoorDraftSample[],
  fallbackDistanceMeters: number,
  fallbackElapsedSeconds: number
) {
  const latest = samples[samples.length - 1];

  if (latest) {
    const recentSpeedValues = samples
      .filter((sample) => latest.elapsed_s - sample.elapsed_s <= LIVE_PACE_LOOKBACK_SECONDS)
      .map((sample) => toFiniteNumber(sample.speed_mps))
      .filter((value): value is number => value != null && value >= LIVE_PACE_MIN_SPEED_MPS);

    if (recentSpeedValues.length > 0) {
      const averageSpeedMps =
        recentSpeedValues.reduce((sum, value) => sum + value, 0) / recentSpeedValues.length;
      return paceSecPerKmFromSpeed(averageSpeedMps);
    }

    for (let index = samples.length - 2; index >= 0; index -= 1) {
      const candidate = samples[index];
      const deltaElapsedSeconds = latest.elapsed_s - candidate.elapsed_s;
      if (deltaElapsedSeconds < 5) continue;
      if (deltaElapsedSeconds > LIVE_PACE_MAX_WINDOW_SECONDS) break;

      const deltaDistanceMeters = latest.distance_m - candidate.distance_m;
      if (deltaDistanceMeters < LIVE_PACE_MIN_DISTANCE_METERS) continue;

      return deltaElapsedSeconds / (deltaDistanceMeters / 1000);
    }
  }

  return paceSecPerKm(fallbackDistanceMeters, fallbackElapsedSeconds);
}

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
  let lastTimestampMs = parseIsoMs(samples[samples.length - 1]?.ts);
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

    const point = { lat: latitude, lng: longitude };
    const timestampMs = Number.isFinite(location.timestamp) ? location.timestamp : Date.now();
    const accuracyMeters = toFiniteNumber(accuracy);
    const gapMs =
      lastTimestampMs == null ? null : Math.max(0, timestampMs - lastTimestampMs);
    const isReconnectGap = gapMs != null && gapMs >= RECONNECT_GAP_MS;
    const maxAllowedAccuracyMeters = isReconnectGap
      ? MAX_RECONNECT_ACCURACY_METERS
      : MAX_NORMAL_ACCURACY_METERS;

    if (accuracyMeters != null && accuracyMeters > maxAllowedAccuracyMeters) {
      continue;
    }

    let deltaMeters = 0;
    if (lastPoint) {
      deltaMeters = haversineMeters(lastPoint, point);

      if (
        gapMs != null &&
        gapMs <= MAX_DUPLICATE_GAP_MS &&
        deltaMeters <= MAX_DUPLICATE_DELTA_METERS
      ) {
        continue;
      }

      const impliedSpeedMps =
        gapMs != null && gapMs > 0 ? deltaMeters / (gapMs / 1000) : null;
      const allowReconnectBridge =
        isReconnectGap &&
        impliedSpeedMps != null &&
        impliedSpeedMps <= MAX_RECONNECT_SPEED_MPS;

      if (deltaMeters > MAX_NORMAL_DELTA_METERS && !allowReconnectBridge) {
        continue;
      }

      distanceMeters += deltaMeters;
    }

    lastPoint = point;
    lastTimestampMs = timestampMs;
    coords.push({ latitude, longitude });
    seq += 1;
    samples.push({
      seq,
      ts: new Date(timestampMs).toISOString(),
      elapsed_s: getRunWalkElapsedSeconds(normalizedClock, timestampMs),
      lat: latitude,
      lon: longitude,
      altitude_m: Number.isFinite(altitude) ? altitude : null,
      accuracy_m: accuracyMeters,
      speed_mps:
        typeof speed === 'number' && Number.isFinite(speed) && speed >= 0 ? speed : null,
      bearing_deg: Number.isFinite(heading) ? heading : null,
      distance_m: Number(distanceMeters.toFixed(2)),
      is_moving:
        typeof speed === 'number' && Number.isFinite(speed)
          ? speed > LIVE_PACE_MIN_SPEED_MPS
          : deltaMeters > 0.5,
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
