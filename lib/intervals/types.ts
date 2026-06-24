export type IntervalPhaseKind =
  | 'warmup'
  | 'work'
  | 'recovery'
  | 'rest'
  | 'cooldown';

export type IntervalPlanSource = 'preset' | 'custom';

export type IntervalPlanStep = {
  id: string;
  kind: IntervalPhaseKind;
  label: string;
  durationSeconds: number;
  cue: string;
  intervalIndex: number | null;
};

export type IntervalPlan = {
  id: string;
  templateId?: string | null;
  source: IntervalPlanSource;
  name: string;
  description: string;
  benefit: string;
  originLabel?: string | null;
  tags: string[];
  steps: IntervalPlanStep[];
};

export type IntervalRuntimeState = {
  currentStep: IntervalPlanStep | null;
  currentStepIndex: number;
  stepElapsedSeconds: number;
  stepRemainingSeconds: number;
  nextStep: IntervalPlanStep | null;
  completedStepCount: number;
  completedIntervalCount: number;
  totalIntervalCount: number;
  totalRemainingSeconds: number;
  isComplete: boolean;
};

export type IntervalSessionStepInsert = {
  session_id: string;
  sequence_index: number;
  phase_kind: IntervalPhaseKind;
  phase_label: string;
  planned_duration_s: number;
  actual_duration_s: number;
  started_elapsed_s: number;
  ended_elapsed_s: number;
  interval_index: number | null;
  completed: boolean;
};

export type IntervalSampleInsert = {
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
  phase_kind: IntervalPhaseKind | null;
  session_step_index: number | null;
  interval_index: number | null;
};
