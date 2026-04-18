import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Vibration,
} from 'react-native';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import LogoHeader from '@/components/my components/logoHeader';
import { useSmartBack } from '@/lib/navigation/useSmartBack';
import { useUnits } from '@/contexts/UnitsContext';
import {
  applyStrengthRestTimerPreference,
  createIdleStrengthRestTimer,
  normalizeStrengthRestTimer,
  pauseStrengthRestTimer,
  restartStrengthRestTimer,
  resumeStrengthRestTimer,
  startStrengthRestTimer,
  syncStrengthRestTimer,
  type StrengthRestTimerState,
} from '@/lib/strength/restTimer';
import {
  DEFAULT_STRENGTH_REST_TIMER_SECONDS,
  getStrengthRestTimerPreferences,
} from '@/lib/strength/restTimerPreferences';
import type {
  ExerciseDraft,
  PreviousExerciseSetSuggestion,
  StrengthSessionMode,
  SupersetBlockDraft,
  StrengthWorkoutBlockDraft,
} from '@/lib/strength/types';
import {
  createExerciseBlock,
  createExerciseDraft,
  createSupersetBlock,
  flattenExercisesFromBlocks,
  getSupersetLabel,
  getSupersetRoundCount,
  padExerciseRoundsToCount,
} from '@/lib/strength/workoutBlocks';
import {
  createPausedRunWalkClock,
  getRunWalkElapsedMs,
  normalizeRunWalkClock,
  pauseRunWalkClock,
  resumeRunWalkClock,
} from '@/lib/runWalkSessionClock';
import { clearActiveRunWalkSession } from '@/lib/activeRunWalkSessionStore';
import { supabase } from '@/lib/supabase';
import {
  fetchStrengthWorkoutTemplateById,
  type StrengthWorkoutTemplate,
} from '@/lib/strength/templates';
import { useAppTheme } from '@/providers/AppThemeProvider';
import { useActiveRunWalk } from '@/providers/ActiveRunWalkProvider';
import { useSupabaseSession } from '@/providers/SupabaseProvider';
import { HOME_TONES } from '../../home/tokens';

import CancelConfirmModal from './components/CancelConfirmModal';
import ExercisePickerModal from './components/ExercisePickerModal';
import ExerciseRequiredModal from './components/ExerciseRequiredModal';
import FinishConfirmModal from './components/FinishConfirmModal';
import SessionHeader from './components/SessionHeader';
import SupersetBuilderModal from './components/SupersetBuilderModal';
import StrengthBlocksList from './components/StrengthBlocksList';
import StrengthSessionActionsRow from './components/StrengthSessionActionsRow';
import {
  AUTH_TIMEOUT_MS,
  STARTUP_TIMEOUT_MS,
  createStrengthWorkoutRow,
  ensureAuthedUserId,
  getPreviousSessionStrengthSets,
  getStrengthWorkoutRow,
  makeStrengthSessionId,
  toKgWeight,
  withTimeout,
} from './strengthSessionHelpers';

const TITLE = 'Strength Training Session';
const HOME_ROUTE = '/(tabs)/home';
const STARTUP_STALL_TIMEOUT_MS = 18000;
const MAX_STARTUP_RECOVERY_ATTEMPTS = 1;
type WorkoutBlockRow = {
  id: string;
  block_kind: 'exercise' | 'superset';
  sequence_index: number;
  rest_interval_seconds: number | null;
  label: string | null;
};

type WorkoutBlockExerciseRow = {
  id: string;
  workout_block_id: string;
  exercise_id: string;
  exercise_order: number;
};

export default function StrengthTrain() {
  const { goBackSmart } = useSmartBack();
  const params = useLocalSearchParams<{
    sessionMode?: string;
    templateId?: string;
  }>();
  const { session: authSession } = useSupabaseSession();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const { colors, fonts, globalStyles } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);
  const { weightUnit } = useUnits();
  const {
    activeSession,
    hydrated: activeSessionHydrated,
    setSession: setActiveSession,
    clearSession: clearActiveSession,
  } = useActiveRunWalk();
  const requestedTemplateId =
    typeof params.templateId === 'string' && params.templateId.trim().length > 0
      ? params.templateId
      : null;
  const requestedSessionMode: StrengthSessionMode =
    params.sessionMode === 'template' && requestedTemplateId ? 'template' : 'freestyle';
  const [workoutId, setWorkoutId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [startedAtISO, setStartedAtISO] = useState<string | null>(null);
  const [sessionMode, setSessionMode] = useState<StrengthSessionMode>(requestedSessionMode);
  const [sourceTemplateId, setSourceTemplateId] = useState<string | null>(requestedTemplateId);
  const [sourceTemplateName, setSourceTemplateName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [blocks, setBlocks] = useState<StrengthWorkoutBlockDraft[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [supersetBuilderOpen, setSupersetBuilderOpen] = useState(false);
  const [paused, setPaused] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [finishModalOpen, setFinishModalOpen] = useState(false);
  const [exerciseRequiredOpen, setExerciseRequiredOpen] = useState(false);
  const [sessionBootstrapNonce, setSessionBootstrapNonce] = useState(0);
  const [restTimerPreferenceSeconds, setRestTimerPreferenceSeconds] = useState(
    DEFAULT_STRENGTH_REST_TIMER_SECONDS
  );
  const [restTimer, setRestTimer] = useState<StrengthRestTimerState>(() =>
    createIdleStrengthRestTimer(DEFAULT_STRENGTH_REST_TIMER_SECONDS)
  );
  const hydrationAppliedRef = useRef(false);
  const sessionExitRef = useRef(false);
  const sessionPersistEnabledRef = useRef(true);
  const sessionIdRef = useRef(makeStrengthSessionId());
  const secondsRef = useRef(0);
  const pausedRef = useRef(false);
  const clockRef = useRef(createPausedRunWalkClock(0));
  const previousSessionSetsCacheRef = useRef<
    Record<string, PreviousExerciseSetSuggestion[] | undefined>
  >({});
  const exerciseScrollRef = useRef<ScrollView | null>(null);
  const shouldScrollToNewExerciseRef = useRef(false);
  const readyNotifiedAtRef = useRef<number | null>(null);
  const cancelPromptWasRunningRef = useRef(false);
  const wasFocusedRef = useRef(false);
  const startupRecoveryAttemptsRef = useRef(0);
  const exercises = useMemo(() => flattenExercisesFromBlocks(blocks), [blocks]);
  const sessionReady = !loading && !!workoutId;
  const sessionTitle =
    sessionMode === 'template' && sourceTemplateName
      ? sourceTemplateName
      : TITLE;

  const resetStrengthComposerState = React.useCallback(() => {
    hydrationAppliedRef.current = false;
    sessionPersistEnabledRef.current = false;
    sessionIdRef.current = makeStrengthSessionId();
    previousSessionSetsCacheRef.current = {};
    shouldScrollToNewExerciseRef.current = false;
    readyNotifiedAtRef.current = null;
    setPickerOpen(false);
    setSupersetBuilderOpen(false);
    setCancelModalOpen(false);
    setFinishModalOpen(false);
    setExerciseRequiredOpen(false);
    setWorkoutId(null);
    setUserId(null);
    setStartedAtISO(null);
    setSessionMode('freestyle');
    setSourceTemplateId(null);
    setSourceTemplateName(null);
    setBlocks([]);
    setPaused(false);
    setSeconds(0);
    secondsRef.current = 0;
    pausedRef.current = false;
    clockRef.current = createPausedRunWalkClock(0);
    setRestTimer(createIdleStrengthRestTimer(restTimerPreferenceSeconds));
    setLoading(false);
  }, [restTimerPreferenceSeconds]);

  useEffect(() => {
    secondsRef.current = seconds;
  }, [seconds]);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const prefs = await getStrengthRestTimerPreferences();
      if (!mounted) return;
      setRestTimerPreferenceSeconds(prefs.defaultDurationSeconds);
      setRestTimer((current) =>
        applyStrengthRestTimerPreference(current, prefs.defaultDurationSeconds)
      );
    })().catch((error) => {
      console.warn('[StrengthTrain] failed to load rest timer preferences', error);
    });

    return () => {
      mounted = false;
    };
  }, []);

  function syncSecondsFromClock(
    nowMs = Date.now(),
    phaseOverride: 'running' | 'paused' = pausedRef.current ? 'paused' : 'running'
  ) {
    const normalizedClock = normalizeRunWalkClock({
      clock: clockRef.current,
      elapsedSeconds: secondsRef.current,
      phase: phaseOverride,
      nowMs,
    });
    clockRef.current = normalizedClock;

    const nextSeconds = Math.floor(getRunWalkElapsedMs(normalizedClock, nowMs) / 1000);
    if (nextSeconds !== secondsRef.current) {
      secondsRef.current = nextSeconds;
      setSeconds(nextSeconds);
    }
  }

  function syncRestTimer(nowMs = Date.now()) {
    setRestTimer((current) => syncStrengthRestTimer(current, nowMs));
  }

  function pauseStrengthSession() {
    const nowMs = Date.now();
    syncSecondsFromClock(nowMs, 'running');
    clockRef.current = pauseRunWalkClock(clockRef.current, nowMs);
    setPaused(true);
  }

  function resumeStrengthSession() {
    const nowMs = Date.now();
    clockRef.current = resumeRunWalkClock(clockRef.current, nowMs);
    setPaused(false);
  }

  const clearRestTimerForOwner = (
    ownerKind: 'exercise' | 'superset',
    ownerId: string
  ) => {
    setRestTimer((current) =>
      current.ownerKind === ownerKind && current.ownerId === ownerId
        ? createIdleStrengthRestTimer(current.durationSeconds)
        : current
    );
  };

  const startRestTimerForExercise = (exerciseInstanceId: string) => {
    setRestTimer(
      startStrengthRestTimer({
        durationSeconds: restTimerPreferenceSeconds,
        ownerKind: 'exercise',
        ownerId: exerciseInstanceId,
      })
    );
  };

  const startRestTimerForSuperset = (supersetId: string, durationSeconds: number) => {
    setRestTimer(
      startStrengthRestTimer({
        durationSeconds,
        ownerKind: 'superset',
        ownerId: supersetId,
      })
    );
  };

  const pauseCurrentRestTimer = () => {
    setRestTimer((current) => pauseStrengthRestTimer(current));
  };

  const resumeCurrentRestTimer = () => {
    setRestTimer((current) =>
      current.status === 'ready'
        ? restartStrengthRestTimer(current)
        : resumeStrengthRestTimer(current)
    );
  };

  const resetSupersetRestTimer = (supersetId: string, durationSeconds: number) => {
    setRestTimer((current) =>
      current.ownerKind === 'superset' && current.ownerId === supersetId
        ? startStrengthRestTimer({
            durationSeconds,
            ownerKind: 'superset',
            ownerId: supersetId,
          })
        : current
    );
  };

  useEffect(() => {
    if (!sessionReady) {
      return;
    }

    if (paused) {
      syncSecondsFromClock(Date.now(), 'paused');
      return;
    }

    syncSecondsFromClock(Date.now(), 'running');
    const id = setInterval(() => {
      syncSecondsFromClock(Date.now(), 'running');
    }, 1000);

    return () => clearInterval(id);
  }, [paused, sessionReady]);

  useEffect(() => {
    if (restTimer.status !== 'running') {
      syncRestTimer(Date.now());
      return;
    }

    syncRestTimer(Date.now());
    const id = setInterval(() => {
      syncRestTimer(Date.now());
    }, 1000);

    return () => clearInterval(id);
  }, [restTimer.status]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active' || !sessionReady) return;

      const nowMs = Date.now();
      syncSecondsFromClock(nowMs, pausedRef.current ? 'paused' : 'running');
      syncRestTimer(nowMs);
    });

    return () => {
      subscription.remove();
    };
  }, [sessionReady]);

  useEffect(() => {
    if (restTimer.status !== 'ready' || restTimer.readyAtMs == null) {
      return;
    }

    if (readyNotifiedAtRef.current === restTimer.readyAtMs) {
      return;
    }

    readyNotifiedAtRef.current = restTimer.readyAtMs;
    Vibration.vibrate();
  }, [restTimer.readyAtMs, restTimer.status]);

  useEffect(() => {
    if (restTimer.status !== 'ready') {
      readyNotifiedAtRef.current = null;
    }
  }, [restTimer.status]);

  useEffect(() => {
    if (
      !activeSessionHydrated ||
      hydrationAppliedRef.current ||
      sessionExitRef.current
    ) {
      return;
    }

    let mounted = true;

    (async () => {
      try {
        hydrationAppliedRef.current = true;
        const uid = authSession?.user?.id
          ? authSession.user.id
          : await withTimeout(
              ensureAuthedUserId(),
              AUTH_TIMEOUT_MS,
              'Authenticating your account'
            );
        if (!mounted || sessionExitRef.current) return;
        sessionPersistEnabledRef.current = true;

        if (activeSession && activeSession.kind !== 'strength') {
          const sessionLabel =
            activeSession.kind === 'outdoor'
              ? activeSession.mode === 'outdoor_walk'
                ? 'outdoor walk'
                : 'outdoor run'
              : activeSession.mode === 'indoor_walk'
                ? 'indoor walk'
                : 'indoor run';

          Alert.alert(
            'Session in progress',
            `You already have an active ${sessionLabel} session. Finish or cancel it before starting a strength workout.`
          );
          goBackSmart({ fallbackHref: HOME_ROUTE });
          return;
        }

        if (activeSession?.kind === 'strength') {
          sessionIdRef.current = activeSession.sessionId ?? makeStrengthSessionId();
          const resumedWorkout = await withTimeout(
            getStrengthWorkoutRow(activeSession.workoutId),
            STARTUP_TIMEOUT_MS,
            'Checking your saved workout'
          );
          if (!mounted || sessionExitRef.current) return;

          if (
            resumedWorkout &&
            resumedWorkout.user_id === uid &&
            resumedWorkout.ended_at == null
          ) {
            console.log('[HealthDebug] resuming existing strength session', {
              workoutId: resumedWorkout.id,
              startedAtISO: resumedWorkout.started_at,
            });

            const resumedBlocks =
              activeSession.blocks && activeSession.blocks.length > 0
                ? activeSession.blocks
                : activeSession.exercises.map((exercise) => createExerciseBlock(exercise));

            setWorkoutId(activeSession.workoutId);
            setUserId(uid);
            setStartedAtISO(activeSession.startedAtISO ?? resumedWorkout.started_at ?? null);
            setSessionMode(activeSession.sessionMode ?? 'freestyle');
            setSourceTemplateId(activeSession.templateId ?? null);
            setSourceTemplateName(activeSession.templateName ?? null);
            setBlocks(resumedBlocks);
            setPaused(activeSession.phase === 'paused');
            setSeconds(activeSession.seconds);
            secondsRef.current = activeSession.seconds;
            pausedRef.current = activeSession.phase === 'paused';
            clockRef.current = normalizeRunWalkClock({
              clock: activeSession.clock,
              elapsedSeconds: activeSession.seconds,
              phase: activeSession.phase,
            });
            setRestTimer(
              activeSession.restTimer
                ? syncStrengthRestTimer(
                    normalizeStrengthRestTimer(
                      activeSession.restTimer,
                      restTimerPreferenceSeconds
                    ),
                    Date.now()
                  )
                : createIdleStrengthRestTimer(restTimerPreferenceSeconds)
            );
            if (activeSession.phase === 'running') {
              syncSecondsFromClock(Date.now(), 'running');
            }
            setLoading(false);
            return;
          }

          console.warn('[HealthDebug] stale strength session found locally, creating replacement row', {
            localWorkoutId: activeSession.workoutId,
            resumedWorkout: resumedWorkout ?? null,
          });
          clearActiveSession();
        }
        setUserId(uid);

        let nextSessionMode: StrengthSessionMode = requestedSessionMode;
        let nextTemplateId: string | null = requestedTemplateId;
        let nextTemplateName: string | null = null;
        let nextBlocks: StrengthWorkoutBlockDraft[] = [];

        if (nextSessionMode === 'template' && nextTemplateId) {
          const template = await withTimeout(
            fetchStrengthWorkoutTemplateById({
              templateId: nextTemplateId,
              userId: uid,
            }),
            STARTUP_TIMEOUT_MS,
            'Loading your template'
          );
          if (!mounted || sessionExitRef.current) return;

          if (!template) {
            throw new Error('Template not found. Please choose another saved template.');
          }

          nextTemplateName = template.title;
          nextBlocks = await withTimeout(
            buildBlocksFromTemplate(template, uid),
            STARTUP_TIMEOUT_MS,
            'Preparing your template'
          );
          if (!mounted || sessionExitRef.current) return;
        }

        const data = await withTimeout(
          createStrengthWorkoutRow({ userId: uid }),
          STARTUP_TIMEOUT_MS,
          'Creating your workout'
        );
        if (!mounted || sessionExitRef.current) return;

        setWorkoutId(data.id);
        setStartedAtISO(data.started_at ?? null);
        setSessionMode(nextSessionMode);
        setSourceTemplateId(nextSessionMode === 'template' ? nextTemplateId : null);
        setSourceTemplateName(nextTemplateName);
        setBlocks(nextBlocks);
        setSeconds(0);
        secondsRef.current = 0;
        pausedRef.current = false;
        clockRef.current = resumeRunWalkClock(createPausedRunWalkClock(0));
        setPaused(false);
        setRestTimer(createIdleStrengthRestTimer(restTimerPreferenceSeconds));
        setLoading(false);
      } catch (err: any) {
        hydrationAppliedRef.current = false;
        setLoading(false);
        console.error('[StrengthTrain] start workout failed', err);
        Alert.alert(
          'Error starting workout',
          err?.message ?? 'Failed to start workout. Please sign in again.'
        );
        goBackSmart({ fallbackHref: HOME_ROUTE });
      }
    })();

    return () => {
      mounted = false;
    };
  }, [
    activeSession,
    activeSessionHydrated,
    authSession,
    clearActiveSession,
    requestedSessionMode,
    requestedTemplateId,
    restTimerPreferenceSeconds,
    sessionBootstrapNonce,
  ]);

  useFocusEffect(
    React.useCallback(() => {
      if (!activeSessionHydrated || sessionExitRef.current) {
        return undefined;
      }

      if (hydrationAppliedRef.current || workoutId || loading) {
        return undefined;
      }

      setLoading(true);
      setSessionBootstrapNonce((current) => current + 1);
      return undefined;
    }, [activeSessionHydrated, loading, workoutId])
  );

  useEffect(() => {
    const gainedFocus = isFocused && !wasFocusedRef.current;
    wasFocusedRef.current = isFocused;

    if (!gainedFocus || !sessionExitRef.current) {
      return;
    }

    sessionExitRef.current = false;
    hydrationAppliedRef.current = false;
    setLoading(true);
    setSessionBootstrapNonce((current) => current + 1);
  }, [
    isFocused,
  ]);

  useEffect(() => {
    if (!loading || workoutId) {
      startupRecoveryAttemptsRef.current = 0;
      return;
    }

    const timer = setTimeout(() => {
      if (!loading || workoutId) return;

      startupRecoveryAttemptsRef.current += 1;
      const attempt = startupRecoveryAttemptsRef.current;

      if (attempt <= MAX_STARTUP_RECOVERY_ATTEMPTS) {
        console.warn('[StrengthTrain] startup appears stalled, retrying bootstrap', {
          attempt,
          activeSessionHydrated,
          hasAuthSession: Boolean(authSession),
          sessionExit: sessionExitRef.current,
        });

        sessionExitRef.current = false;
        hydrationAppliedRef.current = false;
        setSessionBootstrapNonce((current) => current + 1);
        return;
      }

      console.error('[StrengthTrain] startup remained stalled after retry');
      hydrationAppliedRef.current = false;
      setLoading(false);
      Alert.alert(
        'Could not start workout',
        'Session setup took too long. Please try again.'
      );
      goBackSmart({ fallbackHref: HOME_ROUTE });
    }, STARTUP_STALL_TIMEOUT_MS);

    return () => clearTimeout(timer);
  }, [activeSessionHydrated, authSession, loading, workoutId]);

  useEffect(() => {
    if (
      !authSession ||
      !activeSessionHydrated ||
      !workoutId ||
      !sessionPersistEnabledRef.current ||
      sessionExitRef.current
    ) {
      return;
    }

    setActiveSession({
      sessionId: sessionIdRef.current,
      kind: 'strength',
      title: sessionTitle,
      sessionMode,
      templateId: sourceTemplateId,
      templateName: sourceTemplateName,
      phase: paused ? 'paused' : 'running',
      workoutId,
      userId,
      startedAtISO,
      clock: clockRef.current,
      seconds,
      blocks,
      exercises,
      restTimer,
    });
  }, [
    activeSessionHydrated,
    authSession,
    blocks,
    exercises,
    paused,
    restTimer,
    sessionMode,
    sessionTitle,
    seconds,
    setActiveSession,
    sourceTemplateId,
    sourceTemplateName,
    startedAtISO,
    userId,
    workoutId,
  ]);

  async function resolveCurrentUserId() {
    if (userId) {
      return userId;
    }

    const uid = await ensureAuthedUserId();
    setUserId(uid);
    return uid;
  }

  async function loadPreviousSessionSetsForExercise(params: {
    userId: string;
    exerciseId: string;
  }) {
    let previousSessionSets = previousSessionSetsCacheRef.current[params.exerciseId];
    if (previousSessionSets !== undefined) {
      return previousSessionSets;
    }

    previousSessionSets = await getPreviousSessionStrengthSets({
      userId: params.userId,
      exerciseId: params.exerciseId,
    }).catch((error) => {
      console.warn('[StrengthTrain] failed to load previous session sets', {
        exerciseId: params.exerciseId,
        error,
      });
      return [];
    });

    previousSessionSetsCacheRef.current[params.exerciseId] = previousSessionSets;
    return previousSessionSets;
  }

  async function buildExerciseDraftFromHistory(
    ex: { id: string; exercise_name: string },
    roundCount?: number,
    roundCountMode: 'at_least_previous' | 'exact' = 'at_least_previous',
    explicitUserId?: string
  ) {
    const effectiveUserId = explicitUserId ?? (await resolveCurrentUserId());
    const previousSessionSets = await loadPreviousSessionSetsForExercise({
      userId: effectiveUserId,
      exerciseId: ex.id,
    });

    return createExerciseDraft({
      exerciseId: ex.id,
      exerciseName: ex.exercise_name,
      weightUnit,
      previousSessionSets,
      roundCount,
      roundCountMode,
    });
  }

  async function buildBlocksFromTemplate(
    template: StrengthWorkoutTemplate,
    templateUserId?: string
  ) {
    return Promise.all(
      template.blocks.map(async (block) => {
        if (block.kind === 'superset') {
          const rawDrafts = await Promise.all(
            block.exercises.map((exercise) =>
              buildExerciseDraftFromHistory(
                {
                  id: exercise.exerciseId,
                  exercise_name: exercise.exerciseName,
                },
                exercise.targetSetCount,
                'exact',
                templateUserId
              )
            )
          );

          const roundCount = Math.max(
            1,
            ...rawDrafts.map((exercise) => exercise.sets.length)
          );

          return createSupersetBlock({
            restSeconds: block.restIntervalSeconds ?? restTimerPreferenceSeconds,
            exercises: rawDrafts.map((exercise) =>
              padExerciseRoundsToCount(exercise, roundCount, weightUnit)
            ),
          });
        }

        const templateExercise = block.exercises[0];
        const exerciseDraft = await buildExerciseDraftFromHistory(
          {
            id: templateExercise.exerciseId,
            exercise_name: templateExercise.exerciseName,
          },
          templateExercise.targetSetCount,
          'exact',
          templateUserId
        );

        return createExerciseBlock(exerciseDraft);
      })
    );
  }

  const addExercise = async (ex: { id: string; exercise_name: string }) => {
    try {
      const exercise = await buildExerciseDraftFromHistory(ex);
      shouldScrollToNewExerciseRef.current = true;
      setBlocks((prev) => [...prev, createExerciseBlock(exercise)]);
    } catch (error: any) {
      console.error('[StrengthTrain] add exercise failed', error);
      Alert.alert(
        'Could not add exercise',
        error?.message ?? 'Something went wrong while loading your previous session.'
      );
    }
  };

  const addSuperset = async (payload: {
    exercises: { id: string; exercise_name: string }[];
  }) => {
    try {
      const rawDrafts = await Promise.all(
        payload.exercises.map((exercise) => buildExerciseDraftFromHistory(exercise))
      );
      const roundCount = Math.max(
        1,
        ...rawDrafts.map((exercise) =>
          Math.max(exercise.sets.length, exercise.previousSessionSets?.length ?? 0)
        )
      );
      const supersetBlock = createSupersetBlock({
        restSeconds: restTimerPreferenceSeconds,
        exercises: rawDrafts.map((exercise) =>
          padExerciseRoundsToCount(exercise, roundCount, weightUnit)
        ),
      });

      shouldScrollToNewExerciseRef.current = true;
      setBlocks((prev) => [...prev, supersetBlock]);
      setSupersetBuilderOpen(false);
    } catch (error: any) {
      console.error('[StrengthTrain] add superset failed', error);
      Alert.alert(
        'Could not create superset',
        error?.message ?? 'Something went wrong while building your superset.'
      );
    }
  };

  const removeExerciseBlock = (blockId: string, exerciseInstanceId: string) => {
    setBlocks((prev) => prev.filter((block) => block.id !== blockId));
    clearRestTimerForOwner('exercise', exerciseInstanceId);
  };

  const removeSupersetBlock = (blockId: string) => {
    setBlocks((prev) => prev.filter((block) => block.id !== blockId));
    clearRestTimerForOwner('superset', blockId);
  };

  const updateExerciseBlock = (
    blockId: string,
    updater: (draft: ExerciseDraft) => ExerciseDraft
  ) => {
    setBlocks((prev) =>
      prev.map((block) =>
        block.id === blockId && block.kind === 'exercise'
          ? {
              ...block,
              exercise: updater(block.exercise),
            }
          : block
      )
    );
  };

  const updateSupersetBlock = (
    blockId: string,
    updater: (block: SupersetBlockDraft) => SupersetBlockDraft
  ) => {
    setBlocks((prev) =>
      prev.map((block) =>
        block.id === blockId && block.kind === 'superset' ? updater(block) : block
      )
    );
  };

  const totalVolumeKg = useMemo(() => {
    let volume = 0;
    for (const exercise of exercises) {
      for (const setDraft of exercise.sets) {
        volume += toKgWeight(setDraft.weight, setDraft.weight_unit_csv) * (setDraft.reps ?? 0);
      }
    }
    return volume;
  }, [exercises]);

  const stopPersistingStrengthSession = async () => {
    sessionExitRef.current = true;
    sessionPersistEnabledRef.current = false;
    clearActiveSession();
    try {
      await clearActiveRunWalkSession();
    } catch (error) {
      console.warn('[StrengthTrain] failed to clear persisted session', error);
    }
  };

  const discardStrengthSession = async () => {
    try {
      await ensureAuthedUserId();

      if (workoutId) {
        await supabase
          .schema('strength')
          .from('strength_workouts')
          .delete()
          .eq('id', workoutId);
      }
    } catch (e) {
      console.warn('[StrengthTrain] discard delete failed', e);
    }

    await stopPersistingStrengthSession();
    resetStrengthComposerState();
    setCancelModalOpen(false);
    router.replace(HOME_ROUTE);
  };

  const handleCancel = () => {
    cancelPromptWasRunningRef.current = !paused;
    if (!paused) {
      pauseStrengthSession();
    }
    setCancelModalOpen(true);
  };

  const handleFinish = async () => {
    if (!workoutId) return;

    if (blocks.length === 0) {
      setFinishModalOpen(false);
      setTimeout(() => setExerciseRequiredOpen(true), 10);
      return;
    }

    setLoading(true);
    try {
      syncSecondsFromClock(Date.now(), paused ? 'paused' : 'running');
      const uid = await ensureAuthedUserId();
      if (uid !== userId) setUserId(uid);

      let effectiveWorkoutId = workoutId;
      let effectiveStartedAtISO = startedAtISO;

      let wRow = await getStrengthWorkoutRow(effectiveWorkoutId);
      console.log('[HealthDebug] strength workout ownership check', {
        workoutId: effectiveWorkoutId,
        uid,
        wRow: wRow ?? null,
      });
      if (!wRow) {
        console.warn('[HealthDebug] workout row missing before save, creating replacement row', {
          workoutId: effectiveWorkoutId,
          startedAtISO: effectiveStartedAtISO,
        });

        wRow = await createStrengthWorkoutRow({
          userId: uid,
          startedAtISO: effectiveStartedAtISO,
        });

        effectiveWorkoutId = wRow.id;
        effectiveStartedAtISO = wRow.started_at ?? effectiveStartedAtISO ?? null;

        setWorkoutId(effectiveWorkoutId);
        setStartedAtISO(effectiveStartedAtISO);
      }
      if (!wRow?.user_id || wRow.user_id !== uid) {
        throw new Error('Workout ownership mismatch. Please sign in again.');
      }

      let supersetOrdinal = 0;
      const blockPayload = blocks.map((block, index) => {
        const label =
          block.kind === 'superset'
            ? getSupersetLabel(supersetOrdinal++)
            : block.exercise.exercise_name;

        return {
          strength_workout_id: effectiveWorkoutId,
          block_kind: block.kind,
          sequence_index: index + 1,
          label,
          rest_interval_seconds: block.kind === 'superset' ? block.restSeconds : null,
          configuration:
            block.kind === 'superset'
              ? {
                  exercise_count: block.exercises.length,
                  round_count: getSupersetRoundCount(block),
                }
              : {
                  exercise_count: 1,
                },
        };
      });

      const { data: insertedBlocks, error: blocksErr } = await supabase
        .schema('strength')
        .from('workout_blocks')
        .insert(blockPayload)
        .select('id, block_kind, sequence_index, rest_interval_seconds, label');

      if (blocksErr) throw blocksErr;

      const workoutBlocksBySequence = new Map<number, WorkoutBlockRow>(
        ((insertedBlocks ?? []) as WorkoutBlockRow[]).map((row) => [row.sequence_index, row])
      );

      const blockExercisePayload = blocks.flatMap((block, blockIndex) => {
        const insertedBlock = workoutBlocksBySequence.get(blockIndex + 1);
        if (!insertedBlock) {
          return [];
        }

        const blockExercises = block.kind === 'superset' ? block.exercises : [block.exercise];
        return blockExercises.map((exercise, exerciseOrder) => ({
          workout_block_id: insertedBlock.id,
          exercise_id: exercise.exercise_id,
          exercise_order: exerciseOrder + 1,
        }));
      });

      const { data: insertedBlockExercises, error: blockExercisesErr } = await supabase
        .schema('strength')
        .from('workout_block_exercises')
        .insert(blockExercisePayload)
        .select('id, workout_block_id, exercise_id, exercise_order');

      if (blockExercisesErr) throw blockExercisesErr;

      const blockExerciseByKey = new Map<string, WorkoutBlockExerciseRow>(
        ((insertedBlockExercises ?? []) as WorkoutBlockExerciseRow[]).map((row) => [
          `${row.workout_block_id}:${row.exercise_order}`,
          row,
        ])
      );

      const structuredSetPayload = blocks.flatMap((block, blockIndex) => {
        const insertedBlock = workoutBlocksBySequence.get(blockIndex + 1);
        if (!insertedBlock) {
          return [];
        }

        const blockExercises = block.kind === 'superset' ? block.exercises : [block.exercise];
        return blockExercises.flatMap((exercise, exerciseOrder) => {
          const blockExercise = blockExerciseByKey.get(
            `${insertedBlock.id}:${exerciseOrder + 1}`
          );

          return exercise.sets.map((setDraft) => ({
            exercise_id: exercise.exercise_id,
            strength_workout_id: effectiveWorkoutId,
            set_index: setDraft.set_index,
            set_type: setDraft.set_type,
            superset_group:
              block.kind === 'superset' ? insertedBlock.sequence_index : null,
            weight: setDraft.weight ?? null,
            weight_unit_csv: setDraft.weight_unit_csv,
            reps: setDraft.reps ?? null,
            rpe: setDraft.rpe ?? null,
            est_1rm: setDraft.est_1rm ?? null,
            notes: setDraft.notes ?? null,
            workout_block_id: insertedBlock.id,
            workout_block_exercise_id: blockExercise?.id ?? null,
            block_round_index: setDraft.set_index,
          }));
        });
      });

      if (structuredSetPayload.length > 0) {
        const { error: setsErr } = await supabase
          .schema('strength')
          .from('strength_sets')
          .insert(structuredSetPayload);

        if (setsErr) throw setsErr;
      }

      type SummaryRow = {
        exercise_id: string;
        vol: number;
        strongest_set: number;
        best_est_1rm: number;
        avg_set: number;
      };

      const summaries: SummaryRow[] = exercises.map((exercise) => {
        const weightsKg = exercise.sets.map((setDraft) =>
          toKgWeight(setDraft.weight, setDraft.weight_unit_csv)
        );
        const reps = exercise.sets.map((setDraft) => setDraft.reps ?? 0);
        const vols = exercise.sets.map((_, i) => weightsKg[i] * reps[i]);
        const vol = vols.reduce((a, b) => a + b, 0);
        const strongest = weightsKg.reduce((a, b) => (b > a ? b : a), 0);
        const best1rm = exercise.sets.reduce(
          (a, setDraft) => Math.max(a, setDraft.est_1rm ?? 0),
          0
        );
        const weightMean =
          weightsKg.length > 0
            ? weightsKg.reduce((a, b) => a + b, 0) / weightsKg.length
            : 0;

        return {
          exercise_id: exercise.exercise_id,
          vol: +vol.toFixed(2),
          strongest_set: +strongest.toFixed(3),
          best_est_1rm: +best1rm.toFixed(3),
          avg_set: +weightMean.toFixed(3),
        };
      });

      const summaryPayload = summaries.map((summary) => ({
        user_id: uid,
        exercise_id: summary.exercise_id,
        strength_workout_id: effectiveWorkoutId,
        vol: summary.vol,
        strongest_set: summary.strongest_set,
        best_est_1rm: summary.best_est_1rm,
        avg_set: summary.avg_set,
      }));

      if (summaryPayload.length > 0) {
        const { error: sumErr } = await supabase
          .schema('strength')
          .from('exercise_summary')
          .insert(summaryPayload);

        if (sumErr) throw sumErr;
      }

      const endedAt = new Date();
      const totalVol = +totalVolumeKg.toFixed(2);

      const { error: workoutErr } = await supabase
        .schema('strength')
        .from('strength_workouts')
        .update({ ended_at: endedAt.toISOString(), total_vol: totalVol })
        .eq('id', effectiveWorkoutId);

      if (workoutErr) throw workoutErr;

      await stopPersistingStrengthSession();
      resetStrengthComposerState();
      router.replace({
        pathname: '/(tabs)/add/Strength/[id]',
        params: {
          id: effectiveWorkoutId,
          autoHeartRateSync: '1',
          sessionMode,
          templateId:
            sessionMode === 'template' && sourceTemplateId ? sourceTemplateId : undefined,
        },
      });
    } catch (err: any) {
      console.error('[StrengthTrain] finish failed', err);

      if (err?.code === '42501') {
        Alert.alert(
          'Save failed',
          'Permissions error while saving sets. Your session may have expired. Please sign in again and retry.'
        );
        return;
      }

      Alert.alert('Save failed', err?.message ?? 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !workoutId) {
    return (
      <View style={styles.page}>
        <View style={styles.loadingState}>
          <ActivityIndicator size="small" color={colors.highlight1} />
          <Text style={styles.loadingText}>Preparing your session…</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.page}>
      <View style={[globalStyles.container, styles.screen]}>
        <LogoHeader showBackButton />

        <View style={styles.staticTop}>
          <SessionHeader
            key={workoutId}
            title={sessionTitle}
            paused={paused}
            seconds={seconds}
            onPauseToggle={() => {
              if (paused) {
                resumeStrengthSession();
                return;
              }
              pauseStrengthSession();
            }}
            onCancel={handleCancel}
          />
          <StrengthSessionActionsRow
            onOpenSuperset={() => setSupersetBuilderOpen(true)}
            onOpenExercisePicker={() => setPickerOpen(true)}
          />
        </View>

        <ScrollView
          ref={exerciseScrollRef}
          style={styles.exerciseScroll}
          contentContainerStyle={styles.exerciseListContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => {
            if (!shouldScrollToNewExerciseRef.current) return;

            requestAnimationFrame(() => {
              exerciseScrollRef.current?.scrollToEnd({ animated: true });
              shouldScrollToNewExerciseRef.current = false;
            });
          }}
        >
          <StrengthBlocksList
            blocks={blocks}
            restTimer={restTimer}
            onRemoveSuperset={removeSupersetBlock}
            onUpdateSuperset={(blockId, updated) =>
              updateSupersetBlock(blockId, () => updated)
            }
            onStartSupersetRest={startRestTimerForSuperset}
            onPauseRest={pauseCurrentRestTimer}
            onResumeRest={resumeCurrentRestTimer}
            onResetSupersetRest={resetSupersetRestTimer}
            onClearSupersetRest={(supersetId) =>
              clearRestTimerForOwner('superset', supersetId)
            }
            onRemoveExercise={removeExerciseBlock}
            onUpdateExercise={(blockId, updated) =>
              updateExerciseBlock(blockId, () => updated)
            }
            onSetCompleted={startRestTimerForExercise}
          />
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 8) }]}>
          <TouchableOpacity
            activeOpacity={0.92}
            style={[styles.buttonPrimary, styles.finishBtn, loading ? styles.finishBtnBusy : null]}
            disabled={loading}
            onPress={() => setFinishModalOpen(true)}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.blkText} />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={18} color={colors.blkText} />
                <Text style={styles.buttonTextPrimary}>Finish workout</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <ExercisePickerModal
          visible={pickerOpen}
          onClose={() => setPickerOpen(false)}
          onPick={(exercise) => {
            setPickerOpen(false);
            void addExercise(exercise);
          }}
        />

        <SupersetBuilderModal
          visible={supersetBuilderOpen}
          onClose={() => setSupersetBuilderOpen(false)}
          onCreate={(payload) => {
            void addSuperset(payload);
          }}
        />

        <CancelConfirmModal
          visible={cancelModalOpen}
          onKeep={() => {
            setCancelModalOpen(false);
            if (cancelPromptWasRunningRef.current) {
              resumeStrengthSession();
            }
          }}
          onDiscard={discardStrengthSession}
        />

        <ExerciseRequiredModal
          visible={exerciseRequiredOpen}
          onClose={() => setExerciseRequiredOpen(false)}
        />

        <FinishConfirmModal
          visible={finishModalOpen}
          onCancel={() => setFinishModalOpen(false)}
          onConfirm={async () => {
            setFinishModalOpen(false);
            await handleFinish();
          }}
        />
      </View>
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
    screen: {
      flex: 1,
      paddingBottom: 0,
    },
    staticTop: {
      paddingBottom: 10,
    },
    exerciseScroll: {
      flex: 1,
    },
    exerciseListContent: {
      paddingBottom: 12,
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
    buttonTextPrimary: {
      color: colors.blkText,
      fontFamily: fonts.heading,
      fontSize: 14,
      lineHeight: 18,
    },
    loadingState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      paddingHorizontal: 24,
    },
    loadingText: {
      color: HOME_TONES.textSecondary,
      fontFamily: fonts.body,
      fontSize: 14,
      lineHeight: 20,
    },
    footer: {
      paddingTop: 10,
    },
    finishBtn: {
      minHeight: 54,
      flexDirection: 'row',
      gap: 10,
    },
    finishBtnBusy: {
      opacity: 0.82,
    },
  });
}
