import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import { usePathname } from 'expo-router';

type NavigationHistoryContextType = {
  getCurrentRoute: () => string | null;
  getPreviousRoute: () => string | null;
  popPreviousRoute: () => string | null;
};

const MAX_HISTORY_LENGTH = 120;

const NavigationHistoryContext = createContext<NavigationHistoryContextType | undefined>(undefined);

export function NavigationHistoryProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const historyRef = useRef<string[]>([]);

  useEffect(() => {
    if (!pathname || typeof pathname !== 'string') return;

    const nextRoute = pathname.trim();
    if (!nextRoute) return;

    const history = historyRef.current;
    const last = history[history.length - 1];
    if (last === nextRoute) return;

    history.push(nextRoute);
    if (history.length > MAX_HISTORY_LENGTH) {
      history.splice(0, history.length - MAX_HISTORY_LENGTH);
    }
  }, [pathname]);

  const getCurrentRoute = useCallback(() => {
    const history = historyRef.current;
    return history.length ? history[history.length - 1] : null;
  }, []);

  const getPreviousRoute = useCallback(() => {
    const history = historyRef.current;
    if (history.length <= 1) return null;

    const current = history[history.length - 1];
    for (let idx = history.length - 2; idx >= 0; idx -= 1) {
      const candidate = history[idx];
      if (candidate && candidate !== current) return candidate;
    }

    return null;
  }, []);

  const popPreviousRoute = useCallback(() => {
    const history = historyRef.current;
    if (history.length <= 1) return null;

    const current = history[history.length - 1];
    let targetIndex = -1;
    for (let idx = history.length - 2; idx >= 0; idx -= 1) {
      const candidate = history[idx];
      if (candidate && candidate !== current) {
        targetIndex = idx;
        break;
      }
    }

    if (targetIndex < 0) return null;

    const target = history[targetIndex];
    historyRef.current = history.slice(0, targetIndex + 1);
    return target ?? null;
  }, []);

  const value = useMemo<NavigationHistoryContextType>(
    () => ({
      getCurrentRoute,
      getPreviousRoute,
      popPreviousRoute,
    }),
    [getCurrentRoute, getPreviousRoute, popPreviousRoute]
  );

  return (
    <NavigationHistoryContext.Provider value={value}>
      {children}
    </NavigationHistoryContext.Provider>
  );
}

export function useNavigationHistory() {
  const context = useContext(NavigationHistoryContext);
  if (!context) {
    throw new Error('useNavigationHistory must be used within NavigationHistoryProvider');
  }
  return context;
}

