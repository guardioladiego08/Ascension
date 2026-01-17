// app/(tabs)/profile/components/LifetimeStatsTable.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import { useUnits } from '@/contexts/UnitsContext';

const CARD = Colors.dark.card;
const CARD2 = Colors.dark.card2 ?? '#111827';
const BORDER = Colors.dark?.border ?? '#1F2937';
const TEXT = Colors.dark.text;
const MUTED = Colors.dark.textMuted ?? '#9AA4BF';
const ACCENT = Colors.dark.highlight1;

const M_PER_MI = 1609.344;
const M_PER_KM = 1000;
const FT_PER_M = 3.280839895;

type LifetimeStatsRow = {
  user_id: string;
  workouts_count: number;
  total_hours: number;
  total_elev_gain_m: number;
  total_distance_ran_m: number;
  total_distance_biked_m: number;
  updated_at?: string;
};

function safeNum(n: any): number {
  const v = Number(n);
  return Number.isFinite(v) ? v : 0;
}

function formatCompactInt(n: number) {
  const v = Math.round(safeNum(n));
  if (v >= 1_000_000) return `${Math.round(v / 100_000) / 10}M`;
  if (v >= 1_000) return `${Math.round(v / 100) / 10}k`;
  return `${v}`;
}

function format1(n: number) {
  const v = safeNum(n);
  return (Math.round(v * 10) / 10).toFixed(1);
}

function formatHours(hours: number) {
  const h = safeNum(hours);
  if (h === 0) return '0.0 h';
  return `${format1(h)} h`;
}

function TableRow({
  icon,
  label,
  value,
  subValue,
  last,
}: {
  icon: any;
  label: string;
  value: string;
  subValue?: string | null;
  last?: boolean;
}) {
  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <View style={styles.rowLeft}>
        <View style={styles.iconPill}>
          <Ionicons name={icon} size={16} color={MUTED} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowLabel}>{label}</Text>
          {subValue ? <Text style={styles.rowSub}>{subValue}</Text> : null}
        </View>
      </View>

      <Text style={styles.rowValue}>{value}</Text>
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
  const { distanceUnit } = useUnits(); // 'mi' | 'km'

  const [loading, setLoading] = useState(false);
  const [row, setRow] = useState<LifetimeStatsRow | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

  const anim = useRef(new Animated.Value(0)).current;

  const runIntro = useCallback(() => {
    anim.setValue(0);
    Animated.timing(anim, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [anim]);

  useEffect(() => {
    runIntro();
  }, [runIntro, distanceUnit, animateKey]);

  const load = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      setErrorText(null);

      const { data, error } = await supabase
        .schema('user')
        .from('lifetime_stats')
        .select(
          'user_id, workouts_count, total_hours, total_elev_gain_m, total_distance_ran_m, total_distance_biked_m, updated_at'
        )
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        setRow({
          user_id: userId,
          workouts_count: 0,
          total_hours: 0,
          total_elev_gain_m: 0,
          total_distance_ran_m: 0,
          total_distance_biked_m: 0,
        });
        return;
      }

      setRow({
        user_id: (data as any).user_id,
        workouts_count: safeNum((data as any).workouts_count),
        total_hours: safeNum((data as any).total_hours),
        total_elev_gain_m: safeNum((data as any).total_elev_gain_m),
        total_distance_ran_m: safeNum((data as any).total_distance_ran_m),
        total_distance_biked_m: safeNum((data as any).total_distance_biked_m),
        updated_at: (data as any).updated_at ?? undefined,
      });
    } catch (e: any) {
      console.error('[LifetimeStatsTable] load failed:', e);
      setRow(null);
      setErrorText(e?.message?.trim?.() ? e.message : 'Failed to load lifetime stats');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const distDiv = distanceUnit === 'mi' ? M_PER_MI : M_PER_KM;
  const distLabel = distanceUnit === 'mi' ? 'mi' : 'km';

  const runDist = safeNum(row?.total_distance_ran_m) / distDiv;
  const bikeDist = safeNum(row?.total_distance_biked_m) / distDiv;
  const totalDist = (safeNum(row?.total_distance_ran_m) + safeNum(row?.total_distance_biked_m)) / distDiv;

  const elevM = safeNum(row?.total_elev_gain_m);
  const elevVal = distanceUnit === 'mi' ? elevM * FT_PER_M : elevM;
  const elevUnit = distanceUnit === 'mi' ? 'ft' : 'm';

  const sessionsText = useMemo(() => formatCompactInt(safeNum(row?.workouts_count)), [row?.workouts_count]);
  const hoursText = useMemo(() => formatHours(safeNum(row?.total_hours)), [row?.total_hours]);

  const totalDistText = useMemo(() => `${format1(totalDist)} ${distLabel}`, [totalDist, distLabel]);
  const runDistText = useMemo(() => `${format1(runDist)} ${distLabel}`, [runDist, distLabel]);
  const bikeDistText = useMemo(() => `${format1(bikeDist)} ${distLabel}`, [bikeDist, distLabel]);

  const elevText = useMemo(
    () => `${Math.round(elevVal).toLocaleString()} ${elevUnit}`,
    [elevVal, elevUnit]
  );

  const updatedText = useMemo(() => {
    if (!row?.updated_at) return null;
    const d = new Date(row.updated_at);
    if (!Number.isFinite(d.getTime())) return null;
    return `Updated ${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
  }, [row?.updated_at]);

  const containerAnimStyle = {
    opacity: anim,
    transform: [
      {
        translateY: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [10, 0],
        }),
      },
    ],
  } as const;

  return (
    <Animated.View style={[styles.wrap, containerAnimStyle]}>
      <View style={styles.card}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Lifetime</Text>
            <Text style={styles.subtitle}>Indoor + outdoor run/walk totals</Text>
            {updatedText ? <Text style={styles.updated}>{updatedText}</Text> : null}
          </View>

          <View style={styles.headerRight}>
            {loading ? <ActivityIndicator size="small" color={ACCENT} /> : null}
            <TouchableOpacity onPress={load} style={styles.refreshBtn} disabled={loading}>
              <Ionicons name="refresh-outline" size={18} color={MUTED} />
            </TouchableOpacity>
          </View>
        </View>

        {errorText ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorText}</Text>
          </View>
        ) : null}

        <View style={styles.table}>
          <TableRow
            icon="layers-outline"
            label="Total sessions"
            value={loading ? '—' : sessionsText}
            subValue="Completed indoor + outdoor sessions"
          />

          <TableRow
            icon="time-outline"
            label="Total time"
            value={loading ? '—' : hoursText}
            subValue="Stored as total hours"
          />

          <TableRow
            icon="trail-sign-outline"
            label="Total distance"
            value={loading ? '—' : totalDistText}
            subValue={`Run ${runDistText} • Bike ${bikeDistText}`}
          />

          <TableRow
            icon="trending-up-outline"
            label="Total elevation gain"
            value={loading ? '—' : elevText}
            subValue={distanceUnit === 'mi' ? 'Converted from meters to feet' : 'Meters'}
            last
          />
        </View>

        <View style={styles.footerHint}>
          <View style={styles.dot} />
          <Text style={styles.hintText}>
            Display units follow your settings ({distanceUnit === 'mi' ? 'Miles/Feet' : 'Kilometers/Meters'}).
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  title: {
    color: TEXT,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  subtitle: {
    color: MUTED,
    fontSize: 12,
    marginTop: 4,
  },
  updated: {
    color: MUTED,
    fontSize: 11,
    marginTop: 6,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 2,
  },
  refreshBtn: {
    width: 34,
    height: 34,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: CARD2,
  },

  errorBox: {
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  errorText: {
    color: '#FCA5A5',
    fontSize: 12,
  },

  table: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  row: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  iconPill: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    color: TEXT,
    fontSize: 13,
    fontWeight: '700',
  },
  rowSub: {
    color: MUTED,
    fontSize: 11,
    marginTop: 3,
  },
  rowValue: {
    color: TEXT,
    fontSize: 14,
    fontWeight: '800',
    marginLeft: 8,
  },

  footerHint: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: ACCENT,
    opacity: 0.9,
  },
  hintText: {
    color: MUTED,
    fontSize: 11,
    flex: 1,
  },
});
