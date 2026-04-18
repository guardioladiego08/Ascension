// app/(tabs)/social/[userId].tsx
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import dayjs, { Dayjs } from 'dayjs';
import Svg, { Circle } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';

import LogoHeader from '@/components/my components/logoHeader';
import { useAppTheme } from '@/providers/AppThemeProvider';

import ProfileHeaderSection, {
  type ProfileStats,
  type ProfilePrimaryAction,
} from '../profile/components/ProfileHeaderSection';
import LifetimeStatsTable from '../profile/components/LifetimeStatsTable';
import ActivityGrid from '../profile/components/ActivityGrid';

import { supabase } from '@/lib/supabase';
import { useSmartBack } from '@/lib/navigation/useSmartBack';
import {
  getMyUserId,
  getPublicProfileByUserId,
  getFollowStatus,
  followOrRequest,
  unfollowOrCancel,
  type PublicProfile,
  type FollowStatus,
} from '@/lib/social/api';
import { getSocialCounts } from '@/lib/social/feed';
import {
  computeRings,
  type DailyGoalResults,
  type Rings,
} from '@/lib/goals/goalLogic';

type DetailTab = 'stats' | 'lifetime' | 'calendar';

const DEBUG_VISITOR_PROFILE = __DEV__;

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
  const { goBackSmart } = useSmartBack();
  const { colors, fonts, globalStyles } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);
  const params = useLocalSearchParams();

  const userIdParam =
    typeof params.userId === 'string'
      ? params.userId
      : Array.isArray(params.userId)
        ? params.userId[0]
        : '';

  const logDebug = useCallback((event: string, payload?: Record<string, unknown>) => {
    if (!DEBUG_VISITOR_PROFILE) return;
    console.log('[ViewProfileDebug]', event, payload ?? {});
  }, []);

  const [detailTab, setDetailTab] = useState<DetailTab>('stats');
  const [meId, setMeId] = useState<string | null>(null);

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [stats, setStats] = useState<ProfileStats>({ posts: 0, followers: 0, following: 0 });

  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState<string | null>(null);

  const [followStatus, setFollowStatus] = useState<FollowStatus>('none');
  const [followBusy, setFollowBusy] = useState(false);

  const [goalsBlocked, setGoalsBlocked] = useState(false);

  const usernameText = useMemo(() => {
    if (!profile) return '';
    if (profile.username && profile.username.trim().length > 0) return profile.username;
    return `user_${profile.id.slice(0, 8)}`;
  }, [profile]);

  const fullName = useMemo(() => {
    if (!profile) return '';
    return profile.display_name || usernameText;
  }, [profile, usernameText]);

  const goBack = useCallback(() => {
    goBackSmart({ fallbackHref: '/social' });
  }, [goBackSmart]);

  const goToConnections = useCallback(
    (tab: 'followers' | 'following') => {
      if (!profile?.id) return;
      router.push({
        pathname: '/social/connections',
        params: { userId: profile.id, tab, username: usernameText },
      });
    },
    [profile?.id, router, usernameText]
  );

  useEffect(() => {
    logDebug('route_params', { userIdParam });
    getMyUserId()
      .then((id) => {
        setMeId(id);
        logDebug('viewer_loaded', { meId: id });
      })
      .catch((err) => {
        setMeId(null);
        logDebug('viewer_load_failed', { message: err?.message ?? String(err ?? '') });
      });
  }, [logDebug, userIdParam]);

  const loadProfile = useCallback(async () => {
    if (!userIdParam) return;

    try {
      setLoading(true);
      setErrorText(null);
      logDebug('profile_load_start', { userIdParam });

      const p = await getPublicProfileByUserId(userIdParam);
      if (!p) {
        setProfile(null);
        setErrorText('User not found');
        logDebug('profile_load_empty', { userIdParam });
        return;
      }

      setProfile(p);
      logDebug('profile_loaded', {
        profileId: p.id,
        username: p.username,
        isPrivate: p.is_private,
      });

      try {
        const socialCounts = await getSocialCounts(p.id);
        setStats(socialCounts);
        logDebug('profile_counts_loaded', {
          profileId: p.id,
          posts: socialCounts.posts,
          followers: socialCounts.followers,
          following: socialCounts.following,
        });
      } catch (countErr) {
        console.warn('[ViewProfile] social counts unavailable', countErr);
        setStats({ posts: 0, followers: 0, following: 0 });
        logDebug('profile_counts_failed', {
          profileId: p.id,
          message: (countErr as any)?.message ?? String(countErr ?? ''),
        });
      }
    } catch (err: any) {
      console.error('[ViewProfile] loadProfile failed', err);
      setProfile(null);
      setErrorText(formatSupabaseErr(err));
      logDebug('profile_load_failed', {
        userIdParam,
        code: err?.code ?? null,
        message: err?.message ?? String(err ?? ''),
      });
    } finally {
      setLoading(false);
      logDebug('profile_load_done', { userIdParam });
    }
  }, [logDebug, userIdParam]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const refreshFollowStatus = useCallback(async () => {
    if (!meId || !profile?.id) return;
    if (meId === profile.id) {
      setFollowStatus('none');
      logDebug('follow_status_self_profile', { meId, profileId: profile.id });
      return;
    }

    try {
      logDebug('follow_status_load_start', { meId, profileId: profile.id });
      const s = await getFollowStatus(meId, profile.id);
      setFollowStatus(s);
      logDebug('follow_status_loaded', { meId, profileId: profile.id, followStatus: s });
    } catch {
      setFollowStatus('none');
      logDebug('follow_status_failed', { meId, profileId: profile.id });
    }
  }, [logDebug, meId, profile?.id]);

  useEffect(() => {
    refreshFollowStatus();
  }, [refreshFollowStatus]);

  const canViewContent = useMemo(() => {
    if (!profile) return false;
    if (meId && profile.id === meId) return true;
    if (!profile.is_private) return true;
    return followStatus === 'accepted';
  }, [profile, meId, followStatus]);

  const profileVisibilityRefreshToken = useMemo(() => {
    const followToken =
      followStatus === 'accepted' ? 2 : followStatus === 'requested' ? 1 : 0;
    const privateToken = profile?.is_private ? 100 : 0;
    return followToken + privateToken;
  }, [followStatus, profile?.is_private]);

  useEffect(() => {
    logDebug('visibility_eval', {
      profileId: profile?.id ?? null,
      meId: meId ?? null,
      isPrivate: profile?.is_private ?? null,
      followStatus,
      canViewContent,
      detailTab,
      loading,
      hasError: !!errorText,
    });
  }, [
    canViewContent,
    detailTab,
    errorText,
    followStatus,
    loading,
    logDebug,
    meId,
    profile?.id,
    profile?.is_private,
  ]);

  const primaryAction: ProfilePrimaryAction = useMemo(() => {
    if (!profile || !meId || profile.id === meId) return null;

    if (followStatus === 'none') {
      return {
        label: profile.is_private ? 'Request' : 'Follow',
        variant: 'primary',
        disabled: followBusy,
        onPress: async () => {
          try {
            setFollowBusy(true);
            logDebug('follow_action_start', {
              action: profile.is_private ? 'request' : 'follow',
              meId,
              profileId: profile.id,
            });
            await followOrRequest(meId, profile.id, profile.is_private);
            setFollowStatus(profile.is_private ? 'requested' : 'accepted');
            setErrorText(null);
            logDebug('follow_action_success', {
              action: profile.is_private ? 'request' : 'follow',
              meId,
              profileId: profile.id,
              nextStatus: profile.is_private ? 'requested' : 'accepted',
            });
          } catch (err: any) {
            setErrorText(formatSupabaseErr(err));
            logDebug('follow_action_failed', {
              action: profile.is_private ? 'request' : 'follow',
              meId,
              profileId: profile.id,
              code: err?.code ?? null,
              message: err?.message ?? String(err ?? ''),
            });
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

    return {
      label: 'Following',
      variant: 'outline',
      disabled: followBusy,
      onPress: () => {},
    };
  }, [profile, meId, followStatus, followBusy]);

  const secondaryAction: ProfilePrimaryAction = useMemo(() => {
    if (!profile || !meId || profile.id === meId) return null;

    if (followStatus === 'requested') {
      return {
        label: 'Cancel',
        variant: 'outline',
        disabled: followBusy,
        onPress: async () => {
          try {
            setFollowBusy(true);
            logDebug('follow_action_start', {
              action: 'cancel_request',
              meId,
              profileId: profile.id,
            });
            await unfollowOrCancel(meId, profile.id);
            setFollowStatus('none');
            setErrorText(null);
            logDebug('follow_action_success', {
              action: 'cancel_request',
              meId,
              profileId: profile.id,
              nextStatus: 'none',
            });
          } catch (err: any) {
            setErrorText(formatSupabaseErr(err));
            logDebug('follow_action_failed', {
              action: 'cancel_request',
              meId,
              profileId: profile.id,
              code: err?.code ?? null,
              message: err?.message ?? String(err ?? ''),
            });
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
            logDebug('follow_action_start', {
              action: 'unfollow',
              meId,
              profileId: profile.id,
            });
            await unfollowOrCancel(meId, profile.id);
            setFollowStatus('none');
            setErrorText(null);
            logDebug('follow_action_success', {
              action: 'unfollow',
              meId,
              profileId: profile.id,
              nextStatus: 'none',
            });
          } catch (err: any) {
            setErrorText(formatSupabaseErr(err));
            logDebug('follow_action_failed', {
              action: 'unfollow',
              meId,
              profileId: profile.id,
              code: err?.code ?? null,
              message: err?.message ?? String(err ?? ''),
            });
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
      {profile ? (
        <ProfileHeaderSection
          fullName={fullName}
          username={usernameText}
          bio={profile.bio}
          profileImageUrl={profile.profile_image_url}
          stats={stats}
          isOwnProfile={false}
          primaryAction={primaryAction}
          secondaryAction={secondaryAction}
          onPressFollowers={() => goToConnections('followers')}
          onPressFollowing={() => goToConnections('following')}
        />
      ) : null}

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
          <Ionicons name="lock-closed-outline" size={60} color={colors.textMuted} />
          <Text style={styles.privateTitle}>This account is private</Text>
          <Text style={styles.privateDesc}>
            Follow @{usernameText} to see their activity.
          </Text>
        </View>
      </ScrollView>
    );
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.stateWrap}>
          <ActivityIndicator size="small" color={colors.highlight1} />
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

    if (!canViewContent) {
      return renderPrivatePlaceholder();
    }

    if (detailTab === 'stats') {
      return (
        <ActivityGrid
          userId={profile.id}
          header={renderHeaderBlock()}
          refreshToken={profileVisibilityRefreshToken}
        />
      );
    }

    if (detailTab === 'lifetime') {
      return (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {renderHeaderBlock()}
          <LifetimeStatsTable
            userId={profile.id}
            refreshToken={profileVisibilityRefreshToken}
          />
        </ScrollView>
      );
    }

    return (
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {renderHeaderBlock()}

        {goalsBlocked ? (
          <View style={styles.blockedNote}>
            <Ionicons
              name="information-circle-outline"
              size={16}
              color={colors.textMuted}
            />
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
    <View style={[globalStyles.page, styles.container]}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.headerTop}>
          <LogoHeader showBackButton onBackPress={goBack} />
        </View>

        <View style={styles.body}>{renderContent()}</View>
      </SafeAreaView>
    </View>
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
  const { colors, fonts } = useAppTheme();
  const calendarStyles = useMemo(
    () => createCalendarStyles(colors, fonts),
    [colors, fonts]
  );
  const goalColors = useMemo(
    () => ({
      strength: colors.highlight1,
      cardio: colors.highlight2,
      nutrition: colors.highlight3,
    }),
    [colors.highlight1, colors.highlight2, colors.highlight3]
  );

  const [currentMonth, setCurrentMonth] = useState<Dayjs>(initialMonth ?? dayjs());
  const [goalData, setGoalData] = useState<Record<string, Rings>>({});
  const [loadingGoals, setLoadingGoals] = useState(false);

  const fetchMonthGoals = useCallback(async () => {
    if (!userId) return;
    setLoadingGoals(true);
    if (DEBUG_VISITOR_PROFILE) {
      console.log('[ViewProfileDebug] calendar_load_start', {
        userId,
        month: currentMonth.format('YYYY-MM'),
      });
    }

    try {
      const start = currentMonth.startOf('month').format('YYYY-MM-DD');
      const end = currentMonth.endOf('month').format('YYYY-MM-DD');

      const { data, error } = await supabase
        .schema('user')
        .rpc('list_visible_goal_calendar_user', {
          p_user_id: userId,
          p_start: start,
          p_end: end,
        });

      if (error) throw error;

      const map: Record<string, Rings> = {};
      (data as DailyGoalResults[] | null)?.forEach((row) => {
        if (!row?.date) return;
        map[row.date] = computeRings(row);
      });

      setGoalData(map);
      if (DEBUG_VISITOR_PROFILE) {
        console.log('[ViewProfileDebug] calendar_load_success', {
          userId,
          month: currentMonth.format('YYYY-MM'),
          daysWithData: Object.keys(map).length,
        });
      }
    } catch (err: any) {
      console.warn('[UserGoalCalendar] fetchMonthGoals failed', err);
      setGoalData({});
      onBlocked?.();
      if (DEBUG_VISITOR_PROFILE) {
        console.log('[ViewProfileDebug] calendar_load_failed', {
          userId,
          month: currentMonth.format('YYYY-MM'),
          code: err?.code ?? null,
          message: err?.message ?? String(err ?? ''),
        });
      }
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
          <Ionicons name="chevron-back" size={18} color={colors.textMuted} />
        </TouchableOpacity>

        <Text style={calendarStyles.monthTitle}>{currentMonth.format('MMMM YYYY')}</Text>

        <TouchableOpacity
          onPress={() => setCurrentMonth((m) => m.add(1, 'month'))}
          style={calendarStyles.monthNavBtn}
        >
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
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
          <ActivityIndicator size="small" color={colors.textMuted} />
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
                  <GoalRings
                    rings={flags}
                    styles={calendarStyles}
                    colors={goalColors}
                    borderColor={colors.border}
                    baseBg={colors.cardDark}
                  />
                  <Text style={calendarStyles.calendarDayText}>{day}</Text>
                </View>
              );
            })}
          </View>
        ))}
      </View>

      <View style={calendarStyles.legendRow}>
        <LegendItem
          color={goalColors.strength}
          label="Strength ring closed"
          styles={calendarStyles}
        />
        <LegendItem
          color={goalColors.cardio}
          label="Cardio ring closed"
          styles={calendarStyles}
        />
        <LegendItem
          color={goalColors.nutrition}
          label="Nutrition ring closed"
          styles={calendarStyles}
        />
      </View>
    </View>
  );
}

// ---- Goal ring logic ----

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function GoalRings({
  rings,
  styles,
  colors,
  borderColor,
  baseBg,
}: {
  rings?: Rings;
  styles: ReturnType<typeof createCalendarStyles>;
  colors: { strength: string; cardio: string; nutrition: string };
  borderColor: string;
  baseBg: string;
}) {
  const strength = rings?.strength ?? { active: false, closed: false };
  const cardio = rings?.cardio ?? { active: false, closed: false };
  const nutrition = rings?.nutrition ?? { active: false, closed: false };

  return (
    <View style={[styles.ringsWrap, { backgroundColor: baseBg }]}>
      <Svg width={26} height={26} viewBox="0 0 32 32">
        <Ring
          r={13}
          strokeWidth={3}
          active={strength.active}
          closed={strength.closed}
          color={colors.strength}
          borderColor={borderColor}
        />
        <Ring
          r={9}
          strokeWidth={3}
          active={cardio.active}
          closed={cardio.closed}
          color={colors.cardio}
          borderColor={borderColor}
        />
        <Ring
          r={5}
          strokeWidth={3}
          active={nutrition.active}
          closed={nutrition.closed}
          color={colors.nutrition}
          borderColor={borderColor}
        />
      </Svg>
    </View>
  );
}

function Ring({
  r,
  strokeWidth,
  active,
  closed,
  color,
  borderColor,
}: {
  r: number;
  strokeWidth: number;
  active: boolean;
  closed: boolean;
  color: string;
  borderColor: string;
}) {
  const baseOpacity = active ? 0.85 : 0.35;
  return (
    <>
      <Circle
        cx={16}
        cy={16}
        r={r}
        fill="none"
        stroke={borderColor}
        strokeWidth={strokeWidth}
        opacity={baseOpacity}
      />
      {closed ? <Circle cx={16} cy={16} r={r} fill="none" stroke={color} strokeWidth={strokeWidth} /> : null}
    </>
  );
}

function LegendItem({
  color,
  label,
  styles,
}: {
  color: string;
  label: string;
  styles: ReturnType<typeof createCalendarStyles>;
}) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

// ----- Styles -----
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
    },
    flex: {
      flex: 1,
    },
    headerTop: {
      alignItems: 'center',
      paddingHorizontal: 18,
      paddingBottom: 8,
    },
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
    body: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 16,
      paddingBottom: 32,
    },
    stateWrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background,
      gap: 10,
    },
    stateText: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 17,
    },
    errorText: {
      color: colors.danger,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 17,
      paddingHorizontal: 16,
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
      borderColor: colors.highlight1,
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
    privateWrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 40,
      paddingHorizontal: 16,
      gap: 12,
    },
    privateTitle: {
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 16,
      lineHeight: 20,
    },
    privateDesc: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 17,
      textAlign: 'center',
    },
    blockedNote: {
      marginTop: 14,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      backgroundColor: colors.card2,
      paddingHorizontal: 12,
      paddingVertical: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    blockedNoteText: {
      flex: 1,
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 16,
    },
  });
}

function createCalendarStyles(
  colors: ReturnType<typeof useAppTheme>['colors'],
  fonts: ReturnType<typeof useAppTheme>['fonts']
) {
  return StyleSheet.create({
    calendarContainer: {
      marginTop: 16,
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    calendarHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    monthTitle: {
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 14,
      lineHeight: 18,
    },
    monthNavBtn: {
      padding: 4,
      borderRadius: 999,
    },
    weekdayRow: {
      flexDirection: 'row',
      marginTop: 8,
    },
    weekdayLabel: {
      flex: 1,
      textAlign: 'center',
      color: colors.textMuted,
      fontFamily: fonts.label,
      fontSize: 11,
      lineHeight: 14,
    },
    loadingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 6,
      gap: 6,
    },
    loadingText: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 11,
      lineHeight: 14,
    },
    weeksWrapper: {
      marginTop: 6,
    },
    calendarRow: {
      flexDirection: 'row',
      marginBottom: 6,
    },
    calendarCellEmpty: {
      flex: 1,
      aspectRatio: 1,
      marginHorizontal: 2,
    },
    calendarCell: {
      flex: 1,
      aspectRatio: 1,
      marginHorizontal: 2,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    ringsWrap: {
      width: 26,
      height: 26,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 13,
    },
    calendarDayText: {
      color: colors.text,
      fontFamily: fonts.body,
      fontSize: 11,
      lineHeight: 14,
      marginTop: 2,
    },
    legendRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 12,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    legendDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    legendLabel: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 10,
      lineHeight: 13,
    },
  });
}
