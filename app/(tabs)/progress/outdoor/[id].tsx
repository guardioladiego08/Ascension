// app/(tabs)/progress/outdoor/[id].tsx
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '@/constants/Colors';
import { GlobalStyles } from '@/constants/GlobalStyles';
import { useUnits } from '@/contexts/UnitsContext';
import { supabase } from '@/lib/supabase';
import { useSmartBack } from '@/lib/navigation/useSmartBack';

import { fetchOutdoorSession, fetchOutdoorSamples } from '@/lib/OutdoorSession/supabase';
import { formatDistance, formatDuration, formatPace } from '@/lib/OutdoorSession/compute';


import LogoHeader from '@/components/my components/logoHeader';
import MetricChartOutdoor, { type SamplePoint } from '@/components/charts/MetricLineChartOutdoor';
import RouteMapCard from './RouteMapCard';

const BG = Colors.dark.background;
const TEXT = Colors.dark.text;
const MUTED = Colors.dark.textMuted ?? '#9AA4BF';
const CARD = Colors.dark.card;
const BORDER = Colors.dark.border ?? '#1F2937';

const M_PER_MI = 1609.344;
const M_PER_KM = 1000;
const FT_PER_M = 3.28084;

function isFiniteNumber(n: any): n is number {
  return typeof n === 'number' && Number.isFinite(n);
}

function formatLoadOutdoorErr(err: any): string {
  if (!err) return 'Could not load session.';

  const code = String(err?.code ?? '').trim();
  const message = String(err?.message ?? '').trim();
  const details = String(err?.details ?? '').trim();
  const raw = `${message} ${details}`.toLowerCase();

  if (
    code === 'PGRST202' ||
    code === 'PGRST204' ||
    raw.includes('get_outdoor_session_summary_user')
  ) {
    return 'Backend outdoor summary RPC is missing. Apply migration 20260410_run_walk_summary_source_parity.sql.';
  }

  if (raw.includes('session not found')) {
    return 'This session could not be found.';
  }

  if (raw.includes('not allowed') || code === '42501') {
    return 'You do not have permission to view this session.';
  }

  if (!message) return 'Could not load session.';
  return code ? `${message} (${code})` : message;
}

/** Convert speed (m/s) -> pace (minutes per configured distance unit). */
function paceMinPerUnitFromSpeed(speedMps: number, unit: 'mi' | 'km'): number | null {
  if (!isFiniteNumber(speedMps) || speedMps <= 0) return null;
  const metersPerUnit = unit === 'mi' ? M_PER_MI : M_PER_KM;
  const secPerUnit = metersPerUnit / speedMps;
  const minPerUnit = secPerUnit / 60;
  if (!Number.isFinite(minPerUnit)) return null;
  return minPerUnit;
}

function formatMmSsFromMinutes(mins: number, suffix: '/mi' | '/km'): string {
  if (!Number.isFinite(mins) || mins <= 0) return '—';
  const totalSec = Math.round(mins * 60);
  const mm = Math.floor(totalSec / 60);
  const ss = totalSec % 60;
  return `${mm}:${String(ss).padStart(2, '0')}${suffix}`;
}

function formatElevation(meters: number, unit: 'mi' | 'km'): string {
  if (!Number.isFinite(meters)) return '—';
  if (unit === 'mi') return `${Math.round(meters * FT_PER_M)} ft`;
  return `${Math.round(meters)} m`;
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

type OutdoorSessionRow = {
  id: string;
  user_id?: string;
  activity_type: string;
  started_at?: string | null;
  ended_at?: string | null;
  duration_s: number;
  distance_m: number;
  elev_gain_m?: number | null;
  avg_pace_s_per_km?: number | null;
  avg_speed_mps?: number | null;
};

function parseOutdoorSampleRows(value: unknown): any[] {
  if (!Array.isArray(value)) return [];
  return value.map((row: any) => ({
    ts: row?.ts ?? null,
    elapsed_s: Number(row?.elapsed_s ?? 0),
    lat: row?.lat == null ? null : Number(row.lat),
    lon: row?.lon == null ? null : Number(row.lon),
    altitude_m: row?.altitude_m == null ? null : Number(row.altitude_m),
    accuracy_m: row?.accuracy_m == null ? null : Number(row.accuracy_m),
    speed_mps: row?.speed_mps == null ? null : Number(row.speed_mps),
    bearing_deg: row?.bearing_deg == null ? null : Number(row.bearing_deg),
    hr_bpm: row?.hr_bpm == null ? null : Number(row.hr_bpm),
    cadence_spm: row?.cadence_spm == null ? null : Number(row.cadence_spm),
    grade_pct: row?.grade_pct == null ? null : Number(row.grade_pct),
    distance_m: row?.distance_m == null ? null : Number(row.distance_m),
    is_moving: row?.is_moving == null ? null : Boolean(row.is_moving),
    source: row?.source ?? null,
  }));
}

export default function OutdoorSummaryScreen() {
  const { goBackSmart } = useSmartBack();
  const { id, postId } = useLocalSearchParams<{ id?: string; postId?: string }>();
  const { distanceUnit } = useUnits();
  const sessionId =
    typeof id === 'string' ? id : Array.isArray(id) ? id[0] : '';
  const postIdParam =
    typeof postId === 'string' ? postId : Array.isArray(postId) ? postId[0] : null;

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<OutdoorSessionRow | null>(null);
  const [samples, setSamples] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        if (!sessionId) throw new Error('Missing session id');
        setLoading(true);
        await supabase.auth.getUser();

        let rpc = await supabase.rpc('get_outdoor_session_summary_user', {
          p_session_id: sessionId,
          p_post_id: postIdParam ?? null,
        });

        const rpcUnavailable =
          rpc.error &&
          (String(rpc.error?.code ?? '') === 'PGRST202' ||
            String(rpc.error?.code ?? '') === 'PGRST204' ||
            String(rpc.error?.message ?? '').includes('get_outdoor_session_summary_user'));

        if (rpcUnavailable) {
          rpc = await supabase.rpc('get_outdoor_session_summary_user', {
            p_session_id: sessionId,
          });
        }

        if (!rpc.error) {
          const row = Array.isArray(rpc.data) ? rpc.data[0] : rpc.data;
          if (!row) throw new Error('Session not found');
          if (!mounted) return;
          setSession({
            id: String((row as any).session_id),
            user_id: String((row as any).owner_id),
            activity_type: String((row as any).activity_type ?? 'run'),
            started_at: (row as any).started_at ?? null,
            ended_at: (row as any).ended_at ?? null,
            duration_s: Number((row as any).duration_s ?? 0),
            distance_m: Number((row as any).distance_m ?? 0),
            elev_gain_m: (row as any).elev_gain_m == null ? null : Number((row as any).elev_gain_m),
            avg_pace_s_per_km:
              (row as any).avg_pace_s_per_km == null
                ? null
                : Number((row as any).avg_pace_s_per_km),
            avg_speed_mps:
              (row as any).avg_speed_mps == null ? null : Number((row as any).avg_speed_mps),
          });
          setSamples(parseOutdoorSampleRows((row as any).samples));
          return;
        }

        const s = await fetchOutdoorSession(sessionId);
        const pts = await fetchOutdoorSamples(sessionId);
        if (!mounted) return;
        setSession({
          ...(s as any),
          id: String((s as any).id),
          user_id: String((s as any).user_id ?? ''),
          activity_type: String((s as any).activity_type ?? 'run'),
          duration_s: Number((s as any).duration_s ?? 0),
          distance_m: Number((s as any).distance_m ?? 0),
          elev_gain_m: (s as any).elev_gain_m == null ? null : Number((s as any).elev_gain_m),
          avg_pace_s_per_km:
            (s as any).avg_pace_s_per_km == null ? null : Number((s as any).avg_pace_s_per_km),
          avg_speed_mps:
            (s as any).avg_speed_mps == null ? null : Number((s as any).avg_speed_mps),
        });
        setSamples(Array.isArray(pts) ? pts : []);
      } finally {
        if (mounted) setLoading(false);
      }
    })().catch((error) => {
      console.warn('[OutdoorSummaryScreen] load failed', error);
      Alert.alert('Error', formatLoadOutdoorErr(error));
      goBackSmart({ fallbackHref: '/progress' });
    });

    return () => {
      mounted = false;
    };
  }, [goBackSmart, postIdParam, sessionId]);

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

        const paceMin = paceMinPerUnitFromSpeed(speed, distanceUnit);
        if (paceMin == null) return null;

        const tSec = Math.max(0, (tMs as number) - t0Ms) / 1000;
        return { t: tSec, v: paceMin };
      })
      .filter(Boolean) as SamplePoint[];
  }, [samples, t0Ms, distanceUnit]);

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

  if (!session) {
    return (
      <LinearGradient colors={['#3a3a3bff', '#1e1e1eff', BG]} style={{ flex: 1 }}>
        <View style={[GlobalStyles.safeArea, { justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={{ color: TEXT }}>Session not found.</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#3a3a3bff', '#1e1e1eff', BG]} style={{ flex: 1 }}>
      <View style={GlobalStyles.safeArea}>
        <LogoHeader />

        <View style={styles.topBar}>
          <Ionicons
            name="chevron-back"
            size={20}
            color={TEXT}
            onPress={() => goBackSmart({ fallbackHref: '/progress' })}
          />
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
                <Text style={styles.heroValue}>{formatDistance(distanceM, distanceUnit)}</Text>
                <Text style={styles.heroLabel}>DISTANCE</Text>
              </View>
              <View style={styles.heroBlock}>
                <Text style={styles.heroValue}>{formatDuration(durationS)}</Text>
                <Text style={styles.heroLabel}>TIME</Text>
              </View>
              <View style={styles.heroBlock}>
                <Text style={styles.heroValue}>{formatPace(avgPace, distanceUnit)}</Text>
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
              valueFormatter={(v) => formatMmSsFromMinutes(v, distanceUnit === 'mi' ? '/mi' : '/km')}
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
              valueFormatter={(v) => formatElevation(v, distanceUnit)}
              xLabelFormatter={(tSec) => `${Math.round(tSec / 60)}m`}
              yMaxExtra={-1}
              targetXLabels={6}
            />

          </View>

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
