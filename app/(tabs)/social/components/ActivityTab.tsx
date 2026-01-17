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
  status: 'pending' | 'accepted';
};

const CARD = Colors.dark.card;
const TEXT = Colors.dark.text;
const MUTED = Colors.dark.textMuted ?? '#9AA4BF';
const BORDER = Colors.dark?.border ?? '#1F2937';
const ACCENT = Colors.dark.highlight1;

type Mode = 'requests' | 'following';

export default function ActivityTab() {
  const router = useRouter();

  const [meId, setMeId] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('requests');

  const [incoming, setIncoming] = useState<Array<FollowEdge & { user: MiniProfile }>>([]);
  const [outgoing, setOutgoing] = useState<Array<FollowEdge & { user: MiniProfile }>>([]);
  const [following, setFollowing] = useState<Array<FollowEdge & { user: MiniProfile }>>([]);

  const [loading, setLoading] = useState(true);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const uid = await getAuthedUserId();
      setMeId(uid);

      // 1) pull raw follow edges
      const [incomingRes, outgoingRes, followingRes] = await Promise.all([
        supabase
          .schema('social')
          .from('follows')
          .select('follower_id, followee_id, status')
          .eq('followee_id', uid)
          .eq('status', 'pending'),
        supabase
          .schema('social')
          .from('follows')
          .select('follower_id, followee_id, status')
          .eq('follower_id', uid)
          .eq('status', 'pending'),
        supabase
          .schema('social')
          .from('follows')
          .select('follower_id, followee_id, status')
          .eq('follower_id', uid)
          .eq('status', 'accepted'),
      ]);

      if (incomingRes.error) throw incomingRes.error;
      if (outgoingRes.error) throw outgoingRes.error;
      if (followingRes.error) throw followingRes.error;

      const incomingEdges = (incomingRes.data ?? []) as any as FollowEdge[];
      const outgoingEdges = (outgoingRes.data ?? []) as any as FollowEdge[];
      const followingEdges = (followingRes.data ?? []) as any as FollowEdge[];

      // 2) map to profiles (batch fetch)
      const profileIds = Array.from(
        new Set([
          ...incomingEdges.map((e) => e.follower_id),
          ...outgoingEdges.map((e) => e.followee_id),
          ...followingEdges.map((e) => e.followee_id),
        ])
      );

      let profiles: MiniProfile[] = [];
      if (profileIds.length) {
        const profRes = await supabase
          .schema('public')
          .from('profiles')
          .select('id, username, display_name, profile_image_url, is_private')
          .in('id', profileIds);

        if (profRes.error) throw profRes.error;
        profiles = (profRes.data ?? []) as any as MiniProfile[];
      }

      const pMap = new Map(profiles.map((p) => [p.id, p]));

      setIncoming(incomingEdges.map((e) => ({ ...e, user: pMap.get(e.follower_id)! })).filter((x) => !!x.user));
      setOutgoing(outgoingEdges.map((e) => ({ ...e, user: pMap.get(e.followee_id)! })).filter((x) => !!x.user));
      setFollowing(followingEdges.map((e) => ({ ...e, user: pMap.get(e.followee_id)! })).filter((x) => !!x.user));
    } catch (e) {
      console.error('[ActivityTab] load failed', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const data = useMemo(() => {
    if (mode === 'requests') {
      // show incoming first then outgoing
      return [
        ...incoming.map((x) => ({ kind: 'incoming' as const, ...x })),
        ...outgoing.map((x) => ({ kind: 'outgoing' as const, ...x })),
      ];
    }
    return following.map((x) => ({ kind: 'following' as const, ...x }));
  }, [mode, incoming, outgoing, following]);

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
          data={data}
          keyExtractor={(i) => `${i.kind}:${i.user.id}`}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 18 }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          renderItem={({ item }) => (
            <RowCard
              kind={item.kind}
              user={item.user}
              busy={busyUserId === item.user.id}
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
          )}
          ListEmptyComponent={
            <View style={styles.stateWrap}>
              <Text style={styles.stateText}>
                {mode === 'requests' ? 'No requests yet.' : 'Not following anyone yet.'}
              </Text>
            </View>
          }
        />
      )}
    </View>
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
  onPressProfile,
  onAccept,
  onDecline,
  onCancel,
}: {
  kind: 'incoming' | 'outgoing' | 'following';
  user: MiniProfile;
  busy: boolean;
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
});
