import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import { supabase } from '@/lib/supabase';
import { syncAndFetchMyDailyGoalResult, toLocalISODate } from '@/lib/goals/client';
import type { DailyGoalResults } from '@/lib/goals/goalLogic';

import {
  EMPTY_CARDIO_SUMMARY,
  EMPTY_STRENGTH_SUMMARY,
  type AppUserRow,
  type CardioDaySummary,
  type DiaryDay,
  type GoalSnapshot,
  type IndoorSessionRow,
  type OutdoorSessionRow,
  type StrengthDaySummary,
  type StrengthWorkoutRow,
} from './types';
import { isRunWalkType } from './utils';

function getTodayBounds() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setHours(23, 59, 59, 999);

  return {
    startIso: start.toISOString(),
    endIso: end.toISOString(),
    todayIso: toLocalISODate(start),
  };
}

type HomeDashboardState = {
  loading: boolean;
  profile: AppUserRow | null;
  todaySummary: DiaryDay | null;
  goalSnapshot: GoalSnapshot | null;
  goalResult: DailyGoalResults | null;
  strengthSummary: StrengthDaySummary;
  cardioSummary: CardioDaySummary;
};

const EMPTY_STATE: HomeDashboardState = {
  loading: true,
  profile: null,
  todaySummary: null,
  goalSnapshot: null,
  goalResult: null,
  strengthSummary: EMPTY_STRENGTH_SUMMARY,
  cardioSummary: EMPTY_CARDIO_SUMMARY,
};

export function useHomeDashboard() {
  const [state, setState] = useState<HomeDashboardState>(EMPTY_STATE);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const loadHome = async () => {
        const { startIso, endIso, todayIso } = getTodayBounds();

        try {
          setState((current) => ({ ...current, loading: true }));

          const {
            data: { user },
            error: userError,
          } = await supabase.auth.getUser();

          if (userError) throw userError;
          if (!user) {
            if (isActive) setState({ ...EMPTY_STATE, loading: false });
            return;
          }

          const [
            profileRes,
            diaryRes,
            goalSnapshotRes,
            strengthRes,
            indoorRes,
            outdoorRes,
            goalRow,
          ] = await Promise.all([
            supabase
              .schema('user')
              .from('users')
              .select('user_id,username,first_name,last_name,is_private,country,state,city')
              .eq('user_id', user.id)
              .maybeSingle(),
            supabase
              .schema('nutrition')
              .from('diary_days')
              .select(
                'id,user_id,date,timezone_str,kcal_target,protein_g_target,carbs_g_target,fat_g_target,kcal_total,protein_g_total,carbs_g_total,fat_g_total,goal_hit'
              )
              .eq('user_id', user.id)
              .eq('date', todayIso)
              .maybeSingle(),
            supabase
              .schema('user')
              .from('user_goal_snapshots')
              .select(
                [
                  'strength_condition_mode',
                  'strength_use_time',
                  'strength_time_min',
                  'strength_use_volume',
                  'strength_volume_min',
                  'strength_volume_unit',
                  'cardio_condition_mode',
                  'cardio_use_time',
                  'cardio_time_min',
                  'cardio_use_distance',
                  'cardio_distance',
                  'cardio_distance_unit',
                  'nutrition_condition_mode',
                  'protein_enabled',
                  'protein_target_g',
                  'carbs_enabled',
                  'carbs_target_g',
                  'fats_enabled',
                  'fats_target_g',
                  'calorie_goal_mode',
                  'calorie_target_kcal',
                ].join(',')
              )
              .eq('user_id', user.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle(),
            supabase
              .schema('strength')
              .from('strength_workouts')
              .select('started_at, ended_at, total_vol')
              .eq('user_id', user.id)
              .gte('started_at', startIso)
              .lte('started_at', endIso),
            supabase
              .schema('run_walk')
              .from('sessions')
              .select('ended_at, exercise_type, total_time_s, total_distance_m')
              .eq('user_id', user.id)
              .eq('status', 'completed')
              .gte('ended_at', startIso)
              .lte('ended_at', endIso),
            supabase
              .schema('run_walk')
              .from('outdoor_sessions')
              .select('ended_at, activity_type, duration_s, distance_m')
              .eq('user_id', user.id)
              .eq('status', 'completed')
              .gte('ended_at', startIso)
              .lte('ended_at', endIso),
            syncAndFetchMyDailyGoalResult(todayIso).catch((error) => {
              console.warn('[Home] Failed to refresh goal results', error);
              return null;
            }),
          ]);

          if (!isActive) return;

          if (profileRes.error && profileRes.error.code !== 'PGRST116') throw profileRes.error;
          if (diaryRes.error && diaryRes.error.code !== 'PGRST116') throw diaryRes.error;
          if (goalSnapshotRes.error && goalSnapshotRes.error.code !== 'PGRST116') {
            throw goalSnapshotRes.error;
          }
          if (strengthRes.error) throw strengthRes.error;
          if (indoorRes.error) throw indoorRes.error;
          if (outdoorRes.error) throw outdoorRes.error;

          const strengthRows = (strengthRes.data ?? []) as StrengthWorkoutRow[];
          const completedStrength = strengthRows.filter((row) => !!row.ended_at);
          const strengthSummary = completedStrength.reduce<StrengthDaySummary>(
            (summary, row) => {
              summary.count += 1;
              summary.volumeKg += Number(row.total_vol ?? 0);

              if (row.ended_at) {
                const startedAt = new Date(row.started_at).getTime();
                const endedAt = new Date(row.ended_at).getTime();
                if (endedAt > startedAt) {
                  summary.durationMin += (endedAt - startedAt) / 60000;
                }
              }

              return summary;
            },
            { ...EMPTY_STRENGTH_SUMMARY }
          );

          const indoorRows = ((indoorRes.data ?? []) as IndoorSessionRow[]).filter((row) =>
            isRunWalkType(row.exercise_type)
          );
          const outdoorRows = ((outdoorRes.data ?? []) as OutdoorSessionRow[]).filter((row) =>
            isRunWalkType(row.activity_type)
          );

          const cardioSummary = [...indoorRows, ...outdoorRows].reduce<CardioDaySummary>(
            (summary, row) => {
              summary.count += 1;
              summary.distanceM += Number(
                'total_distance_m' in row ? row.total_distance_m ?? 0 : row.distance_m ?? 0
              );
              summary.durationMin += Number(
                'total_time_s' in row ? row.total_time_s ?? 0 : row.duration_s ?? 0
              ) / 60;

              const type = String(
                'exercise_type' in row ? row.exercise_type : row.activity_type
              ).toLowerCase();
              if (type.includes('walk')) summary.walkCount += 1;
              if (type.includes('run')) summary.runCount += 1;

              return summary;
            },
            { ...EMPTY_CARDIO_SUMMARY }
          );

          setState({
            loading: false,
            profile: (profileRes.data as AppUserRow | null) ?? null,
            todaySummary: (diaryRes.data as DiaryDay | null) ?? null,
            goalSnapshot: (goalSnapshotRes.data as GoalSnapshot | null) ?? null,
            goalResult: goalRow,
            strengthSummary,
            cardioSummary,
          });
        } catch (error) {
          console.error('[Home] Failed to load home screen', error);
          if (isActive) {
            setState((current) => ({
              ...current,
              loading: false,
            }));
          }
        }
      };

      loadHome();

      return () => {
        isActive = false;
      };
    }, [])
  );

  return state;
}
