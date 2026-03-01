import React, { useMemo, useState } from 'react';
import {
  SafeAreaView,
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
import GoalAchievementCard from '@/components/goals/GoalAchievementCard';
import {
  deleteOutdoorSession,
  createOutdoorSession,
  updateOutdoorSession,
} from '@/lib/OutdoorSession/supabase';
import {
  formatDuration,
  formatDistance,
  formatPaceForUnit,
  paceSecPerKm,
} from '@/lib/OutdoorSession/outdoorUtils';
import {
  getDeviceTimezone,
  syncAndFetchMyDailyGoalResult,
  toLocalISODate,
} from '@/lib/goals/client';
import {
  isGoalCategoryClosed,
  type DailyGoalResults,
} from '@/lib/goals/goalLogic';

const BG = Colors?.dark?.background ?? '#F5F6F8';
const CARD = Colors?.dark?.card ?? '#131A24';
const TEXT = Colors?.dark?.text ?? '#111';
const MUTED = Colors?.dark?.textMuted ?? '#6B7280';
const ACCENT = Colors?.dark?.highlight1 ?? '#16A34A';

function normalizeOutdoorActivityType(activityType?: string): 'run' | 'walk' {
  return String(activityType ?? '').toLowerCase().includes('walk') ? 'walk' : 'run';
}

function getSafeIsoDate(value?: string | null, fallbackDate?: Date) {
  if (value) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }

  return (fallbackDate ?? new Date()).toISOString();
}

export default function SessionSummary() {
  const router = useRouter();
  const { distanceUnit } = useUnits();
  const params = useLocalSearchParams<{
    title?: string;
    activityType?: string;
    elapsedSeconds?: string;
    distanceMeters?: string;
    startedAtISO?: string;
    endedAtISO?: string;
  }>();

  const title = (params.title ?? 'Outdoor Session').toString();
  const activityType = normalizeOutdoorActivityType(params.activityType?.toString());
  const elapsedSeconds = Math.max(0, Number(params.elapsedSeconds ?? 0) || 0);
  const distanceMeters = Math.max(0, Number(params.distanceMeters ?? 0) || 0);
  const endedAtISO = getSafeIsoDate(params.endedAtISO?.toString());
  const startedAtISO = getSafeIsoDate(
    params.startedAtISO?.toString(),
    new Date(new Date(endedAtISO).getTime() - elapsedSeconds * 1000)
  );

  const [saving, setSaving] = useState(false);
  const [savedSessionId, setSavedSessionId] = useState<string | null>(null);
  const [goalResult, setGoalResult] = useState<DailyGoalResults | null>(null);
  const [saveStatusText, setSaveStatusText] = useState<string | null>(null);

  const avgPace = useMemo(
    () => paceSecPerKm(distanceMeters, elapsedSeconds),
    [distanceMeters, elapsedSeconds]
  );

  const avgSpeedMps = useMemo(() => {
    if (elapsedSeconds <= 0 || distanceMeters <= 0) return null;
    return distanceMeters / elapsedSeconds;
  }, [distanceMeters, elapsedSeconds]);

  async function onSave() {
    if (saving || savedSessionId) return;

    let sessionId: string | null = null;

    try {
      setSaving(true);

      sessionId = await createOutdoorSession({
        activityType,
        startedAtISO,
        timezoneStr: getDeviceTimezone(),
      });

      await updateOutdoorSession(sessionId, {
        ended_at: endedAtISO,
        duration_s: elapsedSeconds,
        distance_m: distanceMeters,
        avg_speed_mps: avgSpeedMps,
        avg_pace_s_per_km: avgPace,
        status: 'completed',
      });

      let nextGoalResult: DailyGoalResults | null = null;
      try {
        nextGoalResult = await syncAndFetchMyDailyGoalResult(
          toLocalISODate(new Date(endedAtISO))
        );
      } catch (goalError) {
        console.warn('[OutdoorSessionSummary] goal refresh failed', goalError);
      }

      setSavedSessionId(sessionId);
      setGoalResult(nextGoalResult);
      setSaveStatusText('Session saved.');
    } catch (error) {
      console.warn('[OutdoorSessionSummary] save failed', error);

      if (sessionId) {
        try {
          await deleteOutdoorSession(sessionId);
        } catch (cleanupError) {
          console.warn('[OutdoorSessionSummary] cleanup failed', cleanupError);
        }
      }

      Alert.alert('Error', 'Could not save outdoor session. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function onDone() {
    router.replace('/(tabs)/home');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.kicker}>SESSION SUMMARY</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.sub}>{activityType.toUpperCase()}</Text>
        </View>

        <View style={styles.card}>
          <Row label="Time" value={formatDuration(elapsedSeconds)} />
          <Row label="Distance" value={formatDistance(distanceMeters, distanceUnit)} />
          <Row label="Avg Pace" value={formatPaceForUnit(avgPace, distanceUnit)} />
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

        <View style={styles.footer}>
          {savedSessionId ? (
            <TouchableOpacity style={styles.primary} onPress={onDone}>
              <Ionicons name="checkmark" size={20} color="#0E151F" />
              <Text style={styles.primaryText}>Done</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.primary, saving && styles.primaryDisabled]}
              onPress={onSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#0E151F" />
              ) : (
                <>
                  <Ionicons name="save-outline" size={20} color="#0E151F" />
                  <Text style={styles.primaryText}>Save Session</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      <View style={[styles.accentLine, { backgroundColor: ACCENT }]} />
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={rowStyles.row}>
      <Text style={rowStyles.label}>{label}</Text>
      <Text style={rowStyles.value}>{value}</Text>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  label: {
    color: MUTED,
    fontWeight: '800',
    letterSpacing: 1.2,
    fontSize: 12,
  },
  value: {
    color: TEXT,
    fontWeight: '900',
    fontSize: 16,
  },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  kicker: {
    color: MUTED,
    fontWeight: '900',
    letterSpacing: 1.6,
    fontSize: 12,
  },
  title: {
    marginTop: 8,
    color: TEXT,
    fontWeight: '900',
    fontSize: 28,
  },
  sub: {
    marginTop: 4,
    color: MUTED,
    fontWeight: '800',
    letterSpacing: 1.4,
    fontSize: 12,
  },
  card: {
    marginTop: 12,
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 6,
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
  footer: {
    marginTop: 'auto',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    gap: 10,
  },
  primary: {
    height: 56,
    borderRadius: 16,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  primaryDisabled: {
    opacity: 0.65,
  },
  primaryText: {
    color: '#0E151F',
    fontSize: 16,
    fontWeight: '900',
  },
  accentLine: {
    height: 4,
    width: '100%',
  },
});
