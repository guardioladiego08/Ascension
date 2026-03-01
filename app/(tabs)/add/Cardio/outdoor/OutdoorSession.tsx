import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import type { LatLng } from 'react-native-maps';

import { Colors } from '@/constants/Colors';
import { useUnits } from '@/contexts/UnitsContext';
import LogoHeader from '@/components/my components/logoHeader';

import OutdoorMetrics from './components/OutdoorMetrics';
import OutdoorMapSlide from './components/OutdoorMapSlide';
import ConfirmCancelModal from './components/ConfrmCancelModal';

import { haversineMeters, paceSecPerKm } from '@/lib/OutdoorSession/outdoorUtils';
import {
  clearActiveRunWalkLock,
  getActiveRunWalkLock,
  setActiveRunWalkLock,
  type RunWalkMode,
} from '@/lib/runWalkSessionLock';
import {
  upsertOutdoorDraft,
  type OutdoorDraftSample,
  type OutdoorSessionDraft,
} from '@/lib/OutdoorSession/draftStore';
import { useActiveRunWalk } from '@/providers/ActiveRunWalkProvider';

type Phase = 'idle' | 'running' | 'paused';
type ActivityType = 'run' | 'walk' | 'bike' | 'hike' | 'other';

const CARD = Colors.dark.card;
const TEXT = Colors.dark.text;
const BG = Colors.dark.background;
const PRIMARY = Colors.dark.highlight1;

function outdoorTitle(activityType?: string, fallback?: string) {
  const t = (activityType ?? '').toLowerCase();
  if (t === 'run') return 'OUTDOOR RUN';
  if (t === 'walk') return 'OUTDOOR WALK';
  if (t === 'bike') return 'OUTDOOR BIKE';
  if (t === 'hike') return 'OUTDOOR HIKE';
  return (fallback ?? 'OUTDOOR SESSION').toUpperCase();
}

function normalizeActivityType(activityType?: string): ActivityType {
  const t = (activityType ?? '').toLowerCase();
  if (t === 'walk') return 'walk';
  if (t === 'run') return 'run';
  if (t === 'bike') return 'bike';
  if (t === 'hike') return 'hike';
  return 'other';
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function OutdoorSession() {
  const router = useRouter();
  const { distanceUnit } = useUnits();
  const params = useLocalSearchParams<{ title?: string; activityType?: string }>();
  const {
    activeSession,
    hydrated: activeSessionHydrated,
    setSession: setActiveSession,
    clearSession: clearActiveSession,
  } = useActiveRunWalk();
  const activityType = useMemo(
    () => normalizeActivityType(params.activityType),
    [params.activityType]
  );
  const lockMode: RunWalkMode = activityType === 'walk' ? 'outdoor_walk' : 'outdoor_run';

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

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const locationSubRef = useRef<Location.LocationSubscription | null>(null);
  const lastPointRef = useRef<{ lat: number; lng: number } | null>(null);
  const phaseRef = useRef<Phase>('idle');
  const sessionStartedAtRef = useRef<string | null>(null);
  const elapsedSecondsRef = useRef(0);
  const distanceMetersRef = useRef(0);
  const acceptedPointCountRef = useRef(0);
  const samplesRef = useRef<OutdoorDraftSample[]>([]);
  const sessionInitializedRef = useRef(false);
  const hydrationAppliedRef = useRef(false);

  const hasProgress = elapsedSeconds > 0 || distanceMeters > 0;

  const currentPace = useMemo(() => {
    if (phase === 'idle') return null;
    return paceSecPerKm(distanceMeters, elapsedSeconds);
  }, [distanceMeters, elapsedSeconds, phase]);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    distanceMetersRef.current = distanceMeters;
  }, [distanceMeters]);

  useEffect(() => {
    elapsedSecondsRef.current = elapsedSeconds;
  }, [elapsedSeconds]);

  useEffect(() => {
    if (!activeSessionHydrated || hydrationAppliedRef.current) return;

    const existingSession =
      activeSession?.kind === 'outdoor' && activeSession.mode === lockMode
        ? activeSession
        : null;

    hydrationAppliedRef.current = true;
    if (!existingSession) return;

    setPhase(existingSession.phase);
    phaseRef.current = existingSession.phase;
    setElapsedSeconds(existingSession.elapsedSeconds);
    setDistanceMeters(existingSession.distanceMeters);
    setCoords(existingSession.coords);

    elapsedSecondsRef.current = existingSession.elapsedSeconds;
    distanceMetersRef.current = existingSession.distanceMeters;
    sessionStartedAtRef.current = existingSession.startedAtISO;
    coordsRef.current = existingSession.coords;
    samplesRef.current = existingSession.samples;
    acceptedPointCountRef.current =
      existingSession.samples[existingSession.samples.length - 1]?.seq ?? 0;

    const lastCoord = existingSession.coords[existingSession.coords.length - 1];
    lastPointRef.current = lastCoord
      ? { lat: lastCoord.latitude, lng: lastCoord.longitude }
      : null;

    sessionInitializedRef.current = true;

    if (existingSession.phase === 'running') {
      startTimer();
      startLocation().catch((error) => {
        console.log('[OutdoorSession] restore location error', error);
      });
    }
  }, [activeSession, activeSessionHydrated, lockMode]);

  useEffect(() => {
    return () => {
      stopTimer();
      stopLocation();
    };
  }, []);

  useEffect(() => {
    if (!activeSessionHydrated || !hydrationAppliedRef.current) return;
    let mounted = true;

    (async () => {
      try {
        if (activeSession?.kind === 'strength') {
          Alert.alert(
            'Session in progress',
            'You already have an active strength workout. Finish or cancel it before starting an outdoor session.'
          );
          router.back();
          return;
        }

        const existing = await getActiveRunWalkLock();
        const resumingExisting =
          activeSession?.kind === 'outdoor' && activeSession.mode === lockMode;
        const shouldHaveLock = phaseRef.current !== 'idle' || resumingExisting;
        if (!mounted) return;

        if (!shouldHaveLock) {
          sessionInitializedRef.current = false;
          return;
        }

        if (existing) {
          if (resumingExisting && existing.mode === lockMode) {
            sessionInitializedRef.current = true;
            return;
          }

          Alert.alert(
            'Session in progress',
            `You already have a ${existing.mode.replace('_', ' ')} session in progress. Finish or cancel it before starting a new one.`
          );
          router.back();
          return;
        }

        await setActiveRunWalkLock(lockMode);
        sessionInitializedRef.current = true;
      } catch (e) {
        console.log('[OutdoorSession] lock error', e);
        sessionInitializedRef.current = true;
      }
    })();

    return () => {
      mounted = false;
    };
  }, [activeSession, activeSessionHydrated, lockMode, router, phase]);

  useEffect(() => {
    if (!activeSessionHydrated || !sessionInitializedRef.current || phase === 'idle') return;

    setActiveSession({
      kind: 'outdoor',
      mode: lockMode,
      title,
      phase,
      distanceUnit,
      startedAtISO: sessionStartedAtRef.current,
      elapsedSeconds,
      distanceMeters,
      coords: coordsRef.current,
      samples: samplesRef.current,
    });
  }, [
    activeSessionHydrated,
    distanceMeters,
    distanceUnit,
    elapsedSeconds,
    lockMode,
    phase,
    setActiveSession,
    title,
  ]);

  /* -------------------- TIMER -------------------- */

  function startTimer() {
    stopTimer();
    timerRef.current = setInterval(() => {
      setElapsedSeconds((s) => {
        const next = s + 1;
        elapsedSecondsRef.current = next;
        return next;
      });
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
    if (perm.status !== 'granted') {
      Alert.alert(
        'Location permission required',
        'Allow location access to record outdoor runs and walks.'
      );
      return false;
    }

    locationSubRef.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Highest,
        timeInterval: 1000,
        distanceInterval: 2,
      },
      (loc) => {
        if (phaseRef.current !== 'running') return;

        const { latitude, longitude, accuracy, altitude, speed, heading } = loc.coords;
        if (accuracy && accuracy > 35) return;

        const point = { lat: latitude, lng: longitude };
        let nextDistanceMeters = distanceMetersRef.current;
        if (lastPointRef.current) {
          const delta = haversineMeters(lastPointRef.current, point);
          if (delta < 80) {
            setDistanceMeters((d) => {
              nextDistanceMeters = d + delta;
              distanceMetersRef.current = nextDistanceMeters;
              return nextDistanceMeters;
            });
          }
        }
        lastPointRef.current = point;

        const mapPoint: LatLng = { latitude, longitude };
        coordsRef.current = [...coordsRef.current, mapPoint];
        setCoords(coordsRef.current);

        acceptedPointCountRef.current += 1;
        samplesRef.current.push({
          seq: acceptedPointCountRef.current,
          ts: new Date(loc.timestamp).toISOString(),
          elapsed_s: elapsedSecondsRef.current,
          lat: latitude,
          lon: longitude,
          altitude_m: Number.isFinite(altitude) ? altitude : null,
          accuracy_m: Number.isFinite(accuracy) ? accuracy : null,
          speed_mps: Number.isFinite(speed) ? speed : null,
          bearing_deg: Number.isFinite(heading) ? heading : null,
          distance_m: Number(nextDistanceMeters.toFixed(2)),
          is_moving: typeof speed === 'number' ? speed > 0.5 : true,
        });
      }
    );

    return true;
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
    elapsedSecondsRef.current = 0;
    setDistanceMeters(0);
    distanceMetersRef.current = 0;
    phaseRef.current = 'idle';
    lastPointRef.current = null;
    sessionStartedAtRef.current = null;
    acceptedPointCountRef.current = 0;
    samplesRef.current = [];

    coordsRef.current = [];
    setCoords([]);
  }

  async function onStart() {
    resetSession();
    const startedAtISO = new Date().toISOString();
    sessionStartedAtRef.current = startedAtISO;
    const locationStarted = await startLocation();
    if (!locationStarted) {
      sessionStartedAtRef.current = null;
      return;
    }
    phaseRef.current = 'running';
    setPhase('running');
    sessionInitializedRef.current = true;
    startTimer();
  }

  function onPause() {
    phaseRef.current = 'paused';
    setPhase('paused');
    stopTimer();
    stopLocation();
  }

  async function onResume() {
    phaseRef.current = 'running';
    setPhase('running');
    startTimer();
    await startLocation();
  }

  async function onEndWorkout() {
    stopTimer();
    stopLocation();

    const endedAtISO = new Date().toISOString();
    const startedAtISO =
      sessionStartedAtRef.current ??
      new Date(Date.now() - Math.max(0, elapsedSeconds) * 1000).toISOString();

    const draftId = makeId();
    const draft: OutdoorSessionDraft = {
      id: draftId,
      created_at: endedAtISO,
      started_at: startedAtISO,
      ended_at: endedAtISO,
      activity_type: activityType === 'walk' ? 'walk' : 'run',
      total_time_s: elapsedSeconds,
      total_distance_m: Number(distanceMeters.toFixed(2)),
      avg_speed_mps: elapsedSeconds > 0 ? Number((distanceMeters / elapsedSeconds).toFixed(6)) : null,
      avg_pace_s_per_km: paceSecPerKm(distanceMeters, elapsedSeconds),
      samples: samplesRef.current,
    };

    try {
      await upsertOutdoorDraft(draft);
      clearActiveSession();
      sessionInitializedRef.current = false;
      await clearActiveRunWalkLock();

      router.push({
        pathname: './SessionSummary',
        params: {
          draftId,
          title,
        },
      });

      setPhase('idle');
      phaseRef.current = 'idle';
      resetSession();
    } catch (e) {
      console.log('[OutdoorSession] finish error', e);
      Alert.alert('Error', 'Could not open summary. Please try again.');
      phaseRef.current = 'paused';
      setPhase('paused');
    }
  }

  async function confirmCancel() {
    stopTimer();
    stopLocation();
    clearActiveSession();
    sessionInitializedRef.current = false;
    setPhase('idle');
    resetSession();
    setCancelOpen(false);
    await clearActiveRunWalkLock().catch(() => null);
    router.replace('/(tabs)/home');
  }

  function onBackPress() {
    if (hasProgress) {
      if (phase === 'running') onPause();
      setCancelOpen(true);
    } else {
      clearActiveRunWalkLock().catch(() => null);
      clearActiveSession();
      sessionInitializedRef.current = false;
      router.back();
    }
  }

  const isIdle = phase === 'idle';
  const isRunning = phase === 'running';

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
            <View style={styles.sessionWrap}>
              <View style={styles.mapWrap}>
                <OutdoorMapSlide coords={coords} />
              </View>

              <View style={styles.metricsBlock}>
                <OutdoorMetrics
                  elapsedSeconds={elapsedSeconds}
                  distanceMeters={distanceMeters}
                  currentPaceSecPerKm={currentPace}
                  distanceUnit={distanceUnit}
                />
              </View>
            </View>
          )}
        </View>

        {/* BOTTOM */}
        <View style={styles.bottom}>
          {!isIdle && (
            <View style={styles.controlsRow}>
              <TouchableOpacity style={styles.controlBtn} onPress={isRunning ? onPause : onResume}>
                <Ionicons name={isRunning ? 'pause' : 'play'} size={18} color={TEXT} />
                <Text style={styles.controlText}>{isRunning ? 'Pause' : 'Resume'}</Text>
              </TouchableOpacity>
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

  sessionWrap: {
    flex: 1,
    gap: 14,
  },
  mapWrap: {
    flex: 1,
    minHeight: 260,
  },
  metricsBlock: {
    paddingBottom: 6,
  },

  bottom: { paddingHorizontal: 16, paddingBottom: 12 },

  controlsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  controlBtn: {
    flex: 1,
    height: 58,
    borderRadius: 18,
    backgroundColor: CARD,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlText: { fontSize: 16, fontWeight: '900', color: TEXT },
  endBtn: {
    flex: 1,
    height: 58,
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
    height: 58,
    borderRadius: 18,
    backgroundColor: CARD,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: { fontWeight: '900', color: '#e04b4b' },
});
