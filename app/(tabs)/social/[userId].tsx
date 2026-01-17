// app/(tabs)/social/[userId].tsx
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
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import dayjs, { Dayjs } from 'dayjs';
import Svg, { Circle } from 'react-native-svg';

import { Colors } from '@/constants/Colors';
import LogoHeader from '@/components/my components/logoHeader';

import ProfileHeaderSection, {
  type ProfileStats,
  type ProfilePrimaryAction,
} from '../profile/components/ProfileHeaderSection';
import LifetimeStatsTable from '../profile/components/LifetimeStatsTable';
import ActivityGrid from '../profile/components/ActivityGrid';

import { supabase } from '@/lib/supabase';
import {
  getMyUserId,
  getPublicProfileByUserId,
  getFollowStatus,
  followOrRequest,
  unfollowOrCancel,
  type PublicProfile,
  type FollowStatus,
} from '@/lib/social/api';

// ----- Constants -----
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

export default function ViewProfileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const userIdParam =
    typeof params.userId === 'string'
      ? params.userId
      : Array.isArray(params.userId)
      ? params.userId[0]
      : '';

  const [detailTab, setDetailTab] = useState<DetailTab>('stats');

  const [meId, setMeId] = useState<string | null>(null);

  // This comes from your RPC (get_profile_card) via getPublicProfileByUserId()
  const [profile, setProfile] = useState<PublicProfile | null>(null);

  const [stats, setStats] = useState<ProfileStats>({ posts: 0, followers: 0, following: 0 });

  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState<string | null>(null);

  const [followStatus, setFollowStatus] = useState<FollowStatus>('none');
  const [followBusy, setFollowBusy] = useState(false);

  // Calendar state (in case RLS blocks goal reads, we show a gentle message)
  const [goalsBlocked, setGoalsBlocked] = useState(false);

  const fullName = useMemo(() => {
    if (!profile) return '';
    return profile.display_name || profile.username || '';
  }, [profile]);

  const goBack = () => router.back();

  // 1) Load viewer id
  useEffect(() => {
    getMyUserId()
      .then((id) => setMeId(id))
      .catch(() => setMeId(null));
  }, []);

  // 2) Load profile card via RPC-friendly API (avoids RLS headaches on public.profiles)
  const loadProfile = useCallback(async () => {
    if (!userIdParam) return;
    try {
      setLoading(true);
      setErrorText(null);

      const p = await getPublicProfileByUserId(userIdParam);
      if (!p) {
        setProfile(null);
        setErrorText('User not found');
        return;
      }

      setProfile(p);
      setStats({ posts: 0, followers: 0, following: 0 }); // stub for now
    } catch (err: any) {
      console.error('[ViewProfile] loadProfile failed', err);
      setProfile(null);
      setErrorText(formatSupabaseErr(err));
    } finally {
      setLoading(false);
    }
  }, [userIdParam]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // 3) Load follow status once we know meId + profile.id
  const refreshFollowStatus = useCallback(async () => {
    if (!meId || !profile?.id) return;
    if (meId === profile.id) {
      setFollowStatus('none');
      return;
    }
    try {
      const s = await getFollowStatus(meId, profile.id);
      setFollowStatus(s);
    } catch {
      setFollowStatus('none');
    }
  }, [meId, profile?.id]);

  useEffect(() => {
    refreshFollowStatus();
  }, [refreshFollowStatus]);

  // Can we show the “full” profile content?
  // - Public profiles: yes
  // - Private profiles: only if followStatus === 'accepted'
  // - If viewing own profile through this route: yes (rare, but safe)
  const canViewContent = useMemo(() => {
    if (!profile) return false;
    if (meId && profile.id === meId) return true;
    if (!profile.is_private) return true;
    return followStatus === 'accepted';
  }, [profile, meId, followStatus]);

  // Build header actions (Follow / Requested / Following) using your existing social/api helpers
  const primaryAction: ProfilePrimaryAction = useMemo(() => {
    if (!profile) return null;
    if (!meId) return null;
    if (profile.id === meId) return null;

    if (followStatus === 'none') {
      return {
        label: profile.is_private ? 'Request' : 'Follow',
        variant: 'primary',
        disabled: followBusy,
        onPress: async () => {
          try {
            setFollowBusy(true);
            await followOrRequest(meId, profile.id, profile.is_private);
            setFollowStatus(profile.is_private ? 'requested' : 'accepted');
          } finally {
            setFollowBusy(false);
          }
        },
      };
    }

    if (followStatus === 'requested') {
      return {
        label: 'Requested',
        variant: 'outline',
        disabled: true,
        onPress: () => {},
      };
    }

    // accepted
    return {
      label: 'Following',
      variant: 'outline',
      disabled: followBusy,
      onPress: () => {},
    };
  }, [profile, meId, followStatus, followBusy]);

  const secondaryAction: ProfilePrimaryAction = useMemo(() => {
    if (!profile) return null;
    if (!meId) return null;
    if (profile.id === meId) return null;

    if (followStatus === 'requested') {
      return {
        label: 'Cancel',
        variant: 'outline',
        disabled: followBusy,
        onPress: async () => {
          try {
            setFollowBusy(true);
            await unfollowOrCancel(meId, profile.id);
            setFollowStatus('none');
          } finally {
            setFollowBusy(false);
          }
        },
      };
    }

    if (followStatus === 'accepted') {
      return {
        label: 'Unfollow',
        variant: 'secondary',
        disabled: followBusy,
        onPress: async () => {
          try {
            setFollowBusy(true);
            await unfollowOrCancel(meId, profile.id);
            setFollowStatus('none');
          } finally {
            setFollowBusy(false);
          }
        },
      };
    }

    return null;
  }, [profile, meId, followStatus, followBusy]);

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
      {profile ? (
        <ProfileHeaderSection
          fullName={fullName}
          username={profile.username}
          bio={profile.bio}
          profileImageUrl={profile.profile_image_url}
          stats={stats}
          isOwnProfile={false} // NEVER allow edit/settings on other users from this screen
          primaryAction={primaryAction}
          secondaryAction={secondaryAction}
        />
      ) : null}

      {/* Tabs only if you can view the content */}
      {profile && canViewContent ? renderDetailTabs() : null}

      <View style={styles.headerDivider} />
    </>
  );

  const renderPrivatePlaceholder = () => {
    if (!profile) return null;
    return (
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {renderHeaderBlock()}
        <View style={styles.privateWrap}>
          <Ionicons name="lock-closed-outline" size={60} color={TEXT_MUTED} />
          <Text style={styles.privateTitle}>This account is private</Text>
          <Text style={styles.privateDesc}>
            Follow @{profile.username} to see their activity.
          </Text>
        </View>
      </ScrollView>
    );
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.stateWrap}>
          <ActivityIndicator size="small" color={ACCENT} />
          <Text style={styles.stateText}>Loading profile…</Text>
        </View>
      );
    }

    if (errorText) {
      return (
        <View style={styles.stateWrap}>
          <Text style={styles.errorText}>{errorText}</Text>
        </View>
      );
    }

    if (!profile) {
      return (
        <View style={styles.stateWrap}>
          <Text style={styles.stateText}>Profile not found.</Text>
        </View>
      );
    }

    // Private + not accepted => show private view
    if (!canViewContent) {
      return renderPrivatePlaceholder();
    }

    // Public (or accepted private)
    if (detailTab === 'stats') {
      return <ActivityGrid userId={profile.id} header={renderHeaderBlock()} />;
    }

    if (detailTab === 'lifetime') {
      return (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {renderHeaderBlock()}
          <LifetimeStatsTable userId={profile.id} />
        </ScrollView>
      );
    }

    // Calendar tab
    return (
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {renderHeaderBlock()}

        {goalsBlocked ? (
          <View style={styles.blockedNote}>
            <Ionicons name="information-circle-outline" size={16} color={TEXT_MUTED} />
            <Text style={styles.blockedNoteText}>
              Goals aren’t available to view for this user yet.
            </Text>
          </View>
        ) : null}

        <UserGoalCalendar
          userId={profile.id}
          onBlocked={() => setGoalsBlocked(true)}
        />
      </ScrollView>
    );
  };

  return (
    <LinearGradient
      colors={['#3a3a3bff', '#1e1e1eff', BG]}
      start={{ x: 0.2, y: 0 }}
      end={{ x: 0.8, y: 1 }}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.headerTop}>
          <LogoHeader />
          <View style={styles.topBarIcons} pointerEvents="box-none">
            <TouchableOpacity onPress={goBack} style={styles.iconButton}>
              <Ionicons name="chevron-back" size={22} color={TEXT_PRIMARY} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.body}>{renderContent()}</View>
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

// ----- Custom GoalCalendar for arbitrary users -----

function UserGoalCalendar({
  userId,
  initialMonth,
  onBlocked,
}: {
  userId: string;
  initialMonth?: Dayjs;
  onBlocked?: () => void;
}) {
  const [currentMonth, setCurrentMonth] = useState<Dayjs>(initialMonth ?? dayjs());
  const [goalData, setGoalData] = useState<Record<string, GoalFlags>>({});
  const [loadingGoals, setLoadingGoals] = useState(false);

  const fetchMonthGoals = useCallback(async () => {
    if (!userId) return;
    setLoadingGoals(true);

    try {
      const start = currentMonth.startOf('month').format('YYYY-MM-DD');
      const end = currentMonth.endOf('month').format('YYYY-MM-DD');

      const { data, error } = await supabase
        .schema('user')
        .from('daily_goal_results')
        .select('*')
        .eq('user_id', userId)
        .gte('date', start)
        .lte('date', end);

      if (error) throw error;

      const map: Record<string, GoalFlags> = {};
      (data as DailyGoalResultsRow[] | null)?.forEach((row) => {
        const derived = deriveFlags(row);
        if (!derived) return;
        map[derived.key] = derived.flags;
      });

      setGoalData(map);
    } catch (err: any) {
      // Most likely RLS blocks viewing other users’ goals.
      console.warn('[UserGoalCalendar] fetchMonthGoals failed', err);
      setGoalData({});
      onBlocked?.();
    } finally {
      setLoadingGoals(false);
    }
  }, [userId, currentMonth, onBlocked]);

  useEffect(() => {
    fetchMonthGoals();
  }, [fetchMonthGoals]);

  const calendarDays = useMemo(() => {
    const startOfMonth = currentMonth.startOf('month');
    const daysInMonth = currentMonth.daysInMonth();
    const offset = startOfMonth.day();

    const days: (number | null)[] = [];
    for (let i = 0; i < offset; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);
    while (days.length % 7 !== 0) days.push(null);

    return days;
  }, [currentMonth]);

  const weeks: (number | null)[][] = [];
  for (let i = 0; i < calendarDays.length; i += 7) {
    weeks.push(calendarDays.slice(i, i + 7));
  }

  return (
    <View style={calendarStyles.calendarContainer}>
      <View style={calendarStyles.calendarHeader}>
        <TouchableOpacity
          onPress={() => setCurrentMonth((m) => m.subtract(1, 'month'))}
          style={calendarStyles.monthNavBtn}
        >
          <Ionicons name="chevron-back" size={18} color={TEXT_MUTED} />
        </TouchableOpacity>

        <Text style={calendarStyles.monthTitle}>{currentMonth.format('MMMM YYYY')}</Text>

        <TouchableOpacity
          onPress={() => setCurrentMonth((m) => m.add(1, 'month'))}
          style={calendarStyles.monthNavBtn}
        >
          <Ionicons name="chevron-forward" size={18} color={TEXT_MUTED} />
        </TouchableOpacity>
      </View>

      <View style={calendarStyles.weekdayRow}>
        {WEEKDAYS.map((d, i) => (
          <Text key={`${d}-${i}`} style={calendarStyles.weekdayLabel}>
            {d}
          </Text>
        ))}
      </View>

      {loadingGoals && (
        <View style={calendarStyles.loadingRow}>
          <ActivityIndicator size="small" color={TEXT_MUTED} />
          <Text style={calendarStyles.loadingText}>Syncing goals…</Text>
        </View>
      )}

      <View style={calendarStyles.weeksWrapper}>
        {weeks.map((week, wi) => (
          <View key={`week-${wi}`} style={calendarStyles.calendarRow}>
            {week.map((day, di) => {
              if (!day) {
                return <View key={`empty-${wi}-${di}`} style={calendarStyles.calendarCellEmpty} />;
              }

              const dateObj = currentMonth.date(day);
              const key = dateObj.format('YYYY-MM-DD');
              const flags = goalData[key];

              return (
                <View key={`day-${wi}-${di}`} style={calendarStyles.calendarCell}>
                  <GoalRings flags={flags} />
                  <Text style={calendarStyles.calendarDayText}>{day}</Text>
                </View>
              );
            })}
          </View>
        ))}
      </View>

      <View style={calendarStyles.legendRow}>
        <LegendItem color={GOAL_COLORS.strength} label="Strength ring closed" />
        <LegendItem color={GOAL_COLORS.cardio} label="Cardio ring closed" />
        <LegendItem color={GOAL_COLORS.nutrition} label="Nutrition ring closed" />
      </View>
    </View>
  );
}

// ---- Goal ring logic ----
type RingStatus = { active: boolean; met: boolean };
type GoalFlags = { strength: RingStatus; cardio: RingStatus; nutrition: RingStatus };

type DailyGoalResultsRow = {
  date?: string;
  goal_date?: string;

  strength_use_time?: boolean | null;
  strength_use_volume?: boolean | null;
  met_strength_time?: boolean | null;
  met_strength_volume?: boolean | null;

  cardio_use_time?: boolean | null;
  cardio_use_distance?: boolean | null;
  met_cardio_time?: boolean | null;
  met_cardio_distance?: boolean | null;

  protein_enabled?: boolean | null;
  carbs_enabled?: boolean | null;
  fats_enabled?: boolean | null;
  calorie_goal_mode?: string | null;

  met_protein?: boolean | null;
  met_carbs?: boolean | null;
  met_fats?: boolean | null;
  met_calories?: boolean | null;

  strength_met?: boolean | null;
  cardio_met?: boolean | null;
  nutrition_met?: boolean | null;
};

const GOAL_COLORS = {
  strength: '#F97373',
  cardio: '#38BDF8',
  nutrition: '#FACC15',
};

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const asBool = (v: unknown) => v === true;

function deriveRingStatus(opts: { enabled: boolean[]; met: boolean[] }): RingStatus {
  const active = opts.enabled.some(Boolean);
  if (!active) return { active: false, met: false };

  for (let i = 0; i < opts.enabled.length; i++) {
    if (opts.enabled[i] && !opts.met[i]) return { active: true, met: false };
  }

  return { active: true, met: true };
}

function deriveFlags(row: DailyGoalResultsRow): { key: string; flags: GoalFlags } | null {
  const key = row.date ?? row.goal_date;
  if (!key) return null;

  const hasAggregate =
    typeof row.strength_met === 'boolean' ||
    typeof row.cardio_met === 'boolean' ||
    typeof row.nutrition_met === 'boolean';

  if (hasAggregate) {
    return {
      key,
      flags: {
        strength: { active: true, met: asBool(row.strength_met) },
        cardio: { active: true, met: asBool(row.cardio_met) },
        nutrition: { active: true, met: asBool(row.nutrition_met) },
      },
    };
  }

  const strengthEnabled = [asBool(row.strength_use_time), asBool(row.strength_use_volume)];
  const strengthMet = [asBool(row.met_strength_time), asBool(row.met_strength_volume)];

  const cardioEnabled = [asBool(row.cardio_use_time), asBool(row.cardio_use_distance)];
  const cardioMet = [asBool(row.met_cardio_time), asBool(row.met_cardio_distance)];

  const calorieEnabled =
    row.calorie_goal_mode != null && String(row.calorie_goal_mode).toLowerCase() !== 'disabled';

  const nutritionEnabled = [
    asBool(row.protein_enabled),
    asBool(row.carbs_enabled),
    asBool(row.fats_enabled),
    calorieEnabled,
  ];
  const nutritionMet = [
    asBool(row.met_protein),
    asBool(row.met_carbs),
    asBool(row.met_fats),
    asBool(row.met_calories),
  ];

  return {
    key,
    flags: {
      strength: deriveRingStatus({ enabled: strengthEnabled, met: strengthMet }),
      cardio: deriveRingStatus({ enabled: cardioEnabled, met: cardioMet }),
      nutrition: deriveRingStatus({ enabled: nutritionEnabled, met: nutritionMet }),
    },
  };
}

function GoalRings({ flags }: { flags?: GoalFlags }) {
  const strength = flags?.strength ?? { active: false, met: false };
  const cardio = flags?.cardio ?? { active: false, met: false };
  const nutrition = flags?.nutrition ?? { active: false, met: false };

  return (
    <View style={calendarStyles.ringsWrap}>
      <Svg width={26} height={26} viewBox="0 0 32 32">
        <Ring r={13} strokeWidth={3} active={strength.active} met={strength.met} color={GOAL_COLORS.strength} />
        <Ring r={9} strokeWidth={3} active={cardio.active} met={cardio.met} color={GOAL_COLORS.cardio} />
        <Ring r={5} strokeWidth={3} active={nutrition.active} met={nutrition.met} color={GOAL_COLORS.nutrition} />
      </Svg>
    </View>
  );
}

function Ring({
  r,
  strokeWidth,
  active,
  met,
  color,
}: {
  r: number;
  strokeWidth: number;
  active: boolean;
  met: boolean;
  color: string;
}) {
  const baseOpacity = active ? 0.85 : 0.35;
  return (
    <>
      <Circle cx={16} cy={16} r={r} fill="none" stroke={BORDER} strokeWidth={strokeWidth} opacity={baseOpacity} />
      {met ? <Circle cx={16} cy={16} r={r} fill="none" stroke={color} strokeWidth={strokeWidth} /> : null}
    </>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <View style={calendarStyles.legendItem}>
      <View style={[calendarStyles.legendDot, { backgroundColor: color }]} />
      <Text style={calendarStyles.legendLabel}>{label}</Text>
    </View>
  );
}

// ----- Styles -----
const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  flex: { flex: 1 },

  headerTop: { paddingBottom: 4 },
  topBarIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute',
    right: 20,
    top: 10,
  },
  iconButton: { padding: 6, borderRadius: 20 },

  body: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 32 },

  stateWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BG,
    gap: 10,
  },
  stateText: { color: TEXT_MUTED, fontSize: 13 },
  errorText: { color: '#FCA5A5', fontSize: 13, paddingHorizontal: 16, textAlign: 'center' },

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
    backgroundColor: Colors.dark.card2 ?? 'rgba(255,255,255,0.06)',
  },
  tabLabel: { color: TEXT_MUTED, fontSize: 12, fontWeight: '600' },
  tabLabelActive: { color: TEXT_PRIMARY },

  headerDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginTop: 12,
  },

  privateWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 40,
    paddingHorizontal: 16,
    gap: 12,
  },
  privateTitle: { color: TEXT_PRIMARY, fontSize: 16, fontWeight: '800' },
  privateDesc: { color: TEXT_MUTED, fontSize: 13, textAlign: 'center' },

  blockedNote: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.03)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  blockedNoteText: {
    flex: 1,
    color: TEXT_MUTED,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
});

const calendarStyles = StyleSheet.create({
  calendarContainer: {
    marginTop: 16,
    backgroundColor: CARD,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: BORDER,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  monthTitle: { color: TEXT_PRIMARY, fontSize: 14, fontWeight: '600' },
  monthNavBtn: { padding: 4, borderRadius: 999 },

  weekdayRow: { flexDirection: 'row', marginTop: 8 },
  weekdayLabel: { flex: 1, textAlign: 'center', color: TEXT_MUTED, fontSize: 11 },

  loadingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 6 },
  loadingText: { color: TEXT_MUTED, fontSize: 11 },

  weeksWrapper: { marginTop: 6 },
  calendarRow: { flexDirection: 'row', marginBottom: 6 },

  calendarCellEmpty: { flex: 1, aspectRatio: 1, marginHorizontal: 2 },
  calendarCell: {
    flex: 1,
    aspectRatio: 1,
    marginHorizontal: 2,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },

  ringsWrap: { width: 26, height: 26, alignItems: 'center', justifyContent: 'center' },
  calendarDayText: { color: TEXT_PRIMARY, fontSize: 11, marginTop: 2 },

  legendRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { color: TEXT_MUTED, fontSize: 10, fontWeight: '600' },
});
