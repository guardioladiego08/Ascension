import React from 'react';
import { Text } from 'react-native';

import { useHomeDashboard } from '@/app/(tabs)/home/useHomeDashboard';
import { flushPromises, renderAsync } from './testUtils';

const mockGetUser = jest.fn();
const mockSchema = jest.fn();
const mockSyncAndFetchMyDailyGoalResult = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: (...args) => mockGetUser(...args),
    },
    schema: (...args) => mockSchema(...args),
  },
}));

jest.mock('@/lib/goals/client', () => ({
  syncAndFetchMyDailyGoalResult: (...args) => mockSyncAndFetchMyDailyGoalResult(...args),
  toLocalISODate: jest.fn(() => '2025-04-02'),
}));

function createQuery(result) {
  const query = {
    select: jest.fn(() => query),
    eq: jest.fn(() => query),
    order: jest.fn(() => query),
    limit: jest.fn(() => query),
    gte: jest.fn(() => query),
    lte: jest.fn(() => query),
    maybeSingle: jest.fn(() => Promise.resolve(result)),
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
    catch: (reject) => Promise.resolve(result).catch(reject),
    finally: (callback) => Promise.resolve(result).finally(callback),
  };

  return query;
}

function DashboardProbe() {
  const state = useHomeDashboard();
  return <Text testID="payload">{JSON.stringify(state)}</Text>;
}

describe('useHomeDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads and aggregates profile, nutrition, strength, and cardio data', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });
    mockSyncAndFetchMyDailyGoalResult.mockResolvedValue({
      date: '2025-04-02',
      strength_met: false,
      cardio_met: true,
      nutrition_met: false,
    });

    const queries = {
      'user.users': createQuery({
        data: {
          user_id: 'user-1',
          username: 'marco',
          first_name: 'Marco',
          last_name: 'Stone',
          is_private: false,
          city: 'Austin',
          state: 'TX',
          country: 'USA',
        },
        error: null,
      }),
      'nutrition.diary_days': createQuery({
        data: {
          id: 'day-1',
          user_id: 'user-1',
          date: '2025-04-02',
          timezone_str: 'America/Chicago',
          kcal_target: 2200,
          protein_g_target: 180,
          carbs_g_target: 240,
          fat_g_target: 70,
          kcal_total: 1840,
          protein_g_total: 150,
          carbs_g_total: 210,
          fat_g_total: 55,
          goal_hit: false,
        },
        error: null,
      }),
      'user.user_goal_snapshots': createQuery({
        data: {
          strength_condition_mode: 'and',
          strength_use_time: true,
          strength_time_min: 45,
          strength_use_volume: true,
          strength_volume_min: 1000,
          strength_volume_unit: 'kg',
          cardio_condition_mode: 'or',
          cardio_use_time: true,
          cardio_time_min: 30,
          cardio_use_distance: true,
          cardio_distance: 5,
          cardio_distance_unit: 'km',
          nutrition_condition_mode: 'and',
          protein_enabled: true,
          protein_target_g: 180,
          carbs_enabled: true,
          carbs_target_g: 240,
          fats_enabled: true,
          fats_target_g: 70,
          calorie_goal_mode: 'target',
          calorie_target_kcal: 2200,
        },
        error: null,
      }),
      'strength.strength_workouts': createQuery({
        data: [
          {
            started_at: '2025-04-02T08:00:00.000Z',
            ended_at: '2025-04-02T08:45:00.000Z',
            total_vol: 1250,
          },
          {
            started_at: '2025-04-02T10:00:00.000Z',
            ended_at: null,
            total_vol: 400,
          },
        ],
        error: null,
      }),
      'run_walk.sessions': createQuery({
        data: [
          {
            ended_at: '2025-04-02T12:00:00.000Z',
            exercise_type: 'indoor_run',
            total_time_s: 1200,
            total_distance_m: 3200,
          },
          {
            ended_at: '2025-04-02T12:45:00.000Z',
            exercise_type: 'indoor_cycle',
            total_time_s: 1800,
            total_distance_m: 10000,
          },
          {
            ended_at: '2025-04-02T13:00:00.000Z',
            exercise_type: 'elliptical',
            total_time_s: 2400,
            total_distance_m: 15000,
          },
        ],
        error: null,
      }),
      'run_walk.indoor_interval_sessions': createQuery({
        data: [],
        error: null,
      }),
      'run_walk.outdoor_sessions': createQuery({
        data: [
          {
            ended_at: '2025-04-02T14:00:00.000Z',
            activity_type: 'walk',
            duration_s: 1800,
            distance_m: 2600,
          },
        ],
        error: null,
      }),
    };

    mockSchema.mockImplementation((schemaName) => ({
      from: (tableName) => queries[`${schemaName}.${tableName}`],
    }));

    const tree = await renderAsync(<DashboardProbe />);

    await flushPromises();
    await flushPromises();

    const rawPayload = tree.root.findByProps({ testID: 'payload' }).props.children;
    const state = JSON.parse(Array.isArray(rawPayload) ? rawPayload.join('') : rawPayload);

    expect(mockSyncAndFetchMyDailyGoalResult).toHaveBeenCalledWith('2025-04-02');
    expect(state.loading).toBe(false);
    expect(state.profile.first_name).toBe('Marco');
    expect(state.todaySummary.kcal_total).toBe(1840);
    expect(state.strengthSummary).toEqual({
      count: 1,
      durationMin: 45,
      volumeKg: 1250,
    });
    expect(state.cardioSummary).toEqual({
      count: 3,
      durationMin: 80,
      distanceM: 15800,
      cycleCount: 1,
      runCount: 1,
      walkCount: 1,
    });
  });

  it('returns the empty state when there is no authenticated user', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });
    mockSchema.mockImplementation(() => ({
      from: jest.fn(),
    }));

    const tree = await renderAsync(<DashboardProbe />);

    await flushPromises();

    const rawPayload = tree.root.findByProps({ testID: 'payload' }).props.children;
    const state = JSON.parse(Array.isArray(rawPayload) ? rawPayload.join('') : rawPayload);

    expect(mockSchema).not.toHaveBeenCalled();
    expect(state.loading).toBe(false);
    expect(state.profile).toBeNull();
    expect(state.strengthSummary.count).toBe(0);
    expect(state.cardioSummary.count).toBe(0);
  });
});
