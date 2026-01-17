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

import GoalCalendar from './profile/components/GoalCalendar';
import ProfileHeaderSection, { type ProfileStats } from './profile/components/ProfileHeaderSection';
import LifetimeStatsTable from './profile/components/LifetimeStatsTable';
import ActivityGrid from './profile/components/ActivityGrid';

import { getMyProfile, getBestDisplayName, type Profile } from '@/lib/profile';

const BG = Colors.dark.background;
const CARD = Colors.dark.card;
const BORDER = Colors.dark?.border ?? '#1F2937';
const TEXT_PRIMARY = Colors.dark.text;
const TEXT_MUTED = Colors.dark.textMuted ?? '#9AA4BF';
const ACCENT = Colors.dark.highlight1;

type DetailTab = 'stats' | 'lifetime' | 'calendar';

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

  const [detailTab, setDetailTab] = useState<DetailTab>('stats');
  const [profile, setProfile] = useState<Profile | null>(null);

  // No social/following yet: keep these at 0 so UI renders without backend dependencies
  const [stats, setStats] = useState<ProfileStats>({ posts: 0, followers: 0, following: 0 });

  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState<string | null>(null);

  const fullName = useMemo(() => (profile ? getBestDisplayName(profile) : ''), [profile]);

  const goToSettings = () => router.push('/profile/settings');

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      setErrorText(null);

      const row = await getMyProfile();
      setProfile(row);

      // No followers/following yet
      setStats({ posts: 0, followers: 0, following: 0 });
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
      />
      <TabButton
        label="Lifetime"
        icon="trophy-outline"
        active={detailTab === 'lifetime'}
        onPress={() => setDetailTab('lifetime')}
      />
      <TabButton
        label="Calendar"
        icon="calendar-outline"
        active={detailTab === 'calendar'}
        onPress={() => setDetailTab('calendar')}
      />
    </View>
  );

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
          onEditProfile={() => router.push('/profile/components/edit')}
        />
      )}

      {renderDetailTabs()}

      <View style={styles.headerDivider} />
    </>
  );

  const userId = profile?.id ?? '';

  return (
    <LinearGradient
      colors={['#3a3a3bff', '#1e1e1eff', BG]}
      start={{ x: 0.2, y: 0 }}
      end={{ x: 0.8, y: 1 }}
      style={styles.container}
    >
      {/* Critical fix: SafeAreaView with flex:1 so FlatList/ScrollView has height */}
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.headerTop}>
          <LogoHeader />

          <View style={styles.topBarIcons} pointerEvents="box-none">
            <TouchableOpacity onPress={goToSettings} style={styles.iconButton}>
              <Ionicons name="settings-outline" size={22} color={TEXT_PRIMARY} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Critical fix: body wrapper has flex:1 */}
        <View style={styles.body}>
          {loading ? (
            <View style={styles.stateWrap}>
              <ActivityIndicator size="small" color={ACCENT} />
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
              <GoalCalendar />
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
  flex: { flex: 1 },

  headerTop: {
    // Keep a stable top area so absolute icons don't affect layout
    paddingBottom: 4,
  },

  // Put the settings icon in the same place you had it, but inside a flexed container
  topBarIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute',
    right: 20,
    top: 10,
  },
  iconButton: {
    padding: 6,
    borderRadius: 20,
  },

  body: { flex: 1 },

  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
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
    paddingVertical: 8,
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
