import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { Colors } from '@/constants/Colors';
import { supabase } from '@/lib/supabase';

const CARD = Colors.dark.card;
const BORDER = Colors.dark?.border ?? '#1F2937';
const TEXT_PRIMARY = Colors.dark.text;
const TEXT_MUTED = Colors.dark.textMuted;
const ACCENT = Colors.primary ?? Colors.dark.highlight1 ?? '#6366F1';

type LifetimeRow = {
  workouts_count: number;
  total_miles_biked: number;
  total_miles_ran: number;
  total_weight_lifted_kg: number;
};

function formatCompactInt(n: number) {
  const v = Math.round(Number.isFinite(n) ? n : 0);
  if (v >= 1_000_000) return `${Math.round(v / 100_000) / 10}M`;
  if (v >= 1_000) return `${Math.round(v / 100) / 10}k`;
  return `${v}`;
}

function formatCompact1(n: number) {
  const v = Number.isFinite(n) ? n : 0;
  const r = Math.round(v * 10) / 10;
  if (r >= 1_000) return `${Math.round(r / 100) / 10}k`;
  return `${r}`;
}

function getDeviceTimezone(): string | null {
  try {
    return Intl?.DateTimeFormat?.().resolvedOptions?.().timeZone ?? null;
  } catch {
    return null;
  }
}

function LifetimeStat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: any;
}) {
  return (
    <View style={styles.lifetimeStat}>
      <Ionicons name={icon} size={20} color={TEXT_MUTED} />
      <Text style={styles.lifetimeValue}>{value}</Text>
      <Text style={styles.lifetimeLabel}>{label}</Text>
    </View>
  );
}

export default function LifetimeStatsCard() {
  const [loading, setLoading] = useState(false);
  const [row, setRow] = useState<LifetimeRow | null>(null);

  const loadLifetime = useCallback(async () => {
    try {
      setLoading(true);

      const tz = getDeviceTimezone();

      // Ensure a row exists + returns it
      const { data, error } = await supabase.schema('user').rpc('ensure_lifetime_stats', {
        p_timezone_str: tz,
      });

      if (error) {
        console.error('[LifetimeStatsCard] ensure_lifetime_stats error:', error);
        return;
      }

      if (!data) {
        setRow(null);
        return;
      }

      setRow({
        workouts_count: Number(data.workouts_count ?? 0),
        total_miles_biked: Number(data.total_miles_biked ?? 0),
        total_miles_ran: Number(data.total_miles_ran ?? 0),
        total_weight_lifted_kg: Number(data.total_weight_lifted_kg ?? 0),
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadLifetime();
    }, [loadLifetime])
  );

  const workouts = row?.workouts_count ?? 0;
  const miles = (row?.total_miles_ran ?? 0) + (row?.total_miles_biked ?? 0);

  // Your DB stores kg; UI asks for lbs
  const lbsLifted = (row?.total_weight_lifted_kg ?? 0) * 2.2046226218;

  const workoutsText = useMemo(() => formatCompactInt(workouts), [workouts]);
  const milesText = useMemo(() => formatCompact1(miles), [miles]);
  const lbsText = useMemo(() => formatCompactInt(lbsLifted), [lbsLifted]);

  return (
    <View style={styles.lifetimeCard}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>Lifetime Stats</Text>
        {loading ? <ActivityIndicator size="small" color={ACCENT} /> : null}
      </View>

      <View style={styles.lifetimeRow}>
        <LifetimeStat label="Workouts" value={loading ? '—' : workoutsText} icon="barbell-outline" />
        <LifetimeStat label="Miles" value={loading ? '—' : milesText} icon="trail-sign-outline" />
        <LifetimeStat label="Lbs Lifted" value={loading ? '—' : lbsText} icon="fitness-outline" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  lifetimeCard: {
    backgroundColor: CARD,
    borderRadius: 16,
    padding: 10,
    marginTop: 16,
    borderWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    color: TEXT_MUTED,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  lifetimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  lifetimeStat: {
    flex: 1,
    alignItems: 'center',
  },
  lifetimeValue: {
    color: TEXT_PRIMARY,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 4,
  },
  lifetimeLabel: {
    color: TEXT_MUTED,
    fontSize: 11,
    marginTop: 2,
  },
});
