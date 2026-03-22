// components/my components/progress/StrengthWorkoutCard.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/providers/AppThemeProvider';

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
  const { colors, fonts } = useAppTheme();
  const styles = React.useMemo(() => createStyles(colors, fonts), [colors, fonts]);

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
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </TouchableOpacity>
  );
};

function createStyles(
  colors: ReturnType<typeof useAppTheme>['colors'],
  fonts: ReturnType<typeof useAppTheme>['fonts']
) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
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
      lineHeight: 18,
      color: colors.text,
      fontFamily: fonts.heading,
    },
    subtitle: {
      fontSize: 11,
      lineHeight: 15,
      color: colors.textMuted,
      marginTop: 4,
      fontFamily: fonts.body,
    },
  });
}

export default StrengthWorkoutCard;
