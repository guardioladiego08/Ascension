import { useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';
import {
  fetchVisibleExerciseById,
  getAuthenticatedUserId,
  type ExerciseRecord,
} from '@/lib/strength/exercises';

import type {
  StrengthExerciseSetRow,
  StrengthExerciseSummaryRow,
  StrengthExerciseWorkoutRow,
} from './strengthExerciseDetailUtils';

type StrengthExerciseDetailState = {
  exercise: ExerciseRecord | null;
  summaries: StrengthExerciseSummaryRow[];
  sets: StrengthExerciseSetRow[];
  workouts: StrengthExerciseWorkoutRow[];
  loading: boolean;
  error: string | null;
};

function resolveExerciseId(value: string | string[] | undefined) {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

const INITIAL_STATE: StrengthExerciseDetailState = {
  exercise: null,
  summaries: [],
  sets: [],
  workouts: [],
  loading: true,
  error: null,
};

export function useStrengthExerciseDetail(exerciseIdParam: string | string[] | undefined) {
  const exerciseId = resolveExerciseId(exerciseIdParam);
  const [reloadKey, setReloadKey] = useState(0);
  const [state, setState] = useState<StrengthExerciseDetailState>(INITIAL_STATE);

  useEffect(() => {
    let isActive = true;

    async function load() {
      if (!exerciseId) {
        if (isActive) {
          setState({
            exercise: null,
            summaries: [],
            sets: [],
            workouts: [],
            loading: false,
            error: 'No exercise ID was provided.',
          });
        }
        return;
      }

      try {
        if (isActive) {
          setState((current) => ({
            ...current,
            loading: true,
            error: null,
          }));
        }

        const userId = await getAuthenticatedUserId();
        if (!userId) {
          if (isActive) {
            setState({
              exercise: null,
              summaries: [],
              sets: [],
              workouts: [],
              loading: false,
              error: 'Not signed in.',
            });
          }
          return;
        }

        const [exercise, summaryResponse] = await Promise.all([
          fetchVisibleExerciseById(userId, exerciseId),
          supabase
            .schema('strength')
            .from('exercise_summary')
            .select(
              'strength_workout_id, vol, strongest_set, best_est_1rm, avg_set, created_at'
            )
            .eq('user_id', userId)
            .eq('exercise_id', exerciseId),
        ]);

        if (!exercise) {
          if (isActive) {
            setState({
              exercise: null,
              summaries: [],
              sets: [],
              workouts: [],
              loading: false,
              error: 'Exercise not found.',
            });
          }
          return;
        }

        if (summaryResponse.error) {
          throw summaryResponse.error;
        }

        const summaries = (summaryResponse.data ?? []) as StrengthExerciseSummaryRow[];
        const workoutIds = Array.from(
          new Set(
            summaries
              .map((summary) => summary.strength_workout_id)
              .filter((value): value is string => Boolean(value))
          )
        );

        if (workoutIds.length === 0) {
          if (isActive) {
            setState({
              exercise,
              summaries: [],
              sets: [],
              workouts: [],
              loading: false,
              error: null,
            });
          }
          return;
        }

        const [setResponse, workoutResponse] = await Promise.all([
          supabase
            .schema('strength')
            .from('strength_sets')
            .select(
              'id, exercise_id, strength_workout_id, set_index, set_type, weight, weight_unit_csv, reps, est_1rm, rpe, notes, performed_at'
            )
            .eq('exercise_id', exerciseId)
            .in('strength_workout_id', workoutIds)
            .order('performed_at', { ascending: true })
            .order('set_index', { ascending: true }),
          supabase
            .schema('strength')
            .from('strength_workouts')
            .select('id, started_at, ended_at, total_vol, name')
            .eq('user_id', userId)
            .in('id', workoutIds),
        ]);

        if (setResponse.error) throw setResponse.error;
        if (workoutResponse.error) throw workoutResponse.error;

        if (isActive) {
          setState({
            exercise,
            summaries,
            sets: (setResponse.data ?? []) as StrengthExerciseSetRow[],
            workouts: (workoutResponse.data ?? []) as StrengthExerciseWorkoutRow[],
            loading: false,
            error: null,
          });
        }
      } catch (error) {
        console.warn('[StrengthExerciseDetail] Failed to load exercise detail', error);
        if (isActive) {
          setState({
            exercise: null,
            summaries: [],
            sets: [],
            workouts: [],
            loading: false,
            error: 'Unable to load this exercise right now.',
          });
        }
      }
    }

    load();

    return () => {
      isActive = false;
    };
  }, [exerciseId, reloadKey]);

  return {
    ...state,
    reload: () => setReloadKey((value) => value + 1),
  };
}
