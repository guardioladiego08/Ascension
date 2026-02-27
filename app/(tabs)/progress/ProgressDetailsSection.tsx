// components/my components/progress/ProgressDetailsSection.tsx
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  LayoutChangeEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import { useUnits } from '@/contexts/UnitsContext';

type StrengthWorkoutRow = {
  id: string;
  started_at: string;
  ended_at: string | null;
};

type OutdoorSessionRow = {
  id: string;
  started_at: string | null;
  ended_at: string | null;
  activity_type: 'run' | 'walk' | string;
  status: string | null;
  duration_s: number | null;
  distance_m: number | null;
};

type IndoorSessionRow = {
  id: string;
  started_at: string | null;
  ended_at: string | null;
  exercise_type: string;
  status: string | null;
  total_time_s: number | null;
  total_distance_m: number | null;
};

type RunningSessionItem = {
  id: string;
  source: 'indoor' | 'outdoor';
  startedAt: string | null;
  endedAt: string | null;
  activityType: string;
  durationS: number | null;
  distanceM: number | null;
};

const DETAIL_SEGMENTS = [
  { key: 'weights', label: 'Weights', icon: 'barbell-outline' as const },
  { key: 'running', label: 'Running', icon: 'trail-sign-outline' as const },
  { key: 'nutrition', label: 'Nutrition', icon: 'fast-food-outline' as const },
];

const M_PER_MI = 1609.344;
const M_PER_KM = 1000;

function formatDurationFromSeconds(totalSeconds: number | null | undefined) {
  if (!totalSeconds || totalSeconds <= 0) return '';
  const min = Math.round(totalSeconds / 60);
  return min > 0 ? `${min} min` : '';
}

function formatDistanceFromMeters(
  meters: number | null | undefined,
  unit: 'mi' | 'km'
) {
  if (!meters || meters <= 0) return '';
  if (unit === 'km') {
    return `${(meters / M_PER_KM).toFixed(2)} km`;
  }
  return `${(meters / M_PER_MI).toFixed(2)} mi`;
}

function isRunWalkActivity(activityType: string) {
  const v = (activityType ?? '').toLowerCase();
  return v.includes('run') || v.includes('walk');
}

function formatActivityTypeLabel(activityType: string, source: 'indoor' | 'outdoor') {
  const v = (activityType ?? '').toLowerCase();
  const prefix = source === 'indoor' ? 'Indoor' : 'Outdoor';
  if (v.includes('walk')) return `${prefix} walk`;
  if (v.includes('run')) return `${prefix} run`;
  return `${prefix} session`;
}

const ProgressDetailsSection: React.FC = () => {
  const { distanceUnit } = useUnits();
  const [selectedDetailIndex, setSelectedDetailIndex] = useState(0);
  const detailAnim = useRef(new Animated.Value(0)).current;
  const [segmentWidth, setSegmentWidth] = useState(0);

  const [weightsWorkouts, setWeightsWorkouts] = useState<StrengthWorkoutRow[]>(
    []
  );
  const [loadingWeights, setLoadingWeights] = useState(true);

  const [runningSessions, setRunningSessions] = useState<RunningSessionItem[]>(
    []
  );
  const [loadingRunning, setLoadingRunning] = useState(true);

  // --- SEGMENTED CONTROL HANDLERS -------------------------------------------
  const handleDetailSelect = (index: number) => {
    setSelectedDetailIndex(index);
    Animated.spring(detailAnim, {
      toValue: index,
      useNativeDriver: true,
      friction: 8,
      tension: 80,
    }).start();
  };

  const handleDetailLayout = (e: LayoutChangeEvent) => {
    const totalWidth = e.nativeEvent.layout.width;
    setSegmentWidth(totalWidth / DETAIL_SEGMENTS.length);
  };

  // Navigate to "all strength workouts" screen
  const handleViewAllStrengthPress = () => {
    router.push('/progress/strength/allStrengthWorkouts');
  };

  // Open profile tab, which contains the full merged activity grid.
  const handleViewAllRunningPress = () => {
    router.push('/profile');
  };

  // --- LOAD RECENT ITEMS -----------------------------------------------------
  useEffect(() => {
    const load = async () => {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();
        if (userError) throw userError;

        if (!user) {
          setLoadingWeights(false);
          setLoadingRunning(false);
          return;
        }

        // Strength (unchanged)
        const strengthPromise = supabase
          .schema('strength')
          .from('strength_workouts')
          .select('id, started_at, ended_at')
          .eq('user_id', user.id)
          .order('started_at', { ascending: false })
          .limit(5);

        // Indoor sessions (completed only)
        const indoorPromise = supabase
          .schema('run_walk')
          .from('sessions')
          .select(
            'id, started_at, ended_at, exercise_type, status, total_time_s, total_distance_m'
          )
          .eq('user_id', user.id)
          .eq('status', 'completed')
          .order('ended_at', { ascending: false })
          .limit(20);

        // Outdoor Sessions (completed only)
        const outdoorPromise = supabase
          .schema('run_walk')
          .from('outdoor_sessions')
          .select('id, started_at, ended_at, activity_type, status, duration_s, distance_m')
          .eq('user_id', user.id)
          .eq('status', 'completed')
          .order('ended_at', { ascending: false })
          .limit(20);

        const [strengthRes, indoorRes, outdoorRes] = await Promise.all([
          strengthPromise,
          indoorPromise,
          outdoorPromise,
        ]);

        if (strengthRes.error) throw strengthRes.error;
        if (indoorRes.error) throw indoorRes.error;
        if (outdoorRes.error) throw outdoorRes.error;

        const indoorItems: RunningSessionItem[] = ((indoorRes.data ?? []) as IndoorSessionRow[])
          .filter((row) => isRunWalkActivity(row.exercise_type))
          .map((row) => ({
            id: row.id,
            source: 'indoor',
            startedAt: row.started_at,
            endedAt: row.ended_at,
            activityType: row.exercise_type,
            durationS: row.total_time_s == null ? null : Number(row.total_time_s),
            distanceM: row.total_distance_m == null ? null : Number(row.total_distance_m),
          }));

        const outdoorItems: RunningSessionItem[] = ((outdoorRes.data ?? []) as OutdoorSessionRow[])
          .filter((row) => isRunWalkActivity(row.activity_type))
          .map((row) => ({
            id: row.id,
            source: 'outdoor',
            startedAt: row.started_at,
            endedAt: row.ended_at,
            activityType: row.activity_type,
            durationS: row.duration_s == null ? null : Number(row.duration_s),
            distanceM: row.distance_m == null ? null : Number(row.distance_m),
          }));

        const merged = [...indoorItems, ...outdoorItems].sort((a, b) => {
          const aTs = new Date(a.endedAt ?? a.startedAt ?? 0).getTime();
          const bTs = new Date(b.endedAt ?? b.startedAt ?? 0).getTime();
          return bTs - aTs;
        });

        setWeightsWorkouts((strengthRes.data ?? []) as StrengthWorkoutRow[]);
        setRunningSessions(merged.slice(0, 5));
      } catch (err) {
        console.warn('Error loading progress details', err);
      } finally {
        setLoadingWeights(false);
        setLoadingRunning(false);
      }
    };

    load();
  }, []);

  // Strength navigation (existing)
  const handleStrengthWorkoutPress = (workoutId: string) => {
    router.push(`/add/Strength/${workoutId}`);
  };

  const handleRunningSessionPress = (session: RunningSessionItem) => {
    if (session.source === 'indoor') {
      router.push(`/progress/run_walk/${session.id}`);
      return;
    }
    router.push(`/progress/outdoor/${session.id}`);
  };

  const renderWeightsContent = () => {
    if (loadingWeights) {
      return <Text style={styles.contentMuted}>Loading...</Text>;
    }

    if (!weightsWorkouts.length) {
      return (
        <View style={styles.listContainer}>
          <Text style={styles.contentMuted}>No recent strength workouts.</Text>

          <TouchableOpacity
            style={styles.viewAllButton}
            activeOpacity={0.85}
            onPress={handleViewAllStrengthPress}
          >
            <Text style={styles.viewAllText}>View all strength workouts</Text>
            <Ionicons
              name="arrow-forward-circle-outline"
              size={18}
              color="#A5B4FC"
            />
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.listContainer}>
        {weightsWorkouts.map((workout) => {
          const date = new Date(workout.started_at);
          const dateLabel = date.toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
          });

          let durationLabel = '';
          if (workout.ended_at) {
            const startMs = new Date(workout.started_at).getTime();
            const endMs = new Date(workout.ended_at).getTime();
            const diffMin = Math.max(0, Math.round((endMs - startMs) / 60000));
            durationLabel = diffMin > 0 ? `${diffMin} min` : '';
          }

          const subtitle = durationLabel
            ? `Strength session · ${durationLabel}`
            : 'Strength session';

          return (
            <TouchableOpacity
              key={workout.id}
              style={styles.listItem}
              activeOpacity={0.8}
              onPress={() => handleStrengthWorkoutPress(workout.id)}
            >
              <View>
                <Text style={styles.listTitle}>{dateLabel}</Text>
                <Text style={styles.listSubtitle}>{subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#9DA4C4" />
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity
          style={styles.viewAllButton}
          activeOpacity={0.85}
          onPress={handleViewAllStrengthPress}
        >
          <Text style={styles.viewAllText}>View all strength workouts</Text>
          <Ionicons
            name="arrow-forward-circle-outline"
            size={18}
            color="#A5B4FC"
          />
        </TouchableOpacity>
      </View>
    );
  };

  const renderRunningContent = () => {
    if (loadingRunning) {
      return <Text style={styles.contentMuted}>Loading...</Text>;
    }

    if (!runningSessions.length) {
      return (
        <View style={styles.listContainer}>
          <Text style={styles.contentMuted}>No recent running sessions.</Text>

          <TouchableOpacity
            style={styles.viewAllButton}
            activeOpacity={0.85}
            onPress={handleViewAllRunningPress}
          >
            <Text style={styles.viewAllText}>View all running sessions</Text>
            <Ionicons
              name="arrow-forward-circle-outline"
              size={18}
              color="#A5B4FC"
            />
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.listContainer}>
        {runningSessions.map((sesh) => {
          const baseDate = sesh.endedAt ? new Date(sesh.endedAt) : (sesh.startedAt ? new Date(sesh.startedAt) : null);
          const dateLabel = baseDate
            ? baseDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
            : 'Session';

          const typeLabel = formatActivityTypeLabel(sesh.activityType, sesh.source);
          const dur = formatDurationFromSeconds(sesh.durationS);
          const dist = formatDistanceFromMeters(sesh.distanceM, distanceUnit);

          const parts = [typeLabel];
          if (dur) parts.push(dur);
          if (dist) parts.push(dist);

          const subtitle = parts.join(' · ');

          return (
            <TouchableOpacity
              key={`${sesh.source}:${sesh.id}`}
              style={styles.listItem}
              activeOpacity={0.8}
              onPress={() => handleRunningSessionPress(sesh)}
            >
              <View>
                <Text style={styles.listTitle}>{dateLabel}</Text>
                <Text style={styles.listSubtitle}>{subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#9DA4C4" />
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity
          style={styles.viewAllButton}
          activeOpacity={0.85}
          onPress={handleViewAllRunningPress}
        >
          <Text style={styles.viewAllText}>View all running sessions</Text>
          <Ionicons
            name="arrow-forward-circle-outline"
            size={18}
            color="#A5B4FC"
          />
        </TouchableOpacity>
      </View>
    );
  };

  const renderContent = () => {
    if (selectedDetailIndex === 0) return renderWeightsContent();
    if (selectedDetailIndex === 1) return renderRunningContent();

    // Nutrition blank for now
    return <Text style={styles.contentMuted}>Nutrition details coming soon.</Text>;
  };

  return (
    <>
      {/* Segmented Control */}
      <View style={styles.detailsRow} onLayout={handleDetailLayout}>
        {segmentWidth > 0 && (
          <Animated.View
            style={[
              styles.detailsActiveBg,
              {
                width: segmentWidth,
                transform: [
                  { translateX: Animated.multiply(detailAnim, segmentWidth) },
                ],
              },
            ]}
          />
        )}

        {DETAIL_SEGMENTS.map((seg, index) => (
          <TouchableOpacity
            key={seg.key}
            style={styles.detailSegment}
            activeOpacity={0.8}
            onPress={() => handleDetailSelect(index)}
          >
            <Ionicons
              name={seg.icon}
              size={16}
              color={index === selectedDetailIndex ? '#FFFFFF' : '#9DA4C4'}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.detailPillText,
                index === selectedDetailIndex && styles.detailPillTextActive,
              ]}
            >
              {seg.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content Card */}
      <View style={styles.contentCard}>{renderContent()}</View>
    </>
  );
};

const styles = StyleSheet.create({
  detailsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.dark.card,
    borderRadius: 999,
    padding: 4,
    marginTop: 0,
    justifyContent: 'space-between',
    position: 'relative',
    overflow: 'hidden',
  },
  detailsActiveBg: {
    position: 'absolute',
    left: 4,
    top: 4,
    bottom: 4,
    borderRadius: 999,
    backgroundColor: '#6366F1',
  },
  detailSegment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 999,
    zIndex: 1,
  },
  detailPillText: {
    fontSize: 11,
    color: '#9DA4C4',
  },
  detailPillTextActive: {
    color: '#FFFFFF',
  },

  contentCard: {
    marginTop: 12,
    marginBottom: 24,
    backgroundColor: Colors.dark.card,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 80,
  },
  contentMuted: {
    fontSize: 12,
    color: '#9DA4C4',
  },
  listContainer: {
    gap: 10,
    paddingBottom: 8,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#111827',
  },
  listTitle: {
    fontSize: 13,
    color: '#E5E7F5',
    fontWeight: '600',
  },
  listSubtitle: {
    fontSize: 11,
    color: '#9DA4C4',
    marginTop: 2,
  },

  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  viewAllText: {
    fontSize: 12,
    color: '#A5B4FC',
    fontWeight: '500',
    marginRight: 6,
  },
});

export default ProgressDetailsSection;
