export type BodyMetricRow = {
  id: string;
  user_id: string;
  logged_for_date: string;
  weight_kg: number | string | null;
  body_fat_pct: number | string | null;
  muscle_pct: number | string | null;
  created_at: string;
  updated_at: string;
};

export type BodyMetricEntry = {
  id: string;
  userId: string;
  loggedForDate: string;
  weightKg: number | null;
  bodyFatPct: number | null;
  musclePct: number | null;
  createdAt: string;
  updatedAt: string;
};
