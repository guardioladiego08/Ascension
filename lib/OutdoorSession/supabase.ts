// lib/outdoor/supabase.ts
import { supabase } from '@/lib/supabase';
import type {
  ActivityPrivacy,
  OutdoorActivityType,
  OutdoorSampleInsert,
} from './types';

const SCHEMA = 'run_walk';

export async function createOutdoorSession(args: {
  activityType: OutdoorActivityType;
  startedAtISO: string;
  timezoneStr?: string | null;
  privacy?: ActivityPrivacy;
}) {
  const { activityType, startedAtISO, timezoneStr, privacy = 'private' } = args;

  const { data, error } = await supabase
    .schema(SCHEMA)
    .from('outdoor_sessions')
    .insert({
      activity_type: activityType,
      started_at: startedAtISO,
      timezone_str: timezoneStr ?? null,
      privacy,
      status: 'in_progress',
      flags: { recorder: 'tensr_v1' },
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id as string;
}

export async function updateOutdoorSession(sessionId: string, patch: Record<string, any>) {
  const { error } = await supabase
    .schema(SCHEMA)
    .from('outdoor_sessions')
    .update(patch)
    .eq('id', sessionId);

  if (error) throw error;
}

export async function insertOutdoorSamples(samples: OutdoorSampleInsert[]) {
  if (samples.length === 0) return;

  const { error } = await supabase
    .schema(SCHEMA)
    .from('outdoor_samples')
    .insert(samples);

  if (error) throw error;
}

export async function fetchOutdoorSession(sessionId: string) {
  const { data, error } = await supabase
    .schema(SCHEMA)
    .from('outdoor_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (error) throw error;
  return data;
}

export async function fetchOutdoorSamples(sessionId: string) {
  const { data, error } = await supabase
    .schema(SCHEMA)
    .from('outdoor_samples')
    .select('*')
    .eq('session_id', sessionId)
    .order('ts', { ascending: true });

  if (error) throw error;
  return data ?? [];
}