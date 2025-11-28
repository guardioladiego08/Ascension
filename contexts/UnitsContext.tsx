// contexts/UnitsContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export type WeightUnit = 'lb' | 'kg';
export type DistanceUnit = 'mi' | 'km';

type UnitsContextValue = {
  weightUnit: WeightUnit;
  distanceUnit: DistanceUnit;
  loading: boolean;
  setWeightUnit: (unit: WeightUnit) => Promise<void>;
  setDistanceUnit: (unit: DistanceUnit) => Promise<void>;
};

const UnitsContext = createContext<UnitsContextValue>({
  weightUnit: 'lb',
  distanceUnit: 'mi',
  loading: true,
  setWeightUnit: async () => {},
  setDistanceUnit: async () => {},
});

export const UnitsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [weightUnit, setWeightUnitState] = useState<WeightUnit>('lb');
  const [distanceUnit, setDistanceUnitState] = useState<DistanceUnit>('mi');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPrefs = async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        const user = userData?.user;
        if (!user) {
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('user_preferences')
          .select('weight_unit, distance_unit')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!error && data) {
          if (data.weight_unit === 'lb' || data.weight_unit === 'kg') {
            setWeightUnitState(data.weight_unit as WeightUnit);
          }
          if (data.distance_unit === 'mi' || data.distance_unit === 'km') {
            setDistanceUnitState(data.distance_unit as DistanceUnit);
          }
        }
      } finally {
        setLoading(false);
      }
    };

    loadPrefs();
  }, []);

  const setWeightUnit = async (unit: WeightUnit) => {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    const user = userData?.user;
    if (userError || !user) return;

    await supabase.from('user_preferences').upsert(
      {
        user_id: user.id,
        weight_unit: unit,
      },
      { onConflict: 'user_id' }
    );

    setWeightUnitState(unit);
  };

  const setDistanceUnit = async (unit: DistanceUnit) => {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    const user = userData?.user;
    if (userError || !user) return;

    await supabase.from('user_preferences').upsert(
      {
        user_id: user.id,
        distance_unit: unit,
      },
      { onConflict: 'user_id' }
    );

    setDistanceUnitState(unit);
  };

  return (
    <UnitsContext.Provider
      value={{ weightUnit, distanceUnit, loading, setWeightUnit, setDistanceUnit }}
    >
      {children}
    </UnitsContext.Provider>
  );
};

export const useUnits = () => useContext(UnitsContext);
