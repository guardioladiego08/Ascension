import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AppState,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Alert,
  Image,
  useWindowDimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getIndoorCardioTitle,
  isCyclingActivity,
} from '@/lib/cardio/activityTypes';
import { useUnits } from '@/contexts/UnitsContext';
import { useAppTheme } from '@/providers/AppThemeProvider';
import { useSmartBack } from '@/lib/navigation/useSmartBack';
import { HOME_TONES } from '../../../home/tokens';

import FinishConfirmModal from './indoor/FinishConfirmModal';
import RunWalkCancelConfirmModal from './indoor/RunWalkCancelConfirmModal';

import {
  upsertDraft,
  type DistanceUnit,
  type Mode,
  type RunWalkSample,
  type RunWalkDraft,
} from '@/lib/runWalkDraftStore';

import {
  getActiveRunWalkLock,
  setActiveRunWalkLock,
  clearActiveRunWalkLock,
  type RunWalkMode,
} from '@/lib/runWalkSessionLock';
import {
  createPausedRunWalkClock,
  getRunWalkElapsedMs,
  normalizeRunWalkClock,
  pauseRunWalkClock,
  resumeRunWalkClock,
} from '@/lib/runWalkSessionClock';
import { setActiveRunWalkSession } from '@/lib/activeRunWalkSessionStore';
import { useActiveRunWalk } from '@/providers/ActiveRunWalkProvider';

const M_PER_MI = 1609.344;
const M_PER_KM = 1000;
const HOME_ROUTE = '/(tabs)/home';

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function formatClock(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function deg2rad(deg: number) {
  return (deg * Math.PI) / 180;
}

function speedToMps(speed: number, unit: DistanceUnit) {
  // speed is mph if mi, kph if km
  return unit === 'mi' ? speed * 0.44704 : speed * 0.2777777778;
}

function mToDisplay(meters: number, unit: DistanceUnit) {
  return unit === 'mi' ? meters / M_PER_MI : meters / M_PER_KM;
}

function paceFromMps(speedMps: number, unit: DistanceUnit) {
  if (speedMps <= 0) return Infinity;
  const metersPerUnit = unit === 'mi' ? M_PER_MI : M_PER_KM;
  return metersPerUnit / speedMps;
}

function formatPace(secondsPerUnit: number, suffix: '/mi' | '/km') {
  if (!Number.isFinite(secondsPerUnit) || secondsPerUnit <= 0) return `— ${suffix}`;
  const mm = Math.floor(secondsPerUnit / 60);
  const ss = Math.round(secondsPerUnit % 60);
  return `${mm}:${String(ss).padStart(2, '0')} ${suffix}`;
}

function cadenceFromSpeedAndResistance(speedMps: number, resistanceLevel: number) {
  return clamp(Math.round(speedMps * 10 + 35 - resistanceLevel * 0.8), 50, 130);
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function IndoorSession() {
  const router = useRouter();
  const { goBackSmart } = useSmartBack();
  const { colors, fonts, globalStyles } = useAppTheme();
  const params = useLocalSearchParams<{
    mode?: string;
    title?: string;
    sessionVariant?: string;
  }>();
  const { distanceUnit } = useUnits();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const compact = height - insets.top - insets.bottom < 860;
  const tight = height - insets.top - insets.bottom < 780;
  const styles = useMemo(
    () => createStyles(colors, fonts, { compact, tight, topInset: insets.top }),
    [colors, fonts, compact, tight, insets.top]
  );
  const {
    activeSession,
    hydrated: activeSessionHydrated,
    setSession: setActiveSession,
    clearSession: clearActiveSession,
  } = useActiveRunWalk();
  const sessionVariant = params.sessionVariant === 'interval' ? 'interval' : 'open';

  const mode: Extract<Mode, 'indoor_run' | 'indoor_walk' | 'indoor_cycle'> =
    params.mode === 'indoor_walk'
      ? 'indoor_walk'
      : params.mode === 'indoor_cycle'
        ? 'indoor_cycle'
        : 'indoor_run';

  const isCycleSession = mode === 'indoor_cycle';

  const lockMode: Extract<RunWalkMode, 'indoor_run' | 'indoor_walk' | 'indoor_cycle'> = mode;

  const title = params.title?.toString() ?? getIndoorCardioTitle(mode);
  const heroSubtitle = compact
    ? isCycleSession
      ? 'Bike controls, live cadence, and a cleaner finish.'
      : 'Treadmill controls, live pace, and a cleaner finish.'
    : isCycleSession
      ? 'Bike-style controls, live cadence, and a cleaner finish flow.'
      : 'Treadmill-style controls, live pace, and a cleaner finish flow.';

  // session state
  const [isRunning, setIsRunning] = useState(true);
  const [elapsedS, setElapsedS] = useState(0);

  // treadmill controls
  const defaultSpeed = useMemo(() => {
    if (isCycleSession) {
      return distanceUnit === 'mi' ? 15.0 : 24.0;
    }

    if (distanceUnit === 'mi') return mode === 'indoor_walk' ? 3.2 : 6.0;
    return mode === 'indoor_walk' ? 5.0 : 10.0;
  }, [distanceUnit, isCycleSession, mode]);

  const [speed, setSpeed] = useState(defaultSpeed);
  const [inclineDeg, setInclineDeg] = useState(0);

  // derived totals
  const [distanceM, setDistanceM] = useState(0);
  const [elevM, setElevM] = useState(0);

  // modals
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // samples
  const samplesRef = useRef<RunWalkSample[]>([]);
  const seqRef = useRef(0);
  const sessionInitializedRef = useRef(false);
  const hydrationAppliedRef = useRef(false);
  const sessionExitRef = useRef(false);
  const sessionIdRef = useRef(makeId());
  const isRunningRef = useRef(true);

  // refs for interval accuracy (avoid stale closures)
  const elapsedRef = useRef(0);
  const elapsedMsRef = useRef(0);
  const distanceRef = useRef(0);
  const elevRef = useRef(0);
  const speedRef = useRef(0);
  const inclineRef = useRef(0);
  const clockRef = useRef(resumeRunWalkClock(createPausedRunWalkClock(0)));

  useEffect(() => { elapsedRef.current = elapsedS; }, [elapsedS]);
  useEffect(() => { isRunningRef.current = isRunning; }, [isRunning]);
  useEffect(() => { distanceRef.current = distanceM; }, [distanceM]);
  useEffect(() => { elevRef.current = elevM; }, [elevM]);
  useEffect(() => { speedRef.current = speed; }, [speed]);
  useEffect(() => { inclineRef.current = inclineDeg; }, [inclineDeg]);

  const hasProgress = elapsedRef.current > 0 || distanceRef.current > 0;

  function syncSessionFromClock(
    nowMs = Date.now(),
    phaseOverride: 'running' | 'paused' = isRunningRef.current ? 'running' : 'paused'
  ) {
    const normalizedClock = normalizeRunWalkClock({
      clock: clockRef.current,
      elapsedSeconds: elapsedRef.current,
      phase: phaseOverride,
      nowMs,
    });
    clockRef.current = normalizedClock;

    const previousElapsedMs = elapsedMsRef.current;
    const previousDistanceM = distanceRef.current;
    const previousElevM = elevRef.current;
    const nextElapsedMs = getRunWalkElapsedMs(normalizedClock, nowMs);
    const deltaMs = phaseOverride === 'running' ? Math.max(0, nextElapsedMs - previousElapsedMs) : 0;
    const speedMps = speedToMps(speedRef.current, distanceUnit);
    const deltaDistanceM = speedMps * (deltaMs / 1000);
    const deltaElevM = isCycleSession
      ? 0
      : deltaDistanceM * Math.sin(deg2rad(inclineRef.current));
    const nextDistanceM = previousDistanceM + deltaDistanceM;
    const nextElevM = previousElevM + deltaElevM;
    const nextElapsedS = Math.floor(nextElapsedMs / 1000);

    if (deltaMs > 0) {
      const firstBoundary = Math.floor(previousElapsedMs / 10_000) + 1;
      const lastBoundary = Math.floor(nextElapsedMs / 10_000);

      for (let boundary = firstBoundary; boundary <= lastBoundary; boundary += 1) {
        const boundaryElapsedMs = boundary * 10_000;
        const progress = (boundaryElapsedMs - previousElapsedMs) / deltaMs;
        const sampleDistanceM = previousDistanceM + deltaDistanceM * progress;
        const sampleElevM = previousElevM + deltaElevM * progress;
        const paceMi = paceFromMps(speedMps, 'mi');
        const paceKm = paceFromMps(speedMps, 'km');
        const cadenceRpm = isCycleSession
          ? cadenceFromSpeedAndResistance(speedMps, inclineRef.current)
          : null;

        seqRef.current += 1;
        samplesRef.current.push({
          seq: seqRef.current,
          elapsed_s: Math.floor(boundaryElapsedMs / 1000),
          distance_m: Number(sampleDistanceM.toFixed(2)),
          speed_mps: Number(speedMps.toFixed(6)),
          pace_s_per_km:
            isCycleSession || !Number.isFinite(paceKm) ? null : Number(paceKm.toFixed(2)),
          pace_s_per_mi:
            isCycleSession || !Number.isFinite(paceMi) ? null : Number(paceMi.toFixed(2)),
          incline_deg: Number(inclineRef.current.toFixed(2)),
          elevation_m: Number(sampleElevM.toFixed(2)),
          cadence_rpm: cadenceRpm,
        });
      }

      distanceRef.current = nextDistanceM;
      elevRef.current = nextElevM;
      setDistanceM(nextDistanceM);
      setElevM(nextElevM);
    }

    elapsedMsRef.current = nextElapsedMs;
    if (nextElapsedS !== elapsedRef.current) {
      elapsedRef.current = nextElapsedS;
      setElapsedS(nextElapsedS);
    }
  }

  function pauseSession() {
    const nowMs = Date.now();
    syncSessionFromClock(nowMs, 'running');
    clockRef.current = pauseRunWalkClock(clockRef.current, nowMs);
    elapsedMsRef.current = getRunWalkElapsedMs(clockRef.current, nowMs);
    setIsRunning(false);
  }

  function resumeSession() {
    const nowMs = Date.now();
    clockRef.current = resumeRunWalkClock(clockRef.current, nowMs);
    elapsedMsRef.current = getRunWalkElapsedMs(clockRef.current, nowMs);
    setIsRunning(true);
  }

  async function persistIndoorSessionSnapshot(
    phaseOverride: 'running' | 'paused' = isRunningRef.current ? 'running' : 'paused'
  ) {
    if (!activeSessionHydrated || !sessionInitializedRef.current || sessionExitRef.current) {
      return;
    }

    const nowMs = Date.now();
    syncSessionFromClock(nowMs, phaseOverride);

    await setActiveRunWalkSession({
      sessionId: sessionIdRef.current,
      kind: 'indoor',
      mode,
      title,
      sessionVariant,
      phase: phaseOverride,
      clock: clockRef.current,
      distanceUnit,
      elapsedS: elapsedRef.current,
      distanceM: distanceRef.current,
      elevM: elevRef.current,
      speed: speedRef.current,
      inclineDeg: inclineRef.current,
      samples: samplesRef.current,
    });
  }

  useEffect(() => {
    if (!activeSessionHydrated || hydrationAppliedRef.current || sessionExitRef.current) return;

    const existingSession =
      activeSession?.kind === 'indoor' &&
      activeSession.mode === mode &&
      (activeSession.sessionVariant ?? 'open') === sessionVariant
        ? activeSession
        : null;

    if (existingSession) {
      sessionIdRef.current = existingSession.sessionId ?? makeId();
      const nextRunning = existingSession.phase === 'running';
      const normalizedClock = normalizeRunWalkClock({
        clock: existingSession.clock,
        elapsedSeconds: existingSession.elapsedS,
        phase: existingSession.phase,
      });

      setIsRunning(nextRunning);
      setElapsedS(existingSession.elapsedS);
      setDistanceM(existingSession.distanceM);
      setElevM(existingSession.elevM);
      setSpeed(existingSession.speed);
      setInclineDeg(existingSession.inclineDeg);

      elapsedRef.current = existingSession.elapsedS;
      elapsedMsRef.current = Math.max(0, existingSession.elapsedS * 1000);
      distanceRef.current = existingSession.distanceM;
      elevRef.current = existingSession.elevM;
      speedRef.current = existingSession.speed;
      inclineRef.current = existingSession.inclineDeg;
      clockRef.current = normalizedClock;

      samplesRef.current = existingSession.samples;
      seqRef.current = existingSession.samples[existingSession.samples.length - 1]?.seq ?? 0;
      sessionInitializedRef.current = true;

      if (nextRunning) {
        syncSessionFromClock(Date.now(), 'running');
      }
    }

    hydrationAppliedRef.current = true;
  }, [activeSession, activeSessionHydrated, mode, sessionVariant]);

  const resetSessionState = (nextRunning: boolean) => {
    // Stop ticking, clear everything
    setIsRunning(false);

    setElapsedS(0);
    setDistanceM(0);
    setElevM(0);

    setInclineDeg(0);
    setSpeed(defaultSpeed);

    // refs
    elapsedRef.current = 0;
    elapsedMsRef.current = 0;
    distanceRef.current = 0;
    elevRef.current = 0;
    inclineRef.current = 0;
    speedRef.current = defaultSpeed;
    clockRef.current = nextRunning
      ? resumeRunWalkClock(createPausedRunWalkClock(0))
      : createPausedRunWalkClock(0);

    // samples
    seqRef.current = 0;
    samplesRef.current = [];

    // modals
    setShowFinishConfirm(false);
    setShowCancelConfirm(false);

    // IMPORTANT: re-prime running state if requested (fixes “next session starts paused”)
    setIsRunning(nextRunning);
  };

  const beginSessionExit = () => {
    sessionExitRef.current = true;
    sessionInitializedRef.current = false;
    clearActiveSession();
  };

  /**
   * Global lock acquisition:
   * - If ANY run/walk session is active, block entry.
   * - This prevents "run while walk is in progress" and vice versa.
   */
  useEffect(() => {
    if (!activeSessionHydrated || !hydrationAppliedRef.current || sessionExitRef.current) return;
    let mounted = true;

    (async () => {
      try {
        if (activeSession?.kind === 'strength') {
          Alert.alert(
            'Session in progress',
            'You already have an active strength workout. Finish or cancel it before starting an indoor session.'
          );
          goBackSmart({ fallbackHref: HOME_ROUTE });
          return;
        }

        const existing = await getActiveRunWalkLock();
        const resumingExisting =
          activeSession?.kind === 'indoor' &&
          activeSession.mode === mode &&
          (activeSession.sessionVariant ?? 'open') === sessionVariant;
        if (!mounted) return;

        if (existing) {
          if (resumingExisting && existing.mode === lockMode) {
            sessionInitializedRef.current = true;
            return;
          }

          Alert.alert(
            'Session in progress',
            `You already have a ${existing.mode.replace('_', ' ')} session in progress. Finish or cancel it before starting a new one.`
          );
          goBackSmart({ fallbackHref: HOME_ROUTE });
          return;
        }

        await setActiveRunWalkLock(lockMode);
        sessionInitializedRef.current = true;
      } catch (e) {
        console.log('[IndoorSession] lock error', e);
        // If lock fails, we still allow session (best effort)
        sessionInitializedRef.current = true;
      }
    })();

    return () => {
      mounted = false;
    };
  }, [activeSession, activeSessionHydrated, goBackSmart, lockMode, mode, sessionVariant]);

  // keep speed aligned with unit/mode defaults
  useEffect(() => {
    if (!activeSessionHydrated) return;
    if (activeSession?.kind === 'indoor' && activeSession.mode === mode) return;
    setSpeed(defaultSpeed);
    speedRef.current = defaultSpeed;
  }, [activeSession, activeSessionHydrated, defaultSpeed, mode]);

  useEffect(() => {
    if (!activeSessionHydrated || !sessionInitializedRef.current || sessionExitRef.current) return;

    setActiveSession({
      sessionId: sessionIdRef.current,
      kind: 'indoor',
      mode,
      title,
      sessionVariant,
      phase: isRunning ? 'running' : 'paused',
      clock: clockRef.current,
      distanceUnit,
      elapsedS,
      distanceM,
      elevM,
      speed,
      inclineDeg,
      samples: samplesRef.current,
    });
  }, [
    activeSessionHydrated,
    distanceM,
    distanceUnit,
    elapsedS,
    elevM,
    inclineDeg,
    isRunning,
    mode,
    sessionVariant,
    setActiveSession,
    speed,
    title,
  ]);

  useEffect(() => {
    if (!isRunning) {
      syncSessionFromClock(Date.now(), 'paused');
      return;
    }

    syncSessionFromClock(Date.now(), 'running');
    const timer = setInterval(() => {
      syncSessionFromClock(Date.now(), 'running');
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [isRunning, distanceUnit]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        syncSessionFromClock(Date.now(), isRunningRef.current ? 'running' : 'paused');
        return;
      }

      if (nextState === 'inactive' || nextState === 'background') {
        void persistIndoorSessionSnapshot(isRunningRef.current ? 'running' : 'paused');
      }
    });

    return () => {
      subscription.remove();
    };
  }, [activeSessionHydrated, distanceUnit, isRunning, mode, sessionVariant, title]);

  // UI helpers
  const distLabelUnit = distanceUnit === 'mi' ? 'MI' : 'KM';
  const speedLabelUnit = distanceUnit === 'mi' ? 'MPH' : 'KPH';
  const speedStep = isCycleSession ? (distanceUnit === 'mi' ? 0.5 : 1) : distanceUnit === 'mi' ? 0.1 : 0.2;
  const inclineStep = isCycleSession ? 1 : 0.5;
  const secondaryLabel = isCycleSession ? 'Resistance' : 'Incline';
  const secondaryUnit = isCycleSession ? 'lvl' : '°';

  const displayDistance = mToDisplay(distanceM, distanceUnit);

  const avgSpeedMps = elapsedS > 0 ? distanceM / elapsedS : 0;
  const avgSpeedDisplay = distanceUnit === 'mi' ? avgSpeedMps * 2.236936 : avgSpeedMps * 3.6;

  const currentSpeedMps = speedToMps(speed, distanceUnit);
  const currentCadence = isCycleSession
    ? cadenceFromSpeedAndResistance(currentSpeedMps, inclineDeg)
    : null;
  const avgCadence = isCycleSession
    ? (() => {
        const values = samplesRef.current
          .map((sample) => Number(sample.cadence_rpm ?? 0))
          .filter((value) => Number.isFinite(value) && value > 0);
        if (values.length === 0) {
          return currentCadence;
        }
        const total = values.reduce((sum, value) => sum + value, 0);
        return Math.round(total / values.length);
      })()
    : null;
  const currentPace =
    distanceUnit === 'mi'
      ? formatPace(paceFromMps(currentSpeedMps, 'mi'), '/mi')
      : formatPace(paceFromMps(currentSpeedMps, 'km'), '/km');

  const avgPace =
    distanceUnit === 'mi'
      ? formatPace(paceFromMps(avgSpeedMps, 'mi'), '/mi')
      : formatPace(paceFromMps(avgSpeedMps, 'km'), '/km');

  const togglePause = () => {
    if (isRunning) {
      pauseSession();
      return;
    }
    resumeSession();
  };

  const requestCancel = () => {
    if (isRunning) {
      pauseSession();
    }
    setShowCancelConfirm(true);
  };

  const onBackPress = () => {
    if (hasProgress) {
      requestCancel();
      return;
    }
    // no progress: clear lock and exit
    clearActiveRunWalkLock().catch(() => null);
    beginSessionExit();
    goBackSmart({ fallbackHref: HOME_ROUTE });
  };

  // Finish -> draft -> clear lock -> reset -> go summary
  const finishToSummary = async () => {
    setShowFinishConfirm(false);
    setIsRunning(false);

    const endedAt = new Date().toISOString();
    syncSessionFromClock(Date.now(), 'paused');
    const totalTimeS = elapsedRef.current;
    const startedAt = new Date(
      new Date(endedAt).getTime() - totalTimeS * 1000
    ).toISOString();
    const totalDistM = distanceRef.current;
    const totalElevM = elevRef.current;

    const avgSpeedMpsFinal = totalTimeS > 0 ? totalDistM / totalTimeS : 0;
    const paceKm =
      isCycleSession || totalDistM <= 0 ? null : totalTimeS / (totalDistM / M_PER_KM);
    const paceMi =
      isCycleSession || totalDistM <= 0 ? null : totalTimeS / (totalDistM / M_PER_MI);
    const cadenceValues = samplesRef.current
      .map((sample) => Number(sample.cadence_rpm ?? 0))
      .filter((value) => Number.isFinite(value) && value > 0);
    const avgCadenceRpm =
      isCycleSession && cadenceValues.length > 0
        ? Math.round(
            cadenceValues.reduce((sum, value) => sum + value, 0) / cadenceValues.length
          )
        : null;

    const draftId = makeId();

    const draft: RunWalkDraft = {
      id: draftId,
      created_at: startedAt,
      ended_at: endedAt,
      exercise_type: mode,
      distance_unit: distanceUnit,
      total_time_s: totalTimeS,
      total_distance_m: Number(totalDistM.toFixed(2)),
      total_elevation_m: Number(totalElevM.toFixed(2)),
      avg_speed_mps: Number(avgSpeedMpsFinal.toFixed(6)),
      avg_pace_s_per_km: paceKm == null ? null : Number(paceKm.toFixed(2)),
      avg_pace_s_per_mi: paceMi == null ? null : Number(paceMi.toFixed(2)),
      avg_cadence_rpm: avgCadenceRpm,
      samples: samplesRef.current,
    };

    try {
      await upsertDraft(draft);

      beginSessionExit();
      await clearActiveRunWalkLock();

      // Reset but keep running=false because we're leaving screen
      resetSessionState(false);

      router.replace({
        pathname: './IndoorSessionSummary',
        params: { draftId },
      });
    } catch (e) {
      console.log('[IndoorSession] finish error', e);
      Alert.alert('Error', 'Could not open summary. Please try again.');
      resumeSession();
    }
  };

  // Cancel confirmed -> clear lock -> reset with running=true (fix next start) -> leave
  const confirmDiscardCancel = async () => {
    beginSessionExit();
    try {
      await clearActiveRunWalkLock();
    } catch {}

    // Reset and explicitly set nextRunning=true so this screen never “sticks” paused
    resetSessionState(true);
    router.replace(HOME_ROUTE);
  };

  return (
    <View style={styles.page}>
      <View style={[globalStyles.container, styles.safe]}>
        <View style={styles.brandHeader}>
          <Image
            source={require('../../../../../assets/images/TensrLogo.png')}
            style={styles.brandLogo}
            resizeMode="contain"
          />
        </View>

        <View style={[styles.panel, styles.heroCard]}>
          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.iconBtn} onPress={onBackPress}>
              <Ionicons name="chevron-back" size={18} color={colors.text} />
            </TouchableOpacity>

            <View style={styles.headerCenter}>
              <Text style={styles.eyebrow}>Indoor cardio</Text>
              <Text
                style={styles.title}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
              >
                {title}
              </Text>
              <Text style={styles.heroSubtitle} numberOfLines={compact ? 2 : 3}>
                {heroSubtitle}
              </Text>
            </View>

            <View style={[styles.statusPill, isRunning ? styles.statusActive : styles.statusPaused]}>
              <View style={[styles.statusDot, isRunning ? styles.statusDotActive : styles.statusDotPaused]} />
              <Text style={[styles.statusText, isRunning ? styles.statusTextActive : styles.statusTextPaused]}>
                {isRunning ? 'Running' : 'Paused'}
              </Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Distance</Text>
              <Text style={styles.statValue}>
                {displayDistance.toFixed(2)}
                <Text style={styles.statUnit}> {distLabelUnit}</Text>
              </Text>
            </View>

            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Time</Text>
              <Text style={styles.statValue}>{formatClock(elapsedS)}</Text>
            </View>

            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Avg speed</Text>
              <Text style={styles.statValue}>
                {avgSpeedDisplay.toFixed(1)}
                <Text style={styles.statUnit}> {speedLabelUnit}</Text>
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.panelSoft, styles.centerBlock]}>
          <Text style={styles.centerBig}>
            {displayDistance.toFixed(2)}
            <Text style={styles.centerUnit}> {distLabelUnit}</Text>
          </Text>
          <Text style={styles.centerLabel}>Total distance</Text>

          <View style={styles.centerRow}>
            {isCycleSession ? (
              <>
                <View style={styles.centerMini}>
                  <Text style={styles.centerMiniValue}>
                    {currentCadence == null ? '—' : `${currentCadence} rpm`}
                  </Text>
                  <Text style={styles.centerMiniLabel}>Current cadence</Text>
                </View>

                <View style={styles.centerMini}>
                  <Text style={styles.centerMiniValue}>
                    {avgCadence == null ? '—' : `${avgCadence} rpm`}
                  </Text>
                  <Text style={styles.centerMiniLabel}>Average cadence</Text>
                </View>
              </>
            ) : (
              <>
                <View style={styles.centerMini}>
                  <Text style={styles.centerMiniValue}>{currentPace}</Text>
                  <Text style={styles.centerMiniLabel}>Current pace</Text>
                </View>

                <View style={styles.centerMini}>
                  <Text style={styles.centerMiniValue}>{avgPace}</Text>
                  <Text style={styles.centerMiniLabel}>Average pace</Text>
                </View>
              </>
            )}
          </View>
        </View>

        <View style={styles.controls}>
          <View style={styles.controlRow}>
            <Pressable
              style={[styles.controlBtn, !isRunning && styles.disabled]}
              onPress={() => {
                syncSessionFromClock();
                setSpeed((v) => clamp(Number((v - speedStep).toFixed(1)), 0, 25));
              }}
              disabled={!isRunning}
            >
              <Ionicons name="remove" size={20} color={colors.text} />
            </Pressable>

            <View style={styles.controlCenter}>
              <Text style={styles.controlValue}>
                {speed.toFixed(1)}
                <Text style={styles.controlUnit}> {speedLabelUnit}</Text>
              </Text>
              <Text style={styles.controlLabel}>Current speed</Text>
            </View>

            <Pressable
              style={[styles.controlBtn, !isRunning && styles.disabled]}
              onPress={() => {
                syncSessionFromClock();
                setSpeed((v) => clamp(Number((v + speedStep).toFixed(1)), 0, 25));
              }}
              disabled={!isRunning}
            >
              <Ionicons name="add" size={20} color={colors.text} />
            </Pressable>
          </View>

          <View style={[styles.controlRow, styles.controlRowSpaced]}>
            <Pressable
              style={[styles.controlBtn, !isRunning && styles.disabled]}
              onPress={() => {
                syncSessionFromClock();
                setInclineDeg((v) =>
                  clamp(
                    Number((v - inclineStep).toFixed(isCycleSession ? 0 : 1)),
                    0,
                    20
                  )
                );
              }}
              disabled={!isRunning}
            >
              <Ionicons name="remove" size={20} color={colors.text} />
            </Pressable>

            <View style={styles.controlCenter}>
              <Text style={styles.controlValue}>
                {inclineDeg.toFixed(isCycleSession ? 0 : 1)}
                <Text style={styles.controlUnit}> {secondaryUnit}</Text>
              </Text>
              <Text style={styles.controlLabel}>{secondaryLabel}</Text>
            </View>

            <Pressable
              style={[styles.controlBtn, !isRunning && styles.disabled]}
              onPress={() => {
                syncSessionFromClock();
                setInclineDeg((v) =>
                  clamp(
                    Number((v + inclineStep).toFixed(isCycleSession ? 0 : 1)),
                    0,
                    20
                  )
                );
              }}
              disabled={!isRunning}
            >
              <Ionicons name="add" size={20} color={colors.text} />
            </Pressable>
          </View>
        </View>

        <View style={styles.bottom}>
          <TouchableOpacity
            activeOpacity={0.92}
            style={[isRunning ? styles.buttonSecondary : styles.buttonPrimary, styles.pauseBtn]}
            onPress={togglePause}
          >
            <Ionicons
              name={isRunning ? 'pause' : 'play'}
              size={18}
              color={isRunning ? colors.text : colors.blkText}
            />
            <Text style={isRunning ? styles.buttonTextSecondary : styles.buttonTextPrimary}>
              {isRunning ? 'Pause' : 'Resume'}
            </Text>
          </TouchableOpacity>

          {!isRunning && (
            <View style={styles.pausedActionsRow}>
              <TouchableOpacity
                activeOpacity={0.92}
                style={[styles.buttonPrimary, styles.actionButton]}
                onPress={() => setShowFinishConfirm(true)}
              >
                <Ionicons name="checkmark" size={18} color={colors.blkText} />
                <Text style={styles.buttonTextPrimary}>Finish</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.92}
                style={styles.cancelBtn}
                onPress={requestCancel}
              >
                <Ionicons name="close" size={18} color={colors.danger} />
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <FinishConfirmModal
          visible={showFinishConfirm}
          sessionLabel={isCycleSession ? 'indoor cycling' : mode === 'indoor_walk' ? 'indoor walk' : 'indoor run'}
          onKeepGoing={() => setShowFinishConfirm(false)}
          onFinish={finishToSummary}
        />

        <RunWalkCancelConfirmModal
          visible={showCancelConfirm}
          subtitle={
            isCycleSession
              ? 'This will discard your current indoor cycling session.'
              : mode === 'indoor_walk'
                ? 'This will discard your current indoor walk session.'
                : 'This will discard your current indoor run session.'
          }
          onKeep={() => setShowCancelConfirm(false)} // stays paused; user can resume
          onDiscard={confirmDiscardCancel}
        />
      </View>
    </View>
  );
}

function createStyles(
  colors: ReturnType<typeof useAppTheme>['colors'],
  fonts: ReturnType<typeof useAppTheme>['fonts'],
  layout: {
    compact: boolean;
    tight: boolean;
    topInset: number;
  }
) {
  const brandSize = layout.tight ? 44 : layout.compact ? 52 : 64;
  const verticalPad = layout.tight ? 12 : layout.compact ? 14 : 18;
  const controlSize = layout.tight ? 44 : layout.compact ? 48 : 52;

  return StyleSheet.create({
    page: {
      flex: 1,
      backgroundColor: HOME_TONES.background,
    },
    panel: {
      backgroundColor: HOME_TONES.surface1,
      borderRadius: 28,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      padding: 22,
    },
    panelSoft: {
      backgroundColor: HOME_TONES.surface2,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      padding: 18,
    },
    eyebrow: {
      color: HOME_TONES.textTertiary,
      fontFamily: fonts.label,
      fontSize: 11,
      lineHeight: 14,
      letterSpacing: 0.9,
      textTransform: 'uppercase',
    },
    buttonPrimary: {
      height: 48,
      borderRadius: 16,
      paddingHorizontal: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.highlight1,
      borderWidth: 1,
      borderColor: colors.highlight1,
      flexDirection: 'row',
    },
    buttonSecondary: {
      height: 48,
      borderRadius: 16,
      paddingHorizontal: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: HOME_TONES.surface2,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      flexDirection: 'row',
    },
    buttonTextPrimary: {
      color: colors.blkText,
      fontFamily: fonts.heading,
      fontSize: 14,
      lineHeight: 18,
    },
    buttonTextSecondary: {
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.heading,
      fontSize: 14,
      lineHeight: 18,
    },
    safe: {
      flex: 1,
      paddingBottom: layout.tight ? 8 : 12,
    },
    brandHeader: {
      paddingTop: Math.max(layout.topInset + (layout.tight ? 4 : 8), 12),
      paddingBottom: layout.tight ? 8 : 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    brandLogo: {
      width: brandSize,
      height: brandSize,
    },
    heroCard: {
      marginTop: 0,
      paddingTop: verticalPad,
      paddingBottom: verticalPad,
      paddingHorizontal: layout.tight ? 16 : layout.compact ? 18 : 22,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: layout.tight ? 8 : 12,
    },
    iconBtn: {
      width: layout.tight ? 34 : 38,
      height: layout.tight ? 34 : 38,
      borderRadius: layout.tight ? 12 : 14,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      backgroundColor: HOME_TONES.surface2,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerCenter: {
      flex: 1,
      alignItems: 'center',
      paddingTop: 2,
    },
    title: {
      marginTop: layout.tight ? 4 : 6,
      color: colors.highlight1,
      fontFamily: fonts.display,
      fontSize: layout.tight ? 22 : layout.compact ? 24 : 28,
      lineHeight: layout.tight ? 24 : layout.compact ? 28 : 32,
      letterSpacing: -0.8,
      textAlign: 'center',
    },
    heroSubtitle: {
      marginTop: layout.tight ? 6 : 8,
      color: HOME_TONES.textSecondary,
      fontFamily: fonts.body,
      fontSize: layout.tight ? 12 : 13,
      lineHeight: layout.tight ? 16 : 19,
      textAlign: 'center',
      maxWidth: layout.tight ? 190 : layout.compact ? 210 : 230,
    },
    statusPill: {
      borderRadius: 999,
      paddingHorizontal: layout.tight ? 8 : 10,
      paddingVertical: layout.tight ? 6 : 8,
      borderWidth: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: layout.tight ? 6 : 8,
      minWidth: layout.tight ? 76 : 90,
      justifyContent: 'center',
    },
    statusActive: {
      backgroundColor: colors.accentSoft,
      borderColor: colors.glowPrimary,
    },
    statusPaused: {
      backgroundColor: colors.accentTertiarySoft,
      borderColor: colors.glowTertiary,
    },
    statusDot: {
      width: 8,
      height: 8,
      borderRadius: 999,
    },
    statusDotActive: {
      backgroundColor: colors.success,
    },
    statusDotPaused: {
      backgroundColor: colors.warning,
    },
    statusText: {
      fontFamily: fonts.label,
      fontSize: layout.tight ? 9 : 10,
      lineHeight: layout.tight ? 12 : 14,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    statusTextActive: {
      color: colors.highlight1,
    },
    statusTextPaused: {
      color: colors.highlight3,
    },
    statsRow: {
      flexDirection: 'row',
      gap: layout.tight ? 8 : 10,
      marginTop: layout.tight ? 12 : 16,
    },
    statBox: {
      flex: 1,
      backgroundColor: HOME_TONES.surface2,
      borderRadius: layout.tight ? 16 : 18,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      paddingVertical: layout.tight ? 10 : 12,
      paddingHorizontal: 6,
      alignItems: 'center',
    },
    statLabel: {
      color: HOME_TONES.textTertiary,
      fontFamily: fonts.label,
      fontSize: layout.tight ? 9 : 10,
      lineHeight: layout.tight ? 12 : 14,
      letterSpacing: 1,
      marginBottom: layout.tight ? 4 : 6,
      textTransform: 'uppercase',
    },
    statValue: {
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.heading,
      fontSize: layout.tight ? 15 : layout.compact ? 16 : 17,
      lineHeight: layout.tight ? 19 : 21,
    },
    statUnit: {
      color: HOME_TONES.textSecondary,
      fontFamily: fonts.label,
      fontSize: layout.tight ? 10 : 11,
      lineHeight: 14,
    },
    centerBlock: {
      flex: 1,
      flexShrink: 1,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: layout.tight ? 10 : 12,
      paddingVertical: layout.tight ? 12 : layout.compact ? 16 : 24,
      paddingHorizontal: layout.tight ? 12 : 14,
    },
    centerBig: {
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.display,
      fontSize: layout.tight ? 42 : layout.compact ? 48 : 58,
      lineHeight: layout.tight ? 46 : layout.compact ? 52 : 62,
      letterSpacing: -1.2,
    },
    centerUnit: {
      color: HOME_TONES.textSecondary,
      fontFamily: fonts.label,
      fontSize: layout.tight ? 16 : layout.compact ? 18 : 20,
      lineHeight: layout.tight ? 20 : 24,
    },
    centerLabel: {
      color: HOME_TONES.textTertiary,
      fontFamily: fonts.label,
      fontSize: layout.tight ? 10 : 11,
      lineHeight: 14,
      letterSpacing: 0.9,
      marginTop: layout.tight ? 4 : 6,
      textTransform: 'uppercase',
    },
    centerRow: {
      flexDirection: 'row',
      gap: layout.tight ? 8 : 10,
      marginTop: layout.tight ? 10 : 14,
      width: '100%',
    },
    centerMini: {
      flex: 1,
      backgroundColor: HOME_TONES.surface3,
      borderRadius: layout.tight ? 14 : 16,
      paddingVertical: layout.tight ? 10 : 12,
      paddingHorizontal: layout.tight ? 10 : 14,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
    },
    centerMiniValue: {
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.heading,
      fontSize: layout.tight ? 13 : 14,
      lineHeight: layout.tight ? 16 : 18,
    },
    centerMiniLabel: {
      color: HOME_TONES.textTertiary,
      fontFamily: fonts.label,
      fontSize: layout.tight ? 9 : 10,
      lineHeight: layout.tight ? 12 : 14,
      letterSpacing: 0.8,
      marginTop: layout.tight ? 4 : 5,
      textTransform: 'uppercase',
    },
    controls: {
      paddingTop: layout.tight ? 10 : 12,
      gap: layout.tight ? 8 : 10,
    },
    controlRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: HOME_TONES.surface2,
      borderRadius: layout.tight ? 18 : 20,
      padding: layout.tight ? 8 : 10,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
    },
    controlRowSpaced: {
      marginTop: 0,
    },
    controlBtn: {
      width: controlSize,
      height: controlSize,
      borderRadius: layout.tight ? 14 : 16,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: HOME_TONES.surface3,
    },
    disabled: { opacity: 0.45 },
    controlCenter: { flex: 1, alignItems: 'center' },
    controlValue: {
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.display,
      fontSize: layout.tight ? 18 : 20,
      lineHeight: layout.tight ? 22 : 24,
    },
    controlUnit: {
      color: HOME_TONES.textSecondary,
      fontFamily: fonts.label,
      fontSize: layout.tight ? 10 : 11,
      lineHeight: 14,
    },
    controlLabel: {
      color: HOME_TONES.textTertiary,
      fontFamily: fonts.label,
      fontSize: layout.tight ? 9 : 10,
      lineHeight: layout.tight ? 12 : 14,
      letterSpacing: 0.9,
      marginTop: layout.tight ? 3 : 4,
      textTransform: 'uppercase',
    },
    bottom: {
      paddingTop: layout.tight ? 10 : 12,
      paddingBottom: 0,
    },
    pauseBtn: {
      minHeight: layout.tight ? 44 : layout.compact ? 48 : 56,
      gap: layout.tight ? 8 : 10,
    },
    pausedActionsRow: {
      flexDirection: 'row',
      gap: layout.tight ? 8 : 12,
      marginTop: layout.tight ? 8 : 10,
    },
    actionButton: {
      flex: 1,
      minHeight: layout.tight ? 44 : layout.compact ? 48 : 52,
      gap: 8,
    },
    cancelBtn: {
      flex: 1,
      minHeight: layout.tight ? 44 : layout.compact ? 48 : 52,
      borderRadius: layout.tight ? 14 : 16,
      borderWidth: 1,
      borderColor: colors.danger,
      backgroundColor: HOME_TONES.surface2,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: 14,
    },
    cancelText: {
      color: colors.danger,
      fontFamily: fonts.heading,
      fontSize: layout.tight ? 14 : 15,
      lineHeight: layout.tight ? 18 : 19,
    },
  });
}
