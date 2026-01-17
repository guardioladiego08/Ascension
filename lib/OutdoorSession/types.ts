export type OutdoorMode = 'outdoor_run' | 'outdoor_walk';

export type OutdoorActivityType = 'run' | 'walk';

export type OutdoorSessionStatus = 'in_progress' | 'completed' | 'canceled';

export type ActivityPrivacy = 'public' | 'followers' | 'private';

export type OutdoorSampleInsert = {
  session_id: string;
  ts: string; // ISO
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
};

export type Split = {
  index: number; // 1-based
  distance_m: number;
  duration_s: number;
  avg_pace_s_per_km: number | null;
  start_elapsed_s: number;
  end_elapsed_s: number;
  kind: 'auto_km' | 'manual';
};