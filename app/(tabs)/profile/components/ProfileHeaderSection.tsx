import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAppTheme } from '@/providers/AppThemeProvider';

export type ProfileStats = {
  posts: number;
  followers: number;
  following: number;
};

export type ProfilePrimaryAction =
  | {
      label: string;
      onPress: () => void;
      variant?: 'primary' | 'secondary' | 'outline';
      disabled?: boolean;
    }
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
  primaryAction?: ProfilePrimaryAction;
  secondaryAction?: ProfilePrimaryAction;
  onPressFollowers?: () => void;
  onPressFollowing?: () => void;
};

function Stat({
  label,
  value,
  onPress,
  styles,
}: {
  label: string;
  value: number;
  onPress?: () => void;
  styles: ReturnType<typeof createStyles>;
}) {
  const content = (
    <>
      <Text style={styles.statValue}>{value ?? 0}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity style={styles.stat} onPress={onPress} activeOpacity={0.85}>
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={styles.stat}>{content}</View>;
}

function ActionButton({
  label,
  onPress,
  variant = 'primary',
  disabled,
  styles,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  disabled?: boolean;
  styles: ReturnType<typeof createStyles>;
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
      activeOpacity={0.88}
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
  onPressFollowers,
  onPressFollowing,
}: Props) {
  const { colors, fonts } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.avatarWrap}>
          {profileImageUrl ? (
            <Image source={{ uri: profileImageUrl }} style={styles.avatarImg} />
          ) : (
            <View style={styles.avatarFallback}>
              <Ionicons name="person" size={22} color={colors.textMuted} />
            </View>
          )}
        </View>

        <View style={styles.statsRow}>
          <Stat label="Posts" value={stats.posts} styles={styles} />
          <Stat
            label="Followers"
            value={stats.followers}
            onPress={onPressFollowers}
            styles={styles}
          />
          <Stat
            label="Following"
            value={stats.following}
            onPress={onPressFollowing}
            styles={styles}
          />
        </View>
      </View>

      <View style={styles.copyBlock}>
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
            styles={styles}
          />
        ) : (
          <>
            {primaryAction ? (
              <ActionButton
                label={primaryAction.label}
                onPress={primaryAction.onPress}
                variant={primaryAction.variant ?? 'primary'}
                disabled={primaryAction.disabled}
                styles={styles}
              />
            ) : null}

            {secondaryAction ? (
              <ActionButton
                label={secondaryAction.label}
                onPress={secondaryAction.onPress}
                variant={secondaryAction.variant ?? 'outline'}
                disabled={secondaryAction.disabled}
                styles={styles}
              />
            ) : null}
          </>
        )}
      </View>
    </View>
  );
}

function createStyles(
  colors: ReturnType<typeof useAppTheme>['colors'],
  fonts: ReturnType<typeof useAppTheme>['fonts']
) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      marginTop: 10,
    },
    topRow: {
      flexDirection: 'row',
      gap: 14,
      alignItems: 'center',
    },
    avatarWrap: {
      width: 72,
      height: 72,
      borderRadius: 36,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.borderStrong,
      backgroundColor: colors.card2,
    },
    avatarImg: {
      width: '100%',
      height: '100%',
    },
    avatarFallback: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.card2,
    },
    statsRow: {
      flex: 1,
      flexDirection: 'row',
      justifyContent: 'space-around',
      backgroundColor: colors.card2,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 10,
      paddingHorizontal: 8,
    },
    stat: {
      alignItems: 'center',
      flex: 1,
    },
    statValue: {
      color: colors.text,
      fontFamily: fonts.display,
      fontSize: 18,
      lineHeight: 22,
      letterSpacing: -0.6,
    },
    statLabel: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 11,
      lineHeight: 15,
      marginTop: 2,
    },
    copyBlock: {
      marginTop: 12,
    },
    fullName: {
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 18,
      lineHeight: 22,
    },
    username: {
      color: colors.highlight1,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 16,
      marginTop: 3,
    },
    bio: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 18,
      marginTop: 8,
    },
    actionsRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 14,
    },
    btnBase: {
      flex: 1,
      height: 40,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 12,
    },
    btnPrimary: {
      backgroundColor: colors.highlight1,
    },
    btnPrimaryText: {
      color: colors.blkText,
      fontFamily: fonts.heading,
      fontSize: 13,
      lineHeight: 16,
    },
    btnSecondary: {
      backgroundColor: colors.card2,
      borderWidth: 1,
      borderColor: colors.border,
    },
    btnOutline: {
      backgroundColor: colors.card2,
      borderWidth: 1,
      borderColor: colors.borderStrong,
    },
    btnText: {
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 13,
      lineHeight: 16,
    },
    btnDisabled: {
      opacity: 0.55,
    },
    btnDisabledText: {
      opacity: 0.9,
    },
  });
}
