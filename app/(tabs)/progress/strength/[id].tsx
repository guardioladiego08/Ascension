// app/(tabs)/progress/strength/[id].tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { supabase } from '@/lib/supabase';
import { GlobalStyles } from '@/constants/GlobalStyles';
import { Colors } from '@/constants/Colors';

type ExerciseRow = {
  id: string;
  primary_name?: string | null;
  secondary_name?: string | null;
  alias?: string | null;
  body_part?: string[] | null;
  category?: string | null;
};

type StrengthSetRow = {
  id: string;
  exercise_id: string;
  weight_kg?: number | null;
  reps?: number | null;
  created_at: string;
  // may contain strength_workout_id or workout_id (depends on your schema)
  [key: string]: any;
};

type WorkoutRow = {
  id: string;
  started_at: string | null;
  ended_at: string | null;
};

const ExerciseDetailScreen: React.FC = () => {
  const { id, name } = useLocalSearchParams<{ id?: string; name?: string }>();

  const [exercise, setExercise] = useState<ExerciseRow | null>(null);
  const [sets, setSets] = useState<StrengthSetRow[]>([]);
  const [workouts, setWorkouts] = useState<WorkoutRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedStat, setSelectedStat] = useState<'sessions' | 'volume' | 'oneRM'>(
    'sessions'
  );
  

  // ------------------------ LOAD DATA ----------------------------------------

  useEffect(() => {
    const load = async () => {
      if (!id || Array.isArray(id)) {
        setLoading(false);
        setErrorMsg('No exercise ID provided.');
        return;
      }

      try {
        setErrorMsg(null);

        // 1) Exercise metadata
        const { data: exData, error: exErr } = await supabase
          .schema('strength')
          .from('exercises')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (exErr) throw exErr;
        if (!exData) {
          setErrorMsg('Exercise not found.');
          setLoading(false);
          return;
        }
        setExercise(exData as ExerciseRow);

        // 2) All sets for this exercise
        const { data: setData, error: setErr } = await supabase
          .schema('strength')
          .from('strength_sets')
          .select('*')
          .eq('exercise_id', id);

        if (setErr) throw setErr;

        const rows = (setData ?? []) as StrengthSetRow[];
        setSets(rows);

        // 3) Pull the workouts that contain this exercise (for total time)
        const workoutIds = Array.from(
          new Set(
            rows
              .map(r => (r as any).strength_workout_id ?? (r as any).workout_id)
              .filter(Boolean)
          )
        ) as string[];

        if (workoutIds.length) {
          const { data: wkData, error: wkErr } = await supabase
            .schema('strength')
            .from('strength_workouts')
            .select('id, started_at, ended_at')
            .in('id', workoutIds);

          if (wkErr) throw wkErr;
          setWorkouts((wkData ?? []) as WorkoutRow[]);
        }
      } catch (err: any) {
        console.warn('Error loading exercise detail', err);
        setErrorMsg('Error loading exercise details.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  // ------------------------ DERIVED DATA -------------------------------------

  const title = useMemo(() => {
    if (typeof name === 'string' && name.length) return name;
    if (!exercise) return 'Exercise';

    return (
      exercise.primary_name ||
      exercise.secondary_name ||
      exercise.alias ||
      'Exercise'
    );
  }, [name, exercise]);

  const metrics = useMemo(() => {
    if (!sets.length) {
      return {
        totalSessions: 0,
        totalTimeMins: 0,
        totalVolume: 0,
        avgReps: 0,
        bestOneRm: 0,
      };
    }

    // Sessions = distinct workouts that used this exercise
    const workoutKeySet = new Set(
      sets
        .map(r => (r as any).strength_workout_id ?? (r as any).workout_id)
        .filter(Boolean)
    );
    const totalSessions = workoutKeySet.size;

    let totalVolume = 0;
    let totalReps = 0;
    let bestOneRm = 0;

    for (const s of sets) {
      const w = s.weight_kg ?? 0;
      const r = s.reps ?? 0;
      totalVolume += w * r;
      totalReps += r;

      // Epley formula for estimated 1RM
      if (w > 0 && r > 0) {
        const est = w * (1 + r / 30);
        if (est > bestOneRm) bestOneRm = est;
      }
    }

    // total time = sum of durations of any workout that contained this exercise
    let totalTimeMins = 0;
    if (workouts.length) {
      for (const wk of workouts) {
        if (!wk.started_at || !wk.ended_at) continue;
        const start = new Date(wk.started_at).getTime();
        const end = new Date(wk.ended_at).getTime();
        if (end > start) {
          totalTimeMins += (end - start) / 60000;
        }
      }
    }

    const avgReps = sets.length ? totalReps / sets.length : 0;

    return {
      totalSessions,
      totalTimeMins,
      totalVolume,
      avgReps,
      bestOneRm,
    };
  }, [sets, workouts]);

  // ------------------------ SMALL SUBCOMPONENTS ------------------------------

  const StatChip = ({ value, label }: { value: string; label: string }) => (
    <View style={styles.statChip}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  const renderChartBody = () => {
    if (!sets.length) {
      return (
        <View style={styles.chartEmpty}>
          <Text style={styles.chartEmptyText}>No data yet for this exercise.</Text>
        </View>
      );
    }

    const maxValue =
      selectedStat === 'sessions'
        ? metrics.totalSessions || 1
        : selectedStat === 'volume'
        ? metrics.totalVolume || 1
        : metrics.bestOneRm || 1;

    const items = [
      { key: 'SESSIONS', value: metrics.totalSessions },
      { key: 'VOLUME', value: metrics.totalVolume },
      { key: 'BEST 1RM', value: metrics.bestOneRm },
    ];

    return (
      <View style={{ marginTop: 16 }}>
        {items.map(item => {
          const pct = Math.min(1, (item.value || 0) / maxValue);
          return (
            <View key={item.key} style={styles.chartRow}>
              <Text style={styles.chartRowLabel}>{item.key}</Text>
              <View style={styles.chartBarTrack}>
                <View style={[styles.chartBarFill, { flex: pct }]} />
                <View style={{ flex: 1 - pct }} />
              </View>
              <Text style={styles.chartRowValue}>
                {item.key === 'VOLUME'
                  ? `${Math.round(item.value)} kg`
                  : item.key === 'BEST 1RM'
                  ? `${Math.round(item.value)} kg`
                  : item.value}
              </Text>
            </View>
          );
        })}
      </View>
    );
  };

  // ------------------------ STATES: LOADING / ERROR -------------------------

  if (loading) {
    return (
      <View style={[GlobalStyles.container, styles.centered]}>
        <ActivityIndicator size="small" color={Colors.dark.highlight1} />
        <Text style={styles.muted}>Loading exercise…</Text>
      </View>
    );
  }

  if (errorMsg) {
    return (
      <View style={[GlobalStyles.container, styles.centered]}>
        <Text style={styles.errorText}>{errorMsg}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => router.back()}>
          <Text style={styles.retryText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ------------------------ MAIN RENDER -------------------------------------

  return (
    <View style={GlobalStyles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={20} color="#E5E7F5" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={2}>
            {title}
          </Text>
          <View style={{ width: 32 }} />
        </View>

        {/* Meta pills */}
        {exercise && (
          <View style={styles.metaRow}>
            {exercise.category && (
              <View style={styles.metaPill}>
                <Text style={styles.metaPillText}>{exercise.category}</Text>
              </View>
            )}
            {Array.isArray(exercise.body_part) &&
              exercise.body_part.map(bp => (
                <View key={bp} style={styles.metaPill}>
                  <Text style={styles.metaPillText}>{bp}</Text>
                </View>
              ))}
          </View>
        )}

        {/* Metric cards */}
        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>SESSIONS</Text>
            <Text style={styles.metricValue}>{metrics.totalSessions}</Text>
            <Text style={styles.metricSub}>times completed</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>TIME</Text>
            <Text style={styles.metricValue}>
              {metrics.totalTimeMins > 0
                ? `${Math.round(metrics.totalTimeMins)} min`
                : '—'}
            </Text>
            <Text style={styles.metricSub}>total time</Text>
          </View>
        </View>

        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>VOLUME</Text>
            <Text style={styles.metricValue}>
              {metrics.totalVolume > 0 ? `${Math.round(metrics.totalVolume)} kg` : '—'}
            </Text>
            <Text style={styles.metricSub}>all time</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>BEST 1RM</Text>
            <Text style={styles.metricValue}>
              {metrics.bestOneRm > 0 ? `${Math.round(metrics.bestOneRm)} kg` : '—'}
            </Text>
            <Text style={styles.metricSub}>estimated</Text>
          </View>
        </View>

        {/* Quick stats */}
        <View style={styles.statRow}>
          <StatChip value={sets.length.toString()} label="Total sets" />
          <StatChip
            value={metrics.avgReps > 0 ? metrics.avgReps.toFixed(1) : '—'}
            label="Avg reps / set"
          />
        </View>

        {/* Charts / progression */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>PROGRESSION</Text>
          </View>

          <View style={styles.segmentRow}>
            <TouchableOpacity
              style={[
                styles.segmentChip,
                selectedStat === 'sessions' && styles.segmentChipActive,
              ]}
              onPress={() => setSelectedStat('sessions')}
            >
              <Text
                style={[
                  styles.segmentText,
                  selectedStat === 'sessions' && styles.segmentTextActive,
                ]}
              >
                Sessions
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.segmentChip,
                selectedStat === 'volume' && styles.segmentChipActive,
              ]}
              onPress={() => setSelectedStat('volume')}
            >
              <Text
                style={[
                  styles.segmentText,
                  selectedStat === 'volume' && styles.segmentTextActive,
                ]}
              >
                Volume
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.segmentChip,
                selectedStat === 'oneRM' && styles.segmentChipActive,
              ]}
              onPress={() => setSelectedStat('oneRM')}
            >
              <Text
                style={[
                  styles.segmentText,
                  selectedStat === 'oneRM' && styles.segmentTextActive,
                ]}
              >
                1RM
              </Text>
            </TouchableOpacity>
          </View>

          {renderChartBody()}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
};

export default ExerciseDetailScreen;

// ----------------------------- STYLES ----------------------------------------

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Colors.dark.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  metaPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: Colors.dark.card,
  },
  metaPillText: {
    fontSize: 11,
    color: '#9DA4C4',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: Colors.dark.card,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  metricLabel: {
    fontSize: 11,
    color: '#9DA4C4',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#E5E7F5',
  },
  metricSub: {
    marginTop: 2,
    fontSize: 11,
    color: '#9DA4C4',
  },
  statRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
    marginBottom: 18,
  },
  statChip: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: Colors.dark.card,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#E5E7F5',
  },
  statLabel: {
    marginTop: 2,
    fontSize: 11,
    color: '#9DA4C4',
  },
  sectionCard: {
    marginTop: 4,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 18,
    backgroundColor: Colors.dark.card,
  },
  sectionHeaderRow: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 12,
    letterSpacing: 0.8,
    color: '#9DA4C4',
  },
  segmentRow: {
    flexDirection: 'row',
    backgroundColor: '#111827',
    borderRadius: 999,
    padding: 4,
    marginTop: 4,
  },
  segmentChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 999,
  },
  segmentChipActive: {
    backgroundColor: '#6366F1',
  },
  segmentText: {
    fontSize: 11,
    color: '#9DA4C4',
  },
  segmentTextActive: {
    color: '#FFFFFF',
  },
  chartEmpty: {
    marginTop: 18,
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartEmptyText: {
    fontSize: 12,
    color: '#9DA4C4',
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  chartRowLabel: {
    width: 70,
    fontSize: 11,
    color: '#9DA4C4',
  },
  chartBarTrack: {
    flex: 1,
    flexDirection: 'row',
    height: 10,
    borderRadius: 999,
    backgroundColor: '#111827',
    overflow: 'hidden',
    marginHorizontal: 8,
  },
  chartBarFill: {
    backgroundColor: '#6366F1',
    borderRadius: 999,
  },
  chartRowValue: {
    width: 70,
    fontSize: 11,
    color: '#E5E7F5',
    textAlign: 'right',
  },
  muted: {
    marginTop: 8,
    fontSize: 12,
    color: '#9DA4C4',
  },
  errorText: {
    fontSize: 13,
    color: '#FCA5A5',
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  retryBtn: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#4B5563',
  },
  retryText: {
    color: '#E5E7F5',
    fontSize: 13,
    fontWeight: '600',
  },
});
