import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { ExerciseDraft, SetDraft } from '@/lib/strength/types';
import { useAppTheme } from '@/providers/AppThemeProvider';
import { HOME_TONES } from '../../../home/tokens';

import SetRow from './SetRow';

type Props = {
  exercises: ExerciseDraft[];
  roundIndex: number;
  roundCount: number;
  activeRoundIndex: number;
  activeExerciseIndex: number;
  complete: boolean;
  restLocked: boolean;
  onChangeExercise: (
    exerciseInstanceId: string,
    updater: (exercise: ExerciseDraft) => ExerciseDraft
  ) => void;
  onToggleComplete: (
    exerciseInstanceId: string,
    setIndex: number,
    nextDone: boolean
  ) => void;
};

const SupersetRoundSection: React.FC<Props> = ({
  exercises,
  roundIndex,
  roundCount,
  activeRoundIndex,
  activeExerciseIndex,
  complete,
  restLocked,
  onChangeExercise,
  onToggleComplete,
}) => {
  const { colors, fonts } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);
  const roundComplete = exercises.every((exercise) => Boolean(exercise.sets[roundIndex]?.done));
  const isActiveRound = !complete && roundIndex === activeRoundIndex;
  const roundStatusLabel = roundComplete
    ? 'Complete'
    : restLocked && isActiveRound
      ? 'Resting'
      : isActiveRound
        ? 'In progress'
        : roundIndex > activeRoundIndex
          ? 'Queued'
          : 'Pending';
  const roundToneStyle = roundComplete
    ? styles.roundStatusComplete
    : restLocked && isActiveRound
      ? styles.roundStatusRest
      : isActiveRound
        ? styles.roundStatusActive
        : styles.roundStatusQueued;
  const roundToneTextStyle = roundComplete
    ? styles.roundStatusTextComplete
    : restLocked && isActiveRound
      ? styles.roundStatusTextRest
      : isActiveRound
        ? styles.roundStatusTextActive
        : styles.roundStatusTextQueued;

  const updateSet = (
    exercise: ExerciseDraft,
    setDraft: SetDraft,
    updater: (current: SetDraft) => SetDraft
  ) => {
    onChangeExercise(exercise.instanceId, (currentExercise) => ({
      ...currentExercise,
      sets: currentExercise.sets.map((currentSet) =>
        currentSet.tempId === setDraft.tempId ? updater(currentSet) : currentSet
      ),
    }));
  };

  return (
    <View style={[styles.wrap, isActiveRound ? styles.wrapActive : null]}>
      <View style={styles.headerRow}>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Round {roundIndex + 1}</Text>
          <Text style={styles.meta}>
            Sequence {roundIndex + 1} of {roundCount}
          </Text>
        </View>

        <View style={[styles.roundStatusPill, roundToneStyle]}>
          <Text style={[styles.roundStatusText, roundToneTextStyle]}>{roundStatusLabel}</Text>
        </View>
      </View>

      <View style={styles.tableHeader}>
        <Text style={[styles.th, styles.thSet]}>Set</Text>
        <Text style={[styles.th, styles.thWeight]}>Weight</Text>
        <Text style={[styles.th, styles.thReps]}>Reps</Text>
        <Text style={[styles.th, styles.thDone]}>Done</Text>
      </View>

      <View style={styles.exerciseList}>
        {exercises.map((exercise, exerciseIndex) => {
          const setDraft = exercise.sets[roundIndex];
          if (!setDraft) {
            return null;
          }

          const completionDisabled =
            !setDraft.done &&
            (complete ||
              restLocked ||
              roundIndex !== activeRoundIndex ||
              exerciseIndex !== activeExerciseIndex);

          const exerciseStatusLabel = setDraft.done
            ? 'Done'
            : restLocked && isActiveRound
              ? 'Resting'
              : isActiveRound && exerciseIndex === activeExerciseIndex
                ? 'Up now'
                : roundIndex > activeRoundIndex ||
                    (isActiveRound && exerciseIndex > activeExerciseIndex)
                  ? 'Queued'
                  : 'Pending';

          const exerciseToneStyle = setDraft.done
            ? styles.exerciseStatusDone
            : restLocked && isActiveRound
              ? styles.exerciseStatusRest
              : isActiveRound && exerciseIndex === activeExerciseIndex
                ? styles.exerciseStatusActive
                : styles.exerciseStatusQueued;
          const exerciseToneTextStyle = setDraft.done
            ? styles.exerciseStatusTextDone
            : restLocked && isActiveRound
              ? styles.exerciseStatusTextRest
              : isActiveRound && exerciseIndex === activeExerciseIndex
                ? styles.exerciseStatusTextActive
                : styles.exerciseStatusTextQueued;

          return (
            <View key={exercise.instanceId} style={styles.exerciseCard}>
              <View style={styles.exerciseHeader}>
                <View style={styles.exerciseNameRow}>
                  <View style={styles.exerciseOrderBadge}>
                    <Text style={styles.exerciseOrderText}>{exerciseIndex + 1}</Text>
                  </View>

                  <Text style={styles.exerciseName}>{exercise.exercise_name}</Text>
                </View>

                <View style={[styles.exerciseStatusPill, exerciseToneStyle]}>
                  <Text style={[styles.exerciseStatusText, exerciseToneTextStyle]}>
                    {exerciseStatusLabel}
                  </Text>
                </View>
              </View>

              <SetRow
                setDraft={setDraft}
                displayIndex={setDraft.set_type === 'normal' ? setDraft.set_index : null}
                suggestedSet={exercise.previousSessionSets?.[roundIndex]}
                completionDisabled={completionDisabled}
                onChange={(next) => updateSet(exercise, setDraft, () => next)}
                onToggleComplete={(nextDone) =>
                  onToggleComplete(exercise.instanceId, setDraft.set_index, nextDone)
                }
              />
            </View>
          );
        })}
      </View>
    </View>
  );
};

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
      gap: 12,
    },
    wrapActive: {
      borderColor: colors.glowPrimary,
      backgroundColor: HOME_TONES.surface1,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
    },
    headerCopy: {
      flex: 1,
      gap: 3,
    },
    title: {
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
    roundStatusPill: {
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    roundStatusActive: {
      backgroundColor: colors.accentSoft,
      borderColor: colors.glowPrimary,
    },
    roundStatusRest: {
      backgroundColor: colors.accentTertiarySoft,
      borderColor: colors.glowTertiary,
    },
    roundStatusQueued: {
      backgroundColor: HOME_TONES.surface1,
      borderColor: HOME_TONES.borderSoft,
    },
    roundStatusComplete: {
      backgroundColor: HOME_TONES.panelOverlayStrong,
      borderColor: colors.success,
    },
    roundStatusText: {
      fontFamily: fonts.label,
      fontSize: 11,
      lineHeight: 14,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    roundStatusTextActive: {
      color: colors.highlight1,
    },
    roundStatusTextRest: {
      color: colors.highlight3,
    },
    roundStatusTextQueued: {
      color: HOME_TONES.textTertiary,
    },
    roundStatusTextComplete: {
      color: colors.success,
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
    exerciseList: {
      gap: 10,
    },
    exerciseCard: {
      borderRadius: 18,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      backgroundColor: HOME_TONES.surface1,
      padding: 12,
      gap: 8,
    },
    exerciseHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    exerciseNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
    },
    exerciseOrderBadge: {
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: HOME_TONES.surface3,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
    },
    exerciseOrderText: {
      color: HOME_TONES.textSecondary,
      fontFamily: fonts.heading,
      fontSize: 11,
      lineHeight: 14,
    },
    exerciseName: {
      flex: 1,
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.heading,
      fontSize: 15,
      lineHeight: 19,
    },
    exerciseStatusPill: {
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    exerciseStatusActive: {
      backgroundColor: colors.accentSoft,
      borderColor: colors.glowPrimary,
    },
    exerciseStatusRest: {
      backgroundColor: colors.accentTertiarySoft,
      borderColor: colors.glowTertiary,
    },
    exerciseStatusQueued: {
      backgroundColor: HOME_TONES.surface2,
      borderColor: HOME_TONES.borderSoft,
    },
    exerciseStatusDone: {
      backgroundColor: HOME_TONES.panelOverlayStrong,
      borderColor: colors.success,
    },
    exerciseStatusText: {
      fontFamily: fonts.label,
      fontSize: 10,
      lineHeight: 13,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    exerciseStatusTextActive: {
      color: colors.highlight1,
    },
    exerciseStatusTextRest: {
      color: colors.highlight3,
    },
    exerciseStatusTextQueued: {
      color: HOME_TONES.textTertiary,
    },
    exerciseStatusTextDone: {
      color: colors.success,
    },
  });
}

export default SupersetRoundSection;
