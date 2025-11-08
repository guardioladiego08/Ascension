import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // Surface a clear, early error to the developer console
  console.error(
    '[Supabase] Missing envs: EXPO_PUBLIC_SUPABASE_URL and/or EXPO_PUBLIC_SUPABASE_ANON_KEY.\n' +
      `URL=${SUPABASE_URL ?? 'undefined'} KEY=${SUPABASE_ANON_KEY ? '(present)' : 'undefined'}`,
  );
}

export const supabase = createClient(
  SUPABASE_URL ?? 'http://localhost',
  SUPABASE_ANON_KEY ?? 'anon-key-missing',
);
