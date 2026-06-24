import { supabase } from '@/lib/supabase';
import { getAuthenticatedUserId } from '@/lib/userPreferences';

import type { BodyMetricEntry, BodyMetricRow } from './types';

export const BODY_METRICS_SCHEMA = 'user';
export const BODY_METRICS_TABLE = 'body_metrics';

const BODY_METRIC_SELECT =
  'id,user_id,logged_for_date,weight_kg,body_fat_pct,muscle_pct,created_at,updated_at' as const;

function toNumber(value: number | string | null | undefined) {
  if (value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeBodyMetricRow(row: BodyMetricRow): BodyMetricEntry {
  return {
    id: row.id,
    userId: row.user_id,
    loggedForDate: row.logged_for_date,
    weightKg: toNumber(row.weight_kg),
    bodyFatPct: toNumber(row.body_fat_pct),
    musclePct: toNumber(row.muscle_pct),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listBodyMetricEntries(options?: {
  startDate?: string;
  endDate?: string;
  limit?: number;
  ascending?: boolean;
}) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return [];

  let query = supabase
    .schema(BODY_METRICS_SCHEMA)
    .from(BODY_METRICS_TABLE)
    .select(BODY_METRIC_SELECT)
    .eq('user_id', userId)
    .order('logged_for_date', { ascending: options?.ascending ?? false });

  if (options?.startDate) {
    query = query.gte('logged_for_date', options.startDate);
  }

  if (options?.endDate) {
    query = query.lte('logged_for_date', options.endDate);
  }

  if (typeof options?.limit === 'number') {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) throw error;

  return ((data ?? []) as BodyMetricRow[]).map(normalizeBodyMetricRow);
}

export async function getLatestBodyMetricEntry() {
  const rows = await listBodyMetricEntries({ limit: 1, ascending: false });
  return rows[0] ?? null;
}

export async function getCurrentBodyMetricSeed() {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return {
      latestEntry: null,
      profileWeightKg: null,
    };
  }

  const [latestEntry, profileRes] = await Promise.all([
    getLatestBodyMetricEntry(),
    supabase
      .schema('user')
      .from('users')
      .select('weight_kg')
      .eq('user_id', userId)
      .maybeSingle<{ weight_kg: number | string | null }>(),
  ]);

  if (profileRes.error) throw profileRes.error;

  return {
    latestEntry,
    profileWeightKg: toNumber(profileRes.data?.weight_kg ?? null),
  };
}

export async function upsertBodyMetricEntry(input: {
  loggedForDate: string;
  weightKg?: number | null;
  bodyFatPct?: number | null;
  musclePct?: number | null;
}) {
  const userId = await getAuthenticatedUserId({ required: true });

  const payload = {
    user_id: userId,
    logged_for_date: input.loggedForDate,
    weight_kg: input.weightKg ?? null,
    body_fat_pct: input.bodyFatPct ?? null,
    muscle_pct: input.musclePct ?? null,
  };

  const { data, error } = await supabase
    .schema(BODY_METRICS_SCHEMA)
    .from(BODY_METRICS_TABLE)
    .upsert(payload, { onConflict: 'user_id,logged_for_date' })
    .select(BODY_METRIC_SELECT)
    .single<BodyMetricRow>();

  if (error) throw error;
  return normalizeBodyMetricRow(data);
}
