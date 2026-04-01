import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import { supabase } from '@/lib/supabase';
import { getAuthenticatedUserId } from '@/lib/progress/history';

import type { RunningActivity } from './runningProgressUtils';

type IndoorRunRow = {
  id: string;
  ended_at: string | null;
  exercise_type: string | null;
  total_time_s: number | null;
  total_distance_m: number | null;
  total_elevation_m: number | null;
  avg_pace_s_per_km: number | null;
  avg_pace_s_per_mi: number | null;
};

type OutdoorRunRow = {
  id: string;
  ended_at: string | null;
  activity_type: string | null;
  duration_s: number | null;
  distance_m: number | null;
  elev_gain_m: number | null;
  avg_pace_s_per_km: number | null;
};

const PAGE_SIZE = 1000;
const M_PER_MI = 1609.344;

function isRunningActivity(value: string | null | undefined) {
  const normalized = String(value ?? '').toLowerCase();
  return normalized.includes('run');
}

function startOfDay(value: Date) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

async function fetchPagedRows<T>(
  factory: (from: number, to: number) => any
) {
  const rows: T[] = [];
  let from = 0;

  while (true) {
    const response = await factory(from, from + PAGE_SIZE - 1);
    if (response.error) {
      throw response.error;
    }

    const page = response.data ?? [];
    rows.push(...page);

    if (page.length < PAGE_SIZE) {
      break;
    }

    from += PAGE_SIZE;
  }

  return rows;
}

function normalizeIndoorRows(rows: IndoorRunRow[]): RunningActivity[] {
  return rows
    .filter((row) => row.ended_at && isRunningActivity(row.exercise_type))
    .map((row) => {
      const durationS = Number(row.total_time_s ?? 0);
      const distanceM = Number(row.total_distance_m ?? 0);
      const fallbackPaceKm =
        durationS > 0 && distanceM > 0 ? durationS / (distanceM / 1000) : null;

      return {
        id: row.id,
        endedAt: String(row.ended_at),
        durationS,
        distanceM,
        elevationM: Number(row.total_elevation_m ?? 0),
        paceKm:
          row.avg_pace_s_per_km == null
            ? fallbackPaceKm
            : Number(row.avg_pace_s_per_km),
        paceMi:
          row.avg_pace_s_per_mi == null
            ? fallbackPaceKm == null
              ? null
              : fallbackPaceKm * 1.609344
            : Number(row.avg_pace_s_per_mi),
      };
    });
}

function normalizeOutdoorRows(rows: OutdoorRunRow[]): RunningActivity[] {
  return rows
    .filter((row) => row.ended_at && isRunningActivity(row.activity_type))
    .map((row) => {
      const durationS = Number(row.duration_s ?? 0);
      const distanceM = Number(row.distance_m ?? 0);
      const fallbackPaceKm =
        durationS > 0 && distanceM > 0 ? durationS / (distanceM / 1000) : null;
      const paceKm =
        row.avg_pace_s_per_km == null ? fallbackPaceKm : Number(row.avg_pace_s_per_km);

      return {
        id: row.id,
        endedAt: String(row.ended_at),
        durationS,
        distanceM,
        elevationM: Number(row.elev_gain_m ?? 0),
        paceKm,
        paceMi: paceKm == null ? null : paceKm * M_PER_MI / 1000,
      };
    });
}

export function useRunningProgressData() {
  const [activities, setActivities] = useState<RunningActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const userId = await getAuthenticatedUserId();
      if (!userId) {
        setActivities([]);
        return;
      }

      const now = new Date();
      const rangeStart = startOfDay(new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()));
      const rangeStartIso = rangeStart.toISOString();

      const [indoorRows, outdoorRows] = await Promise.all([
        fetchPagedRows<IndoorRunRow>((from, to) =>
          supabase
            .schema('run_walk')
            .from('sessions')
            .select(
              'id, ended_at, exercise_type, total_time_s, total_distance_m, total_elevation_m, avg_pace_s_per_km, avg_pace_s_per_mi'
            )
            .eq('user_id', userId)
            .eq('status', 'completed')
            .not('ended_at', 'is', null)
            .gte('ended_at', rangeStartIso)
            .order('ended_at', { ascending: true })
            .range(from, to),
        ),
        fetchPagedRows<OutdoorRunRow>((from, to) =>
          supabase
            .schema('run_walk')
            .from('outdoor_sessions')
            .select(
              'id, ended_at, activity_type, duration_s, distance_m, elev_gain_m, avg_pace_s_per_km'
            )
            .eq('user_id', userId)
            .eq('status', 'completed')
            .not('ended_at', 'is', null)
            .gte('ended_at', rangeStartIso)
            .order('ended_at', { ascending: true })
            .range(from, to),
        ),
      ]);

      const normalized = [
        ...normalizeIndoorRows(indoorRows),
        ...normalizeOutdoorRows(outdoorRows),
      ].sort((a, b) => new Date(a.endedAt).getTime() - new Date(b.endedAt).getTime());

      setActivities(normalized);
    } catch (loadError: any) {
      console.warn('[RunningProgress] Failed to load running progress data', loadError);
      setActivities([]);
      setError(loadError?.message ?? 'Could not load running progress.');
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

  return {
    activities,
    loading,
    error,
    reload: load,
  };
}
