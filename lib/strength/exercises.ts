import { supabase } from '@/lib/supabase';

export type ExerciseBodyPartWeight = {
  muscle: string;
  weight: number;
};

export type ExerciseRecord = {
  id: string;
  user_id: string | null;
  exercise_name: string;
  body_parts: string[] | null;
  body_part_weights: ExerciseBodyPartWeight[] | null;
  workout_category: string | null;
  info: string | null;
  created_at: string;
};

type CreateCustomExerciseInput = {
  userId: string;
  exercise_name: string;
  body_parts: string[];
  workout_category: string | null;
  info: string | null;
};

type MaybeExerciseBodyParts = {
  body_parts?: string[] | string | null;
  body_part_weights?: ExerciseBodyPartWeight[] | string | null;
};

const EXERCISE_SELECT =
  'id,user_id,exercise_name,body_parts,body_part_weights,workout_category,info,created_at';
const PAGE_SIZE = 1000;

type ExerciseIdentity = Pick<ExerciseRecord, 'id' | 'user_id' | 'exercise_name' | 'created_at'>;

export function normalizeExerciseName(exerciseName: string | null | undefined) {
  return (exerciseName ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function compareExercisePriority(left: ExerciseIdentity, right: ExerciseIdentity) {
  if (left.user_id == null && right.user_id != null) return -1;
  if (left.user_id != null && right.user_id == null) return 1;

  const createdAtComparison = left.created_at.localeCompare(right.created_at);
  if (createdAtComparison !== 0) return createdAtComparison;

  return left.id.localeCompare(right.id);
}

function sortVisibleExercises(items: ExerciseRecord[]) {
  return [...items].sort((left, right) => {
    const nameComparison = left.exercise_name
      .toLowerCase()
      .localeCompare(right.exercise_name.toLowerCase());

    if (nameComparison !== 0) return nameComparison;
    return compareExercisePriority(left, right);
  });
}

export function dedupeVisibleExercises(items: ExerciseRecord[]) {
  const byNormalizedName = new Map<string, ExerciseRecord>();

  for (const exercise of items) {
    const normalizedName = normalizeExerciseName(exercise.exercise_name);
    if (!normalizedName) continue;

    const existing = byNormalizedName.get(normalizedName);
    if (!existing || compareExercisePriority(exercise, existing) < 0) {
      byNormalizedName.set(normalizedName, exercise);
    }
  }

  return sortVisibleExercises(Array.from(byNormalizedName.values()));
}

export function buildVisibleExercisesFilter(userId: string) {
  return `user_id.is.null,user_id.eq.${userId}`;
}

export async function getAuthenticatedUserId() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) throw error;
  return user?.id ?? null;
}

export async function fetchVisibleExercises(userId: string) {
  const rows: ExerciseRecord[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from('exercises')
      .select(EXERCISE_SELECT)
      .or(buildVisibleExercisesFilter(userId))
      .order('exercise_name', { ascending: true })
      .order('id', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) throw error;

    const batch = (data ?? []) as ExerciseRecord[];
    rows.push(...batch);

    if (batch.length < PAGE_SIZE) {
      break;
    }

    offset += PAGE_SIZE;
  }

  return dedupeVisibleExercises(rows);
}

export async function fetchVisibleExerciseById(userId: string, exerciseId: string) {
  const { data, error } = await supabase
    .from('exercises')
    .select(EXERCISE_SELECT)
    .eq('id', exerciseId)
    .or(buildVisibleExercisesFilter(userId))
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as ExerciseRecord | null;
}

export async function fetchVisibleExerciseCount(userId: string) {
  const { count, error } = await supabase
    .from('exercises')
    .select('id', { count: 'exact', head: true })
    .or(buildVisibleExercisesFilter(userId));

  if (error) throw error;
  return count ?? 0;
}

export async function findVisibleExerciseByName(userId: string, exerciseName: string) {
  const normalizedName = normalizeExerciseName(exerciseName);
  if (!normalizedName) return null;

  const { data, error } = await supabase
    .from('exercises')
    .select(EXERCISE_SELECT)
    .or(buildVisibleExercisesFilter(userId))
    .ilike('exercise_name', exerciseName.trim())
    .limit(20);

  if (error) throw error;

  const matches = (data ?? []) as ExerciseRecord[];
  return (
    dedupeVisibleExercises(matches).find(
      (exercise) => normalizeExerciseName(exercise.exercise_name) === normalizedName
    ) ?? null
  );
}

export async function createCustomExercise(input: CreateCustomExerciseInput) {
  const { data, error } = await supabase
    .from('exercises')
    .insert({
      exercise_name: input.exercise_name.trim(),
      body_parts: input.body_parts,
      workout_category: input.workout_category,
      info: input.info,
      user_id: input.userId,
    })
    .select(EXERCISE_SELECT)
    .single();

  if (error) throw error;
  return data as ExerciseRecord;
}

export function getExerciseBodyParts(exercise: MaybeExerciseBodyParts) {
  const raw = exercise.body_parts;
  if (!raw) {
    return getExerciseBodyPartWeights(exercise).map((entry) => entry.muscle);
  }

  if (Array.isArray(raw)) {
    return raw.map(String).filter(Boolean);
  }

  if (typeof raw === 'string') {
    if (raw.trim().startsWith('[')) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.map(String).filter(Boolean);
        }
      } catch {
        // Fall through to comma-splitting.
      }
    }

    return raw
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
  }

  return [];
}

export function getExerciseBodyPartWeights(exercise: MaybeExerciseBodyParts) {
  const raw = exercise.body_part_weights;
  if (!raw) return [];

  const normalize = (value: any): ExerciseBodyPartWeight | null => {
    const muscle = String(value?.muscle ?? '').trim();
    const weight = Number(value?.weight);
    if (!muscle || !Number.isFinite(weight) || weight <= 0) return null;
    return { muscle, weight };
  };

  if (Array.isArray(raw)) {
    return raw.map(normalize).filter(Boolean) as ExerciseBodyPartWeight[];
  }

  if (typeof raw === 'string' && raw.trim().startsWith('[')) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map(normalize).filter(Boolean) as ExerciseBodyPartWeight[];
      }
    } catch {
      return [];
    }
  }

  return [];
}

export function isCustomExercise(exercise: Pick<ExerciseRecord, 'user_id'>, userId: string) {
  return exercise.user_id === userId;
}
