// app/(tabs)/new/OutdoorSession.tsx
// DIAGNOSTICS ADDED:
// - On-screen status banner (permission, provider, last error, fix count)
// - Extra console.logs around permission + watchPosition
// - onMapReady + onRegionChangeComplete logs
// - Safer first fix + animate camera
// - Android-only: prompt to enable network provider

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Platform, SafeAreaView, StyleSheet, Text, TouchableOpacity, View, Alert } from 'react-native';
import MapView, { Polyline, PROVIDER_GOOGLE, LatLng, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { useFocusEffect, router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

type LocationSub = Location.LocationSubscription | null;

const ORANGE = '#FF9D2E';
const BG = '#2B2B2B';
const CARD = '#3A3A3A';
const WHITE = '#fff';

const initialRegion: Region = {
  latitude: 40.758,
  longitude: -73.9855,
  latitudeDelta: 0.02,
  longitudeDelta: 0.02,
};

export default function OutdoorSession() {
  const mapRef = useRef<MapView>(null);
  const watchRef = useRef<LocationSub>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [coords, setCoords] = useState<LatLng[]>([]);
  const [isTracking, setIsTracking] = useState(true);
  const [elapsedSec, setElapsedSec] = useState(0);

  // NEW: diagnostics
  const [permStatus, setPermStatus] = useState<'unknown' | 'granted' | 'denied'>('unknown');
  const [lastError, setLastError] = useState<string | null>(null);
  const [fixCount, setFixCount] = useState(0);
  const [mapReady, setMapReady] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;

      const boot = async () => {
        try {
          // 1) Permission
          const { status, canAskAgain, granted } = await Location.requestForegroundPermissionsAsync();
          setPermStatus(granted ? 'granted' : 'denied');
          console.log('[GPS] permission:', status, 'granted:', granted, 'canAskAgain:', canAskAgain);

          if (!granted) {
            setLastError('Location permission denied');
            Alert.alert('Permission needed', 'Location permission is required to track your run.');
            setIsTracking(false);
            return;
          }

          // 2) Android: gently ensure any provider is enabled
          if (Platform.OS === 'android') {
            try {
              await Location.enableNetworkProviderAsync(); // no-op on iOS
              console.log('[GPS] enableNetworkProviderAsync called');
            } catch (e: any) {
              console.log('[GPS] enableNetworkProviderAsync error:', e?.message);
            }
          }

          // 3) Get an initial fix and center map
          const first = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Highest,
            mayShowUserSettingsDialog: true,
          });
          if (!mounted) return;

          const p: LatLng = { latitude: first.coords.latitude, longitude: first.coords.longitude };
          setCoords([p]);
          setFixCount(1);
          animateTo(p);
          console.log('[GPS] first fix:', p);

          // 4) Start watching + timer
          startWatching();
          startTimer();
        } catch (e: any) {
          console.log('[GPS] boot error:', e?.message);
          setLastError(e?.message ?? 'Unknown error during boot');
          setIsTracking(false);
        }
      };

      boot();
      return () => {
        mounted = false;
        stopWatching();
        stopTimer();
      };
    }, [])
  );

  const startWatching = async () => {
    stopWatching();
    try {
      watchRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Highest,
          timeInterval: 1000,
          distanceInterval: 2,
          mayShowUserSettingsDialog: true,
        },
        (loc) => {
          if (!isTracking) return;
          const pt: LatLng = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
          setCoords((prev) => {
            const next = prev.length ? [...prev, pt] : [pt];
            return next;
          });
          setFixCount((n) => n + 1);
          setLastError(null);
          // keep camera near user (not every tick to reduce motion)
          if (fixCount % 2 === 0) animateTo(pt);
          console.log('[GPS] update:', pt);
        }
      );
    } catch (e: any) {
      console.log('[GPS] watchPosition error:', e?.message);
      setLastError(e?.message ?? 'watchPosition failed');
    }
  };

  const stopWatching = () => {
    if (watchRef.current) {
      watchRef.current.remove();
      watchRef.current = null;
    }
  };

  const startTimer = () => {
    stopTimer();
    timerRef.current = setInterval(() => {
      setElapsedSec((s) => (isTracking ? s + 1 : s));
    }, 1000);
  };
  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const animateTo = (p: LatLng) => {
    mapRef.current?.animateCamera({ center: p, zoom: 16, heading: 0, pitch: 0 }, { duration: 600 });
  };

  // Stats
  const haversine = (a: LatLng, b: LatLng) => {
    const toRad = (n: number) => (n * Math.PI) / 180;
    const R = 6371000;
    const dLat = toRad(b.latitude - a.latitude);
    const dLon = toRad(b.longitude - a.longitude);
    const lat1 = toRad(a.latitude);
    const lat2 = toRad(b.latitude);
    const s =
      Math.sin(dLat / 2) ** 2 +
      Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
    return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
  };
  const distanceMiles = useMemo(() => {
    if (coords.length < 2) return 0;
    let m = 0;
    for (let i = 1; i < coords.length; i++) m += haversine(coords[i - 1], coords[i]);
    return m / 1609.344;
  }, [coords]);

  const timeStr = useMemo(() => {
    const m = Math.floor(elapsedSec / 60);
    const s = elapsedSec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }, [elapsedSec]);

  const pace = useMemo(() => {
    if (distanceMiles <= 0) return '--';
    const minPerMile = (elapsedSec / 60) / distanceMiles;
    const m = Math.floor(minPerMile);
    const s = Math.round((minPerMile - m) * 60);
    return `${m}:${String(s).padStart(2, '0')} min/mi`;
  }, [elapsedSec, distanceMiles]);

  return (
    <SafeAreaView style={styles.safe}>
      {/* header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back-ios" size={18} color={WHITE} />
        </TouchableOpacity>
        <Text style={styles.title}>OUTDOOR RUN</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* MAP */}
      <View style={styles.mapWrap}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          initialRegion={initialRegion}
          provider={PROVIDER_GOOGLE} // remove if you don’t have Google keys configured
          showsUserLocation
          showsMyLocationButton={false}
          onMapReady={() => {
            setMapReady(true);
            console.log('[MAP] ready');
          }}
          onRegionChangeComplete={(r) => {
            console.log('[MAP] region change:', r);
          }}
          customMapStyle={DARK}
        >
          {coords.length > 1 && (
            <Polyline coordinates={coords} strokeColor={ORANGE} strokeWidth={4} />
          )}
        </MapView>
        <View style={styles.mapDivider} />
      </View>

      {/* STATS */}
      <View style={styles.stats}>
        <Block label="TIME" value={timeStr} />
        <Block label="DISTANCE" value={`${distanceMiles.toFixed(2)} mi`} />
        <Block label="PACE" value={pace} />
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.cta, { backgroundColor: '#262626', borderWidth: 1, borderColor: '#444' }]}
            onPress={() => setIsTracking((v) => !v)}
          >
            <Text style={styles.ctaText}>{isTracking ? 'PAUSE' : 'RESUME'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.cta, { backgroundColor: ORANGE }]} onPress={() => router.back()}>
            <Text style={styles.ctaText}>FINISH</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* DIAGNOSTIC BANNER */}
      <View style={styles.diag}>
        <Text style={styles.diagText}>
          perm:{permStatus} | map:{mapReady ? 'ready' : 'waiting'} | fixes:{fixCount}
          {lastError ? ` | err:${lastError}` : ''}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const Block = ({ label, value }: { label: string; value: string }) => (
  <View style={{ alignItems: 'center', paddingVertical: 6 }}>
    <Text style={{ color: '#FFFFFF99', fontSize: 12, letterSpacing: 1 }}>{label}</Text>
    <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800', marginTop: 2 }}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  header: {
    height: 48, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#444',
  },
  backBtn: { width: 24, height: 24, justifyContent: 'center' },
  title: { flex: 1, color: WHITE, textAlign: 'center', fontWeight: '700', letterSpacing: 1.2 },
  mapWrap: { flex: 1, backgroundColor: '#000' },
  mapDivider: { position: 'absolute', bottom: 0, height: 2, width: '100%', backgroundColor: ORANGE, opacity: 0.9 },
  stats: { backgroundColor: CARD, borderTopWidth: 1, borderTopColor: '#444', padding: 14, paddingTop: 10 },
  actions: { flexDirection: 'row', gap: 12, justifyContent: 'center', marginTop: 12 },
  cta: { flex: 1, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  ctaText: { color: '#fff', fontWeight: '700', letterSpacing: 0.5 },
  diag: { alignItems: 'center', paddingVertical: 6, backgroundColor: '#1d1d1d' },
  diagText: { color: '#bbb', fontSize: 12 },
});

const DARK = [
  { elementType: 'geometry', stylers: [{ color: '#1f1f1f' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1f1f1f' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8a8a8a' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2a2a2a' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1a1a1a' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#151515' }] },
];
