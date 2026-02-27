import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '@/constants/Colors';
import LogoHeader from '@/components/my components/logoHeader';
import { supabase } from '@/lib/supabase';
import MetricChart, { type SamplePoint } from '@/components/charts/MetricLineChart';
import { LinearGradient } from 'expo-linear-gradient';
import DeleteConfirmModal from './DeleteConfirmModal';
import { useUnits } from '@/contexts/UnitsContext';

const BG = Colors.dark.background;
const CARD = Colors.dark.card;
const TEXT = Colors.dark.text;
const DANGER = '#EF4444';

const M_PER_MI = 1609.344;
const M_PER_KM = 1000;
const MPH_PER_MPS = 2.236936;
const KMH_PER_MPS = 3.6;
const FT_PER_M = 3.28084;




function formatClock(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatPace(secondsPerUnit: number | null, suffix: '/mi' | '/km') {
  if (!secondsPerUnit || secondsPerUnit <= 0) return `— ${suffix}`;
  const m = Math.floor(secondsPerUnit / 60);
  const s = Math.round(secondsPerUnit % 60);
  return `${m}:${String(s).padStart(2, '0')} ${suffix}`;
}

function formatDistance(meters: number, unit: 'mi' | 'km') {
  if (unit === 'km') return `${(meters / M_PER_KM).toFixed(2)} KM`;
  return `${(meters / M_PER_MI).toFixed(2)} MI`;
}

function formatElevation(meters: number, unit: 'mi' | 'km') {
  if (unit === 'mi') return `${Math.round(meters * FT_PER_M)} ft`;
  return `${Math.round(meters)} m`;
}

type SessionRow = {
  id: string;
  user_id?: string;
  exercise_type: string;
  total_time_s: number;
  total_distance_m: number;
  total_elevation_m: number;
  avg_pace_s_per_mi: number | null;
  avg_pace_s_per_km: number | null;
};

type SampleRow = {
  elapsed_s: number;
  pace_s_per_mi: number | null;
  pace_s_per_km: number | null;
  speed_mps: number | null;
  elevation_m: number | null;
  incline_deg: number | null;
};

function formatLoadSessionErr(err: any): string {
  if (!err) return 'Could not load session.';

  const code = String(err?.code ?? '').trim();
  const message = String(err?.message ?? '').trim();
  const details = String(err?.details ?? '').trim();
  const raw = `${message} ${details}`.toLowerCase();

  if (
    code === 'PGRST202' ||
    code === 'PGRST204' ||
    raw.includes('get_run_walk_session_summary_user')
  ) {
    return 'Backend summary RPC is missing. Apply migration 20260227_shared_workout_summary_rpcs.sql.';
  }

  if (code === '42804' || raw.includes('structure of query does not match function result type')) {
    return 'Backend summary RPC is outdated (42804). Apply migration 20260228_fix_run_walk_summary_rpc_return_types.sql (or compatibility file 20260227_fix_run_walk_summary_rpc_return_types.sql).';
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

function parseSampleRows(value: unknown): SampleRow[] {
  if (!Array.isArray(value)) return [];
  return value.map((row: any) => ({
    elapsed_s: Number(row?.elapsed_s ?? 0),
    pace_s_per_mi: row?.pace_s_per_mi == null ? null : Number(row.pace_s_per_mi),
    pace_s_per_km: row?.pace_s_per_km == null ? null : Number(row.pace_s_per_km),
    speed_mps: row?.speed_mps == null ? null : Number(row.speed_mps),
    elevation_m: row?.elevation_m == null ? null : Number(row.elevation_m),
    incline_deg: row?.incline_deg == null ? null : Number(row.incline_deg),
  }));
}

export default function RunWalkSessionSummary() {
  const router = useRouter();
  const { sessionId, postId } = useLocalSearchParams<{ sessionId?: string; postId?: string }>();
  const { distanceUnit } = useUnits();

  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [session, setSession] = useState<SessionRow | null>(null);
  const [samples, setSamples] = useState<SampleRow[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [canDelete, setCanDelete] = useState(false);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        if (!sessionId) throw new Error('Missing session id');

        const meRes = await supabase.auth.getUser();
        const meId = meRes.data.user?.id ?? null;

        const directSession = await supabase
          .schema('run_walk')
          .from('sessions')
          .select(
            'id, user_id, exercise_type, total_time_s, total_distance_m, total_elevation_m, avg_pace_s_per_mi, avg_pace_s_per_km'
          )
          .eq('id', sessionId)
          .maybeSingle();

        if (!directSession.error && directSession.data) {
          const directSamples = await supabase
            .schema('run_walk')
            .from('samples')
            .select('elapsed_s, pace_s_per_mi, pace_s_per_km, speed_mps, elevation_m, incline_deg')
            .eq('session_id', sessionId)
            .order('elapsed_s');

          if (!directSamples.error) {
            if (!mounted) return;
            setSession(directSession.data as SessionRow);
            setSamples((directSamples.data ?? []) as SampleRow[]);
            setCanDelete(!!meId && String((directSession.data as any).user_id ?? '') === meId);
            return;
          }
        }

        // Fallback for accepted followers (or any RLS-restricted reads):
        // use security-definer RPC with social visibility checks.
        let rpc = await supabase.rpc('get_run_walk_session_summary_user', {
          p_session_id: sessionId,
          p_post_id: postId ?? null,
        });
        if (
          rpc.error &&
          (String(rpc.error?.code ?? '') === 'PGRST202' || String(rpc.error?.message ?? '').includes('get_run_walk_session_summary_user'))
        ) {
          // Backward compatibility with older backend signature (single argument).
          rpc = await supabase.rpc('get_run_walk_session_summary_user', {
            p_session_id: sessionId,
          });
        }
        if (rpc.error) {
          throw rpc.error;
        }

        const row = Array.isArray(rpc.data) ? rpc.data[0] : rpc.data;
        if (!row) throw new Error('Session not found');

        if (!mounted) return;
        setSession({
          id: String((row as any).session_id),
          user_id: String((row as any).owner_id),
          exercise_type: String((row as any).exercise_type ?? ''),
          total_time_s: Number((row as any).total_time_s ?? 0),
          total_distance_m: Number((row as any).total_distance_m ?? 0),
          total_elevation_m: Number((row as any).total_elevation_m ?? 0),
          avg_pace_s_per_mi:
            (row as any).avg_pace_s_per_mi == null ? null : Number((row as any).avg_pace_s_per_mi),
          avg_pace_s_per_km:
            (row as any).avg_pace_s_per_km == null ? null : Number((row as any).avg_pace_s_per_km),
        });
        setSamples(parseSampleRows((row as any).samples));
        setCanDelete(Boolean((row as any).can_delete));
      } catch (e) {
        console.warn('[RunWalkSessionSummary] load failed', e);
        Alert.alert('Error', formatLoadSessionErr(e));
        router.back();
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [sessionId, postId, router]);

  const title = useMemo(() => {
    if (!session) return '';
    if (session.exercise_type?.includes('walk')) return 'WALK SUMMARY';
    if (session.exercise_type?.includes('run')) return 'RUN SUMMARY';
    return 'RUN / WALK SUMMARY';
  }, [session]);

  const pacePoints: SamplePoint[] = useMemo(
    () =>
      samples
        .map((s) => ({
          t: s.elapsed_s,
          v: distanceUnit === 'mi' ? s.pace_s_per_mi : s.pace_s_per_km,
        }))
        .filter((s) => s.v != null && s.v > 0) as SamplePoint[],
    [samples, distanceUnit]
  );

  const speedPoints: SamplePoint[] = useMemo(
    () =>
      samples
        .filter((s) => s.speed_mps != null)
        .map((s) => ({
          t: s.elapsed_s,
          v: s.speed_mps! * (distanceUnit === 'mi' ? MPH_PER_MPS : KMH_PER_MPS),
        })),
    [samples, distanceUnit]
  );

  const elevationPoints: SamplePoint[] = useMemo(
    () =>
      samples
        .filter((s) => s.elevation_m != null)
        .map((s) => ({
          t: s.elapsed_s,
          v: distanceUnit === 'mi' ? s.elevation_m! * FT_PER_M : s.elevation_m!,
        })),
    [samples, distanceUnit]
  );

  if (loading || !session) {
    return (
      <View style={[styles.safe, styles.centered]}>
        <ActivityIndicator />
      </View>
    );
  }

  const avgPaceForUnit = distanceUnit === 'mi'
    ? session.avg_pace_s_per_mi
    : session.avg_pace_s_per_km;

  return (
    <LinearGradient
      colors={['#3a3a3bff', '#1e1e1eff', BG]}
      style={{ flex: 1 }}
    >
      <View style={styles.safe}>
        <LogoHeader showBackButton />
        {/* Header */}
        <View style={styles.header}>

          <View style={styles.headerCenter}>
            <Text style={styles.headerLabel}>SUMMARY</Text>
            <Text style={styles.headerTitle}>{title}</Text>
          </View>

          {canDelete ? (
            <TouchableOpacity
              style={[styles.trashBtn, deleting && { opacity: 0.6 }]}
              onPress={() => setShowDeleteModal(true)}
              disabled={deleting}
            >
              <Ionicons name="trash-outline" size={20} color="#EF4444" />
            </TouchableOpacity>
          ) : null}

        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            <Row label="Total Time" value={formatClock(session.total_time_s)} />
            <Row label="Distance" value={formatDistance(session.total_distance_m, distanceUnit)} />
            <Row
              label="Elevation Gain"
              value={formatElevation(session.total_elevation_m, distanceUnit)}
            />
            <Row
              label="Avg Pace"
              value={formatPace(avgPaceForUnit, distanceUnit === 'mi' ? '/mi' : '/km')}
            />
          </View>

          <View style={styles.chartsWrap}>
            <MetricChart
              title={`Pace Over Time (${distanceUnit === 'mi' ? '/mi' : '/km'})`}
              color={Colors.dark.highlight1}
              points={pacePoints}
              cardBg={CARD}
              textColor={TEXT}
              hideDataPoints
            />

            <MetricChart
              title={`Speed Over Time (${distanceUnit === 'mi' ? 'mph' : 'km/h'})`}
              color={Colors.dark.highlight4}
              points={speedPoints}
              cardBg={CARD}
              textColor={TEXT}
              hideDataPoints
            />

            <MetricChart
              title={`Elevation Over Time (${distanceUnit === 'mi' ? 'ft' : 'm'})`}
              color={Colors.dark.highlight2}
              points={elevationPoints}
              cardBg={CARD}
              textColor={TEXT}
              hideDataPoints
            />
          </View>

          <View style={{ height: 24 }} />
        </ScrollView>
      </View>
      {canDelete ? (
        <DeleteConfirmModal
          visible={showDeleteModal}
          onCancel={() => setShowDeleteModal(false)}
          onDelete={async () => {
            try {
              setDeleting(true);
              setShowDeleteModal(false);

              const { error } = await supabase
                .schema('run_walk')
                .from('sessions')
                .delete()
                .eq('id', sessionId);

              if (error) {
                Alert.alert('Error', 'Could not delete session.');
                return;
              }

              router.back();
            } finally {
              setDeleting(false);
            }
          }}
        />
      ) : null}
    </LinearGradient>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  centered: { alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  headerCenter: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    pointerEvents: 'none',
  },
  headerLabel: {
    fontSize: 11,
    letterSpacing: 2,
    opacity: 0.6,
    color: TEXT,
    fontWeight: '700',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.dark.highlight1,
  },

  trashBtn: {
    marginLeft: 'auto',
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: DANGER,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },

  card: {
    marginTop: 8,
    marginHorizontal: 16,
    backgroundColor: CARD,
    borderRadius: 18,
    padding: 16,
    gap: 12,
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rowLabel: {
    color: TEXT,
    opacity: 0.7,
    fontSize: 12,
    fontWeight: '800',
  },
  rowValue: {
    color: TEXT,
    fontSize: 14,
    fontWeight: '900',
  },

  chartsWrap: {
    marginTop: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
});
