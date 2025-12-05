// app/(tabs)/profile/components/ProfileHeaderSection.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Colors } from '@/constants/Colors';

const BG = Colors.dark?.background ?? '#050816';
const CARD = Colors.dark?.card ?? '#13182B';
const BORDER = Colors.dark?.border ?? '#1F2937';
const TEXT_PRIMARY = Colors.dark?.textPrimary ?? '#EAF2FF';
const TEXT_MUTED = Colors.dark?.textMuted ?? '#9AA4BF';
const ACCENT = Colors.primary ?? '#6366F1';

type ProfileHeaderSectionProps = {
  fullName?: string | null;
  username: string;
  bio?: string | null;
  profileImageUrl?: string | null;
  stats: {
    posts: number | string;
    followers: number | string;
    following: number | string;
  };
  isOwnProfile?: boolean;
  onEditProfile?: () => void;
};

const ProfileHeaderSection: React.FC<ProfileHeaderSectionProps> = ({
  fullName,
  username,
  bio,
  profileImageUrl,
  stats,
  isOwnProfile = true,
  onEditProfile,
}) => {
  const initials = React.useMemo(() => {
    if (fullName && fullName.trim().length > 0) {
      const parts = fullName.trim().split(/\s+/);
      if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return username.slice(0, 2).toUpperCase();
  }, [fullName, username]);

  const displayName =
    fullName && fullName.trim().length > 0 ? fullName : username;

  const bioIsEmpty = !bio || bio.trim().length === 0;

  const bioText = bioIsEmpty
    ? 'No bio yet. Add one to share your story and training goals.'
    : bio!;

  const primaryLabel = isOwnProfile ? 'Edit Profile' : 'Follow';
  const secondaryLabel = isOwnProfile ? 'Share Profile' : 'Message';

  const handlePrimaryPress = () => {
    if (isOwnProfile && onEditProfile) {
      onEditProfile();
    }
  };

  return (
    <View>
      {/* Avatar + stats */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarWrapper}>
          {profileImageUrl ? (
            <Image
              source={{ uri: profileImageUrl }}
              style={styles.avatarImage}
            />
          ) : (
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitials}>{initials}</Text>
            </View>
          )}
        </View>

        <View style={styles.headerStatsRow}>
          <ProfileStat label="Posts" value={String(stats.posts)} />
          <ProfileStat label="Followers" value={String(stats.followers)} />
          <ProfileStat label="Following" value={String(stats.following)} />
        </View>
      </View>

      {/* Name / username / bio */}
      <View style={styles.bioSection}>
        <Text style={styles.nameText}>{displayName}</Text>
        <Text style={styles.usernameText}>@{username}</Text>

        <Text
          style={[
            styles.bioText,
            bioIsEmpty ? styles.bioPlaceholderText : null,
          ]}
        >
          {bioText}
        </Text>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handlePrimaryPress}
          >
            <Text style={styles.primaryButtonText}>{primaryLabel}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>{secondaryLabel}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

function ProfileStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.profileStat}>
      <Text style={styles.profileStatValue}>{value}</Text>
      <Text style={styles.profileStatLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
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
  bioPlaceholderText: {
    color: TEXT_MUTED,
    fontStyle: 'italic',
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
});

export default ProfileHeaderSection;
