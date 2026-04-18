import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Switch,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { clearAllRunWalkLocalState } from '@/lib/runWalkSessionCleanup';
import { useActiveRunWalk } from '@/providers/ActiveRunWalkProvider';
import {
  getHealthPreferences,
  getHealthStatusLabel,
} from '@/lib/health/preferences';
import { getCurrentHealthProviderLabel } from '@/lib/health/provider';
import {
  getStrengthRestTimerPreferences,
  setStrengthRestTimerDefaultSeconds,
} from '@/lib/strength/restTimerPreferences';
import { formatRestTimerClock } from '@/lib/strength/restTimer';
import { useAppTheme } from '@/providers/AppThemeProvider';
import {
  PROFILE_ADVANCED_SETTINGS_ROUTE,
  PROFILE_GOALS_SETTINGS_ROUTE,
  PROFILE_HEALTH_SETTINGS_ROUTE,
  PROFILE_ROUTE,
} from './profileNavigation';

import { useUnits } from '@/contexts/UnitsContext';
import WeightUnitModal from './settings/WeightUnitModal';
import DistanceUnitModal from './settings/DistanceUnitModal';
import ProfileDetailsModal from './settings/ProfileDetailsModal';
import RestTimerModal from './settings/RestTimerModal';

export default function SettingsScreen() {
  const router = useRouter();
  const { colors, fonts } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);
  const { weightUnit, distanceUnit } = useUnits();
  const { activeSession, clearSession } = useActiveRunWalk();
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [showDistanceModal, setShowDistanceModal] = useState(false);
  const [showProfileDetailsModal, setShowProfileDetailsModal] = useState(false);
  const [showRestTimerModal, setShowRestTimerModal] = useState(false);
  const [healthStatus, setHealthStatus] = useState('Not connected');
  const [restTimerSeconds, setRestTimerSeconds] = useState(90);
  const [isPrivate, setIsPrivate] = useState(true);
  const [privacyLoading, setPrivacyLoading] = useState(false);
  const [privacySaving, setPrivacySaving] = useState(false);
  const providerLabel = getCurrentHealthProviderLabel();

  const loadHealthStatus = useCallback(async () => {
    try {
      const prefs = await getHealthPreferences();
      setHealthStatus(getHealthStatusLabel(prefs));
    } catch (error) {
      console.warn('[Settings] failed to load health status', error);
      setHealthStatus('Unavailable');
    }
  }, []);

  const loadRestTimerPreference = useCallback(async () => {
    try {
      const prefs = await getStrengthRestTimerPreferences();
      setRestTimerSeconds(prefs.defaultDurationSeconds);
    } catch (error) {
      console.warn('[Settings] failed to load strength rest timer preference', error);
    }
  }, []);

  const loadPrivacyPreference = useCallback(async () => {
    try {
      setPrivacyLoading(true);
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) return;

      const [{ data: userRow, error: userError }, { data: profileRow, error: profileError }] =
        await Promise.all([
          supabase
            .schema('user')
            .from('users')
            .select('is_private')
            .eq('user_id', user.id)
            .maybeSingle(),
          supabase
            .schema('public')
            .from('profiles')
            .select('is_private')
            .eq('id', user.id)
            .maybeSingle(),
        ]);

      if (userError && (userError as any).code !== 'PGRST116') {
        console.warn('[Settings] failed to load user.users privacy setting', userError);
      }
      if (profileError && (profileError as any).code !== 'PGRST116') {
        console.warn('[Settings] failed to load public.profiles privacy setting', profileError);
      }

      const nextIsPrivate =
        typeof userRow?.is_private === 'boolean'
          ? userRow.is_private
          : typeof profileRow?.is_private === 'boolean'
            ? profileRow.is_private
            : true;
      setIsPrivate(nextIsPrivate);
    } catch (error) {
      console.warn('[Settings] failed to load privacy setting', error);
    } finally {
      setPrivacyLoading(false);
    }
  }, []);

  const updatePrivacyPreference = useCallback(async (nextValue: boolean) => {
    if (privacySaving) return;

    const previousValue = isPrivate;
    setIsPrivate(nextValue);
    setPrivacySaving(true);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error('You are not signed in.');
      }

      const [{ error: userError }, { error: profileError }] = await Promise.all([
        supabase
          .schema('user')
          .from('users')
          .update({ is_private: nextValue })
          .eq('user_id', user.id),
        supabase
          .schema('public')
          .from('profiles')
          .update({ is_private: nextValue })
          .eq('id', user.id),
      ]);

      if (userError) {
        throw userError;
      }

      if (profileError && (profileError as any).code !== 'PGRST116') {
        console.warn('[Settings] non-fatal public.profiles privacy sync failed', profileError);
      }

      if (!nextValue) {
        const [{ error: postsVisibilityError }, { error: workoutsVisibilityError }] =
          await Promise.all([
            supabase
              .schema('social')
              .from('posts')
              .update({ visibility: 'public' })
              .eq('user_id', user.id),
            supabase
              .schema('strength')
              .from('strength_workouts')
              .update({ privacy: 'public' })
              .eq('user_id', user.id),
          ]);

        if (postsVisibilityError) {
          console.warn(
            '[Settings] non-fatal social.posts visibility sync failed',
            postsVisibilityError
          );
        }

        if (workoutsVisibilityError) {
          console.warn(
            '[Settings] non-fatal strength visibility sync failed',
            workoutsVisibilityError
          );
        }
      }
    } catch (error: any) {
      setIsPrivate(previousValue);
      Alert.alert('Could not update privacy', error?.message ?? 'Please try again.');
    } finally {
      setPrivacySaving(false);
    }
  }, [isPrivate, privacySaving]);

  useFocusEffect(
    useCallback(() => {
      loadHealthStatus();
      loadRestTimerPreference();
      loadPrivacyPreference();
    }, [loadHealthStatus, loadRestTimerPreference, loadPrivacyPreference])
  );

  const handleComingSoon = (label: string) => {
    // placeholder until you wire actual popups
    Alert.alert(label, 'Configure options coming soon.');
  };

  const goToGoals = () => {
    router.push(PROFILE_GOALS_SETTINGS_ROUTE);
  };

  const handleLogout = async () => {
    if (activeSession?.kind === 'strength' && activeSession.workoutId) {
      const { error: deleteError } = await supabase
        .schema('strength')
        .from('strength_workouts')
        .delete()
        .eq('id', activeSession.workoutId);

      if (deleteError) {
        console.warn('[Settings] failed to delete active strength workout on logout', deleteError);
      }
    }

    const { error } = await supabase.auth.signOut();
    if (error) {
      Alert.alert('Logout failed', error.message);
      return;
    }
    clearSession();
    await clearAllRunWalkLocalState().catch(() => null);
    // adjust this path to your auth route if different
    router.replace('../../SignInLogin/FirstPage');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.navigate(PROFILE_ROUTE)}
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* GENERAL */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>General</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={[styles.row, styles.rowBorder]}
              onPress={() => handleComingSoon('Notifications')}
            >
              <Text style={styles.rowLabel}>Notifications</Text>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.textMuted}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.row, styles.rowBorder]}
              onPress={goToGoals}
            >
              <Text style={styles.rowLabel}>Goal settings</Text>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.textMuted}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.row, styles.rowBorder]}
              onPress={() => setShowProfileDetailsModal(true)}
            >
              <Text style={styles.rowLabel}>Profile details</Text>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.textMuted}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.row}
              onPress={() => router.push(PROFILE_ADVANCED_SETTINGS_ROUTE)}
            >
              <Text style={styles.rowLabel}>Advanced</Text>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.textMuted}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* STRENGTH */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Strength</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={[styles.row, styles.rowBorder]}
              onPress={() => setShowRestTimerModal(true)}
            >
              <Text style={styles.rowLabel}>Rest timer</Text>
              <View style={styles.rowRight}>
                <Text style={styles.rowValue}>{formatRestTimerClock(restTimerSeconds)}</Text>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={colors.textMuted}
                />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.row}
              onPress={() => handleComingSoon('Warm-up settings')}
            >
              <Text style={styles.rowLabel}>Warm up settings</Text>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.textMuted}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* CARDIO */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cardio</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.row}
              onPress={() => handleComingSoon('Speed or pace')}
            >
              <Text style={styles.rowLabel}>Speed or pace</Text>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.textMuted}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* UNITS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Units</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={[styles.row, styles.rowBorder]}
              onPress={() => handleComingSoon('Language')}
            >
              <Text style={styles.rowLabel}>Language</Text>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.textMuted}
              />
            </TouchableOpacity>

            {/* Weight unit with popup */}
            <TouchableOpacity
              style={[styles.row, styles.rowBorder]}
              onPress={() => setShowWeightModal(true)}
            >
              <Text style={styles.rowLabel}>Weight unit</Text>
              <View style={styles.rowRight}>
                <Text style={styles.rowValue}>
                  {weightUnit === 'lb' ? 'Pounds (lb)' : 'Kilograms (kg)'}
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={colors.textMuted}
                />
              </View>
            </TouchableOpacity>

            {/* Distance unit with popup */}
            <TouchableOpacity
              style={styles.row}
              onPress={() => setShowDistanceModal(true)}
            >
              <Text style={styles.rowLabel}>Distance unit</Text>
              <View style={styles.rowRight}>
                <Text style={styles.rowValue}>
                  {distanceUnit === 'mi' ? 'Miles (mi)' : 'Kilometers (km)'}
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={colors.textMuted}
                />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* PRIVACY */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.privacyTextWrap}>
                <Text style={styles.rowLabel}>Private account</Text>
                <Text style={styles.privacyHint}>
                  {isPrivate
                    ? 'Only approved followers can view your profile.'
                    : 'Anyone can view your profile.'}
                </Text>
              </View>

              <View style={styles.privacyControl}>
                {privacySaving ? <ActivityIndicator size="small" color={colors.highlight1} /> : null}
                <Switch
                  value={isPrivate}
                  onValueChange={(nextValue) => {
                    void updatePrivacyPreference(nextValue);
                  }}
                  disabled={privacyLoading || privacySaving}
                  trackColor={{
                    false: colors.borderStrong,
                    true: colors.highlight1,
                  }}
                  thumbColor={colors.card}
                />
              </View>
            </View>
          </View>
        </View>

        {/* DATA */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={[styles.row, styles.rowBorder]}
              onPress={() => router.push(PROFILE_HEALTH_SETTINGS_ROUTE)}
            >
              <Text style={styles.rowLabel}>Health data</Text>
              <View style={styles.rowRight}>
                <Text style={styles.rowValue}>{`${providerLabel} · ${healthStatus}`}</Text>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={colors.textMuted}
                />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.row, styles.rowBorder]}
              onPress={() => handleComingSoon('Export strength workouts')}
            >
              <Text style={styles.rowLabel}>Export strength workouts</Text>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.textMuted}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.row, styles.rowBorder]}
              onPress={() => handleComingSoon('Export cardio')}
            >
              <Text style={styles.rowLabel}>Export cardio</Text>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.textMuted}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.row}
              onPress={() => handleComingSoon('Export nutrition')}
            >
              <Text style={styles.rowLabel}>Export nutrition</Text>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.textMuted}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* APP */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={[styles.row, styles.rowBorder]}
              onPress={() => handleComingSoon('Help & support')}
            >
              <Text style={styles.rowLabel}>Help and support</Text>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.textMuted}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.row, styles.rowBorder]}
              onPress={() => handleComingSoon('Review app')}
            >
              <Text style={styles.rowLabel}>Review app</Text>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.textMuted}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.row, styles.rowBorder]}
              onPress={() => handleComingSoon('Terms of service')}
            >
              <Text style={styles.rowLabel}>Terms of service</Text>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.textMuted}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.row}
              onPress={() => handleComingSoon('Privacy policy')}
            >
              <Text style={styles.rowLabel}>Privacy policy</Text>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.textMuted}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* LOGOUT */}
        <View style={styles.logoutContainer}>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <Text style={styles.logoutText}>Log out</Text>
          </TouchableOpacity>
        </View>
        {/* Weight unit modal */}
        <WeightUnitModal
          visible={showWeightModal}
          onClose={() => setShowWeightModal(false)}
        />

        {/* Distance unit modal */}
        <DistanceUnitModal
          visible={showDistanceModal}
          onClose={() => setShowDistanceModal(false)}
        />

        <ProfileDetailsModal
          visible={showProfileDetailsModal}
          onClose={() => setShowProfileDetailsModal(false)}
        />

        <RestTimerModal
          visible={showRestTimerModal}
          valueSeconds={restTimerSeconds}
          onClose={() => setShowRestTimerModal(false)}
          onSave={async (seconds) => {
            const nextSeconds = await setStrengthRestTimerDefaultSeconds(seconds);
            setRestTimerSeconds(nextSeconds);
            setShowRestTimerModal(false);
          }}
        />

      </ScrollView>
    </SafeAreaView>
  );
}

// ---- styles ----

function createStyles(
  colors: ReturnType<typeof useAppTheme>['colors'],
  fonts: ReturnType<typeof useAppTheme>['fonts']
) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      paddingHorizontal: 16,
      paddingBottom: 32,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 8,
      backgroundColor: colors.background,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    backButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      flex: 1,
      textAlign: 'center',
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 18,
      lineHeight: 22,
    },
    headerSpacer: {
      width: 32,
    },
    section: {
      marginTop: 20,
    },
    sectionTitle: {
      color: colors.textMuted,
      fontFamily: fonts.label,
      fontSize: 12,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginBottom: 6,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 14,
      justifyContent: 'space-between',
    },
    rowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    rowLabel: {
      color: colors.text,
      fontFamily: fonts.body,
      fontSize: 14,
      lineHeight: 18,
    },
    rowRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    rowValue: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 16,
    },
    privacyTextWrap: {
      flex: 1,
      paddingRight: 12,
    },
    privacyHint: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 16,
      marginTop: 4,
    },
    privacyControl: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    logoutContainer: {
      marginTop: 28,
    },
    logoutButton: {
      backgroundColor: colors.card2,
      borderRadius: 999,
      paddingVertical: 12,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.danger,
    },
    logoutText: {
      color: colors.danger,
      fontFamily: fonts.heading,
      fontSize: 15,
      lineHeight: 18,
    },
  });
}
