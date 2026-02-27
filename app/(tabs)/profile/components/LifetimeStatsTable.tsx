import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';

import { Colors } from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import { useUnits } from '@/contexts/UnitsContext';

const CARD = Colors.dark.card;
const CARD_ALT = Colors.dark.card2 ?? '#111827';
const BORDER = Colors.dark?.border ?? '#1F2937';
const TEXT = Colors.dark.text;
const MUTED = Colors.dark.textMuted ?? '#9AA4BF';
const ACCENT = Colors.dark.highlight1;
const RUN_TINT = Colors.dark.highlight2 ?? '#60A5FA';
const WALK_TINT = '#A78BFA';
const BIKE_TINT = Colors.dark.highlight3 ?? '#F59E0B';
const CAL_TINT = '#F87171';
const ELEV_TINT = '#34D399';
const WARNING = '#FCA5A5';
const TRACK = 'rgba(255,255,255,0.08)';

const M_PER_MI = 1609.344;
const M_PER_KM = 1000;
const FT_PER_M = 3.280839895;
const KG_PER_LB = 0.45359237;

type LifetimeStatsRow = {
  user_id: string;
  workouts_count: number;
  total_hours: number;
  total_weight_lifted_kg: number;
  total_kcal_consumed: number;
  total_elev_gain_m: number;
  total_distance_ran_m: number;
  total_distance_biked_m: number;
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
}: {
  label: string;
  value: string;
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
}: {
  label: string;
  value: string;
  tint: string;
  icon: keyof typeof Ionicons.glyphMap;
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
}: {
  label: string;
  value: string;
  percent: string;
  color: string;
  progress: number;
  last?: boolean;
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
}: {
  slices: MovementSlice[];
  centerValue: string;
  centerLabel: string;
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
          stroke={TRACK}
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
}: {
  userId: string;
  animateKey?: number;
}) {
  const { distanceUnit } = useUnits();
  const [loading, setLoading] = useState(false);
  const [row, setRow] = useState<LifetimeStatsRow | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
  const anim = useRef(new Animated.Value(0)).current;

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

  const load = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      setErrorText(null);

      let data: any = null;
      let error: any = null;

      const rpcRes = await supabase.rpc('get_lifetime_stats_user', { p_user_id: userId });
      if (!rpcRes.error) {
        data = Array.isArray(rpcRes.data) ? rpcRes.data[0] ?? null : rpcRes.data;
      } else if (!isMissingDbObject(rpcRes.error)) {
        error = rpcRes.error;
      }

      if (!data && !error) {
        const directRes = await supabase
          .schema('user')
          .from('lifetime_stats')
          .select(
            'user_id,workouts_count,total_hours,total_weight_lifted_kg,total_kcal_consumed,total_elev_gain_m,total_distance_ran_m,total_distance_biked_m,total_distance_walked_m,total_distance_run_walk_m,updated_at'
          )
          .eq('user_id', userId)
          .maybeSingle();

        data = directRes.data;
        error = directRes.error;
      }

      if (error) throw error;

      if (!data) {
        setRow({
          user_id: userId,
          workouts_count: 0,
          total_hours: 0,
          total_weight_lifted_kg: 0,
          total_kcal_consumed: 0,
          total_elev_gain_m: 0,
          total_distance_ran_m: 0,
          total_distance_biked_m: 0,
          total_distance_walked_m: 0,
          total_distance_run_walk_m: 0,
        });
        return;
      }

      setRow({
        user_id: String((data as any).user_id ?? userId),
        workouts_count: safeNum((data as any).workouts_count),
        total_hours: safeNum((data as any).total_hours),
        total_weight_lifted_kg: safeNum((data as any).total_weight_lifted_kg),
        total_kcal_consumed: safeNum((data as any).total_kcal_consumed),
        total_elev_gain_m: safeNum((data as any).total_elev_gain_m),
        total_distance_ran_m: safeNum((data as any).total_distance_ran_m),
        total_distance_biked_m: safeNum((data as any).total_distance_biked_m),
        total_distance_walked_m: safeNum((data as any).total_distance_walked_m),
        total_distance_run_walk_m: safeNum((data as any).total_distance_run_walk_m),
        updated_at: (data as any).updated_at ?? undefined,
      });
    } catch (e: any) {
      console.error('[LifetimeStatsTable] load failed', e);
      setRow(null);
      setErrorText(e?.message?.trim?.() ? e.message : 'Failed to load lifetime stats');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const runWalkMeters = safeNum(row?.total_distance_run_walk_m);
  const runMeters = safeNum(row?.total_distance_ran_m);
  const walkMeters = safeNum(row?.total_distance_walked_m);
  const bikeMeters = safeNum(row?.total_distance_biked_m);
  const mergedRunWalkMeters = runWalkMeters > 0 ? runWalkMeters : runMeters + walkMeters;
  const totalDistanceMeters = mergedRunWalkMeters + bikeMeters;

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
  const bikeText = useMemo(() => formatDistance(bikeMeters, distanceUnit), [bikeMeters, distanceUnit]);
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
      { key: 'run', label: 'Run', value: runMeters, color: RUN_TINT, displayValue: runText },
      { key: 'walk', label: 'Walk', value: walkMeters, color: WALK_TINT, displayValue: walkText },
      { key: 'bike', label: 'Bike', value: bikeMeters, color: BIKE_TINT, displayValue: bikeText },
    ],
    [bikeMeters, bikeText, runMeters, runText, walkMeters, walkText]
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
              <ActivityIndicator size="small" color={TEXT} />
            ) : (
              <Ionicons name="refresh-outline" size={18} color={TEXT} />
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.heroValue}>{totalDistanceText}</Text>
        <Text style={styles.heroSubtext}>Total lifetime movement across run, walk, and bike sessions.</Text>

        <View style={styles.summaryStatsRow}>
          <SummaryStat label="Workouts" value={workoutsText} />
          <SummaryStat label="Hours" value={hoursText} />
          <SummaryStat label="Run + Walk" value={runWalkText} />
        </View>
      </View>

      {errorText ? (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={16} color={WARNING} />
          <Text style={styles.errorText}>{errorText}</Text>
        </View>
      ) : null}

      <View style={styles.chartCard}>
        <Text style={styles.cardTitle}>Movement mix</Text>
        <Text style={styles.cardSubtitle}>A ring view plus breakdown bars for each distance category.</Text>

        <View style={styles.chartRow}>
          <MovementRing slices={movementSlices} centerValue={totalDistanceText} centerLabel="Total distance" />

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
            />
          ))}
        </View>
      </View>

      <View style={styles.metricsGrid}>
        <MetricCard label="Weight lifted" value={weightText} tint={ACCENT} icon="barbell-outline" />
        <MetricCard label="Calories logged" value={caloriesText} tint={CAL_TINT} icon="flame-outline" />
        <MetricCard label="Elevation gain" value={elevationText} tint={ELEV_TINT} icon="trending-up-outline" />
        <MetricCard label="Bike distance" value={bikeText} tint={BIKE_TINT} icon="bicycle-outline" />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    gap: 14,
  },
  heroCard: {
    backgroundColor: CARD,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 18,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  heroEyebrow: {
    color: MUTED,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: TEXT,
    fontSize: 24,
    fontWeight: '800',
    marginTop: 4,
  },
  heroMeta: {
    color: MUTED,
    fontSize: 11,
    marginTop: 6,
  },
  refreshBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  heroValue: {
    color: TEXT,
    fontSize: 40,
    fontWeight: '300',
    letterSpacing: -1,
    marginTop: 18,
  },
  heroSubtext: {
    color: MUTED,
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
    backgroundColor: 'rgba(255,255,255,0.045)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  summaryStatLabel: {
    color: MUTED,
    fontSize: 11,
  },
  summaryStatValue: {
    color: TEXT,
    fontSize: 16,
    fontWeight: '800',
    marginTop: 6,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(252,165,165,0.10)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(252,165,165,0.18)',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  errorText: {
    color: WARNING,
    fontSize: 12,
    flex: 1,
  },
  chartCard: {
    backgroundColor: CARD_ALT,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 18,
  },
  cardTitle: {
    color: TEXT,
    fontSize: 18,
    fontWeight: '800',
  },
  cardSubtitle: {
    color: MUTED,
    fontSize: 12,
    marginTop: 6,
    lineHeight: 17,
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
    color: TEXT,
    fontSize: 19,
    fontWeight: '800',
    textAlign: 'center',
  },
  ringCenterLabel: {
    color: MUTED,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 14,
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
    color: TEXT,
    fontSize: 13,
    fontWeight: '700',
  },
  legendValue: {
    color: MUTED,
    fontSize: 11,
    marginTop: 2,
  },
  legendPercent: {
    color: TEXT,
    fontSize: 12,
    fontWeight: '700',
  },
  mixBarsWrap: {
    marginTop: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 14,
  },
  mixBarRow: {
    paddingVertical: 12,
  },
  mixBarBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
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
    color: TEXT,
    fontSize: 13,
    fontWeight: '700',
  },
  mixBarValues: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  mixBarValue: {
    color: TEXT,
    fontSize: 13,
    fontWeight: '700',
  },
  mixBarPercent: {
    color: MUTED,
    fontSize: 11,
  },
  mixBarTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: TRACK,
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
    backgroundColor: CARD,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
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
    color: MUTED,
    fontSize: 12,
    fontWeight: '700',
  },
  metricCardValue: {
    color: TEXT,
    fontSize: 20,
    fontWeight: '900',
  },
});
