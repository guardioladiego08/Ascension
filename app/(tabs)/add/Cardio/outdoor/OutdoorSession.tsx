import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import type { LatLng } from 'react-native-maps';

import { Colors } from '@/constants/Colors';
import LogoHeader from '@/components/my components/logoHeader';

import OutdoorMetrics from './components/OutdoorMetrics';
import OutdoorMapSlide from './components/OutdoorMapSlide';
import ConfirmCancelModal from './components/ConfrmCancelModal';

import { haversineMeters, paceSecPerKm } from '@/lib/OutdoorSession/outdoorUtils';

type Phase = 'idle' | 'running' | 'paused';
type ActivityType = 'run' | 'walk' | 'bike' | 'hike' | 'other';

const CARD = Colors.dark.card;
const TEXT = Colors.dark.text;
const BG = Colors.dark.background;
const PRIMARY = Colors.dark.highlight1;
const H_PADDING = 16;

function outdoorTitle(activityType?: string, fallback?: string) {
  const t = (activityType ?? '').toLowerCase();
  if (t === 'run') return 'OUTDOOR RUN';
  if (t === 'walk') return 'OUTDOOR WALK';
  if (t === 'bike') return 'OUTDOOR BIKE';
  if (t === 'hike') return 'OUTDOOR HIKE';
  return (fallback ?? 'OUTDOOR SESSION').toUpperCase();
}

export default function OutdoorSession() {
  const router = useRouter();
  const params = useLocalSearchParams<{ title?: string; activityType?: string }>();
  const { width } = useWindowDimensions();

  const title = useMemo(
    () => outdoorTitle(params.activityType, params.title),
    [params.activityType, params.title]
  );

  const [phase, setPhase] = useState<Phase>('idle');
  const [cancelOpen, setCancelOpen] = useState(false);

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [distanceMeters, setDistanceMeters] = useState(0);

  const [coords, setCoords] = useState<LatLng[]>([]);
  const coordsRef = useRef<LatLng[]>([]);

  const [pageIndex, setPageIndex] = useState(0);
  const pagerRef = useRef<ScrollView | null>(null);

  const timerRef = useRef<NodeJS.Timer | null>(null);
  const locationSubRef = useRef<Location.LocationSubscription | null>(null);
  const lastPointRef = useRef<{ lat: number; lng: number } | null>(null);

  const hasProgress = elapsedSeconds > 0 || distanceMeters > 0;

  const currentPace = useMemo(() => {
    if (phase === 'idle') return null;
    return paceSecPerKm(distanceMeters, elapsedSeconds);
  }, [distanceMeters, elapsedSeconds, phase]);

  useEffect(() => {
    return () => {
      stopTimer();
      stopLocation();
    };
  }, []);

  /* -------------------- TIMER -------------------- */

  function startTimer() {
    stopTimer();
    timerRef.current = setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);
  }

  function stopTimer() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  }

  /* -------------------- LOCATION -------------------- */

  async function startLocation() {
    stopLocation();

    const perm = await Location.requestForegroundPermissionsAsync();
    if (perm.status !== 'granted') return;

    locationSubRef.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Highest,
        timeInterval: 1000,
        distanceInterval: 2,
      },
      (loc) => {
        if (phase !== 'running') return;

        const { latitude, longitude, accuracy } = loc.coords;
        if (accuracy && accuracy > 35) return;

        const point = { lat: latitude, lng: longitude };
        if (lastPointRef.current) {
          const delta = haversineMeters(lastPointRef.current, point);
          if (delta < 80) setDistanceMeters((d) => d + delta);
        }
        lastPointRef.current = point;

        const mapPoint: LatLng = { latitude, longitude };
        coordsRef.current = [...coordsRef.current, mapPoint];
        setCoords(coordsRef.current);
      }
    );
  }

  function stopLocation() {
    if (locationSubRef.current) {
      locationSubRef.current.remove();
      locationSubRef.current = null;
    }
  }

  /* -------------------- SESSION CONTROL -------------------- */

  function resetSession() {
    setElapsedSeconds(0);
    setDistanceMeters(0);
    lastPointRef.current = null;

    coordsRef.current = [];
    setCoords([]);
    setPageIndex(0);

    requestAnimationFrame(() => {
      pagerRef.current?.scrollTo({ x: 0, animated: false });
    });
  }

  async function onStart() {
    resetSession();
    setPhase('running');
    startTimer();
    await startLocation();
  }

  function onPause() {
    setPhase('paused');
    stopTimer();
    stopLocation();
  }

  async function onResume() {
    setPhase('running');
    startTimer();
    await startLocation();
  }

  function onEndWorkout() {
    stopTimer();
    stopLocation();

    router.push({
      pathname: './SessionSummary',
      params: {
        title,
        activityType: params.activityType ?? 'other',
        elapsedSeconds: String(elapsedSeconds),
        distanceMeters: String(distanceMeters),
      },
    });

    setPhase('idle');
    resetSession();
  }

  function confirmCancel() {
    stopTimer();
    stopLocation();
    setPhase('idle');
    resetSession();
    setCancelOpen(false);
    router.replace('/(tabs)/home');
  }

  function onBackPress() {
    if (hasProgress) {
      if (phase === 'running') onPause();
      setCancelOpen(true);
    } else {
      router.back();
    }
  }

  /* -------------------- PAGER -------------------- */

  function onPagerEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const x = e.nativeEvent.contentOffset.x;
    setPageIndex(Math.round(x / width));
  }

  const isIdle = phase === 'idle';
  const isRunning = phase === 'running';
  const isPaused = phase === 'paused';

  /* -------------------- RENDER -------------------- */

  return (
    <LinearGradient
      colors={['#3a3a3bff', '#1e1e1eff', BG]}
      start={{ x: 0.2, y: 0 }}
      end={{ x: 0.8, y: 1 }}
      style={{ flex: 1 }}
    >
      <ConfirmCancelModal
        visible={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onConfirmCancel={confirmCancel}
      />

      <View style={styles.safe}>
        <View style={styles.logoWrap}>
          <LogoHeader />
        </View>

        {/* HEADER */}
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.iconBtn} onPress={onBackPress}>
            <Ionicons name="chevron-back" size={20} color={TEXT} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.current}>CURRENT</Text>
            <Text style={styles.title}>{title}</Text>
          </View>

          <View style={styles.iconSpacer} />
        </View>

        {/* CONTENT */}
        <View style={styles.content}>
          {isIdle ? (
            <View style={styles.startWrap}>
              <TouchableOpacity style={styles.startBtn} onPress={onStart}>
                <Ionicons name="play" size={18} color="#0E151F" />
                <Text style={styles.startText}>Start</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={{ flex: 1, marginHorizontal: -H_PADDING }}>
                <ScrollView
                  ref={pagerRef}
                  horizontal
                  pagingEnabled
                  snapToInterval={width}
                  decelerationRate="fast"
                  disableIntervalMomentum
                  bounces={false}
                  showsHorizontalScrollIndicator={false}
                  onMomentumScrollEnd={onPagerEnd}
                >
                  <View style={{ width, paddingHorizontal: H_PADDING }}>
                    <View style={styles.metricsCenter}>
                      <OutdoorMetrics
                        elapsedSeconds={elapsedSeconds}
                        distanceMeters={distanceMeters}
                        currentPaceSecPerKm={currentPace}
                      />
                      <Text style={styles.hint}>Swipe left for map</Text>
                    </View>
                  </View>

                  <View style={{ width, paddingHorizontal: H_PADDING }}>
                    <OutdoorMapSlide coords={coords} />
                  </View>
                </ScrollView>
              </View>

              <View style={styles.dots}>
                <View style={[styles.dot, pageIndex === 0 && styles.dotActive]} />
                <View style={[styles.dot, pageIndex === 1 && styles.dotActive]} />
              </View>
            </>
          )}
        </View>

        {/* BOTTOM */}
        <View style={styles.bottom}>
          {!isIdle && (
            <TouchableOpacity style={styles.pauseBtn} onPress={isRunning ? onPause : onResume}>
              <Ionicons name={isRunning ? 'pause' : 'play'} size={18} color={TEXT} />
              <Text style={styles.pauseText}>{isRunning ? 'Pause' : 'Resume'}</Text>
            </TouchableOpacity>
          )}

          {isPaused && (
            <View style={styles.pausedRow}>
              <TouchableOpacity style={styles.endBtn} onPress={onEndWorkout}>
                <Ionicons name="checkmark" size={18} color={TEXT} />
                <Text style={styles.endText}>End</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.cancelBtn} onPress={() => setCancelOpen(true)}>
                <Ionicons name="close" size={18} color="#e04b4b" />
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </LinearGradient>
  );
}

/* -------------------- STYLES -------------------- */

const styles = StyleSheet.create({
  safe: { flex: 1 },

  logoWrap: { paddingTop: 6, paddingHorizontal: 16 },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
    justifyContent: 'space-between',
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: CARD,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconSpacer: { width: 44 },

  headerCenter: { alignItems: 'center' },
  current: {
    fontSize: 11,
    letterSpacing: 2,
    opacity: 0.7,
    fontWeight: '700',
    color: TEXT,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: PRIMARY,
  },

  content: { flex: 1, paddingHorizontal: 16 },

  startWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  startBtn: {
    height: 58,
    paddingHorizontal: 20,
    borderRadius: 18,
    backgroundColor: PRIMARY,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  startText: { fontWeight: '900', fontSize: 16, color: '#0E151F' },

  metricsCenter: { flex: 1, justifyContent: 'center' },
  hint: {
    marginTop: 14,
    textAlign: 'center',
    opacity: 0.6,
    fontSize: 12,
    fontWeight: '800',
    color: TEXT,
  },

  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 99,
    backgroundColor: TEXT,
    opacity: 0.25,
  },
  dotActive: {
    backgroundColor: PRIMARY,
    opacity: 1,
  },

  bottom: { paddingHorizontal: 16, paddingBottom: 12 },

  pauseBtn: {
    height: 58,
    borderRadius: 18,
    backgroundColor: CARD,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pauseText: { fontSize: 16, fontWeight: '900', color: TEXT },

  pausedRow: { flexDirection: 'row', gap: 12, marginTop: 10 },
  endBtn: {
    flex: 1,
    height: 52,
    borderRadius: 18,
    backgroundColor: CARD,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  endText: { fontWeight: '900', color: TEXT },

  cancelBtn: {
    flex: 1,
    height: 52,
    borderRadius: 18,
    backgroundColor: CARD,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: { fontWeight: '900', color: '#e04b4b' },
});
