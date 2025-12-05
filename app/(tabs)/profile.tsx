// app/(tabs)/profile.tsx
import React, { useEffect, useState, useCallback } from 'react';
import {
  SafeAreaView,
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

import { Colors } from '@/constants/Colors';
import LogoHeader from '@/components/my components/logoHeader';
import GoalCalendar from './profile/components/GoalCalendar';
import ProfileHeaderSection from './profile/components/ProfileHeaderSection';
import { supabase } from '@/lib/supabase';

const BG = Colors.dark?.background ?? '#050816';
const CARD = Colors.dark?.card ?? '#13182B';
const BORDER = Colors.dark?.border ?? '#1F2937';
const TEXT_PRIMARY = Colors.dark?.textPrimary ?? '#EAF2FF';
const TEXT_MUTED = Colors.dark?.textMuted ?? '#9AA4BF';
const ACCENT = Colors.primary ?? '#6366F1';

type ProfileRow = {
  id: string;
  auth_user_id: string;
  first_name: string | null;
  last_name: string | null;
  username: string;
  bio: string | null;
  profile_image_url: string | null;
};

type ProfileStats = {
  posts: number;
  followers: number;
  following: number;
};

export default function ProfileScreen() {
  const router = useRouter();

  const [detailTab, setDetailTab] = useState<'grid' | 'stats' | 'calendar'>(
    'grid'
  );
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [stats, setStats] = useState<ProfileStats>({
    posts: 0,
    followers: 0,
    following: 0,
  });
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState<string | null>(null);

  const goToSettings = () => {
    router.push('/profile/settings');
  };

  // --------- LOAD PROFILE (reusable) ---------
  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      setErrorText(null);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error('[Profile] getUser error', userError);
        throw userError;
      }

      if (!user) {
        throw new Error('Not signed in');
      }

      const { data, error } = await supabase
        .schema('user')
        .from('profiles')
        .select(
          'id, auth_user_id, first_name, last_name, username, bio, profile_image_url'
        )
        .eq('auth_user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('[Profile] profiles query error', error);
        throw error;
      }

      if (!data) {
        throw new Error('Profile not found for current user.');
      }

      setProfile(data as ProfileRow);

      // TODO: later, fetch stats (posts/followers/following)
    } catch (err: any) {
      console.error('[Profile] loadProfile failed', err);
      setErrorText(err?.message ?? 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load on mount
  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // Re-run whenever the Profile tab regains focus (e.g. returning from /profile/edit)
  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  // --------- RENDER HELPERS ---------

  const renderDetailTabs = () => (
    <View style={styles.detailTabs}>
      <TabButton
        label="Posts"
        icon="grid-outline"
        active={detailTab === 'grid'}
        onPress={() => setDetailTab('grid')}
      />
      <TabButton
        label="Activity"
        icon="bar-chart-outline"
        active={detailTab === 'stats'}
        onPress={() => setDetailTab('stats')}
      />
      <TabButton
        label="Calendar"
        icon="calendar-outline"
        active={detailTab === 'calendar'}
        onPress={() => setDetailTab('calendar')}
      />
    </View>
  );

  const renderGridPosts = () => (
    <View style={styles.emptyStateCard}>
      <Text style={styles.emptyStateTitle}>No posts yet</Text>
      <Text style={styles.emptyStateText}>
        Once you start sharing your sessions, they’ll appear here in a grid.
      </Text>
    </View>
  );

  const renderActivityStats = () => (
    <View style={styles.emptyStateCard}>
      <Text style={styles.emptyStateTitle}>No activity tracked</Text>
      <Text style={styles.emptyStateText}>
        When you complete strength or cardio sessions, your recent activity will
        show up here.
      </Text>
    </View>
  );

  const fullName =
    profile &&
    [profile.first_name, profile.last_name].filter(Boolean).join(' ');

  const username = profile?.username ?? 'user';

  // --------- MAIN RENDER ---------

  return (
    <SafeAreaView style={styles.safeArea}>
      <LogoHeader />

      {/* Instagram-style top bar */}
      <View style={styles.topBar}>
        <Text style={styles.topBarUsername}>@{username}</Text>
        <View style={styles.topBarIcons}>
          <TouchableOpacity onPress={goToSettings} style={styles.iconButton}>
            <Ionicons name="settings-outline" size={22} color={TEXT_PRIMARY} />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingWrapper}>
          <ActivityIndicator size="small" color={ACCENT} />
          <Text style={styles.loadingText}>Loading profile…</Text>
        </View>
      ) : errorText ? (
        <View style={styles.loadingWrapper}>
          <Text style={styles.errorText}>{errorText}</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header: avatar + stats + bio from Supabase */}
          {profile && (
            <ProfileHeaderSection
              fullName={fullName}
              username={profile.username}
              bio={profile.bio}
              profileImageUrl={profile.profile_image_url}
              stats={stats}
              isOwnProfile={true}
              onEditProfile={() => router.push('/profile/edit')}
            />
          )}

          {/* Lifetime stat badges */}
          <View style={styles.lifetimeCard}>
            <Text style={styles.sectionTitle}>Lifetime Stats</Text>
            <View style={styles.lifetimeRow}>
              <LifetimeStat
                label="Workouts"
                value="0"
                icon="barbell-outline"
              />
              <LifetimeStat label="Miles" value="0" icon="trail-sign-outline" />
              <LifetimeStat
                label="Lbs Lifted"
                value="0"
                icon="fitness-outline"
              />
            </View>
          </View>

          {/* Detail tabs */}
          {renderDetailTabs()}

          {/* Tab content */}
          {detailTab === 'grid' && renderGridPosts()}
          {detailTab === 'stats' && renderActivityStats()}
          {detailTab === 'calendar' && <GoalCalendar />}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ---------- SMALL COMPONENTS ----------

function LifetimeStat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: any;
}) {
  return (
    <View style={styles.lifetimeStat}>
      <Ionicons name={icon} size={20} color={TEXT_MUTED} />
      <Text style={styles.lifetimeValue}>{value}</Text>
      <Text style={styles.lifetimeLabel}>{label}</Text>
    </View>
  );
}

function TabButton({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon: any;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.tabButton, active && styles.tabButtonActive]}
      onPress={onPress}
    >
      <Ionicons
        name={icon}
        size={18}
        color={active ? TEXT_PRIMARY : TEXT_MUTED}
      />
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ---------- STYLES ----------

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BG,
  },
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    backgroundColor: BG,
  },
  topBarUsername: {
    color: TEXT_PRIMARY,
    fontSize: 18,
    fontWeight: '700',
  },
  topBarIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    padding: 6,
    borderRadius: 20,
  },

  // Loading / error
  loadingWrapper: {
    flex: 1,
    backgroundColor: BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: TEXT_MUTED,
    fontSize: 13,
    marginTop: 8,
  },
  errorText: {
    color: '#FCA5A5',
    fontSize: 13,
    paddingHorizontal: 16,
    textAlign: 'center',
  },

  // Lifetime stats
  lifetimeCard: {
    backgroundColor: CARD,
    borderRadius: 16,
    padding: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: BORDER,
  },
  sectionTitle: {
    color: TEXT_MUTED,
    fontSize: 12,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  lifetimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  lifetimeStat: {
    flex: 1,
    alignItems: 'center',
  },
  lifetimeValue: {
    color: TEXT_PRIMARY,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 4,
  },
  lifetimeLabel: {
    color: TEXT_MUTED,
    fontSize: 11,
    marginTop: 2,
  },

  // Detail tabs
  detailTabs: {
    flexDirection: 'row',
    marginTop: 18,
    backgroundColor: CARD,
    borderRadius: 999,
    padding: 4,
    borderWidth: 1,
    borderColor: BORDER,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 999,
    gap: 6,
  },
  tabButtonActive: {
    backgroundColor: '#1F2937',
  },
  tabLabel: {
    color: TEXT_MUTED,
    fontSize: 12,
    fontWeight: '500',
  },
  tabLabelActive: {
    color: TEXT_PRIMARY,
  },

  // Empty-state cards
  emptyStateCard: {
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
  },
  emptyStateTitle: {
    color: TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  emptyStateText: {
    color: TEXT_MUTED,
    fontSize: 12,
    lineHeight: 18,
  },
});
