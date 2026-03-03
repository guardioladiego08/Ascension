import { supabase } from '@/lib/supabase';

export type StrengthWorkoutRow = {
  id: string;
  started_at: string;
  ended_at: string | null;
  total_vol?: number | null;
  notes?: string | null;
  privacy?: 'private' | 'followers' | 'public' | string | null;
  name?: string | null;
};

type OutdoorSessionRow = {
  id: string;
  started_at: string | null;
  ended_at: string | null;
  activity_type: 'run' | 'walk' | string;
  status: string | null;
  duration_s: number | null;
  distance_m: number | null;
};

type IndoorSessionRow = {
  id: string;
  started_at: string | null;
  ended_at: string | null;
  exercise_type: string;
  status: string | null;
  total_time_s: number | null;
  total_distance_m: number | null;
};

type NutritionDayRow = {
  id: string;
  date: string;
  kcal_total: number | string | null;
  protein_g_total: number | string | null;
  carbs_g_total: number | string | null;
  fat_g_total: number | string | null;
  goal_hit: boolean | null;
  updated_at: string | null;
};

export type CardioSessionItem = {
  id: string;
  source: 'indoor' | 'outdoor';
  startedAt: string | null;
  endedAt: string | null;
  activityType: string;
  durationS: number | null;
  distanceM: number | null;
};

export type NutritionDayItem = {
  id: string;
  date: string;
  kcalTotal: number;
  proteinGTotal: number;
  carbsGTotal: number;
  fatGTotal: number;
  goalHit: boolean;
  updatedAt: string | null;
};

export async function getAuthenticatedUserId() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) throw error;
  return user?.id ?? null;
}

export function isRunWalkActivity(activityType: string) {
  const value = (activityType ?? '').toLowerCase();
  return value.includes('run') || value.includes('walk');
}

export function formatCardioActivityTypeLabel(
  activityType: string,
  source: 'indoor' | 'outdoor'
) {
  const value = (activityType ?? '').toLowerCase();
  const prefix = source === 'indoor' ? 'Indoor' : 'Outdoor';

  if (value.includes('walk')) return `${prefix} walk`;
  if (value.includes('run')) return `${prefix} run`;
  return `${prefix} session`;
}

export function getCardioSessionTimestamp(session: CardioSessionItem) {
  return new Date(session.endedAt ?? session.startedAt ?? 0).getTime();
}

function dedupeById<T extends { id: string }>(rows: T[]) {
  const seen = new Set<string>();
  const deduped: T[] = [];

  for (const row of rows) {
    if (!row?.id || seen.has(row.id)) continue;
    seen.add(row.id);
    deduped.push(row);
  }

  return deduped;
}

function sortStrengthRows(rows: StrengthWorkoutRow[]) {
  return dedupeById(rows).sort(
    (a, b) =>
      new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
  );
}

async function fetchAllRows<T>(queryBuilderFactory: () => any) {
  const pageSize = 1000;
  const rows: T[] = [];
  let from = 0;

  while (true) {
    const query = queryBuilderFactory().range(from, from + pageSize - 1);
    const { data, error } = await query;
    if (error) throw error;

    const page = (data ?? []) as T[];
    rows.push(...page);

    if (page.length < pageSize) break;
    from += pageSize;
  }

  return rows;
}

export async function fetchStrengthWorkouts(userId: string, limit?: number) {
  const queryLimit = typeof limit === 'number' ? limit : 5000;

  const [rpcRes, directRes] = await Promise.all([
    supabase.rpc('list_strength_workouts_user', {
      p_limit: queryLimit,
    }),
    supabase
      .schema('strength')
      .from('strength_workouts')
      .select('id, started_at, ended_at, total_vol, notes, privacy, name')
      .eq('user_id', userId)
      .order('started_at', { ascending: false })
      .limit(queryLimit),
  ]);

  const rows: StrengthWorkoutRow[] = [];

  if (!rpcRes.error) {
    rows.push(...((rpcRes.data ?? []) as StrengthWorkoutRow[]));
  } else {
    const rpcMissing =
      String(rpcRes.error?.code ?? '') === 'PGRST202' ||
      String(rpcRes.error?.message ?? '').includes('list_strength_workouts_user');

    if (!rpcMissing && directRes.error) {
      throw rpcRes.error;
    }
  }

  if (!directRes.error) {
    rows.push(...((directRes.data ?? []) as StrengthWorkoutRow[]));
  } else if (!rows.length) {
    throw directRes.error;
  }

  const sorted = sortStrengthRows(rows);
  return typeof limit === 'number' ? sorted.slice(0, limit) : sorted;
}

export async function fetchCardioSessions(userId: string, limit?: number) {
  const indoorPromise =
    typeof limit === 'number'
      ? supabase
          .schema('run_walk')
          .from('sessions')
          .select(
            'id, started_at, ended_at, exercise_type, status, total_time_s, total_distance_m'
          )
          .eq('user_id', userId)
          .eq('status', 'completed')
          .order('ended_at', { ascending: false })
          .limit(limit)
      : fetchAllRows<IndoorSessionRow>(() =>
          supabase
            .schema('run_walk')
            .from('sessions')
            .select(
              'id, started_at, ended_at, exercise_type, status, total_time_s, total_distance_m'
            )
            .eq('user_id', userId)
            .eq('status', 'completed')
            .order('ended_at', { ascending: false })
        );

  const outdoorPromise =
    typeof limit === 'number'
      ? supabase
          .schema('run_walk')
          .from('outdoor_sessions')
          .select(
            'id, started_at, ended_at, activity_type, status, duration_s, distance_m'
          )
          .eq('user_id', userId)
          .eq('status', 'completed')
          .order('ended_at', { ascending: false })
          .limit(limit)
      : fetchAllRows<OutdoorSessionRow>(() =>
          supabase
            .schema('run_walk')
            .from('outdoor_sessions')
            .select(
              'id, started_at, ended_at, activity_type, status, duration_s, distance_m'
            )
            .eq('user_id', userId)
            .eq('status', 'completed')
            .order('ended_at', { ascending: false })
        );

  const [indoorRes, outdoorRes] = await Promise.all<any>([
    indoorPromise,
    outdoorPromise,
  ]);

  const indoorRows = Array.isArray(indoorRes)
    ? indoorRes
    : ((indoorRes.data ?? []) as IndoorSessionRow[]);
  const outdoorRows = Array.isArray(outdoorRes)
    ? outdoorRes
    : ((outdoorRes.data ?? []) as OutdoorSessionRow[]);

  if (!Array.isArray(indoorRes) && indoorRes.error) throw indoorRes.error;
  if (!Array.isArray(outdoorRes) && outdoorRes.error) throw outdoorRes.error;

  const indoorItems: CardioSessionItem[] = indoorRows
    .filter((row) => isRunWalkActivity(row.exercise_type))
    .map((row) => ({
      id: row.id,
      source: 'indoor',
      startedAt: row.started_at,
      endedAt: row.ended_at,
      activityType: row.exercise_type,
      durationS: row.total_time_s == null ? null : Number(row.total_time_s),
      distanceM:
        row.total_distance_m == null ? null : Number(row.total_distance_m),
    }));

  const outdoorItems: CardioSessionItem[] = outdoorRows
    .filter((row) => isRunWalkActivity(row.activity_type))
    .map((row) => ({
      id: row.id,
      source: 'outdoor',
      startedAt: row.started_at,
      endedAt: row.ended_at,
      activityType: row.activity_type,
      durationS: row.duration_s == null ? null : Number(row.duration_s),
      distanceM: row.distance_m == null ? null : Number(row.distance_m),
    }));

  const merged = dedupeById([...indoorItems, ...outdoorItems]).sort(
    (a, b) => getCardioSessionTimestamp(b) - getCardioSessionTimestamp(a)
  );

  return typeof limit === 'number' ? merged.slice(0, limit) : merged;
}

export async function fetchNutritionDays(userId: string, limit?: number) {
  if (typeof limit === 'number') {
    const { data, error } = await supabase
      .schema('nutrition')
      .from('diary_days')
      .select(
        'id, date, kcal_total, protein_g_total, carbs_g_total, fat_g_total, goal_hit, updated_at'
      )
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return dedupeById(
      ((data ?? []) as NutritionDayRow[]).map((row) => ({
        id: row.id,
        date: row.date,
        kcalTotal: Number(row.kcal_total ?? 0),
        proteinGTotal: Number(row.protein_g_total ?? 0),
        carbsGTotal: Number(row.carbs_g_total ?? 0),
        fatGTotal: Number(row.fat_g_total ?? 0),
        goalHit: Boolean(row.goal_hit),
        updatedAt: row.updated_at,
      }))
    );
  }

  const rows = await fetchAllRows<NutritionDayRow>(() =>
    supabase
      .schema('nutrition')
      .from('diary_days')
      .select(
        'id, date, kcal_total, protein_g_total, carbs_g_total, fat_g_total, goal_hit, updated_at'
      )
      .eq('user_id', userId)
      .order('date', { ascending: false })
  );

  return dedupeById(rows)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .map((row) => ({
    id: row.id,
    date: row.date,
    kcalTotal: Number(row.kcal_total ?? 0),
    proteinGTotal: Number(row.protein_g_total ?? 0),
    carbsGTotal: Number(row.carbs_g_total ?? 0),
    fatGTotal: Number(row.fat_g_total ?? 0),
    goalHit: Boolean(row.goal_hit),
      updatedAt: row.updated_at,
    }));
}
