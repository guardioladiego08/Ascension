import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import { listBodyMetricEntries } from '@/lib/biometrics/api';
import type { BodyMetricEntry } from '@/lib/biometrics/types';
import { toLocalIsoDate } from '@/lib/biometrics/utils';

export function useBodyProgressData() {
  const [entries, setEntries] = useState<BodyMetricEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const now = new Date();
      const rangeStart = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      const rows = await listBodyMetricEntries({
        startDate: toLocalIsoDate(rangeStart),
        ascending: true,
      });

      setEntries(rows);
    } catch (loadError: any) {
      console.warn('[BodyProgress] Failed to load body metric history', loadError);
      setEntries([]);
      setError(loadError?.message ?? 'Could not load body metrics.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
      return undefined;
    }, [load])
  );

  return useMemo(
    () => ({
      entries,
      loading,
      error,
      reload: load,
    }),
    [entries, error, load, loading]
  );
}
