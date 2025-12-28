import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Pressable,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import LogoHeader from '@/components/my components/logoHeader';
import { LinearGradient } from 'expo-linear-gradient';

import FinishConfirmModal from './run_walk/FinishConfirmModal';
import RunWalkCancelConfirmModal from './run_walk/RunWalkCancelConfirmModal';

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

const CARD = Colors.dark.card;
const TEXT = Colors.dark.text;
const BG = Colors.dark.background;

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
  const params = useLocalSearchParams<{ mode?: string }>();

  const mode: Mode =
    (params.mode === 'indoor_walk' ? 'indoor_walk' : 'indoor_run') as Mode;

  const lockMode: RunWalkMode = mode; // same values for indoor

  const title = mode === 'indoor_walk' ? 'INDOOR WALK' : 'INDOOR RUN';

  const [distanceUnit, setDistanceUnit] = useState<DistanceUnit>('mi');

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
    let mounted = true;

    (async () => {
      try {
        const existing = await getActiveRunWalkLock();
        if (!mounted) return;

        if (existing) {
          Alert.alert(
            'Session in progress',
            `You already have a ${existing.mode.replace('_', ' ')} session in progress. Finish or cancel it before starting a new one.`
          );
          router.back();
          return;
        }

        await setActiveRunWalkLock(lockMode);
      } catch (e) {
        console.log('[IndoorSession] lock error', e);
        // If lock fails, we still allow session (best effort)
      }
    })();

    return () => {
      mounted = false;
    };
  }, [lockMode, router]);

  // Fetch preferences (distance unit) — robust
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const { data, error } = await supabase
          .schema('user')
          .from('user_preferences')
          .select('distance_unit')
          .maybeSingle();

        if (!mounted) return;

        if (error && (error as any).code !== 'PGRST116') {
          console.log('[IndoorSession] preferences error', error);
        }

        if (!data) {
          const { error: insErr } = await supabase
            .schema('user')
            .from('user_preferences')
            .insert({});
          if (insErr) {
            console.log('[IndoorSession] preferences insert error', insErr);
            return;
          }
          const { data: data2 } = await supabase
            .schema('user')
            .from('user_preferences')
            .select('distance_unit')
            .maybeSingle();

          const du2 = (data2?.distance_unit || 'mi').toLowerCase();
          setDistanceUnit(du2 === 'km' ? 'km' : 'mi');
          return;
        }

        const du = (data.distance_unit || 'mi').toLowerCase();
        setDistanceUnit(du === 'km' ? 'km' : 'mi');
      } catch (e) {
        console.log('[IndoorSession] preferences unexpected error', e);
      }
    })();

    return () => { mounted = false; };
  }, []);

  // keep speed aligned with unit/mode defaults
  useEffect(() => {
    setSpeed(defaultSpeed);
    speedRef.current = defaultSpeed;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultSpeed]);

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
    router.back();
  };

  // Finish -> draft -> clear lock -> reset -> go summary
  const finishToSummary = async () => {
    setShowFinishConfirm(false);
    setIsRunning(false);

    const endedAt = new Date().toISOString();
    const totalTimeS = elapsedRef.current;
    const totalDistM = distanceRef.current;
    const totalElevM = elevRef.current;

    const avgSpeedMpsFinal = totalTimeS > 0 ? totalDistM / totalTimeS : 0;
    const paceKm = totalDistM > 0 ? totalTimeS / (totalDistM / M_PER_KM) : null;
    const paceMi = totalDistM > 0 ? totalTimeS / (totalDistM / M_PER_MI) : null;

    const draftId = makeId();

    const draft: RunWalkDraft = {
      id: draftId,
      created_at: endedAt,
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

      await clearActiveRunWalkLock();

      // Reset but keep running=false because we're leaving screen
      resetSessionState(false);

      router.replace({
        pathname: '/add/Cardio/IndoorSessionSummary',
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
    try {
      await clearActiveRunWalkLock();
    } catch {}

    // Reset and explicitly set nextRunning=true so this screen never “sticks” paused
    resetSessionState(true);
    router.back();
  };

  return (
    <LinearGradient
      colors={['#3a3a3bff', '#1e1e1eff', BG]}
      start={{ x: 0.2, y: 0 }}
      end={{ x: 0.8, y: 1 }}
      style={{ flex: 1 }}
    >
      <View style={styles.safe}>
        <View style={styles.logoWrap}>
          <LogoHeader />
        </View>

        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.iconBtn} onPress={onBackPress}>
            <Ionicons name="chevron-back" size={20} color={TEXT} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.currentLabel}>CURRENT</Text>
            <Text style={styles.title}>{title}</Text>
          </View>

          <View style={styles.iconBtnSpacer} />
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>DISTANCE</Text>
            <Text style={styles.statValue}>
              {displayDistance.toFixed(2)}
              <Text style={styles.statUnit}>{distLabelUnit}</Text>
            </Text>
          </View>

          <View style={styles.statBox}>
            <Text style={styles.statLabel}>TIME</Text>
            <Text style={styles.statValue}>{formatClock(elapsedS)}</Text>
          </View>

          <View style={styles.statBox}>
            <Text style={styles.statLabel}>AVG SPEED</Text>
            <Text style={styles.statValue}>
              {avgSpeedDisplay.toFixed(1)}
              <Text style={styles.statUnit}>{speedLabelUnit}</Text>
            </Text>
          </View>
        </View>

        <View style={styles.centerBlock}>
          <Text style={styles.centerBig}>
            {displayDistance.toFixed(2)}
            <Text style={styles.centerUnit}>{distLabelUnit}</Text>
          </Text>
          <Text style={styles.centerLabel}>TOTAL DISTANCE</Text>

          <View style={styles.centerRow}>
            <View style={styles.centerMini}>
              <Text style={styles.centerMiniValue}>{currentPace}</Text>
              <Text style={styles.centerMiniLabel}>CURRENT PACE</Text>
            </View>

            <View style={styles.centerMini}>
              <Text style={styles.centerMiniValue}>{avgPace}</Text>
              <Text style={styles.centerMiniLabel}>AVG PACE</Text>
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
              <Ionicons name="remove" size={20} color={TEXT} />
            </Pressable>

            <View style={styles.controlCenter}>
              <Text style={styles.controlValue}>
                {speed.toFixed(1)}
                <Text style={styles.controlUnit}>{speedLabelUnit}</Text>
              </Text>
              <Text style={styles.controlLabel}>CURRENT SPEED</Text>
            </View>

            <Pressable
              style={[styles.controlBtn, !isRunning && styles.disabled]}
              onPress={() => setSpeed((v) => clamp(Number((v + speedStep).toFixed(1)), 0, 25))}
              disabled={!isRunning}
            >
              <Ionicons name="add" size={20} color={TEXT} />
            </Pressable>
          </View>

          <View style={[styles.controlRow, { marginTop: 10 }]}>
            <Pressable
              style={[styles.controlBtn, !isRunning && styles.disabled]}
              onPress={() => setInclineDeg((v) => clamp(Number((v - inclineStep).toFixed(1)), 0, 20))}
              disabled={!isRunning}
            >
              <Ionicons name="remove" size={20} color={TEXT} />
            </Pressable>

            <View style={styles.controlCenter}>
              <Text style={styles.controlValue}>
                {inclineDeg.toFixed(1)}
                <Text style={styles.controlUnit}>°</Text>
              </Text>
              <Text style={styles.controlLabel}>INCLINE</Text>
            </View>

            <Pressable
              style={[styles.controlBtn, !isRunning && styles.disabled]}
              onPress={() => setInclineDeg((v) => clamp(Number((v + inclineStep).toFixed(1)), 0, 20))}
              disabled={!isRunning}
            >
              <Ionicons name="add" size={20} color={TEXT} />
            </Pressable>
          </View>
        </View>

        <View style={styles.bottom}>
          <TouchableOpacity style={styles.pauseBtn} onPress={togglePause}>
            <Ionicons name={isRunning ? 'pause' : 'play'} size={18} color={TEXT} />
            <Text style={styles.pauseText}>{isRunning ? 'Pause' : 'Resume'}</Text>
          </TouchableOpacity>

          {!isRunning && (
            <View style={styles.pausedActionsRow}>
              <TouchableOpacity
                activeOpacity={0.9}
                style={styles.finishBtn}
                onPress={() => setShowFinishConfirm(true)}
              >
                <Ionicons name="checkmark" size={18} color={TEXT} />
                <Text style={styles.finishText}>Finish</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.9}
                style={styles.cancelBtn}
                onPress={requestCancel}
              >
                <Ionicons name="close" size={18} color="#e04b4b" />
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

const styles = StyleSheet.create({
  safe: { flex: 1, },

  logoWrap: {
    paddingTop: 6,
    paddingHorizontal: 16,
    marginBottom: 2,
  },

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
  iconBtnSpacer: { width: 44, height: 44 },
  headerCenter: { alignItems: 'center' },
  currentLabel: {
    color: TEXT,
    opacity: 0.7,
    fontSize: 11,
    letterSpacing: 2,
    fontWeight: '700',
    marginBottom: 3,
  },
  title: {
    color: Colors.dark.highlight1,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 1,
  },

  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    gap: 10,
    marginTop: 2,
  },
  statBox: {
    flex: 1,
    backgroundColor: CARD,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  statLabel: {
    color: TEXT,
    opacity: 0.7,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 6,
  },
  statValue: { color: TEXT, fontSize: 17, fontWeight: '900' },
  statUnit: { color: TEXT, opacity: 0.8, fontSize: 12, fontWeight: '900' },

  centerBlock: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  centerBig: { color: TEXT, fontSize: 62, fontWeight: '900', letterSpacing: 1 },
  centerUnit: { color: TEXT, fontSize: 24, fontWeight: '900', opacity: 0.9 },
  centerLabel: {
    color: TEXT,
    opacity: 0.75,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 6,
  },
  centerRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  centerMini: {
    backgroundColor: CARD,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    minWidth: 140,
  },
  centerMiniValue: { color: TEXT, fontSize: 14, fontWeight: '900' },
  centerMiniLabel: {
    color: TEXT,
    opacity: 0.7,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 5,
  },

  controls: { paddingHorizontal: 16, paddingBottom: 8 },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD,
    borderRadius: 18,
    padding: 10,
  },
  controlBtn: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabled: { opacity: 0.45 },
  controlCenter: { flex: 1, alignItems: 'center' },
  controlValue: { color: TEXT, fontSize: 20, fontWeight: '900' },
  controlUnit: { color: TEXT, opacity: 0.85, fontSize: 12, fontWeight: '900' },
  controlLabel: {
    color: TEXT,
    opacity: 0.7,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 4,
  },

  bottom: { paddingHorizontal: 16, paddingBottom: 12 },
  pauseBtn: {
    height: 58,
    borderRadius: 18,
    backgroundColor: CARD,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  pauseText: { color: TEXT, fontSize: 16, fontWeight: '900' },

  pausedActionsRow: { flexDirection: 'row', gap: 12, marginTop: 10 },
  finishBtn: {
    flex: 1,
    height: 52,
    borderRadius: 18,
    backgroundColor: CARD,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  finishText: { color: TEXT, fontSize: 15, fontWeight: '900' },

  cancelBtn: {
    flex: 1,
    height: 52,
    borderRadius: 18,
    backgroundColor: CARD,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  cancelText: { color: '#e04b4b', fontSize: 15, fontWeight: '900' },
});
