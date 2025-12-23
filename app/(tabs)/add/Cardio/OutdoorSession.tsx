// app/(tabs)/new/OutdoorSession.tsx
//
// Tensr Fitness — Live Outdoor Session Tracking
// -----------------------------------------------------------
// ✅ Features
// - Live map with MapboxGL (follows your movement)
// - High-accuracy location using react-native-geolocation-service
// - Samples data every 10 seconds (coords, elevation, speed, accuracy)
// - Persists each sample to AsyncStorage instantly (offline-safe)
// - Flushes data to Supabase in small batches every 15s or on reconnect
// - Smooth live UI via Mapbox camera follow + native UserLocation
//
// 🧠 NPMS (current & stable)
//   npm i react-native-geolocation-service @react-native-async-storage/async-storage @react-native-community/netinfo
//   npm i @rnmapbox/maps
//
// -----------------------------------------------------------

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  SafeAreaView,
  Text,
  StyleSheet,
  Platform,
  AppState,
  AppStateStatus,
  Alert,
} from 'react-native';
import Geolocation, { GeoPosition, GeoError } from 'react-native-geolocation-service';
import MapboxGL from '@rnmapbox/maps';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import LogoHeader from '@/components/my components/logoHeader';

// ---- Types ----
type SamplePoint = {
  sessionId: string;
  ts: number;
  coord: [number, number];
  elevation?: number | null;
  speed?: number | null;
  accuracy?: number | null;
};

// ---- Constants ----
const FLUSH_INTERVAL_MS = 15_000;
const SAMPLE_INTERVAL_MS = 10_000;
const BATCH_SIZE = 25;
const STORAGE_KEY = (sessionId: string) => `tensr:outdoor-sample-queue:${sessionId}`;

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

export default function OutdoorSession() {
  const router = useRouter();
  // Lightweight UUID v4 generator (sufficient for session IDs)
  const uuidv4 = () =>
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  const sessionId = useRef<string>(uuidv4()).current; // new unique session
  const [points, setPoints] = useState<SamplePoint[]>([]);
  const lastPositionRef = useRef<GeoPosition | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const sampleTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const flushTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSampleTsRef = useRef<number>(0);
  const cameraRef = useRef<MapboxGL.Camera>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const [current, setCurrent] = useState<{ lat: number; lon: number; acc?: number | null } | null>(null);

  // --- Permissions ---
  const requestPermissions = useCallback(async (): Promise<boolean> => {
    try {
      const granted = await (async () => {
        if (Platform.OS === 'ios') {
          const auth = await Geolocation.requestAuthorization('always');
          return auth === 'granted';
        } else {
          const fine = await Geolocation.requestAuthorization('whenInUse');
          return fine === 'granted';
        }
      })();
      if (!granted) Alert.alert('Permission required', 'Enable location permissions to track your run.');
      return granted;
    } catch {
      return false;
    }
  }, []);

  // --- Start/stop watcher ---
  const startWatch = useCallback(async () => {
    const ok = await requestPermissions();
    if (!ok) return;

    if (watchIdRef.current != null) {
      Geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    watchIdRef.current = Geolocation.watchPosition(
      pos => {
        lastPositionRef.current = pos;
        setCurrent({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          acc: pos.coords.accuracy ?? null,
        });
        cameraRef.current?.setCamera({
          centerCoordinate: [pos.coords.longitude, pos.coords.latitude],
          zoomLevel: 16,
          animationDuration: 800,
        });
        console.log('watchPosition:', pos.coords);
      },
      (err: GeoError) => console.warn('watchPosition error', err.message),
      {
        enableHighAccuracy: true,
        distanceFilter: 0,
        interval: SAMPLE_INTERVAL_MS,
        fastestInterval: SAMPLE_INTERVAL_MS / 2,
        showsBackgroundLocationIndicator: true,
        accuracy: { android: 'high', ios: 'bestForNavigation' },
      }
    );
  }, [requestPermissions]);

  const stopWatch = useCallback(() => {
    if (watchIdRef.current != null) {
      Geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  // --- 10s sampler ---
  const startSampler = useCallback(() => {
    if (sampleTimerRef.current) clearInterval(sampleTimerRef.current as any);
    sampleTimerRef.current = setInterval(async () => {
      const now = Date.now();
      if (now - lastSampleTsRef.current < SAMPLE_INTERVAL_MS - 250) return;
      const pos = lastPositionRef.current;
      if (!pos?.coords) return;

      lastSampleTsRef.current = now;
      const sample: SamplePoint = {
        sessionId,
        ts: now,
        coord: [pos.coords.longitude, pos.coords.latitude],
        elevation: pos.coords.altitude ?? null,
        speed: pos.coords.speed ?? null,
        accuracy: pos.coords.accuracy ?? null,
      };
      setPoints(prev => [...prev, sample]);
      await pushToQueue(sessionId, [sample]);
    }, SAMPLE_INTERVAL_MS / 2);
  }, [sessionId]);

  const stopSampler = useCallback(() => {
    if (sampleTimerRef.current) clearInterval(sampleTimerRef.current as any);
    sampleTimerRef.current = null;
  }, []);

  // --- Flush samples to Supabase ---
  const flushOnce = useCallback(async () => {
    const isConnected = await NetInfo.fetch().then(s => !!s.isInternetReachable);
    if (!isConnected) return;
    let more = await queueLength(sessionId);
    while (more > 0) {
      const batch = await popBatch(sessionId, BATCH_SIZE);
      if (!batch.length) break;
      const rows = batch.map(b => ({
        session_id: b.sessionId,
        captured_at: new Date(b.ts).toISOString(),
        longitude: b.coord[0],
        latitude: b.coord[1],
        elevation_m: b.elevation,
        speed_mps: b.speed,
        accuracy_m: b.accuracy,
      }));
      const { error } = await supabase.from('cardio_samples').insert(rows);
      if (error) {
        await pushToQueue(sessionId, batch); // requeue
        break;
      }
      more = await queueLength(sessionId);
      await new Promise(r => setTimeout(r, 150));
    }
  }, [sessionId]);

  const startFlusher = useCallback(() => {
    if (flushTimerRef.current) clearInterval(flushTimerRef.current as any);
    flushTimerRef.current = setInterval(flushOnce, FLUSH_INTERVAL_MS);
  }, [flushOnce]);

  const stopFlusher = useCallback(() => {
    if (flushTimerRef.current) clearInterval(flushTimerRef.current as any);
    flushTimerRef.current = null;
  }, []);

  // --- Lifecycle ---
  useEffect(() => {
    startWatch();
    startSampler();
    startFlusher();
    return () => {
      stopWatch();
      stopSampler();
      stopFlusher();
    };
  }, [startWatch, startSampler, startFlusher, stopWatch, stopSampler, stopFlusher]);

  // --- App state + connectivity ---
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      const prev = appStateRef.current;
      appStateRef.current = next;
      if (prev.match(/background|inactive/) && next === 'active') flushOnce();
    });
    const unsub = NetInfo.addEventListener(s => s.isInternetReachable && flushOnce());
    return () => {
      sub.remove();
      unsub();
    };
  }, [flushOnce]);

  // --- Map drawing ---
  const lineString = useMemo(
    () => ({
      type: 'Feature' as const,
      geometry: { type: 'LineString' as const, coordinates: points.map(p => p.coord) },
    }),
    [points]
  );

  const pointsCollection = useMemo(
    () => ({
      type: 'FeatureCollection' as const,
      features: points.map(p => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: p.coord },
        properties: { ts: p.ts },
      })),
    }),
    [points]
  );

  return (
    <SafeAreaView style={styles.safe}>
      <LogoHeader />
      <Text style={styles.title}>Outdoor Session</Text>
      <Text style={styles.coords}>
        {current
          ? `lat: ${current.lat.toFixed(5)}  lon: ${current.lon.toFixed(5)}  acc: ~${current.acc ?? '?'}m`
          : 'Waiting for GPS...'}
      </Text>
      
      <View style={styles.mapContainer}>
        <MapboxGL.MapView
          styleURL={MapboxGL.StyleURL.Outdoors}
          style={StyleSheet.absoluteFill}
          compassEnabled
          logoEnabled={false}
        >
          <MapboxGL.Camera
            ref={cameraRef}
            defaultSettings={{ zoomLevel: 16 }}
          />
          <MapboxGL.UserLocation visible androidRenderMode="compass" showsUserHeadingIndicator />
          {points.length > 1 && (
            <MapboxGL.ShapeSource id="route" shape={lineString as any}>
              <MapboxGL.LineLayer id="routeLine" style={styles.routeLine} />
            </MapboxGL.ShapeSource>
          )}
          {points.length > 0 && (
            <MapboxGL.ShapeSource id="samples" shape={pointsCollection as any}>
              <MapboxGL.CircleLayer id="sampleDots" style={styles.sampleDots} />
            </MapboxGL.ShapeSource>
          )}
        </MapboxGL.MapView>
      </View>
    </SafeAreaView>
  );
}

// ---- Styles ----
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#121212' },
  title: {
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
    color: '#FF950A',
    marginVertical: 8,
  },
  coords: {
    textAlign: 'center',
    color: '#BBBBBB',
    marginBottom: 6,
  },
  mapContainer: { flex: 1 },
  routeLine: {
    lineColor: '#00E0E0',
    lineWidth: 4,
    lineOpacity: 0.9,
  },
  sampleDots: {
    circleRadius: 3,
    circleColor: '#FFFFFF',
    circleOpacity: 0.8,
    circleStrokeColor: '#00E0E0',
    circleStrokeWidth: 1,
  },
});
