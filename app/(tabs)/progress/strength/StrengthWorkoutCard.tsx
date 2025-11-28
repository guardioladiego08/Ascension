// components/my components/progress/StrengthWorkoutCard.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';

export type StrengthWorkoutRow = {
  id: string;
  started_at: string;
  ended_at: string | null;
  total_vol: number | null;
  notes?: string | null;
};

type Props = {
  workout: StrengthWorkoutRow;
  onPress?: () => void;
};

const StrengthWorkoutCard: React.FC<Props> = ({ workout, onPress }) => {
  const date = new Date(workout.started_at);
  const dateLabel = date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  // Duration computed from timestamps
  let durationLabel = '';
  if (workout.ended_at) {
    const startMs = new Date(workout.started_at).getTime();
    const endMs = new Date(workout.ended_at).getTime();
    const diffMin = Math.max(0, Math.round((endMs - startMs) / 60000));
    if (diffMin > 0) {
      durationLabel = `${diffMin} min`;
    }
  }

  const volumeLabel =
    workout.total_vol && workout.total_vol > 0
      ? `${Math.round(workout.total_vol)} total volume`
      : '';

  const stats = [durationLabel, volumeLabel].filter(Boolean).join(' · ');

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={onPress}
    >
      <View style={styles.left}>
        <Text style={styles.title}>{dateLabel}</Text>
        <Text style={styles.subtitle}>
          {stats || 'Strength session'}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#9DA4C4" />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.dark.card,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  left: {
    flex: 1,
    paddingRight: 8,
  },
  title: {
    fontSize: 14,
    color: '#E5E7F5',
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 11,
    color: '#9DA4C4',
    marginTop: 4,
  },
});

export default StrengthWorkoutCard;
