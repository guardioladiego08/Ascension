// contexts/UnitsContext.tsx
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { supabase } from '@/lib/supabase';

export type DistanceUnit = 'mi' | 'km';
export type WeightUnit = 'lb' | 'kg';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

type UnitsContextValue = {
  weightUnit: WeightUnit;
  distanceUnit: DistanceUnit;
  setWeightUnit: (unit: WeightUnit) => Promise<boolean>;
  setDistanceUnit: (unit: DistanceUnit) => Promise<boolean>;
  weightSaveState: SaveState;
  distanceSaveState: SaveState;
  weightSaveError: string | null;
  distanceSaveError: string | null;
  refreshUnits: () => Promise<void>;
  units: {
    weight: WeightUnit;
    distance: DistanceUnit;
  };
};

const UnitsContext = createContext<UnitsContextValue | null>(null);

const SCHEMA = 'user';
const TABLE = 'user_preferences';

const DIST_COL = 'distance_unit';
const WEIGHT_COL = 'weight_unit';

function normalizeDistanceUnit(value: unknown): DistanceUnit {
  const raw = String(value ?? '').toLowerCase();
  return raw === 'km' ? 'km' : 'mi';
}

function normalizeWeightUnit(value: unknown): WeightUnit {
  const raw = String(value ?? '').toLowerCase();
  return raw === 'kg' ? 'kg' : 'lb';
}

export function UnitsProvider({ children }: { children: React.ReactNode }) {
  const [distanceUnit, setDistanceUnitState] = useState<DistanceUnit>('km');
  const [weightUnit, setWeightUnitState] = useState<WeightUnit>('kg');

  const [distanceSaveState, setDistanceSaveState] = useState<SaveState>('idle');
  const [weightSaveState, setWeightSaveState] = useState<SaveState>('idle');

  const [distanceSaveError, setDistanceSaveError] = useState<string | null>(null);
  const [weightSaveError, setWeightSaveError] = useState<string | null>(null);

  const upsertUnits = useCallback(async (partial: Partial<Record<typeof DIST_COL | typeof WEIGHT_COL, string>>) => {
    const { data: auth, error: authErr } = await supabase.auth.getUser();
    if (authErr) throw authErr;
    if (!auth?.user) throw new Error('Not signed in');

    const payload = { user_id: auth.user.id, ...partial };
    const { error } = await supabase
      .schema(SCHEMA)
      .from(TABLE)
      .upsert(payload, { onConflict: 'user_id' });

    if (error) throw error;
  }, []);

  const refreshUnits = useCallback(async () => {
    const { data: auth, error: authErr } = await supabase.auth.getUser();
    if (authErr) {
      console.warn('[UnitsContext] getUser failed:', authErr);
      return;
    }
    if (!auth?.user) return;

    const { data, error } = await supabase
      .schema(SCHEMA)
      .from(TABLE)
      .select(`${DIST_COL}, ${WEIGHT_COL}`)
      .eq('user_id', auth.user.id)
      .maybeSingle();

    if (error) {
      console.warn('[UnitsContext] load user_preferences failed:', error);
      return;
    }

    if (data) {
      setDistanceUnitState(normalizeDistanceUnit(data[DIST_COL]));
      setWeightUnitState(normalizeWeightUnit(data[WEIGHT_COL]));
    }
  }, []);

  useEffect(() => {
    refreshUnits();
  }, [refreshUnits]);

  const setDistanceUnit = useCallback(async (unit: DistanceUnit) => {
    const prev = distanceUnit;
    setDistanceUnitState(unit);
    setDistanceSaveState('saving');
    setDistanceSaveError(null);

    try {
      await upsertUnits({ [DIST_COL]: unit });
      setDistanceSaveState('saved');
      return true;
    } catch (e: any) {
      console.error('[UnitsContext] setDistanceUnit failed:', e);
      setDistanceUnitState(prev);
      setDistanceSaveState('error');
      setDistanceSaveError(e?.message ?? 'Failed to save preference');
      return false;
    }
  }, [distanceUnit, upsertUnits]);

  const setWeightUnit = useCallback(async (unit: WeightUnit) => {
    const prev = weightUnit;
    setWeightUnitState(unit);
    setWeightSaveState('saving');
    setWeightSaveError(null);

    try {
      await upsertUnits({ [WEIGHT_COL]: unit });
      setWeightSaveState('saved');
      return true;
    } catch (e: any) {
      console.error('[UnitsContext] setWeightUnit failed:', e);
      setWeightUnitState(prev);
      setWeightSaveState('error');
      setWeightSaveError(e?.message ?? 'Failed to save preference');
      return false;
    }
  }, [weightUnit, upsertUnits]);

  const value = useMemo(
    () => ({
      weightUnit,
      distanceUnit,
      setWeightUnit,
      setDistanceUnit,
      weightSaveState,
      distanceSaveState,
      weightSaveError,
      distanceSaveError,
      refreshUnits,
      units: {
        weight: weightUnit,
        distance: distanceUnit,
      },
    }),
    [
      weightUnit,
      distanceUnit,
      setWeightUnit,
      setDistanceUnit,
      weightSaveState,
      distanceSaveState,
      weightSaveError,
      distanceSaveError,
      refreshUnits,
    ]
  );

  return <UnitsContext.Provider value={value}>{children}</UnitsContext.Provider>;
}

export function useUnits() {
  const ctx = useContext(UnitsContext);
  if (!ctx) throw new Error('useUnits must be used within UnitsProvider');
  return ctx;
}
