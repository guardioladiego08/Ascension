// components/my components/strength/types.ts
// -----------------------------------------------------------------------------
// Extend your types so each set has a "mode" field. Default is "normal".
// -----------------------------------------------------------------------------

export type SetMode = 'normal' | 'warmup' | 'dropset' | 'failure';

export type StrengthSet = {
  weight: string;
  reps: string;
  /** NEW — if omitted, treat as 'normal' */
  mode?: SetMode;
};

export type ExerciseType = {
  id: string;
  name: string;
  sets: StrengthSet[];
};
