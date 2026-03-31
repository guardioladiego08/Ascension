import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { withAlpha } from '@/constants/Colors';
import {
  getActiveRunWalkSession,
  setActiveRunWalkSession,
  type ActiveRunWalkSession,
} from '@/lib/activeRunWalkSessionStore';
import {
  getActiveSessionActivityLabel,
  getActiveSessionElapsedSeconds,
  getActiveSessionIconName,
  getActiveSessionStatusText,
} from '@/lib/activeRunWalkSessionUi';
import { formatDuration } from '@/lib/OutdoorSession/outdoorUtils';
import { getRunWalkElapsedSeconds } from '@/lib/runWalkSessionClock';
import { useAppTheme } from '@/providers/AppThemeProvider';

type ActiveRunWalkContextType = {
  activeSession: ActiveRunWalkSession | null;
  hydrated: boolean;
  setSession: (session: ActiveRunWalkSession | null) => void;
  clearSession: () => void;
};

const ActiveRunWalkContext = createContext<ActiveRunWalkContextType | undefined>(undefined);

function refreshActiveSessionTiming(
  session: ActiveRunWalkSession | null,
  nowMs = Date.now()
): ActiveRunWalkSession | null {
  if (!session || session.phase !== 'running' || !session.clock) {
    return session;
  }

  const nextElapsed = getRunWalkElapsedSeconds(session.clock, nowMs);

  if (session.kind === 'outdoor') {
    return nextElapsed === session.elapsedSeconds
      ? session
      : { ...session, elapsedSeconds: nextElapsed };
  }

  if (session.kind === 'indoor') {
    return nextElapsed === session.elapsedS
      ? session
      : { ...session, elapsedS: nextElapsed };
  }

  return nextElapsed === session.seconds
    ? session
    : { ...session, seconds: nextElapsed };
}

export function ActiveRunWalkProvider({ children }: { children: React.ReactNode }) {
  const [activeSession, setActiveSessionState] = useState<ActiveRunWalkSession | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const loadStoredSession = useCallback(async () => {
    const stored = await getActiveRunWalkSession();
    const refreshed = refreshActiveSessionTiming(stored);
    setActiveSessionState(refreshed);

    if (refreshed !== stored) {
      await setActiveRunWalkSession(refreshed);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const stored = await getActiveRunWalkSession();
        const refreshed = refreshActiveSessionTiming(stored);
        if (!mounted) return;
        setActiveSessionState(refreshed);
        if (refreshed !== stored) {
          await setActiveRunWalkSession(refreshed);
        }
      } finally {
        if (mounted) setHydrated(true);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') return;

      loadStoredSession().catch(() => null);
    });

    return () => {
      subscription.remove();
    };
  }, [loadStoredSession]);

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
      <ActiveRunWalkResumeBanner />
    </ActiveRunWalkContext.Provider>
  );
}

export function useActiveRunWalk() {
  const ctx = useContext(ActiveRunWalkContext);
  if (!ctx) throw new Error('useActiveRunWalk must be used within ActiveRunWalkProvider');
  return ctx;
}

function ActiveRunWalkResumeBanner() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { colors, fonts } = useAppTheme();
  const { activeSession, hydrated } = useActiveRunWalk();
  const [nowMs, setNowMs] = useState(() => Date.now());
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);
  const sessionTickKey =
    activeSession?.kind === 'strength' ? activeSession.workoutId : activeSession?.mode;

  const isIndoorScreen = pathname.includes('/add/Cardio/indoor/IndoorSession');
  const isOutdoorScreen = pathname.includes('/add/Cardio/outdoor/OutdoorSession');
  const isStrengthScreen = pathname.includes('/add/Strength/StrengthTrain');
  const onCurrentSessionScreen =
    !!activeSession &&
    ((activeSession.kind === 'indoor' && isIndoorScreen) ||
      (activeSession.kind === 'outdoor' && isOutdoorScreen) ||
      (activeSession.kind === 'strength' && isStrengthScreen));
  const shouldHideBanner = !hydrated || !activeSession || onCurrentSessionScreen;

  useEffect(() => {
    if (!activeSession || activeSession.phase !== 'running' || !activeSession.clock) {
      return;
    }

    setNowMs(Date.now());
    const intervalId = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [activeSession?.clock?.runningStartedAtISO, activeSession?.phase, sessionTickKey]);

  if (shouldHideBanner || !activeSession) {
    return null;
  }

  const elapsed = getActiveSessionElapsedSeconds(activeSession, nowMs);
  const statusText = getActiveSessionStatusText(activeSession);
  const activityLabel = getActiveSessionActivityLabel(activeSession);
  const sessionIcon = getActiveSessionIconName(activeSession);
  const strengthSetCount =
    activeSession.kind === 'strength'
      ? activeSession.exercises.reduce((count, exercise) => count + exercise.sets.length, 0)
      : 0;
  const accentColor =
    activeSession.kind === 'strength' ? colors.highlight1 : colors.highlight2;
  const titleText = activeSession.title?.trim() || activityLabel;
  const detailText = getResumeBannerDetail(
    activeSession,
    activityLabel,
    titleText,
    strengthSetCount
  );

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
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Resume ${activityLabel}`}
        onPress={openActiveSession}
        style={[
          styles.banner,
          {
            bottom: Math.max(insets.bottom + 54, 64),
            borderColor: withAlpha(accentColor, 0.32),
          },
        ]}
      >
        <View style={styles.bannerLeading}>
          <View style={[styles.iconWrap, { backgroundColor: withAlpha(accentColor, 0.14) }]}>
            <Ionicons name={sessionIcon} size={20} color={accentColor} />
          </View>

          <View style={styles.copy}>
            <Text style={[styles.kicker, { color: accentColor }]}>{statusText.toUpperCase()}</Text>
            <Text numberOfLines={1} style={styles.title}>
              {titleText}
            </Text>
            <Text numberOfLines={1} style={styles.subtitle}>
              {detailText}
            </Text>
          </View>
        </View>

        <View style={styles.bannerTrailing}>
          <Text style={styles.timer}>{formatDuration(elapsed)}</Text>
          <View style={styles.resumePill}>
            <Text style={styles.resumePillText}>Resume</Text>
            <Ionicons name="arrow-up" size={14} color={colors.text} />
          </View>
        </View>
      </Pressable>
    </View>
  );
}

function getResumeBannerDetail(
  session: ActiveRunWalkSession,
  activityLabel: string,
  titleText: string,
  strengthSetCount: number
) {
  if (session.kind === 'strength') {
    return strengthSetCount > 0
      ? `${strengthSetCount} logged set${strengthSetCount === 1 ? '' : 's'}`
      : 'Tap to return to your workout';
  }

  if (titleText.toLowerCase() !== activityLabel.toLowerCase()) {
    return activityLabel;
  }

  return session.phase === 'running' ? 'Tracking in the background' : 'Session paused';
}

function createStyles(
  colors: ReturnType<typeof useAppTheme>['colors'],
  fonts: ReturnType<typeof useAppTheme>['fonts']
) {
  return StyleSheet.create({
    overlay: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 40,
      pointerEvents: 'box-none',
    },
    banner: {
      position: 'absolute',
      left: 12,
      right: 12,
      minHeight: 82,
      borderRadius: 22,
      borderWidth: 1,
      backgroundColor: 'rgba(11, 16, 24, 0.97)',
      paddingHorizontal: 16,
      paddingVertical: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 16 },
      shadowOpacity: 0.28,
      shadowRadius: 22,
      elevation: 16,
      gap: 14,
    },
    bannerLeading: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      minWidth: 0,
    },
    iconWrap: {
      width: 48,
      height: 48,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    copy: {
      flex: 1,
      minWidth: 0,
    },
    kicker: {
      fontFamily: fonts.label,
      fontSize: 10,
      lineHeight: 12,
      letterSpacing: 1.1,
      textTransform: 'uppercase',
    },
    title: {
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 18,
      lineHeight: 22,
      marginTop: 4,
    },
    subtitle: {
      color: colors.textMuted ?? '#9AA4BF',
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 17,
      marginTop: 4,
    },
    bannerTrailing: {
      alignItems: 'flex-end',
      justifyContent: 'center',
      flexShrink: 0,
      marginLeft: 8,
    },
    timer: {
      color: colors.text,
      fontFamily: fonts.display,
      fontSize: 24,
      lineHeight: 28,
      letterSpacing: -0.8,
    },
    resumePill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 8,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: 'rgba(255,255,255,0.06)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.08)',
    },
    resumePillText: {
      color: colors.text,
      fontFamily: fonts.label,
      fontSize: 11,
      lineHeight: 14,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
  });
}
