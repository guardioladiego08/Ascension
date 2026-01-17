import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '@/constants/Colors';

const CARD = Colors.dark.card;
const BORDER = Colors.dark?.border ?? '#1F2937';
const TEXT = Colors.dark.text;
const MUTED = Colors.dark.textMuted ?? '#9AA4BF';
const ACCENT = Colors.dark.highlight1;

export type ProfileStats = {
  posts: number;
  followers: number;
  following: number;
};

export type ProfilePrimaryAction =
  | { label: string; onPress: () => void; variant?: 'primary' | 'secondary' | 'outline'; disabled?: boolean }
  | null
  | undefined;

type Props = {
  fullName: string;
  username: string;
  bio?: string | null;
  profileImageUrl?: string | null;
  stats: ProfileStats;

  isOwnProfile: boolean;
  onEditProfile?: () => void;

  // For other-user profiles: Follow / Request / Following / Requested actions
  primaryAction?: ProfilePrimaryAction;
  secondaryAction?: ProfilePrimaryAction;
};

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value ?? 0}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ActionButton({
  label,
  onPress,
  variant = 'primary',
  disabled,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  disabled?: boolean;
}) {
  const style =
    variant === 'primary'
      ? styles.btnPrimary
      : variant === 'secondary'
        ? styles.btnSecondary
        : styles.btnOutline;

  const textStyle =
    variant === 'primary' ? styles.btnPrimaryText : styles.btnText;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      disabled={disabled}
      style={[styles.btnBase, style, disabled && styles.btnDisabled]}
    >
      <Text style={[textStyle, disabled && styles.btnDisabledText]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function ProfileHeaderSection({
  fullName,
  username,
  bio,
  profileImageUrl,
  stats,
  isOwnProfile,
  onEditProfile,
  primaryAction,
  secondaryAction,
}: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.avatarWrap}>
          {profileImageUrl ? (
            <Image source={{ uri: profileImageUrl }} style={styles.avatarImg} />
          ) : (
            <View style={styles.avatarFallback}>
              <Ionicons name="person" size={22} color={MUTED} />
            </View>
          )}
        </View>

        <View style={styles.statsRow}>
          <Stat label="Posts" value={stats.posts} />
          <Stat label="Followers" value={stats.followers} />
          <Stat label="Following" value={stats.following} />
        </View>
      </View>

      <View style={{ marginTop: 10 }}>
        <Text style={styles.fullName}>{fullName || username}</Text>
        <Text style={styles.username}>@{username}</Text>
        {!!bio ? <Text style={styles.bio}>{bio}</Text> : null}
      </View>

      <View style={styles.actionsRow}>
        {isOwnProfile ? (
          <ActionButton
            label="Edit Profile"
            onPress={onEditProfile ?? (() => {})}
            variant="outline"
          />
        ) : (
          <>
            {primaryAction ? (
              <ActionButton
                label={primaryAction.label}
                onPress={primaryAction.onPress}
                variant={primaryAction.variant ?? 'primary'}
                disabled={primaryAction.disabled}
              />
            ) : null}

            {secondaryAction ? (
              <ActionButton
                label={secondaryAction.label}
                onPress={secondaryAction.onPress}
                variant={secondaryAction.variant ?? 'outline'}
                disabled={secondaryAction.disabled}
              />
            ) : null}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 12,
    marginTop: 10,
  },
  topRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  avatarWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  statsRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  stat: { alignItems: 'center' },
  statValue: { color: TEXT, fontSize: 16, fontWeight: '800' },
  statLabel: { color: MUTED, fontSize: 11, marginTop: 2 },

  fullName: { color: TEXT, fontSize: 16, fontWeight: '800' },
  username: { color: MUTED, fontSize: 12, marginTop: 2 },
  bio: { color: TEXT, fontSize: 12.5, marginTop: 8, lineHeight: 17 },

  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },

  btnBase: {
    flex: 1,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  btnPrimary: {
    backgroundColor: ACCENT,
  },
  btnPrimaryText: {
    color: '#0B0F1A',
    fontSize: 13,
    fontWeight: '800',
  },
  btnSecondary: {
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  btnOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  btnText: {
    color: TEXT,
    fontSize: 13,
    fontWeight: '800',
  },
  btnDisabled: { opacity: 0.55 },
  btnDisabledText: { opacity: 0.9 },
});
