import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import { fetchVisibleExerciseCount, getAuthenticatedUserId } from '@/lib/strength/exercises';
import { fetchStrengthWorkouts } from '@/lib/progress/history';

import type { StrengthActivity } from './strengthProgressUtils';

function getWorkoutDurationS(startedAt: string, endedAt: string | null) {
  if (!endedAt) return 0;

  const startMs = new Date(startedAt).getTime();
  const endMs = new Date(endedAt).getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
    return 0;
  }

  return Math.round((endMs - startMs) / 1000);
}

export function useStrengthProgressData() {
  const [activities, setActivities] = useState<StrengthActivity[]>([]);
  const [exerciseCount, setExerciseCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const userId = await getAuthenticatedUserId();
      if (!userId) {
        setActivities([]);
        setExerciseCount(0);
        return;
      }

      const [workouts, visibleExerciseCount] = await Promise.all([
        fetchStrengthWorkouts(userId),
        fetchVisibleExerciseCount(userId),
      ]);

      const now = new Date();
      const rangeStart = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());

      const normalized = workouts
        .filter((workout) => new Date(workout.started_at) >= rangeStart)
        .map((workout) => ({
          id: workout.id,
          startedAt: workout.started_at,
          endedAt: workout.ended_at,
          totalVolumeKg: Number(workout.total_vol ?? 0),
          durationS: getWorkoutDurationS(workout.started_at, workout.ended_at),
        }))
        .sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime());

      setActivities(normalized);
      setExerciseCount(visibleExerciseCount);
    } catch (loadError: any) {
      console.warn('[StrengthProgress] Failed to load strength progress data', loadError);
      setActivities([]);
      setExerciseCount(0);
      setError(loadError?.message ?? 'Could not load strength progress.');
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
      activities,
      exerciseCount,
      loading,
      error,
      reload: load,
    }),
    [activities, error, exerciseCount, load, loading]
  );
}
