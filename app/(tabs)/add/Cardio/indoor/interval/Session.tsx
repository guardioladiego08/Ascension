import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AppState,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import LogoHeader from '@/components/my components/logoHeader';
import OutdoorStatsSlide from '@/app/(tabs)/add/Cardio/outdoor/components/OutdoorStatsSlide';
import FinishConfirmModal from '../indoor/FinishConfirmModal';
import RunWalkCancelConfirmModal from '../indoor/RunWalkCancelConfirmModal';
import { HOME_TONES } from '@/app/(tabs)/home/tokens';
import { useUnits } from '@/contexts/UnitsContext';
import {
  cancelIntervalCueNotifications,
  ensureIntervalNotificationsReady,
  scheduleIntervalCueNotifications,
} from '@/lib/intervals/notifications';
import {
  deserializeIntervalPlan,
  formatIntervalDuration,
  getIntervalPlanTotalDuration,
  getIntervalRuntimeState,
} from '@/lib/intervals/plans';
import type { IntervalPlan, IntervalPlanStep } from '@/lib/intervals/types';
import {
  buildIndoorIntervalSampleRows,
  buildIndoorIntervalSessionStepRowsForInsert,
  createIndoorIntervalSession,
  deleteIndoorIntervalSession,
  insertIndoorIntervalSamples,
  insertIndoorIntervalSessionSteps,
} from '@/lib/indoorIntervals/supabase';
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
import { setActiveRunWalkSession } from '@/lib/activeRunWalkSessionStore';
import type { DistanceUnit, RunWalkSample } from '@/lib/runWalkDraftStore';
import { useAppTheme } from '@/providers/AppThemeProvider';
import { useActiveRunWalk } from '@/providers/ActiveRunWalkProvider';

const M_PER_MI = 1609.344;
const M_PER_KM = 1000;
const HOME_ROUTE = '/(tabs)/home';
const FALLBACK_ROUTE = '/add/Cardio/indoor/interval/Setup';

function deg2rad(deg: number) {
  return (deg * Math.PI) / 180;
}

function speedToMps(speed: number, unit: DistanceUnit) {
  return unit === 'mi' ? speed * 0.44704 : speed * 0.2777777778;
}

function mToDisplay(meters: number, unit: DistanceUnit) {
  return unit === 'mi' ? meters / M_PER_MI : meters / M_PER_KM;
}

function paceFromMps(speedMps: number, unit: DistanceUnit) {
  if (speedMps <= 0) return Infinity;
  return (unit === 'mi' ? M_PER_MI : M_PER_KM) / speedMps;
}

function formatPace(secondsPerUnit: number, suffix: '/mi' | '/km') {
  if (!Number.isFinite(secondsPerUnit) || secondsPerUnit <= 0) return `— ${suffix}`;
  const mm = Math.floor(secondsPerUnit / 60);
  const ss = Math.round(secondsPerUnit % 60);
  return `${mm}:${String(ss).padStart(2, '0')} ${suffix}`;
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

export default function IndoorIntervalSessionRoute() {
  const params = useLocalSearchParams<{
    title?: string;
    planPayload?: string;
  }>();

  const router = useRouter();
  const { goBackSmart } = useSmartBack();
  const { colors, fonts, globalStyles } = useAppTheme();
  const { distanceUnit } = useUnits();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);
  const {
    activeSession,
    hydrated: activeSessionHydrated,
    setSession: setActiveSession,
    clearSession: clearActiveSession,
  } = useActiveRunWalk();

  const initialPlan = useMemo(
    () => deserializeIntervalPlan(params.planPayload?.toString()),
    [params.planPayload]
  );
  const [resolvedPlan, setResolvedPlan] = useState<IntervalPlan | null>(initialPlan);

  const title = (params.title ?? initialPlan?.name ?? 'Indoor Interval').toString();
  const lockMode: Extract<RunWalkMode, 'indoor_run'> = 'indoor_run';

  const [isRunning, setIsRunning] = useState(false);
  const [elapsedS, setElapsedS] = useState(0);
  const [distanceM, setDistanceM] = useState(0);
  const [elevM, setElevM] = useState(0);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const defaultSpeed = useMemo(
    () => (distanceUnit === 'mi' ? 6.0 : 10.0),
    [distanceUnit]
  );
  const [speed, setSpeed] = useState(defaultSpeed);
  const [inclineDeg, setInclineDeg] = useState(0);

  const samplesRef = useRef<RunWalkSample[]>([]);
  const seqRef = useRef(0);
  const sessionInitializedRef = useRef(false);
  const hydrationAppliedRef = useRef(false);
  const sessionExitRef = useRef(false);
  const sessionIdRef = useRef(makeId());
  const intervalCueIdsRef = useRef<string[]>([]);
  const intervalNotificationsReadyRef = useRef(false);
  const intervalFinishHandledRef = useRef(false);
  const isRunningRef = useRef(false);

  const elapsedRef = useRef(0);
  const elapsedMsRef = useRef(0);
  const distanceRef = useRef(0);
  const elevRef = useRef(0);
  const speedRef = useRef(0);
  const inclineRef = useRef(0);
  const clockRef = useRef(createPausedRunWalkClock(0));

  useEffect(() => {
    elapsedRef.current = elapsedS;
  }, [elapsedS]);
  useEffect(() => {
    isRunningRef.current = isRunning;
  }, [isRunning]);
  useEffect(() => {
    distanceRef.current = distanceM;
  }, [distanceM]);
  useEffect(() => {
    elevRef.current = elevM;
  }, [elevM]);
  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);
  useEffect(() => {
    inclineRef.current = inclineDeg;
  }, [inclineDeg]);

  const hasProgress = elapsedS > 0 || distanceM > 0;
  const speedLabelUnit = distanceUnit === 'mi' ? 'MPH' : 'KPH';
  const distanceLabelUnit = distanceUnit === 'mi' ? 'MI' : 'KM';
  const speedStep = distanceUnit === 'mi' ? 0.1 : 0.2;

  const intervalRuntime = useMemo(() => {
    if (!resolvedPlan) return null;
    return getIntervalRuntimeState(resolvedPlan, elapsedS);
  }, [elapsedS, resolvedPlan]);
  const intervalTotalDuration = useMemo(
    () => (resolvedPlan ? getIntervalPlanTotalDuration(resolvedPlan) : 0),
    [resolvedPlan]
  );

  const currentSpeedMps = speedToMps(speed, distanceUnit);
  const currentPaceSecPerKm = Number.isFinite(currentSpeedMps)
    ? paceFromMps(currentSpeedMps, 'km')
    : null;
  const avgSpeedMps = elapsedS > 0 ? distanceM / elapsedS : 0;
  const avgPaceText =
    distanceUnit === 'mi'
      ? formatPace(paceFromMps(avgSpeedMps, 'mi'), '/mi')
      : formatPace(paceFromMps(avgSpeedMps, 'km'), '/km');

  useEffect(() => {
    if (resolvedPlan) return;

    Alert.alert(
      'Interval unavailable',
      'This interval session is missing its workout definition.'
    );
    goBackSmart({ fallbackHref: FALLBACK_ROUTE });
  }, [goBackSmart, resolvedPlan]);

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
    const deltaElevM = deltaDistanceM * Math.sin(deg2rad(inclineRef.current));
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

        seqRef.current += 1;
        samplesRef.current.push({
          seq: seqRef.current,
          elapsed_s: Math.floor(boundaryElapsedMs / 1000),
          distance_m: Number(sampleDistanceM.toFixed(2)),
          speed_mps: Number(speedMps.toFixed(6)),
          pace_s_per_km: Number.isFinite(paceKm) ? Number(paceKm.toFixed(2)) : null,
          pace_s_per_mi: Number.isFinite(paceMi) ? Number(paceMi.toFixed(2)) : null,
          incline_deg: Number(inclineRef.current.toFixed(2)),
          elevation_m: Number(sampleElevM.toFixed(2)),
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

  async function clearScheduledIntervalCues() {
    if (intervalCueIdsRef.current.length === 0) {
      return;
    }

    const ids = [...intervalCueIdsRef.current];
    intervalCueIdsRef.current = [];
    await cancelIntervalCueNotifications(ids);
  }

  async function syncIntervalCueSchedule(nextElapsedSeconds = elapsedRef.current) {
    if (!resolvedPlan || !intervalNotificationsReadyRef.current) {
      return;
    }

    await clearScheduledIntervalCues();
    intervalCueIdsRef.current = await scheduleIntervalCueNotifications(
      resolvedPlan,
      nextElapsedSeconds
    );
  }

  function pauseSession() {
    syncSessionFromClock(Date.now(), 'running');
    clockRef.current = pauseRunWalkClock(clockRef.current, Date.now());
    elapsedMsRef.current = getRunWalkElapsedMs(clockRef.current, Date.now());
    setIsRunning(false);
    void clearScheduledIntervalCues();
  }

  async function resumeSession() {
    clockRef.current = resumeRunWalkClock(clockRef.current, Date.now());
    elapsedMsRef.current = getRunWalkElapsedMs(clockRef.current, Date.now());
    setIsRunning(true);

    if (!intervalNotificationsReadyRef.current) {
      intervalNotificationsReadyRef.current = await ensureIntervalNotificationsReady().catch(
        () => false
      );
    }

    if (intervalNotificationsReadyRef.current) {
      await syncIntervalCueSchedule();
    }
  }

  async function persistIndoorIntervalSessionSnapshot(
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
      mode: 'indoor_run',
      title,
      sessionVariant: 'interval',
      phase: phaseOverride,
      clock: clockRef.current,
      distanceUnit,
      elapsedS: elapsedRef.current,
      distanceM: distanceRef.current,
      elevM: elevRef.current,
      speed: speedRef.current,
      inclineDeg: inclineRef.current,
      samples: samplesRef.current,
      intervalPlan: resolvedPlan ?? undefined,
    });
  }

  useEffect(() => {
    if (!activeSessionHydrated || hydrationAppliedRef.current || sessionExitRef.current) return;

    const existingSession =
      activeSession?.kind === 'indoor' &&
      activeSession.mode === 'indoor_run' &&
      (activeSession.sessionVariant ?? 'open') === 'interval'
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
      if (existingSession.intervalPlan) {
        setResolvedPlan(existingSession.intervalPlan);
      }
      sessionInitializedRef.current = true;

      if (nextRunning) {
        syncSessionFromClock(Date.now(), 'running');
      }
    }

    hydrationAppliedRef.current = true;
  }, [activeSession, activeSessionHydrated]);

  useEffect(() => {
    if (!activeSessionHydrated || !hydrationAppliedRef.current || sessionExitRef.current) return;
    let mounted = true;

    (async () => {
      try {
        if (activeSession?.kind === 'strength') {
          Alert.alert(
            'Session in progress',
            'You already have an active strength workout. Finish or cancel it before starting an indoor interval session.'
          );
          goBackSmart({ fallbackHref: HOME_ROUTE });
          return;
        }

        const existing = await getActiveRunWalkLock();
        const resumingExisting =
          activeSession?.kind === 'indoor' &&
          activeSession.mode === 'indoor_run' &&
          (activeSession.sessionVariant ?? 'open') === 'interval';
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

        if (hasProgress || resumingExisting) {
          await setActiveRunWalkLock(lockMode);
          sessionInitializedRef.current = true;
        }
      } catch (error) {
        console.log('[IndoorIntervalSession] lock error', error);
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
    hasProgress,
    lockMode,
  ]);

  useEffect(() => {
    if (!activeSessionHydrated || !sessionInitializedRef.current || sessionExitRef.current) return;

    setActiveSession({
      sessionId: sessionIdRef.current,
      kind: 'indoor',
      mode: 'indoor_run',
      title,
      sessionVariant: 'interval',
      phase: isRunning ? 'running' : 'paused',
      clock: clockRef.current,
      distanceUnit,
      elapsedS,
      distanceM,
      elevM,
      speed,
      inclineDeg,
      samples: samplesRef.current,
      intervalPlan: resolvedPlan ?? undefined,
    });
  }, [
    activeSessionHydrated,
    distanceM,
    distanceUnit,
    elapsedS,
    elevM,
    inclineDeg,
    isRunning,
    resolvedPlan,
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
  }, [distanceUnit, isRunning]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        syncSessionFromClock(Date.now(), isRunningRef.current ? 'running' : 'paused');
        return;
      }

      if (nextState === 'inactive' || nextState === 'background') {
        void persistIndoorIntervalSessionSnapshot(
          isRunningRef.current ? 'running' : 'paused'
        );
      }
    });

    return () => {
      subscription.remove();
    };
  }, [activeSessionHydrated, distanceUnit, isRunning, resolvedPlan, title]);

  useEffect(() => {
    if (!isRunning || !intervalRuntime) {
      return;
    }

    if (!intervalRuntime.isComplete || intervalFinishHandledRef.current) {
      return;
    }

    intervalFinishHandledRef.current = true;
    pauseSession();
    setShowFinishConfirm(true);
  }, [intervalRuntime, isRunning]);

  useEffect(() => {
    return () => {
      void clearScheduledIntervalCues();
    };
  }, []);

  function resetSessionState(nextRunning: boolean) {
    setIsRunning(false);
    setElapsedS(0);
    setDistanceM(0);
    setElevM(0);
    setSpeed(defaultSpeed);
    setInclineDeg(0);

    elapsedRef.current = 0;
    elapsedMsRef.current = 0;
    distanceRef.current = 0;
    elevRef.current = 0;
    speedRef.current = defaultSpeed;
    inclineRef.current = 0;
    clockRef.current = nextRunning
      ? resumeRunWalkClock(createPausedRunWalkClock(0))
      : createPausedRunWalkClock(0);

    seqRef.current = 0;
    samplesRef.current = [];
    intervalFinishHandledRef.current = false;
    setShowFinishConfirm(false);
    setShowCancelConfirm(false);
    setIsRunning(nextRunning);
  }

  function beginSessionExit() {
    sessionExitRef.current = true;
    sessionInitializedRef.current = false;
    clearActiveSession();
  }

  async function onStart() {
    if (!resolvedPlan) {
      Alert.alert('Missing interval', 'Pick an interval workout before starting.');
      return;
    }

    sessionExitRef.current = false;
    sessionIdRef.current = makeId();
    await clearScheduledIntervalCues();
    resetSessionState(false);
    clockRef.current = resumeRunWalkClock(createPausedRunWalkClock(0));
    sessionInitializedRef.current = true;
    intervalFinishHandledRef.current = false;
    setIsRunning(true);

    await setActiveRunWalkLock(lockMode).catch(() => null);

    intervalNotificationsReadyRef.current = await ensureIntervalNotificationsReady().catch(
      () => false
    );
    if (intervalNotificationsReadyRef.current) {
      await syncIntervalCueSchedule(0);
    }
  }

  function requestCancel() {
    if (isRunning) {
      pauseSession();
    }
    setShowCancelConfirm(true);
  }

  function onBackPress() {
    if (hasProgress) {
      requestCancel();
      return;
    }

    void clearScheduledIntervalCues();
    clearActiveRunWalkLock().catch(() => null);
    beginSessionExit();
    goBackSmart({ fallbackHref: FALLBACK_ROUTE });
  }

  async function finishToSummary() {
    if (!resolvedPlan) {
      Alert.alert('Error', 'This interval session no longer has a workout plan.');
      return;
    }

    setShowFinishConfirm(false);
    syncSessionFromClock(Date.now(), isRunning ? 'running' : 'paused');
    setIsRunning(false);
    await clearScheduledIntervalCues();

    const endedAtISO = new Date().toISOString();
    const totalTimeS = elapsedRef.current;
    const startedAtISO = new Date(
      new Date(endedAtISO).getTime() - totalTimeS * 1000
    ).toISOString();
    const avgSpeedMpsFinal = totalTimeS > 0 ? distanceRef.current / totalTimeS : 0;
    const avgPaceSecPerKm =
      distanceRef.current > 0 ? totalTimeS / (distanceRef.current / M_PER_KM) : null;
    const avgPaceSecPerMi =
      distanceRef.current > 0 ? totalTimeS / (distanceRef.current / M_PER_MI) : null;

    let sessionId: string | null = null;

    try {
      sessionId = await createIndoorIntervalSession({
        plan: resolvedPlan,
        startedAtISO,
        endedAtISO,
        durationSeconds: totalTimeS,
        distanceMeters: distanceRef.current,
        elevationMeters: elevRef.current,
        avgSpeedMps: avgSpeedMpsFinal,
        avgPaceSecPerKm,
        avgPaceSecPerMi,
        timezoneStr: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });

      await insertIndoorIntervalSessionSteps(
        buildIndoorIntervalSessionStepRowsForInsert({
          sessionId,
          plan: resolvedPlan,
          durationSeconds: totalTimeS,
        })
      );

      await insertIndoorIntervalSamples(
        buildIndoorIntervalSampleRows({
          sessionId,
          startedAtISO,
          plan: resolvedPlan,
          samples: samplesRef.current,
        })
      );

      beginSessionExit();
      await clearActiveRunWalkLock();
      resetSessionState(false);
      router.push({
        pathname: '/add/Cardio/indoor/interval/Summary',
        params: {
          sessionId,
          title: resolvedPlan.name,
        },
      });
    } catch (error) {
      console.warn('[IndoorIntervalSession] finish error', error);
      if (sessionId) {
        await deleteIndoorIntervalSession(sessionId).catch(() => undefined);
      }
      Alert.alert('Error', 'Could not save interval session. Please try again.');
    }
  }

  async function confirmDiscardCancel() {
    beginSessionExit();
    await clearScheduledIntervalCues();
    await clearActiveRunWalkLock().catch(() => null);
    resetSessionState(true);
    router.replace(HOME_ROUTE);
  }

  const currentStep = intervalRuntime?.currentStep ?? null;
  const nextSteps = resolvedPlan
    ? resolvedPlan.steps.slice(
        Math.max(0, (intervalRuntime?.currentStepIndex ?? -1) + 1),
        Math.max(0, (intervalRuntime?.currentStepIndex ?? -1) + 4)
      )
    : [];
  const workRepCount = intervalRuntime?.totalIntervalCount ?? 0;
  const displayDistance = mToDisplay(distanceM, distanceUnit);
  const uiPhase = isRunning ? 'running' : hasProgress ? 'paused' : 'idle';

  return (
    <View style={styles.page}>
      <View style={[globalStyles.container, styles.safe, { paddingBottom: insets.bottom + 8 }]}>
        <LogoHeader />

        <View style={styles.headerRow}>
          <TouchableOpacity activeOpacity={0.92} style={styles.iconButton} onPress={onBackPress}>
            <Ionicons name="chevron-back" size={18} color={colors.text} />
          </TouchableOpacity>

          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>Indoor interval</Text>
            <Text style={styles.headerTitle}>{title}</Text>
            <Text style={styles.headerSubtitle}>
              Timed phase cues keep the workout moving while you control speed and incline manually.
            </Text>
          </View>
        </View>

        {!hasProgress ? (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={[globalStyles.panelSoft, styles.startCard]}>
              <View style={styles.startIconWrap}>
                <Ionicons name="repeat-outline" size={24} color={colors.highlight1} />
              </View>
              <Text style={styles.startTitle}>{resolvedPlan?.name ?? 'Indoor Interval'}</Text>
              <Text style={styles.startBody}>
                {resolvedPlan?.description ??
                  'Preset and custom treadmill intervals with timed phase cues.'}
              </Text>

              <View style={styles.metaRow}>
                <StartMetaCard
                  label="Duration"
                  value={formatIntervalDuration(intervalTotalDuration)}
                  styles={styles}
                />
                <StartMetaCard
                  label="Work reps"
                  value={String(workRepCount)}
                  styles={styles}
                />
              </View>

              {resolvedPlan?.benefit ? (
                <Text style={styles.benefitText}>{resolvedPlan.benefit}</Text>
              ) : null}

              <TouchableOpacity
                activeOpacity={0.92}
                style={[styles.primaryButton, styles.startButton]}
                onPress={onStart}
              >
                <Ionicons name="play" size={18} color={colors.blkText} />
                <Text style={styles.primaryButtonText}>Start interval</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <OutdoorStatsSlide
              phase={uiPhase}
              kicker="Indoor interval"
              title={resolvedPlan?.name ?? 'Interval Run'}
              subtitle="Live phase cues stay in sync with your manual treadmill controls."
              elapsedSeconds={elapsedS}
              distanceMeters={distanceM}
              currentPaceSecPerKm={
                currentPaceSecPerKm && Number.isFinite(currentPaceSecPerKm)
                  ? currentPaceSecPerKm
                  : null
              }
              distanceUnit={distanceUnit}
            >
              <View style={styles.phaseCard}>
                <Text style={styles.phaseLabel}>Current phase</Text>
                <Text style={styles.phaseTitle}>{formatPhaseTitle(currentStep)}</Text>
                <Text style={styles.phaseCue}>
                  {currentStep?.cue ?? 'All reps are complete. Finish when you are ready.'}
                </Text>

                <View style={styles.phaseMetricRow}>
                  <PhaseMetric
                    label="Remaining"
                    value={formatIntervalDuration(intervalRuntime?.stepRemainingSeconds ?? 0)}
                    styles={styles}
                  />
                  <PhaseMetric
                    label="Total left"
                    value={formatIntervalDuration(intervalRuntime?.totalRemainingSeconds ?? 0)}
                    styles={styles}
                  />
                  <PhaseMetric
                    label="Reps"
                    value={`${intervalRuntime?.completedIntervalCount ?? 0}/${intervalRuntime?.totalIntervalCount ?? 0}`}
                    styles={styles}
                  />
                </View>
              </View>

              <View style={styles.controlGrid}>
                <ControlCard
                  title="Speed"
                  value={`${speed.toFixed(1)} ${speedLabelUnit}`}
                  onDecrease={() => setSpeed((value) => Math.max(0, value - speedStep))}
                  onIncrease={() => setSpeed((value) => value + speedStep)}
                  styles={styles}
                />
                <ControlCard
                  title="Incline"
                  value={`${inclineDeg.toFixed(1)}°`}
                  onDecrease={() => setInclineDeg((value) => Math.max(0, value - 0.5))}
                  onIncrease={() => setInclineDeg((value) => value + 0.5)}
                  styles={styles}
                />
              </View>

              <View style={styles.detailGrid}>
                <DetailTile
                  label="Distance"
                  value={`${displayDistance.toFixed(2)} ${distanceLabelUnit}`}
                  styles={styles}
                />
                <DetailTile label="Avg pace" value={avgPaceText} styles={styles} />
                <DetailTile
                  label="Elevation"
                  value={`${elevM.toFixed(0)} m`}
                  styles={styles}
                />
              </View>

              {nextSteps.length > 0 ? (
                <View style={styles.queueCard}>
                  <Text style={styles.queueTitle}>Up next</Text>
                  {nextSteps.map((step) => (
                    <View key={step.id} style={styles.queueRow}>
                      <Text style={styles.queueLabel}>{formatPhaseTitle(step)}</Text>
                      <Text style={styles.queueDuration}>
                        {formatIntervalDuration(step.durationSeconds)}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </OutdoorStatsSlide>

            <View style={styles.actionRow}>
              <TouchableOpacity
                activeOpacity={0.92}
                style={[styles.primaryButton, styles.actionButton]}
                onPress={isRunning ? pauseSession : () => void resumeSession()}
              >
                <Ionicons
                  name={isRunning ? 'pause' : 'play'}
                  size={18}
                  color={colors.blkText}
                />
                <Text style={styles.primaryButtonText}>{isRunning ? 'Pause' : 'Resume'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.92}
                style={[styles.secondaryButton, styles.actionButton]}
                onPress={() => setShowFinishConfirm(true)}
              >
                <Ionicons name="flag-outline" size={18} color={colors.text} />
                <Text style={styles.secondaryButtonText}>Finish</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              activeOpacity={0.92}
              style={styles.cancelLink}
              onPress={requestCancel}
            >
              <Text style={styles.cancelLinkText}>Cancel session</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </View>

      <FinishConfirmModal
        visible={showFinishConfirm}
        onKeepGoing={() => setShowFinishConfirm(false)}
        onFinish={finishToSummary}
      />

      <RunWalkCancelConfirmModal
        visible={showCancelConfirm}
        onKeep={() => setShowCancelConfirm(false)}
        onDiscard={() => void confirmDiscardCancel()}
      />
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
    <View style={styles.metaCard}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

function PhaseMetric({
  label,
  value,
  styles,
}: {
  label: string;
  value: string;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.phaseMetricCard}>
      <Text style={styles.phaseMetricLabel}>{label}</Text>
      <Text style={styles.phaseMetricValue}>{value}</Text>
    </View>
  );
}

function ControlCard({
  title,
  value,
  onDecrease,
  onIncrease,
  styles,
}: {
  title: string;
  value: string;
  onDecrease: () => void;
  onIncrease: () => void;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.controlCard}>
      <Text style={styles.controlLabel}>{title}</Text>
      <Text style={styles.controlValue}>{value}</Text>
      <View style={styles.controlActions}>
        <TouchableOpacity activeOpacity={0.92} style={styles.adjustButton} onPress={onDecrease}>
          <Ionicons name="remove" size={18} color="#FFFFFF" />
        </TouchableOpacity>
        <TouchableOpacity activeOpacity={0.92} style={styles.adjustButton} onPress={onIncrease}>
          <Ionicons name="add" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function DetailTile({
  label,
  value,
  styles,
}: {
  label: string;
  value: string;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.detailTile}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
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
    safe: {
      flex: 1,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 14,
      marginTop: 8,
      marginBottom: 14,
    },
    iconButton: {
      width: 40,
      height: 40,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      backgroundColor: HOME_TONES.surface2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerCopy: {
      flex: 1,
    },
    eyebrow: {
      color: HOME_TONES.textTertiary,
      fontFamily: fonts.label,
      fontSize: 11,
      lineHeight: 14,
      letterSpacing: 0.9,
      textTransform: 'uppercase',
    },
    headerTitle: {
      marginTop: 8,
      color: colors.highlight1,
      fontFamily: fonts.display,
      fontSize: 28,
      lineHeight: 32,
      letterSpacing: -0.8,
    },
    headerSubtitle: {
      marginTop: 8,
      color: HOME_TONES.textSecondary,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 19,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: 20,
      gap: 12,
    },
    startCard: {
      gap: 16,
    },
    startIconWrap: {
      width: 54,
      height: 54,
      borderRadius: 20,
      backgroundColor: colors.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    startTitle: {
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 24,
      lineHeight: 28,
    },
    startBody: {
      color: colors.text,
      fontFamily: fonts.body,
      fontSize: 14,
      lineHeight: 20,
    },
    metaRow: {
      flexDirection: 'row',
      gap: 10,
    },
    metaCard: {
      flex: 1,
      minHeight: 86,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card3,
      paddingHorizontal: 14,
      paddingVertical: 14,
      justifyContent: 'space-between',
    },
    metaLabel: {
      color: colors.textOffSt,
      fontFamily: fonts.label,
      fontSize: 10,
      lineHeight: 13,
      letterSpacing: 0.9,
      textTransform: 'uppercase',
    },
    metaValue: {
      color: colors.text,
      fontFamily: fonts.display,
      fontSize: 20,
      lineHeight: 24,
    },
    benefitText: {
      color: colors.highlight2,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 19,
    },
    primaryButton: {
      minHeight: 52,
      borderRadius: 18,
      backgroundColor: colors.highlight1,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: 18,
    },
    primaryButtonText: {
      color: colors.blkText,
      fontFamily: fonts.heading,
      fontSize: 14,
      lineHeight: 18,
    },
    startButton: {
      marginTop: 4,
    },
    phaseCard: {
      borderRadius: 22,
      backgroundColor: HOME_TONES.surface1,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      padding: 16,
      gap: 10,
    },
    phaseLabel: {
      color: HOME_TONES.textTertiary,
      fontFamily: fonts.label,
      fontSize: 10,
      lineHeight: 13,
      letterSpacing: 0.9,
      textTransform: 'uppercase',
    },
    phaseTitle: {
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.heading,
      fontSize: 22,
      lineHeight: 26,
    },
    phaseCue: {
      color: HOME_TONES.textSecondary,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 19,
    },
    phaseMetricRow: {
      flexDirection: 'row',
      gap: 10,
      flexWrap: 'wrap',
    },
    phaseMetricCard: {
      flex: 1,
      minWidth: 96,
      borderRadius: 18,
      backgroundColor: HOME_TONES.surface2,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      paddingHorizontal: 12,
      paddingVertical: 12,
      gap: 6,
    },
    phaseMetricLabel: {
      color: HOME_TONES.textTertiary,
      fontFamily: fonts.label,
      fontSize: 10,
      lineHeight: 13,
      letterSpacing: 0.9,
      textTransform: 'uppercase',
    },
    phaseMetricValue: {
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.display,
      fontSize: 18,
      lineHeight: 22,
    },
    controlGrid: {
      flexDirection: 'row',
      gap: 10,
      flexWrap: 'wrap',
    },
    controlCard: {
      flex: 1,
      minWidth: 140,
      borderRadius: 22,
      backgroundColor: HOME_TONES.surface1,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      padding: 16,
      gap: 12,
    },
    controlLabel: {
      color: HOME_TONES.textTertiary,
      fontFamily: fonts.label,
      fontSize: 10,
      lineHeight: 13,
      letterSpacing: 0.9,
      textTransform: 'uppercase',
    },
    controlValue: {
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.display,
      fontSize: 24,
      lineHeight: 28,
    },
    controlActions: {
      flexDirection: 'row',
      gap: 10,
    },
    adjustButton: {
      flex: 1,
      height: 40,
      borderRadius: 14,
      backgroundColor: HOME_TONES.surface2,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    detailGrid: {
      flexDirection: 'row',
      gap: 10,
      flexWrap: 'wrap',
    },
    detailTile: {
      flex: 1,
      minWidth: 96,
      borderRadius: 18,
      backgroundColor: HOME_TONES.surface1,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      paddingHorizontal: 12,
      paddingVertical: 14,
      gap: 8,
    },
    detailLabel: {
      color: HOME_TONES.textTertiary,
      fontFamily: fonts.label,
      fontSize: 10,
      lineHeight: 13,
      letterSpacing: 0.9,
      textTransform: 'uppercase',
    },
    detailValue: {
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.display,
      fontSize: 18,
      lineHeight: 22,
    },
    queueCard: {
      borderRadius: 22,
      backgroundColor: HOME_TONES.surface1,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      padding: 16,
      gap: 10,
    },
    queueTitle: {
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.heading,
      fontSize: 16,
      lineHeight: 20,
    },
    queueRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    queueLabel: {
      flex: 1,
      color: HOME_TONES.textSecondary,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 18,
    },
    queueDuration: {
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.label,
      fontSize: 12,
      lineHeight: 16,
    },
    actionRow: {
      flexDirection: 'row',
      gap: 10,
    },
    actionButton: {
      flex: 1,
    },
    secondaryButton: {
      minHeight: 52,
      borderRadius: 18,
      backgroundColor: HOME_TONES.surface1,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: 18,
    },
    secondaryButtonText: {
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 14,
      lineHeight: 18,
    },
    cancelLink: {
      alignSelf: 'center',
      paddingVertical: 8,
    },
    cancelLinkText: {
      color: HOME_TONES.textSecondary,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 18,
    },
  });
}
