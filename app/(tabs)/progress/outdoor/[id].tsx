// app/(tabs)/progress/outdoor/[id].tsx
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '@/constants/Colors';
import { GlobalStyles } from '@/constants/GlobalStyles';

import { fetchOutdoorSession, fetchOutdoorSamples } from '@/lib/outdoor/supabase';
import { formatDistance, formatDuration, formatPace } from '@/lib/outdoor/compute';

import LogoHeader from '@/components/my components/logoHeader';
import SplitsList from '../../add/Cardio/outdoor/SplitsList';
import MetricChartOutdoor, { type SamplePoint } from '@/components/charts/MetricLineChartOutdoor';
import RouteMapCard from './RouteMapCard';

const BG = Colors.dark.background;
const TEXT = Colors.dark.text;
const MUTED = Colors.dark.textMuted ?? '#9AA4BF';
const CARD = Colors.dark.card;
const BORDER = Colors.dark.border ?? '#1F2937';

const M_PER_MI = 1609.344;

function isFiniteNumber(n: any): n is number {
  return typeof n === 'number' && Number.isFinite(n);
}

/** Convert speed (m/s) -> pace (minutes per mile). */
function paceMinPerMileFromSpeed(speedMps: number): number | null {
  if (!isFiniteNumber(speedMps) || speedMps <= 0) return null;
  const secPerMile = M_PER_MI / speedMps;
  const minPerMile = secPerMile / 60;
  if (!Number.isFinite(minPerMile)) return null;
  return minPerMile;
}

function formatMmSsFromMinutes(mins: number): string {
  if (!Number.isFinite(mins) || mins <= 0) return '—';
  const totalSec = Math.round(mins * 60);
  const mm = Math.floor(totalSec / 60);
  const ss = totalSec % 60;
  return `${mm}:${String(ss).padStart(2, '0')}/mi`;
}

function formatElevationMeters(m: number): string {
  if (!Number.isFinite(m)) return '—';
  return `${Math.round(m)} m`;
}

/** Robustly extract lat/lon from a sample row (supports multiple naming conventions). */
function extractRouteCoords(samples: any[]): { lat: number; lon: number }[] {
  const out: { lat: number; lon: number }[] = [];
  for (const r of samples ?? []) {
    const lat = r?.lat ?? r?.latitude ?? r?.latitude_deg;
    const lon = r?.lon ?? r?.lng ?? r?.longitude ?? r?.longitude_deg;
    if (isFiniteNumber(lat) && isFiniteNumber(lon)) out.push({ lat, lon });
  }
  return out;
}

export default function OutdoorSummaryScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [samples, setSamples] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        const s = await fetchOutdoorSession(id);
        const pts = await fetchOutdoorSamples(id);
        if (!mounted) return;
        setSession(s);
        setSamples(Array.isArray(pts) ? pts : []);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [id]);

  const coords = useMemo(() => extractRouteCoords(samples), [samples]);

  // Use first sample timestamp as "t=0" origin for the charts.
  const t0Ms = useMemo(() => {
    const first = samples?.[0]?.ts ? new Date(samples[0].ts).getTime() : null;
    return Number.isFinite(first) ? (first as number) : null;
  }, [samples]);

  const pacePoints: SamplePoint[] = useMemo(() => {
    if (!t0Ms) return [];
    return (samples ?? [])
      .map((r) => {
        const tMs = r?.ts ? new Date(r.ts).getTime() : null;
        const speed = r?.speed_mps;
        if (!Number.isFinite(tMs) || !isFiniteNumber(speed)) return null;

        const paceMin = paceMinPerMileFromSpeed(speed);
        if (paceMin == null) return null;

        const tSec = Math.max(0, (tMs as number) - t0Ms) / 1000;
        return { t: tSec, v: paceMin };
      })
      .filter(Boolean) as SamplePoint[];
  }, [samples, t0Ms]);

  const elevationPoints: SamplePoint[] = useMemo(() => {
    if (!t0Ms) return [];
    return (samples ?? [])
      .map((r) => {
        const tMs = r?.ts ? new Date(r.ts).getTime() : null;
        const altM = r?.altitude_m; // adjust if your column name differs
        if (!Number.isFinite(tMs) || !isFiniteNumber(altM)) return null;

        const tSec = Math.max(0, (tMs as number) - t0Ms) / 1000;
        return { t: tSec, v: altM };
      })
      .filter(Boolean) as SamplePoint[];
  }, [samples, t0Ms]);

  const distanceM = session?.distance_m ?? 0;
  const durationS = session?.duration_s ?? 0;
  const avgPace = session?.avg_pace_s_per_km ?? null;

  if (loading) {
    return (
      <LinearGradient colors={['#3a3a3bff', '#1e1e1eff', BG]} style={{ flex: 1 }}>
        <View style={[GlobalStyles.safeArea, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator />
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#3a3a3bff', '#1e1e1eff', BG]} style={{ flex: 1 }}>
      <View style={GlobalStyles.safeArea}>
        <LogoHeader />

        <View style={styles.topBar}>
          <Ionicons name="chevron-back" size={20} color={TEXT} onPress={() => router.back()} />
          <Text style={styles.topTitle}>SESSION SUMMARY</Text>
          <View style={{ width: 20 }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: 6 }} showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <Text style={styles.heroTitle}>
              {String(session?.activity_type ?? 'run').toUpperCase()}
            </Text>

            <View style={styles.heroRow}>
              <View style={styles.heroBlock}>
                <Text style={styles.heroValue}>{formatDistance(distanceM, 'mi')}</Text>
                <Text style={styles.heroLabel}>DISTANCE</Text>
              </View>
              <View style={styles.heroBlock}>
                <Text style={styles.heroValue}>{formatDuration(durationS)}</Text>
                <Text style={styles.heroLabel}>TIME</Text>
              </View>
              <View style={styles.heroBlock}>
                <Text style={styles.heroValue}>{formatPace(avgPace, 'mi')}</Text>
                <Text style={styles.heroLabel}>AVG PACE</Text>
              </View>
            </View>
          </View>

          {/* Route map (your RouteMapCard should accept coords: {lat, lon}[]) */}
          <RouteMapCard coords={coords} />

          <View style={styles.card}>
            <MetricChartOutdoor
              title="Pace"
              color={Colors.dark.highlight1}
              points={pacePoints}
              cardBg={Colors.dark.card}
              textColor={Colors.dark.text}
              valueTransform={(v) => -v}
              valueInverseTransform={(v) => -v}
              valueFormatter={formatMmSsFromMinutes}
              xLabelFormatter={(tSec) => `${Math.round(tSec / 60)}m`}
              yRangePadSeconds={0}
              targetXLabels={6}
            />
            <Text style={styles.note}>
              Pace is derived from GPS speed; expect noise in tunnels and dense areas.
            </Text>
          </View>

          <View style={styles.card}>
            <MetricChartOutdoor
              title="Elevation"
              color={Colors.dark.highlight1}
              points={elevationPoints}
              cardBg={Colors.dark.card}
              textColor={Colors.dark.text}
              valueFormatter={formatElevationMeters}
              xLabelFormatter={(tSec) => `${Math.round(tSec / 60)}m`}
              yMaxExtra={-1}
              targetXLabels={6}
            />

          </View>

          <SplitsList splits={session?.splits ?? []} />
        </ScrollView>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  topBar: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topTitle: { color: TEXT, fontWeight: '900', letterSpacing: 0.8 },

  hero: {
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 18,
    padding: 16,
  },
  heroTitle: { color: TEXT, fontWeight: '900', fontSize: 16, letterSpacing: 1.1 },
  heroRow: { flexDirection: 'row', marginTop: 14, gap: 12 },
  heroBlock: { flex: 1 },
  heroValue: { color: TEXT, fontWeight: '900', fontSize: 14 },
  heroLabel: { color: MUTED, marginTop: 5, fontSize: 10, fontWeight: '800', letterSpacing: 1.0 },

  card: {
    marginTop: 12,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 18,
    padding: 14,
  },
  note: { color: MUTED, marginTop: 8, fontSize: 12, lineHeight: 16 },
});
