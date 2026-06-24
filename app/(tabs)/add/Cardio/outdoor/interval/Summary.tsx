import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import LogoHeader from '@/components/my components/logoHeader';
import OutdoorSummaryRouteCard from '@/app/(tabs)/add/Cardio/outdoor/components/OutdoorSummaryRouteCard';
import IntervalSummaryStatsCard from '@/app/(tabs)/add/Cardio/outdoor/components/IntervalSummaryStatsCard';
import IntervalHeartRateOverlayChart from '@/components/charts/IntervalHeartRateOverlayChart';
import { useUnits } from '@/contexts/UnitsContext';
import {
  getIntervalSessionSummary,
} from '@/lib/intervals/supabase';
import { extractIntervalRouteCoords } from '@/lib/intervals/summary';
import {
  formatDuration,
  formatDistance,
  formatPaceForUnit,
} from '@/lib/OutdoorSession/outdoorUtils';
import {
  formatCurrentHealthError,
  getCurrentHeartRateSamplesForRange,
  getCurrentHealthProviderLabel,
  getCurrentHealthProviderUnavailableMessage,
  isCurrentHealthProviderAvailable,
} from '@/lib/health/provider';
import { buildHeartRateTimelinePoints } from '@/lib/health/heartRateTimeline';
import type { HealthHeartRateSample } from '@/lib/health/types';
import { useAppTheme } from '@/providers/AppThemeProvider';
import { useSmartBack } from '@/lib/navigation/useSmartBack';

const HEART_RATE_AUTO_RETRY_DELAY_MS = 45_000;
const HEART_RATE_MANUAL_DELAY_MS = 20_000;
const HEART_RATE_PROVIDER_LABEL = getCurrentHealthProviderLabel();

type HeartRateSyncState =
  | 'idle'
  | 'scheduled'
  | 'syncing'
  | 'synced'
  | 'skipped'
  | 'failed';

function getSafeIsoDate(value?: string | null, fallbackDate?: Date) {
  if (value) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }

  return (fallbackDate ?? new Date()).toISOString();
}

function formatTimelineLabel(totalSeconds: number) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(seconds / 60);
  const rem = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
}

export default function IntervalSessionSummary() {
  const router = useRouter();
  const { goBackSmart } = useSmartBack();
  const { colors, fonts, globalStyles } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);
  const { distanceUnit } = useUnits();
  const params = useLocalSearchParams<{
    sessionId?: string;
    title?: string;
  }>();

  const sessionIdParam = params.sessionId?.toString() ?? null;
  const titleParam = params.title?.toString() ?? null;

  const [loading, setLoading] = useState(Boolean(sessionIdParam));
  const [summary, setSummary] = useState<Awaited<
    ReturnType<typeof getIntervalSessionSummary>
  > | null>(null);
  const [heartRateSamples, setHeartRateSamples] = useState<HealthHeartRateSample[]>([]);
  const [heartRateSyncState, setHeartRateSyncState] = useState<HeartRateSyncState>('idle');
  const [heartRateSyncMessage, setHeartRateSyncMessage] = useState<string | null>(null);
  const [heartRateSyncing, setHeartRateSyncing] = useState(false);
  const [heartRateLoaded, setHeartRateLoaded] = useState(false);
  const autoHeartRateRetryRef = useRef(false);
  const activeHeartRateSyncTokenRef = useRef(0);

  useEffect(() => {
    let mounted = true;

    if (!sessionIdParam) {
      setLoading(false);
      Alert.alert('Missing session', 'This interval summary is missing its session id.');
      goBackSmart({ fallbackHref: '/(tabs)/home' });
      return () => {
        mounted = false;
      };
    }

    (async () => {
      try {
        const nextSummary = await getIntervalSessionSummary(sessionIdParam);
        if (!mounted) return;
        setSummary(nextSummary);
      } catch (error) {
        console.warn('[IntervalSessionSummary] load failed', error);
        if (mounted) {
          Alert.alert('Error', 'Could not load interval summary.');
          goBackSmart({ fallbackHref: '/(tabs)/home' });
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [goBackSmart, sessionIdParam]);

  const session = summary?.session ?? null;
  const steps = summary?.steps ?? [];
  const samples = summary?.samples ?? [];
  const title = titleParam ?? session?.template_name_snapshot ?? 'Interval Run';
  const elapsedSeconds = Math.max(0, session?.duration_s ?? 0);
  const distanceMeters = Math.max(0, session?.distance_m ?? 0);
  const avgPace = session?.avg_pace_s_per_km ?? null;
  const startedAtISO = getSafeIsoDate(
    session?.started_at,
    new Date(Date.now() - elapsedSeconds * 1000)
  );
  const endedAtISO = getSafeIsoDate(session?.ended_at);
  const routeCoords = useMemo(() => extractIntervalRouteCoords(samples), [samples]);

  const runHeartRateSync = useCallback(
    async (opts?: { delayMs?: number; reason?: 'auto' | 'manual' }) => {
      if (!startedAtISO || !endedAtISO) {
        setHeartRateSyncState('skipped');
        setHeartRateSyncMessage('Workout timestamps are missing, so heart-rate sync was skipped.');
        return;
      }

      const delayMs = Math.max(0, opts?.delayMs ?? 0);
      const reason = opts?.reason ?? 'manual';
      const syncToken = Date.now();
      activeHeartRateSyncTokenRef.current = syncToken;

      if (delayMs > 0) {
        setHeartRateSyncState('scheduled');
        setHeartRateSyncMessage(
          `${reason === 'auto' ? 'Auto retry' : 'Retry'} in ${Math.round(
            delayMs / 1000
          )} seconds before re-checking ${HEART_RATE_PROVIDER_LABEL}.`
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }

      if (activeHeartRateSyncTokenRef.current !== syncToken) {
        return;
      }

      try {
        if (!(await isCurrentHealthProviderAvailable())) {
          setHeartRateLoaded(true);
          setHeartRateSyncState('skipped');
          setHeartRateSyncMessage(await getCurrentHealthProviderUnavailableMessage());
          return;
        }

        setHeartRateSyncing(true);
        setHeartRateSyncState('syncing');
        setHeartRateSyncMessage(
          `Loading heart-rate samples from ${HEART_RATE_PROVIDER_LABEL}…`
        );

        const nextSamples = await getCurrentHeartRateSamplesForRange({
          startDate: startedAtISO,
          endDate: endedAtISO,
        });

        if (activeHeartRateSyncTokenRef.current !== syncToken) {
          return;
        }

        setHeartRateSamples(nextSamples);
        setHeartRateLoaded(true);
        setHeartRateSyncState('synced');

        if (nextSamples.length === 0) {
          setHeartRateSyncMessage(
            `${HEART_RATE_PROVIDER_LABEL} returned no samples for this session yet. Retry after a short delay.`
          );
        } else {
          setHeartRateSyncMessage(
            `Loaded ${nextSamples.length} heart-rate samples from ${HEART_RATE_PROVIDER_LABEL}.`
          );
        }
      } catch (error: any) {
        const message = formatCurrentHealthError(error);
        setHeartRateLoaded(true);
        if (
          message.toLowerCase().includes('not available') ||
          message.toLowerCase().includes('nitro') ||
          message.toLowerCase().includes('turbo') ||
          message.toLowerCase().includes('build')
        ) {
          setHeartRateSyncState('skipped');
          setHeartRateSyncMessage(message);
          return;
        }
        console.warn('[IntervalSessionSummary] health provider load failed', message);
        setHeartRateSyncState('failed');
        setHeartRateSyncMessage(message);
      } finally {
        setHeartRateSyncing(false);
      }
    },
    [endedAtISO, startedAtISO]
  );

  const heartRateSummary = useMemo(() => {
    if (heartRateSamples.length === 0) return null;

    let minBpm = heartRateSamples[0].bpm;
    let maxBpm = heartRateSamples[0].bpm;
    let sumBpm = 0;

    for (const sample of heartRateSamples) {
      const bpm = Number(sample.bpm);
      if (bpm < minBpm) minBpm = bpm;
      if (bpm > maxBpm) maxBpm = bpm;
      sumBpm += bpm;
    }

    return {
      avgBpm: Math.round((sumBpm / heartRateSamples.length) * 10) / 10,
      minBpm: Math.round(minBpm),
      maxBpm: Math.round(maxBpm),
      sampleCount: heartRateSamples.length,
    };
  }, [heartRateSamples]);

  const heartRatePoints = useMemo(() => {
    return buildHeartRateTimelinePoints({
      samples: heartRateSamples,
      workoutStartISO: startedAtISO,
      workoutEndISO: endedAtISO,
    });
  }, [endedAtISO, heartRateSamples, startedAtISO]);

  const heartRateSourceLabel = useMemo(() => {
    if (heartRateSamples.length === 0) return null;
    const first = heartRateSamples[0];
    return first.sourceName ?? first.deviceName ?? HEART_RATE_PROVIDER_LABEL;
  }, [heartRateSamples]);

  useEffect(() => {
    autoHeartRateRetryRef.current = false;
    activeHeartRateSyncTokenRef.current = 0;
    setHeartRateSamples([]);
    setHeartRateLoaded(false);
    setHeartRateSyncState('idle');
    setHeartRateSyncMessage(null);
    setHeartRateSyncing(false);
  }, [sessionIdParam, startedAtISO, endedAtISO]);

  useEffect(() => {
    if (!summary) return;
    if (!startedAtISO || !endedAtISO) return;
    if (heartRateLoaded || heartRateSyncing) return;
    void runHeartRateSync({ reason: 'manual' });
  }, [
    endedAtISO,
    heartRateLoaded,
    heartRateSyncing,
    runHeartRateSync,
    startedAtISO,
    summary,
  ]);

  useEffect(() => {
    if (!startedAtISO || !endedAtISO) return;
    if (!heartRateLoaded) return;
    if (heartRateSamples.length > 0) return;
    if (heartRateSyncState !== 'synced') return;
    if (autoHeartRateRetryRef.current) return;

    autoHeartRateRetryRef.current = true;
    void runHeartRateSync({
      delayMs: HEART_RATE_AUTO_RETRY_DELAY_MS,
      reason: 'auto',
    });
  }, [
    endedAtISO,
    heartRateLoaded,
    heartRateSamples.length,
    heartRateSyncState,
    runHeartRateSync,
    startedAtISO,
  ]);

  function onDone() {
    router.replace('/(tabs)/home');
  }

  if (loading) {
    return (
      <LinearGradient
        colors={[colors.gradientTop, colors.gradientMid, colors.gradientBottom]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={globalStyles.page}
      >
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color={colors.highlight1} />
        </View>
      </LinearGradient>
    );
  }

  if (!session) {
    return (
      <LinearGradient
        colors={[colors.gradientTop, colors.gradientMid, colors.gradientBottom]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={globalStyles.page}
      >
        <View style={styles.loadingWrap}>
          <Text style={styles.emptyText}>Interval session unavailable.</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={[colors.gradientTop, colors.gradientMid, colors.gradientBottom]}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={globalStyles.page}
    >
      <View style={[globalStyles.container, styles.safe]}>
        <LogoHeader />

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={[globalStyles.panel, styles.heroCard]}>
            <View style={styles.headerRow}>
              <TouchableOpacity style={styles.iconBtn} onPress={onDone}>
                <Ionicons name="chevron-back" size={18} color={colors.text} />
              </TouchableOpacity>
              <View style={styles.headerCenter}>
                <Text style={globalStyles.eyebrow}>Session summary</Text>
                <Text style={styles.title}>{title}</Text>
                <Text style={styles.sub}>INTERVAL RUN</Text>
              </View>
              <View style={styles.iconBtnSpacer} />
            </View>

            <View style={styles.heroStatsRow}>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>{formatDuration(elapsedSeconds)}</Text>
                <Text style={styles.heroStatLabel}>time</Text>
              </View>
              <View style={[styles.heroStat, styles.heroStatAccent]}>
                <Text style={styles.heroStatValue}>{formatDistance(distanceMeters, distanceUnit)}</Text>
                <Text style={styles.heroStatLabel}>distance</Text>
              </View>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>{formatPaceForUnit(avgPace, distanceUnit)}</Text>
                <Text style={styles.heroStatLabel}>avg pace</Text>
              </View>
            </View>
          </View>

          <View style={styles.noticeCard}>
            <Text style={styles.noticeText}>Interval session saved.</Text>
          </View>

          <IntervalSummaryStatsCard
            name={session.template_name_snapshot}
            description={session.template_description_snapshot}
            benefit={session.template_benefit_snapshot}
            steps={steps}
            completedIntervalsCount={session.completed_intervals_count}
            totalIntervalsCount={session.total_intervals_count}
          />

          <OutdoorSummaryRouteCard
            coords={routeCoords}
            title="Interval route"
            subtitle="Review the exact route captured during this interval session."
          />

          <View style={[globalStyles.panelSoft, styles.heartRateCard]}>
            <View style={styles.heartRateHeaderRow}>
              <View>
                <Text style={globalStyles.eyebrow}>Recovery signal</Text>
                <Text style={styles.heartRateTitle}>Heart Rate Overlay</Text>
              </View>
              {heartRateSyncing ? (
                <ActivityIndicator size="small" color={colors.highlight1} />
              ) : null}
            </View>

            {heartRateSummary ? (
              <>
                <Text style={styles.heartRateAvgLabel}>Avg. Heart Rate</Text>
                <Text style={styles.heartRateAvgValue}>{heartRateSummary.avgBpm} BPM</Text>

                <View style={styles.heartRateStatsRow}>
                  <View style={styles.heartRateStat}>
                    <Text style={styles.heartRateStatLabel}>Min</Text>
                    <Text style={styles.heartRateStatValue}>{heartRateSummary.minBpm}</Text>
                  </View>
                  <View style={styles.heartRateStat}>
                    <Text style={styles.heartRateStatLabel}>Max</Text>
                    <Text style={styles.heartRateStatValue}>{heartRateSummary.maxBpm}</Text>
                  </View>
                  <View style={styles.heartRateStat}>
                    <Text style={styles.heartRateStatLabel}>Samples</Text>
                    <Text style={styles.heartRateStatValue}>{heartRateSummary.sampleCount}</Text>
                  </View>
                </View>
              </>
            ) : (
              <Text style={styles.heartRateEmpty}>
                No {HEART_RATE_PROVIDER_LABEL} heart-rate samples found yet for this session window.
              </Text>
            )}

            <IntervalHeartRateOverlayChart
              title={`Interval Timeline${heartRateSourceLabel ? ` · ${heartRateSourceLabel}` : ''}`}
              subtitle="Heart rate overlays the saved interval blocks so you can compare effort against each phase."
              points={heartRatePoints}
              steps={steps}
              cardBg={colors.cardDark}
              textColor={colors.text}
              accentColor={colors.danger}
              xLabelFormatter={formatTimelineLabel}
            />

            {heartRateSyncMessage ? (
              <Text
                style={[
                  styles.heartRateStatusText,
                  heartRateSyncState === 'failed' ? styles.heartRateStatusTextError : null,
                ]}
              >
                {heartRateSyncMessage}
              </Text>
            ) : null}

            <View style={styles.heartRateActionsRow}>
              <TouchableOpacity
                activeOpacity={0.9}
                style={[
                  styles.heartRateActionBtn,
                  styles.heartRateActionBtnPrimary,
                  heartRateSyncing ? styles.heartRateActionBtnDisabled : null,
                ]}
                disabled={heartRateSyncing}
                onPress={() =>
                  runHeartRateSync({ delayMs: HEART_RATE_MANUAL_DELAY_MS, reason: 'manual' })
                }
              >
                <Text style={styles.heartRateActionBtnPrimaryText}>
                  {heartRateSyncing
                    ? 'Syncing…'
                    : `Retry (${Math.round(HEART_RATE_MANUAL_DELAY_MS / 1000)}s delay)`}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.9}
                style={[
                  styles.heartRateActionBtn,
                  heartRateSyncing ? styles.heartRateActionBtnDisabled : null,
                ]}
                disabled={heartRateSyncing}
                onPress={() => runHeartRateSync({ reason: 'manual' })}
              >
                <Text style={styles.heartRateActionBtnText}>Sync now</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.footer}>
            <TouchableOpacity style={[globalStyles.buttonPrimary, styles.primary]} onPress={onDone}>
              <Ionicons name="checkmark" size={20} color={colors.blkText} />
              <Text style={globalStyles.buttonTextPrimary}>Done</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </LinearGradient>
  );
}

function createStyles(
  colors: ReturnType<typeof useAppTheme>['colors'],
  fonts: ReturnType<typeof useAppTheme>['fonts']
) {
  return StyleSheet.create({
    safe: { flex: 1 },
    loadingWrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyText: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 14,
      lineHeight: 20,
    },
    scrollContent: {
      paddingBottom: 20,
    },
    heroCard: {
      marginTop: 8,
      marginBottom: 12,
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
      backgroundColor: colors.card2,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconBtnSpacer: { width: 40, height: 40 },
    headerCenter: {
      flex: 1,
      alignItems: 'center',
    },
    title: {
      marginTop: 8,
      color: colors.text,
      fontFamily: fonts.display,
      fontSize: 28,
      lineHeight: 32,
      letterSpacing: -0.8,
      textAlign: 'center',
    },
    sub: {
      marginTop: 4,
      color: colors.textMuted,
      fontFamily: fonts.label,
      letterSpacing: 1.2,
      fontSize: 12,
      lineHeight: 16,
    },
    heroStatsRow: {
      marginTop: 18,
      flexDirection: 'row',
      gap: 10,
    },
    heroStat: {
      flex: 1,
      minHeight: 88,
      borderRadius: 18,
      backgroundColor: colors.card2,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 12,
      paddingHorizontal: 10,
      justifyContent: 'space-between',
    },
    heroStatAccent: {
      backgroundColor: colors.card3,
    },
    heroStatValue: {
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 14,
      lineHeight: 18,
      textAlign: 'center',
    },
    heroStatLabel: {
      color: colors.textOffSt,
      fontFamily: fonts.label,
      letterSpacing: 0.8,
      fontSize: 10,
      lineHeight: 14,
      textTransform: 'uppercase',
      textAlign: 'center',
    },
    noticeCard: {
      marginBottom: 12,
      borderRadius: 18,
      backgroundColor: colors.accentSoft,
      borderWidth: 1,
      borderColor: colors.highlight1,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    noticeText: {
      color: colors.text,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 18,
    },
    heartRateCard: {
      marginTop: 12,
      gap: 12,
    },
    heartRateHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    heartRateTitle: {
      color: colors.text,
      fontFamily: fonts.display,
      fontSize: 24,
      lineHeight: 28,
      letterSpacing: -0.5,
    },
    heartRateAvgLabel: {
      color: colors.textOffSt,
      fontFamily: fonts.label,
      fontSize: 11,
      lineHeight: 14,
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    heartRateAvgValue: {
      color: colors.text,
      fontFamily: fonts.display,
      fontSize: 28,
      lineHeight: 32,
      letterSpacing: -0.8,
    },
    heartRateStatsRow: {
      flexDirection: 'row',
      gap: 10,
    },
    heartRateStat: {
      flex: 1,
      borderRadius: 16,
      backgroundColor: colors.card3,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      paddingVertical: 12,
      gap: 6,
    },
    heartRateStatLabel: {
      color: colors.textOffSt,
      fontFamily: fonts.label,
      fontSize: 10,
      lineHeight: 13,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    heartRateStatValue: {
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 18,
      lineHeight: 22,
    },
    heartRateEmpty: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 18,
    },
    heartRateStatusText: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 17,
    },
    heartRateStatusTextError: {
      color: colors.danger,
    },
    heartRateActionsRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 2,
    },
    heartRateActionBtn: {
      flex: 1,
      minHeight: 46,
      borderRadius: 16,
      paddingHorizontal: 14,
      paddingVertical: 12,
      backgroundColor: colors.card3,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    heartRateActionBtnPrimary: {
      backgroundColor: colors.highlight1,
      borderColor: colors.highlight1,
    },
    heartRateActionBtnDisabled: {
      opacity: 0.55,
    },
    heartRateActionBtnText: {
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 13,
      lineHeight: 18,
    },
    heartRateActionBtnPrimaryText: {
      color: colors.blkText,
      fontFamily: fonts.heading,
      fontSize: 13,
      lineHeight: 18,
    },
    footer: {
      marginTop: 18,
      marginBottom: 6,
    },
    primary: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
    },
  });
}
