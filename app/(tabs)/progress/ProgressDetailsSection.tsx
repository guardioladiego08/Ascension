import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  LayoutChangeEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';

import { Colors } from '@/constants/Colors';
import { useUnits } from '@/contexts/UnitsContext';
import {
  fetchCardioSessions,
  fetchNutritionDays,
  fetchStrengthWorkouts,
  formatCardioActivityTypeLabel,
  getAuthenticatedUserId,
  type CardioSessionItem,
  type NutritionDayItem,
  type StrengthWorkoutRow,
} from '@/lib/progress/history';

const DETAIL_SEGMENTS = [
  { key: 'weights', label: 'Weights', icon: 'barbell-outline' as const },
  { key: 'cardio', label: 'Cardio', icon: 'walk-outline' as const },
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

function formatNutritionPreview(day: NutritionDayItem) {
  const parts = [
    `${Math.round(day.kcalTotal)} kcal`,
    `P ${Math.round(day.proteinGTotal)}g`,
    `C ${Math.round(day.carbsGTotal)}g`,
    `F ${Math.round(day.fatGTotal)}g`,
  ];

  if (day.goalHit) {
    parts.push('Goal hit');
  }

  return parts.join(' · ');
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

  const [cardioSessions, setCardioSessions] = useState<CardioSessionItem[]>([]);
  const [loadingCardio, setLoadingCardio] = useState(true);

  const [nutritionDays, setNutritionDays] = useState<NutritionDayItem[]>([]);
  const [loadingNutrition, setLoadingNutrition] = useState(true);

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

  const handleViewAllStrengthPress = () => {
    router.push('/progress/strength/allStrengthWorkouts');
  };

  const handleViewAllCardioPress = () => {
    router.push('/progress/cardio/allSessions');
  };

  const handleViewAllNutritionPress = () => {
    router.push('/progress/nutrition/allNutritionDays');
  };

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const load = async () => {
        try {
          setLoadingWeights(true);
          setLoadingCardio(true);
          setLoadingNutrition(true);

          const userId = await getAuthenticatedUserId();
          if (!userId) {
            if (!isActive) return;
            setWeightsWorkouts([]);
            setCardioSessions([]);
            setNutritionDays([]);
            return;
          }

          const [strengthRows, cardioRows, nutritionRows] = await Promise.all([
            fetchStrengthWorkouts(userId, 5),
            fetchCardioSessions(userId, 5),
            fetchNutritionDays(userId, 5),
          ]);

          if (!isActive) return;
          setWeightsWorkouts(strengthRows);
          setCardioSessions(cardioRows);
          setNutritionDays(nutritionRows);
        } catch (err) {
          console.warn('Error loading progress details', err);
          if (!isActive) return;
          setWeightsWorkouts([]);
          setCardioSessions([]);
          setNutritionDays([]);
        } finally {
          if (!isActive) return;
          setLoadingWeights(false);
          setLoadingCardio(false);
          setLoadingNutrition(false);
        }
      };

      load();

      return () => {
        isActive = false;
      };
    }, [])
  );

  const handleStrengthWorkoutPress = (workoutId: string) => {
    router.push(`/add/Strength/${workoutId}`);
  };

  const handleCardioSessionPress = (session: CardioSessionItem) => {
    if (session.source === 'indoor') {
      router.push({
        pathname: '/progress/run_walk/[sessionId]',
        params: { sessionId: session.id },
      });
      return;
    }

    router.push({
      pathname: '/progress/outdoor/[id]',
      params: { id: session.id },
    });
  };

  const handleNutritionDayPress = (date: string) => {
    router.push({
      pathname: '/progress/nutrition/dailyNutritionSummary',
      params: { date },
    });
  };

  const renderWeightsContent = () => {
    const uniqueWeightsWorkouts = weightsWorkouts.filter((workout, index, rows) => {
      return rows.findIndex((row) => row.id === workout.id) === index;
    });

    if (loadingWeights) {
      return <Text style={styles.contentMuted}>Loading...</Text>;
    }

    if (!uniqueWeightsWorkouts.length) {
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
        {uniqueWeightsWorkouts.map((workout) => {
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

  const renderCardioContent = () => {
    if (loadingCardio) {
      return <Text style={styles.contentMuted}>Loading...</Text>;
    }

    if (!cardioSessions.length) {
      return (
        <View style={styles.listContainer}>
          <Text style={styles.contentMuted}>No recent cardio sessions.</Text>

          <TouchableOpacity
            style={styles.viewAllButton}
            activeOpacity={0.85}
            onPress={handleViewAllCardioPress}
          >
            <Text style={styles.viewAllText}>View all cardio sessions</Text>
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
        {cardioSessions.map((session) => {
          const baseDate = session.endedAt
            ? new Date(session.endedAt)
            : session.startedAt
              ? new Date(session.startedAt)
              : null;

          const dateLabel = baseDate
            ? baseDate.toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
              })
            : 'Session';

          const typeLabel = formatCardioActivityTypeLabel(
            session.activityType,
            session.source
          );
          const durationLabel = formatDurationFromSeconds(session.durationS);
          const distanceLabel = formatDistanceFromMeters(
            session.distanceM,
            distanceUnit
          );

          const parts = [typeLabel];
          if (durationLabel) parts.push(durationLabel);
          if (distanceLabel) parts.push(distanceLabel);

          return (
            <TouchableOpacity
              key={`${session.source}:${session.id}`}
              style={styles.listItem}
              activeOpacity={0.8}
              onPress={() => handleCardioSessionPress(session)}
            >
              <View>
                <Text style={styles.listTitle}>{dateLabel}</Text>
                <Text style={styles.listSubtitle}>{parts.join(' · ')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#9DA4C4" />
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity
          style={styles.viewAllButton}
          activeOpacity={0.85}
          onPress={handleViewAllCardioPress}
        >
          <Text style={styles.viewAllText}>View all cardio sessions</Text>
          <Ionicons
            name="arrow-forward-circle-outline"
            size={18}
            color="#A5B4FC"
          />
        </TouchableOpacity>
      </View>
    );
  };

  const renderNutritionContent = () => {
    if (loadingNutrition) {
      return <Text style={styles.contentMuted}>Loading...</Text>;
    }

    if (!nutritionDays.length) {
      return (
        <View style={styles.listContainer}>
          <Text style={styles.contentMuted}>No recent nutrition days.</Text>

          <TouchableOpacity
            style={styles.viewAllButton}
            activeOpacity={0.85}
            onPress={handleViewAllNutritionPress}
          >
            <Text style={styles.viewAllText}>View all nutrition days</Text>
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
        {nutritionDays.map((day) => {
          const baseDate = new Date(`${day.date}T00:00:00`);
          const dateLabel = Number.isNaN(baseDate.getTime())
            ? day.date
            : baseDate.toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
              });

          return (
            <TouchableOpacity
              key={day.id}
              style={styles.listItem}
              activeOpacity={0.8}
              onPress={() => handleNutritionDayPress(day.date)}
            >
              <View>
                <Text style={styles.listTitle}>{dateLabel}</Text>
                <Text style={styles.listSubtitle}>
                  {formatNutritionPreview(day)}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#9DA4C4" />
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity
          style={styles.viewAllButton}
          activeOpacity={0.85}
          onPress={handleViewAllNutritionPress}
        >
          <Text style={styles.viewAllText}>View all nutrition days</Text>
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
    if (selectedDetailIndex === 1) return renderCardioContent();
    return renderNutritionContent();
  };

  return (
    <>
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

        {DETAIL_SEGMENTS.map((segment, index) => (
          <TouchableOpacity
            key={segment.key}
            style={styles.detailSegment}
            activeOpacity={0.8}
            onPress={() => handleDetailSelect(index)}
          >
            <Ionicons
              name={segment.icon}
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
              {segment.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

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
