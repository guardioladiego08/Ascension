import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { StrengthRestTimerState } from '@/lib/strength/restTimer';
import type { ExerciseDraft, SupersetBlockDraft, StrengthWorkoutBlockDraft } from '@/lib/strength/types';
import { getSupersetLabel } from '@/lib/strength/workoutBlocks';
import { useAppTheme } from '@/providers/AppThemeProvider';
import { HOME_TONES } from '../../../home/tokens';

import ExerciseCard from './ExerciseCard';
import SupersetBlock from './SupersetBlock';

type Props = {
  blocks: StrengthWorkoutBlockDraft[];
  restTimer: StrengthRestTimerState;
  onRemoveSuperset: (blockId: string) => void;
  onUpdateSuperset: (blockId: string, updated: SupersetBlockDraft) => void;
  onStartSupersetRest: (supersetId: string, durationSeconds: number) => void;
  onPauseRest: () => void;
  onResumeRest: () => void;
  onResetSupersetRest: (supersetId: string, durationSeconds: number) => void;
  onClearSupersetRest: (supersetId: string) => void;
  onRemoveExercise: (blockId: string, exerciseInstanceId: string) => void;
  onUpdateExercise: (blockId: string, updated: ExerciseDraft) => void;
  onSetCompleted: (exerciseInstanceId: string) => void;
};

export default function StrengthBlocksList({
  blocks,
  restTimer,
  onRemoveSuperset,
  onUpdateSuperset,
  onStartSupersetRest,
  onPauseRest,
  onResumeRest,
  onResetSupersetRest,
  onClearSupersetRest,
  onRemoveExercise,
  onUpdateExercise,
  onSetCompleted,
}: Props) {
  const { colors, fonts } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);

  if (blocks.length === 0) {
    return (
      <View style={[styles.panelSoft, styles.empty]}>
        <View style={styles.emptyIconWrap}>
          <Ionicons name="barbell-outline" size={20} color={colors.highlight1} />
        </View>
        <Text style={styles.emptyTitle}>No exercises added yet</Text>
        <Text style={styles.emptyText}>
          Add an exercise or build a superset to start logging this session.
        </Text>
      </View>
    );
  }

  let supersetIndex = 0;
  return (
    <View style={styles.exerciseList}>
      {blocks.map((block) => {
        if (block.kind === 'superset') {
          const label = getSupersetLabel(supersetIndex);
          supersetIndex += 1;

          return (
            <SupersetBlock
              key={block.id}
              block={block}
              label={label}
              restTimer={restTimer}
              onDelete={() => onRemoveSuperset(block.id)}
              onChange={(updated) => onUpdateSuperset(block.id, updated)}
              onStartRest={onStartSupersetRest}
              onPauseRest={onPauseRest}
              onResumeRest={onResumeRest}
              onResetRest={onResetSupersetRest}
              onClearRest={onClearSupersetRest}
            />
          );
        }

        return (
          <ExerciseCard
            key={block.id}
            exercise={block.exercise}
            restTimer={restTimer}
            onDelete={() => onRemoveExercise(block.id, block.exercise.instanceId)}
            onChange={(updated) => onUpdateExercise(block.id, updated)}
            onSetCompleted={onSetCompleted}
          />
        );
      })}
    </View>
  );
}

function createStyles(
  colors: ReturnType<typeof useAppTheme>['colors'],
  fonts: ReturnType<typeof useAppTheme>['fonts']
) {
  return StyleSheet.create({
    exerciseList: {
      gap: 14,
    },
    panelSoft: {
      backgroundColor: HOME_TONES.surface2,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      padding: 18,
    },
    empty: {
      alignItems: 'center',
      paddingVertical: 28,
      paddingHorizontal: 18,
    },
    emptyIconWrap: {
      width: 48,
      height: 48,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.accentSoft,
      marginBottom: 14,
    },
    emptyTitle: {
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.heading,
      fontSize: 18,
      lineHeight: 22,
    },
    emptyText: {
      marginTop: 8,
      color: HOME_TONES.textSecondary,
      fontFamily: fonts.body,
      fontSize: 14,
      lineHeight: 20,
      textAlign: 'center',
      maxWidth: 260,
    },
  });
}
