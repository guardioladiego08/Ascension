import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
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
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUnits } from '@/contexts/UnitsContext';
import { useAppTheme } from '@/providers/AppThemeProvider';

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
import { useActiveRunWalk } from '@/providers/ActiveRunWalkProvider';

const M_PER_MI = 1609.344;
const M_PER_KM = 1000;

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

function makeId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function IndoorSession() {
  const router = useRouter();
  const { colors, fonts, globalStyles } = useAppTheme();
  const params = useLocalSearchParams<{ mode?: string }>();
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

  const mode: Extract<Mode, 'indoor_run' | 'indoor_walk'> =
    params.mode === 'indoor_walk' ? 'indoor_walk' : 'indoor_run';

  const lockMode: RunWalkMode = mode; // same values for indoor

  const title = mode === 'indoor_walk' ? 'INDOOR WALK' : 'INDOOR RUN';
  const heroSubtitle = compact
    ? 'Treadmill controls, live pace, and a cleaner finish.'
    : 'Treadmill-style controls, live pace, and a cleaner finish flow.';

  // session state
  const [isRunning, setIsRunning] = useState(true);
  const [elapsedS, setElapsedS] = useState(0);

  // treadmill controls
  const defaultSpeed = useMemo(() => {
    if (distanceUnit === 'mi') return mode === 'indoor_walk' ? 3.2 : 6.0;
    return mode === 'indoor_walk' ? 5.0 : 10.0;
  }, [distanceUnit, mode]);

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

  // refs for interval accuracy (avoid stale closures)
  const elapsedRef = useRef(0);
  const distanceRef = useRef(0);
  const elevRef = useRef(0);
  const speedRef = useRef(0);
  const inclineRef = useRef(0);

  useEffect(() => { elapsedRef.current = elapsedS; }, [elapsedS]);
  useEffect(() => { distanceRef.current = distanceM; }, [distanceM]);
  useEffect(() => { elevRef.current = elevM; }, [elevM]);
  useEffect(() => { speedRef.current = speed; }, [speed]);
  useEffect(() => { inclineRef.current = inclineDeg; }, [inclineDeg]);

  const hasProgress = elapsedRef.current > 0 || distanceRef.current > 0;

  useEffect(() => {
    if (!activeSessionHydrated || hydrationAppliedRef.current) return;

    const existingSession =
      activeSession?.kind === 'indoor' && activeSession.mode === mode
        ? activeSession
        : null;

    if (existingSession) {
      const nextRunning = existingSession.phase === 'running';
      setIsRunning(nextRunning);
      setElapsedS(existingSession.elapsedS);
      setDistanceM(existingSession.distanceM);
      setElevM(existingSession.elevM);
      setSpeed(existingSession.speed);
      setInclineDeg(existingSession.inclineDeg);

      elapsedRef.current = existingSession.elapsedS;
      distanceRef.current = existingSession.distanceM;
      elevRef.current = existingSession.elevM;
      speedRef.current = existingSession.speed;
      inclineRef.current = existingSession.inclineDeg;

      samplesRef.current = existingSession.samples;
      seqRef.current = existingSession.samples[existingSession.samples.length - 1]?.seq ?? 0;
      sessionInitializedRef.current = true;
    }

    hydrationAppliedRef.current = true;
  }, [activeSession, activeSessionHydrated, mode]);

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
    distanceRef.current = 0;
    elevRef.current = 0;
    inclineRef.current = 0;
    speedRef.current = defaultSpeed;

    // samples
    seqRef.current = 0;
    samplesRef.current = [];

    // modals
    setShowFinishConfirm(false);
    setShowCancelConfirm(false);

    // IMPORTANT: re-prime running state if requested (fixes “next session starts paused”)
    setIsRunning(nextRunning);
  };

  /**
   * Global lock acquisition:
   * - If ANY run/walk session is active, block entry.
   * - This prevents "run while walk is in progress" and vice versa.
   */
  useEffect(() => {
    if (!activeSessionHydrated || !hydrationAppliedRef.current) return;
    let mounted = true;

    (async () => {
      try {
        if (activeSession?.kind === 'strength') {
          Alert.alert(
            'Session in progress',
            'You already have an active strength workout. Finish or cancel it before starting an indoor session.'
          );
          router.back();
          return;
        }

        const existing = await getActiveRunWalkLock();
        const resumingExisting =
          activeSession?.kind === 'indoor' && activeSession.mode === mode;
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
          router.back();
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
  }, [activeSession, activeSessionHydrated, lockMode, mode, router]);

  // keep speed aligned with unit/mode defaults
  useEffect(() => {
    if (!activeSessionHydrated) return;
    if (activeSession?.kind === 'indoor' && activeSession.mode === mode) return;
    setSpeed(defaultSpeed);
    speedRef.current = defaultSpeed;
  }, [activeSession, activeSessionHydrated, defaultSpeed, mode]);

  useEffect(() => {
    if (!activeSessionHydrated || !sessionInitializedRef.current) return;

    setActiveSession({
      kind: 'indoor',
      mode,
      title,
      phase: isRunning ? 'running' : 'paused',
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
    setActiveSession,
    speed,
    title,
  ]);

  // 1-second tick
  useEffect(() => {
    if (!isRunning) return;

    const timer = setInterval(() => {
      const nextElapsed = elapsedRef.current + 1;
      elapsedRef.current = nextElapsed;
      setElapsedS(nextElapsed);

      const speedMps = speedToMps(speedRef.current, distanceUnit);
      const deltaDist = speedMps * 1;
      const deltaElev = deltaDist * Math.sin(deg2rad(inclineRef.current));

      const nextDist = distanceRef.current + deltaDist;
      const nextElev = elevRef.current + deltaElev;

      distanceRef.current = nextDist;
      elevRef.current = nextElev;

      setDistanceM(nextDist);
      setElevM(nextElev);

      if (nextElapsed > 0 && nextElapsed % 10 === 0) {
        seqRef.current += 1;

        const paceMi = paceFromMps(speedMps, 'mi');
        const paceKm = paceFromMps(speedMps, 'km');

        samplesRef.current.push({
          seq: seqRef.current,
          elapsed_s: nextElapsed,
          distance_m: Number(nextDist.toFixed(2)),
          speed_mps: Number(speedMps.toFixed(6)),
          pace_s_per_km: Number.isFinite(paceKm) ? Number(paceKm.toFixed(2)) : null,
          pace_s_per_mi: Number.isFinite(paceMi) ? Number(paceMi.toFixed(2)) : null,
          incline_deg: Number(inclineRef.current.toFixed(2)),
          elevation_m: Number(nextElev.toFixed(2)),
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [isRunning, distanceUnit]);

  // UI helpers
  const distLabelUnit = distanceUnit === 'mi' ? 'MI' : 'KM';
  const speedLabelUnit = distanceUnit === 'mi' ? 'MPH' : 'KPH';
  const speedStep = distanceUnit === 'mi' ? 0.1 : 0.2;
  const inclineStep = 0.5;

  const displayDistance = mToDisplay(distanceM, distanceUnit);

  const avgSpeedMps = elapsedS > 0 ? distanceM / elapsedS : 0;
  const avgSpeedDisplay = distanceUnit === 'mi' ? avgSpeedMps * 2.236936 : avgSpeedMps * 3.6;

  const currentSpeedMps = speedToMps(speed, distanceUnit);
  const currentPace =
    distanceUnit === 'mi'
      ? formatPace(paceFromMps(currentSpeedMps, 'mi'), '/mi')
      : formatPace(paceFromMps(currentSpeedMps, 'km'), '/km');

  const avgPace =
    distanceUnit === 'mi'
      ? formatPace(paceFromMps(avgSpeedMps, 'mi'), '/mi')
      : formatPace(paceFromMps(avgSpeedMps, 'km'), '/km');

  const togglePause = () => setIsRunning((v) => !v);

  const requestCancel = () => {
    setIsRunning(false);
    setShowCancelConfirm(true);
  };

  const onBackPress = () => {
    if (hasProgress) {
      requestCancel();
      return;
    }
    // no progress: clear lock and exit
    clearActiveRunWalkLock().catch(() => null);
    clearActiveSession();
    sessionInitializedRef.current = false;
    router.back();
  };

  // Finish -> draft -> clear lock -> reset -> go summary
  const finishToSummary = async () => {
    setShowFinishConfirm(false);
    setIsRunning(false);

    const endedAt = new Date().toISOString();
    const totalTimeS = elapsedRef.current;
    const startedAt = new Date(
      new Date(endedAt).getTime() - totalTimeS * 1000
    ).toISOString();
    const totalDistM = distanceRef.current;
    const totalElevM = elevRef.current;

    const avgSpeedMpsFinal = totalTimeS > 0 ? totalDistM / totalTimeS : 0;
    const paceKm = totalDistM > 0 ? totalTimeS / (totalDistM / M_PER_KM) : null;
    const paceMi = totalDistM > 0 ? totalTimeS / (totalDistM / M_PER_MI) : null;

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
      samples: samplesRef.current,
    };

    try {
      await upsertDraft(draft);

      clearActiveSession();
      sessionInitializedRef.current = false;
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
      setIsRunning(true);
    }
  };

  // Cancel confirmed -> clear lock -> reset with running=true (fix next start) -> leave
  const confirmDiscardCancel = async () => {
    clearActiveSession();
    sessionInitializedRef.current = false;
    try {
      await clearActiveRunWalkLock();
    } catch {}

    // Reset and explicitly set nextRunning=true so this screen never “sticks” paused
    resetSessionState(true);
    router.back();
  };

  return (
    <LinearGradient
      colors={[colors.gradientTop, colors.gradientMid, colors.gradientBottom]}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={globalStyles.page}
    >
      <View style={[globalStyles.container, styles.safe]}>
        <View style={styles.brandHeader}>
          <Image
            source={require('../../../../../assets/images/TensrLogo.png')}
            style={styles.brandLogo}
            resizeMode="contain"
          />
        </View>

        <View style={[globalStyles.panel, styles.heroCard]}>
          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.iconBtn} onPress={onBackPress}>
              <Ionicons name="chevron-back" size={18} color={colors.text} />
            </TouchableOpacity>

            <View style={styles.headerCenter}>
              <Text style={globalStyles.eyebrow}>Indoor cardio</Text>
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

        <View style={[globalStyles.panelSoft, styles.centerBlock]}>
          <Text style={styles.centerBig}>
            {displayDistance.toFixed(2)}
            <Text style={styles.centerUnit}> {distLabelUnit}</Text>
          </Text>
          <Text style={styles.centerLabel}>Total distance</Text>

          <View style={styles.centerRow}>
            <View style={styles.centerMini}>
              <Text style={styles.centerMiniValue}>{currentPace}</Text>
              <Text style={styles.centerMiniLabel}>Current pace</Text>
            </View>

            <View style={styles.centerMini}>
              <Text style={styles.centerMiniValue}>{avgPace}</Text>
              <Text style={styles.centerMiniLabel}>Average pace</Text>
            </View>
          </View>
        </View>

        <View style={styles.controls}>
          <View style={styles.controlRow}>
            <Pressable
              style={[styles.controlBtn, !isRunning && styles.disabled]}
              onPress={() => setSpeed((v) => clamp(Number((v - speedStep).toFixed(1)), 0, 25))}
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
              onPress={() => setSpeed((v) => clamp(Number((v + speedStep).toFixed(1)), 0, 25))}
              disabled={!isRunning}
            >
              <Ionicons name="add" size={20} color={colors.text} />
            </Pressable>
          </View>

          <View style={[styles.controlRow, styles.controlRowSpaced]}>
            <Pressable
              style={[styles.controlBtn, !isRunning && styles.disabled]}
              onPress={() => setInclineDeg((v) => clamp(Number((v - inclineStep).toFixed(1)), 0, 20))}
              disabled={!isRunning}
            >
              <Ionicons name="remove" size={20} color={colors.text} />
            </Pressable>

            <View style={styles.controlCenter}>
              <Text style={styles.controlValue}>
                {inclineDeg.toFixed(1)}
                <Text style={styles.controlUnit}>°</Text>
              </Text>
              <Text style={styles.controlLabel}>Incline</Text>
            </View>

            <Pressable
              style={[styles.controlBtn, !isRunning && styles.disabled]}
              onPress={() => setInclineDeg((v) => clamp(Number((v + inclineStep).toFixed(1)), 0, 20))}
              disabled={!isRunning}
            >
              <Ionicons name="add" size={20} color={colors.text} />
            </Pressable>
          </View>
        </View>

        <View style={styles.bottom}>
          <TouchableOpacity
            activeOpacity={0.92}
            style={[isRunning ? globalStyles.buttonSecondary : globalStyles.buttonPrimary, styles.pauseBtn]}
            onPress={togglePause}
          >
            <Ionicons
              name={isRunning ? 'pause' : 'play'}
              size={18}
              color={isRunning ? colors.text : colors.blkText}
            />
            <Text style={isRunning ? globalStyles.buttonTextSecondary : globalStyles.buttonTextPrimary}>
              {isRunning ? 'Pause' : 'Resume'}
            </Text>
          </TouchableOpacity>

          {!isRunning && (
            <View style={styles.pausedActionsRow}>
              <TouchableOpacity
                activeOpacity={0.92}
                style={[globalStyles.buttonPrimary, styles.actionButton]}
                onPress={() => setShowFinishConfirm(true)}
              >
                <Ionicons name="checkmark" size={18} color={colors.blkText} />
                <Text style={globalStyles.buttonTextPrimary}>Finish</Text>
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
          onKeepGoing={() => setShowFinishConfirm(false)}
          onFinish={finishToSummary}
        />

        <RunWalkCancelConfirmModal
          visible={showCancelConfirm}
          onKeep={() => setShowCancelConfirm(false)} // stays paused; user can resume
          onDiscard={confirmDiscardCancel}
        />
      </View>
    </LinearGradient>
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
      borderColor: colors.border,
      backgroundColor: colors.card2,
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
      color: colors.textMuted,
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
      backgroundColor: colors.card2,
      borderRadius: layout.tight ? 16 : 18,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: layout.tight ? 10 : 12,
      paddingHorizontal: 6,
      alignItems: 'center',
    },
    statLabel: {
      color: colors.textOffSt,
      fontFamily: fonts.label,
      fontSize: layout.tight ? 9 : 10,
      lineHeight: layout.tight ? 12 : 14,
      letterSpacing: 1,
      marginBottom: layout.tight ? 4 : 6,
      textTransform: 'uppercase',
    },
    statValue: {
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: layout.tight ? 15 : layout.compact ? 16 : 17,
      lineHeight: layout.tight ? 19 : 21,
    },
    statUnit: {
      color: colors.textMuted,
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
      color: colors.text,
      fontFamily: fonts.display,
      fontSize: layout.tight ? 42 : layout.compact ? 48 : 58,
      lineHeight: layout.tight ? 46 : layout.compact ? 52 : 62,
      letterSpacing: -1.2,
    },
    centerUnit: {
      color: colors.textMuted,
      fontFamily: fonts.label,
      fontSize: layout.tight ? 16 : layout.compact ? 18 : 20,
      lineHeight: layout.tight ? 20 : 24,
    },
    centerLabel: {
      color: colors.textOffSt,
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
      backgroundColor: colors.card3,
      borderRadius: layout.tight ? 14 : 16,
      paddingVertical: layout.tight ? 10 : 12,
      paddingHorizontal: layout.tight ? 10 : 14,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    centerMiniValue: {
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: layout.tight ? 13 : 14,
      lineHeight: layout.tight ? 16 : 18,
    },
    centerMiniLabel: {
      color: colors.textOffSt,
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
      backgroundColor: colors.card2,
      borderRadius: layout.tight ? 18 : 20,
      padding: layout.tight ? 8 : 10,
      borderWidth: 1,
      borderColor: colors.border,
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
      backgroundColor: colors.card3,
    },
    disabled: { opacity: 0.45 },
    controlCenter: { flex: 1, alignItems: 'center' },
    controlValue: {
      color: colors.text,
      fontFamily: fonts.display,
      fontSize: layout.tight ? 18 : 20,
      lineHeight: layout.tight ? 22 : 24,
    },
    controlUnit: {
      color: colors.textMuted,
      fontFamily: fonts.label,
      fontSize: layout.tight ? 10 : 11,
      lineHeight: 14,
    },
    controlLabel: {
      color: colors.textOffSt,
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
      backgroundColor: colors.accentSecondarySoft,
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
