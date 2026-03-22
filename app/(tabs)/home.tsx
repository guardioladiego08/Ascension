import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { useAppTheme } from '@/providers/AppThemeProvider';
import { useUnits } from '@/contexts/UnitsContext';
import LogoHeader from '@/components/my components/logoHeader';
import { getActiveRunWalkLock } from '@/lib/runWalkSessionLock';
import { toLocalISODate } from '@/lib/goals/client';
import { caloriesEnabled, computeRings } from '@/lib/goals/goalLogic';
import { NUTRITION_ROUTES } from '@/lib/nutrition/navigation';

import RunWalkTypeModal, { RunWalkExerciseType } from './home/RunWalkTypeModal';
import { HomeActionTile } from './home/HomeActionTile';
import { HomeCompletionCard } from './home/HomeCompletionCard';
import { HomeGoalLanesCard } from './home/HomeGoalLanesCard';
import { HomeNutritionCard } from './home/HomeNutritionCard';
import { HomeSectionHeader } from './home/HomeSectionHeader';
import { createHomeStyles } from './home/styles';
import { type HomeGoalLaneItem } from './home/types';
import { useHomeDashboard } from './home/useHomeDashboard';
import {
  cardioTargetMeters,
  clamp01,
  combineProgress,
  formatDistanceValue,
  formatMinutes,
  formatWeightValue,
  friendlyDateLabel,
  getDaySegment,
  strengthTargetKg,
  toProgress,
} from './home/utils';

export default function HomeScreen() {
  const router = useRouter();
  const { colors, fonts } = useAppTheme();
  const { distanceUnit, weightUnit } = useUnits();
  const styles = useMemo(() => createHomeStyles(colors, fonts), [colors, fonts]);
  const [showRunWalkModal, setShowRunWalkModal] = useState(false);

  const {
    loading,
    profile,
    todaySummary,
    goalSnapshot,
    goalResult,
    strengthSummary,
    cardioSummary,
  } = useHomeDashboard();

  const todayIso = toLocalISODate();
  const todayLabel = friendlyDateLabel(todayIso);
  const ringState = useMemo(
    () => (goalResult ? computeRings(goalResult) : null),
    [goalResult]
  );

  const displayName = useMemo(() => {
    const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim();
    if (name) return name;
    if (profile?.username) return `@${profile.username}`;
    return 'Athlete';
  }, [profile]);

  const firstName = useMemo(() => {
    if (profile?.first_name) return profile.first_name;
    if (profile?.username) return profile.username;
    return 'athlete';
  }, [profile]);

  const locationText = useMemo(() => {
    const location = [profile?.city, profile?.state, profile?.country].filter(Boolean).join(', ');
    return location || null;
  }, [profile]);

  const strengthProgress = useMemo(() => {
    const progressValues = [
      goalSnapshot?.strength_use_time
        ? toProgress(strengthSummary.durationMin, goalSnapshot.strength_time_min)
        : null,
      goalSnapshot?.strength_use_volume
        ? toProgress(strengthSummary.volumeKg, strengthTargetKg(goalSnapshot))
        : null,
    ];

    return combineProgress(progressValues, goalSnapshot?.strength_condition_mode);
  }, [goalSnapshot, strengthSummary.durationMin, strengthSummary.volumeKg]);

  const cardioProgress = useMemo(() => {
    const progressValues = [
      goalSnapshot?.cardio_use_time
        ? toProgress(cardioSummary.durationMin, goalSnapshot.cardio_time_min)
        : null,
      goalSnapshot?.cardio_use_distance
        ? toProgress(cardioSummary.distanceM, cardioTargetMeters(goalSnapshot))
        : null,
    ];

    return combineProgress(progressValues, goalSnapshot?.cardio_condition_mode);
  }, [cardioSummary.distanceM, cardioSummary.durationMin, goalSnapshot]);

  const caloriesActual = todaySummary?.kcal_total != null ? Number(todaySummary.kcal_total) : 0;
  const caloriesGoal = useMemo(() => {
    if (todaySummary?.kcal_target != null) return Number(todaySummary.kcal_target);
    if (caloriesEnabled(goalSnapshot?.calorie_goal_mode)) {
      return Number(goalSnapshot?.calorie_target_kcal ?? 0);
    }
    return 0;
  }, [goalSnapshot?.calorie_goal_mode, goalSnapshot?.calorie_target_kcal, todaySummary?.kcal_target]);

  const proteinActual = todaySummary?.protein_g_total != null ? Number(todaySummary.protein_g_total) : 0;
  const carbsActual = todaySummary?.carbs_g_total != null ? Number(todaySummary.carbs_g_total) : 0;
  const fatsActual = todaySummary?.fat_g_total != null ? Number(todaySummary.fat_g_total) : 0;

  const macroTargets = useMemo(
    () => ({
      protein:
        todaySummary?.protein_g_target != null
          ? Number(todaySummary.protein_g_target)
          : Number(goalSnapshot?.protein_target_g ?? 0),
      carbs:
        todaySummary?.carbs_g_target != null
          ? Number(todaySummary.carbs_g_target)
          : Number(goalSnapshot?.carbs_target_g ?? 0),
      fats:
        todaySummary?.fat_g_target != null
          ? Number(todaySummary.fat_g_target)
          : Number(goalSnapshot?.fats_target_g ?? 0),
    }),
    [
      goalSnapshot?.carbs_target_g,
      goalSnapshot?.fats_target_g,
      goalSnapshot?.protein_target_g,
      todaySummary?.carbs_g_target,
      todaySummary?.fat_g_target,
      todaySummary?.protein_g_target,
    ]
  );

  const nutritionProgress = useMemo(() => {
    const progressValues = [
      goalSnapshot?.protein_enabled ? toProgress(proteinActual, macroTargets.protein) : null,
      goalSnapshot?.carbs_enabled ? toProgress(carbsActual, macroTargets.carbs) : null,
      goalSnapshot?.fats_enabled ? toProgress(fatsActual, macroTargets.fats) : null,
      caloriesEnabled(goalSnapshot?.calorie_goal_mode)
        ? toProgress(caloriesActual, goalSnapshot?.calorie_target_kcal)
        : null,
    ];

    return combineProgress(progressValues, goalSnapshot?.nutrition_condition_mode);
  }, [
    caloriesActual,
    carbsActual,
    fatsActual,
    goalSnapshot,
    macroTargets.carbs,
    macroTargets.fats,
    macroTargets.protein,
    proteinActual,
  ]);

  const goalLaneItems = useMemo<HomeGoalLaneItem[]>(
    () => [
      {
        key: 'strength',
        label: 'Strength',
        color: colors.highlight1,
        progress: ringState?.strength.closed ? 1 : strengthProgress,
        active: !!(goalSnapshot?.strength_use_time || goalSnapshot?.strength_use_volume),
        closed: ringState?.strength.closed ?? false,
        summary: `${formatMinutes(strengthSummary.durationMin)} • ${formatWeightValue(
          strengthSummary.volumeKg,
          weightUnit
        )}`,
      },
      {
        key: 'cardio',
        label: 'Cardio',
        color: colors.highlight2,
        progress: ringState?.cardio.closed ? 1 : cardioProgress,
        active: !!(goalSnapshot?.cardio_use_time || goalSnapshot?.cardio_use_distance),
        closed: ringState?.cardio.closed ?? false,
        summary: `${formatMinutes(cardioSummary.durationMin)} • ${formatDistanceValue(
          cardioSummary.distanceM,
          distanceUnit
        )}`,
      },
      {
        key: 'nutrition',
        label: 'Nutrition',
        color: colors.highlight3,
        progress: ringState?.nutrition.closed ? 1 : nutritionProgress,
        active:
          !!(
            goalSnapshot?.protein_enabled ||
            goalSnapshot?.carbs_enabled ||
            goalSnapshot?.fats_enabled ||
            caloriesEnabled(goalSnapshot?.calorie_goal_mode)
          ),
        closed: ringState?.nutrition.closed ?? false,
        summary: caloriesGoal > 0 ? `${Math.round(caloriesActual)} / ${Math.round(caloriesGoal)} kcal` : 'Targets set in nutrition goals',
      },
    ],
    [
      caloriesActual,
      caloriesGoal,
      cardioProgress,
      cardioSummary.distanceM,
      cardioSummary.durationMin,
      colors.highlight1,
      colors.highlight2,
      colors.highlight3,
      distanceUnit,
      goalSnapshot?.calorie_goal_mode,
      goalSnapshot?.cardio_use_distance,
      goalSnapshot?.cardio_use_time,
      goalSnapshot?.carbs_enabled,
      goalSnapshot?.fats_enabled,
      goalSnapshot?.protein_enabled,
      nutritionProgress,
      ringState?.cardio.closed,
      ringState?.nutrition.closed,
      ringState?.strength.closed,
      strengthProgress,
      strengthSummary.durationMin,
      strengthSummary.volumeKg,
      weightUnit,
    ]
  );

  const activeGoalCount = goalLaneItems.filter((item) => item.active).length;
  const closedGoalCount = goalLaneItems.filter((item) => item.active && item.closed).length;
  const completedSessionCount = strengthSummary.count + cardioSummary.count;

  const heroSummary = useMemo(() => {
    if (loading) return 'Loading today’s dashboard.';
    if (!activeGoalCount) {
      return 'Set goals in Settings to activate your daily progress rings.';
    }
    if (closedGoalCount === activeGoalCount) {
      return 'All active rings are closed for today.';
    }
    if (completedSessionCount > 0) {
      return `${completedSessionCount} completed session${
        completedSessionCount === 1 ? '' : 's'
      } today with ${closedGoalCount} of ${activeGoalCount} rings closed.`;
    }
    return `${closedGoalCount} of ${activeGoalCount} rings closed so far today.`;
  }, [activeGoalCount, closedGoalCount, completedSessionCount, loading]);

  const calorieStatus = useMemo(() => {
    if (loading) return 'Syncing today’s nutrition.';
    if (!caloriesGoal) return 'Add a calorie goal in Settings to unlock the calorie dial.';

    const delta = caloriesGoal - caloriesActual;
    if (delta > 0) return `${Math.round(delta).toLocaleString()} kcal remaining to hit your goal.`;
    if (delta < 0) return `${Math.round(Math.abs(delta)).toLocaleString()} kcal over goal.`;
    return 'Calorie goal matched exactly.';
  }, [caloriesActual, caloriesGoal, loading]);

  const macroRows = useMemo(
    () => [
      {
        key: 'protein',
        label: 'Protein',
        actual: proteinActual,
        goal: macroTargets.protein,
        color: colors.highlight1,
      },
      {
        key: 'carbs',
        label: 'Carbs',
        actual: carbsActual,
        goal: macroTargets.carbs,
        color: colors.highlight2,
      },
      {
        key: 'fat',
        label: 'Fat',
        actual: fatsActual,
        goal: macroTargets.fats,
        color: colors.highlight3,
      },
    ],
    [
      carbsActual,
      colors.highlight1,
      colors.highlight2,
      colors.highlight3,
      fatsActual,
      macroTargets.carbs,
      macroTargets.fats,
      macroTargets.protein,
      proteinActual,
    ]
  );

  const cardioLabel = useMemo(() => {
    if (cardioSummary.runCount && cardioSummary.walkCount) return 'Run + walk';
    if (cardioSummary.runCount) return 'Run';
    if (cardioSummary.walkCount) return 'Walk';
    return 'Run / Walk';
  }, [cardioSummary.runCount, cardioSummary.walkCount]);

  const handleOpenNutritionSummary = () => {
    router.push({
      pathname: '/progress/nutrition/dailyNutritionSummary',
      params: { date: todayIso },
    });
  };

  return (
    <View style={styles.page}>
      <ScrollView
        contentContainerStyle={[styles.container, styles.content]}
        showsVerticalScrollIndicator={false}
      >
        <LogoHeader />

        <View style={[styles.panel, styles.heroCard]}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroCopy}>
              <Text style={styles.eyebrow}>{todayLabel}</Text>
              <Text style={styles.heroHeading}>
                Good {getDaySegment()}, {loading ? 'loading...' : firstName}
              </Text>
              <Text style={styles.heroSubheading}>
                {locationText ? `${locationText} • ${heroSummary}` : heroSummary}
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.92}
              style={styles.goalSettingsButton}
              onPress={() => router.push('/profile/settings/goals')}
            >
              <Ionicons
                name={profile?.is_private ? 'lock-closed-outline' : 'options-outline'}
                size={18}
                color={colors.text}
              />
              <Text style={styles.goalSettingsText}>Goals</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.heroBody}>
            <HomeGoalLanesCard
              items={goalLaneItems}
              activeGoalCount={activeGoalCount}
              closedGoalCount={closedGoalCount}
              styles={styles}
              fonts={fonts}
            />

            <View style={styles.heroSide}>
              <View style={[styles.panelSoft, styles.heroMetricCard]}>
                <Text style={styles.heroMetricLabel}>Completed today</Text>
                <Text style={styles.heroMetricValue}>{completedSessionCount}</Text>
                <Text style={styles.heroMetricHint}>
                  {strengthSummary.count} strength • {cardioSummary.count} cardio
                </Text>
              </View>

              <View style={[styles.panelSoft, styles.heroMetricCard]}>
                <Text style={styles.heroMetricLabel}>Nutrition pace</Text>
                <Text style={styles.heroMetricValue}>
                  {caloriesGoal ? `${Math.round(clamp01(caloriesActual / caloriesGoal) * 100)}%` : '--'}
                </Text>
                <Text style={styles.heroMetricHint}>{calorieStatus}</Text>
              </View>

              <View style={styles.heroFooterRow}>
                <View style={[styles.chip, styles.heroChip]}>
                  <Ionicons name="person-outline" size={14} color={colors.highlight1} />
                  <Text style={[styles.chipText, styles.heroChipText]}>{displayName}</Text>
                </View>

                <View style={[styles.chip, styles.heroChip]}>
                  <Ionicons
                    name={ringState?.allClosed ? 'sparkles-outline' : 'flash-outline'}
                    size={14}
                    color={colors.highlight3}
                  />
                  <Text style={[styles.chipText, styles.heroChipText]}>
                    {activeGoalCount ? `${closedGoalCount}/${activeGoalCount} closed` : 'Rings idle'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        <HomeSectionHeader
          eyebrow="Quick Actions"
          title="Start from the home tab"
          subtitle="Strength, cardio, and nutrition logging are all one tap away."
          styles={styles}
        />

        <View style={styles.actionGrid}>
          <HomeActionTile
            title="Strength workout"
            subtitle="Open your lifting session and start logging sets."
            icon={<MaterialCommunityIcons name="dumbbell" size={22} color={colors.highlight1} />}
            accentColor={colors.accentSoft}
            styles={styles}
            onPress={() => router.push('/add/Strength/StrengthTrain')}
          />

          <HomeActionTile
            title="Indoor / outdoor"
            subtitle="Choose a run or walk session without leaving home."
            icon={<Ionicons name="walk-outline" size={22} color={colors.highlight2} />}
            accentColor={colors.accentSecondarySoft}
            styles={styles}
            onPress={() => setShowRunWalkModal(true)}
          />

          <HomeActionTile
            title="Nutrition log"
            subtitle="Log meals and keep your calorie and macro targets current."
            icon={<Ionicons name="restaurant-outline" size={22} color={colors.highlight3} />}
            accentColor={colors.accentTertiarySoft}
            styles={styles}
            onPress={() => router.push(NUTRITION_ROUTES.logHub)}
          />
        </View>

        {(strengthSummary.count > 0 || cardioSummary.count > 0) && (
          <>
            <HomeSectionHeader
              eyebrow="Today"
              title="Completed sessions"
              subtitle="Each card appears only after you’ve finished that session type for the day."
              styles={styles}
            />

            <View style={styles.statsGrid}>
              {strengthSummary.count > 0 && (
                <HomeCompletionCard
                  eyebrow={`${strengthSummary.count} completed`}
                  title="Strength"
                  accentColor={colors.highlight1}
                  iconName="barbell-outline"
                  stats={[
                    { label: 'Time', value: formatMinutes(strengthSummary.durationMin) },
                    {
                      label: 'Volume',
                      value: formatWeightValue(strengthSummary.volumeKg, weightUnit),
                    },
                  ]}
                  footer="Open strength history"
                  onPress={() => router.push('/progress/strength/allStrengthWorkouts')}
                  styles={styles}
                />
              )}

              {cardioSummary.count > 0 && (
                <HomeCompletionCard
                  eyebrow={`${cardioSummary.count} completed`}
                  title={cardioLabel}
                  accentColor={colors.highlight2}
                  iconName="walk-outline"
                  stats={[
                    {
                      label: 'Distance',
                      value: formatDistanceValue(cardioSummary.distanceM, distanceUnit),
                    },
                    { label: 'Time', value: formatMinutes(cardioSummary.durationMin) },
                  ]}
                  footer="Open cardio history"
                  onPress={() => router.push('/progress/cardio/allSessions')}
                  styles={styles}
                />
              )}
            </View>
          </>
        )}

        <HomeSectionHeader
          eyebrow="Nutrition"
          title="Calories and macros"
          subtitle="Daily calorie pace on the left, actual-vs-goal macro bars on the right."
          styles={styles}
        />

        <HomeNutritionCard
          todayLabel={todayLabel}
          caloriesActual={caloriesActual}
          caloriesGoal={caloriesGoal}
          macroRows={macroRows}
          accentColor={colors.highlight1}
          actionIconColor={colors.blkText}
          styles={styles}
          onOpenSummary={handleOpenNutritionSummary}
        />
      </ScrollView>

      <RunWalkTypeModal
        visible={showRunWalkModal}
        onClose={() => setShowRunWalkModal(false)}
        onSelect={async (type: RunWalkExerciseType) => {
          setShowRunWalkModal(false);

          const active = await getActiveRunWalkLock();
          if (active) {
            Alert.alert(
              'Session in progress',
              `You already have a ${active.mode.replace('_', ' ')} session in progress. Finish or cancel it first.`
            );
            return;
          }

          if (type === 'indoor_run' || type === 'indoor_walk') {
            router.push({
              pathname: '/add/Cardio/indoor/IndoorSession',
              params: { mode: type },
            });
            return;
          }

          if (type === 'outdoor_run' || type === 'outdoor_walk') {
            router.push({
              pathname: '/add/Cardio/outdoor/OutdoorSession',
              params: {
                title: type === 'outdoor_walk' ? 'Walking Session' : 'Running Session',
                activityType: type === 'outdoor_walk' ? 'walk' : 'run',
              },
            });
          }
        }}
      />
    </View>
  );
}
