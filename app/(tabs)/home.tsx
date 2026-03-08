import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

import { useAppTheme } from '@/providers/AppThemeProvider';
import LogoHeader from '@/components/my components/logoHeader';
import { getActiveRunWalkLock } from '@/lib/runWalkSessionLock';
import { toLocalISODate } from '@/lib/goals/client';
import { supabase } from '@/lib/supabase';

import WeeklyKpiRow from './home/WeeklyKpiRow';
import RunWalkTypeModal, { RunWalkExerciseType } from './home/RunWalkTypeModal';

type DiaryDay = {
  id: string;
  user_id: string;
  date: string;
  timezone_str: string | null;
  kcal_target: number | null;
  protein_g_target: string | number | null;
  carbs_g_target: string | number | null;
  fat_g_target: string | number | null;
  water_ml_target: number | null;
  notes: string | null;
  kcal_total: number | null;
  protein_g_total: string | number | null;
  carbs_g_total: string | number | null;
  fat_g_total: string | number | null;
  fiber_g_total: string | number | null;
  sodium_mg_total: number | null;
  water_ml_total: number | null;
  updated_at: string;
  goal_hit: boolean;
};

type AppUserRow = {
  user_id: string;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  profile_image_url: string | null;
  is_private: boolean;
  bio: string | null;
  onboarding_completed: boolean;
  country: string | null;
  state: string | null;
  city: string | null;
};

const formatNumber = (value: number) =>
  Number.isFinite(value) ? Math.round(value).toLocaleString() : '0';

function getDaySegment() {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

export default function HomeScreen() {
  const router = useRouter();
  const {
    colors,
    fonts,
    globalStyles,
  } = useAppTheme();

  const styles = useMemo(
    () => createStyles(colors, fonts),
    [colors, fonts]
  );

  const [todaySummary, setTodaySummary] = useState<DiaryDay | null>(null);
  const [loadingDiary, setLoadingDiary] = useState(false);
  const [profile, setProfile] = useState<AppUserRow | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [showRunWalkModal, setShowRunWalkModal] = useState(false);

  const todayISO = useMemo(() => toLocalISODate(), []);

  useFocusEffect(
    useCallback(() => {
      const fetchTodayDiary = async () => {
        try {
          setLoadingDiary(true);

          const { data: userData, error: userError } = await supabase.auth.getUser();
          if (userError) {
            console.error('Error fetching auth user for diary_days:', userError);
            return;
          }

          const user = userData?.user;
          if (!user) return;

          const { data, error } = await supabase
            .schema('nutrition')
            .from('diary_days')
            .select('*')
            .eq('user_id', user.id)
            .eq('date', todayISO)
            .maybeSingle();

          if (error) {
            if ((error as any).code !== 'PGRST116') {
              console.error('Error fetching today diary_days row:', error);
            }
            setTodaySummary(null);
            return;
          }

          setTodaySummary((data as DiaryDay) ?? null);
        } catch (err) {
          console.error('Unexpected error loading today diary_days:', err);
        } finally {
          setLoadingDiary(false);
        }
      };

      fetchTodayDiary();
    }, [todayISO])
  );

  useFocusEffect(
    useCallback(() => {
      const fetchHomeProfile = async () => {
        try {
          setLoadingProfile(true);

          const { data: userData, error: userError } = await supabase.auth.getUser();
          if (userError) {
            console.error('Error fetching auth user for home profile:', userError);
            return;
          }

          const user = userData?.user;
          if (!user) return;

          const { data, error } = await supabase
            .schema('user')
            .from('users')
            .select(
              'user_id,username,first_name,last_name,profile_image_url,is_private,bio,onboarding_completed,country,state,city'
            )
            .eq('user_id', user.id)
            .maybeSingle();

          if (error) {
            if ((error as any).code !== 'PGRST116') {
              console.error('Error fetching home profile row from user.users:', error);
            }
            setProfile(null);
            return;
          }

          setProfile((data as AppUserRow) ?? null);
        } catch (err) {
          console.error('Unexpected error loading home profile:', err);
        } finally {
          setLoadingProfile(false);
        }
      };

      fetchHomeProfile();
    }, [])
  );

  const caloriesEaten = todaySummary?.kcal_total != null ? Number(todaySummary.kcal_total) : 0;
  const caloriesTarget = todaySummary?.kcal_target != null ? Number(todaySummary.kcal_target) : 0;
  const protein = todaySummary?.protein_g_total != null ? Number(todaySummary.protein_g_total) : 0;
  const carbs = todaySummary?.carbs_g_total != null ? Number(todaySummary.carbs_g_total) : 0;
  const fats = todaySummary?.fat_g_total != null ? Number(todaySummary.fat_g_total) : 0;

  const caloriePct = caloriesTarget > 0 ? Math.min(1, caloriesEaten / caloriesTarget) : 0;
  const caloriesRemaining = Math.max(caloriesTarget - caloriesEaten, 0);
  const totalMacros = protein + carbs + fats;

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

  const fuelStatus = useMemo(() => {
    if (loadingDiary) return 'Syncing nutrition data';
    if (!caloriesTarget) return 'Set a calorie target to track fueling pace.';
    if (caloriePct >= 1) return 'Target hit for today.';
    return `${formatNumber(caloriesRemaining)} kcal remaining to hit your goal.`;
  }, [caloriePct, caloriesRemaining, caloriesTarget, loadingDiary]);

  const macroRows = useMemo(
    () => [
      {
        label: 'Protein',
        value: protein,
        width:
          totalMacros > 0 && protein > 0 ? Math.max(14, (protein / totalMacros) * 100) : 0,
        color: colors.highlight1,
      },
      {
        label: 'Carbs',
        value: carbs,
        width: totalMacros > 0 && carbs > 0 ? Math.max(14, (carbs / totalMacros) * 100) : 0,
        color: colors.highlight2,
      },
      {
        label: 'Fat',
        value: fats,
        width: totalMacros > 0 && fats > 0 ? Math.max(14, (fats / totalMacros) * 100) : 0,
        color: colors.highlight3,
      },
    ],
    [
      carbs,
      colors.highlight1,
      colors.highlight2,
      colors.highlight3,
      fats,
      protein,
      totalMacros,
    ]
  );

  const handleOpenDailySummary = () => {
    router.push({
      pathname: '/progress/nutrition/dailyNutritionSummary',
      params: { date: todayISO },
    });
  };

  return (
    <LinearGradient
      colors={[colors.gradientTop, colors.gradientMid, colors.gradientBottom]}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.85, y: 1 }}
      style={globalStyles.page}
    >
      <ScrollView
        contentContainerStyle={[globalStyles.container, styles.content]}
        showsVerticalScrollIndicator={false}
      >
        <LogoHeader />

        <View style={[globalStyles.panel, styles.heroCard]}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroBadge}>
              <Ionicons name="pulse-outline" size={14} color={colors.highlight2} />
              <Text style={styles.heroBadgeText}>Home Theme Test</Text>
            </View>

            <View style={styles.privacyPill}>
              <Ionicons
                name={profile?.is_private ? 'lock-closed' : 'globe-outline'}
                size={13}
                color={colors.highlight1}
              />
            </View>
          </View>

          <Text style={styles.heroHeading}>
            Good {getDaySegment()}, {loadingProfile ? 'loading...' : firstName}
          </Text>

          <Text style={styles.heroSubheading}>
            {loadingProfile
              ? 'Loading your home view.'
              : locationText
                ? `${locationText} • testing the new dark system on the home page first.`
                : 'Testing a new dark theme system with selectable highlight trios.'}
          </Text>

          <View style={styles.heroMetricsRow}>
            <View style={styles.heroMetricBlock}>
              <Text style={globalStyles.eyebrow}>Fuel target</Text>
              <Text style={styles.heroMetricValue}>
                {loadingDiary ? '...' : formatNumber(caloriesEaten)}
                <Text style={styles.heroMetricUnit}>
                  {' '}
                  / {formatNumber(caloriesTarget)} kcal
                </Text>
              </Text>
              <Text style={styles.heroMetricHint}>{fuelStatus}</Text>
            </View>

            <View style={[globalStyles.panelSoft, styles.scoreCard]}>
              <Text style={styles.scoreValue}>
                {loadingDiary ? '--' : `${Math.round(caloriePct * 100)}%`}
              </Text>
              <Text style={styles.scoreLabel}>paced</Text>
            </View>
          </View>

          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: caloriePct > 0 ? `${Math.max(caloriePct * 100, 10)}%` : '0%' },
              ]}
            />
          </View>

          <View style={styles.heroFootRow}>
            <View style={[globalStyles.chip, styles.metaChip]}>
              <Ionicons name="person-outline" size={14} color={colors.highlight1} />
              <Text style={[globalStyles.chipText, styles.metaChipText]}>{displayName}</Text>
            </View>
            <View style={[globalStyles.chip, styles.metaChip]}>
              <Ionicons
                name={todaySummary?.goal_hit ? 'checkmark-circle-outline' : 'time-outline'}
                size={14}
                color={colors.highlight3}
              />
              <Text style={[globalStyles.chipText, styles.metaChipText]}>
                {todaySummary?.goal_hit ? 'Goal hit' : 'In progress'}
              </Text>
            </View>
          </View>
        </View>

        <SectionHeader
          eyebrow="This Week"
          title="Weekly load at a glance"
          subtitle="The new theme output is already driving the KPI module below."
          globalStyles={globalStyles}
          styles={styles}
        />
        <WeeklyKpiRow />

        <SectionHeader
          eyebrow="Start Session"
          title="Train without hunting through tabs"
          subtitle="The selected theme family is used across the actions with different shade intensity."
          globalStyles={globalStyles}
          styles={styles}
        />

        <View style={styles.actionGrid}>
          <TouchableOpacity
            activeOpacity={0.92}
            style={[globalStyles.panelSoft, styles.actionTile, styles.actionTileHalf]}
            onPress={() => router.replace('/add/Strength/StrengthTrain')}
          >
            <View style={[styles.actionIcon, { backgroundColor: colors.accentSoft }]}>
              <MaterialCommunityIcons
                name="dumbbell"
                size={20}
                color={colors.highlight1}
              />
            </View>
            <Text style={styles.actionTitle}>Strength</Text>
            <Text style={styles.actionSubtitle}>
              Structured lifting and set tracking.
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.92}
            style={[globalStyles.panelSoft, styles.actionTile, styles.actionTileHalf]}
            onPress={() => setShowRunWalkModal(true)}
          >
            <View
              style={[
                styles.actionIcon,
                { backgroundColor: colors.accentSecondarySoft },
              ]}
            >
              <Ionicons name="walk-outline" size={20} color={colors.highlight2} />
            </View>
            <Text style={styles.actionTitle}>Run / Walk</Text>
            <Text style={styles.actionSubtitle}>
              Indoor or outdoor cardio in two taps.
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.92}
            style={[globalStyles.panelSoft, styles.actionTile, styles.actionTileFull]}
            onPress={() =>
              router.push({
                pathname: '/add/Cardio/outdoor/OutdoorSession',
                params: {
                  title: 'Outdoor Ride',
                  activityType: 'bike',
                },
              })
            }
          >
            <View style={styles.actionWideRow}>
              <View>
                <Text style={styles.actionTitle}>Outdoor ride</Text>
                <Text style={styles.actionSubtitle}>
                  Start a bike session with the tertiary accent carrying the tile.
                </Text>
              </View>
              <View
                style={[
                  styles.actionIcon,
                  styles.actionIconTrailing,
                  { backgroundColor: colors.accentTertiarySoft },
                ]}
              >
                <Ionicons
                  name="bicycle-outline"
                  size={20}
                  color={colors.highlight3}
                />
              </View>
            </View>
          </TouchableOpacity>
        </View>

        <SectionHeader
          eyebrow="Nutrition"
          title="Fueling stays front and center"
          subtitle="Protein, carbs, and fats now use three variations of the selected color family."
          globalStyles={globalStyles}
          styles={styles}
        />

        <TouchableOpacity
          activeOpacity={0.94}
          style={[globalStyles.panel, styles.nutritionCard]}
          onPress={handleOpenDailySummary}
        >
          <View style={styles.cardHeader}>
            <View>
              <Text style={globalStyles.eyebrow}>Daily summary</Text>
              <Text style={styles.cardTitle}>Calories and macros for {todayISO}</Text>
            </View>

            <View style={[globalStyles.chip, styles.cardCta]}>
              <Text style={[globalStyles.chipText, styles.cardCtaText]}>Open</Text>
              <Ionicons name="arrow-forward" size={14} color={colors.highlight1} />
            </View>
          </View>

          <Text style={styles.cardDescription}>{fuelStatus}</Text>

          <View style={styles.macroStack}>
            {macroRows.map((macro) => (
              <View key={macro.label} style={styles.macroRow}>
                <View style={styles.macroRowTop}>
                  <Text style={styles.macroLabel}>{macro.label}</Text>
                  <Text style={styles.macroValue}>
                    {loadingDiary ? '--' : `${Math.round(macro.value)}g`}
                  </Text>
                </View>

                <View style={styles.macroTrack}>
                  <View
                    style={[
                      styles.macroFill,
                      {
                        width: macro.width > 0 ? `${macro.width}%` : '0%',
                        backgroundColor: macro.color,
                      },
                    ]}
                  />
                </View>
              </View>
            ))}
          </View>

          <View style={styles.dualCtaRow}>
            <TouchableOpacity
              activeOpacity={0.92}
              style={[globalStyles.buttonSecondary, styles.inlineButton]}
              onPress={() => router.push('/add/Nutrition/logMeal')}
            >
              <Ionicons name="add-outline" size={16} color={colors.text} />
              <Text style={globalStyles.buttonTextSecondary}>Log meal</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.92}
              style={[globalStyles.buttonPrimary, styles.inlineButton]}
              onPress={() => router.push('/add/Nutrition/scanFood')}
            >
              <Ionicons name="scan-outline" size={16} color={colors.blkText} />
              <Text style={globalStyles.buttonTextPrimary}>Scan food</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>

        <SectionHeader
          eyebrow="Community"
          title="Keep discovery on the same visual wavelength"
          subtitle="Home-only application for now, but the theme tokens are ready to be rolled out elsewhere."
          globalStyles={globalStyles}
          styles={styles}
        />

        <TouchableOpacity
          activeOpacity={0.94}
          style={[globalStyles.panelSoft, styles.communityCard]}
          onPress={() => router.push('/social')}
        >
          <View style={styles.communityLeft}>
            <View
              style={[
                styles.communityIcon,
                { backgroundColor: colors.accentSecondarySoft },
              ]}
            >
              <Ionicons
                name="people-outline"
                size={20}
                color={colors.highlight2}
              />
            </View>
            <View style={styles.communityCopy}>
              <Text style={styles.cardTitle}>Open the workout feed</Text>
              <Text style={styles.cardDescription}>
                {profile?.username
                  ? `See what your circle is doing and jump back into @${profile.username}'s network.`
                  : 'See recent sessions, profiles, and social activity from the tab feed.'}
              </Text>
            </View>
          </View>
          <Ionicons name="arrow-forward" size={18} color={colors.highlight2} />
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.92}
          style={[globalStyles.panelSoft, styles.utilityCard]}
          onPress={() => router.push('/home/heart-rate-test')}
        >
          <View
            style={[
              styles.utilityIcon,
              { backgroundColor: colors.accentTertiarySoft },
            ]}
          >
            <Ionicons
              name="pulse-outline"
              size={20}
              color={colors.highlight3}
            />
          </View>
          <View style={styles.utilityCopy}>
            <Text style={styles.utilityTitle}>Heart rate test page</Text>
            <Text style={styles.utilitySubtitle}>
              Kept accessible while the theme system is being tested on the home route.
            </Text>
          </View>
        </TouchableOpacity>
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
    </LinearGradient>
  );
}

function SectionHeader({
  eyebrow,
  title,
  subtitle,
  globalStyles,
  styles,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  globalStyles: ReturnType<typeof useAppTheme>['globalStyles'];
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={globalStyles.eyebrow}>{eyebrow}</Text>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionSubtitle}>{subtitle}</Text>
    </View>
  );
}

function createStyles(
  colors: ReturnType<typeof useAppTheme>['colors'],
  fonts: ReturnType<typeof useAppTheme>['fonts']
) {
  return StyleSheet.create({
    content: {
      paddingTop: 0,
      paddingBottom: 40,
    },
    heroCard: {
      marginTop: -6,
      overflow: 'hidden',
    },
    heroTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 18,
    },
    heroBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.accentSecondarySoft,
      borderRadius: 999,
      paddingVertical: 7,
      paddingHorizontal: 12,
    },
    heroBadgeText: {
      color: colors.highlight2,
      fontFamily: fonts.label,
      fontSize: 12,
      lineHeight: 16,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    },
    privacyPill: {
      width: 34,
      height: 34,
      borderRadius: 17,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroHeading: {
      color: colors.text,
      fontFamily: fonts.display,
      fontSize: 32,
      lineHeight: 36,
      letterSpacing: -0.8,
    },
    heroSubheading: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 15,
      lineHeight: 22,
      marginTop: 10,
    },
    heroMetricsRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: 16,
      marginTop: 26,
    },
    heroMetricBlock: {
      flex: 1,
    },
    heroMetricValue: {
      color: colors.text,
      fontFamily: fonts.display,
      fontSize: 30,
      lineHeight: 34,
      letterSpacing: -0.9,
      marginTop: 8,
    },
    heroMetricUnit: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 15,
      lineHeight: 20,
    },
    heroMetricHint: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 20,
      marginTop: 10,
    },
    scoreCard: {
      width: 96,
      height: 96,
      padding: 0,
      alignItems: 'center',
      justifyContent: 'center',
    },
    scoreValue: {
      color: colors.highlight1,
      fontFamily: fonts.display,
      fontSize: 26,
      lineHeight: 30,
      letterSpacing: -0.7,
    },
    scoreLabel: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 16,
      marginTop: 4,
    },
    progressTrack: {
      height: 10,
      borderRadius: 999,
      backgroundColor: colors.card2,
      overflow: 'hidden',
      marginTop: 18,
    },
    progressFill: {
      height: '100%',
      borderRadius: 999,
      backgroundColor: colors.highlight1,
    },
    heroFootRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 18,
    },
    metaChip: {
      flex: 1,
      gap: 8,
      minHeight: 44,
      justifyContent: 'center',
    },
    metaChipText: {
      flex: 1,
      color: colors.text,
    },
    sectionHeader: {
      marginTop: 26,
      marginBottom: 14,
      gap: 4,
    },
    sectionTitle: {
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 24,
      lineHeight: 28,
      letterSpacing: -0.5,
    },
    sectionSubtitle: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 14,
      lineHeight: 21,
    },
    actionGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    actionTile: {
      justifyContent: 'space-between',
    },
    actionTileHalf: {
      width: '48%',
      minHeight: 160,
    },
    actionTileFull: {
      width: '100%',
    },
    actionIcon: {
      width: 44,
      height: 44,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 18,
    },
    actionIconTrailing: {
      marginBottom: 0,
    },
    actionTitle: {
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 18,
      lineHeight: 22,
      letterSpacing: -0.3,
    },
    actionSubtitle: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 19,
      marginTop: 8,
    },
    actionWideRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 16,
    },
    nutritionCard: {
      gap: 0,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 12,
    },
    cardTitle: {
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 18,
      lineHeight: 22,
      letterSpacing: -0.3,
      marginTop: 6,
    },
    cardDescription: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 14,
      lineHeight: 21,
      marginTop: 12,
    },
    cardCta: {
      gap: 6,
      minHeight: 34,
      justifyContent: 'center',
    },
    cardCtaText: {
      color: colors.highlight1,
    },
    macroStack: {
      marginTop: 18,
      gap: 14,
    },
    macroRow: {
      gap: 8,
    },
    macroRowTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    macroLabel: {
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 14,
      lineHeight: 18,
    },
    macroValue: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 18,
    },
    macroTrack: {
      height: 8,
      borderRadius: 999,
      backgroundColor: colors.card2,
      overflow: 'hidden',
    },
    macroFill: {
      height: '100%',
      borderRadius: 999,
    },
    dualCtaRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 22,
    },
    inlineButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    communityCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    communityLeft: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
    },
    communityIcon: {
      width: 44,
      height: 44,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    communityCopy: {
      flex: 1,
    },
    utilityCard: {
      marginTop: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
    },
    utilityIcon: {
      width: 44,
      height: 44,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    utilityCopy: {
      flex: 1,
    },
    utilityTitle: {
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 16,
      lineHeight: 20,
    },
    utilitySubtitle: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 19,
      marginTop: 6,
    },
  });
}
