// components/my components/cardio/OutdoorMap.tsx
//
// Tensr Fitness — Outdoor live-tracking map + 10-second sampler
//
// What this delivers
// - High-accuracy live location on Mapbox (camera follows you)
// - Samples a data point every 10 seconds (coords, altitude, speed, accuracy)
// - Draws your path as a polyline, drops minimal circles for sampled points
// - Buffers samples to AsyncStorage immediately to minimize data loss
// - Flushes in small batches on a timer + when network becomes available
// - Works with `react-native-geolocation-service` (no Google dependency)
// - Clean teardown to avoid memory leaks and ghost watchers
//
// 🧩 Recommended NPMS (current & not deprecated):
//   npm i react-native-geolocation-service @react-native-async-storage/async-storage @react-native-community/netinfo
//   npm i @rnmapbox/maps
//
// ⚙️ Native setup (summary):
//   iOS (Info.plist):
//     <key>NSLocationWhenInUseUsageDescription</key><string>Your location is used to track runs.</string>
//     <key>NSLocationAlwaysAndWhenInUseUsageDescription</key><string>Needed to continue tracking if you background the app.</string>
//     <key>NSLocationAlwaysUsageDescription</key><string>Needed to continue tracking if you background the app.</string>
//     <key>UIBackgroundModes</key><array><string>location</string></array>
//   Android (AndroidManifest.xml):
//     <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
//     <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
//     <uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
//   Mapbox:
//     - Set MAPBOX_DOWNLOADS_TOKEN / RNMAPBOX_MAPS_DOWNLOAD_TOKEN & access token per library docs
//
// 🗄️ Supabase wiring (optional):
//   - This component exposes an `onFlush` callback that receives an array of samples.
//     You can insert them into your `cardio_samples` table. We also keep a durable
//     AsyncStorage queue to avoid losing points offline.
//
// ✅ Best-practice highlights for low-latency & low-loss:
//   - Use Geolocation.watchPosition with enableHighAccuracy + platform intervals
//   - Decouple the 10s sampling cadence from the watch stream (robust timing)
//   - Persist to AsyncStorage immediately; flush to backend in small batches
//   - Use NetInfo to flush when connectivity returns
//   - Keep Mapbox camera in follow mode for smooth live UI
//   - Strict cleanup of watchers/intervals on unmount
//

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, View, StyleSheet, AppState, AppStateStatus, Alert } from 'react-native';
import Geolocation, { GeoError, GeoPosition } from 'react-native-geolocation-service';
import MapboxGL from '@rnmapbox/maps';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

// ---- Types ----

type SamplePoint = {
  sessionId: string;
  // UNIX ms
  ts: number;
  // GeoJSON-friendly order [lon, lat]
  coord: [number, number];
  elevation?: number | null;
  speed?: number | null;     // m/s (platform dependent)
  accuracy?: number | null;  // meters
};

type OutdoorMapProps = {
  sessionId: string;
  mapboxStyleURL?: string; // fallback to MapboxGL.StyleURL.Outdoors
  // Sampling interval in ms (default 10s)
  sampleIntervalMs?: number;
  // Called when a flush happens. Insert to Supabase here if you want.
  onFlush?: (batch: SamplePoint[]) => Promise<void> | void;
};

// ---- Constants ----

const STORAGE_KEY = (sessionId: string) => `tensr:outdoor-sample-queue:${sessionId}`;
const FLUSH_INTERVAL_MS = 15_000; // try to flush ~ every 15s
const BATCH_SIZE = 25; // small batch for low-latency writes

// ---- Helper: durable queue ----

async function pushToQueue(sessionId: string, items: SamplePoint[]) {
  const key = STORAGE_KEY(sessionId);
  const existing = await AsyncStorage.getItem(key);
  const arr: SamplePoint[] = existing ? JSON.parse(existing) : [];
  arr.push(...items);
  await AsyncStorage.setItem(key, JSON.stringify(arr));
}

async function popBatch(sessionId: string, size: number): Promise<SamplePoint[]> {
  const key = STORAGE_KEY(sessionId);
  const existing = await AsyncStorage.getItem(key);
  const arr: SamplePoint[] = existing ? JSON.parse(existing) : [];
  const batch = arr.splice(0, size);
  await AsyncStorage.setItem(key, JSON.stringify(arr));
  return batch;
}

async function queueLength(sessionId: string): Promise<number> {
  const key = STORAGE_KEY(sessionId);
  const existing = await AsyncStorage.getItem(key);
  return existing ? JSON.parse(existing).length : 0;
}

// ---- Main component ----

const OutdoorMap: React.FC<OutdoorMapProps> = ({
  sessionId,
  mapboxStyleURL = MapboxGL.StyleURL.Outdoors,
  sampleIntervalMs = 10_000,
  onFlush,
}) => {
  const watchIdRef = useRef<number | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const lastSampleTsRef = useRef<number>(0);
  const lastPositionRef = useRef<GeoPosition | null>(null);
  const flushTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sampleTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [points, setPoints] = useState<SamplePoint[]>([]); // in-memory for drawing

  // ---- Request permissions up front ----
  const requestPermissions = useCallback(async (): Promise<boolean> => {
    try {
      const hasPermission = await (async () => {
        if (Platform.OS === 'ios') {
          const auth = await Geolocation.requestAuthorization('always'); // prefer 'always' for background continuity
          return auth === 'granted';
        } else {
          const fine = await Geolocation.requestAuthorization('whenInUse');
          // On Android 10+ you may also need ACCESS_BACKGROUND_LOCATION prompt separately
          return fine === 'granted';
        }
      })();

      if (!hasPermission) {
        Alert.alert('Location Permission', 'Location permission is required to track your run.');
      }
      return hasPermission;
    } catch {
      return false;
    }
  }, []);

  // ---- Start/stop the location watcher ----
  const startWatch = useCallback(async () => {
    const ok = await requestPermissions();
    if (!ok) return;

    // Clear any prior watcher
    if (watchIdRef.current != null) {
      Geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    // Start watching with high accuracy; intervals help Android,
    // iOS ignores interval but will still deliver frequent updates.
    watchIdRef.current = Geolocation.watchPosition(
      pos => {
        lastPositionRef.current = pos;
      },
      (err: GeoError) => {
        console.warn('watchPosition error', err?.code, err?.message);
      },
      {
        enableHighAccuracy: true,
        distanceFilter: 0, // we control cadence via timer
        interval: sampleIntervalMs, // Android
        fastestInterval: Math.max(1000, Math.floor(sampleIntervalMs / 2)), // Android
        showsBackgroundLocationIndicator: true, // iOS indicator
        useSignificantChanges: false,
        forceRequestLocation: false,
        forceLocationManager: false,
        accuracy: { android: 'high', ios: 'bestForNavigation' },
      }
    );
  }, [requestPermissions, sampleIntervalMs]);

  const stopWatch = useCallback(() => {
    if (watchIdRef.current != null) {
      Geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  // ---- 10-second sampler (decoupled from the native watch) ----
  const startSampler = useCallback(() => {
    if (sampleTimerRef.current) clearInterval(sampleTimerRef.current as any);

    sampleTimerRef.current = setInterval(async () => {
      const now = Date.now();
      // Guard against double-fire
      if (now - lastSampleTsRef.current < sampleIntervalMs - 250) return;

      const pos = lastPositionRef.current;
      if (!pos?.coords) return;

      lastSampleTsRef.current = now;

      const sample: SamplePoint = {
        sessionId,
        ts: now,
        coord: [pos.coords.longitude, pos.coords.latitude],
        elevation: typeof pos.coords.altitude === 'number' ? pos.coords.altitude : null,
        speed: typeof pos.coords.speed === 'number' ? pos.coords.speed : null,
        accuracy: typeof pos.coords.accuracy === 'number' ? pos.coords.accuracy : null,
      };

      // 1) append to in-memory for UI
      setPoints(prev => [...prev, sample]);

      // 2) persist immediately to durable queue
      await pushToQueue(sessionId, [sample]);
    }, Math.max(1000, Math.floor(sampleIntervalMs / 2))); // tick faster than the target cadence
  }, [sampleIntervalMs, sessionId]);

  const stopSampler = useCallback(() => {
    if (sampleTimerRef.current) clearInterval(sampleTimerRef.current as any);
    sampleTimerRef.current = null;
  }, []);

  // ---- Flusher: tries to empty the queue periodically & on connectivity regain ----
  const flushOnce = useCallback(async () => {
    if (!onFlush) return; // skip if not provided
    const isConnected = await NetInfo.fetch().then(s => !!s.isInternetReachable);
    if (!isConnected) return;

    let more = await queueLength(sessionId);
    while (more > 0) {
      const batch = await popBatch(sessionId, BATCH_SIZE);
      if (!batch.length) break;
      try {
        await onFlush(batch);
      } catch (e) {
        // Put back on failure to avoid loss
        await pushToQueue(sessionId, batch);
        break;
      }
      more = await queueLength(sessionId);
      // small yield between batches
      // eslint-disable-next-line no-await-in-loop
      await new Promise(r => setTimeout(r, 150));
    }
  }, [onFlush, sessionId]);

  const startFlusher = useCallback(() => {
    if (flushTimerRef.current) clearInterval(flushTimerRef.current as any);
    flushTimerRef.current = setInterval(flushOnce, FLUSH_INTERVAL_MS);
  }, [flushOnce]);

  const stopFlusher = useCallback(() => {
    if (flushTimerRef.current) clearInterval(flushTimerRef.current);
    flushTimerRef.current = null;
  }, []);

  // ---- AppState to keep things resilient on background/foreground transitions ----
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      const prev = appStateRef.current;
      appStateRef.current = next;

      // If returning to foreground, attempt a flush quickly
      if (prev.match(/background|inactive/) && next === 'active') {
        flushOnce();
      }
    });
    return () => sub.remove();
  }, [flushOnce]);

  // ---- Connectivity listener: flush when connectivity returns ----
  useEffect(() => {
    const unsub = NetInfo.addEventListener(state => {
      if (state.isInternetReachable) {
        // fire and forget
        flushOnce();
      }
    });
    return () => unsub();
  }, [flushOnce]);

  // ---- Mount/unmount lifecycle ----
  useEffect(() => {
    startWatch();
    startSampler();
    startFlusher();

    return () => {
      stopFlusher();
      stopSampler();
      stopWatch();
    };
  }, [startWatch, startSampler, startFlusher, stopFlusher, stopSampler, stopWatch]);

  // ---- Map source/layers ----
  const lineString = useMemo(() => {
    const coords = points.map(p => p.coord);
    return {
      type: 'Feature' as const,
      geometry: {
        type: 'LineString' as const,
        coordinates: coords.length ? coords : undefined,
      },
    };
  }, [points]);

  const pointsCollection = useMemo(() => {
    return {
      type: 'FeatureCollection' as const,
      features: points.map(p => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: p.coord },
        properties: { ts: p.ts },
      })),
    };
  }, [points]);

  return (
    <View style={styles.container}>
      <MapboxGL.MapView
        style={StyleSheet.absoluteFill}
        styleURL={mapboxStyleURL}
        compassEnabled
        logoEnabled={false}
      >
        <MapboxGL.Camera
          followUserLocation
          followUserMode="normal"
          followZoomLevel={16}
          animationDuration={800}
        />

        {/* Native location puck (fastest, lowest latency) */}
        <MapboxGL.UserLocation
          visible
          androidRenderMode="compass"
          showsUserHeadingIndicator
        />

        {/* Path polyline */}
        {points.length > 1 && (
          <MapboxGL.ShapeSource id="route" shape={lineString as any}>
            <MapboxGL.LineLayer
              id="routeLine"
              style={{
                lineColor: '#00E0E0',
                lineWidth: 4,
                lineOpacity: 0.9,
              }}
            />
          </MapboxGL.ShapeSource>
        )}

        {/* Sampled points (subtle) */}
        {points.length > 0 && (
          <MapboxGL.ShapeSource id="samples" shape={pointsCollection as any}>
            <MapboxGL.CircleLayer
              id="sampleDots"
              style={{
                circleRadius: 3,
                circleColor: '#FFFFFF',
                circleOpacity: 0.8,
                circleStrokeColor: '#00E0E0',
                circleStrokeWidth: 1,
              }}
            />
          </MapboxGL.ShapeSource>
        )}
      </MapboxGL.MapView>
    </View>
  );
};

export default OutdoorMap;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
});
