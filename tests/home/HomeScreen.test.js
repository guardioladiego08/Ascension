import React from 'react';
import { Alert } from 'react-native';

import HomeScreen from '@/app/(tabs)/home';
import {
  flushPromises,
  pressByText,
  pressByTextAsync,
  renderAsync,
} from './testUtils';

const mockPush = jest.fn();
const mockUseHomeDashboard = jest.fn();
const mockGetActiveRunWalkLock = jest.fn();
const mockComputeRings = jest.fn();
const mockCaloriesEnabled = jest.fn();
const mockAlert = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({
    push: mockPush,
  })),
}));

jest.mock('@/providers/AppThemeProvider', () => {
  const { mockTheme } = require('./mockTheme');

  return {
    useAppTheme: jest.fn(() => mockTheme),
  };
});

jest.mock('@/providers/ActiveRunWalkProvider', () => ({
  useActiveRunWalk: jest.fn(() => ({
    activeSession: null,
    hydrated: true,
  })),
}));

jest.mock('@/contexts/UnitsContext', () => ({
  useUnits: jest.fn(() => ({
    distanceUnit: 'mi',
    weightUnit: 'lb',
  })),
}));

jest.mock('@/components/my components/logoHeader', () => {
  const React = require('react');
  const { Text } = require('react-native');

  return {
    __esModule: true,
    default: () => React.createElement(Text, null, 'Logo Header'),
  };
});

jest.mock('@/lib/runWalkSessionLock', () => ({
  getActiveRunWalkLock: (...args) => mockGetActiveRunWalkLock(...args),
}));

jest.mock('@/lib/goals/client', () => ({
  toLocalISODate: jest.fn(() => '2025-04-02'),
}));

jest.mock('@/lib/goals/goalLogic', () => ({
  caloriesEnabled: (...args) => mockCaloriesEnabled(...args),
  computeRings: (...args) => mockComputeRings(...args),
}));

jest.mock('@/app/(tabs)/home/useHomeDashboard', () => ({
  useHomeDashboard: (...args) => mockUseHomeDashboard(...args),
}));

const baseDashboardState = {
  loading: false,
  profile: {
    user_id: 'user-1',
    username: 'marco',
    first_name: 'Marco',
    last_name: 'Stone',
    is_private: false,
    city: 'Austin',
    state: 'TX',
    country: 'USA',
  },
  todaySummary: {
    kcal_total: 1840,
    kcal_target: 2200,
    protein_g_total: 150,
    protein_g_target: 180,
    carbs_g_total: 210,
    carbs_g_target: 240,
    fat_g_total: 55,
    fat_g_target: 70,
  },
  goalSnapshot: {
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
  goalResult: {
    date: '2025-04-02',
  },
  strengthSummary: {
    count: 1,
    durationMin: 45,
    volumeKg: 1250,
  },
  cardioSummary: {
    count: 2,
    durationMin: 50,
    distanceM: 5800,
    runCount: 1,
    walkCount: 1,
  },
};

describe('HomeScreen', () => {
  let alertSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(mockAlert);

    mockUseHomeDashboard.mockReturnValue(baseDashboardState);
    mockComputeRings.mockReturnValue({
      strength: { active: true, closed: false },
      cardio: { active: true, closed: true },
      nutrition: { active: true, closed: false },
      allClosed: false,
    });
    mockCaloriesEnabled.mockImplementation(
      (mode) => mode != null && String(mode).toLowerCase() !== 'disabled'
    );
    mockGetActiveRunWalkLock.mockResolvedValue(null);
  });

  afterEach(() => {
    alertSpy.mockRestore();
  });

  it('renders the home screen sections and routes primary buttons', async () => {
    const tree = await renderAsync(<HomeScreen />);

    expect(() => tree.root.findByProps({ children: 'Quick Actions' })).not.toThrow();
    expect(() => tree.root.findByProps({ children: 'Completed sessions' })).not.toThrow();
    expect(() => tree.root.findByProps({ children: 'Calories and macros' })).not.toThrow();

    pressByText(tree, 'Goals');
    pressByText(tree, 'Nutrition log');
    pressByText(tree, 'Daily summary');
    pressByText(tree, 'Open strength history');
    pressByText(tree, 'Open cardio history');

    expect(mockPush).toHaveBeenCalledWith('/profile/settings/goals');
    expect(mockPush).toHaveBeenCalledWith('/add/Nutrition/logMeal');
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/progress/nutrition/dailyNutritionSummary',
      params: { date: '2025-04-02' },
    });
    expect(mockPush).toHaveBeenCalledWith('/progress/strength/allStrengthWorkouts');
    expect(mockPush).toHaveBeenCalledWith('/progress/cardio/allSessions');
  });

  it('opens the strength modal and routes the template path', async () => {
    const tree = await renderAsync(<HomeScreen />);

    pressByText(tree, 'Strength workout');
    pressByText(tree, 'Choose template');

    expect(mockPush).toHaveBeenCalledWith('/add/Strength/templates');
  });

  it('opens the strength modal and routes the freestyle path', async () => {
    const tree = await renderAsync(<HomeScreen />);

    pressByText(tree, 'Strength workout');
    pressByText(tree, 'Start freestyle');

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/add/Strength/StrengthTrain',
      params: { sessionMode: 'freestyle' },
    });
  });

  it('opens the indoor and outdoor modal and routes an indoor session', async () => {
    const tree = await renderAsync(<HomeScreen />);

    pressByText(tree, 'Indoor / outdoor');
    await pressByTextAsync(tree, 'Indoor Run');

    expect(mockGetActiveRunWalkLock).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/add/Cardio/indoor/IndoorSession',
      params: { mode: 'indoor_run' },
    });
  });

  it('blocks run and walk routing when another session is already locked', async () => {
    mockGetActiveRunWalkLock.mockResolvedValue({
      mode: 'outdoor_walk',
    });

    const tree = await renderAsync(<HomeScreen />);

    pressByText(tree, 'Indoor / outdoor');
    await pressByTextAsync(tree, 'Outdoor Walk');
    await flushPromises();

    expect(mockAlert).toHaveBeenCalledWith(
      'Session in progress',
      'You already have a outdoor walk session in progress. Finish or cancel it first.'
    );
    expect(mockPush).not.toHaveBeenCalledWith({
      pathname: '/add/Cardio/outdoor/OutdoorSession',
      params: {
        title: 'Walking Session',
        activityType: 'walk',
      },
    });
  });
});
