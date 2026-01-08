// app/(tabs)/profile.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';

import { Colors } from '@/constants/Colors';
import LogoHeader from '@/components/my components/logoHeader';
import { supabase } from '@/lib/supabase';

import GoalCalendar from './profile/components/GoalCalendar';
import ProfileHeaderSection from './profile/components/ProfileHeaderSection';
import LifetimeStatsCard from './profile/components/LifetimeStatsCard';
import ActivityGrid from './profile/components/ActivityGrid';

const BG = Colors.dark.background;
const CARD = Colors.dark.card;
const BORDER = Colors.dark?.border ?? '#1F2937';
const TEXT_PRIMARY = Colors.dark.text;
const TEXT_MUTED = Colors.dark.textMuted ?? '#9AA4BF';
const ACCENT = Colors.dark.highlight1;

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

// Removed "grid" tab
type DetailTab = 'stats' | 'calendar';

export default function ProfileScreen() {
  const router = useRouter();

  // Default to Activity (since Posts removed)
  const [detailTab, setDetailTab] = useState<DetailTab>('stats');
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [stats, setStats] = useState<ProfileStats>({ posts: 0, followers: 0, following: 0 });
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState<string | null>(null);

  const username = useMemo(() => profile?.username ?? 'user', [profile]);
  const fullName = useMemo(() => {
    if (!profile) return '';
    return [profile.first_name, profile.last_name].filter(Boolean).join(' ');
  }, [profile]);

  const goToSettings = () => router.push('/profile/settings');

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      setErrorText(null);

      const { data: userRes, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      if (!userRes?.user) throw new Error('Not signed in');

      const user = userRes.user;

      const { data, error } = await supabase
        .schema('user')
        .from('profiles')
        .select('id, auth_user_id, first_name, last_name, username, bio, profile_image_url')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error('Profile not found for current user.');

      setProfile(data as ProfileRow);

      // You can wire these later (posts/followers/following)
      // setStats(...)
    } catch (err: any) {
      console.error('[Profile] loadProfile failed', err);
      setErrorText(err?.message ?? 'Failed to load profile');
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
      />
      <TabButton
        label="Calendar"
        icon="calendar-outline"
        active={detailTab === 'calendar'}
        onPress={() => setDetailTab('calendar')}
      />
    </View>
  );

  /**
   * This header block is used both by:
   * - ScrollView (Calendar)
   * - ActivityGrid FlatList (Activity tab)
   */
  const renderHeaderBlock = () => (
    <>
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

      <LifetimeStatsCard />

      {renderDetailTabs()}

      {/* subtle separator like IG (optional) */}
      <View style={styles.headerDivider} />
    </>
  );

  return (
    <LinearGradient
      colors={['#3a3a3bff', '#1e1e1eff', BG]}
      start={{ x: 0.2, y: 0 }}
      end={{ x: 0.8, y: 1 }}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={styles.safeArea}>
        <LogoHeader />

        {/* Top bar */}
        <View style={styles.topBar}>
          <Text style={styles.topBarUsername}>@{username}</Text>
          <View style={styles.topBarIcons}>
            <TouchableOpacity onPress={goToSettings} style={styles.iconButton}>
              <Ionicons name="settings-outline" size={22} color={TEXT_PRIMARY} />
            </TouchableOpacity>
          </View>
        </View>

        {loading ? (
          <View style={styles.stateWrap}>
            <ActivityIndicator size="small" color={ACCENT} />
            <Text style={styles.stateText}>Loading profile…</Text>
          </View>
        ) : errorText ? (
          <View style={styles.stateWrap}>
            <Text style={styles.errorText}>{errorText}</Text>
          </View>
        ) : (
          <>
            {/* Default/Primary: Activity */}
            {detailTab === 'stats' ? (
              <ActivityGrid
                userId={profile?.auth_user_id ?? ''}
                header={renderHeaderBlock()}
              />
            ) : (
              <ScrollView
                style={styles.container}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
              >
                {renderHeaderBlock()}
                <GoalCalendar />
              </ScrollView>
            )}
          </>
        )}
      </SafeAreaView>
    </LinearGradient>
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
    <TouchableOpacity style={[styles.tabButton, active && styles.tabButtonActive]} onPress={onPress}>
      <Ionicons name={icon} size={18} color={active ? TEXT_PRIMARY : TEXT_MUTED} />
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 4,
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

  stateWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BG,
    gap: 10,
  },
  stateText: {
    color: TEXT_MUTED,
    fontSize: 13,
  },
  errorText: {
    color: '#FCA5A5',
    fontSize: 13,
    paddingHorizontal: 16,
    textAlign: 'center',
  },

  // Adjusted styling for 2-tab layout
  detailTabs: {
    flexDirection: 'row',
    marginTop: 16,
    backgroundColor: CARD,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: BORDER,
    gap: 4,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8, // slightly larger since only 2 tabs
    borderRadius: 10,
    gap: 6,
  },
  tabButtonActive: {
    backgroundColor: Colors.dark.card2,
  },
  tabLabel: {
    color: TEXT_MUTED,
    fontSize: 12,
    fontWeight: '600',
  },
  tabLabelActive: {
    color: TEXT_PRIMARY,
  },

  headerDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginTop: 12,
  },
});
