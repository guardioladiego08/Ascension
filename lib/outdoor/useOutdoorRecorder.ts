import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as Location from 'expo-location';

import type { ActivityPrivacy, OutdoorActivityType, OutdoorMode, OutdoorSampleInsert, Split } from './types';
import { clearActiveOutdoorSessionId, setActiveOutdoorSessionId } from './activeSession';
import { createOutdoorSession, insertOutdoorSamples, updateOutdoorSession } from './supabase';
import { haversineM, paceSecPerKmFromSpeed, updateAutoKmSplits } from './compute';
import { startBackgroundUpdates, stopBackgroundUpdates } from './backgroundLocationTask';

const AUTO_PAUSE_SPEED_MPS = 0.6;
const AUTO_RESUME_SPEED_MPS = 1.0;
const MIN_GOOD_ACCURACY_M = 35;

function modeToActivity(mode: OutdoorMode): OutdoorActivityType {
  return mode === 'outdoor_walk' ? 'walk' : 'run';
}

export function useOutdoorRecorder(args: { mode: OutdoorMode }) {
  const { mode } = args;

  const activityType = useMemo(() => modeToActivity(mode), [mode]);

  const [sessionId, setSessionId] = useState<string | null>(null);

  const [privacy, setPrivacy] = useState<ActivityPrivacy>('private');

  const [status, setStatus] = useState<'idle' | 'recording' | 'paused' | 'saving'>('idle');
  const [autoPauseEnabled, setAutoPauseEnabled] = useState(true);

  const [elapsedS, setElapsedS] = useState(0);
  const [movingS, setMovingS] = useState(0);
  const [distanceM, setDistanceM] = useState(0);

  const [elevGainM, setElevGainM] = useState(0);
  const [maxSpeedMps, setMaxSpeedMps] = useState<number | null>(null);

  const [currentSpeedMps, setCurrentSpeedMps] = useState<number | null>(null);
  const [currentPaceSecPerKm, setCurrentPaceSecPerKm] = useState<number | null>(null);

  const [splits, setSplits] = useState<Split[]>([]);

  const startedAtRef = useRef<number | null>(null);
  const pausedAccumRef = useRef<number>(0);
  const pausedAtRef = useRef<number | null>(null);

  const lastGoodPointRef = useRef<{ lat: number; lon: number; alt: number | null } | null>(null);
  const lastAltRef = useRef<number | null>(null);

  const locationSubRef = useRef<Location.LocationSubscription | null>(null);

  const sampleBufferRef = useRef<OutdoorSampleInsert[]>([]);
  const lastTickRef = useRef<number>(Date.now());
  const lastDistanceRef = useRef<number>(0);
  const lastElapsedRef = useRef<number>(0);

  // timer loop
  useEffect(() => {
    if (status === 'idle') return;

    const t = setInterval(() => {
      if (!startedAtRef.current) return;

      const now = Date.now();
      const pausedAccum = pausedAccumRef.current + (pausedAtRef.current ? now - pausedAtRef.current : 0);
      const elapsed = Math.floor((now - startedAtRef.current - pausedAccum) / 1000);
      setElapsedS(elapsed);

      // moving time increments only when recording (not paused)
      if (status === 'recording') {
        setMovingS((v) => v + 1);
      }
    }, 1000);

    return () => clearInterval(t);
  }, [status]);

  const flushSamples = useCallback(async () => {
    const batch = sampleBufferRef.current;
    if (batch.length === 0) return;
    sampleBufferRef.current = [];
    try {
      await insertOutdoorSamples(batch);
    } catch {
      // If desired: re-queue with cap; for now, drop silently (keeps UX smooth)
    }
  }, []);

  const stopForegroundWatch = useCallback(async () => {
    if (locationSubRef.current) {
      locationSubRef.current.remove();
      locationSubRef.current = null;
    }
  }, []);

  const startForegroundWatch = useCallback(async () => {
    await stopForegroundWatch();

    locationSubRef.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 1000,
        distanceInterval: 2,
      },
      async (loc) => {
        if (!sessionId) return;

        const { latitude, longitude, altitude, accuracy, speed, heading } = loc.coords;

        const isAccOk = (accuracy ?? 999) <= MIN_GOOD_ACCURACY_M;
        const lat = Number.isFinite(latitude) ? latitude : null;
        const lon = Number.isFinite(longitude) ? longitude : null;

        // speed + pace
        const s = speed ?? null;
        setCurrentSpeedMps(s);
        const pace = paceSecPerKmFromSpeed(s);
        setCurrentPaceSecPerKm(pace);

        if (s != null) setMaxSpeedMps((m) => (m == null ? s : Math.max(m, s)));

        // auto-pause/resume (simple, Strava-like)
        if (autoPauseEnabled && isAccOk && s != null) {
          if (status === 'recording' && s < AUTO_PAUSE_SPEED_MPS) {
            // pause
            pausedAtRef.current = Date.now();
            setStatus('paused');
            await stopForegroundWatch();
            return;
          }
          if (status === 'paused' && s > AUTO_RESUME_SPEED_MPS) {
            // resume
            if (pausedAtRef.current) {
              pausedAccumRef.current += Date.now() - pausedAtRef.current;
              pausedAtRef.current = null;
            }
            setStatus('recording');
            await startForegroundWatch();
            return;
          }
        }

        // distance + elevation (foreground only; bg samples are still stored)
        if (lat != null && lon != null && status === 'recording') {
          const prev = lastGoodPointRef.current;
          if (prev) {
            const d = haversineM(prev.lat, prev.lon, lat, lon);

            // reject obvious spikes when accuracy is bad
            if (isAccOk && d < 80) {
              setDistanceM((v) => v + d);

              // elevation gain
              const alt = altitude ?? null;
              if (alt != null && lastAltRef.current != null) {
                const delta = alt - lastAltRef.current;
                if (delta > 0.8) setElevGainM((v) => v + delta);
              }
              lastAltRef.current = alt;
            }
          } else {
            lastAltRef.current = altitude ?? null;
          }

          lastGoodPointRef.current = { lat, lon, alt: altitude ?? null };
        }

        // build sample row
        const now = Date.now();
        const elapsed = startedAtRef.current
          ? Math.max(0, Math.floor((now - startedAtRef.current - pausedAccumRef.current) / 1000))
          : 0;

        const sample: OutdoorSampleInsert = {
          session_id: sessionId,
          ts: new Date(loc.timestamp).toISOString(),
          elapsed_s: elapsed,

          lat,
          lon,
          altitude_m: altitude ?? null,

          accuracy_m: accuracy ?? null,
          speed_mps: speed ?? null,
          bearing_deg: heading ?? null,

          hr_bpm: null,
          cadence_spm: null,

          grade_pct: null,
          distance_m: null,

          is_moving: status === 'recording',
          source: 'fg',
        };

        sampleBufferRef.current.push(sample);

        // flush every ~10 samples
        if (sampleBufferRef.current.length >= 10) {
          await flushSamples();
        }

        // auto splits every km
        const nowTick = Date.now();
        const prevDistance = lastDistanceRef.current;
        const nextDistance = prevDistance + 0; // state updates async; we estimate using lastDistanceRef only
        const prevElapsed = lastElapsedRef.current;
        const nextElapsed = elapsed;

        // Update refs for split estimation
        lastElapsedRef.current = nextElapsed;
        lastDistanceRef.current = distanceM; // best-effort (state lag ok)

        if (status === 'recording') {
          setSplits((cur) =>
            updateAutoKmSplits({
              splits: cur,
              prevDistanceM: prevDistance,
              nextDistanceM: distanceM,
              prevElapsedS: prevElapsed,
              nextElapsedS: nextElapsed,
            })
          );
        }

        lastTickRef.current = nowTick;
      }
    );
  }, [autoPauseEnabled, distanceM, flushSamples, sessionId, status, stopForegroundWatch]);

  const requestPermissions = useCallback(async () => {
    const fg = await Location.requestForegroundPermissionsAsync();
    if (fg.status !== 'granted') throw new Error('Location foreground permission denied');

    const bg = await Location.requestBackgroundPermissionsAsync();
    // background may be denied; we still run foreground-only
    return bg.status === 'granted';
  }, []);

  const start = useCallback(async () => {
    setStatus('saving');
    try {
      const bgGranted = await requestPermissions();

      const startedAt = Date.now();
      startedAtRef.current = startedAt;
      pausedAccumRef.current = 0;
      pausedAtRef.current = null;

      const session = await createOutdoorSession({
        activityType,
        startedAtISO: new Date(startedAt).toISOString(),
        timezoneStr: Intl.DateTimeFormat().resolvedOptions().timeZone,
        privacy,
      });

      setSessionId(session);
      await setActiveOutdoorSessionId(session);

      setElapsedS(0);
      setMovingS(0);
      setDistanceM(0);
      setElevGainM(0);
      setMaxSpeedMps(null);
      setSplits([]);

      setStatus('recording');
      await startForegroundWatch();

      if (bgGranted) {
        await startBackgroundUpdates();
      }
    } catch (e) {
      setStatus('idle');
      throw e;
    }
  }, [activityType, privacy, requestPermissions, startForegroundWatch]);

  const pause = useCallback(async () => {
    if (status !== 'recording') return;
    pausedAtRef.current = Date.now();
    setStatus('paused');
    await stopForegroundWatch();
    // keep background updates running (Strava-like), unless you want to stop them here
  }, [status, stopForegroundWatch]);

  const resume = useCallback(async () => {
    if (status !== 'paused') return;
    if (pausedAtRef.current) {
      pausedAccumRef.current += Date.now() - pausedAtRef.current;
      pausedAtRef.current = null;
    }
    setStatus('recording');
    await startForegroundWatch();
  }, [startForegroundWatch, status]);

  const lap = useCallback(() => {
    // manual split: time since last split boundary
    setSplits((cur) => {
      const lastEnd = cur.length === 0 ? 0 : cur[cur.length - 1].end_elapsed_s;
      const duration = Math.max(1, elapsedS - lastEnd);
      const pace = duration > 0 ? duration : null; // not distance-aware; used as a marker split
      return [
        ...cur,
        {
          index: cur.filter(s => s.kind === 'manual').length + 1,
          distance_m: 0,
          duration_s: duration,
          avg_pace_s_per_km: pace,
          start_elapsed_s: lastEnd,
          end_elapsed_s: elapsedS,
          kind: 'manual',
        },
      ];
    });
  }, [elapsedS]);

  const finish = useCallback(async () => {
    if (!sessionId) return;
    setStatus('saving');

    try {
      await stopForegroundWatch();
      await flushSamples();
      await stopBackgroundUpdates();

      const endedAt = new Date().toISOString();

      const durationS = elapsedS;
      const movingTimeS = movingS;
      const pausedTimeS = Math.max(0, durationS - movingTimeS);

      const avgSpeed = movingTimeS > 0 ? distanceM / movingTimeS : null;
      const avgPace = avgSpeed ? (1000 / avgSpeed) : null;

      await updateOutdoorSession(sessionId, {
        status: 'completed',
        ended_at: endedAt,
        duration_s: durationS,
        moving_time_s: movingTimeS,
        paused_time_s: pausedTimeS,
        distance_m: distanceM,
        elev_gain_m: elevGainM,
        max_speed_mps: maxSpeedMps,
        avg_speed_mps: avgSpeed,
        avg_pace_s_per_km: avgPace,
        splits,
        flags: {
          autopause: autoPauseEnabled,
        },
      });

      await clearActiveOutdoorSessionId();
      setStatus('idle');

      return sessionId;
    } catch (e) {
      setStatus('idle');
      throw e;
    }
  }, [autoPauseEnabled, distanceM, elapsedS, elevGainM, flushSamples, maxSpeedMps, movingS, sessionId, splits, stopForegroundWatch]);

  const cancel = useCallback(async () => {
    if (!sessionId) return;

    setStatus('saving');
    try {
      await stopForegroundWatch();
      await flushSamples();
      await stopBackgroundUpdates();

      await updateOutdoorSession(sessionId, {
        status: 'canceled',
        ended_at: new Date().toISOString(),
      });

      await clearActiveOutdoorSessionId();
      setStatus('idle');
    } catch (e) {
      setStatus('idle');
      throw e;
    }
  }, [flushSamples, sessionId, stopForegroundWatch]);

  return {
    activityType,
    privacy,
    setPrivacy,

    status,
    autoPauseEnabled,
    setAutoPauseEnabled,

    elapsedS,
    movingS,
    distanceM,

    elevGainM,
    maxSpeedMps,

    currentSpeedMps,
    currentPaceSecPerKm,

    splits,

    start,
    pause,
    resume,
    lap,
    finish,
    cancel,

    sessionId,
  };
}
