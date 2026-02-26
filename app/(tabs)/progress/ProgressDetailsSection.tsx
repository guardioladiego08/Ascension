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
  ended_at: string | null;
  activity_type: 'run' | 'walk' | string;
  status: string | null;
  duration_s: number | null;
  distance_m: number | null;
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

function formatActivityTypeLabel(activityType: string) {
  if (!activityType) return 'Outdoor session';
  if (activityType.includes('walk')) return 'Outdoor walk';
  if (activityType.includes('run')) return 'Outdoor run';
  return 'Outdoor session';
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

  const [outdoorSessions, setOutdoorSessions] = useState<OutdoorSessionRow[]>(
    []
  );
  const [loadingOutdoor, setLoadingOutdoor] = useState(true);

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

  // Navigate to "all outdoor sessions" screen (create this route if you haven’t yet)
  const handleViewAllOutdoorPress = () => {
    router.push('/progress/outdoor/allOutdoorSessions');
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
          setLoadingOutdoor(false);
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

        // Outdoor Sessions (completed only)
        // Note: if your table does not have user_id, remove eq('user_id', user.id) and rely on RLS.
        const outdoorPromise = supabase
          .schema('run_walk')
          .from('outdoor_sessions')
          .select('id, ended_at, activity_type, status, duration_s, distance_m')
          .eq('user_id', user.id)
          .eq('status', 'completed')
          .order('ended_at', { ascending: false })
          .limit(5);

        const [strengthRes, outdoorRes] = await Promise.all([
          strengthPromise,
          outdoorPromise,
        ]);

        if (strengthRes.error) throw strengthRes.error;
        if (outdoorRes.error) throw outdoorRes.error;

        setWeightsWorkouts((strengthRes.data ?? []) as StrengthWorkoutRow[]);
        setOutdoorSessions((outdoorRes.data ?? []) as OutdoorSessionRow[]);
      } catch (err) {
        console.warn('Error loading progress details', err);
      } finally {
        setLoadingWeights(false);
        setLoadingOutdoor(false);
      }
    };

    load();
  }, []);

  // Strength navigation (existing)
  const handleStrengthWorkoutPress = (workoutId: string) => {
    router.push(`/add/Strength/${workoutId}`);
  };

  // ✅ Outdoor navigation: open summary route for this session id
  // Matches your file: app/progress/outdoor/summary/[id].tsx
  const handleOutdoorSessionPress = (sessionId: string) => {
    router.push(`/progress/outdoor/${sessionId}`);
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

  const renderOutdoorContent = () => {
    if (loadingOutdoor) {
      return <Text style={styles.contentMuted}>Loading...</Text>;
    }

    if (!outdoorSessions.length) {
      return (
        <View style={styles.listContainer}>
          <Text style={styles.contentMuted}>No recent outdoor sessions.</Text>

          <TouchableOpacity
            style={styles.viewAllButton}
            activeOpacity={0.85}
            onPress={handleViewAllOutdoorPress}
          >
            <Text style={styles.viewAllText}>View all outdoor sessions</Text>
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
        {outdoorSessions.map((sesh) => {
          const baseDate = sesh.ended_at ? new Date(sesh.ended_at) : null;
          const dateLabel = baseDate
            ? baseDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
            : 'Session';

          const typeLabel = formatActivityTypeLabel(sesh.activity_type);
          const dur = formatDurationFromSeconds(sesh.duration_s);
          const dist = formatDistanceFromMeters(sesh.distance_m, distanceUnit);

          const parts = [typeLabel];
          if (dur) parts.push(dur);
          if (dist) parts.push(dist);

          const subtitle = parts.join(' · ');

          return (
            <TouchableOpacity
              key={sesh.id}
              style={styles.listItem}
              activeOpacity={0.8}
              onPress={() => handleOutdoorSessionPress(sesh.id)}
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
          onPress={handleViewAllOutdoorPress}
        >
          <Text style={styles.viewAllText}>View all outdoor sessions</Text>
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
    if (selectedDetailIndex === 1) return renderOutdoorContent();

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
