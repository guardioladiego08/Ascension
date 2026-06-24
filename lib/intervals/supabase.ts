import { supabase } from '@/lib/supabase';
import {
  buildIntervalSessionStepRows,
  createIntervalPlan,
  getIntervalRuntimeState,
} from '@/lib/intervals/plans';
import type {
  IntervalPlan,
  IntervalPlanStep,
  IntervalSampleInsert,
  IntervalSessionStepInsert,
} from '@/lib/intervals/types';
import type { OutdoorDraftSample } from '@/lib/OutdoorSession/draftStore';

const SCHEMA = 'run_walk';

type IntervalTemplateRow = {
  id: string;
  name: string;
  description: string | null;
  benefit: string | null;
  tags: string[] | null;
  created_at: string;
};

type IntervalTemplateStepRow = {
  template_id: string;
  sequence_index: number;
  phase_kind: IntervalPlanStep['kind'];
  phase_label: string;
  duration_s: number;
  cue_text: string | null;
  interval_index: number | null;
};

export type IntervalSessionRow = {
  id: string;
  user_id: string;
  template_id: string | null;
  template_name_snapshot: string;
  template_description_snapshot: string | null;
  template_benefit_snapshot: string | null;
  template_source: IntervalPlan['source'];
  activity_type: 'run';
  status: 'in_progress' | 'completed' | 'canceled';
  started_at: string;
  ended_at: string | null;
  duration_s: number;
  distance_m: number;
  elev_gain_m: number;
  avg_pace_s_per_km: number | null;
  timezone_str: string | null;
  total_steps_count: number;
  completed_steps_count: number;
  total_intervals_count: number;
  completed_intervals_count: number;
  created_at?: string;
  updated_at?: string;
};

export type IntervalSessionStepRow = {
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

export type IntervalSessionSampleRow = {
  id?: string;
  session_id: string;
  ts: string;
  elapsed_s: number;
  lat: number | null;
  lon: number | null;
  altitude_m: number | null;
  accuracy_m: number | null;
  speed_mps: number | null;
  bearing_deg: number | null;
  hr_bpm: number | null;
  cadence_spm: number | null;
  grade_pct: number | null;
  distance_m: number | null;
  is_moving: boolean | null;
  source: 'fg' | 'bg';
  phase_kind: IntervalPlanStep['kind'] | null;
  session_step_index: number | null;
  interval_index: number | null;
  created_at?: string;
};

export async function listSavedIntervalTemplates() {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!authData.user?.id) {
    return [] as IntervalPlan[];
  }

  const templatesRes = await supabase
    .schema(SCHEMA)
    .from('interval_templates')
    .select('id,name,description,benefit,tags,created_at')
    .order('created_at', { ascending: false });

  if (templatesRes.error) throw templatesRes.error;

  const templateRows = (templatesRes.data ?? []) as IntervalTemplateRow[];
  if (templateRows.length === 0) {
    return [] as IntervalPlan[];
  }

  const stepRes = await supabase
    .schema(SCHEMA)
    .from('interval_template_steps')
    .select('template_id,sequence_index,phase_kind,phase_label,duration_s,cue_text,interval_index')
    .in(
      'template_id',
      templateRows.map((row) => row.id)
    )
    .order('sequence_index', { ascending: true });

  if (stepRes.error) throw stepRes.error;

  const stepsByTemplate = new Map<string, IntervalTemplateStepRow[]>();
  ((stepRes.data ?? []) as IntervalTemplateStepRow[]).forEach((row) => {
    const existing = stepsByTemplate.get(row.template_id) ?? [];
    existing.push(row);
    stepsByTemplate.set(row.template_id, existing);
  });

  return templateRows.map((row) =>
    createIntervalPlan({
      id: row.id,
      templateId: row.id,
      source: 'custom',
      name: row.name,
      description: row.description ?? 'Saved interval workout.',
      benefit: row.benefit ?? 'Reusable custom interval session.',
      tags: row.tags ?? ['saved', 'custom'],
      steps: (stepsByTemplate.get(row.id) ?? []).map((step) => ({
        kind: step.phase_kind,
        label: step.phase_label,
        durationSeconds: step.duration_s,
        cue: step.cue_text ?? `Move into ${step.phase_label.toLowerCase()}.`,
        intervalIndex: step.interval_index,
      })),
    })
  );
}

export async function saveCustomIntervalTemplate(plan: IntervalPlan) {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!authData.user?.id) {
    throw new Error('You must be signed in to save interval workouts.');
  }

  const templateRes = await supabase
    .schema(SCHEMA)
    .from('interval_templates')
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
    .from('interval_template_steps')
    .insert(stepsPayload);

  if (stepsRes.error) {
    await deleteIntervalTemplate(templateId).catch(() => undefined);
    throw stepsRes.error;
  }

  return templateId;
}

export async function deleteIntervalTemplate(templateId: string) {
  const { error } = await supabase
    .schema(SCHEMA)
    .from('interval_templates')
    .delete()
    .eq('id', templateId);

  if (error) throw error;
}

export async function createIntervalSession(args: {
  plan: IntervalPlan;
  startedAtISO: string;
  endedAtISO: string;
  durationSeconds: number;
  distanceMeters: number;
  avgPaceSecPerKm: number | null;
  timezoneStr?: string | null;
}) {
  const { plan, startedAtISO, endedAtISO, durationSeconds, distanceMeters, avgPaceSecPerKm, timezoneStr } = args;
  const runtime = getIntervalRuntimeState(plan, durationSeconds);
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!authData.user?.id) {
    throw new Error('You must be signed in to save interval sessions.');
  }

  const { data, error } = await supabase
    .schema(SCHEMA)
    .from('interval_sessions')
    .insert({
      user_id: authData.user.id,
      template_id: plan.templateId ?? null,
      template_name_snapshot: plan.name,
      template_description_snapshot: plan.description,
      template_benefit_snapshot: plan.benefit,
      template_source: plan.source,
      activity_type: 'run',
      started_at: startedAtISO,
      ended_at: endedAtISO,
      duration_s: durationSeconds,
      distance_m: Number(distanceMeters.toFixed(2)),
      elev_gain_m: 0,
      avg_pace_s_per_km: avgPaceSecPerKm,
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

export async function getIntervalSessionSummary(sessionId: string) {
  const sessionRes = await supabase
    .schema(SCHEMA)
    .from('interval_sessions')
    .select(
      [
        'id',
        'user_id',
        'template_id',
        'template_name_snapshot',
        'template_description_snapshot',
        'template_benefit_snapshot',
        'template_source',
        'activity_type',
        'status',
        'started_at',
        'ended_at',
        'duration_s',
        'distance_m',
        'elev_gain_m',
        'avg_pace_s_per_km',
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
    throw new Error('Interval session not found.');
  }

  const [stepsRes, samplesRes] = await Promise.all([
    supabase
      .schema(SCHEMA)
      .from('interval_session_steps')
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
      .from('interval_samples')
      .select(
        [
          'id',
          'session_id',
          'ts',
          'elapsed_s',
          'lat',
          'lon',
          'altitude_m',
          'accuracy_m',
          'speed_mps',
          'bearing_deg',
          'hr_bpm',
          'cadence_spm',
          'grade_pct',
          'distance_m',
          'is_moving',
          'source',
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
    session: sessionRes.data as unknown as IntervalSessionRow,
    steps: (stepsRes.data ?? []) as unknown as IntervalSessionStepRow[],
    samples: (samplesRes.data ?? []) as unknown as IntervalSessionSampleRow[],
  };
}

export async function updateIntervalSession(sessionId: string, patch: Record<string, unknown>) {
  const { error } = await supabase
    .schema(SCHEMA)
    .from('interval_sessions')
    .update(patch)
    .eq('id', sessionId);

  if (error) throw error;
}

export async function deleteIntervalSession(sessionId: string) {
  const { error } = await supabase
    .schema(SCHEMA)
    .from('interval_sessions')
    .delete()
    .eq('id', sessionId);

  if (error) throw error;
}

export async function insertIntervalSessionSteps(rows: IntervalSessionStepInsert[]) {
  if (rows.length === 0) return;
  const { error } = await supabase
    .schema(SCHEMA)
    .from('interval_session_steps')
    .insert(rows);

  if (error) throw error;
}

export async function insertIntervalSamples(rows: IntervalSampleInsert[]) {
  if (rows.length === 0) return;
  const { error } = await supabase
    .schema(SCHEMA)
    .from('interval_samples')
    .insert(rows);

  if (error) throw error;
}

export function buildIntervalSampleRows(args: {
  sessionId: string;
  plan: IntervalPlan;
  samples: OutdoorDraftSample[];
}) {
  const { sessionId, plan, samples } = args;

  return samples.map<IntervalSampleInsert>((sample) => {
    const runtime = getIntervalRuntimeState(plan, sample.elapsed_s);
    return {
      session_id: sessionId,
      ts: sample.ts,
      elapsed_s: sample.elapsed_s,
      lat: sample.lat,
      lon: sample.lon,
      altitude_m: sample.altitude_m,
      accuracy_m: sample.accuracy_m,
      speed_mps: sample.speed_mps,
      bearing_deg: sample.bearing_deg,
      hr_bpm: null,
      cadence_spm: null,
      grade_pct: null,
      distance_m: sample.distance_m,
      is_moving: sample.is_moving,
      source: 'fg',
      phase_kind: runtime.currentStep?.kind ?? null,
      session_step_index:
        runtime.currentStepIndex >= 0 && runtime.currentStepIndex < plan.steps.length
          ? runtime.currentStepIndex
          : null,
      interval_index: runtime.currentStep?.intervalIndex ?? null,
    };
  });
}

export function buildIntervalSessionStepRowsForInsert(args: {
  sessionId: string;
  plan: IntervalPlan;
  durationSeconds: number;
}) {
  return buildIntervalSessionStepRows(args.sessionId, args.plan, args.durationSeconds);
}
