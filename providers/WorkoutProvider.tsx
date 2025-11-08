import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

export type ActiveWorkout = {
  id: string;
  type?: string;
  startedAt?: number;
  [key: string]: any;
} | null;

type WorkoutContextValue = {
  activeWorkout: ActiveWorkout;
  startWorkout: (workout: Omit<NonNullable<ActiveWorkout>, 'startedAt'> & { startedAt?: number }) => void;
  endWorkout: () => void;
};

const WorkoutContext = createContext<WorkoutContextValue | undefined>(undefined);

export const WorkoutProvider: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
  const [activeWorkout, setActiveWorkout] = useState<ActiveWorkout>(null);

  const startWorkout = useCallback<WorkoutContextValue['startWorkout']>((workout) => {
    setActiveWorkout({ startedAt: Date.now(), ...workout } as NonNullable<ActiveWorkout>);
  }, []);

  const endWorkout = useCallback(() => setActiveWorkout(null), []);

  const value = useMemo(() => ({ activeWorkout, startWorkout, endWorkout }), [activeWorkout, startWorkout, endWorkout]);

  return <WorkoutContext.Provider value={value}>{children}</WorkoutContext.Provider>;
};

export function useWorkout() {
  const ctx = useContext(WorkoutContext);
  if (!ctx) throw new Error('useWorkout must be used within WorkoutProvider');
  return ctx;
}