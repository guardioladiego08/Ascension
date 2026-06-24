import React from 'react';
import { View } from 'react-native';

import { HomeActionTile } from '@/app/(tabs)/home/HomeActionTile';
import { HomeCompletionCard } from '@/app/(tabs)/home/HomeCompletionCard';
import { HomeGoalLanesCard } from '@/app/(tabs)/home/HomeGoalLanesCard';
import { HomeNutritionCard } from '@/app/(tabs)/home/HomeNutritionCard';
import RunWalkTypeModal from '@/app/(tabs)/home/RunWalkTypeModal';
import StrengthStartModal from '@/app/(tabs)/home/StrengthStartModal';

import {
  findFirstNodeByText,
  homeStyles,
  pressByText,
  renderAsync,
  theme,
} from './testUtils';

jest.mock('@/providers/AppThemeProvider', () => {
  const { mockTheme } = require('./mockTheme');

  return {
    useAppTheme: jest.fn(() => mockTheme),
  };
});

describe('home components', () => {
  it('fires the home action tile callback', async () => {
    const onPress = jest.fn();
    const tree = await renderAsync(
      <HomeActionTile
        title="Strength workout"
        subtitle="Open the logger."
        icon={<View />}
        accentColor={theme.colors.highlight1}
        styles={homeStyles}
        onPress={onPress}
      />
    );

    pressByText(tree, 'Strength workout');

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders completion stats and handles presses', async () => {
    const onPress = jest.fn();
    const tree = await renderAsync(
      <HomeCompletionCard
        eyebrow="2 completed"
        title="Strength"
        accentColor={theme.colors.highlight1}
        iconName="barbell-outline"
        stats={[
          { label: 'Time', value: '45 min' },
          { label: 'Volume', value: '2,000 kg' },
        ]}
        footer="Open strength history"
        styles={homeStyles}
        onPress={onPress}
      />
    );

    expect(() => tree.root.findByProps({ children: 'Volume' })).not.toThrow();

    pressByText(tree, 'Open strength history');

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('shows goal lane statuses for closed, active, and off goals', async () => {
    const tree = await renderAsync(
      <HomeGoalLanesCard
        items={[
          {
            key: 'strength',
            label: 'Strength',
            color: theme.colors.highlight1,
            progress: 1,
            active: true,
            closed: true,
            summary: '60 min • 1,000 kg',
          },
          {
            key: 'cardio',
            label: 'Cardio',
            color: theme.colors.highlight2,
            progress: 0.6,
            active: true,
            closed: false,
            summary: '30 min • 3.1 mi',
          },
          {
            key: 'nutrition',
            label: 'Nutrition',
            color: theme.colors.highlight3,
            progress: 0,
            active: false,
            closed: false,
            summary: 'Targets set in nutrition goals',
          },
        ]}
        activeGoalCount={2}
        closedGoalCount={1}
        styles={homeStyles}
        fonts={theme.fonts}
      />
    );

    expect(() => tree.root.findByProps({ children: 'Closed' })).not.toThrow();
    expect(() => tree.root.findByProps({ children: '60%' })).not.toThrow();
    expect(() => tree.root.findByProps({ children: 'Off' })).not.toThrow();
  });

  it('renders the nutrition card and opens the daily summary action', async () => {
    const onOpenSummary = jest.fn();
    const tree = await renderAsync(
      <HomeNutritionCard
        todayLabel="Wednesday, Apr 2"
        caloriesActual={1800}
        caloriesGoal={2200}
        macroRows={[
          { key: 'protein', label: 'Protein', actual: 160, goal: 180, color: theme.colors.highlight1 },
          { key: 'carbs', label: 'Carbs', actual: 210, goal: 250, color: theme.colors.highlight2 },
          { key: 'fat', label: 'Fat', actual: 60, goal: 70, color: theme.colors.highlight3 },
        ]}
        accentColor={theme.colors.highlight1}
        actionIconColor={theme.colors.blkText}
        styles={homeStyles}
        onOpenSummary={onOpenSummary}
      />
    );

    expect(() => findFirstNodeByText(tree.root, 'Nutrition for Wednesday, Apr 2')).not.toThrow();

    pressByText(tree, 'Daily summary');

    expect(onOpenSummary).toHaveBeenCalledTimes(1);
  });

  it('routes strength modal selections and close action through callbacks', async () => {
    const onSelect = jest.fn();
    const onClose = jest.fn();
    const tree = await renderAsync(
      <StrengthStartModal visible onClose={onClose} onSelect={onSelect} />
    );

    pressByText(tree, 'Start freestyle');
    pressByText(tree, 'Choose template');
    pressByText(tree, 'Close');

    expect(onSelect).toHaveBeenNthCalledWith(1, 'freestyle');
    expect(onSelect).toHaveBeenNthCalledWith(2, 'template');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('routes cardio modal selections through callbacks', async () => {
    const onSelect = jest.fn();
    const onClose = jest.fn();
    const tree = await renderAsync(
      <RunWalkTypeModal visible onClose={onClose} onSelect={onSelect} />
    );

    pressByText(tree, 'Outdoor Run');
    pressByText(tree, 'Indoor Walk');
    pressByText(tree, 'Outdoor Cycling');
    pressByText(tree, 'Indoor Cycling');
    pressByText(tree, 'Close');

    expect(onSelect).toHaveBeenNthCalledWith(1, 'outdoor_run');
    expect(onSelect).toHaveBeenNthCalledWith(2, 'indoor_walk');
    expect(onSelect).toHaveBeenNthCalledWith(3, 'outdoor_cycle');
    expect(onSelect).toHaveBeenNthCalledWith(4, 'indoor_cycle');
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
