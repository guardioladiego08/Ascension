import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  AppState,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import type { LatLng } from 'react-native-maps';

import LogoHeader from '@/components/my components/logoHeader';
import { HOME_TONES } from '@/app/(tabs)/home/tokens';
import {
  getOutdoorCardioTitle,
  getOutdoorModeFromActivityType,
  type OutdoorCardioActivityType,
} from '@/lib/cardio/activityTypes';
import { useUnits } from '@/contexts/UnitsContext';
import {
  cancelIntervalCueNotifications,
  ensureIntervalNotificationsReady,
  scheduleIntervalCueNotifications,
} from '@/lib/intervals/notifications';
import {
  buildIntervalSampleRows,
  buildIntervalSessionStepRowsForInsert,
  createIntervalSession,
  deleteIntervalSession,
  insertIntervalSamples,
  insertIntervalSessionSteps,
} from '@/lib/intervals/supabase';
import {
  formatIntervalDuration,
  getIntervalPlanTotalDuration,
  getIntervalRuntimeState,
} from '@/lib/intervals/plans';
import type { IntervalPlan, IntervalPlanStep } from '@/lib/intervals/types';
import { useSmartBack } from '@/lib/navigation/useSmartBack';
import {
  clearActiveRunWalkLock,
  getActiveRunWalkLock,
  setActiveRunWalkLock,
  type RunWalkMode,
} from '@/lib/runWalkSessionLock';
import {
  createPausedRunWalkClock,
  getRunWalkElapsedMs,
  normalizeRunWalkClock,
  pauseRunWalkClock,
  resumeRunWalkClock,
} from '@/lib/runWalkSessionClock';
import { useAppTheme } from '@/providers/AppThemeProvider';
import { useActiveRunWalk } from '@/providers/ActiveRunWalkProvider';
import {
  setActiveRunWalkSession,
  type ActiveOutdoorSession,
} from '@/lib/activeRunWalkSessionStore';
import {
  clearOutdoorBackgroundTrackingDebugEvents,
  getOutdoorBackgroundTrackingDiagnostics,
  prepareOutdoorBackgroundTracking,
  recordOutdoorBackgroundTrackingDebugEvent,
  reloadOutdoorSessionFromStorage,
  startOutdoorBackgroundTracking,
  stopOutdoorBackgroundTracking,
} from '@/lib/OutdoorSession/backgroundTracking';
import {
  upsertOutdoorDraft,
  type OutdoorDraftSample,
  type OutdoorSessionDraft,
} from '@/lib/OutdoorSession/draftStore';
import {
  appendOutdoorLocations,
  getLiveOutdoorPaceSecPerKm,
} from '@/lib/OutdoorSession/locationTracking';
import { paceSecPerKm } from '@/lib/OutdoorSession/outdoorUtils';

import ConfirmCancelModal from './components/ConfrmCancelModal';
import FinishConfirmModal from './components/FinishConfirmModal';
import OutdoorMapSlide from './components/OutdoorMapSlide';
import OutdoorSessionPager from './components/OutdoorSessionPager';
import OutdoorStatsSlide from './components/OutdoorStatsSlide';

type Phase = 'idle' | 'running' | 'paused';
type ActivityType = OutdoorCardioActivityType | 'hike' | 'other';
type OutdoorLiveSessionVariant = 'open' | 'interval';

type OutdoorLiveSessionProps = {
  title: string;
  activityType: OutdoorCardioActivityType;
  runSubtype?: string | null;
  sessionVariant?: OutdoorLiveSessionVariant;
  intervalPlan?: IntervalPlan | null;
};

const HOME_ROUTE = '/(tabs)/home';

function normalizeActivityType(activityType?: string): ActivityType {
  const t = (activityType ?? '').toLowerCase();
  if (t === 'walk') return 'walk';
  if (t === 'run') return 'run';
  if (t === 'ride' || t === 'cycling' || t === 'cycle' || t === 'bike') return 'ride';
  if (t === 'hike') return 'hike';
  return 'other';
}

function defaultOutdoorTitle(activityType?: string) {
  const normalized = normalizeActivityType(activityType);
  if (normalized === 'walk') return 'Outdoor Walk';
  if (normalized === 'ride') return 'Outdoor Cycling';
  if (normalized === 'hike') return 'Outdoor Hike';
  return 'Outdoor Run';
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatPhaseTitle(step: IntervalPlanStep | null) {
  if (!step) return 'Session complete';
  if (step.kind === 'work' && step.intervalIndex) return `Work ${step.intervalIndex}`;
  if (step.kind === 'recovery' && step.intervalIndex) return `Break ${step.intervalIndex}`;
  if (step.kind === 'rest' && step.intervalIndex) return `Rest ${step.intervalIndex}`;
  return step.label;
}

function buildOpenSessionDraft(args: {
  draftId: string;
  activityType: OutdoorCardioActivityType;
  startedAtISO: string;
  endedAtISO: string;
  elapsedSeconds: number;
  distanceMeters: number;
  samples: OutdoorDraftSample[];
}) {
  const { draftId, activityType, startedAtISO, endedAtISO, elapsedSeconds, distanceMeters, samples } = args;

  const draft: OutdoorSessionDraft = {
    id: draftId,
    created_at: endedAtISO,
    started_at: startedAtISO,
    ended_at: endedAtISO,
    activity_type: activityType,
    total_time_s: elapsedSeconds,
    total_distance_m: Number(distanceMeters.toFixed(2)),
    avg_speed_mps:
      elapsedSeconds > 0 ? Number((distanceMeters / elapsedSeconds).toFixed(6)) : null,
    avg_pace_s_per_km: paceSecPerKm(distanceMeters, elapsedSeconds),
    samples,
  };

  return draft;
}

export default function OutdoorSessionRoute() {
  const params = useLocalSearchParams<{
    title?: string;
    activityType?: string;
    runSubtype?: string;
  }>();

  const activityType = normalizeActivityType(params.activityType);
  const resolvedActivityType: OutdoorCardioActivityType =
    activityType === 'walk' ? 'walk' : activityType === 'ride' ? 'ride' : 'run';

  return (
    <OutdoorLiveSessionScreen
      title={(params.title ?? defaultOutdoorTitle(params.activityType)).toString()}
      activityType={resolvedActivityType}
      runSubtype={params.runSubtype?.toString() ?? null}
      sessionVariant="open"
    />
  );
}

export function OutdoorLiveSessionScreen({
  title,
  activityType,
  runSubtype = null,
  sessionVariant = 'open',
  intervalPlan = null,
}: OutdoorLiveSessionProps) {
  const router = useRouter();
  const { goBackSmart } = useSmartBack();
  const { colors, fonts, globalStyles } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);
  const { distanceUnit } = useUnits();
  const {
    activeSession,
    hydrated: activeSessionHydrated,
    setSession: setActiveSession,
    clearSession: clearActiveSession,
  } = useActiveRunWalk();

  const lockMode: Extract<RunWalkMode, 'outdoor_run' | 'outdoor_walk' | 'outdoor_cycle'> =
    getOutdoorModeFromActivityType(activityType);

  const [phase, setPhase] = useState<Phase>('idle');
  const [cancelOpen, setCancelOpen] = useState(false);
  const [finishOpen, setFinishOpen] = useState(false);

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [distanceMeters, setDistanceMeters] = useState(0);
  const [coords, setCoords] = useState<LatLng[]>([]);
  const [resolvedIntervalPlan, setResolvedIntervalPlan] = useState<IntervalPlan | null>(
    sessionVariant === 'interval' ? intervalPlan ?? null : null
  );

  const coordsRef = useRef<LatLng[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const locationSubRef = useRef<Location.LocationSubscription | null>(null);
  const phaseRef = useRef<Phase>('idle');
  const sessionStartedAtRef = useRef<string | null>(null);
  const elapsedSecondsRef = useRef(0);
  const elapsedMsRef = useRef(0);
  const distanceMetersRef = useRef(0);
  const samplesRef = useRef<OutdoorDraftSample[]>([]);
  const sessionInitializedRef = useRef(false);
  const hydrationAppliedRef = useRef(false);
  const sessionExitRef = useRef(false);
  const sessionIdRef = useRef(makeId());
  const clockRef = useRef(createPausedRunWalkClock(0));
  const appStateRef = useRef(AppState.currentState);
  const backgroundTrackingActiveRef = useRef(false);
  const backgroundHandoffInFlightRef = useRef(false);
  const restoringForegroundRef = useRef(false);
  const storageSyncInFlightRef = useRef(false);
  const stopBackgroundAfterForegroundRef = useRef(false);
  const backgroundStopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const permissionFlowInFlightRef = useRef(false);
  const intervalCueIdsRef = useRef<string[]>([]);
  const intervalNotificationsReadyRef = useRef(false);
  const intervalFinishHandledRef = useRef(false);

  const hasProgress = elapsedSeconds > 0 || distanceMeters > 0;
  const isIdle = phase === 'idle';
  const isRunning = phase === 'running';
  const isIntervalSession = sessionVariant === 'interval';

  const currentPace = useMemo(() => {
    if (phase === 'idle') return null;
    return getLiveOutdoorPaceSecPerKm(samplesRef.current, distanceMeters, elapsedSeconds);
  }, [distanceMeters, elapsedSeconds, phase]);

  const intervalRuntime = useMemo(() => {
    if (!isIntervalSession || !resolvedIntervalPlan) {
      return null;
    }

    return getIntervalRuntimeState(resolvedIntervalPlan, elapsedSeconds);
  }, [elapsedSeconds, isIntervalSession, resolvedIntervalPlan]);

  const intervalTotalDuration = useMemo(() => {
    if (!resolvedIntervalPlan) return 0;
    return getIntervalPlanTotalDuration(resolvedIntervalPlan);
  }, [resolvedIntervalPlan]);

  const heroSubtitle = isIntervalSession
    ? 'Live stats stay first. Swipe right when you want the route map.'
    : 'Live stats stay first. Swipe right to inspect the route map.';

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
    if (!isIntervalSession) return;
    if (resolvedIntervalPlan) return;

    Alert.alert(
      'Interval unavailable',
      'This interval session is missing its workout definition.'
    );
    goBackSmart({ fallbackHref: '/add/Cardio/outdoor/interval/Setup' });
  }, [goBackSmart, isIntervalSession, resolvedIntervalPlan]);

  function applyStoredSessionState(existingSession: ActiveOutdoorSession) {
    sessionIdRef.current = existingSession.sessionId ?? makeId();
    const normalizedClock = normalizeRunWalkClock({
      clock: existingSession.clock,
      elapsedSeconds: existingSession.elapsedSeconds,
      phase: existingSession.phase,
    });

    setPhase(existingSession.phase);
    phaseRef.current = existingSession.phase;
    setElapsedSeconds(existingSession.elapsedSeconds);
    setDistanceMeters(existingSession.distanceMeters);
    setCoords(existingSession.coords);

    elapsedSecondsRef.current = existingSession.elapsedSeconds;
    elapsedMsRef.current = Math.max(0, existingSession.elapsedSeconds * 1000);
    distanceMetersRef.current = existingSession.distanceMeters;
    sessionStartedAtRef.current = existingSession.startedAtISO;
    coordsRef.current = existingSession.coords;
    samplesRef.current = existingSession.samples;
    clockRef.current = normalizedClock;
    sessionInitializedRef.current = true;

    if (isIntervalSession && existingSession.intervalPlan) {
      setResolvedIntervalPlan(existingSession.intervalPlan);
    }
  }

  function buildActiveSessionSnapshot(
    phaseOverride: Extract<Phase, 'running' | 'paused'> = phaseRef.current === 'running'
      ? 'running'
      : 'paused'
  ): ActiveOutdoorSession {
    return {
      sessionId: sessionIdRef.current,
      kind: 'outdoor',
      mode: lockMode,
      title,
      phase: phaseOverride,
      clock: clockRef.current,
      distanceUnit,
      startedAtISO: sessionStartedAtRef.current,
      elapsedSeconds: elapsedSecondsRef.current,
      distanceMeters: distanceMetersRef.current,
      coords: [...coordsRef.current],
      samples: [...samplesRef.current],
      sessionVariant,
      runSubtype,
      intervalPlan: resolvedIntervalPlan ?? undefined,
    };
  }

  async function persistActiveSessionSnapshot(
    phaseOverride: Extract<Phase, 'running' | 'paused'> = phaseRef.current === 'running'
      ? 'running'
      : 'paused'
  ) {
    if (sessionExitRef.current || !sessionInitializedRef.current) {
      return;
    }

    try {
      await setActiveRunWalkSession(buildActiveSessionSnapshot(phaseOverride));
    } catch (error) {
      console.warn('[OutdoorSession] failed to persist active session snapshot', error);
    }
  }

  async function logBackgroundTrackingIssue(message: string) {
    const diagnostics = await getOutdoorBackgroundTrackingDiagnostics().catch(() => null);
    if (!diagnostics) {
      console.warn(`[OutdoorSession] ${message}`);
      return;
    }

    console.warn(`[OutdoorSession] ${message}`, diagnostics);
  }

  async function recordScreenDebugEvent(message: string, details?: unknown) {
    await recordOutdoorBackgroundTrackingDebugEvent(message, details, 'screen');
  }

  async function runDuringPermissionFlow<T>(task: () => Promise<T>) {
    permissionFlowInFlightRef.current = true;
    try {
      return await task();
    } finally {
      permissionFlowInFlightRef.current = false;
    }
  }

  async function clearScheduledIntervalCues() {
    if (intervalCueIdsRef.current.length === 0) {
      return;
    }

    const ids = [...intervalCueIdsRef.current];
    intervalCueIdsRef.current = [];
    await cancelIntervalCueNotifications(ids);
  }

  async function syncIntervalCueSchedule(nextElapsedSeconds = elapsedSecondsRef.current) {
    if (!isIntervalSession || !resolvedIntervalPlan || !intervalNotificationsReadyRef.current) {
      return;
    }

    await clearScheduledIntervalCues();
    intervalCueIdsRef.current = await scheduleIntervalCueNotifications(
      resolvedIntervalPlan,
      nextElapsedSeconds
    );
  }

  function clearBackgroundStopTimeout() {
    stopBackgroundAfterForegroundRef.current = false;
    if (backgroundStopTimeoutRef.current) {
      clearTimeout(backgroundStopTimeoutRef.current);
      backgroundStopTimeoutRef.current = null;
    }
  }

  async function syncStoredSessionRoute(options?: { force?: boolean }) {
    if (sessionExitRef.current || storageSyncInFlightRef.current) {
      return false;
    }

    storageSyncInFlightRef.current = true;

    try {
      const storedSession = await reloadOutdoorSessionFromStorage(lockMode).catch(() => null);
      if (!storedSession) {
        return false;
      }

      const storedVariant = storedSession.sessionVariant ?? 'open';
      if (storedVariant !== sessionVariant) {
        return false;
      }

      const hasRouteDelta =
        storedSession.samples.length > samplesRef.current.length ||
        storedSession.coords.length > coordsRef.current.length ||
        storedSession.distanceMeters > distanceMetersRef.current + 0.5 ||
        storedSession.elapsedSeconds > elapsedSecondsRef.current;

      if (!options?.force && !hasRouteDelta) {
        return false;
      }

      applyStoredSessionState(storedSession);
      return true;
    } finally {
      storageSyncInFlightRef.current = false;
    }
  }

  async function stopBackgroundTrackingAfterForegroundHandoff() {
    if (appStateRef.current !== 'active') {
      clearBackgroundStopTimeout();
      return;
    }

    clearBackgroundStopTimeout();
    await syncStoredSessionRoute();
    await stopOutdoorBackgroundTracking();
    backgroundTrackingActiveRef.current = false;
  }

  function scheduleBackgroundStopAfterForegroundHandoff() {
    clearBackgroundStopTimeout();
    stopBackgroundAfterForegroundRef.current = true;
    backgroundStopTimeoutRef.current = setTimeout(() => {
      void stopBackgroundTrackingAfterForegroundHandoff();
    }, 4000);
  }

  function syncElapsedFromClock(
    nowMs = Date.now(),
    phaseOverride: Extract<Phase, 'running' | 'paused'> = phaseRef.current === 'running'
      ? 'running'
      : 'paused'
  ) {
    const normalizedClock = normalizeRunWalkClock({
      clock: clockRef.current,
      elapsedSeconds: elapsedSecondsRef.current,
      phase: phaseOverride,
      nowMs,
    });
    clockRef.current = normalizedClock;

    const nextElapsedMs = getRunWalkElapsedMs(normalizedClock, nowMs);
    const nextElapsedSeconds = Math.floor(nextElapsedMs / 1000);

    elapsedMsRef.current = nextElapsedMs;
    if (nextElapsedSeconds !== elapsedSecondsRef.current) {
      elapsedSecondsRef.current = nextElapsedSeconds;
      setElapsedSeconds(nextElapsedSeconds);
    }
  }

  async function moveTrackingToBackground() {
    if (sessionExitRef.current) return;
    if (phaseRef.current !== 'running') return;
    if (backgroundHandoffInFlightRef.current) return;

    backgroundHandoffInFlightRef.current = true;
    clearBackgroundStopTimeout();
    syncElapsedFromClock(Date.now(), 'running');
    await persistActiveSessionSnapshot('running');
    stopTimer();

    try {
      if (!backgroundTrackingActiveRef.current) {
        const backgroundStarted = await startOutdoorBackgroundTracking();
        backgroundTrackingActiveRef.current = backgroundStarted;
        if (!backgroundStarted) {
          await logBackgroundTrackingIssue(
            'background tracking did not start; route logging may pause while the app is not active'
          );
          return;
        }
      }

      if (appStateRef.current !== 'active' && phaseRef.current === 'running') {
        stopLocation();
      }
    } finally {
      backgroundHandoffInFlightRef.current = false;
    }
  }

  async function restoreForegroundTracking() {
    if (sessionExitRef.current) return;
    if (restoringForegroundRef.current) return;

    restoringForegroundRef.current = true;
    backgroundHandoffInFlightRef.current = false;

    try {
      await syncStoredSessionRoute({ force: true });

      if (phaseRef.current !== 'running') {
        syncElapsedFromClock(Date.now(), 'paused');
        clearBackgroundStopTimeout();
        await stopOutdoorBackgroundTracking();
        backgroundTrackingActiveRef.current = false;
        return;
      }

      syncElapsedFromClock(Date.now(), 'running');
      startTimer();

      if (!locationSubRef.current) {
        const locationStarted = await startLocation();
        if (!locationStarted) {
          clearBackgroundStopTimeout();
          await stopOutdoorBackgroundTracking();
          backgroundTrackingActiveRef.current = false;
          clockRef.current = pauseRunWalkClock(clockRef.current);
          phaseRef.current = 'paused';
          setPhase('paused');
          stopTimer();
          return;
        }
      }

      if (backgroundTrackingActiveRef.current) {
        scheduleBackgroundStopAfterForegroundHandoff();
      }

      if (isIntervalSession && intervalNotificationsReadyRef.current) {
        await syncIntervalCueSchedule();
      }

      await syncStoredSessionRoute();
    } finally {
      restoringForegroundRef.current = false;
    }
  }

  useEffect(() => {
    if (!activeSessionHydrated || hydrationAppliedRef.current || sessionExitRef.current) return;

    const existingSession =
      activeSession?.kind === 'outdoor' &&
      activeSession.mode === lockMode &&
      (activeSession.sessionVariant ?? 'open') === sessionVariant
        ? activeSession
        : null;

    hydrationAppliedRef.current = true;
    if (!existingSession) return;

    applyStoredSessionState(existingSession);

    if (existingSession.phase === 'running') {
      restoreForegroundTracking().catch((error) => {
        console.log('[OutdoorSession] restore location error', error);
      });
    } else {
      syncElapsedFromClock(Date.now(), 'paused');
    }
  }, [activeSession, activeSessionHydrated, lockMode, sessionVariant]);

  useEffect(() => {
    return () => {
      clearBackgroundStopTimeout();
      stopTimer();
      stopLocation();
      void clearScheduledIntervalCues();
    };
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      const previousState = appStateRef.current;
      appStateRef.current = nextState;
      void recordScreenDebugEvent('App state changed', { from: previousState, to: nextState });

      if (nextState === 'active') {
        void restoreForegroundTracking();
        return;
      }

      if (
        (nextState === 'inactive' || nextState === 'background') &&
        previousState !== nextState &&
        !permissionFlowInFlightRef.current &&
        phaseRef.current === 'running'
      ) {
        void moveTrackingToBackground();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [lockMode, sessionVariant]);

  useEffect(() => {
    if (!activeSessionHydrated || !hydrationAppliedRef.current || sessionExitRef.current) return;
    let mounted = true;

    (async () => {
      try {
        if (activeSession?.kind === 'strength') {
          Alert.alert(
            'Session in progress',
            'You already have an active strength workout. Finish or cancel it before starting an outdoor session.'
          );
          goBackSmart({ fallbackHref: HOME_ROUTE });
          return;
        }

        const existing = await getActiveRunWalkLock();
        const resumingExisting =
          activeSession?.kind === 'outdoor' &&
          activeSession.mode === lockMode &&
          (activeSession.sessionVariant ?? 'open') === sessionVariant;
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
          goBackSmart({ fallbackHref: HOME_ROUTE });
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
  }, [
    activeSession,
    activeSessionHydrated,
    goBackSmart,
    lockMode,
    phase,
    sessionVariant,
  ]);

  useEffect(() => {
    if (
      !activeSessionHydrated ||
      !sessionInitializedRef.current ||
      sessionExitRef.current ||
      phase === 'idle'
    ) {
      return;
    }

    setActiveSession(buildActiveSessionSnapshot());
  }, [
    activeSessionHydrated,
    distanceMeters,
    distanceUnit,
    elapsedSeconds,
    lockMode,
    phase,
    resolvedIntervalPlan,
    runSubtype,
    sessionVariant,
    setActiveSession,
    title,
  ]);

  useEffect(() => {
    if (phase !== 'running') {
      return;
    }

    const syncInterval = setInterval(() => {
      if (appStateRef.current !== 'active') {
        return;
      }

      void persistActiveSessionSnapshot('running');
      void syncStoredSessionRoute();
    }, 1500);

    return () => {
      clearInterval(syncInterval);
    };
  }, [lockMode, phase, sessionVariant]);

  useEffect(() => {
    if (!isIntervalSession || !intervalRuntime || phase !== 'running') {
      return;
    }

    if (!intervalRuntime.isComplete || intervalFinishHandledRef.current) {
      return;
    }

    intervalFinishHandledRef.current = true;
    onPause();
    setFinishOpen(true);
  }, [intervalRuntime, isIntervalSession, phase]);

  function startTimer() {
    stopTimer();
    syncElapsedFromClock(Date.now(), 'running');
    timerRef.current = setInterval(() => {
      syncElapsedFromClock(Date.now(), 'running');
    }, 1000);
  }

  function stopTimer() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  }

  async function startLocation() {
    stopLocation();

    const perm = await runDuringPermissionFlow(async () => {
      const existing = await Location.getForegroundPermissionsAsync();
      if (existing.status === 'granted') {
        return existing;
      }

      return await Location.requestForegroundPermissionsAsync();
    });
    if (perm.status !== 'granted') {
      Alert.alert(
        'Location permission required',
        'Allow location access to record outdoor runs and walks.'
      );
      return false;
    }

    locationSubRef.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 750,
        distanceInterval: 1,
      },
      (loc) => {
        if (phaseRef.current !== 'running') return;

        const nextSession = appendOutdoorLocations(
          {
            phase: 'running',
            clock: clockRef.current,
            elapsedSeconds: elapsedSecondsRef.current,
            distanceMeters: distanceMetersRef.current,
            coords: coordsRef.current,
            samples: samplesRef.current,
          },
          [loc]
        );

        clockRef.current = nextSession.clock;
        elapsedSecondsRef.current = nextSession.elapsedSeconds;
        elapsedMsRef.current = getRunWalkElapsedMs(nextSession.clock);
        distanceMetersRef.current = nextSession.distanceMeters;
        coordsRef.current = nextSession.coords;
        samplesRef.current = nextSession.samples;

        setElapsedSeconds(nextSession.elapsedSeconds);
        setDistanceMeters(nextSession.distanceMeters);
        setCoords(nextSession.coords as LatLng[]);

        if (stopBackgroundAfterForegroundRef.current) {
          void stopBackgroundTrackingAfterForegroundHandoff();
        }
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

  function resetSession() {
    setElapsedSeconds(0);
    elapsedSecondsRef.current = 0;
    elapsedMsRef.current = 0;
    setDistanceMeters(0);
    distanceMetersRef.current = 0;
    phaseRef.current = 'idle';
    sessionStartedAtRef.current = null;
    samplesRef.current = [];
    clockRef.current = createPausedRunWalkClock(0);
    coordsRef.current = [];
    setCoords([]);
    intervalFinishHandledRef.current = false;
  }

  function beginSessionExit() {
    sessionExitRef.current = true;
    sessionInitializedRef.current = false;
    clearActiveSession();
  }

  async function onStart() {
    if (isIntervalSession && !resolvedIntervalPlan) {
      Alert.alert('Missing interval', 'Pick an interval workout before starting.');
      return;
    }

    sessionExitRef.current = false;
    sessionIdRef.current = makeId();
    intervalFinishHandledRef.current = false;
    await clearOutdoorBackgroundTrackingDebugEvents();
    await clearScheduledIntervalCues();
    await recordScreenDebugEvent('Session start tapped', {
      lockMode,
      title,
      sessionVariant,
    });
    resetSession();
    const startedAtISO = new Date().toISOString();
    sessionStartedAtRef.current = startedAtISO;
    phaseRef.current = 'running';
    setPhase('running');
    clockRef.current = resumeRunWalkClock(createPausedRunWalkClock(0));
    sessionInitializedRef.current = true;
    await stopOutdoorBackgroundTracking();
    clearBackgroundStopTimeout();
    backgroundTrackingActiveRef.current = false;
    const backgroundReady = await runDuringPermissionFlow(prepareOutdoorBackgroundTracking);
    startTimer();
    const locationStarted = await startLocation();
    if (!locationStarted) {
      await recordScreenDebugEvent('Foreground location watcher failed to start');
      stopTimer();
      phaseRef.current = 'idle';
      setPhase('idle');
      clockRef.current = createPausedRunWalkClock(0);
      sessionStartedAtRef.current = null;
      return;
    }
    await persistActiveSessionSnapshot('running');

    if (isIntervalSession) {
      intervalNotificationsReadyRef.current = await ensureIntervalNotificationsReady().catch(
        () => false
      );
      if (intervalNotificationsReadyRef.current) {
        await syncIntervalCueSchedule(0);
      }
    }

    if (!backgroundReady) {
      await logBackgroundTrackingIssue(
        'background location permission not granted; outdoor tracking will pause if the app is locked or moved to the background'
      );
    } else {
      backgroundTrackingActiveRef.current = await startOutdoorBackgroundTracking();
      if (!backgroundTrackingActiveRef.current) {
        await logBackgroundTrackingIssue(
          'background tracker could not start; lock-screen route capture may still pause'
        );
      }
    }
  }

  function onPause() {
    syncElapsedFromClock(Date.now(), 'running');
    clockRef.current = pauseRunWalkClock(clockRef.current);
    phaseRef.current = 'paused';
    setPhase('paused');
    stopTimer();
    stopLocation();
    clearBackgroundStopTimeout();
    void recordScreenDebugEvent('Session paused');
    void persistActiveSessionSnapshot('paused');
    void stopOutdoorBackgroundTracking();
    backgroundHandoffInFlightRef.current = false;
    backgroundTrackingActiveRef.current = false;
    void clearScheduledIntervalCues();
  }

  async function onResume() {
    await recordScreenDebugEvent('Session resumed');
    clockRef.current = resumeRunWalkClock(clockRef.current);
    phaseRef.current = 'running';
    setPhase('running');
    await stopOutdoorBackgroundTracking();
    clearBackgroundStopTimeout();
    backgroundTrackingActiveRef.current = false;
    startTimer();
    const locationStarted = await startLocation();
    if (!locationStarted) {
      await recordScreenDebugEvent('Foreground location watcher failed to restart');
      clockRef.current = pauseRunWalkClock(clockRef.current);
      phaseRef.current = 'paused';
      setPhase('paused');
      stopTimer();
      return;
    }

    await persistActiveSessionSnapshot('running');

    if (await runDuringPermissionFlow(prepareOutdoorBackgroundTracking)) {
      backgroundTrackingActiveRef.current = await startOutdoorBackgroundTracking();
      if (!backgroundTrackingActiveRef.current) {
        await logBackgroundTrackingIssue(
          'background tracker did not restart after resuming the session'
        );
      }
    } else {
      await logBackgroundTrackingIssue(
        'background location permission is not ready after resuming the session'
      );
    }

    if (isIntervalSession) {
      if (!intervalNotificationsReadyRef.current) {
        intervalNotificationsReadyRef.current = await ensureIntervalNotificationsReady().catch(
          () => false
        );
      }
      if (intervalNotificationsReadyRef.current) {
        await syncIntervalCueSchedule();
      }
    }
  }

  async function onEndWorkout() {
    await recordScreenDebugEvent('Workout finish requested');
    setFinishOpen(false);
    syncElapsedFromClock(
      Date.now(),
      phaseRef.current === 'running' ? 'running' : 'paused'
    );
    stopTimer();
    stopLocation();
    clearBackgroundStopTimeout();
    await stopOutdoorBackgroundTracking();
    await clearScheduledIntervalCues();
    backgroundHandoffInFlightRef.current = false;
    backgroundTrackingActiveRef.current = false;

    const endedAtISO = new Date().toISOString();
    const startedAtISO =
      sessionStartedAtRef.current ??
      new Date(Date.now() - Math.max(0, elapsedSecondsRef.current) * 1000).toISOString();

    if (!isIntervalSession) {
      const draftId = makeId();
      const draft = buildOpenSessionDraft({
        draftId,
        activityType,
        startedAtISO,
        endedAtISO,
        elapsedSeconds: elapsedSecondsRef.current,
        distanceMeters: distanceMetersRef.current,
        samples: samplesRef.current,
      });

      try {
        await upsertOutdoorDraft(draft);
        beginSessionExit();
        await clearActiveRunWalkLock();

        router.push({
          pathname: '/add/Cardio/outdoor/SessionSummary',
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
        clockRef.current = pauseRunWalkClock(clockRef.current);
        phaseRef.current = 'paused';
        setPhase('paused');
      }
      return;
    }

    if (!resolvedIntervalPlan) {
      Alert.alert('Error', 'This interval session no longer has a workout plan.');
      clockRef.current = pauseRunWalkClock(clockRef.current);
      phaseRef.current = 'paused';
      setPhase('paused');
      return;
    }

    let sessionId: string | null = null;

    try {
      sessionId = await createIntervalSession({
        plan: resolvedIntervalPlan,
        startedAtISO,
        endedAtISO,
        durationSeconds: elapsedSecondsRef.current,
        distanceMeters: distanceMetersRef.current,
        avgPaceSecPerKm: paceSecPerKm(distanceMetersRef.current, elapsedSecondsRef.current),
      });

      await insertIntervalSessionSteps(
        buildIntervalSessionStepRowsForInsert({
          sessionId,
          plan: resolvedIntervalPlan,
          durationSeconds: elapsedSecondsRef.current,
        })
      );

      await insertIntervalSamples(
        buildIntervalSampleRows({
          sessionId,
          plan: resolvedIntervalPlan,
          samples: samplesRef.current,
        })
      );

      beginSessionExit();
      await clearActiveRunWalkLock();
      setPhase('idle');
      phaseRef.current = 'idle';
      resetSession();
      router.push({
        pathname: '/add/Cardio/outdoor/interval/Summary',
        params: {
          sessionId,
          title: resolvedIntervalPlan.name,
        },
      });
    } catch (error) {
      console.warn('[OutdoorSession] interval save failed', error);
      if (sessionId) {
        await deleteIntervalSession(sessionId).catch(() => undefined);
      }
      Alert.alert('Error', 'Could not save interval session. Please try again.');
      clockRef.current = pauseRunWalkClock(clockRef.current);
      phaseRef.current = 'paused';
      setPhase('paused');
    }
  }

  async function confirmCancel() {
    await recordScreenDebugEvent('Workout cancel confirmed');
    stopTimer();
    stopLocation();
    clearBackgroundStopTimeout();
    await stopOutdoorBackgroundTracking();
    await clearScheduledIntervalCues();
    backgroundHandoffInFlightRef.current = false;
    backgroundTrackingActiveRef.current = false;
    beginSessionExit();
    setPhase('idle');
    resetSession();
    setCancelOpen(false);
    await clearActiveRunWalkLock().catch(() => null);
    router.replace(HOME_ROUTE);
  }

  function onBackPress() {
    if (hasProgress) {
      if (phase === 'running') onPause();
      setCancelOpen(true);
    } else {
      void clearScheduledIntervalCues();
      clearActiveRunWalkLock().catch(() => null);
      beginSessionExit();
      goBackSmart({ fallbackHref: HOME_ROUTE });
    }
  }

  function renderStartCard() {
    if (isIntervalSession && resolvedIntervalPlan) {
      const totalSeconds = intervalTotalDuration;
      const workReps = getIntervalRuntimeState(resolvedIntervalPlan, totalSeconds).totalIntervalCount;

      return (
        <View style={[styles.panelSoft, styles.startWrap]}>
          <View style={styles.startIconWrap}>
            <Ionicons name="repeat-outline" size={22} color={colors.highlight1} />
          </View>
          <Text style={styles.startTitle}>{resolvedIntervalPlan.name}</Text>
          <Text style={styles.startBody}>
            {resolvedIntervalPlan.description}
          </Text>
          <View style={styles.startMetaRow}>
            <StartMetaCard label="Duration" value={formatIntervalDuration(totalSeconds)} styles={styles} />
            <StartMetaCard label="Work reps" value={String(workReps)} styles={styles} />
          </View>
          <Text style={styles.intervalBenefit}>{resolvedIntervalPlan.benefit}</Text>
          <TouchableOpacity
            activeOpacity={0.92}
            style={[styles.buttonPrimary, styles.startBtn]}
            onPress={onStart}
          >
            <Ionicons name="play" size={18} color={colors.blkText} />
            <Text style={styles.buttonTextPrimary}>Start interval</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={[styles.panelSoft, styles.startWrap]}>
        <View style={styles.startIconWrap}>
          <Ionicons
            name={
              activityType === 'walk'
                ? 'walk-outline'
                : activityType === 'ride'
                  ? 'bicycle-outline'
                  : 'navigate-outline'
            }
            size={22}
            color={colors.highlight1}
          />
        </View>
        <Text style={styles.startTitle}>Ready to begin?</Text>
        <Text style={styles.startBody}>
          Start the session to keep live stats front and center while the map stays one swipe away.
        </Text>
        <TouchableOpacity
          activeOpacity={0.92}
          style={[styles.buttonPrimary, styles.startBtn]}
          onPress={onStart}
        >
          <Ionicons name="play" size={18} color={colors.blkText} />
          <Text style={styles.buttonTextPrimary}>Start</Text>
        </TouchableOpacity>
      </View>
    );
  }

  function renderStatsPage() {
    if (isIntervalSession && resolvedIntervalPlan && intervalRuntime) {
      const currentStepTitle = formatPhaseTitle(intervalRuntime.currentStep);
      const nextSteps = resolvedIntervalPlan.steps.slice(
        Math.max(0, intervalRuntime.currentStepIndex + 1),
        Math.max(0, intervalRuntime.currentStepIndex + 4)
      );

      return (
        <ScrollView
          style={styles.primaryScroll}
          contentContainerStyle={styles.primaryScrollContent}
          showsVerticalScrollIndicator={false}
        >
          <OutdoorStatsSlide
            phase={phase}
            kicker="Interval run"
            title={resolvedIntervalPlan.name}
            subtitle="Live cues match the workout phases. Swipe right for the route."
            elapsedSeconds={elapsedSeconds}
            distanceMeters={distanceMeters}
            currentPaceSecPerKm={currentPace}
            distanceUnit={distanceUnit}
          >
            <View style={styles.phaseCard}>
              <Text style={styles.phaseLabel}>Current phase</Text>
              <Text style={styles.phaseTitle}>{currentStepTitle}</Text>
              <Text style={styles.phaseCue}>
                {intervalRuntime.currentStep?.cue ?? 'All reps are complete.'}
              </Text>
              <View style={styles.phaseMetaRow}>
                <InfoChip
                  label="Phase left"
                  value={formatIntervalDuration(intervalRuntime.stepRemainingSeconds)}
                  styles={styles}
                />
                <InfoChip
                  label="Session left"
                  value={formatIntervalDuration(intervalRuntime.totalRemainingSeconds)}
                  styles={styles}
                />
                <InfoChip
                  label="Work reps"
                  value={`${intervalRuntime.completedIntervalCount}/${intervalRuntime.totalIntervalCount}`}
                  styles={styles}
                />
              </View>
            </View>

            <View style={styles.infoGrid}>
              <InfoCard
                label="Plan length"
                value={formatIntervalDuration(intervalTotalDuration)}
                detail="Total programmed time"
                styles={styles}
              />
              <InfoCard
                label="Route map"
                value="Swipe right"
                detail="Follow your line live"
                styles={styles}
              />
            </View>

            <View style={styles.sequenceCard}>
              <Text style={styles.sequenceLabel}>Up next</Text>
              {nextSteps.length === 0 ? (
                <Text style={styles.sequenceEmpty}>No more phases queued. Finish and save the session.</Text>
              ) : (
                nextSteps.map((step) => (
                  <View key={step.id} style={styles.sequenceRow}>
                    <View>
                      <Text style={styles.sequenceTitle}>{formatPhaseTitle(step)}</Text>
                      <Text style={styles.sequenceBody}>{step.cue}</Text>
                    </View>
                    <Text style={styles.sequenceDuration}>
                      {formatIntervalDuration(step.durationSeconds)}
                    </Text>
                  </View>
                ))
              )}
            </View>
          </OutdoorStatsSlide>
        </ScrollView>
      );
    }

    return (
      <ScrollView
        style={styles.primaryScroll}
        contentContainerStyle={styles.primaryScrollContent}
        showsVerticalScrollIndicator={false}
      >
        <OutdoorStatsSlide
          phase={phase}
          kicker={getOutdoorCardioTitle(activityType)}
          title={title}
          subtitle="Your stats stay on the first page so you never lose the core numbers."
          elapsedSeconds={elapsedSeconds}
          distanceMeters={distanceMeters}
          currentPaceSecPerKm={currentPace}
          distanceUnit={distanceUnit}
        >
          <View style={styles.infoGrid}>
            <InfoCard
              label="Session"
              value={title}
              detail={runSubtype ? 'Subtype selected before launch' : 'Open live outdoor tracking'}
              styles={styles}
            />
            <InfoCard
              label="Route map"
              value="Swipe right"
              detail="Inspect the route whenever you want"
              styles={styles}
            />
          </View>
        </OutdoorStatsSlide>
      </ScrollView>
    );
  }

  function renderMapPage() {
    return (
      <View style={styles.mapPage}>
        <OutdoorMapSlide coords={coords} isRunning={isRunning} />
      </View>
    );
  }

  return (
    <View style={styles.page}>
      <ConfirmCancelModal
        visible={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onConfirmCancel={confirmCancel}
      />
      <FinishConfirmModal
        visible={finishOpen}
        onKeepGoing={() => setFinishOpen(false)}
        onFinish={() => {
          void onEndWorkout();
        }}
      />

      <View style={[globalStyles.container, styles.safe]}>
        <LogoHeader />

        <View style={[styles.panel, styles.heroCard]}>
          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.iconBtn} onPress={onBackPress}>
              <Ionicons name="chevron-back" size={18} color={colors.text} />
            </TouchableOpacity>

            <View style={styles.headerCenter}>
              <Text style={styles.eyebrow}>
                {isIntervalSession ? 'Outdoor interval' : 'Outdoor cardio'}
              </Text>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.heroSubtitle}>{heroSubtitle}</Text>
            </View>

            <View
              style={[
                styles.statusPill,
                phase === 'running'
                  ? styles.statusActive
                  : phase === 'paused'
                    ? styles.statusPaused
                    : styles.statusIdle,
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  phase === 'running'
                    ? styles.statusDotActive
                    : phase === 'paused'
                      ? styles.statusDotPaused
                      : styles.statusDotIdle,
                ]}
              />
              <Text
                style={[
                  styles.statusText,
                  phase === 'running'
                    ? styles.statusTextActive
                    : phase === 'paused'
                      ? styles.statusTextPaused
                      : styles.statusTextIdle,
                ]}
              >
                {phase === 'idle' ? 'Ready' : phase}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.content}>
          {isIdle ? (
            renderStartCard()
          ) : (
            <View style={styles.liveWrap}>
              <OutdoorSessionPager
                pages={[
                  { key: 'stats', label: 'Stats', content: renderStatsPage() },
                  { key: 'map', label: 'Map', content: renderMapPage() },
                ]}
              />
            </View>
          )}
        </View>

        <View style={styles.bottom}>
          {!isIdle && (
            <View style={styles.controlsRow}>
              <TouchableOpacity
                activeOpacity={0.92}
                style={[
                  isRunning ? styles.buttonSecondary : styles.buttonPrimary,
                  styles.controlBtn,
                ]}
                onPress={isRunning ? onPause : () => void onResume()}
              >
                <Ionicons
                  name={isRunning ? 'pause' : 'play'}
                  size={18}
                  color={isRunning ? colors.text : colors.blkText}
                />
                <Text
                  style={isRunning ? styles.buttonTextSecondary : styles.buttonTextPrimary}
                >
                  {isRunning ? 'Pause' : 'Resume'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.92}
                style={[styles.buttonPrimary, styles.endBtn]}
                onPress={() => setFinishOpen(true)}
              >
                <Ionicons name="checkmark" size={18} color={colors.blkText} />
                <Text style={styles.buttonTextPrimary}>
                  {isIntervalSession ? 'Finish' : 'End'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.92}
                style={styles.cancelBtn}
                onPress={() => setCancelOpen(true)}
              >
                <Ionicons name="close" size={18} color={colors.danger} />
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

function StartMetaCard({
  label,
  value,
  styles,
}: {
  label: string;
  value: string;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.startMetaCard}>
      <Text style={styles.startMetaLabel}>{label}</Text>
      <Text style={styles.startMetaValue}>{value}</Text>
    </View>
  );
}

function InfoCard({
  label,
  value,
  detail,
  styles,
}: {
  label: string;
  value: string;
  detail: string;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.infoCard}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
      <Text style={styles.infoDetail}>{detail}</Text>
    </View>
  );
}

function InfoChip({
  label,
  value,
  styles,
}: {
  label: string;
  value: string;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.infoChip}>
      <Text style={styles.infoChipLabel}>{label}</Text>
      <Text style={styles.infoChipValue}>{value}</Text>
    </View>
  );
}

function createStyles(
  colors: ReturnType<typeof useAppTheme>['colors'],
  fonts: ReturnType<typeof useAppTheme>['fonts']
) {
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
    },
    heroCard: {
      marginTop: 8,
      paddingBottom: 18,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
    },
    iconBtn: {
      width: 40,
      height: 40,
      borderRadius: 14,
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
      marginTop: 8,
      fontSize: 28,
      lineHeight: 32,
      fontFamily: fonts.display,
      color: colors.highlight1,
      letterSpacing: -0.8,
      textAlign: 'center',
    },
    heroSubtitle: {
      marginTop: 8,
      color: HOME_TONES.textSecondary,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 19,
      textAlign: 'center',
      maxWidth: 260,
    },
    statusPill: {
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderWidth: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      minWidth: 88,
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
    statusIdle: {
      backgroundColor: HOME_TONES.surface2,
      borderColor: HOME_TONES.borderSoft,
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
    statusDotIdle: {
      backgroundColor: HOME_TONES.textTertiary,
    },
    statusText: {
      fontFamily: fonts.label,
      fontSize: 10,
      lineHeight: 14,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    statusTextActive: { color: colors.highlight1 },
    statusTextPaused: { color: colors.highlight3 },
    statusTextIdle: { color: HOME_TONES.textSecondary },
    content: {
      flex: 1,
      paddingTop: 14,
    },
    startWrap: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 32,
      gap: 10,
    },
    startIconWrap: {
      width: 54,
      height: 54,
      borderRadius: 20,
      backgroundColor: colors.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 6,
    },
    startTitle: {
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.heading,
      fontSize: 22,
      lineHeight: 26,
      textAlign: 'center',
    },
    startBody: {
      color: HOME_TONES.textSecondary,
      fontFamily: fonts.body,
      fontSize: 14,
      lineHeight: 20,
      textAlign: 'center',
      maxWidth: 280,
    },
    startBtn: {
      marginTop: 4,
      minHeight: 56,
      gap: 10,
      minWidth: 180,
    },
    startMetaRow: {
      width: '100%',
      flexDirection: 'row',
      gap: 10,
      marginTop: 6,
    },
    startMetaCard: {
      flex: 1,
      backgroundColor: HOME_TONES.surface1,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      padding: 14,
      alignItems: 'center',
      gap: 6,
    },
    startMetaLabel: {
      color: HOME_TONES.textTertiary,
      fontFamily: fonts.label,
      fontSize: 10,
      lineHeight: 12,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    startMetaValue: {
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.mono,
      fontSize: 18,
      lineHeight: 22,
    },
    intervalBenefit: {
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 19,
      textAlign: 'center',
      maxWidth: 300,
    },
    liveWrap: {
      flex: 1,
      minHeight: 0,
    },
    primaryScroll: {
      flex: 1,
    },
    primaryScrollContent: {
      paddingBottom: 8,
      gap: 12,
    },
    mapPage: {
      minHeight: 420,
      height: 420,
    },
    infoGrid: {
      flexDirection: 'row',
      gap: 10,
      flexWrap: 'wrap',
    },
    infoCard: {
      flex: 1,
      minWidth: '46%',
      backgroundColor: HOME_TONES.surface1,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      padding: 14,
    },
    infoLabel: {
      color: HOME_TONES.textTertiary,
      fontFamily: fonts.label,
      fontSize: 10,
      lineHeight: 12,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    infoValue: {
      marginTop: 8,
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.heading,
      fontSize: 16,
      lineHeight: 20,
    },
    infoDetail: {
      marginTop: 6,
      color: HOME_TONES.textSecondary,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 18,
    },
    phaseCard: {
      backgroundColor: HOME_TONES.surface1,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      padding: 14,
      gap: 8,
    },
    phaseLabel: {
      color: HOME_TONES.textTertiary,
      fontFamily: fonts.label,
      fontSize: 10,
      lineHeight: 12,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    phaseTitle: {
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.heading,
      fontSize: 20,
      lineHeight: 24,
    },
    phaseCue: {
      color: HOME_TONES.textSecondary,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 19,
    },
    phaseMetaRow: {
      flexDirection: 'row',
      gap: 8,
      flexWrap: 'wrap',
      marginTop: 4,
    },
    infoChip: {
      flexGrow: 1,
      minWidth: '30%',
      borderRadius: 16,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      backgroundColor: HOME_TONES.surface2,
      padding: 12,
      gap: 4,
    },
    infoChipLabel: {
      color: HOME_TONES.textTertiary,
      fontFamily: fonts.label,
      fontSize: 10,
      lineHeight: 12,
      letterSpacing: 0.7,
      textTransform: 'uppercase',
    },
    infoChipValue: {
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.mono,
      fontSize: 14,
      lineHeight: 18,
    },
    sequenceCard: {
      backgroundColor: HOME_TONES.surface1,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      padding: 14,
      gap: 10,
    },
    sequenceLabel: {
      color: HOME_TONES.textTertiary,
      fontFamily: fonts.label,
      fontSize: 10,
      lineHeight: 12,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    sequenceRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
      paddingTop: 4,
      borderTopWidth: 1,
      borderTopColor: HOME_TONES.borderSoft,
    },
    sequenceTitle: {
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.heading,
      fontSize: 14,
      lineHeight: 18,
    },
    sequenceBody: {
      marginTop: 4,
      color: HOME_TONES.textSecondary,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 18,
      maxWidth: 220,
    },
    sequenceDuration: {
      color: colors.highlight1,
      fontFamily: fonts.mono,
      fontSize: 13,
      lineHeight: 18,
    },
    sequenceEmpty: {
      color: HOME_TONES.textSecondary,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 18,
    },
    bottom: {
      paddingTop: 14,
      paddingBottom: 12,
    },
    controlsRow: {
      flexDirection: 'row',
      gap: 10,
    },
    controlBtn: {
      flex: 1,
      minHeight: 56,
      gap: 10,
    },
    endBtn: {
      flex: 1,
      minHeight: 56,
      gap: 8,
    },
    cancelBtn: {
      flex: 1,
      minHeight: 56,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.danger,
      backgroundColor: HOME_TONES.surface2,
      flexDirection: 'row',
      gap: 8,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 12,
    },
    cancelText: {
      color: colors.danger,
      fontFamily: fonts.heading,
      fontSize: 15,
      lineHeight: 19,
    },
  });
}
