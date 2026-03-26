import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useUnits } from '@/contexts/UnitsContext';
import type { StrengthRestTimerState } from '@/lib/strength/restTimer';
import type { ExerciseDraft, SupersetBlockDraft } from '@/lib/strength/types';
import {
  appendSupersetRound,
  getSupersetProgress,
  hasSupersetPendingRoundsAfter,
  isSupersetRoundComplete,
} from '@/lib/strength/workoutBlocks';
import { useAppTheme } from '@/providers/AppThemeProvider';
import { HOME_TONES } from '../../../home/tokens';

import SupersetRoundSection from './SupersetRoundSection';
import SupersetRestTimer from './SupersetRestTimer';

type Props = {
  block: SupersetBlockDraft;
  label: string;
  restTimer: StrengthRestTimerState;
  onChange: (updated: SupersetBlockDraft) => void;
  onDelete: () => void;
  onStartRest: (supersetId: string, restSeconds: number) => void;
  onPauseRest: () => void;
  onResumeRest: () => void;
  onResetRest: (supersetId: string, restSeconds: number) => void;
  onClearRest: (supersetId: string) => void;
};

const SupersetBlock: React.FC<Props> = ({
  block,
  label,
  restTimer,
  onChange,
  onDelete,
  onStartRest,
  onPauseRest,
  onResumeRest,
  onResetRest,
  onClearRest,
}) => {
  const { colors, fonts } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);
  const { weightUnit } = useUnits();
  const progress = getSupersetProgress(block);
  const timerBelongsToBlock =
    restTimer.ownerKind === 'superset' && restTimer.ownerId === block.id;
  const restLocked =
    timerBelongsToBlock &&
    (restTimer.status === 'running' || restTimer.status === 'paused');

  const updateExercise = (
    exerciseInstanceId: string,
    updater: (exercise: ExerciseDraft) => ExerciseDraft
  ) => {
    onChange({
      ...block,
      exercises: block.exercises.map((exercise) =>
        exercise.instanceId === exerciseInstanceId ? updater(exercise) : exercise
      ),
    });
  };

  const handleToggleComplete = (
    exerciseInstanceId: string,
    setIndex: number,
    nextDone: boolean
  ) => {
    const roundIndex = setIndex - 1;
    const nextBlock: SupersetBlockDraft = {
      ...block,
      exercises: block.exercises.map((currentExercise) =>
        currentExercise.instanceId === exerciseInstanceId
          ? {
              ...currentExercise,
              sets: currentExercise.sets.map((setDraft) =>
                setDraft.set_index === setIndex
                  ? { ...setDraft, done: nextDone }
                  : setDraft
              ),
            }
          : currentExercise
      ),
    };

    if (timerBelongsToBlock && restTimer.status === 'ready') {
      onClearRest(block.id);
    }

    onChange(nextBlock);

    if (!nextDone) {
      onClearRest(block.id);
      return;
    }

    if (
      isSupersetRoundComplete(nextBlock, roundIndex) &&
      hasSupersetPendingRoundsAfter(nextBlock, roundIndex)
    ) {
      onStartRest(block.id, block.restSeconds);
      return;
    }

    if (!hasSupersetPendingRoundsAfter(nextBlock, roundIndex)) {
      onClearRest(block.id);
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <View style={styles.copy}>
          <Text style={styles.eyebrow}>Structured block</Text>
          <Text style={styles.title}>{label}</Text>
          <Text style={styles.meta}>
            {block.exercises.length} exercises • {progress.roundCount} rounds •{' '}
            {block.restSeconds}s rest
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.92}
          style={styles.deleteBtn}
          onPress={onDelete}
        >
          <Ionicons name="trash-outline" size={18} color={colors.danger} />
        </TouchableOpacity>
      </View>

      <View style={styles.roundPill}>
        <Ionicons name="git-compare-outline" size={14} color={colors.highlight1} />
        <Text style={styles.roundPillText}>
          {progress.complete
            ? 'All rounds complete'
            : `Round ${progress.activeRoundIndex + 1} of ${progress.roundCount}`}
        </Text>
      </View>

      <View style={styles.roundList}>
        {Array.from({ length: progress.roundCount }, (_, roundIndex) => (
          <SupersetRoundSection
            key={`${block.id}:round:${roundIndex + 1}`}
            exercises={block.exercises}
            roundIndex={roundIndex}
            roundCount={progress.roundCount}
            activeRoundIndex={progress.activeRoundIndex}
            activeExerciseIndex={progress.activeExerciseIndex}
            complete={progress.complete}
            restLocked={restLocked}
            onChangeExercise={updateExercise}
            onToggleComplete={handleToggleComplete}
          />
        ))}
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity
          activeOpacity={0.92}
          style={styles.addRoundBtn}
          onPress={() => onChange(appendSupersetRound(block, weightUnit))}
        >
          <Ionicons name="add" size={16} color={colors.highlight1} />
          <Text style={styles.addRoundText}>Add round</Text>
        </TouchableOpacity>
      </View>

      <SupersetRestTimer
        timer={restTimer}
        supersetId={block.id}
        onPause={onPauseRest}
        onResume={onResumeRest}
        onReset={() => onResetRest(block.id, block.restSeconds)}
      />
    </View>
  );
};

export default SupersetBlock;

function createStyles(
  colors: ReturnType<typeof useAppTheme>['colors'],
  fonts: ReturnType<typeof useAppTheme>['fonts']
) {
  return StyleSheet.create({
    wrap: {
      borderRadius: 26,
      borderWidth: 1,
      borderColor: colors.glowPrimary,
      backgroundColor: HOME_TONES.surface1,
      padding: 14,
      gap: 12,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
    },
    copy: {
      flex: 1,
      gap: 4,
    },
    eyebrow: {
      color: HOME_TONES.textTertiary,
      fontFamily: fonts.label,
      fontSize: 11,
      lineHeight: 14,
      letterSpacing: 0.9,
      textTransform: 'uppercase',
    },
    title: {
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.heading,
      fontSize: 22,
      lineHeight: 26,
      letterSpacing: -0.5,
    },
    meta: {
      color: HOME_TONES.textSecondary,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 18,
    },
    deleteBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: HOME_TONES.surface2,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    roundPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      alignSelf: 'flex-start',
      borderRadius: 999,
      backgroundColor: colors.accentSoft,
      borderWidth: 1,
      borderColor: colors.glowPrimary,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    roundPillText: {
      color: colors.highlight1,
      fontFamily: fonts.heading,
      fontSize: 13,
      lineHeight: 17,
    },
    roundList: {
      gap: 10,
    },
    actionsRow: {
      flexDirection: 'row',
      justifyContent: 'flex-start',
    },
    addRoundBtn: {
      minHeight: 42,
      borderRadius: 14,
      backgroundColor: HOME_TONES.surface2,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      paddingHorizontal: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    addRoundText: {
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.heading,
      fontSize: 14,
      lineHeight: 18,
    },
  });
}
