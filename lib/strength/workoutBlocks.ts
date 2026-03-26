import { v4 as uuidv4 } from 'uuid';

import type {
  ExerciseBlockDraft,
  ExerciseDraft,
  PreviousExerciseSetSuggestion,
  SetDraft,
  StrengthWorkoutBlockDraft,
  SupersetBlockDraft,
  UnitMass,
} from '@/lib/strength/types';

export function createEmptySetDraft(
  setIndex: number,
  weightUnit: UnitMass,
  setType: SetDraft['set_type'] = 'normal'
): SetDraft {
  return {
    tempId: uuidv4(),
    set_index: setIndex,
    set_type: setType,
    weight_unit_csv: weightUnit,
    weight: undefined,
    reps: undefined,
    rpe: undefined,
    est_1rm: undefined,
    done: false,
    notes: null,
  };
}

export function createExerciseDraft(params: {
  exerciseId: string;
  exerciseName: string;
  weightUnit: UnitMass;
  previousSessionSets?: PreviousExerciseSetSuggestion[];
  roundCount?: number;
}): ExerciseDraft {
  const previousSessionSets = params.previousSessionSets ?? [];
  const targetRoundCount = Math.max(
    1,
    params.roundCount ?? 0,
    previousSessionSets.length
  );

  return {
    instanceId: uuidv4(),
    exercise_id: params.exerciseId,
    exercise_name: params.exerciseName,
    previousSessionSets,
    sets: Array.from({ length: targetRoundCount }, (_, index) =>
      createEmptySetDraft(
        index + 1,
        params.weightUnit,
        previousSessionSets[index]?.set_type ?? 'normal'
      )
    ),
  };
}

export function createExerciseBlock(exercise: ExerciseDraft): ExerciseBlockDraft {
  return {
    id: uuidv4(),
    kind: 'exercise',
    exercise,
  };
}

export function createSupersetBlock(params: {
  restSeconds: number;
  exercises: ExerciseDraft[];
}): SupersetBlockDraft {
  return {
    id: uuidv4(),
    kind: 'superset',
    restSeconds: Math.max(1, Math.round(params.restSeconds)),
    exercises: params.exercises,
  };
}

export function flattenExercisesFromBlocks(
  blocks: StrengthWorkoutBlockDraft[]
): ExerciseDraft[] {
  return blocks.flatMap((block) =>
    block.kind === 'superset' ? block.exercises : [block.exercise]
  );
}

export function getSupersetRoundCount(block: SupersetBlockDraft) {
  return Math.max(1, ...block.exercises.map((exercise) => exercise.sets.length));
}

export function padExerciseRoundsToCount(
  exercise: ExerciseDraft,
  roundCount: number,
  weightUnit: UnitMass
): ExerciseDraft {
  if (exercise.sets.length >= roundCount) {
    return exercise;
  }

  const nextSets = [...exercise.sets];
  for (let index = exercise.sets.length; index < roundCount; index += 1) {
    nextSets.push(
      createEmptySetDraft(
        index + 1,
        weightUnit,
        exercise.previousSessionSets?.[index]?.set_type ?? 'normal'
      )
    );
  }

  return {
    ...exercise,
    sets: nextSets,
  };
}

export function normalizeSupersetRounds(
  block: SupersetBlockDraft,
  weightUnit: UnitMass
): SupersetBlockDraft {
  const roundCount = getSupersetRoundCount(block);

  return {
    ...block,
    exercises: block.exercises.map((exercise) =>
      padExerciseRoundsToCount(exercise, roundCount, weightUnit)
    ),
  };
}

export function appendSupersetRound(
  block: SupersetBlockDraft,
  weightUnit: UnitMass
): SupersetBlockDraft {
  const nextRound = getSupersetRoundCount(block) + 1;

  return {
    ...block,
    exercises: block.exercises.map((exercise) => ({
      ...exercise,
      sets: [
        ...exercise.sets,
        createEmptySetDraft(
          nextRound,
          weightUnit,
          exercise.previousSessionSets?.[nextRound - 1]?.set_type ?? 'normal'
        ),
      ],
    })),
  };
}

export function getSupersetProgress(block: SupersetBlockDraft) {
  const roundCount = getSupersetRoundCount(block);

  for (let roundIndex = 0; roundIndex < roundCount; roundIndex += 1) {
    for (let exerciseIndex = 0; exerciseIndex < block.exercises.length; exerciseIndex += 1) {
      const setDraft = block.exercises[exerciseIndex]?.sets[roundIndex];
      if (!setDraft?.done) {
        return {
          roundCount,
          activeRoundIndex: roundIndex,
          activeExerciseIndex: exerciseIndex,
          complete: false,
        };
      }
    }
  }

  return {
    roundCount,
    activeRoundIndex: roundCount - 1,
    activeExerciseIndex: block.exercises.length - 1,
    complete: true,
  };
}

export function isSupersetRoundComplete(
  block: SupersetBlockDraft,
  roundIndex: number
) {
  return block.exercises.every((exercise) => Boolean(exercise.sets[roundIndex]?.done));
}

export function hasSupersetPendingRoundsAfter(
  block: SupersetBlockDraft,
  roundIndex: number
) {
  const roundCount = getSupersetRoundCount(block);

  for (let idx = roundIndex + 1; idx < roundCount; idx += 1) {
    if (!isSupersetRoundComplete(block, idx)) {
      return true;
    }
  }

  return false;
}

export function getSupersetLabel(blockIndex: number) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  if (blockIndex < alphabet.length) {
    return `Superset ${alphabet[blockIndex]}`;
  }

  return `Superset ${blockIndex + 1}`;
}
