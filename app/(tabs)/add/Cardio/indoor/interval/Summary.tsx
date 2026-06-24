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
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import LogoHeader from '@/components/my components/logoHeader';
import IntervalSummaryStatsCard from '@/app/(tabs)/add/Cardio/outdoor/components/IntervalSummaryStatsCard';
import IntervalHeartRateOverlayChart from '@/components/charts/IntervalHeartRateOverlayChart';
import MetricChart from '@/components/charts/MetricLineChart';
import { useUnits } from '@/contexts/UnitsContext';
import { useSmartBack } from '@/lib/navigation/useSmartBack';
import {
  formatCurrentHealthError,
  getCurrentHeartRateSamplesForRange,
  getCurrentHealthProviderLabel,
  getCurrentHealthProviderUnavailableMessage,
  isCurrentHealthProviderAvailable,
} from '@/lib/health/provider';
import { buildHeartRateTimelinePoints } from '@/lib/health/heartRateTimeline';
import type { HealthHeartRateSample } from '@/lib/health/types';
import { getIndoorIntervalSessionSummary } from '@/lib/indoorIntervals/supabase';
import { useAppTheme } from '@/providers/AppThemeProvider';
import { HOME_TONES } from '@/app/(tabs)/home/tokens';
import { formatDistance, formatDuration, formatPaceForUnit } from '@/lib/OutdoorSession/outdoorUtils';

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

function formatTimelineLabel(totalSeconds: number) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(seconds / 60);
  const rem = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
}

function formatSpeed(speedMps: number, unit: 'mi' | 'km') {
  const display = unit === 'mi' ? speedMps * 2.236936 : speedMps * 3.6;
  return `${display.toFixed(1)} ${unit === 'mi' ? 'mph' : 'kph'}`;
}

export default function IndoorIntervalSummaryRoute() {
  const params = useLocalSearchParams<{
    sessionId?: string;
    title?: string;
  }>();
  const { goBackSmart } = useSmartBack();
  const { colors, fonts, globalStyles } = useAppTheme();
  const { distanceUnit } = useUnits();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);

  const sessionId = params.sessionId?.toString() ?? null;
  const titleParam = params.title?.toString() ?? null;

  const [loading, setLoading] = useState(Boolean(sessionId));
  const [summary, setSummary] = useState<Awaited<
    ReturnType<typeof getIndoorIntervalSessionSummary>
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

    if (!sessionId) {
      setLoading(false);
      Alert.alert('Missing session', 'This indoor interval summary is missing its session id.');
      goBackSmart({ fallbackHref: '/(tabs)/home' });
      return () => {
        mounted = false;
      };
    }

    (async () => {
      try {
        const nextSummary = await getIndoorIntervalSessionSummary(sessionId);
        if (!mounted) return;
        setSummary(nextSummary);
      } catch (error) {
        console.warn('[IndoorIntervalSummary] load failed', error);
        if (mounted) {
          Alert.alert('Error', 'Could not load indoor interval summary.');
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
  }, [goBackSmart, sessionId]);

  const session = summary?.session ?? null;
  const steps = summary?.steps ?? [];
  const samples = summary?.samples ?? [];
  const title = titleParam ?? session?.template_name_snapshot ?? 'Indoor Interval';
  const elapsedSeconds = Math.max(0, session?.total_time_s ?? 0);
  const distanceMeters = Math.max(0, session?.total_distance_m ?? 0);
  const avgPace = session?.avg_pace_s_per_km ?? null;
  const startedAtISO = session?.started_at ?? null;
  const endedAtISO = session?.ended_at ?? null;

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
        console.warn('[IndoorIntervalSummary] health provider load failed', message);
        setHeartRateSyncState('failed');
        setHeartRateSyncMessage(message);
      } finally {
        setHeartRateSyncing(false);
      }
    },
    [endedAtISO, startedAtISO]
  );

  useEffect(() => {
    if (!startedAtISO || !endedAtISO || heartRateSyncing || heartRateLoaded) {
      return;
    }

    void runHeartRateSync({ delayMs: HEART_RATE_AUTO_RETRY_DELAY_MS, reason: 'auto' });
  }, [endedAtISO, heartRateLoaded, heartRateSyncing, runHeartRateSync, startedAtISO]);

  useEffect(() => {
    if (heartRateLoaded || autoHeartRateRetryRef.current || !startedAtISO || !endedAtISO) {
      return;
    }

    if (heartRateSyncState === 'synced' && heartRateSamples.length === 0) {
      autoHeartRateRetryRef.current = true;
      void runHeartRateSync({ delayMs: HEART_RATE_AUTO_RETRY_DELAY_MS, reason: 'auto' });
    }
  }, [
    endedAtISO,
    heartRateLoaded,
    heartRateSamples.length,
    heartRateSyncState,
    runHeartRateSync,
    startedAtISO,
  ]);

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

  const heartRatePoints = useMemo(
    () =>
      buildHeartRateTimelinePoints({
        samples: heartRateSamples,
        workoutStartISO: startedAtISO,
        workoutEndISO: endedAtISO,
      }),
    [endedAtISO, heartRateSamples, startedAtISO]
  );

  const speedPoints = useMemo(
    () =>
      samples
        .filter((sample) => Number.isFinite(sample.elapsed_s) && Number.isFinite(sample.speed_mps))
        .map((sample) => ({
          t: sample.elapsed_s,
          v: distanceUnit === 'mi'
            ? Number(sample.speed_mps ?? 0) * 2.236936
            : Number(sample.speed_mps ?? 0) * 3.6,
        })),
    [distanceUnit, samples]
  );

  const inclinePoints = useMemo(
    () =>
      samples
        .filter((sample) => Number.isFinite(sample.elapsed_s) && Number.isFinite(sample.incline_deg))
        .map((sample) => ({
          t: sample.elapsed_s,
          v: Number(sample.incline_deg ?? 0),
        })),
    [samples]
  );

  const elapsedLabel = useCallback(
    (value: number) => formatTimelineLabel(value),
    []
  );

  if (loading) {
    return (
      <View style={styles.page}>
        <View style={[globalStyles.container, styles.centerState]}>
          <LogoHeader />
          <ActivityIndicator size="large" color={colors.highlight1} />
          <Text style={styles.loadingText}>Loading indoor interval summary…</Text>
        </View>
      </View>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <View style={styles.page}>
      <View style={[globalStyles.container, styles.safe]}>
        <LogoHeader />

        <View style={styles.headerRow}>
          <TouchableOpacity
            activeOpacity={0.92}
            style={styles.iconButton}
            onPress={() => goBackSmart({ fallbackHref: '/(tabs)/home' })}
          >
            <Ionicons name="chevron-back" size={18} color={colors.text} />
          </TouchableOpacity>

          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>Indoor interval summary</Text>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>
              Review the completed reps, treadmill pacing, incline changes, and synced heart-rate response.
            </Text>
          </View>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={[globalStyles.panelSoft, styles.heroCard]}>
            <View style={styles.heroTopRow}>
              <View style={styles.heroMetric}>
                <Text style={styles.heroMetricLabel}>Time</Text>
                <Text style={styles.heroMetricValue}>{formatDuration(elapsedSeconds)}</Text>
              </View>
              <View style={styles.heroMetric}>
                <Text style={styles.heroMetricLabel}>Distance</Text>
                <Text style={styles.heroMetricValue}>
                  {formatDistance(distanceMeters, distanceUnit)}
                </Text>
              </View>
            </View>

            <View style={styles.heroBottomRow}>
              <View style={styles.summaryTile}>
                <Text style={styles.summaryTileLabel}>Avg pace</Text>
                <Text style={styles.summaryTileValue}>
                  {formatPaceForUnit(avgPace, distanceUnit)}
                </Text>
              </View>
              <View style={styles.summaryTile}>
                <Text style={styles.summaryTileLabel}>Avg speed</Text>
                <Text style={styles.summaryTileValue}>
                  {formatSpeed(session.avg_speed_mps ?? 0, distanceUnit)}
                </Text>
              </View>
              <View style={styles.summaryTile}>
                <Text style={styles.summaryTileLabel}>Elevation</Text>
                <Text style={styles.summaryTileValue}>
                  {Math.round(session.total_elevation_m ?? 0)} m
                </Text>
              </View>
            </View>
          </View>

          <IntervalSummaryStatsCard
            name={session.template_name_snapshot}
            description={session.template_description_snapshot}
            benefit={session.template_benefit_snapshot}
            steps={steps}
            completedIntervalsCount={session.completed_intervals_count}
            totalIntervalsCount={session.total_intervals_count}
          />

          {speedPoints.length > 1 ? (
            <MetricChart
              title={`Speed Over Time (${distanceUnit === 'mi' ? 'mph' : 'kph'})`}
              color={colors.highlight3}
              points={speedPoints}
              cardBg={colors.card}
              textColor={colors.text}
              valueFormatter={(value) => (Number.isFinite(value) ? value.toFixed(1) : '—')}
              xLabelFormatter={elapsedLabel}
              unitSuffix={distanceUnit === 'mi' ? 'mph' : 'kph'}
              yClampMin={0}
              noOfSections={4}
              showGrid={false}
              showYAxisIndices={false}
              showXAxisIndices={false}
              hideDataPoints
            />
          ) : null}

          {inclinePoints.length > 1 ? (
            <MetricChart
              title="Incline Over Time (deg)"
              color={colors.highlight2}
              points={inclinePoints}
              cardBg={colors.card}
              textColor={colors.text}
              valueFormatter={(value) => (Number.isFinite(value) ? value.toFixed(1) : '—')}
              xLabelFormatter={elapsedLabel}
              unitSuffix="deg"
              yClampMin={0}
              noOfSections={4}
              showGrid={false}
              showYAxisIndices={false}
              showXAxisIndices={false}
              hideDataPoints
            />
          ) : null}

          <View style={[globalStyles.panelSoft, styles.heartRateCard]}>
            <View style={styles.heartRateHeader}>
              <View>
                <Text style={globalStyles.eyebrow}>Phase overlay</Text>
                <Text style={styles.heartRateTitle}>Heart Rate</Text>
              </View>
              {heartRateSyncing ? (
                <ActivityIndicator size="small" color={colors.highlight1} />
              ) : null}
            </View>

            {heartRateSummary ? (
              <View style={styles.heartRateStatRow}>
                <HeartRateStat label="Avg" value={`${heartRateSummary.avgBpm} bpm`} styles={styles} />
                <HeartRateStat label="Min" value={`${heartRateSummary.minBpm}`} styles={styles} />
                <HeartRateStat label="Max" value={`${heartRateSummary.maxBpm}`} styles={styles} />
              </View>
            ) : (
              <Text style={styles.heartRateEmpty}>
                No {HEART_RATE_PROVIDER_LABEL} heart-rate samples were found yet for this session window.
              </Text>
            )}

            <IntervalHeartRateOverlayChart
              title={`Phase Timeline${heartRateSamples.length ? ` · ${HEART_RATE_PROVIDER_LABEL}` : ''}`}
              subtitle="Overlay synced heart rate on top of each interval phase."
              points={heartRatePoints}
              steps={steps}
              cardBg={colors.cardDark}
              textColor={colors.text}
              accentColor={colors.danger}
              xLabelFormatter={elapsedLabel}
            />

            {heartRateSyncMessage ? (
              <Text
                style={[
                  styles.heartRateStatus,
                  heartRateSyncState === 'failed' ? styles.heartRateStatusError : null,
                ]}
              >
                {heartRateSyncMessage}
              </Text>
            ) : null}

            <View style={styles.heartRateActionRow}>
              <TouchableOpacity
                activeOpacity={0.92}
                style={[
                  styles.primaryAction,
                  heartRateSyncing ? styles.actionDisabled : null,
                ]}
                disabled={heartRateSyncing}
                onPress={() =>
                  runHeartRateSync({ delayMs: HEART_RATE_MANUAL_DELAY_MS, reason: 'manual' })
                }
              >
                <Text style={styles.primaryActionText}>
                  {heartRateSyncing
                    ? 'Syncing…'
                    : `Retry (${Math.round(HEART_RATE_MANUAL_DELAY_MS / 1000)}s delay)`}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.92}
                style={[
                  styles.secondaryAction,
                  heartRateSyncing ? styles.actionDisabled : null,
                ]}
                disabled={heartRateSyncing}
                onPress={() => runHeartRateSync({ reason: 'manual' })}
              >
                <Text style={styles.secondaryActionText}>Sync now</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

function HeartRateStat({
  label,
  value,
  styles,
}: {
  label: string;
  value: string;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.heartRateStat}>
      <Text style={styles.heartRateStatLabel}>{label}</Text>
      <Text style={styles.heartRateStatValue}>{value}</Text>
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
    centerState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 14,
    },
    loadingText: {
      color: colors.text,
      fontFamily: fonts.body,
      fontSize: 14,
      lineHeight: 20,
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
    title: {
      marginTop: 8,
      color: colors.highlight1,
      fontFamily: fonts.display,
      fontSize: 28,
      lineHeight: 32,
      letterSpacing: -0.8,
    },
    subtitle: {
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
      paddingBottom: 22,
      gap: 12,
    },
    heroCard: {
      gap: 12,
    },
    heroTopRow: {
      flexDirection: 'row',
      gap: 10,
    },
    heroMetric: {
      flex: 1,
      borderRadius: 20,
      backgroundColor: colors.card3,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 14,
      paddingVertical: 14,
      gap: 8,
    },
    heroMetricLabel: {
      color: colors.textOffSt,
      fontFamily: fonts.label,
      fontSize: 10,
      lineHeight: 13,
      letterSpacing: 0.9,
      textTransform: 'uppercase',
    },
    heroMetricValue: {
      color: colors.text,
      fontFamily: fonts.display,
      fontSize: 24,
      lineHeight: 28,
    },
    heroBottomRow: {
      flexDirection: 'row',
      gap: 10,
      flexWrap: 'wrap',
    },
    summaryTile: {
      flex: 1,
      minWidth: 96,
      borderRadius: 18,
      backgroundColor: colors.card3,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      paddingVertical: 14,
      gap: 8,
    },
    summaryTileLabel: {
      color: colors.textOffSt,
      fontFamily: fonts.label,
      fontSize: 10,
      lineHeight: 13,
      letterSpacing: 0.9,
      textTransform: 'uppercase',
    },
    summaryTileValue: {
      color: colors.text,
      fontFamily: fonts.display,
      fontSize: 18,
      lineHeight: 22,
    },
    heartRateCard: {
      gap: 12,
    },
    heartRateHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    heartRateTitle: {
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 20,
      lineHeight: 24,
      marginTop: 4,
    },
    heartRateStatRow: {
      flexDirection: 'row',
      gap: 10,
      flexWrap: 'wrap',
    },
    heartRateStat: {
      flex: 1,
      minWidth: 96,
      borderRadius: 18,
      backgroundColor: colors.cardDark,
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
      letterSpacing: 0.9,
      textTransform: 'uppercase',
    },
    heartRateStatValue: {
      color: colors.text,
      fontFamily: fonts.display,
      fontSize: 18,
      lineHeight: 22,
    },
    heartRateEmpty: {
      color: colors.textMuted ?? HOME_TONES.textSecondary,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 19,
    },
    heartRateStatus: {
      color: colors.textMuted ?? HOME_TONES.textSecondary,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 18,
    },
    heartRateStatusError: {
      color: colors.danger,
    },
    heartRateActionRow: {
      flexDirection: 'row',
      gap: 10,
    },
    primaryAction: {
      flex: 1,
      minHeight: 48,
      borderRadius: 16,
      backgroundColor: colors.highlight1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 16,
    },
    primaryActionText: {
      color: colors.blkText,
      fontFamily: fonts.heading,
      fontSize: 13,
      lineHeight: 18,
    },
    secondaryAction: {
      minHeight: 48,
      borderRadius: 16,
      backgroundColor: HOME_TONES.surface2,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 16,
    },
    secondaryActionText: {
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 13,
      lineHeight: 18,
    },
    actionDisabled: {
      opacity: 0.55,
    },
  });
}
