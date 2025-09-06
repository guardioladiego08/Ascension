// components/my components/strength/types.ts
// -----------------------------------------------------------------------------
// Shared types for Strength Training components
// -----------------------------------------------------------------------------

export type SetType = { weight: string; reps: string };
export type ExerciseType = { id: string; name: string; sets: SetType[] };
