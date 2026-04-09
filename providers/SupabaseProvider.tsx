// /providers/SupabaseProvider.tsx
// React context that keeps your current session in state and exposes it to the app.

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { clearAllRunWalkLocalState } from '@/lib/runWalkSessionCleanup';

type SupabaseContextType = {
  session: Session | null;
  loading: boolean;
};

const SupabaseContext = createContext<SupabaseContextType>({
  session: null,
  loading: true,
});

export const SupabaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Get initial session from storage (if any)
    (async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (!mounted) return;

        if (error) {
          console.warn('[SupabaseProvider] getSession failed', error);
        }

        const nextSession = data.session ?? null;
        setSession(nextSession);
        if (!nextSession) {
          clearAllRunWalkLocalState().catch(() => null);
        }
      } catch (error) {
        if (!mounted) return;
        console.warn('[SupabaseProvider] getSession threw', error);
        setSession(null);
        clearAllRunWalkLocalState().catch(() => null);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    })();

    // Listen for auth state changes
    const { data: sub } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      setLoading(false);
      if (event === 'SIGNED_OUT' || !newSession) {
        clearAllRunWalkLocalState().catch(() => null);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(() => ({ session, loading }), [session, loading]);

  return <SupabaseContext.Provider value={value}>{children}</SupabaseContext.Provider>;
};

export const useSupabaseSession = () => useContext(SupabaseContext);
