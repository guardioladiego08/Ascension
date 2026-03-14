export type DiaryDay = {
  id: string;
  user_id: string;
  date: string;
  timezone_str: string | null;
  kcal_target: number | string | null;
  protein_g_target: number | string | null;
  carbs_g_target: number | string | null;
  fat_g_target: number | string | null;
  kcal_total: number | string | null;
  protein_g_total: number | string | null;
  carbs_g_total: number | string | null;
  fat_g_total: number | string | null;
  goal_hit: boolean | null;
};

export type AppUserRow = {
  user_id: string;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  is_private: boolean;
  country: string | null;
  state: string | null;
  city: string | null;
};

export type GoalSnapshot = {
  strength_condition_mode: 'and' | 'or' | null;
  strength_use_time: boolean | null;
  strength_time_min: number | null;
  strength_use_volume: boolean | null;
  strength_volume_min: number | null;
  strength_volume_unit: 'kg' | 'lb' | null;
  cardio_condition_mode: 'and' | 'or' | null;
  cardio_use_time: boolean | null;
  cardio_time_min: number | null;
  cardio_use_distance: boolean | null;
  cardio_distance: number | null;
  cardio_distance_unit: 'km' | 'mi' | null;
  nutrition_condition_mode: 'and' | 'or' | null;
  protein_enabled: boolean | null;
  protein_target_g: number | null;
  carbs_enabled: boolean | null;
  carbs_target_g: number | null;
  fats_enabled: boolean | null;
  fats_target_g: number | null;
  calorie_goal_mode: string | null;
  calorie_target_kcal: number | null;
};

export type StrengthWorkoutRow = {
  started_at: string;
  ended_at: string | null;
  total_vol: number | null;
};

export type IndoorSessionRow = {
  ended_at: string | null;
  exercise_type: string;
  total_time_s: number | null;
  total_distance_m: number | null;
};

export type OutdoorSessionRow = {
  ended_at: string | null;
  activity_type: string;
  duration_s: number | null;
  distance_m: number | null;
};

export type StrengthDaySummary = {
  count: number;
  durationMin: number;
  volumeKg: number;
};

export type CardioDaySummary = {
  count: number;
  durationMin: number;
  distanceM: number;
  runCount: number;
  walkCount: number;
};

export type HomeGoalLaneItem = {
  key: 'strength' | 'cardio' | 'nutrition';
  label: string;
  color: string;
  progress: number;
  active: boolean;
  closed: boolean;
  summary: string;
};

export type MacroRow = {
  key: string;
  label: string;
  actual: number;
  goal: number;
  color: string;
};

export const EMPTY_STRENGTH_SUMMARY: StrengthDaySummary = {
  count: 0,
  durationMin: 0,
  volumeKg: 0,
};

export const EMPTY_CARDIO_SUMMARY: CardioDaySummary = {
  count: 0,
  durationMin: 0,
  distanceM: 0,
  runCount: 0,
  walkCount: 0,
};
