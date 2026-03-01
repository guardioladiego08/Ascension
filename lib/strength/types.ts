export type UnitMass = 'kg' | 'lb';
export type SetType = 'normal' | 'warmup' | 'dropset' | 'failure';

export type SetDraft = {
  tempId: string;
  set_index: number;
  set_type: SetType;
  weight?: number | null;
  weight_unit_csv: UnitMass;
  reps?: number | null;
  rpe?: number | null;
  est_1rm?: number | null;
  superset_group?: number | null;
  done?: boolean;
  notes?: string | null;
};

export type ExerciseDraft = {
  instanceId: string;
  exercise_id: string;
  exercise_name: string;
  sets: SetDraft[];
};
