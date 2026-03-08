import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

import LogoHeader from '@/components/my components/logoHeader';
import { useAppTheme } from '@/providers/AppThemeProvider';

import GoalCalendar from './profile/components/GoalCalendar';
import ProfileHeaderSection, { type ProfileStats } from './profile/components/ProfileHeaderSection';
import LifetimeStatsTable from './profile/components/LifetimeStatsTable';
import ActivityGrid from './profile/components/ActivityGrid';

import { supabase } from '@/lib/supabase';
import { getSocialCounts } from '@/lib/social/feed';

type DetailTab = 'stats' | 'lifetime' | 'calendar';

type AppUserProfile = {
  user_id: string;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  profile_image_url: string | null;
  bio: string | null;
  is_private: boolean;
  onboarding_completed: boolean;
  country: string | null;
  state: string | null;
  city: string | null;
};

function formatSupabaseErr(err: any) {
  if (!err) return 'Unknown error';
  const msg = typeof err?.message === 'string' ? err.message : '';
  const code = err?.code ? `(${err.code})` : '';
  const details = err?.details ? ` ${err.details}` : '';
  const hint = err?.hint ? ` Hint: ${err.hint}` : '';
  const out = `${msg?.trim?.() || 'Request failed'} ${code}${details}${hint}`.trim();
  return out.length ? out : 'Request failed';
}

export default function ProfileScreen() {
  const router = useRouter();
  const { colors, fonts, globalStyles } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);

  const [detailTab, setDetailTab] = useState<DetailTab>('stats');
  const [profile, setProfile] = useState<AppUserProfile | null>(null);
  const [stats, setStats] = useState<ProfileStats>({
    posts: 0,
    followers: 0,
    following: 0,
  });
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState<string | null>(null);

  const fullName = useMemo(() => {
    if (!profile) return '';
    return [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim();
  }, [profile]);

  const usernameText = useMemo(() => {
    if (!profile) return '';
    if (profile.username && profile.username.trim().length > 0) return profile.username;
    return `user_${profile.user_id.slice(0, 8)}`;
  }, [profile]);

  const goToSettings = () => router.push('/profile/settings');
  const goToConnections = useCallback(
    (tab: 'followers' | 'following') => {
      const uid = profile?.user_id;
      if (!uid) return;
      router.push({
        pathname: '/social/connections',
        params: { userId: uid, tab, username: usernameText },
      });
    },
    [profile?.user_id, router, usernameText]
  );

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      setErrorText(null);

      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;

      const authUserId = authData?.user?.id;
      if (!authUserId) throw new Error('Not signed in.');

      const { data, error } = await supabase
        .schema('user')
        .from('users')
        .select(
          'user_id,username,first_name,last_name,profile_image_url,bio,is_private,onboarding_completed,country,state,city'
        )
        .eq('user_id', authUserId)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error('Profile not found for current user.');

      setProfile(data as AppUserProfile);

      try {
        const socialCounts = await getSocialCounts(authUserId);
        setStats(socialCounts);
      } catch (countErr) {
        console.warn('[Profile] social counts unavailable', countErr);
        setStats({ posts: 0, followers: 0, following: 0 });
      }
    } catch (err: any) {
      console.error('[Profile] loadProfile failed', err);
      setErrorText(formatSupabaseErr(err));
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  const renderDetailTabs = () => (
    <View style={styles.detailTabs}>
      <TabButton
        label="Activity"
        icon="bar-chart-outline"
        active={detailTab === 'stats'}
        onPress={() => setDetailTab('stats')}
        styles={styles}
        activeIconColor={colors.blkText}
        inactiveIconColor={colors.textMuted}
      />
      <TabButton
        label="Lifetime"
        icon="trophy-outline"
        active={detailTab === 'lifetime'}
        onPress={() => setDetailTab('lifetime')}
        styles={styles}
        activeIconColor={colors.blkText}
        inactiveIconColor={colors.textMuted}
      />
      <TabButton
        label="Calendar"
        icon="calendar-outline"
        active={detailTab === 'calendar'}
        onPress={() => setDetailTab('calendar')}
        styles={styles}
        activeIconColor={colors.blkText}
        inactiveIconColor={colors.textMuted}
      />
    </View>
  );

  const renderHeaderBlock = () => (
    <>
      <View style={[globalStyles.panel, styles.profileHero]}>
        <View style={styles.profileHeroHeader}>
          <View>
            <Text style={globalStyles.eyebrow}>Account</Text>
            <Text style={styles.profileHeroTitle}>Profile</Text>
            <Text style={styles.profileHeroText}>
              Your social presence, training archive, and goal history in one
              themed view.
            </Text>
          </View>

          <TouchableOpacity
            onPress={goToSettings}
            activeOpacity={0.9}
            style={styles.settingsButton}
          >
            <Ionicons name="settings-outline" size={20} color={colors.highlight1} />
          </TouchableOpacity>
        </View>
      </View>

      {profile ? (
        <ProfileHeaderSection
          fullName={fullName}
          username={usernameText}
          bio={profile.bio}
          profileImageUrl={profile.profile_image_url}
          stats={stats}
          isOwnProfile={true}
          onEditProfile={() => router.push('/profile/components/edit')}
          onPressFollowers={() => goToConnections('followers')}
          onPressFollowing={() => goToConnections('following')}
        />
      ) : null}

      {renderDetailTabs()}
      <View style={styles.headerDivider} />
    </>
  );

  const userId = profile?.user_id ?? '';

  return (
    <LinearGradient
      colors={[colors.gradientTop, colors.gradientMid, colors.gradientBottom]}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={globalStyles.page}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.headerTop}>
          <LogoHeader />
        </View>

        <View style={styles.body}>
          {loading ? (
            <View style={styles.stateWrap}>
              <ActivityIndicator size="small" color={colors.highlight1} />
              <Text style={styles.stateText}>Loading profile…</Text>
            </View>
          ) : errorText ? (
            <View style={styles.stateWrap}>
              <Text style={styles.errorText}>{errorText}</Text>
            </View>
          ) : !userId ? (
            <View style={styles.stateWrap}>
              <Text style={styles.stateText}>Profile loaded without user id.</Text>
            </View>
          ) : detailTab === 'stats' ? (
            <ActivityGrid userId={userId} header={renderHeaderBlock()} />
          ) : detailTab === 'lifetime' ? (
            <ScrollView
              style={styles.flex}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {renderHeaderBlock()}
              <LifetimeStatsTable userId={userId} />
            </ScrollView>
          ) : (
            <ScrollView
              style={styles.flex}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {renderHeaderBlock()}
              <GoalCalendar userId={userId} />
            </ScrollView>
          )}
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

function TabButton({
  label,
  icon,
  active,
  onPress,
  styles,
  activeIconColor,
  inactiveIconColor,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  active: boolean;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
  activeIconColor: string;
  inactiveIconColor: string;
}) {
  return (
    <TouchableOpacity
      style={[styles.tabButton, active && styles.tabButtonActive]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <Ionicons
        name={icon}
        size={18}
        color={active ? activeIconColor : inactiveIconColor}
      />
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function createStyles(
  colors: ReturnType<typeof useAppTheme>['colors'],
  fonts: ReturnType<typeof useAppTheme>['fonts']
) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
    },
    flex: {
      flex: 1,
    },
    headerTop: {
      paddingHorizontal: 18,
      paddingBottom: 4,
    },
    body: {
      flex: 1,
    },
    profileHero: {
      marginHorizontal: 16,
      marginTop: 10,
      marginBottom: 14,
    },
    profileHeroHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 12,
    },
    profileHeroTitle: {
      marginTop: 8,
      color: colors.text,
      fontFamily: fonts.display,
      fontSize: 34,
      lineHeight: 38,
      letterSpacing: -1,
    },
    profileHeroText: {
      marginTop: 10,
      maxWidth: 280,
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 14,
      lineHeight: 20,
    },
    settingsButton: {
      width: 42,
      height: 42,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.glowPrimary,
      backgroundColor: colors.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    scrollContent: {
      paddingHorizontal: 16,
      paddingBottom: 32,
    },
    stateWrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      paddingHorizontal: 24,
    },
    stateText: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 18,
    },
    errorText: {
      color: colors.danger,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 18,
      textAlign: 'center',
    },
    detailTabs: {
      flexDirection: 'row',
      marginTop: 16,
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 4,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 4,
    },
    tabButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
      borderRadius: 12,
      gap: 6,
    },
    tabButtonActive: {
      backgroundColor: colors.highlight1,
    },
    tabLabel: {
      color: colors.textMuted,
      fontFamily: fonts.label,
      fontSize: 12,
      lineHeight: 16,
    },
    tabLabelActive: {
      color: colors.blkText,
    },
    headerDivider: {
      height: 1,
      backgroundColor: colors.border,
      marginTop: 12,
    },
  });
}
