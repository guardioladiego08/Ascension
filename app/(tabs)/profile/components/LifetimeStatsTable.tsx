import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';

import { useAppTheme } from '@/providers/AppThemeProvider';
import { supabase } from '@/lib/supabase';
import { getSocialFeedForUser } from '@/lib/social/feed';
import { useUnits } from '@/contexts/UnitsContext';

const M_PER_MI = 1609.344;
const M_PER_KM = 1000;
const FT_PER_M = 3.280839895;
const KG_PER_LB = 0.45359237;
const DEBUG_LIFETIME_STATS = __DEV__;

type LifetimeStatsRow = {
  user_id: string;
  workouts_count: number;
  total_hours: number;
  total_weight_lifted_kg: number;
  total_kcal_consumed: number;
  total_elev_gain_m: number;
  total_distance_ran_m: number;
  total_distance_walked_m: number;
  total_distance_run_walk_m: number;
  updated_at?: string;
};

type MovementSlice = {
  key: string;
  label: string;
  value: number;
  color: string;
  displayValue: string;
};

function safeNum(n: unknown): number {
  const value = Number(n);
  return Number.isFinite(value) ? value : 0;
}

function metricFromMap(
  metrics: Record<string, number | string | null> | null | undefined,
  keys: string[]
): number {
  if (!metrics) return 0;
  for (const key of keys) {
    const raw = metrics[key];
    if (raw == null) continue;
    const n = Number(raw);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function isMissingDbObject(error: any): boolean {
  if (!error) return false;
  const code = String(error?.code ?? '');
  const msg = String(error?.message ?? '').toLowerCase();
  return (
    code === '42P01' ||
    code === '3F000' ||
    code === '42703' ||
    code === 'PGRST106' ||
    code === 'PGRST202' ||
    msg.includes('does not exist') ||
    msg.includes('undefined column') ||
    msg.includes('function') ||
    msg.includes('schema must be one of the following')
  );
}

function isAccessDeniedError(error: any): boolean {
  if (!error) return false;
  const code = String(error?.code ?? '');
  const msg = String(error?.message ?? '').toLowerCase();
  return (
    code === '42501' ||
    code === 'PGRST301' ||
    msg.includes('permission denied') ||
    msg.includes('row-level security')
  );
}

function formatCompact(n: number) {
  const value = Math.round(safeNum(n));
  if (Math.abs(value) >= 1_000_000) return `${Math.round(value / 100_000) / 10}M`;
  if (Math.abs(value) >= 1_000) return `${Math.round(value / 100) / 10}k`;
  return `${value}`;
}

function format1(n: number) {
  return (Math.round(safeNum(n) * 10) / 10).toFixed(1);
}

function formatPercent(value: number, total: number) {
  if (total <= 0) return '0%';
  return `${Math.round((value / total) * 100)}%`;
}

function formatDistance(meters: number, unit: 'mi' | 'km') {
  const divisor = unit === 'mi' ? M_PER_MI : M_PER_KM;
  const suffix = unit === 'mi' ? 'mi' : 'km';
  return `${format1(safeNum(meters) / divisor)} ${suffix}`;
}

function formatElevation(meters: number, unit: 'mi' | 'km') {
  if (unit === 'mi') return `${Math.round(safeNum(meters) * FT_PER_M).toLocaleString()} ft`;
  return `${Math.round(safeNum(meters)).toLocaleString()} m`;
}

function formatWeight(kg: number, unit: 'mi' | 'km') {
  if (unit === 'mi') return `${formatCompact(safeNum(kg) / KG_PER_LB)} lb`;
  return `${formatCompact(kg)} kg`;
}

function formatHours(hours: number) {
  return `${format1(hours)} h`;
}

function formatCalories(kcal: number) {
  return `${Math.round(safeNum(kcal)).toLocaleString()} kcal`;
}

function SummaryStat({
  label,
  value,
  styles,
}: {
  label: string;
  value: string;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.summaryStat}>
      <Text style={styles.summaryStatLabel}>{label}</Text>
      <Text style={styles.summaryStatValue}>{value}</Text>
    </View>
  );
}

function MetricCard({
  label,
  value,
  tint,
  icon,
  styles,
}: {
  label: string;
  value: string;
  tint: string;
  icon: keyof typeof Ionicons.glyphMap;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.metricCard}>
      <View style={styles.metricCardHeader}>
        <View style={[styles.metricIconWrap, { backgroundColor: `${tint}1A` }]}>
          <Ionicons name={icon} size={15} color={tint} />
        </View>
        <Text style={styles.metricCardLabel}>{label}</Text>
      </View>
      <Text style={styles.metricCardValue}>{value}</Text>
    </View>
  );
}

function MixBar({
  label,
  value,
  percent,
  color,
  progress,
  last,
  styles,
}: {
  label: string;
  value: string;
  percent: string;
  color: string;
  progress: number;
  last?: boolean;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={[styles.mixBarRow, !last && styles.mixBarBorder]}>
      <View style={styles.mixBarTop}>
        <View style={styles.mixBarLabelWrap}>
          <View style={[styles.mixBarDot, { backgroundColor: color }]} />
          <Text style={styles.mixBarLabel}>{label}</Text>
        </View>
        <View style={styles.mixBarValues}>
          <Text style={styles.mixBarValue}>{value}</Text>
          <Text style={styles.mixBarPercent}>{percent}</Text>
        </View>
      </View>
      <View style={styles.mixBarTrack}>
        <View
          style={[
            styles.mixBarFill,
            { backgroundColor: color, width: progress > 0 ? `${Math.max(progress * 100, 4)}%` : '0%' },
          ]}
        />
      </View>
    </View>
  );
}

function MovementRing({
  slices,
  centerValue,
  centerLabel,
  styles,
  trackColor,
}: {
  slices: MovementSlice[];
  centerValue: string;
  centerLabel: string;
  styles: ReturnType<typeof createStyles>;
  trackColor: string;
}) {
  const size = 170;
  const strokeWidth = 18;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const positiveSlices = slices.filter((slice) => slice.value > 0);
  const total = positiveSlices.reduce((sum, slice) => sum + slice.value, 0);
  let consumed = 0;

  return (
    <View style={styles.ringWrap}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {positiveSlices.map((slice) => {
          const rawLength = total > 0 ? (slice.value / total) * circumference : 0;
          const segmentLength = Math.max(rawLength - 6, 0);
          const dashOffset = circumference * 0.25 - consumed;
          consumed += rawLength;

          return (
            <Circle
              key={slice.key}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={slice.color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={`${segmentLength} ${circumference}`}
              strokeDashoffset={dashOffset}
              rotation={-90}
              originX={size / 2}
              originY={size / 2}
            />
          );
        })}
      </Svg>

      <View style={styles.ringCenter}>
        <Text style={styles.ringCenterValue}>{centerValue}</Text>
        <Text style={styles.ringCenterLabel}>{centerLabel}</Text>
      </View>
    </View>
  );
}

export default function LifetimeStatsTable({
  userId,
  animateKey,
  refreshToken = 0,
}: {
  userId: string;
  animateKey?: number;
  refreshToken?: number;
}) {
  const { colors, fonts } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);
  const { distanceUnit } = useUnits();
  const [loading, setLoading] = useState(false);
  const [row, setRow] = useState<LifetimeStatsRow | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
  const anim = useRef(new Animated.Value(0)).current;
  const accent = colors.highlight1;
  const runTint = colors.highlight2;
  const walkTint = colors.highlight1;
  const calTint = colors.danger;
  const elevTint = colors.success;
  const warning = colors.danger;
  const track = colors.border;

  const logDebug = useCallback(
    (event: string, payload?: Record<string, unknown>) => {
      if (!DEBUG_LIFETIME_STATS) return;
      console.log('[LifetimeStatsDebug]', event, {
        userId,
        ...(payload ?? {}),
      });
    },
    [userId]
  );

  const runIntro = useCallback(() => {
    anim.setValue(0);
    Animated.timing(anim, {
      toValue: 1,
      duration: 250,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [anim]);

  useEffect(() => {
    runIntro();
  }, [runIntro, animateKey, distanceUnit]);

  const deriveFromSocialPosts = useCallback(async (): Promise<LifetimeStatsRow | null> => {
    const PAGE_LIMIT = 100;
    const MAX_PAGES = 5;

    let offset = 0;
    const allPosts: Awaited<ReturnType<typeof getSocialFeedForUser>> = [];

    for (let page = 0; page < MAX_PAGES; page += 1) {
      const rows = await getSocialFeedForUser({
        userId,
        offset,
        limit: PAGE_LIMIT,
      });
      logDebug('social_page_loaded', { page, offset, count: rows.length });

      if (rows.length === 0) break;
      allPosts.push(...rows);

      if (rows.length < PAGE_LIMIT) break;
      offset += rows.length;
    }

    if (allPosts.length === 0) return null;

    const activityTypeCounts: Record<string, number> = {};
    const visibilityCounts: Record<string, number> = {};
    for (const post of allPosts) {
      const typeKey = String(post.activityType ?? 'unknown');
      const visibilityKey = String(post.visibility ?? 'unknown');
      activityTypeCounts[typeKey] = (activityTypeCounts[typeKey] ?? 0) + 1;
      visibilityCounts[visibilityKey] = (visibilityCounts[visibilityKey] ?? 0) + 1;
    }
    logDebug('social_posts_loaded', {
      total: allPosts.length,
      activityTypeCounts,
      visibilityCounts,
    });

    let totalHours = 0;
    let totalWeightLiftedKg = 0;
    let totalKcalConsumed = 0;
    let totalElevGainM = 0;
    let totalDistanceRanM = 0;
    let totalDistanceWalkedM = 0;
    let totalDistanceRunWalkM = 0;
    let updatedAt: string | undefined;
    const countedWorkouts = new Set<string>();

    for (const post of allPosts) {
      if (!updatedAt || new Date(post.createdAt).getTime() > new Date(updatedAt).getTime()) {
        updatedAt = post.createdAt;
      }

      if (post.activityType === 'nutrition') {
        totalKcalConsumed += metricFromMap(post.metrics, ['calories', 'kcal', 'total_kcal']);
        continue;
      }

      if (post.activityType !== 'run' && post.activityType !== 'walk' && post.activityType !== 'strength') {
        continue;
      }

      const workoutKey = String(post.sessionId ?? post.sourceId ?? post.id);
      if (!countedWorkouts.has(workoutKey)) {
        countedWorkouts.add(workoutKey);
        totalHours += metricFromMap(post.metrics, ['total_time_s', 'duration_s', 'duration']) / 3600;
      }

      if (post.activityType === 'strength') {
        totalWeightLiftedKg += metricFromMap(post.metrics, ['total_volume_kg', 'volume_kg']);
        continue;
      }

      const distanceM = metricFromMap(post.metrics, ['distance_m', 'total_distance_m']);
      totalDistanceRunWalkM += distanceM;
      totalElevGainM += metricFromMap(post.metrics, ['elevation_gain_m', 'total_elev_gain_m']);

      if (post.activityType === 'run') {
        totalDistanceRanM += distanceM;
      } else {
        totalDistanceWalkedM += distanceM;
      }
    }

    if (
      countedWorkouts.size === 0 &&
      totalWeightLiftedKg <= 0 &&
      totalDistanceRunWalkM <= 0 &&
      totalKcalConsumed <= 0
    ) {
      return null;
    }

    return {
      user_id: userId,
      workouts_count: countedWorkouts.size,
      total_hours: totalHours,
      total_weight_lifted_kg: totalWeightLiftedKg,
      total_kcal_consumed: totalKcalConsumed,
      total_elev_gain_m: totalElevGainM,
      total_distance_ran_m: totalDistanceRanM,
      total_distance_walked_m: totalDistanceWalkedM,
      total_distance_run_walk_m: totalDistanceRunWalkM,
      updated_at: updatedAt,
    };
  }, [userId]);

  const load = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      setErrorText(null);
      logDebug('load_start');

      let data: any = null;
      let error: any = null;
      let rpcFallbackAllowed = false;

      const rpcRes = await supabase.rpc('get_lifetime_stats_user', { p_user_id: userId });
      if (!rpcRes.error) {
        data = Array.isArray(rpcRes.data) ? rpcRes.data[0] ?? null : rpcRes.data;
        logDebug('rpc_success', { hasRow: !!data });
      } else if (!isMissingDbObject(rpcRes.error)) {
        error = rpcRes.error;
        logDebug('rpc_failed', {
          code: rpcRes.error?.code ?? null,
          message: rpcRes.error?.message ?? null,
        });
      } else {
        rpcFallbackAllowed = true;
        logDebug('rpc_unavailable_using_fallback', {
          code: rpcRes.error?.code ?? null,
          message: rpcRes.error?.message ?? null,
        });
      }

      if (!data && !error && rpcFallbackAllowed) {
        const directRes = await supabase
          .schema('user')
          .from('lifetime_stats')
          .select(
            'user_id,workouts_count,total_hours,total_weight_lifted_kg,total_kcal_consumed,total_elev_gain_m,total_distance_ran_m,total_distance_walked_m,total_distance_run_walk_m,updated_at'
          )
          .eq('user_id', userId)
          .maybeSingle();

        data = directRes.data;
        if (directRes.error && !isAccessDeniedError(directRes.error)) {
          error = directRes.error;
          logDebug('fallback_failed', {
            code: directRes.error?.code ?? null,
            message: directRes.error?.message ?? null,
          });
        } else {
          logDebug('fallback_complete', {
            hasRow: !!directRes.data,
            accessDenied: !!(directRes.error && isAccessDeniedError(directRes.error)),
          });
        }
      }

      if (!data && !error) {
        const derived = await deriveFromSocialPosts();
        if (derived) {
          data = derived;
          logDebug('social_fallback_success', {
            workouts_count: derived.workouts_count,
            total_distance_run_walk_m: Math.round(derived.total_distance_run_walk_m),
          });
        } else {
          logDebug('social_fallback_empty');
        }
      }

      if (error) throw error;

      if (!data) {
        logDebug('load_empty_defaulting_zero');
        setRow({
          user_id: userId,
          workouts_count: 0,
          total_hours: 0,
          total_weight_lifted_kg: 0,
          total_kcal_consumed: 0,
          total_elev_gain_m: 0,
          total_distance_ran_m: 0,
          total_distance_walked_m: 0,
          total_distance_run_walk_m: 0,
        });
        return;
      }

      logDebug('load_success', {
        workouts_count: safeNum((data as any).workouts_count),
        total_distance_run_walk_m: safeNum((data as any).total_distance_run_walk_m),
      });
      setRow({
        user_id: String((data as any).user_id ?? userId),
        workouts_count: safeNum((data as any).workouts_count),
        total_hours: safeNum((data as any).total_hours),
        total_weight_lifted_kg: safeNum((data as any).total_weight_lifted_kg),
        total_kcal_consumed: safeNum((data as any).total_kcal_consumed),
        total_elev_gain_m: safeNum((data as any).total_elev_gain_m),
        total_distance_ran_m: safeNum((data as any).total_distance_ran_m),
        total_distance_walked_m: safeNum((data as any).total_distance_walked_m),
        total_distance_run_walk_m: safeNum((data as any).total_distance_run_walk_m),
        updated_at: (data as any).updated_at ?? undefined,
      });
    } catch (e: any) {
      console.error('[LifetimeStatsTable] load failed', e);
      setRow(null);
      setErrorText(e?.message?.trim?.() ? e.message : 'Failed to load lifetime stats');
      logDebug('load_failed', {
        code: e?.code ?? null,
        message: e?.message ?? String(e ?? ''),
      });
    } finally {
      setLoading(false);
      logDebug('load_done');
    }
  }, [deriveFromSocialPosts, logDebug, userId]);

  useEffect(() => {
    void load();
  }, [load, refreshToken]);

  const runWalkMeters = safeNum(row?.total_distance_run_walk_m);
  const runMeters = safeNum(row?.total_distance_ran_m);
  const walkMeters = safeNum(row?.total_distance_walked_m);
  const mergedRunWalkMeters = runWalkMeters > 0 ? runWalkMeters : runMeters + walkMeters;
  const totalDistanceMeters = mergedRunWalkMeters;

  const totalDistanceText = useMemo(
    () => formatDistance(totalDistanceMeters, distanceUnit),
    [totalDistanceMeters, distanceUnit]
  );
  const workoutsText = useMemo(() => formatCompact(row?.workouts_count ?? 0), [row?.workouts_count]);
  const hoursText = useMemo(() => formatHours(row?.total_hours ?? 0), [row?.total_hours]);
  const weightText = useMemo(
    () => formatWeight(row?.total_weight_lifted_kg ?? 0, distanceUnit),
    [row?.total_weight_lifted_kg, distanceUnit]
  );
  const caloriesText = useMemo(
    () => formatCalories(row?.total_kcal_consumed ?? 0),
    [row?.total_kcal_consumed]
  );
  const elevationText = useMemo(
    () => formatElevation(row?.total_elev_gain_m ?? 0, distanceUnit),
    [row?.total_elev_gain_m, distanceUnit]
  );
  const runText = useMemo(() => formatDistance(runMeters, distanceUnit), [runMeters, distanceUnit]);
  const walkText = useMemo(() => formatDistance(walkMeters, distanceUnit), [walkMeters, distanceUnit]);
  const runWalkText = useMemo(
    () => formatDistance(mergedRunWalkMeters, distanceUnit),
    [mergedRunWalkMeters, distanceUnit]
  );

  const updatedText = useMemo(() => {
    if (!row?.updated_at) return null;
    const date = new Date(row.updated_at);
    if (!Number.isFinite(date.getTime())) return null;
    return `Updated ${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
  }, [row?.updated_at]);

  const movementSlices = useMemo<MovementSlice[]>(
    () => [
      { key: 'run', label: 'Run', value: runMeters, color: runTint, displayValue: runText },
      { key: 'walk', label: 'Walk', value: walkMeters, color: walkTint, displayValue: walkText },
    ],
    [runMeters, runText, runTint, walkMeters, walkText, walkTint]
  );

  const movementTotal = useMemo(
    () => movementSlices.reduce((sum, slice) => sum + slice.value, 0),
    [movementSlices]
  );

  const containerAnimStyle = {
    opacity: anim,
    transform: [
      {
        translateY: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [14, 0],
        }),
      },
    ],
  } as const;

  return (
    <Animated.View style={[styles.wrap, containerAnimStyle]}>
      <View style={styles.heroCard}>
        <View style={styles.heroHeader}>
          <View>
            <Text style={styles.heroEyebrow}>Lifetime</Text>
            <Text style={styles.heroTitle}>Training snapshot</Text>
            {updatedText ? <Text style={styles.heroMeta}>{updatedText}</Text> : null}
          </View>

          <TouchableOpacity onPress={load} style={styles.refreshBtn} disabled={loading}>
            {loading ? (
              <ActivityIndicator size="small" color={colors.text} />
            ) : (
              <Ionicons name="refresh-outline" size={18} color={colors.text} />
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.heroValue}>{totalDistanceText}</Text>
        <Text style={styles.heroSubtext}>Total lifetime movement across run and walk sessions.</Text>

        <View style={styles.summaryStatsRow}>
          <SummaryStat label="Workouts" value={workoutsText} styles={styles} />
          <SummaryStat label="Hours" value={hoursText} styles={styles} />
          <SummaryStat label="Run + Walk" value={runWalkText} styles={styles} />
        </View>
      </View>

      {errorText ? (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={16} color={warning} />
          <Text style={styles.errorText}>{errorText}</Text>
        </View>
      ) : null}

      <View style={styles.chartCard}>
        <Text style={styles.cardTitle}>Movement mix</Text>
        <Text style={styles.cardSubtitle}>A ring view plus breakdown bars for each distance category.</Text>

        <View style={styles.chartRow}>
          <MovementRing
            slices={movementSlices}
            centerValue={totalDistanceText}
            centerLabel="Total distance"
            styles={styles}
            trackColor={track}
          />

          <View style={styles.legendWrap}>
            {movementSlices.map((slice) => (
              <View key={slice.key} style={styles.legendItem}>
                <View style={[styles.legendSwatch, { backgroundColor: slice.color }]} />
                <View style={styles.legendCopy}>
                  <Text style={styles.legendLabel}>{slice.label}</Text>
                  <Text style={styles.legendValue}>{slice.displayValue}</Text>
                </View>
                <Text style={styles.legendPercent}>{formatPercent(slice.value, movementTotal)}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.mixBarsWrap}>
          {movementSlices.map((slice, index) => (
            <MixBar
              key={slice.key}
              label={slice.label}
              value={slice.displayValue}
              percent={formatPercent(slice.value, movementTotal)}
              color={slice.color}
              progress={movementTotal > 0 ? slice.value / movementTotal : 0}
              last={index === movementSlices.length - 1}
              styles={styles}
            />
          ))}
        </View>
      </View>

      <View style={styles.metricsGrid}>
        <MetricCard
          label="Weight lifted"
          value={weightText}
          tint={accent}
          icon="barbell-outline"
          styles={styles}
        />
        <MetricCard
          label="Calories logged"
          value={caloriesText}
          tint={calTint}
          icon="flame-outline"
          styles={styles}
        />
        <MetricCard
          label="Elevation gain"
          value={elevationText}
          tint={elevTint}
          icon="trending-up-outline"
          styles={styles}
        />
        <MetricCard
          label="Run distance"
          value={runText}
          tint={runTint}
          icon="walk-outline"
          styles={styles}
        />
      </View>
    </Animated.View>
  );
}

function createStyles(
  colors: ReturnType<typeof useAppTheme>['colors'],
  fonts: ReturnType<typeof useAppTheme>['fonts']
) {
  return StyleSheet.create({
    wrap: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 24,
      gap: 14,
    },
    heroCard: {
      backgroundColor: colors.card,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 18,
    },
    heroHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 12,
    },
    heroEyebrow: {
      color: colors.textOffSt,
      fontFamily: fonts.label,
      fontSize: 12,
      lineHeight: 15,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    },
    heroTitle: {
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 24,
      lineHeight: 28,
      marginTop: 4,
    },
    heroMeta: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 11,
      lineHeight: 15,
      marginTop: 6,
    },
    refreshBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.card2,
      borderWidth: 1,
      borderColor: colors.border,
    },
    heroValue: {
      color: colors.text,
      fontFamily: fonts.display,
      fontSize: 40,
      lineHeight: 44,
      letterSpacing: -1,
      marginTop: 18,
    },
    heroSubtext: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 18,
      marginTop: 8,
      maxWidth: '92%',
    },
    summaryStatsRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 18,
    },
    summaryStat: {
      flex: 1,
      backgroundColor: colors.card2,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      paddingVertical: 12,
    },
    summaryStatLabel: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 11,
      lineHeight: 15,
    },
    summaryStatValue: {
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 16,
      lineHeight: 20,
      marginTop: 6,
    },
    errorBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.accentTertiarySoft,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.glowTertiary,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    errorText: {
      color: colors.danger,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 16,
      flex: 1,
    },
    chartCard: {
      backgroundColor: colors.card2,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 18,
    },
    cardTitle: {
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 18,
      lineHeight: 22,
    },
    cardSubtitle: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 17,
      marginTop: 6,
    },
    chartRow: {
      marginTop: 16,
      gap: 16,
      alignItems: 'center',
    },
    ringWrap: {
      width: '100%',
      alignItems: 'center',
      justifyContent: 'center',
    },
    ringCenter: {
      position: 'absolute',
      alignItems: 'center',
      justifyContent: 'center',
      maxWidth: 94,
    },
    ringCenterValue: {
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 19,
      lineHeight: 23,
      textAlign: 'center',
    },
    ringCenterLabel: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 11,
      lineHeight: 14,
      textAlign: 'center',
      marginTop: 6,
    },
    legendWrap: {
      width: '100%',
      gap: 10,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    legendSwatch: {
      width: 10,
      height: 10,
      borderRadius: 999,
    },
    legendCopy: {
      flex: 1,
    },
    legendLabel: {
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 13,
      lineHeight: 17,
    },
    legendValue: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 11,
      lineHeight: 15,
      marginTop: 2,
    },
    legendPercent: {
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 12,
      lineHeight: 16,
    },
    mixBarsWrap: {
      marginTop: 16,
      backgroundColor: colors.card3,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 14,
    },
    mixBarRow: {
      paddingVertical: 12,
    },
    mixBarBorder: {
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    mixBarTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    mixBarLabelWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
    },
    mixBarDot: {
      width: 9,
      height: 9,
      borderRadius: 999,
    },
    mixBarLabel: {
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 13,
      lineHeight: 17,
    },
    mixBarValues: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    mixBarValue: {
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 13,
      lineHeight: 17,
    },
    mixBarPercent: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 11,
      lineHeight: 15,
    },
    mixBarTrack: {
      height: 8,
      borderRadius: 999,
      backgroundColor: colors.border,
      overflow: 'hidden',
      marginTop: 10,
    },
    mixBarFill: {
      height: '100%',
      borderRadius: 999,
    },
    metricsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    metricCard: {
      width: '48.5%',
      minHeight: 108,
      backgroundColor: colors.card,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      justifyContent: 'space-between',
    },
    metricCardHeader: {
      gap: 10,
    },
    metricIconWrap: {
      width: 32,
      height: 32,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
    },
    metricCardLabel: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 16,
    },
    metricCardValue: {
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 20,
      lineHeight: 24,
    },
  });
}
