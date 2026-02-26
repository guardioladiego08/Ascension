// app/(tabs)/home/home.tsx
// Home screen with live "Nutrition Today" data from nutrition.diary_days.

import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

import { GlobalStyles } from '@/constants/GlobalStyles';
import LogoHeader from '@/components/my components/logoHeader';
import { Colors } from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import { getActiveRunWalkLock } from '@/lib/runWalkSessionLock';

import WeeklyKpiRow from './home/WeeklyKpiRow';
import RunWalkTypeModal, { RunWalkExerciseType } from './home/RunWalkTypeModal';

const BG = Colors.dark.background;
const PRIMARY = Colors.dark.highlight1;
const TEXT_PRIMARY = Colors.dark.text;
const TEXT_MUTED = Colors.dark.textMuted;

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

export default function BlankHome() {
  const router = useRouter();

  const [todaySummary, setTodaySummary] = useState<DiaryDay | null>(null);
  const [loadingDiary, setLoadingDiary] = useState(false);
  const [profile, setProfile] = useState<AppUserRow | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  const [showRunWalkModal, setShowRunWalkModal] = useState(false);

  // YYYY-MM-DD for "today"
  const todayISO = useMemo(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  }, []);

  // Fetch today's diary_days row whenever this screen is focused
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
            // PGRST116 is "no rows returned" when using maybeSingle
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

  // Safely pull totals/targets from diary_days
  const caloriesEaten = todaySummary?.kcal_total != null ? Number(todaySummary.kcal_total) : 0;

  const caloriesTarget = todaySummary?.kcal_target != null ? Number(todaySummary.kcal_target) : 0;

  const protein = todaySummary?.protein_g_total != null ? Number(todaySummary.protein_g_total) : 0;

  const carbs = todaySummary?.carbs_g_total != null ? Number(todaySummary.carbs_g_total) : 0;

  const fats = todaySummary?.fat_g_total != null ? Number(todaySummary.fat_g_total) : 0;

  const caloriePct =
    caloriesTarget > 0 ? Math.min(100, (caloriesEaten / caloriesTarget) * 100) : 0;

  const displayName = useMemo(() => {
    const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim();
    if (name) return name;
    if (profile?.username) return `@${profile.username}`;
    return 'Athlete';
  }, [profile]);

  const locationText = useMemo(() => {
    const location = [profile?.city, profile?.state, profile?.country].filter(Boolean).join(', ');
    return location || null;
  }, [profile]);

  const handleOpenDailySummary = () => {
    router.push({
      pathname: '/progress/nutrition/dailyNutritionSummary',
      params: { date: todayISO },
    });
  };

  return (
    <LinearGradient
      colors={['#3a3a3bff', '#1e1e1eff', BG]}
      start={{ x: 0.2, y: 0 }}
      end={{ x: 0.8, y: 1 }}
      style={{ flex: 1 }}
    >
      <View style={GlobalStyles.safeArea}>
        <LogoHeader />
        <Text style={GlobalStyles.header}>HOME</Text>
        <View style={styles.welcomeCard}>
          <View>
            <Text style={styles.welcomeLabel}>WELCOME BACK</Text>
            <Text style={styles.welcomeName}>
              {loadingProfile ? 'Loading...' : displayName}
            </Text>
            {locationText ? <Text style={styles.welcomeMeta}>{locationText}</Text> : null}
          </View>
          <Ionicons name={profile?.is_private ? 'lock-closed' : 'people'} size={18} color={PRIMARY} />
        </View>

        <ScrollView
          contentContainerStyle={GlobalStyles.container}
          showsVerticalScrollIndicator={false}
        >
          {/* KPI Row */}
          <Text style={styles.sectionTitle}>SO FAR THIS WEEK</Text>
          <WeeklyKpiRow />

          {/* Start Workout */}
          <Text style={styles.sectionTitle}>START WORKOUT</Text>
          <View style={styles.quickRow}>
            <TouchableOpacity
              activeOpacity={0.9}
              style={GlobalStyles.quickCard}
              onPress={() => router.replace('/add/Strength/StrengthTrain')}
            >
              <MaterialCommunityIcons
                name="arm-flex"
                size={28}
                color={Colors.dark.highlight1}
              />
              <Text style={styles.quickText}>Weights</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.9}
              style={GlobalStyles.quickCard}
              onPress={() => setShowRunWalkModal(true)}
            >
              <Ionicons name="walk" size={28} color={Colors.dark.highlight2} />
              <Text style={styles.quickText}>Run</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.9}
              style={GlobalStyles.quickCard}
              onPress={() => router.push('/add/Cardio/OutdoorSession')}
            >
              <Ionicons name="bicycle" size={28} color={Colors.dark.highlight3} />
              <Text style={styles.quickText}>Bike</Text>
            </TouchableOpacity>
          </View>

          {/* Nutrition Today */}
          <Text style={styles.sectionTitle}>NUTRITION TODAY</Text>
          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.card}
            onPress={handleOpenDailySummary}
          >
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <Ionicons name="checkmark-circle" size={18} color="#7BE495" />
                <Text style={styles.cardHeaderTitle}>Daily Summary</Text>
              </View>
              <Text style={styles.link}>View Details</Text>
            </View>

            <View style={styles.calRow}>
              <Text style={styles.calLeft}>{loadingDiary ? '...' : formatNumber(caloriesEaten)}</Text>
              <Text style={styles.calRight}>
                {loadingDiary ? '' : `/ ${formatNumber(caloriesTarget)} kcal`}
              </Text>
            </View>

            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${caloriePct}%` }]} />
            </View>

            <View style={styles.macroRow}>
              <View style={styles.macroItem}>
                <Text style={styles.macroNumber}>
                  {loadingDiary ? '—' : `${Math.round(protein)}g`}
                </Text>
                <Text style={styles.macroLabel}>PROTEIN</Text>
              </View>
              <View style={styles.macroItem}>
                <Text style={styles.macroNumber}>
                  {loadingDiary ? '—' : `${Math.round(carbs)}g`}
                </Text>
                <Text style={styles.macroLabel}>CARBS</Text>
              </View>
              <View style={styles.macroItem}>
                <Text style={styles.macroNumber}>
                  {loadingDiary ? '—' : `${Math.round(fats)}g`}
                </Text>
                <Text style={styles.macroLabel}>FAT</Text>
              </View>
            </View>
          </TouchableOpacity>

          <View style={styles.row2}>
            <TouchableOpacity
              activeOpacity={0.9}
              style={[styles.ctaButton, { marginRight: 14 }]}
              onPress={() => router.push('/add/Nutrition/logMeal')}
            >
              <Ionicons name="add-circle" size={18} color="#0E151F" />
              <Text style={styles.ctaText}>Log Meal</Text>
            </TouchableOpacity>

            <TouchableOpacity activeOpacity={0.9} style={styles.ctaButton}>
              <Ionicons name="camera" size={18} color="#0E151F" />
              <Text style={styles.ctaText}>Scan Food</Text>
            </TouchableOpacity>
          </View>

          {/* Social */}
          <Text style={styles.sectionTitle}>SOCIAL</Text>

          <View style={styles.listCard}>
            <View style={styles.listIconWrap}>
              <Ionicons name="people" size={20} color="#F4B3FF" />
            </View>
            <View style={styles.listTextWrap}>
              <Text style={styles.listTitle}>Workout Feed</Text>
              <Text style={styles.listSubtitle}>
                {profile?.username
                  ? `See what friends are doing, @${profile.username}`
                  : 'See what friends are doing'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#AAB2C5" />
          </View>

          <View style={styles.listCard}>
            <View style={styles.listIconWrap}>
              <Ionicons name="trophy" size={20} color="#FFD38C" />
            </View>
            <View style={styles.listTextWrap}>
              <Text style={styles.listTitle}>Leaderboards</Text>
              <Text style={styles.listSubtitle}>Compete with the community</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#AAB2C5" />
          </View>

          <View style={styles.listCard}>
            <View style={styles.listIconWrap}>
              <Ionicons name="medal" size={20} color="#8CE0FF" />
            </View>
            <View style={styles.listTextWrap}>
              <Text style={styles.listTitle}>Challenges</Text>
              <Text style={styles.listSubtitle}>Join active challenges</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#AAB2C5" />
          </View>
        </ScrollView>
      </View>

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
                title: 'Walking Session',
                activityType: 'walk',
              },
            });
            return;
          }
        }}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  welcomeCard: {
    backgroundColor: Colors.dark.card,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  welcomeLabel: {
    color: TEXT_MUTED,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  welcomeName: {
    color: TEXT_PRIMARY,
    fontSize: 17,
    fontWeight: '900',
    marginTop: 4,
  },
  welcomeMeta: {
    color: TEXT_MUTED,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },

  // Tighten vertical rhythm + match onboarding label treatment
  sectionTitle: {
    color: TEXT_MUTED,
    fontSize: 11,
    marginTop: 16,
    marginBottom: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },

  quickRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickText: {
    color: TEXT_PRIMARY,
    fontWeight: '700',
    marginTop: 8,
    fontSize: 13,
  },

  // Onboarding-style "panel" card (border + subtle depth)
  card: {
    backgroundColor: Colors.dark.card,
    borderRadius: 18,
    padding: 16,
    marginTop: 0,
    borderWidth: 1,
  },

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center' },
  cardHeaderTitle: {
    color: TEXT_PRIMARY,
    fontWeight: '800',
    marginLeft: 8,
    letterSpacing: 0.2,
  },
  link: { color: PRIMARY, fontSize: 12, fontWeight: '700' },

  calRow: { flexDirection: 'row', alignItems: 'baseline' },
  calLeft: {
    color: TEXT_PRIMARY,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  calRight: {
    color: TEXT_MUTED,
    marginLeft: 8,
    fontSize: 12,
    fontWeight: '700',
  },

  progressTrack: {
    height: 7,
    backgroundColor: '#222A3A',
    borderRadius: 999,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: 7,
    backgroundColor: PRIMARY,
    borderRadius: 999,
  },

  macroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  macroItem: { alignItems: 'center', flex: 1 },
  macroNumber: { color: TEXT_PRIMARY, fontWeight: '900', fontSize: 13 },
  macroLabel: {
    color: TEXT_MUTED,
    fontSize: 10,
    marginTop: 3,
    fontWeight: '800',
    letterSpacing: 0.8,
  },

  row2: { flexDirection: 'row', marginTop: 12 },

  // Match onboarding CTAs (use primary accent instead of green)
  ctaButton: {
    flex: 1,
    backgroundColor: PRIMARY,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  ctaText: { color: '#0E151F', fontWeight: '900', letterSpacing: 0.2 },

  // Social list cards = same panel treatment as onboarding
  listCard: {
    backgroundColor: Colors.dark.card,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
  },
  listIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#0a0a0aff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  listTextWrap: { flex: 1 },
  listTitle: { color: TEXT_PRIMARY, fontWeight: '900', letterSpacing: 0.2 },
  listSubtitle: {
    color: TEXT_MUTED,
    fontSize: 12,
    marginTop: 2,
    fontWeight: '600',
  },
});
