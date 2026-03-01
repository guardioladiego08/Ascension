import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BottomSheet from '@gorhom/bottom-sheet';

import { Colors } from '@/constants/Colors';
import { useUnits } from '@/contexts/UnitsContext';
import {
  getActiveRunWalkSession,
  setActiveRunWalkSession,
  type ActiveRunWalkSession,
} from '@/lib/activeRunWalkSessionStore';
import { formatDistance, formatDuration } from '@/lib/OutdoorSession/outdoorUtils';

type ActiveRunWalkContextType = {
  activeSession: ActiveRunWalkSession | null;
  hydrated: boolean;
  setSession: (session: ActiveRunWalkSession | null) => void;
  clearSession: () => void;
};

const ActiveRunWalkContext = createContext<ActiveRunWalkContextType | undefined>(undefined);

export function ActiveRunWalkProvider({ children }: { children: React.ReactNode }) {
  const [activeSession, setActiveSessionState] = useState<ActiveRunWalkSession | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const stored = await getActiveRunWalkSession();
        if (!mounted) return;
        setActiveSessionState(stored);
      } finally {
        if (mounted) setHydrated(true);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const setSession = useCallback((session: ActiveRunWalkSession | null) => {
    setActiveSessionState(session);
    setActiveRunWalkSession(session).catch(() => null);
  }, []);

  const clearSession = useCallback(() => {
    setActiveSessionState(null);
    setActiveRunWalkSession(null).catch(() => null);
  }, []);

  const value = useMemo(
    () => ({
      activeSession,
      hydrated,
      setSession,
      clearSession,
    }),
    [activeSession, clearSession, hydrated, setSession]
  );

  return (
    <ActiveRunWalkContext.Provider value={value}>
      {children}
      <ActiveRunWalkResumeSheet />
    </ActiveRunWalkContext.Provider>
  );
}

export function useActiveRunWalk() {
  const ctx = useContext(ActiveRunWalkContext);
  if (!ctx) throw new Error('useActiveRunWalk must be used within ActiveRunWalkProvider');
  return ctx;
}

function ActiveRunWalkResumeSheet() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { distanceUnit } = useUnits();
  const { activeSession, hydrated } = useActiveRunWalk();
  const sheetRef = useRef<BottomSheet>(null);
  const [sheetIndex, setSheetIndex] = useState(0);
  const snapPoints = useMemo(() => [112, 324], []);

  const isIndoorScreen = pathname.includes('/add/Cardio/indoor/IndoorSession');
  const isOutdoorScreen = pathname.includes('/add/Cardio/outdoor/OutdoorSession');
  const isStrengthScreen = pathname.includes('/add/Strength/StrengthTrain');
  const onCurrentSessionScreen =
    !!activeSession &&
    ((activeSession.kind === 'indoor' && isIndoorScreen) ||
      (activeSession.kind === 'outdoor' && isOutdoorScreen) ||
      (activeSession.kind === 'strength' && isStrengthScreen));
  const shouldHideSheet = !hydrated || !activeSession || onCurrentSessionScreen;

  useEffect(() => {
    if (shouldHideSheet) return;
    setSheetIndex(0);
    requestAnimationFrame(() => {
      sheetRef.current?.snapToIndex(0);
    });
  }, [activeSession, shouldHideSheet]);

  if (shouldHideSheet || !activeSession) {
    return null;
  }

  const isOutdoor = activeSession.kind === 'outdoor';
  const isStrength = activeSession.kind === 'strength';
  const elapsed = isStrength
    ? activeSession.seconds
    : isOutdoor
      ? activeSession.elapsedSeconds
      : activeSession.elapsedS;
  const distance = isStrength
    ? null
    : isOutdoor
      ? activeSession.distanceMeters
      : activeSession.distanceM;
  const statusText = activeSession.phase === 'running' ? 'Live session' : 'Paused session';
  const strengthSetCount = isStrength
    ? activeSession.exercises.reduce((count, exercise) => count + exercise.sets.length, 0)
    : 0;
  const activityLabel = isStrength
    ? 'Strength Workout'
    : activeSession.kind === 'outdoor'
      ? activeSession.mode === 'outdoor_walk'
        ? 'Outdoor Walk'
        : 'Outdoor Run'
      : activeSession.mode === 'indoor_walk'
        ? 'Indoor Walk'
        : 'Indoor Run';
  const sessionIcon = isStrength
    ? 'barbell-outline'
    : activeSession.kind === 'outdoor'
      ? 'map-outline'
      : 'walk-outline';

  const openActiveSession = () => {
    if (activeSession.kind === 'indoor') {
      router.push({
        pathname: '/add/Cardio/indoor/IndoorSession',
        params: { mode: activeSession.mode },
      });
      return;
    }

    if (activeSession.kind === 'outdoor') {
      router.push({
        pathname: '/add/Cardio/outdoor/OutdoorSession',
        params: {
          title: activeSession.title,
          activityType: activeSession.mode === 'outdoor_walk' ? 'walk' : 'run',
        },
      });
      return;
    }

    router.push('/add/Strength/StrengthTrain');
  };

  return (
    <View pointerEvents="box-none" style={styles.overlay}>
      <BottomSheet
        ref={sheetRef}
        index={0}
        snapPoints={snapPoints}
        detached
        bottomInset={Math.max(insets.bottom + 74, 90)}
        enablePanDownToClose={false}
        enableOverDrag={false}
        onChange={setSheetIndex}
        style={styles.sheet}
        handleIndicatorStyle={styles.handle}
        backgroundStyle={styles.sheetBackground}
      >
        <View style={styles.sheetContent}>
          <View style={styles.peekRow}>
            <View style={styles.peekLeft}>
              <View style={styles.iconWrap}>
                <Ionicons name={sessionIcon} size={18} color={ACCENT} />
              </View>

              <View style={styles.peekCopy}>
                <Text style={styles.kicker}>{statusText.toUpperCase()}</Text>
                <Text style={styles.title}>{activeSession.title}</Text>
                <Text style={styles.peekSubtitle}>{activityLabel}</Text>
              </View>
            </View>

            <View style={styles.peekRight}>
              <Text style={styles.peekTimer}>{formatDuration(elapsed)}</Text>
              <Pressable style={styles.openPill} onPress={openActiveSession}>
                <Ionicons name="arrow-up" size={15} color="#0E151F" />
                <Text style={styles.openPillText}>Resume</Text>
              </Pressable>
            </View>
          </View>

          {sheetIndex > 0 ? (
            <>
              <View style={styles.metricsRow}>
                <MiniStat label="Time" value={formatDuration(elapsed)} />
                {isStrength ? (
                  <MiniStat label="Exercises" value={String(activeSession.exercises.length)} />
                ) : (
                  <MiniStat label="Distance" value={formatDistance(distance ?? 0, distanceUnit)} />
                )}
                <MiniStat
                  label={isStrength ? 'Sets' : 'Status'}
                  value={
                    isStrength
                      ? String(strengthSetCount)
                      : activeSession.phase === 'running'
                        ? 'Running'
                        : 'Paused'
                  }
                />
              </View>

              <View style={styles.body}>
                <Text style={styles.bodyTitle}>Session in progress</Text>
                <Text style={styles.bodyText}>
                  {isStrength
                    ? 'Your strength workout stays ready while you move through the app. Drag down to minimize or tap Resume to jump back into the workout.'
                    : 'Your cardio session is still available while you browse the app. Drag down to minimize or tap Resume to return to the timer and controls.'}
                </Text>

                {isStrength ? (
                  <View style={styles.listWrap}>
                    {activeSession.exercises.slice(0, 3).map((exercise) => (
                      <View key={exercise.instanceId} style={styles.listRow}>
                        <Text style={styles.listName}>{exercise.exercise_name}</Text>
                        <Text style={styles.listValue}>{exercise.sets.length} sets</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={styles.listWrap}>
                    <View style={styles.listRow}>
                      <Text style={styles.listName}>Session type</Text>
                      <Text style={styles.listValue}>{activityLabel}</Text>
                    </View>
                    <View style={styles.listRow}>
                      <Text style={styles.listName}>Current state</Text>
                      <Text style={styles.listValue}>
                        {activeSession.phase === 'running' ? 'Tracking' : 'Paused'}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            </>
          ) : null}
        </View>
      </BottomSheet>
    </View>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const CARD = Colors.dark.card;
const TEXT = Colors.dark.text;
const MUTED = Colors.dark.textMuted ?? '#9AA4BF';
const ACCENT = Colors.dark.highlight1;

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 40,
    pointerEvents: 'box-none',
  },
  sheet: {
    marginHorizontal: 14,
  },
  sheetBackground: {
    backgroundColor: CARD,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  sheetContent: {
    paddingHorizontal: 16,
    paddingBottom: 18,
  },
  peekRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 72,
  },
  peekLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  peekCopy: {
    flex: 1,
    minWidth: 0,
  },
  peekRight: {
    alignItems: 'flex-end',
    marginLeft: 12,
  },
  peekTimer: {
    color: TEXT,
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 8,
  },
  peekSubtitle: {
    color: MUTED,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 3,
  },
  handle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)',
    marginBottom: 10,
  },
  kicker: {
    color: MUTED,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  title: {
    color: TEXT,
    fontSize: 18,
    fontWeight: '900',
    marginTop: 4,
  },
  openPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: ACCENT,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  openPillText: {
    color: '#0E151F',
    fontSize: 12,
    fontWeight: '900',
  },
  body: {
    marginTop: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    padding: 14,
  },
  bodyTitle: {
    color: TEXT,
    fontSize: 13,
    fontWeight: '900',
  },
  bodyText: {
    color: MUTED,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 18,
    marginTop: 8,
  },
  listWrap: {
    marginTop: 12,
    gap: 8,
  },
  listRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listName: {
    color: TEXT,
    fontSize: 12,
    fontWeight: '800',
  },
  listValue: {
    color: MUTED,
    fontSize: 12,
    fontWeight: '700',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  statLabel: {
    color: MUTED,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  statValue: {
    color: TEXT,
    fontSize: 13,
    fontWeight: '900',
    marginTop: 6,
  },
});
