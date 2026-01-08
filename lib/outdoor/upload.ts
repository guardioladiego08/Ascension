import { supabase } from '@/lib/supabase';
import type { OutdoorSampleInsert, OutdoorSessionStatus } from './types';

const SAMPLE_CHUNK = 500;

export async function uploadOutdoorSession(params: {
  session: OutdoorSessionStatus;
  samples: OutdoorSampleInsert[];
}) {
  const { session, samples } = params;

  // Insert session
  const { data: inserted, error: sErr } = await supabase
    .from('cardio.outdoor_sessions')
    .insert(session)
    .select('id')
    .single();

  if (sErr) throw sErr;
  const sessionId = inserted.id as string;

  // Attach session_id + optionally cumulative distance
  const enriched = samples.map((s) => ({
    ...s,
    session_id: sessionId,
  }));

  // Chunk insert
  for (let i = 0; i < enriched.length; i += SAMPLE_CHUNK) {
    const chunk = enriched.slice(i, i + SAMPLE_CHUNK);
    const { error } = await supabase.from('cardio.outdoor_samples').insert(chunk);
    if (error) throw error;
  }

  return sessionId;
}
