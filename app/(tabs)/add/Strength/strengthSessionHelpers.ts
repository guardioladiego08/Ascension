import type {
  PreviousExerciseSetSuggestion,
  SetType,
  UnitMass,
} from '@/lib/strength/types';
import { supabase } from '@/lib/supabase';

export const AUTH_TIMEOUT_MS = 8000;
export const STARTUP_TIMEOUT_MS = 12000;

export type StrengthWorkoutRow = {
  id: string;
  user_id: string | null;
  started_at: string | null;
  ended_at: string | null;
};

type ExerciseSummaryHistoryRow = {
  strength_workout_id: string;
};

type StrengthSetHistoryRow = {
  weight: number | null;
  weight_unit_csv: UnitMass | null;
  reps: number | null;
  set_index: number;
  set_type: SetType | null;
};

export function makeStrengthSessionId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export const toKgWeight = (weight: number | null | undefined, unit: UnitMass) =>
  weight == null ? 0 : unit === 'kg' ? weight : weight * 0.45359237;

export function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`${label} timed out. Please try again.`));
    }, timeoutMs);

    promise.then(
      (value) => {
        clearTimeout(timeoutId);
        resolve(value);
      },
      (error) => {
        clearTimeout(timeoutId);
        reject(error);
      }
    );
  });
}

export async function ensureAuthedUserId(): Promise<string> {
  const initialSession = await withTimeout(
    supabase.auth.getSession(),
    AUTH_TIMEOUT_MS,
    'Loading your session'
  );
  if (initialSession.error) throw initialSession.error;

  const initialUid = initialSession.data.session?.user?.id;
  if (initialUid) {
    return initialUid;
  }

  const { error: refreshErr } = await withTimeout(
    supabase.auth.refreshSession(),
    AUTH_TIMEOUT_MS,
    'Refreshing your session'
  );
  if (refreshErr) {
    console.warn('[StrengthTrain] refreshSession failed', refreshErr);
  }

  const { data, error: sessionError } = await withTimeout(
    supabase.auth.getSession(),
    AUTH_TIMEOUT_MS,
    'Reloading your session'
  );
  if (sessionError) throw sessionError;

  const uid = data.session?.user?.id;
  if (!uid) {
    throw new Error('Session expired. Please sign in again.');
  }
  return uid;
}

export async function getStrengthWorkoutRow(workoutId: string) {
  const { data, error } = await supabase
    .schema('strength')
    .from('strength_workouts')
    .select('id,user_id,started_at,ended_at')
    .eq('id', workoutId)
    .maybeSingle<StrengthWorkoutRow>();

  if (error) throw error;
  return data;
}

export async function createStrengthWorkoutRow(params: {
  userId: string;
  startedAtISO?: string | null;
}) {
  const payload: { user_id: string; started_at?: string } = {
    user_id: params.userId,
  };

  if (params.startedAtISO) {
    payload.started_at = params.startedAtISO;
  }

  const { data, error } = await supabase
    .schema('strength')
    .from('strength_workouts')
    .insert(payload)
    .select('id, user_id, started_at, ended_at')
    .single<StrengthWorkoutRow>();

  if (error) throw error;
  return data;
}

export async function getPreviousSessionStrengthSets(params: {
  userId: string;
  exerciseId: string;
}): Promise<PreviousExerciseSetSuggestion[]> {
  const { data: summaryRows, error: summaryError } = await supabase
    .schema('strength')
    .from('exercise_summary')
    .select('strength_workout_id')
    .eq('user_id', params.userId)
    .eq('exercise_id', params.exerciseId);

  if (summaryError) throw summaryError;

  const workoutIds = Array.from(
    new Set(
      ((summaryRows ?? []) as ExerciseSummaryHistoryRow[])
        .map((row) => row.strength_workout_id)
        .filter(Boolean)
    )
  );

  if (workoutIds.length === 0) {
    return [];
  }

  const { data: workouts, error: workoutsError } = await supabase
    .schema('strength')
    .from('strength_workouts')
    .select('id, started_at, ended_at')
    .eq('user_id', params.userId)
    .in('id', workoutIds);

  if (workoutsError) throw workoutsError;

  const latestWorkout = [...(workouts ?? [])]
    .filter((row: any) => !!row?.id)
    .sort((a: any, b: any) => {
      const aMs = new Date(a.ended_at ?? a.started_at ?? 0).getTime();
      const bMs = new Date(b.ended_at ?? b.started_at ?? 0).getTime();
      return bMs - aMs;
    })[0];

  if (!latestWorkout?.id) {
    return [];
  }

  const { data: setRows, error: setError } = await supabase
    .schema('strength')
    .from('strength_sets')
    .select('weight, weight_unit_csv, reps, set_index, set_type')
    .eq('exercise_id', params.exerciseId)
    .eq('strength_workout_id', latestWorkout.id)
    .order('set_index', { ascending: true });

  if (setError) throw setError;

  return ((setRows ?? []) as StrengthSetHistoryRow[]).map((row, index) => ({
    set_index: row.set_index ?? index + 1,
    set_type:
      row.set_type === 'warmup' ||
      row.set_type === 'dropset' ||
      row.set_type === 'failure'
        ? row.set_type
        : 'normal',
    weight: row.weight ?? null,
    weight_unit_csv:
      row.weight_unit_csv === 'kg' || row.weight_unit_csv === 'lb'
        ? row.weight_unit_csv
        : null,
    reps: row.reps ?? null,
  }));
}
