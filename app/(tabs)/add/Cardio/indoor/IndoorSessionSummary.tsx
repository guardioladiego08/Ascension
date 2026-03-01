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
import { useUnits } from '@/contexts/UnitsContext';
import LogoHeader from '@/components/my components/logoHeader';
import { supabase } from '@/lib/supabase';
import { shareRunWalkSessionToFeed } from '@/lib/social/feed';
import GoalAchievementCard from '@/components/goals/GoalAchievementCard';
import {
  getDeviceTimezone,
  syncAndFetchMyDailyGoalResult,
  toLocalISODate,
} from '@/lib/goals/client';
import {
  isGoalCategoryClosed,
  type DailyGoalResults,
} from '@/lib/goals/goalLogic';

import {
  getDraft,
  deleteDraft,
  type RunWalkDraft,
} from '@/lib/runWalkDraftStore';

import MetricChart, { type SamplePoint } from '@/components/charts/MetricLineChart';
import DeleteDraftConfirmModal from './indoor/DeleteDraftConfirmModal';

const BG = Colors.dark.background;
const CARD = Colors.dark.card;
const TEXT = Colors.dark.text;

const M_PER_MI = 1609.344;
const M_PER_KM = 1000;
const FT_PER_M = 3.28084;

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

function paceForUnit(
  paceMi: number | null | undefined,
  paceKm: number | null | undefined,
  unit: 'mi' | 'km'
) {
  const mi = paceMi != null && Number.isFinite(paceMi) && paceMi > 0 ? paceMi : null;
  const km = paceKm != null && Number.isFinite(paceKm) && paceKm > 0 ? paceKm : null;

  if (unit === 'mi') return mi ?? (km != null ? km * 1.609344 : null);
  return km ?? (mi != null ? mi / 1.609344 : null);
}

function formatShareErr(err: any): string {
  if (!err) return 'Unknown share error';
  const code = String(err?.code ?? '').trim();
  if (code === '42P10') {
    return 'Backend share function is outdated (42P10). Apply migration 20260227_fix_share_run_walk_session_user_no_on_conflict.sql.';
  }
  const message = String(err?.message ?? 'Share request failed').trim();
  return code ? `${message} (${code})` : message;
}

export default function IndoorSessionSummary() {
  const router = useRouter();
  const { distanceUnit } = useUnits();
  const params = useLocalSearchParams<{ draftId?: string }>();
  const draftId = params.draftId;

  const [draft, setDraft] = useState<RunWalkDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [shareToFeed, setShareToFeed] = useState(false);
  const [savedSessionId, setSavedSessionId] = useState<string | null>(null);
  const [goalResult, setGoalResult] = useState<DailyGoalResults | null>(null);
  const [saveStatusText, setSaveStatusText] = useState<string | null>(null);

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

  const distUnit = distanceUnit;
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

  const avgPaceForUnit = paceForUnit(
    draft?.avg_pace_s_per_mi ?? null,
    draft?.avg_pace_s_per_km ?? null,
    distUnit
  );
  const avgPaceText = formatPace(avgPaceForUnit, distUnit === 'mi' ? '/mi' : '/km');

  // -----------------------------
  // Charts: build series from draft.samples (before saving)
  // -----------------------------
  const elapsedLabel = useMemo(() => {
    return (tSeconds: number) => formatClock(Math.round(tSeconds));
  }, []);

  const pacePoints: SamplePoint[] = useMemo(() => {
    if (!draft?.samples?.length) return [];
    return draft.samples
      .map((s: any) => {
        const v = paceForUnit(
          Number.isFinite(s.pace_s_per_mi) ? Number(s.pace_s_per_mi) : null,
          Number.isFinite(s.pace_s_per_km) ? Number(s.pace_s_per_km) : null,
          distUnit
        );
        if (v == null || v <= 0) return null;
        return { t: Number(s.elapsed_s ?? 0), v };
      })
      .filter(Boolean) as SamplePoint[];
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
    const mult = distUnit === 'mi' ? FT_PER_M : 1;
    return draft.samples
      .filter((s: any) => Number.isFinite(s.elevation_m))
      .map((s: any) => ({ t: Number(s.elapsed_s ?? 0), v: Number(s.elevation_m) * mult }));
  }, [draft?.samples, distUnit]);

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

      const sessionPayload = {
        status: 'completed',
        ended_at: draft.ended_at,
        total_time_s: draft.total_time_s,
        total_distance_m: draft.total_distance_m,
        total_elevation_m: draft.total_elevation_m,
        avg_speed_mps: draft.avg_speed_mps,
        avg_pace_s_per_km: draft.avg_pace_s_per_km,
        avg_pace_s_per_mi: draft.avg_pace_s_per_mi,
        timezone_str: getDeviceTimezone(),
      };

      const fallbackExerciseType =
        draft.exercise_type === 'indoor_walk' ? 'walk' : 'run';

      // 1) insert session (with enum compatibility fallback)
      let savedExerciseType: string = draft.exercise_type;
      let { data: inserted, error: insErr } = await supabase
        .schema('run_walk')
        .from('sessions')
        .insert({
          ...sessionPayload,
          exercise_type: savedExerciseType,
        })
        .select('id')
        .single();

      if (insErr && fallbackExerciseType !== savedExerciseType) {
        const msg = String(insErr.message ?? '').toLowerCase();
        const looksLikeEnumMismatch =
          insErr.code === '22P02' || msg.includes('invalid input value for enum');

        if (looksLikeEnumMismatch) {
          savedExerciseType = fallbackExerciseType;
          const retry = await supabase
            .schema('run_walk')
            .from('sessions')
            .insert({
              ...sessionPayload,
              exercise_type: savedExerciseType,
            })
            .select('id')
            .single();
          inserted = retry.data;
          insErr = retry.error;
        }
      }

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
          // Keep storage atomic for chart summaries: if sample insert fails,
          // remove the just-created session and keep the draft for retry.
          await supabase
            .schema('run_walk')
            .from('sessions')
            .delete()
            .eq('id', sessionId);
          Alert.alert('Error', 'Could not save session samples. Please try again.');
          return;
        }
      }

      // 3) delete local draft
      let shared = false;
      let shareErrorMsg: string | null = null;
      if (shareToFeed) {
        try {
          await shareRunWalkSessionToFeed({
            sessionId,
            exerciseType: savedExerciseType,
            totalDistanceM: draft.total_distance_m,
            totalTimeS: draft.total_time_s,
            avgPaceSPerMi: draft.avg_pace_s_per_mi ?? null,
            avgPaceSPerKm: draft.avg_pace_s_per_km ?? null,
            visibility: 'followers',
          });
          shared = true;
        } catch (shareErr: any) {
          shareErrorMsg = formatShareErr(shareErr);
          console.warn('[IndoorSessionSummary] share failed', shareErr);
        }
      }

      // 4) delete local draft
      await deleteDraft(draftId);

      let nextGoalResult: DailyGoalResults | null = null;
      try {
        nextGoalResult = await syncAndFetchMyDailyGoalResult(
          toLocalISODate(new Date(draft.ended_at))
        );
      } catch (goalError) {
        console.warn('[IndoorSessionSummary] goal refresh failed', goalError);
      }

      setSavedSessionId(sessionId);
      setGoalResult(nextGoalResult);

      if (shareToFeed && shared) {
        setSaveStatusText('Session saved and shared to your feed.');
      } else if (shareToFeed && !shared) {
        setSaveStatusText('Session saved. Sharing to your feed failed.');
        Alert.alert(
          'Share failed',
          `Session saved, but sharing to your feed failed.${shareErrorMsg ? `\n\n${shareErrorMsg}` : ''}`
        );
      } else {
        setSaveStatusText('Session saved.');
      }
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
  const elevationUnitSuffix = distUnit === 'mi' ? 'ft' : 'm';
  const totalElevationDisplay =
    distUnit === 'mi'
      ? draft.total_elevation_m * FT_PER_M
      : draft.total_elevation_m;

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
          <Row
            label="Elevation Gain"
            value={`${totalElevationDisplay.toFixed(0)} ${elevationUnitSuffix}`}
          />
          <Row label="Avg Pace" value={avgPaceText} />
        </View>

        {savedSessionId && saveStatusText ? (
          <View style={styles.noticeCard}>
            <Text style={styles.noticeText}>{saveStatusText}</Text>
          </View>
        ) : null}

        {savedSessionId && goalResult && isGoalCategoryClosed(goalResult, 'cardio') ? (
          <View style={styles.goalCardWrap}>
            <GoalAchievementCard
              title="Cardio goal complete"
              description="This session completed your cardio goal for today."
            />
          </View>
        ) : null}

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
            title={`Elevation Over Time (${elevationUnitSuffix})`}
            color={Colors.dark.highlight2 ?? Colors.dark.highlight1}
            points={elevationPoints}
            cardBg={CARD}
            textColor={TEXT}
            valueFormatter={(v) => (Number.isFinite(v) ? v.toFixed(1) : '—')}
            xLabelFormatter={elapsedLabel}
            unitSuffix={elevationUnitSuffix}
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
          {savedSessionId ? (
            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.saveBtn}
              onPress={() => router.back()}
            >
              <Ionicons name="checkmark" size={18} color="#0E151F" />
              <Text style={styles.saveText}>Done</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.shareCard}
                onPress={() => setShareToFeed((v) => !v)}
                disabled={saving || deleting}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.shareTitle}>Share to social feed</Text>
                  <Text style={styles.shareSubtitle}>
                    {shareToFeed ? 'Followers will be able to see this session.' : 'Keep this session private.'}
                  </Text>
                </View>
                <Ionicons
                  name={shareToFeed ? 'checkmark-circle' : 'ellipse-outline'}
                  size={24}
                  color={shareToFeed ? Colors.dark.highlight1 : TEXT}
                />
              </TouchableOpacity>

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
            </>
          )}
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
  noticeCard: {
    marginTop: 12,
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: CARD,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  noticeText: {
    color: '#D7E0F4',
    fontSize: 12.5,
    lineHeight: 18,
  },
  goalCardWrap: {
    marginTop: 12,
    paddingHorizontal: 16,
  },

  actions: {
    marginTop: 14,
    paddingHorizontal: 16,
    gap: 10,
  },
  shareCard: {
    borderRadius: 14,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  shareTitle: {
    color: TEXT,
    fontSize: 13.5,
    fontWeight: '800',
  },
  shareSubtitle: {
    marginTop: 4,
    color: TEXT,
    opacity: 0.72,
    fontSize: 12,
    lineHeight: 16,
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
