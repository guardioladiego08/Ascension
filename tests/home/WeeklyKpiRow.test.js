import React from 'react';

import WeeklyKpiRow from '@/app/(tabs)/home/WeeklyKpiRow';
import { findFirstNodeByText, flushPromises, renderAsync } from './testUtils';

const mockGetUser = jest.fn();
const mockSchema = jest.fn();

jest.mock('@/providers/AppThemeProvider', () => {
  const { mockTheme } = require('./mockTheme');

  return {
    useAppTheme: jest.fn(() => mockTheme),
  };
});

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: (...args) => mockGetUser(...args),
    },
    schema: (...args) => mockSchema(...args),
  },
}));

function createWeeklyQuery(result) {
  const query = {
    select: jest.fn(() => query),
    eq: jest.fn(() => query),
    maybeSingle: jest.fn(() => Promise.resolve(result)),
  };

  return query;
}

describe('WeeklyKpiRow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-04-03T12:00:00'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders the weekly summary from the current schema', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });

    const rpcMock = jest.fn().mockResolvedValue({ error: null });
    mockSchema.mockImplementation(() => ({
      rpc: rpcMock,
      from: () =>
        createWeeklyQuery({
          data: {
            week_start: '2025-03-31',
            workouts_count: 4,
            total_hours: 4.25,
            total_kcal_consumed: 1530,
            total_distance_ran_m: 3800,
            total_distance_walked_m: 2600,
            total_distance_run_walk_m: 6400,
            total_elev_gain_m: 210,
          },
          error: null,
        }),
    }));

    const tree = await renderAsync(<WeeklyKpiRow />);

    await flushPromises();
    await flushPromises();

    expect(rpcMock).toHaveBeenCalled();
    expect(() => findFirstNodeByText(tree.root, 'Week of 2025-03-31')).not.toThrow();
    expect(() => findFirstNodeByText(tree.root, '4.3')).not.toThrow();
    expect(() => findFirstNodeByText(tree.root, '1.5k')).not.toThrow();
    expect(() => findFirstNodeByText(tree.root, '6,400 m')).not.toThrow();
    expect(() => findFirstNodeByText(tree.root, '210 m')).not.toThrow();
  });

  it('falls back to legacy distance columns when newer columns are unavailable', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });

    const rpcMock = jest.fn().mockResolvedValue({ error: null });
    const results = [
      {
        data: null,
        error: { code: '42703' },
      },
      {
        data: null,
        error: { code: '42703' },
      },
      {
        data: {
          week_start: '2025-03-31',
          workouts_count: 2,
          total_hours: 1.5,
          total_kcal_consumed: 800,
          total_miles_ran: 1.5,
          total_elev_gain_m: 100,
        },
        error: null,
      },
    ];

    mockSchema.mockImplementation(() => ({
      rpc: rpcMock,
      from: () => createWeeklyQuery(results.shift()),
    }));

    const tree = await renderAsync(<WeeklyKpiRow />);

    await flushPromises();
    await flushPromises();

    expect(() => findFirstNodeByText(tree.root, 'Week of 2025-03-31')).not.toThrow();
    expect(() => findFirstNodeByText(tree.root, '2,414 m')).not.toThrow();
    expect(() => findFirstNodeByText(tree.root, '100 m')).not.toThrow();
  });
});
