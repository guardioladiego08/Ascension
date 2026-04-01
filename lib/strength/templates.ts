import { supabase } from '@/lib/supabase';
import type { StrengthWorkoutBlockKind } from '@/lib/strength/types';
import { getAuthenticatedUserId } from '@/lib/strength/exercises';

export type StrengthTemplateVisibility = 'private' | 'followers' | 'public';

type WorkoutTemplateRow = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  visibility: StrengthTemplateVisibility | null;
  source_strength_workout_id: string | null;
  forked_from_template_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

type WorkoutTemplateBlockRow = {
  id: string;
  workout_template_id: string;
  block_kind: StrengthWorkoutBlockKind | null;
  sequence_index: number;
  label: string | null;
  rest_interval_seconds: number | null;
  configuration: Record<string, unknown> | null;
};

type WorkoutTemplateBlockExerciseRow = {
  id: string;
  workout_template_block_id: string;
  exercise_id: string;
  exercise_order: number;
  target_set_count: number;
  configuration: Record<string, unknown> | null;
};

type ExerciseNameRow = {
  id: string;
  exercise_name: string | null;
};

type WorkoutBlockRow = {
  id: string;
  block_kind: StrengthWorkoutBlockKind | null;
  sequence_index: number;
  label: string | null;
  rest_interval_seconds: number | null;
};

type WorkoutBlockExerciseRow = {
  id: string;
  workout_block_id: string;
  exercise_id: string;
  exercise_order: number;
};

type WorkoutSetRow = {
  workout_block_id: string | null;
  workout_block_exercise_id: string | null;
  exercise_id: string;
};

export type StrengthWorkoutTemplateExercise = {
  id: string;
  exerciseId: string;
  exerciseName: string;
  exerciseOrder: number;
  targetSetCount: number;
  configuration: Record<string, unknown>;
};

export type StrengthWorkoutTemplateBlock = {
  id: string;
  kind: StrengthWorkoutBlockKind;
  sequenceIndex: number;
  label: string | null;
  restIntervalSeconds: number | null;
  configuration: Record<string, unknown>;
  exercises: StrengthWorkoutTemplateExercise[];
};

export type StrengthWorkoutTemplate = {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  visibility: StrengthTemplateVisibility;
  sourceStrengthWorkoutId: string | null;
  forkedFromTemplateId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  totalBlocks: number;
  totalExercises: number;
  totalSets: number;
  previewExerciseNames: string[];
  blocks: StrengthWorkoutTemplateBlock[];
};

export type StrengthWorkoutTemplateBlockInput = {
  kind: StrengthWorkoutBlockKind;
  label?: string | null;
  restIntervalSeconds?: number | null;
  configuration?: Record<string, unknown>;
  exercises: Array<{
    exerciseId: string;
    targetSetCount: number;
    configuration?: Record<string, unknown>;
  }>;
};

export type CreateStrengthWorkoutTemplateInput = {
  userId?: string | null;
  title: string;
  description?: string | null;
  visibility?: StrengthTemplateVisibility;
  sourceStrengthWorkoutId?: string | null;
  forkedFromTemplateId?: string | null;
  metadata?: Record<string, unknown>;
  blocks: StrengthWorkoutTemplateBlockInput[];
};

export type SaveStrengthWorkoutTemplateFromWorkoutInput = Omit<
  CreateStrengthWorkoutTemplateInput,
  'blocks' | 'sourceStrengthWorkoutId'
> & {
  workoutId: string;
};

const TEMPLATE_SELECT =
  'id,user_id,title,description,visibility,source_strength_workout_id,forked_from_template_id,metadata,created_at,updated_at';
const TEMPLATE_BLOCK_SELECT =
  'id,workout_template_id,block_kind,sequence_index,label,rest_interval_seconds,configuration';
const TEMPLATE_BLOCK_EXERCISE_SELECT =
  'id,workout_template_block_id,exercise_id,exercise_order,target_set_count,configuration';
const TEMPLATE_BACKEND_MIGRATION = '20260331_strength_workout_templates.sql';
const TEMPLATE_SCHEMA_CACHE_MIGRATION =
  '20260401_strength_template_schema_cache_refresh.sql';

function normalizeVisibility(value: unknown): StrengthTemplateVisibility {
  if (value === 'followers' || value === 'public') {
    return value;
  }

  return 'private';
}

function normalizeBlockKind(value: unknown): StrengthWorkoutBlockKind {
  return value === 'superset' ? 'superset' : 'exercise';
}

function sanitizeRecord(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {} as Record<string, unknown>;
  }

  return value as Record<string, unknown>;
}

function sanitizeSetCount(value: unknown) {
  const parsed = Math.round(Number(value ?? 0));
  return parsed > 0 ? parsed : 1;
}

function isMissingTemplateTableError(error: any) {
  const code = String(error?.code ?? '').trim();
  const message = String(error?.message ?? '').toLowerCase();
  const hint = String(error?.hint ?? '').toLowerCase();

  if (code !== 'PGRST205') {
    return false;
  }

  return (
    message.includes('strength.workout_templates') ||
    message.includes('strength.workout_template_blocks') ||
    message.includes('strength.workout_template_block_exercises') ||
    hint.includes('strength.workout_blocks')
  );
}

function normalizeTemplateBackendError(error: any) {
  if (!isMissingTemplateTableError(error)) {
    return error;
  }

  return new Error(
    `Strength templates are not available on this Supabase project yet. Apply migrations ${TEMPLATE_BACKEND_MIGRATION} and ${TEMPLATE_SCHEMA_CACHE_MIGRATION}, then retry.`
  );
}

async function resolveTemplateUserId(userId?: string | null) {
  const resolvedUserId = userId ?? (await getAuthenticatedUserId());
  if (!resolvedUserId) {
    throw new Error('Not signed in.');
  }

  return resolvedUserId;
}

async function hydrateTemplates(templateRows: WorkoutTemplateRow[]) {
  if (templateRows.length === 0) {
    return [] as StrengthWorkoutTemplate[];
  }

  const templateIds = templateRows.map((row) => row.id);
  const { data: blockData, error: blockError } = await supabase
    .schema('strength')
    .from('workout_template_blocks')
    .select(TEMPLATE_BLOCK_SELECT)
    .in('workout_template_id', templateIds)
    .order('sequence_index', { ascending: true });

  if (blockError) {
    throw normalizeTemplateBackendError(blockError);
  }

  const blockRows = (blockData ?? []) as WorkoutTemplateBlockRow[];
  const blockIds = blockRows.map((row) => row.id);

  let blockExerciseRows: WorkoutTemplateBlockExerciseRow[] = [];
  if (blockIds.length > 0) {
    const { data: blockExerciseData, error: blockExerciseError } = await supabase
      .schema('strength')
      .from('workout_template_block_exercises')
      .select(TEMPLATE_BLOCK_EXERCISE_SELECT)
      .in('workout_template_block_id', blockIds)
      .order('exercise_order', { ascending: true });

    if (blockExerciseError) {
      throw normalizeTemplateBackendError(blockExerciseError);
    }

    blockExerciseRows = (blockExerciseData ?? []) as WorkoutTemplateBlockExerciseRow[];
  }

  const exerciseIds = Array.from(
    new Set(blockExerciseRows.map((row) => row.exercise_id).filter(Boolean))
  );
  const exerciseNameById = new Map<string, string>();

  if (exerciseIds.length > 0) {
    const { data: exerciseData, error: exerciseError } = await supabase
      .from('exercises')
      .select('id, exercise_name')
      .in('id', exerciseIds);

    if (exerciseError) {
      throw exerciseError;
    }

    ((exerciseData ?? []) as ExerciseNameRow[]).forEach((row) => {
      exerciseNameById.set(row.id, row.exercise_name?.trim() || 'Exercise');
    });
  }

  const blockExercisesByBlockId = new Map<string, StrengthWorkoutTemplateExercise[]>();
  blockExerciseRows.forEach((row) => {
    const collection = blockExercisesByBlockId.get(row.workout_template_block_id) ?? [];
    collection.push({
      id: row.id,
      exerciseId: row.exercise_id,
      exerciseName: exerciseNameById.get(row.exercise_id) ?? 'Exercise',
      exerciseOrder: row.exercise_order,
      targetSetCount: sanitizeSetCount(row.target_set_count),
      configuration: sanitizeRecord(row.configuration),
    });
    blockExercisesByBlockId.set(row.workout_template_block_id, collection);
  });

  const blocksByTemplateId = new Map<string, StrengthWorkoutTemplateBlock[]>();
  blockRows.forEach((row) => {
    const collection = blocksByTemplateId.get(row.workout_template_id) ?? [];
    collection.push({
      id: row.id,
      kind: normalizeBlockKind(row.block_kind),
      sequenceIndex: row.sequence_index,
      label: row.label ?? null,
      restIntervalSeconds:
        normalizeBlockKind(row.block_kind) === 'superset'
          ? sanitizeSetCount(row.rest_interval_seconds)
          : null,
      configuration: sanitizeRecord(row.configuration),
      exercises: (blockExercisesByBlockId.get(row.id) ?? []).sort(
        (left, right) => left.exerciseOrder - right.exerciseOrder
      ),
    });
    blocksByTemplateId.set(row.workout_template_id, collection);
  });

  return templateRows.map<StrengthWorkoutTemplate>((row) => {
    const blocks = (blocksByTemplateId.get(row.id) ?? []).sort(
      (left, right) => left.sequenceIndex - right.sequenceIndex
    );
    const allExercises = blocks.flatMap((block) => block.exercises);

    return {
      id: row.id,
      userId: row.user_id,
      title: row.title.trim(),
      description: row.description ?? null,
      visibility: normalizeVisibility(row.visibility),
      sourceStrengthWorkoutId: row.source_strength_workout_id ?? null,
      forkedFromTemplateId: row.forked_from_template_id ?? null,
      metadata: sanitizeRecord(row.metadata),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      totalBlocks: blocks.length,
      totalExercises: allExercises.length,
      totalSets: allExercises.reduce(
        (sum, exercise) => sum + sanitizeSetCount(exercise.targetSetCount),
        0
      ),
      previewExerciseNames: Array.from(
        new Set(
          allExercises
            .map((exercise) => exercise.exerciseName.trim())
            .filter(Boolean)
        )
      ).slice(0, 3),
      blocks,
    };
  });
}

function validateTemplateBlockInput(block: StrengthWorkoutTemplateBlockInput) {
  if (block.kind === 'exercise' && block.exercises.length !== 1) {
    throw new Error('Single exercise blocks must contain exactly one exercise.');
  }

  if (block.kind === 'superset' && block.exercises.length < 2) {
    throw new Error('Superset blocks must contain at least two exercises.');
  }

  if (block.exercises.length === 0) {
    throw new Error('Template blocks must contain at least one exercise.');
  }
}

export async function fetchStrengthWorkoutTemplates(options?: {
  userId?: string | null;
}) {
  const userId = await resolveTemplateUserId(options?.userId);
  const { data, error } = await supabase
    .schema('strength')
    .from('workout_templates')
    .select(TEMPLATE_SELECT)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw normalizeTemplateBackendError(error);
  }

  return hydrateTemplates((data ?? []) as WorkoutTemplateRow[]);
}

export async function fetchStrengthWorkoutTemplateById(params: {
  templateId: string;
  userId?: string | null;
}) {
  const userId = await resolveTemplateUserId(params.userId);
  const { data, error } = await supabase
    .schema('strength')
    .from('workout_templates')
    .select(TEMPLATE_SELECT)
    .eq('id', params.templateId)
    .eq('user_id', userId)
    .maybeSingle<WorkoutTemplateRow>();

  if (error) {
    throw normalizeTemplateBackendError(error);
  }

  if (!data) {
    return null;
  }

  const [template] = await hydrateTemplates([data]);
  return template ?? null;
}

export async function saveStrengthWorkoutTemplate(input: CreateStrengthWorkoutTemplateInput) {
  const userId = await resolveTemplateUserId(input.userId);
  const title = input.title.trim();

  if (!title) {
    throw new Error('Template name is required.');
  }

  if (input.blocks.length === 0) {
    throw new Error('Add at least one exercise before saving a template.');
  }

  input.blocks.forEach(validateTemplateBlockInput);

  let createdTemplateId: string | null = null;

  try {
    const { data: templateRow, error: templateError } = await supabase
      .schema('strength')
      .from('workout_templates')
      .insert({
        user_id: userId,
        title,
        description: input.description?.trim() || null,
        visibility: normalizeVisibility(input.visibility),
        source_strength_workout_id: input.sourceStrengthWorkoutId ?? null,
        forked_from_template_id: input.forkedFromTemplateId ?? null,
        metadata: sanitizeRecord(input.metadata),
      })
      .select(TEMPLATE_SELECT)
      .single<WorkoutTemplateRow>();

    if (templateError) {
      throw normalizeTemplateBackendError(templateError);
    }

    createdTemplateId = templateRow.id;

    const blockPayload = input.blocks.map((block, index) => ({
      workout_template_id: templateRow.id,
      block_kind: block.kind,
      sequence_index: index + 1,
      label: block.label?.trim() || null,
      rest_interval_seconds:
        block.kind === 'superset'
          ? sanitizeSetCount(block.restIntervalSeconds)
          : null,
      configuration: sanitizeRecord(block.configuration),
    }));

    const { data: insertedBlocks, error: blockError } = await supabase
      .schema('strength')
      .from('workout_template_blocks')
      .insert(blockPayload)
      .select('id, sequence_index');

    if (blockError) {
      throw normalizeTemplateBackendError(blockError);
    }

    const blockIdBySequence = new Map<number, string>();
    ((insertedBlocks ?? []) as Array<{ id: string; sequence_index: number }>).forEach((row) => {
      blockIdBySequence.set(row.sequence_index, row.id);
    });

    const blockExercisePayload = input.blocks.flatMap((block, blockIndex) => {
      const templateBlockId = blockIdBySequence.get(blockIndex + 1);
      if (!templateBlockId) {
        return [];
      }

      return block.exercises.map((exercise, exerciseIndex) => ({
        workout_template_block_id: templateBlockId,
        exercise_id: exercise.exerciseId,
        exercise_order: exerciseIndex + 1,
        target_set_count: sanitizeSetCount(exercise.targetSetCount),
        configuration: sanitizeRecord(exercise.configuration),
      }));
    });

    if (blockExercisePayload.length > 0) {
      const { error: blockExerciseError } = await supabase
        .schema('strength')
        .from('workout_template_block_exercises')
        .insert(blockExercisePayload);

      if (blockExerciseError) {
        throw normalizeTemplateBackendError(blockExerciseError);
      }
    }

    const savedTemplate = await fetchStrengthWorkoutTemplateById({
      templateId: templateRow.id,
      userId,
    });

    if (!savedTemplate) {
      throw new Error('Template saved, but the reload failed.');
    }

    return savedTemplate;
  } catch (error) {
    if (createdTemplateId) {
      await supabase
        .schema('strength')
        .from('workout_templates')
        .delete()
        .eq('id', createdTemplateId)
        .eq('user_id', userId);
    }

    throw normalizeTemplateBackendError(error);
  }
}

export async function saveStrengthWorkoutTemplateFromWorkout(
  input: SaveStrengthWorkoutTemplateFromWorkoutInput
) {
  const userId = await resolveTemplateUserId(input.userId);

  const { data: blockData, error: blockError } = await supabase
    .schema('strength')
    .from('workout_blocks')
    .select('id, block_kind, sequence_index, label, rest_interval_seconds')
    .eq('strength_workout_id', input.workoutId)
    .order('sequence_index', { ascending: true });

  if (blockError) {
    throw blockError;
  }

  const blockRows = (blockData ?? []) as WorkoutBlockRow[];
  if (blockRows.length === 0) {
    throw new Error('This workout does not have a saved structure to turn into a template yet.');
  }

  const blockIds = blockRows.map((row) => row.id);
  const { data: blockExerciseData, error: blockExerciseError } = await supabase
    .schema('strength')
    .from('workout_block_exercises')
    .select('id, workout_block_id, exercise_id, exercise_order')
    .in('workout_block_id', blockIds)
    .order('exercise_order', { ascending: true });

  if (blockExerciseError) {
    throw blockExerciseError;
  }

  const blockExerciseRows = (blockExerciseData ?? []) as WorkoutBlockExerciseRow[];
  if (blockExerciseRows.length === 0) {
    throw new Error('This workout does not have saved exercises to turn into a template yet.');
  }

  const { data: setData, error: setError } = await supabase
    .schema('strength')
    .from('strength_sets')
    .select('workout_block_id, workout_block_exercise_id, exercise_id')
    .eq('strength_workout_id', input.workoutId);

  if (setError) {
    throw setError;
  }

  const setRows = (setData ?? []) as WorkoutSetRow[];
  const setCountByBlockExerciseId = new Map<string, number>();
  const fallbackSetCountByBlockExerciseKey = new Map<string, number>();

  setRows.forEach((row) => {
    if (row.workout_block_exercise_id) {
      setCountByBlockExerciseId.set(
        row.workout_block_exercise_id,
        (setCountByBlockExerciseId.get(row.workout_block_exercise_id) ?? 0) + 1
      );
      return;
    }

    if (row.workout_block_id && row.exercise_id) {
      const key = `${row.workout_block_id}:${row.exercise_id}`;
      fallbackSetCountByBlockExerciseKey.set(
        key,
        (fallbackSetCountByBlockExerciseKey.get(key) ?? 0) + 1
      );
    }
  });

  const blocks = blockRows.map<StrengthWorkoutTemplateBlockInput>((blockRow) => {
    const blockExercises = blockExerciseRows
      .filter((row) => row.workout_block_id === blockRow.id)
      .sort((left, right) => left.exercise_order - right.exercise_order)
      .map((row) => ({
        exerciseId: row.exercise_id,
        targetSetCount:
          setCountByBlockExerciseId.get(row.id) ??
          fallbackSetCountByBlockExerciseKey.get(`${blockRow.id}:${row.exercise_id}`) ??
          1,
      }));

    return {
      kind: normalizeBlockKind(blockRow.block_kind),
      label: blockRow.label ?? null,
      restIntervalSeconds:
        normalizeBlockKind(blockRow.block_kind) === 'superset'
          ? blockRow.rest_interval_seconds ?? null
          : null,
      exercises: blockExercises,
    };
  });

  return saveStrengthWorkoutTemplate({
    userId,
    title: input.title,
    description: input.description,
    visibility: input.visibility,
    sourceStrengthWorkoutId: input.workoutId,
    forkedFromTemplateId: input.forkedFromTemplateId,
    metadata: input.metadata,
    blocks,
  });
}
