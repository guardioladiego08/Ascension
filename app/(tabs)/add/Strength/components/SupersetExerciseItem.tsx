import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { ExerciseDraft, SetDraft } from '@/lib/strength/types';
import { useAppTheme } from '@/providers/AppThemeProvider';
import { HOME_TONES } from '../../../home/tokens';

import SetRow from './SetRow';

type Props = {
  exercise: ExerciseDraft;
  exerciseIndex: number;
  exerciseCount: number;
  activeRoundIndex: number;
  activeExerciseIndex: number;
  roundCount: number;
  complete: boolean;
  restLocked: boolean;
  onChange: (updated: ExerciseDraft) => void;
  onToggleComplete: (setIndex: number, nextDone: boolean) => void;
};

const SupersetExerciseItem: React.FC<Props> = ({
  exercise,
  exerciseIndex,
  exerciseCount,
  activeRoundIndex,
  activeExerciseIndex,
  roundCount,
  complete,
  restLocked,
  onChange,
  onToggleComplete,
}) => {
  const { colors, fonts } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);

  const isCurrentExercise =
    !complete && !restLocked && exerciseIndex === activeExerciseIndex;
  const hasCompletedCurrentRound = Boolean(exercise.sets[activeRoundIndex]?.done);
  const toneStyle = complete
    ? styles.statusComplete
    : restLocked
      ? styles.statusRest
      : isCurrentExercise
        ? styles.statusActive
        : hasCompletedCurrentRound
          ? styles.statusDone
          : styles.statusQueued;
  const toneTextStyle = complete
    ? styles.statusTextComplete
    : restLocked
      ? styles.statusTextRest
      : isCurrentExercise
        ? styles.statusTextActive
        : hasCompletedCurrentRound
          ? styles.statusTextDone
          : styles.statusTextQueued;
  const statusLabel = complete
    ? 'Complete'
    : restLocked
      ? 'Resting'
      : isCurrentExercise
        ? 'Up now'
        : hasCompletedCurrentRound
          ? 'Done'
          : 'Up next';

  const updateSet = (tempId: string, updater: (setDraft: SetDraft) => SetDraft) => {
    onChange({
      ...exercise,
      sets: exercise.sets.map((setDraft) =>
        setDraft.tempId === tempId ? updater(setDraft) : setDraft
      ),
    });
  };

  return (
    <View style={[styles.wrap, isCurrentExercise ? styles.wrapActive : null]}>
      <View style={styles.headerRow}>
        <View style={styles.copy}>
          <Text style={styles.name}>{exercise.exercise_name}</Text>
          <Text style={styles.meta}>
            Exercise {exerciseIndex + 1} of {exerciseCount}
          </Text>
        </View>

        <View style={[styles.statusPill, toneStyle]}>
          <Text style={[styles.statusText, toneTextStyle]}>{statusLabel}</Text>
        </View>
      </View>

      <Text style={styles.roundCopy}>
        Current set {Math.min(activeRoundIndex + 1, roundCount)} of {roundCount}
      </Text>

      <View style={styles.tableHeader}>
        <Text style={[styles.th, styles.thSet]}>Set</Text>
        <Text style={[styles.th, styles.thWeight]}>Weight</Text>
        <Text style={[styles.th, styles.thReps]}>Reps</Text>
        <Text style={[styles.th, styles.thDone]}>Done</Text>
      </View>

      {exercise.sets.map((setDraft) => {
        const roundIndex = setDraft.set_index - 1;
        const completionDisabled =
          !setDraft.done &&
          (complete ||
            restLocked ||
            roundIndex !== activeRoundIndex ||
            exerciseIndex !== activeExerciseIndex);

        return (
          <SetRow
            key={setDraft.tempId}
            setDraft={setDraft}
            displayIndex={setDraft.set_type === 'normal' ? setDraft.set_index : null}
            suggestedSet={exercise.previousSessionSets?.[roundIndex]}
            completionDisabled={completionDisabled}
            onChange={(next) => updateSet(setDraft.tempId, () => next)}
            onToggleComplete={(nextDone) => onToggleComplete(setDraft.set_index, nextDone)}
          />
        );
      })}
    </View>
  );
};

export default SupersetExerciseItem;

function createStyles(
  colors: ReturnType<typeof useAppTheme>['colors'],
  fonts: ReturnType<typeof useAppTheme>['fonts']
) {
  return StyleSheet.create({
    wrap: {
      borderRadius: 22,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      backgroundColor: HOME_TONES.surface2,
      padding: 14,
      gap: 10,
    },
    wrapActive: {
      borderColor: colors.highlight1,
      backgroundColor: HOME_TONES.surface1,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 12,
    },
    copy: {
      flex: 1,
      gap: 4,
    },
    name: {
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.heading,
      fontSize: 17,
      lineHeight: 21,
    },
    meta: {
      color: HOME_TONES.textTertiary,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 16,
    },
    statusPill: {
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderWidth: 1,
    },
    statusActive: {
      backgroundColor: colors.accentSoft,
      borderColor: colors.glowPrimary,
    },
    statusDone: {
      backgroundColor: HOME_TONES.panelOverlayStrong,
      borderColor: HOME_TONES.borderSoft,
    },
    statusQueued: {
      backgroundColor: HOME_TONES.surface1,
      borderColor: HOME_TONES.borderSoft,
    },
    statusRest: {
      backgroundColor: colors.accentTertiarySoft,
      borderColor: colors.glowTertiary,
    },
    statusComplete: {
      backgroundColor: colors.accentSoft,
      borderColor: colors.success,
    },
    statusText: {
      fontFamily: fonts.label,
      fontSize: 11,
      lineHeight: 14,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    statusTextActive: {
      color: colors.highlight1,
    },
    statusTextDone: {
      color: HOME_TONES.textSecondary,
    },
    statusTextQueued: {
      color: HOME_TONES.textTertiary,
    },
    statusTextRest: {
      color: colors.highlight3,
    },
    statusTextComplete: {
      color: colors.success,
    },
    roundCopy: {
      color: HOME_TONES.textSecondary,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 17,
    },
    tableHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 2,
    },
    th: {
      color: HOME_TONES.textTertiary,
      fontFamily: fonts.label,
      fontSize: 10,
      lineHeight: 13,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    thSet: {
      width: 40,
      textAlign: 'center',
    },
    thWeight: {
      flex: 1,
      textAlign: 'center',
    },
    thReps: {
      width: 76,
      textAlign: 'center',
    },
    thDone: {
      width: 34,
      textAlign: 'center',
    },
  });
}
