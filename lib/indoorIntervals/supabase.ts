import { supabase } from '@/lib/supabase';
import {
  buildIntervalSessionStepRows,
  createIntervalPlan,
  getIntervalRuntimeState,
} from '@/lib/intervals/plans';
import type {
  IntervalPlan,
  IntervalPlanStep,
  IntervalSessionStepInsert,
} from '@/lib/intervals/types';
import type { RunWalkSample } from '@/lib/runWalkDraftStore';

const SCHEMA = 'run_walk';

type IndoorIntervalTemplateRow = {
  id: string;
  name: string;
  description: string | null;
  benefit: string | null;
  tags: string[] | null;
  created_at: string;
};

type IndoorIntervalTemplateStepRow = {
  template_id: string;
  sequence_index: number;
  phase_kind: IntervalPlanStep['kind'];
  phase_label: string;
  duration_s: number;
  cue_text: string | null;
  interval_index: number | null;
};

export type IndoorIntervalSessionRow = {
  id: string;
  user_id: string;
  template_id: string | null;
  template_name_snapshot: string;
  template_description_snapshot: string | null;
  template_benefit_snapshot: string | null;
  template_source: IntervalPlan['source'];
  exercise_type: 'indoor_run';
  status: 'in_progress' | 'completed' | 'canceled';
  started_at: string;
  ended_at: string | null;
  total_time_s: number;
  total_distance_m: number;
  total_elevation_m: number;
  avg_speed_mps: number | null;
  avg_pace_s_per_km: number | null;
  avg_pace_s_per_mi: number | null;
  timezone_str: string | null;
  total_steps_count: number;
  completed_steps_count: number;
  total_intervals_count: number;
  completed_intervals_count: number;
  created_at?: string;
  updated_at?: string;
};

export type IndoorIntervalSessionStepRow = {
  id?: string;
  session_id: string;
  sequence_index: number;
  phase_kind: IntervalPlanStep['kind'];
  phase_label: string;
  planned_duration_s: number;
  actual_duration_s: number;
  started_elapsed_s: number;
  ended_elapsed_s: number;
  interval_index: number | null;
  completed: boolean;
  created_at?: string;
};

export type IndoorIntervalSessionSampleRow = {
  id?: string;
  session_id: string;
  recorded_at: string;
  elapsed_s: number;
  distance_m: number | null;
  speed_mps: number | null;
  pace_s_per_km: number | null;
  pace_s_per_mi: number | null;
  incline_deg: number | null;
  elevation_m: number | null;
  hr_bpm: number | null;
  phase_kind: IntervalPlanStep['kind'] | null;
  session_step_index: number | null;
  interval_index: number | null;
  created_at?: string;
};

function buildTemplatePlan(row: IndoorIntervalTemplateRow, steps: IndoorIntervalTemplateStepRow[]) {
  return createIntervalPlan({
    id: row.id,
    templateId: row.id,
    source: 'custom',
    name: row.name,
    description: row.description ?? 'Saved indoor interval workout.',
    benefit: row.benefit ?? 'Reusable custom treadmill interval session.',
    tags: row.tags ?? ['saved', 'custom', 'indoor'],
    steps: steps.map((step) => ({
      kind: step.phase_kind,
      label: step.phase_label,
      durationSeconds: step.duration_s,
      cue: step.cue_text ?? `Move into ${step.phase_label.toLowerCase()}.`,
      intervalIndex: step.interval_index,
    })),
  });
}

function buildRecordedAt(startedAtISO: string, elapsedSeconds: number) {
  const startedAtMs = new Date(startedAtISO).getTime();
  const safeStartMs = Number.isFinite(startedAtMs) ? startedAtMs : Date.now();
  return new Date(safeStartMs + Math.max(0, elapsedSeconds) * 1000).toISOString();
}

export async function listSavedIndoorIntervalTemplates() {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!authData.user?.id) {
    return [] as IntervalPlan[];
  }

  const templatesRes = await supabase
    .schema(SCHEMA)
    .from('indoor_interval_templates')
    .select('id,name,description,benefit,tags,created_at')
    .order('created_at', { ascending: false });

  if (templatesRes.error) throw templatesRes.error;

  const templateRows = (templatesRes.data ?? []) as IndoorIntervalTemplateRow[];
  if (templateRows.length === 0) {
    return [] as IntervalPlan[];
  }

  const stepRes = await supabase
    .schema(SCHEMA)
    .from('indoor_interval_template_steps')
    .select('template_id,sequence_index,phase_kind,phase_label,duration_s,cue_text,interval_index')
    .in(
      'template_id',
      templateRows.map((row) => row.id)
    )
    .order('sequence_index', { ascending: true });

  if (stepRes.error) throw stepRes.error;

  const stepsByTemplate = new Map<string, IndoorIntervalTemplateStepRow[]>();
  ((stepRes.data ?? []) as IndoorIntervalTemplateStepRow[]).forEach((row) => {
    const existing = stepsByTemplate.get(row.template_id) ?? [];
    existing.push(row);
    stepsByTemplate.set(row.template_id, existing);
  });

  return templateRows.map((row) => buildTemplatePlan(row, stepsByTemplate.get(row.id) ?? []));
}

export async function saveIndoorIntervalTemplate(plan: IntervalPlan) {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!authData.user?.id) {
    throw new Error('You must be signed in to save interval workouts.');
  }

  const templateRes = await supabase
    .schema(SCHEMA)
    .from('indoor_interval_templates')
    .insert({
      user_id: authData.user.id,
      name: plan.name,
      description: plan.description,
      benefit: plan.benefit,
      tags: plan.tags,
      source: 'custom',
    })
    .select('id')
    .single();

  if (templateRes.error) throw templateRes.error;

  const templateId = templateRes.data.id as string;
  const stepsPayload = plan.steps.map((step, index) => ({
    template_id: templateId,
    sequence_index: index,
    phase_kind: step.kind,
    phase_label: step.label,
    duration_s: step.durationSeconds,
    cue_text: step.cue,
    interval_index: step.intervalIndex,
  }));

  const stepsRes = await supabase
    .schema(SCHEMA)
    .from('indoor_interval_template_steps')
    .insert(stepsPayload);

  if (stepsRes.error) {
    await deleteIndoorIntervalTemplate(templateId).catch(() => undefined);
    throw stepsRes.error;
  }

  return templateId;
}

export async function deleteIndoorIntervalTemplate(templateId: string) {
  const { error } = await supabase
    .schema(SCHEMA)
    .from('indoor_interval_templates')
    .delete()
    .eq('id', templateId);

  if (error) throw error;
}

export async function createIndoorIntervalSession(args: {
  plan: IntervalPlan;
  startedAtISO: string;
  endedAtISO: string;
  durationSeconds: number;
  distanceMeters: number;
  elevationMeters: number;
  avgSpeedMps: number | null;
  avgPaceSecPerKm: number | null;
  avgPaceSecPerMi: number | null;
  timezoneStr?: string | null;
}) {
  const {
    plan,
    startedAtISO,
    endedAtISO,
    durationSeconds,
    distanceMeters,
    elevationMeters,
    avgSpeedMps,
    avgPaceSecPerKm,
    avgPaceSecPerMi,
    timezoneStr,
  } = args;
  const runtime = getIntervalRuntimeState(plan, durationSeconds);
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!authData.user?.id) {
    throw new Error('You must be signed in to save interval sessions.');
  }

  const { data, error } = await supabase
    .schema(SCHEMA)
    .from('indoor_interval_sessions')
    .insert({
      user_id: authData.user.id,
      template_id: plan.templateId ?? null,
      template_name_snapshot: plan.name,
      template_description_snapshot: plan.description,
      template_benefit_snapshot: plan.benefit,
      template_source: plan.source,
      exercise_type: 'indoor_run',
      started_at: startedAtISO,
      ended_at: endedAtISO,
      total_time_s: durationSeconds,
      total_distance_m: Number(distanceMeters.toFixed(2)),
      total_elevation_m: Number(elevationMeters.toFixed(2)),
      avg_speed_mps:
        avgSpeedMps == null || !Number.isFinite(avgSpeedMps)
          ? null
          : Number(avgSpeedMps.toFixed(6)),
      avg_pace_s_per_km:
        avgPaceSecPerKm == null || !Number.isFinite(avgPaceSecPerKm)
          ? null
          : Number(avgPaceSecPerKm.toFixed(2)),
      avg_pace_s_per_mi:
        avgPaceSecPerMi == null || !Number.isFinite(avgPaceSecPerMi)
          ? null
          : Number(avgPaceSecPerMi.toFixed(2)),
      timezone_str: timezoneStr ?? null,
      total_steps_count: plan.steps.length,
      completed_steps_count: runtime.completedStepCount,
      completed_intervals_count: runtime.completedIntervalCount,
      total_intervals_count: runtime.totalIntervalCount,
      status: 'completed',
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id as string;
}

export async function getIndoorIntervalSessionSummary(sessionId: string) {
  const sessionRes = await supabase
    .schema(SCHEMA)
    .from('indoor_interval_sessions')
    .select(
      [
        'id',
        'user_id',
        'template_id',
        'template_name_snapshot',
        'template_description_snapshot',
        'template_benefit_snapshot',
        'template_source',
        'exercise_type',
        'status',
        'started_at',
        'ended_at',
        'total_time_s',
        'total_distance_m',
        'total_elevation_m',
        'avg_speed_mps',
        'avg_pace_s_per_km',
        'avg_pace_s_per_mi',
        'timezone_str',
        'total_steps_count',
        'completed_steps_count',
        'total_intervals_count',
        'completed_intervals_count',
        'created_at',
        'updated_at',
      ].join(',')
    )
    .eq('id', sessionId)
    .maybeSingle();

  if (sessionRes.error) throw sessionRes.error;
  if (!sessionRes.data) {
    throw new Error('Indoor interval session not found.');
  }

  const [stepsRes, samplesRes] = await Promise.all([
    supabase
      .schema(SCHEMA)
      .from('indoor_interval_session_steps')
      .select(
        [
          'id',
          'session_id',
          'sequence_index',
          'phase_kind',
          'phase_label',
          'planned_duration_s',
          'actual_duration_s',
          'started_elapsed_s',
          'ended_elapsed_s',
          'interval_index',
          'completed',
          'created_at',
        ].join(',')
      )
      .eq('session_id', sessionId)
      .order('sequence_index', { ascending: true }),
    supabase
      .schema(SCHEMA)
      .from('indoor_interval_samples')
      .select(
        [
          'id',
          'session_id',
          'recorded_at',
          'elapsed_s',
          'distance_m',
          'speed_mps',
          'pace_s_per_km',
          'pace_s_per_mi',
          'incline_deg',
          'elevation_m',
          'hr_bpm',
          'phase_kind',
          'session_step_index',
          'interval_index',
          'created_at',
        ].join(',')
      )
      .eq('session_id', sessionId)
      .order('elapsed_s', { ascending: true }),
  ]);

  if (stepsRes.error) throw stepsRes.error;
  if (samplesRes.error) throw samplesRes.error;

  return {
    session: sessionRes.data as unknown as IndoorIntervalSessionRow,
    steps: (stepsRes.data ?? []) as unknown as IndoorIntervalSessionStepRow[],
    samples: (samplesRes.data ?? []) as unknown as IndoorIntervalSessionSampleRow[],
  };
}

export async function deleteIndoorIntervalSession(sessionId: string) {
  const { error } = await supabase
    .schema(SCHEMA)
    .from('indoor_interval_sessions')
    .delete()
    .eq('id', sessionId);

  if (error) throw error;
}

export async function insertIndoorIntervalSessionSteps(rows: IntervalSessionStepInsert[]) {
  if (rows.length === 0) return;
  const { error } = await supabase
    .schema(SCHEMA)
    .from('indoor_interval_session_steps')
    .insert(rows);

  if (error) throw error;
}

export async function insertIndoorIntervalSamples(rows: Array<Record<string, unknown>>) {
  if (rows.length === 0) return;
  const { error } = await supabase
    .schema(SCHEMA)
    .from('indoor_interval_samples')
    .insert(rows);

  if (error) throw error;
}

export function buildIndoorIntervalSampleRows(args: {
  sessionId: string;
  startedAtISO: string;
  plan: IntervalPlan;
  samples: RunWalkSample[];
}) {
  const { sessionId, startedAtISO, plan, samples } = args;

  return samples.map((sample) => {
    const runtime = getIntervalRuntimeState(plan, sample.elapsed_s);
    return {
      session_id: sessionId,
      recorded_at: buildRecordedAt(startedAtISO, sample.elapsed_s),
      elapsed_s: sample.elapsed_s,
      distance_m: sample.distance_m,
      speed_mps: sample.speed_mps,
      pace_s_per_km: sample.pace_s_per_km,
      pace_s_per_mi: sample.pace_s_per_mi,
      incline_deg: sample.incline_deg,
      elevation_m: sample.elevation_m,
      hr_bpm: null,
      phase_kind: runtime.currentStep?.kind ?? null,
      session_step_index:
        runtime.currentStepIndex >= 0 && runtime.currentStepIndex < plan.steps.length
          ? runtime.currentStepIndex
          : null,
      interval_index: runtime.currentStep?.intervalIndex ?? null,
    };
  });
}

export function buildIndoorIntervalSessionStepRowsForInsert(args: {
  sessionId: string;
  plan: IntervalPlan;
  durationSeconds: number;
}) {
  return buildIntervalSessionStepRows(args.sessionId, args.plan, args.durationSeconds);
}
