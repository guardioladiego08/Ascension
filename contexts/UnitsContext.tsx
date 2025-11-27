// contexts/UnitsContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export type WeightUnit = 'lb' | 'kg';

type UnitsContextValue = {
  weightUnit: WeightUnit;
  loading: boolean;
  setWeightUnit: (unit: WeightUnit) => Promise<void>;
};

const UnitsContext = createContext<UnitsContextValue>({
  weightUnit: 'lb',
  loading: true,
  setWeightUnit: async () => {},
});

export const UnitsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [weightUnit, setWeightUnitState] = useState<WeightUnit>('lb');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPrefs = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('user_preferences')
        .select('weight_unit')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!error && data?.weight_unit) {
        setWeightUnitState(data.weight_unit as WeightUnit);
      }
      setLoading(false);
    };

    loadPrefs();
  }, []);

  const setWeightUnit = async (unit: WeightUnit) => {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    const user = userData?.user;
    if (userError || !user) return;

    // upsert so the row exists even first time
    await supabase.from('user_preferences').upsert(
      {
        user_id: user.id,
        weight_unit: unit,
      },
      { onConflict: 'user_id' }
    );

    setWeightUnitState(unit);
  };

  return (
    <UnitsContext.Provider value={{ weightUnit, loading, setWeightUnit }}>
      {children}
    </UnitsContext.Provider>
  );
};

export const useUnits = () => useContext(UnitsContext);
