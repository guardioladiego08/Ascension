import React, { useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { Colors } from '@/constants/Colors';
import LogoHeader from '@/components/my components/logoHeader';
import GoalCalendar from './profile/components/GoalCalendar';

const BG = Colors.dark?.background ?? '#050816';
const CARD = Colors.dark?.card ?? '#13182B';
const BORDER = Colors.dark?.border ?? '#1F2937';
const TEXT_PRIMARY = Colors.dark?.textPrimary ?? '#EAF2FF';
const TEXT_MUTED = Colors.dark?.textMuted ?? '#9AA4BF';
const ACCENT = Colors.primary ?? '#6366F1';

export default function ProfileScreen() {
  const router = useRouter();
  const [detailTab, setDetailTab] = useState<'grid' | 'stats' | 'calendar'>(
    'grid'
  );

  const goToSettings = () => {
    router.push('/profile/settings');
  };

  // ---------- RENDER HELPERS ----------
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

  // For now, simple placeholders – you can wire these to Supabase later
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <LogoHeader />

      {/* Instagram-style top bar */}
      <View style={styles.topBar}>
        <Text style={styles.topBarUsername}>marcusj_fit</Text>
        <View style={styles.topBarIcons}>
          <TouchableOpacity onPress={goToSettings} style={styles.iconButton}>
            <Ionicons name="settings-outline" size={22} color={TEXT_PRIMARY} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header: avatar + stats */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarWrapper}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitials}>MJ</Text>
            </View>
          </View>

          <View style={styles.headerStatsRow}>
            <ProfileStat label="Posts" value="0" />
            <ProfileStat label="Followers" value="0" />
            <ProfileStat label="Following" value="0" />
          </View>
        </View>

        {/* Bio */}
        <View style={styles.bioSection}>
          <Text style={styles.nameText}>Marcus Johnson</Text>
          <Text style={styles.usernameText}>@marcusj_fit</Text>
          <Text style={styles.bioText}>
            Hybrid athlete in progress. Tracking strength, miles, and macros to
            hit the next level.
          </Text>

          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Follow</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Message</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Lifetime stat badges */}
        <View style={styles.lifetimeCard}>
          <Text style={styles.sectionTitle}>Lifetime Stats</Text>
          <View style={styles.lifetimeRow}>
            <LifetimeStat label="Workouts" value="0" icon="barbell-outline" />
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
    </SafeAreaView>
  );
}

// ---------- SMALL COMPONENTS ----------

function ProfileStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.profileStat}>
      <Text style={styles.profileStatValue}>{value}</Text>
      <Text style={styles.profileStatLabel}>{label}</Text>
    </View>
  );
}

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

  // Header
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  avatarWrapper: {
    marginRight: 24,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '700',
  },
  headerStatsRow: {
    flexDirection: 'row',
    flex: 1,
    justifyContent: 'space-between',
  },
  profileStat: {
    alignItems: 'center',
  },
  profileStatValue: {
    color: TEXT_PRIMARY,
    fontSize: 18,
    fontWeight: '700',
  },
  profileStatLabel: {
    color: TEXT_MUTED,
    fontSize: 12,
    marginTop: 2,
  },

  // Bio
  bioSection: {
    marginTop: 12,
  },
  nameText: {
    color: TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: '700',
  },
  usernameText: {
    color: TEXT_MUTED,
    fontSize: 13,
    marginTop: 2,
  },
  bioText: {
    color: TEXT_PRIMARY,
    fontSize: 13,
    marginTop: 6,
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 8,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: ACCENT,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  secondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: BORDER,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: TEXT_PRIMARY,
    fontWeight: '500',
    fontSize: 14,
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

  // Empty-state cards for Posts / Activity
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
