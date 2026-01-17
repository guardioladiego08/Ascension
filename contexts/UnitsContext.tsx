// contexts/UnitsContext.tsx
import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export type DistanceUnit = 'mi' | 'km';
type SaveState = 'idle' | 'saving' | 'saved' | 'error';

type UnitsContextValue = {
  distanceUnit: DistanceUnit;
  setDistanceUnit: (unit: DistanceUnit) => Promise<boolean>; // returns success
  distanceSaveState: SaveState;
  distanceSaveError: string | null;
  refreshUnits: () => Promise<void>;
};

const UnitsContext = createContext<UnitsContextValue | null>(null);

const SCHEMA = 'user';
const TABLE = 'user_preferences'; // adjust to your actual table name
const DIST_COL = 'distance_unit'; // adjust to your actual column name

export function UnitsProvider({ children }: { children: React.ReactNode }) {
  const [distanceUnit, setDistanceUnitState] = useState<DistanceUnit>('mi');

  const [distanceSaveState, setDistanceSaveState] = useState<SaveState>('idle');
  const [distanceSaveError, setDistanceSaveError] = useState<string | null>(null);

  const refreshUnits = useCallback(async () => {
    const { data: auth, error: authErr } = await supabase.auth.getUser();
    if (authErr) {
      // Not fatal for UI; just keep defaults
      console.warn('[UnitsContext] getUser failed:', authErr);
      return;
    }
    if (!auth?.user) return;

    const { data, error } = await supabase
      .schema(SCHEMA)
      .from(TABLE)
      .select(`${DIST_COL}`)
      .eq('user_id', auth.user.id)
      .maybeSingle();

    if (error) {
      console.warn('[UnitsContext] load unit_preferences failed:', error);
      return;
    }

    const unit = (data?.[DIST_COL] as DistanceUnit | null) ?? null;
    if (unit === 'mi' || unit === 'km') setDistanceUnitState(unit);
  }, []);

  useEffect(() => {
    refreshUnits();
  }, [refreshUnits]);

  const setDistanceUnit = useCallback(async (unit: DistanceUnit) => {
    // optimistic UI
    const prev = distanceUnit;
    setDistanceUnitState(unit);

    setDistanceSaveState('saving');
    setDistanceSaveError(null);

    try {
      const { data: auth, error: authErr } = await supabase.auth.getUser();
      if (authErr) throw authErr;
      if (!auth?.user) throw new Error('Not signed in');

      const { error } = await supabase
        .schema(SCHEMA)
        .from(TABLE)
        .upsert(
          { user_id: auth.user.id, [DIST_COL]: unit },
          { onConflict: 'user_id' }
        );

      if (error) throw error;

      setDistanceSaveState('saved');
      return true;
    } catch (e: any) {
      console.error('[UnitsContext] setDistanceUnit failed:', e);
      setDistanceUnitState(prev); // revert on failure
      setDistanceSaveState('error');
      setDistanceSaveError(e?.message ?? 'Failed to save preference');
      return false;
    }
  }, [distanceUnit]);

  const value = useMemo(
    () => ({
      distanceUnit,
      setDistanceUnit,
      distanceSaveState,
      distanceSaveError,
      refreshUnits,
    }),
    [distanceUnit, setDistanceUnit, distanceSaveState, distanceSaveError, refreshUnits]
  );

  return <UnitsContext.Provider value={value}>{children}</UnitsContext.Provider>;
}

export function useUnits() {
  const ctx = useContext(UnitsContext);
  if (!ctx) throw new Error('useUnits must be used within UnitsProvider');
  return ctx;
}
