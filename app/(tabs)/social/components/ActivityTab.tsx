import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { Colors } from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import {
  getAuthedUserId,
  acceptIncomingRequest,
  declineIncomingRequest,
  unfollowOrCancel,
} from '@/lib/social';
import { getPublicProfileByUserId } from '@/lib/social/api';

type MiniProfile = {
  id: string;
  username: string;
  display_name: string;
  profile_image_url: string | null;
  is_private: boolean;
};

type FollowEdge = {
  follower_id: string;
  followee_id: string;
  status: 'requested' | 'pending' | 'accepted';
  created_at: string;
};

type ActivityRow = (FollowEdge & { user: MiniProfile } & { kind: 'incoming' | 'outgoing' | 'following' });
type NotificationKind =
  | 'follow_request'
  | 'follow_accepted'
  | 'new_follower'
  | 'unfollowed'
  | 'post_like'
  | 'post_comment'
  | 'new_post';

type NotificationRow = {
  id: string;
  actor_id: string | null;
  kind: NotificationKind;
  message: string | null;
  is_read: boolean;
  created_at: string;
  user: MiniProfile | null;
};

function formatSupabaseErr(err: any): string {
  if (!err) return 'Could not load activity.';
  const msg = typeof err?.message === 'string' ? err.message : '';
  const code = err?.code ? ` (${err.code})` : '';
  return `${msg || 'Could not load activity.'}${code}`.trim();
}

const CARD = Colors.dark.card;
const TEXT = Colors.dark.text;
const MUTED = Colors.dark.textMuted ?? '#9AA4BF';
const BORDER = Colors.dark?.border ?? '#1F2937';
const ACCENT = Colors.dark.highlight1;

type Mode = 'notifications' | 'requests' | 'following';

export default function ActivityTab() {
  const router = useRouter();

  const [meId, setMeId] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('notifications');

  const [incoming, setIncoming] = useState<Array<FollowEdge & { user: MiniProfile }>>([]);
  const [outgoing, setOutgoing] = useState<Array<FollowEdge & { user: MiniProfile }>>([]);
  const [following, setFollowing] = useState<Array<FollowEdge & { user: MiniProfile }>>([]);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);

  const [loading, setLoading] = useState(true);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

  const resolveProfiles = useCallback(async (userIds: string[]): Promise<Map<string, MiniProfile>> => {
    const ids = Array.from(new Set(userIds.filter(Boolean)));
    const pairs = await Promise.all(
      ids.map(async (id) => {
        try {
          const p = await getPublicProfileByUserId(id);
          if (!p) return null;
          const profile: MiniProfile = {
            id: p.id,
            username: p.username,
            display_name: p.display_name,
            profile_image_url: p.profile_image_url,
            is_private: p.is_private,
          };
          return [profile.id, profile] as const;
        } catch {
          return null;
        }
      })
    );

    return new Map(pairs.filter(Boolean) as Array<readonly [string, MiniProfile]>);
  }, []);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setErrorText(null);
      const uid = await getAuthedUserId();
      setMeId(uid);

      const [incomingReqRes, outgoingReqRes, followingIdsRes, notifRes] = await Promise.all([
        supabase.rpc('list_inbound_follow_requests_user', { p_limit: 100, p_offset: 0 }),
        supabase.rpc('list_outbound_follow_requests_user', { p_limit: 100, p_offset: 0 }),
        supabase.rpc('list_accepted_following_ids_user', { p_limit: 100, p_offset: 0 }),
        supabase.rpc('list_notifications_user', { p_limit: 100, p_offset: 0 }),
      ]);

      const loadErrors = [
        incomingReqRes.error,
        outgoingReqRes.error,
        followingIdsRes.error,
        notifRes.error,
      ].filter(Boolean);
      if (loadErrors.length > 0) {
        console.warn('[ActivityTab] partial load errors', loadErrors);
        setErrorText(formatSupabaseErr(loadErrors[0]));
      }

      const incomingEdges = ((incomingReqRes.data ?? []) as any[]).map((r) => ({
        follower_id: String(r.follower_id),
        followee_id: uid,
        status: 'pending' as const,
        created_at: String(r.created_at),
      }));
      const outgoingEdges = ((outgoingReqRes.data ?? []) as any[]).map((r) => ({
        follower_id: uid,
        followee_id: String(r.followee_id),
        status: 'pending' as const,
        created_at: String(r.created_at),
      }));
      const followingEdges = ((followingIdsRes.data ?? []) as any[]).map((r) => ({
        follower_id: uid,
        followee_id: String(r.followee_id),
        status: 'accepted' as const,
        created_at: String(r.created_at),
      }));
      const notifRows = (notifRes.data ?? []) as Array<{
        id: string;
        actor_id: string | null;
        kind: NotificationKind;
        message: string | null;
        is_read: boolean;
        created_at: string;
      }>;

      // map all relevant users
      const profileIds = Array.from(
        new Set([
          ...incomingEdges.map((e) => e.follower_id),
          ...outgoingEdges.map((e) => e.followee_id),
          ...followingEdges.map((e) => e.followee_id),
          ...notifRows.map((n) => n.actor_id ?? '').filter(Boolean),
        ])
      );

      const pMap = await resolveProfiles(profileIds);

      setIncoming(incomingEdges.map((e) => ({ ...e, user: pMap.get(e.follower_id)! })).filter((x) => !!x.user));
      setOutgoing(outgoingEdges.map((e) => ({ ...e, user: pMap.get(e.followee_id)! })).filter((x) => !!x.user));
      setFollowing(followingEdges.map((e) => ({ ...e, user: pMap.get(e.followee_id)! })).filter((x) => !!x.user));
      setNotifications(
        notifRows
          .map((n) => ({
            id: n.id,
            actor_id: n.actor_id,
            kind: n.kind,
            message: n.message,
            is_read: Boolean(n.is_read),
            created_at: n.created_at,
            user: n.actor_id ? (pMap.get(n.actor_id) ?? null) : null,
          }))
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      );
    } catch (e) {
      console.error('[ActivityTab] load failed', e);
      setErrorText(formatSupabaseErr(e));
    } finally {
      setLoading(false);
    }
  }, [resolveProfiles]);

  useEffect(() => {
    load();
  }, [load]);

  const requestRows = useMemo<ActivityRow[]>(() => {
    return [
      ...incoming.map((x) => ({ kind: 'incoming' as const, ...x })),
      ...outgoing.map((x) => ({ kind: 'outgoing' as const, ...x })),
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [incoming, outgoing]);

  const followingRows = useMemo<ActivityRow[]>(() => {
    return following
      .map((x) => ({ kind: 'following' as const, ...x }))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [following]);

  const onGoProfile = useCallback(
    (userId: string) => {
      router.push({ pathname: '/social/[userId]', params: { userId } });
    },
    [router]
  );

  const onAccept = useCallback(
    async (followerId: string) => {
      if (!meId) return;
      try {
        setBusyUserId(followerId);
        await acceptIncomingRequest(meId, followerId);
        await supabase.rpc('mark_follow_request_notifications_read_user', {
          p_actor_id: followerId,
        });
        await load();
      } finally {
        setBusyUserId(null);
      }
    },
    [meId, load]
  );

  const onDecline = useCallback(
    async (followerId: string) => {
      if (!meId) return;
      try {
        setBusyUserId(followerId);
        await declineIncomingRequest(meId, followerId);
        await load();
      } finally {
        setBusyUserId(null);
      }
    },
    [meId, load]
  );

  const onCancel = useCallback(
    async (followeeId: string) => {
      if (!meId) return;
      try {
        setBusyUserId(followeeId);
        await unfollowOrCancel(meId, followeeId);
        await load();
      } finally {
        setBusyUserId(null);
      }
    },
    [meId, load]
  );

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.modeRow}>
        <ModePill label="Alerts" active={mode === 'notifications'} onPress={() => setMode('notifications')} />
        <ModePill label="Requests" active={mode === 'requests'} onPress={() => setMode('requests')} />
        <ModePill label="Following" active={mode === 'following'} onPress={() => setMode('following')} />
      </View>

      {loading ? (
        <View style={styles.stateWrap}>
          <ActivityIndicator size="small" color={ACCENT} />
          <Text style={styles.stateText}>Loading…</Text>
        </View>
      ) : (
        <FlatList
          data={mode === 'notifications' ? notifications : mode === 'requests' ? requestRows : followingRows}
          keyExtractor={(i: any) => (mode === 'notifications' ? `notif:${i.id}` : `${i.kind}:${i.user.id}`)}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 18 }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          renderItem={({ item }: any) =>
            mode === 'notifications' ? (
              <NotificationCard
                row={item as NotificationRow}
                onPressProfile={(userId) => onGoProfile(userId)}
              />
            ) : (
              <RowCard
                kind={item.kind}
                user={item.user}
                busy={busyUserId === item.user.id}
                createdAt={item.created_at}
                onPressProfile={() => onGoProfile(item.user.id)}
                onAccept={item.kind === 'incoming' ? () => onAccept(item.user.id) : undefined}
                onDecline={item.kind === 'incoming' ? () => onDecline(item.user.id) : undefined}
                onCancel={
                  item.kind === 'outgoing'
                    ? () => onCancel(item.user.id)
                    : item.kind === 'following'
                      ? () => onCancel(item.user.id)
                      : undefined
                }
              />
            )
          }
          ListEmptyComponent={
            <View style={styles.stateWrap}>
              <Text style={styles.stateText}>{mode === 'notifications' ? 'No alerts yet.' : mode === 'requests' ? 'No requests yet.' : 'Not following anyone yet.'}</Text>
              {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}
            </View>
          }
        />
      )}
    </View>
  );
}

function notificationTitle(kind: NotificationKind): string {
  switch (kind) {
    case 'follow_request':
      return 'Requested to follow you';
    case 'follow_accepted':
      return 'Accepted your follow request';
    case 'new_follower':
      return 'Started following you';
    case 'unfollowed':
      return 'Stopped following you';
    case 'post_like':
      return 'Liked your post';
    case 'post_comment':
      return 'Commented on your post';
    case 'new_post':
      return 'Shared a new post';
    default:
      return 'New activity';
  }
}

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return '';
  const s = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (s < 60) return 'now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString();
}

function NotificationCard({
  row,
  onPressProfile,
}: {
  row: NotificationRow;
  onPressProfile: (userId: string) => void;
}) {
  const userLabel = row.user?.username ? `@${row.user.username}` : 'Someone';
  const sub = row.message?.trim() || notificationTitle(row.kind);
  return (
    <TouchableOpacity
      style={[styles.row, !row.is_read && styles.unreadRow]}
      activeOpacity={0.9}
      onPress={() => (row.user?.id ? onPressProfile(row.user.id) : undefined)}
    >
      {row.user?.profile_image_url ? (
        <Image source={{ uri: row.user.profile_image_url }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarFallback]}>
          <Ionicons name="notifications-outline" size={18} color={MUTED} />
        </View>
      )}

      <View style={{ flex: 1 }}>
        <Text style={styles.username}>{userLabel}</Text>
        <Text style={styles.subtitle}>{sub}</Text>
      </View>
      <Text style={styles.timeText}>{timeAgo(row.created_at)}</Text>
    </TouchableOpacity>
  );
}

function ModePill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[styles.modePill, active && styles.modePillActive]}
    >
      <Text style={[styles.modeText, active && styles.modeTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function RowCard({
  kind,
  user,
  busy,
  createdAt,
  onPressProfile,
  onAccept,
  onDecline,
  onCancel,
}: {
  kind: 'incoming' | 'outgoing' | 'following';
  user: MiniProfile;
  busy: boolean;
  createdAt: string;
  onPressProfile: () => void;
  onAccept?: () => void;
  onDecline?: () => void;
  onCancel?: () => void;
}) {
  const subtitle =
    kind === 'incoming'
      ? 'Requested to follow you'
      : kind === 'outgoing'
        ? 'Request pending'
        : 'Following';

  return (
    <TouchableOpacity style={styles.row} activeOpacity={0.9} onPress={onPressProfile}>
      {user.profile_image_url ? (
        <Image source={{ uri: user.profile_image_url }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarFallback]}>
          <Ionicons name="person" size={18} color={MUTED} />
        </View>
      )}

      <View style={{ flex: 1 }}>
        <Text style={styles.username}>@{user.username}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>

      <Text style={styles.timeText}>{timeAgo(createdAt)}</Text>

      {kind === 'incoming' ? (
        <View style={styles.actionsInline}>
          <InlineBtn label="Accept" variant="primary" disabled={busy} onPress={onAccept ?? (() => {})} />
          <InlineBtn label="Decline" variant="outline" disabled={busy} onPress={onDecline ?? (() => {})} />
        </View>
      ) : (
        <InlineBtn
          label={kind === 'following' ? 'Unfollow' : 'Cancel'}
          variant="outline"
          disabled={busy}
          onPress={onCancel ?? (() => {})}
        />
      )}
    </TouchableOpacity>
  );
}

function InlineBtn({
  label,
  variant,
  disabled,
  onPress,
}: {
  label: string;
  variant: 'primary' | 'outline';
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.inlineBtn,
        variant === 'primary' ? styles.inlineBtnPrimary : styles.inlineBtnOutline,
        disabled && { opacity: 0.55 },
      ]}
    >
      <Text style={variant === 'primary' ? styles.inlineBtnPrimaryText : styles.inlineBtnText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  modeRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
  },
  modePill: {
    flex: 1,
    height: 40,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modePillActive: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.12)',
  },
  modeText: { color: MUTED, fontSize: 13, fontWeight: '800' },
  modeTextActive: { color: TEXT },

  stateWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 18, gap: 10 },
  stateText: { color: MUTED, fontSize: 13 },
  errorText: { color: '#FCA5A5', fontSize: 12, textAlign: 'center' },

  row: {
    backgroundColor: CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  unreadRow: {
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.06)' },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },

  username: { color: TEXT, fontSize: 13.5, fontWeight: '900' },
  subtitle: { color: MUTED, fontSize: 12, marginTop: 2 },

  actionsInline: { flexDirection: 'row', gap: 8, alignItems: 'center' },

  inlineBtn: {
    height: 30,
    borderRadius: 10,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineBtnPrimary: { backgroundColor: ACCENT },
  inlineBtnPrimaryText: { color: '#0B0F1A', fontWeight: '900', fontSize: 12 },
  inlineBtnOutline: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' },
  inlineBtnText: { color: TEXT, fontWeight: '900', fontSize: 12 },
  timeText: { color: MUTED, fontSize: 11, fontWeight: '700' },
});
