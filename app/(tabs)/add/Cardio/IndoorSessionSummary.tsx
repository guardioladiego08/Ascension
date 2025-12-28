import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '@/constants/Colors';
import LogoHeader from '@/components/my components/logoHeader';
import { supabase } from '@/lib/supabase';

import {
  getDraft,
  deleteDraft,
  type RunWalkDraft,
} from '@/lib/runWalkDraftStore';

import MetricChart, { type SamplePoint } from '@/components/charts/MetricLineChart';
import DeleteDraftConfirmModal from './run_walk/DeleteDraftConfirmModal';

const BG = Colors.dark.background;
const CARD = Colors.dark.card;
const TEXT = Colors.dark.text;

const M_PER_MI = 1609.344;
const M_PER_KM = 1000;

const MPH_PER_MPS = 2.236936;
const KMH_PER_MPS = 3.6;

function formatClock(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function mToDisplay(meters: number, unit: 'mi' | 'km') {
  return unit === 'mi' ? meters / M_PER_MI : meters / M_PER_KM;
}

function formatPace(secondsPerUnit: number | null, suffix: '/mi' | '/km') {
  if (secondsPerUnit == null || !Number.isFinite(secondsPerUnit) || secondsPerUnit <= 0) return `— ${suffix}`;
  const mm = Math.floor(secondsPerUnit / 60);
  const ss = Math.round(secondsPerUnit % 60);
  return `${mm}:${String(ss).padStart(2, '0')} ${suffix}`;
}

export default function IndoorSessionSummary() {
  const router = useRouter();
  const params = useLocalSearchParams<{ draftId?: string }>();
  const draftId = params.draftId;

  const [draft, setDraft] = useState<RunWalkDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ✅ Delete confirmation modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        if (!draftId) {
          Alert.alert('Error', 'Missing draft.');
          router.back();
          return;
        }

        const d = await getDraft(draftId);
        if (!mounted) return;

        if (!d) {
          Alert.alert('Error', 'Draft not found (it may have been deleted).');
          router.back();
          return;
        }

        setDraft(d);
        console.log('[IndoorSessionSummary] draftId:', draftId);
        console.log('[IndoorSessionSummary] loaded draft:', d);
        console.log('[IndoorSessionSummary] samples length:', d?.samples?.length);
        console.log('[IndoorSessionSummary] first sample:', d?.samples?.[0]);
        console.log('[IndoorSessionSummary] last sample:', d?.samples?.[d.samples.length - 1]);
      } catch (e) {
        console.log('[IndoorSessionSummary] load error', e);
        Alert.alert('Error', 'Could not load summary.');
        router.back();
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [draftId, router]);

  const distUnit = draft?.distance_unit ?? 'mi';
  const distLabelUnit = distUnit === 'mi' ? 'MI' : 'KM';

  const title = useMemo(() => {
    if (!draft) return 'SESSION SUMMARY';
    switch (draft.exercise_type) {
      case 'indoor_walk':
        return 'INDOOR WALK SUMMARY';
      case 'indoor_run':
      default:
        return 'INDOOR RUN SUMMARY';
    }
  }, [draft]);

  const displayDistance = draft ? mToDisplay(draft.total_distance_m, distUnit) : 0;

  const avgPaceText =
    distUnit === 'mi'
      ? formatPace(draft?.avg_pace_s_per_mi ?? null, '/mi')
      : formatPace(draft?.avg_pace_s_per_km ?? null, '/km');

  // -----------------------------
  // Charts: build series from draft.samples (before saving)
  // -----------------------------
  const elapsedLabel = useMemo(() => {
    return (tSeconds: number) => formatClock(Math.round(tSeconds));
  }, []);

  const pacePoints: SamplePoint[] = useMemo(() => {
    if (!draft?.samples?.length) return [];
    if (distUnit === 'mi') {
      return draft.samples
        .filter((s: any) => Number.isFinite(s.pace_s_per_mi) && s.pace_s_per_mi > 0)
        .map((s: any) => ({ t: Number(s.elapsed_s ?? 0), v: Number(s.pace_s_per_mi) }));
    }
    return draft.samples
      .filter((s: any) => Number.isFinite(s.pace_s_per_km) && s.pace_s_per_km > 0)
      .map((s: any) => ({ t: Number(s.elapsed_s ?? 0), v: Number(s.pace_s_per_km) }));
  }, [draft?.samples, distUnit]);

  const speedPoints: SamplePoint[] = useMemo(() => {
    if (!draft?.samples?.length) return [];
    const mult = distUnit === 'mi' ? MPH_PER_MPS : KMH_PER_MPS;
    return draft.samples
      .filter((s: any) => Number.isFinite(s.speed_mps) && s.speed_mps >= 0)
      .map((s: any) => ({ t: Number(s.elapsed_s ?? 0), v: Number(s.speed_mps) * mult }));
  }, [draft?.samples, distUnit]);

  const elevationPoints: SamplePoint[] = useMemo(() => {
    if (!draft?.samples?.length) return [];
    return draft.samples
      .filter((s: any) => Number.isFinite(s.elevation_m))
      .map((s: any) => ({ t: Number(s.elapsed_s ?? 0), v: Number(s.elevation_m) }));
  }, [draft?.samples]);

  const inclinePoints: SamplePoint[] = useMemo(() => {
    if (!draft?.samples?.length) return [];
    return draft.samples
      .filter((s: any) => Number.isFinite(s.incline_deg))
      .map((s: any) => ({ t: Number(s.elapsed_s ?? 0), v: Number(s.incline_deg) }));
  }, [draft?.samples]);

  const paceFormatter = useMemo(() => {
    const suffix = distUnit === 'mi' ? '/mi' : '/km';
    return (v: number) => {
      if (!Number.isFinite(v) || v <= 0) return '—';
      const mm = Math.floor(v / 60);
      const ss = Math.round(v % 60);
      return `${mm}:${String(ss).padStart(2, '0')} ${suffix}`;
    };
  }, [distUnit]);

  const speedFormatter = useMemo(() => {
    return (v: number) => (Number.isFinite(v) ? v.toFixed(1) : '—');
  }, []);

  // ✅ Delete draft (now triggered only after confirmation modal)
  const onDeleteConfirmed = useCallback(async () => {
    if (!draftId) return;
    try {
      setDeleting(true);
      await deleteDraft(draftId);
      setShowDeleteModal(false);
      router.back();
    } catch (e) {
      console.log('[IndoorSessionSummary] delete error', e);
      Alert.alert('Error', 'Could not delete draft.');
    } finally {
      setDeleting(false);
    }
  }, [draftId, router]);

  const onSave = async () => {
    if (!draftId || !draft) return;

    try {
      setSaving(true);

      // 1) insert session
      const { data: inserted, error: insErr } = await supabase
        .schema('run_walk')
        .from('sessions')
        .insert({
          exercise_type: draft.exercise_type,
          status: 'finished',
          ended_at: draft.ended_at,
          total_time_s: draft.total_time_s,
          total_distance_m: draft.total_distance_m,
          total_elevation_m: draft.total_elevation_m,
          avg_speed_mps: draft.avg_speed_mps,
          avg_pace_s_per_km: draft.avg_pace_s_per_km,
          avg_pace_s_per_mi: draft.avg_pace_s_per_mi,
        })
        .select('id')
        .single();

      if (insErr || !inserted?.id) {
        console.log('[IndoorSessionSummary] session insert error', insErr);
        Alert.alert('Error', 'Could not save session. Please try again.');
        return;
      }

      const sessionId = inserted.id as string;

      // 2) insert samples
      if (draft.samples?.length) {
        const rows = draft.samples.map((s: any) => ({
          session_id: sessionId,
          seq: s.seq,
          elapsed_s: s.elapsed_s,
          distance_m: s.distance_m,
          speed_mps: s.speed_mps,
          pace_s_per_km: s.pace_s_per_km,
          pace_s_per_mi: s.pace_s_per_mi,
          incline_deg: s.incline_deg,
          elevation_m: s.elevation_m,
        }));

        const { error: sampErr } = await supabase
          .schema('run_walk')
          .from('samples')
          .insert(rows);

        if (sampErr) {
          console.log('[IndoorSessionSummary] samples insert error', sampErr);
          // session is saved; do not block exit
        }
      }

      // 3) delete local draft
      await deleteDraft(draftId);

      Alert.alert('Saved', 'Your session has been saved.');
      router.back();
    } catch (e) {
      console.log('[IndoorSessionSummary] save unexpected error', e);
      Alert.alert('Error', 'Could not save session.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.safe, styles.centered]}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!draft) {
    return (
      <View style={[styles.safe, styles.centered]}>
        <Text style={{ color: TEXT }}>Draft not found.</Text>
      </View>
    );
  }

  const speedUnitSuffix = distUnit === 'mi' ? 'mph' : 'km/h';
  const paceSuffix = distUnit === 'mi' ? '/mi' : '/km';

  return (
    <View style={styles.safe}>
      <View style={styles.logoWrap}>
        <LogoHeader />
      </View>

      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color={TEXT} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.currentLabel}>SUMMARY</Text>
          <Text style={styles.title}>{title}</Text>
        </View>

        <View style={styles.iconBtnSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Row label="Total Time" value={formatClock(draft.total_time_s)} />
          <Row label="Total Distance" value={`${displayDistance.toFixed(2)} ${distLabelUnit}`} />
          <Row label="Elevation Gain" value={`${draft.total_elevation_m.toFixed(0)} m`} />
          <Row label="Avg Pace" value={avgPaceText} />
        </View>

        <View style={styles.chartsWrap}>
          <MetricChart
            title={`Pace Over Time (${paceSuffix})`}
            color={Colors.dark.highlight1}
            points={pacePoints}
            cardBg={CARD}
            textColor={TEXT}
            valueFormatter={paceFormatter}
            xLabelFormatter={elapsedLabel}
            yClampMin={1}
            noOfSections={5}
            showGrid={false}
            showYAxisIndices={false}
            showXAxisIndices={false}
            hideDataPoints
          />

          <MetricChart
            title={`Speed Over Time (${speedUnitSuffix})`}
            color={Colors.dark.highlight4 ?? Colors.dark.highlight1}
            points={speedPoints}
            cardBg={CARD}
            textColor={TEXT}
            valueFormatter={speedFormatter}
            xLabelFormatter={elapsedLabel}
            unitSuffix={speedUnitSuffix}
            yClampMin={0}
            noOfSections={4}
            showGrid={false}
            showYAxisIndices={false}
            showXAxisIndices={false}
            hideDataPoints
          />

          <MetricChart
            title="Elevation Over Time (m)"
            color={Colors.dark.highlight2 ?? Colors.dark.highlight1}
            points={elevationPoints}
            cardBg={CARD}
            textColor={TEXT}
            valueFormatter={(v) => (Number.isFinite(v) ? v.toFixed(1) : '—')}
            xLabelFormatter={elapsedLabel}
            noOfSections={4}
            showGrid={false}
            showYAxisIndices={false}
            showXAxisIndices={false}
            hideDataPoints
          />

          <MetricChart
            title="Incline Over Time (deg)"
            color={Colors.dark.highlight3 ?? Colors.dark.highlight1}
            points={inclinePoints}
            cardBg={CARD}
            textColor={TEXT}
            valueFormatter={(v) => (Number.isFinite(v) ? v.toFixed(1) : '—')}
            xLabelFormatter={elapsedLabel}
            noOfSections={4}
            showGrid={false}
            showYAxisIndices={false}
            showXAxisIndices={false}
            hideDataPoints
          />
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            activeOpacity={0.9}
            style={[styles.saveBtn, saving && { opacity: 0.6 }]}
            onPress={onSave}
            disabled={saving || deleting}
          >
            {saving ? (
              <ActivityIndicator />
            ) : (
              <>
                <Ionicons name="save-outline" size={18} color="#0E151F" />
                <Text style={styles.saveText}>Save</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.9}
            style={[styles.deleteBtn, (saving || deleting) && { opacity: 0.6 }]}
            onPress={() => setShowDeleteModal(true)}
            disabled={saving || deleting}
          >
            <Ionicons name="trash-outline" size={18} color="#e04b4b" />
            <Text style={styles.deleteText}>Delete</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 18 }} />
      </ScrollView>

      {/* ✅ Delete confirmation modal */}
      <DeleteDraftConfirmModal
        visible={showDeleteModal}
        isBusy={deleting}
        onCancel={() => setShowDeleteModal(false)}
        onConfirm={onDeleteConfirmed}
        title="Delete this session draft?"
        message="If you delete this draft, the data will be lost forever. This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
      />
    </View>
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
  safe: { flex: 1, backgroundColor: BG },
  centered: { alignItems: 'center', justifyContent: 'center' },

  scrollContent: {
    paddingBottom: 12,
  },

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
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.6,
    textAlign: 'center',
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
    alignItems: 'baseline',
  },
  rowLabel: {
    color: TEXT,
    opacity: 0.7,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
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

  actions: {
    marginTop: 14,
    paddingHorizontal: 16,
    gap: 10,
  },
  saveBtn: {
    height: 56,
    borderRadius: 16,
    backgroundColor: Colors.dark.highlight1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  saveText: {
    color: '#0E151F',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.2,
  },

  deleteBtn: {
    height: 56,
    borderRadius: 16,
    backgroundColor: CARD,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  deleteText: {
    color: '#e04b4b',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
});
