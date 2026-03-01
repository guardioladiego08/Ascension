import { supabase } from '@/lib/supabase';
import type { DailyGoalResults } from './goalLogic';

function pad2(value: number) {
  return String(value).padStart(2, '0');
}

export function toLocalISODate(date: Date = new Date()) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function getDeviceTimezone(): string | null {
  try {
    return Intl?.DateTimeFormat?.().resolvedOptions?.().timeZone ?? null;
  } catch {
    return null;
  }
}

function isMissingGoalRpc(error: any, functionName: string) {
  const message = String(error?.message ?? '').toLowerCase();
  return (
    String(error?.code ?? '') === 'PGRST202' ||
    message.includes(functionName.toLowerCase())
  );
}

function normalizeDailyGoalRow(
  data: DailyGoalResults | DailyGoalResults[] | null
): DailyGoalResults | null {
  if (!data) return null;
  if (Array.isArray(data)) return (data[0] as DailyGoalResults) ?? null;
  return data as DailyGoalResults;
}

function normalizeDailyGoalRows(
  data: DailyGoalResults | DailyGoalResults[] | null
): DailyGoalResults[] {
  if (!data) return [];
  return Array.isArray(data) ? data : [data];
}

export async function fetchMyDailyGoalResult(goalDate: string) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!user) throw new Error('Not signed in');

  const { data, error } = await supabase
    .schema('user')
    .from('daily_goal_results')
    .select('*')
    .eq('user_id', user.id)
    .eq('date', goalDate)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') throw error;
  return (data as DailyGoalResults | null) ?? null;
}

export async function refreshMyDailyGoalResult(goalDate: string) {
  const { data, error } = await supabase
    .schema('user')
    .rpc('refresh_my_goal_results', { p_goal_date: goalDate });

  if (error) throw error;
  return normalizeDailyGoalRow(data as DailyGoalResults | DailyGoalResults[] | null);
}

export async function refreshMyGoalCalendarRange(startDate: string, endDate: string) {
  const { data, error } = await supabase
    .schema('user')
    .rpc('refresh_my_goal_calendar_range', { p_start: startDate, p_end: endDate });

  if (error) throw error;
  return normalizeDailyGoalRows(data as DailyGoalResults | DailyGoalResults[] | null);
}

export function isMissingGoalRefreshRpc(error: any) {
  return isMissingGoalRpc(error, 'refresh_my_goal_results');
}

export function isMissingGoalCalendarRangeRpc(error: any) {
  return isMissingGoalRpc(error, 'refresh_my_goal_calendar_range');
}

export async function syncAndFetchMyDailyGoalResult(goalDate: string) {
  try {
    return await refreshMyDailyGoalResult(goalDate);
  } catch (error) {
    if (!isMissingGoalRefreshRpc(error)) throw error;
    return fetchMyDailyGoalResult(goalDate);
  }
}
