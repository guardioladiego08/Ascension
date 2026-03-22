import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';

import { supabase } from '@/lib/supabase';
import { uploadMyProfilePhotoFromUri } from '@/lib/profile';
import { useAppTheme } from '@/providers/AppThemeProvider';

type EditableProfile = {
  user_id: string;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  profile_image_url: string | null;
  bio: string | null;
  is_private: boolean;
};

type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'unchanged';

function sanitizeUsername(raw: string) {
  let value = (raw ?? '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

  if (value.length > 30) value = value.slice(0, 30);
  return value;
}

function formatProfileError(err: any) {
  const message = typeof err?.message === 'string' ? err.message : 'Request failed';
  const code = typeof err?.code === 'string' ? ` (${err.code})` : '';
  return `${message}${code}`;
}

export default function EditProfileScreen() {
  const router = useRouter();
  const { colors, fonts } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const [profile, setProfile] = useState<EditableProfile | null>(null);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [localImageUri, setLocalImageUri] = useState<string | null>(null);
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle');
  const [usernameHint, setUsernameHint] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        setLoading(true);
        setErrorText(null);

        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) throw authError;
        if (!user) throw new Error('Not signed in.');

        const { data, error } = await supabase
          .schema('user')
          .from('users')
          .select('user_id,username,first_name,last_name,profile_image_url,bio,is_private')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) throw error;
        if (!data) throw new Error('Profile not found for current user.');
        if (!isMounted) return;

        const loaded = data as EditableProfile;
        setProfile(loaded);
        setFirstName(loaded.first_name ?? '');
        setLastName(loaded.last_name ?? '');
        setUsername(loaded.username ?? '');
        setBio(loaded.bio ?? '');
        setProfileImageUrl(loaded.profile_image_url ?? null);
        setUsernameStatus('unchanged');
        setUsernameHint(null);
      } catch (err: any) {
        console.error('[EditProfile] loadProfile failed', err);
        if (isMounted) setErrorText(formatProfileError(err));
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void load();
    return () => {
      isMounted = false;
    };
  }, []);

  const checkUsernameAvailability = async () => {
    if (!profile) return false;

    const desired = sanitizeUsername(username);
    const current = sanitizeUsername(profile.username ?? '');

    if (!desired) {
      setUsernameStatus('taken');
      setUsernameHint('Username is required.');
      return false;
    }

    if (desired.length < 3) {
      setUsernameStatus('taken');
      setUsernameHint('Username must be at least 3 characters.');
      return false;
    }

    if (desired === current) {
      setUsernameStatus('unchanged');
      setUsernameHint(null);
      return true;
    }

    setUsernameStatus('checking');
    setUsernameHint(null);

    const [usersRes, publicProfilesRes] = await Promise.all([
      supabase
        .schema('user')
        .from('users')
        .select('user_id')
        .eq('username', desired)
        .neq('user_id', profile.user_id)
        .limit(1)
        .maybeSingle(),
      supabase
        .schema('public')
        .from('profiles')
        .select('id')
        .eq('username', desired)
        .neq('id', profile.user_id)
        .limit(1)
        .maybeSingle(),
    ]);

    if (usersRes.error) {
      throw usersRes.error;
    }

    if (publicProfilesRes.error && publicProfilesRes.error.code !== 'PGRST116') {
      console.warn('[EditProfile] public profile username check failed', publicProfilesRes.error);
    }

    const taken = Boolean(usersRes.data) || Boolean(publicProfilesRes.data);
    setUsernameStatus(taken ? 'taken' : 'available');
    setUsernameHint(taken ? 'That username is already taken.' : 'Username is available.');
    return !taken;
  };

  const pickFromLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'We need access to your photos to set a profile picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      setLocalImageUri(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'We need access to your camera to take a profile picture.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!result.canceled && result.assets.length > 0) {
      setLocalImageUri(result.assets[0].uri);
    }
  };

  const syncPublicProfile = async (userId: string, payload: { username: string; profile_image_url: string | null }) => {
    const displayName = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ').trim() || payload.username;

    const { error } = await supabase
      .schema('public')
      .from('profiles')
      .upsert(
        {
          id: userId,
          username: payload.username,
          display_name: displayName,
          profile_image_url: payload.profile_image_url,
          bio: bio.trim() || null,
          is_private: profile?.is_private ?? true,
        },
        { onConflict: 'id' }
      );

    if (error) {
      console.warn('[EditProfile] public profile sync failed', error);
    }
  };

  const handleSave = async () => {
    try {
      if (!profile) return;

      const desiredUsername = sanitizeUsername(username);
      if (!desiredUsername) {
        Alert.alert('Username required', 'Please enter a username.');
        return;
      }

      setSaving(true);
      setErrorText(null);

      const usernameAvailable = await checkUsernameAvailability();
      if (!usernameAvailable) {
        setErrorText('That username is already taken.');
        return;
      }

      let newProfileImageUrl = profileImageUrl;
      if (localImageUri) {
        newProfileImageUrl = await uploadMyProfilePhotoFromUri(localImageUri);
      }

      const updatePayload = {
        first_name: firstName.trim() || null,
        last_name: lastName.trim() || null,
        username: desiredUsername,
        bio: bio.trim() || null,
        profile_image_url: newProfileImageUrl ?? null,
      };

      const { data, error } = await supabase
        .schema('user')
        .from('users')
        .update(updatePayload)
        .eq('user_id', profile.user_id)
        .select('user_id,username,first_name,last_name,profile_image_url,bio,is_private')
        .single();

      if (error) throw error;

      const updated = data as EditableProfile;
      setProfile(updated);
      setUsername(updated.username ?? desiredUsername);
      setProfileImageUrl(updated.profile_image_url ?? null);
      setLocalImageUri(null);
      setUsernameStatus('unchanged');
      setUsernameHint(null);

      await syncPublicProfile(profile.user_id, {
        username: updated.username ?? desiredUsername,
        profile_image_url: updated.profile_image_url ?? null,
      });

      Alert.alert('Profile updated', 'Your profile has been saved.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      console.error('[EditProfile] handleSave failed', err);
      const msg = err?.message ?? 'Failed to save profile';
      if (msg.toLowerCase().includes('duplicate') || msg.toLowerCase().includes('unique')) {
        setErrorText('That username is already taken.');
        setUsernameStatus('taken');
        setUsernameHint('That username is already taken.');
      } else {
        setErrorText(formatProfileError(err));
      }
    } finally {
      setSaving(false);
    }
  };

  const displayImageUri = localImageUri || profileImageUrl;
  const sanitizedUsername = sanitizeUsername(username);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerWrapper}>
          <ActivityIndicator size="small" color={colors.highlight1} />
          <Text style={styles.subtleText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Edit Profile</Text>

        {errorText && <Text style={styles.errorText}>{errorText}</Text>}

        <View style={styles.avatarSection}>
          {displayImageUri ? (
            <Image source={{ uri: displayImageUri }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarPlaceholderText}>Add Photo</Text>
            </View>
          )}

          <View style={styles.avatarButtonsRow}>
            <TouchableOpacity style={styles.smallButton} onPress={pickFromLibrary}>
              <Text style={styles.smallButtonText}>Choose from library</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.smallButton} onPress={takePhoto}>
              <Text style={styles.smallButtonText}>Take photo</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>First name</Text>
          <TextInput
            style={styles.input}
            value={firstName}
            onChangeText={setFirstName}
            placeholder="First name"
            placeholderTextColor={colors.textMuted}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Last name</Text>
          <TextInput
            style={styles.input}
            value={lastName}
            onChangeText={setLastName}
            placeholder="Last name"
            placeholderTextColor={colors.textMuted}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Username</Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={(value) => {
              setUsername(value);
              setUsernameStatus('idle');
              setUsernameHint(null);
            }}
            onBlur={() => {
              void checkUsernameAvailability().catch((err) => {
                console.error('[EditProfile] username availability failed', err);
                setUsernameStatus('idle');
                setUsernameHint('Could not verify username right now.');
              });
            }}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="username"
            placeholderTextColor={colors.textMuted}
          />

          {!!username.trim() && sanitizedUsername !== username.trim() && (
            <Text style={styles.helperText}>Will be saved as: @{sanitizedUsername}</Text>
          )}

          {usernameStatus === 'checking' && <Text style={styles.helperText}>Checking username...</Text>}
          {usernameHint && (
            <Text
              style={[
                styles.helperText,
                usernameStatus === 'taken' ? styles.helperError : usernameStatus === 'available' ? styles.helperSuccess : null,
              ]}
            >
              {usernameHint}
            </Text>
          )}
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Bio</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            value={bio}
            onChangeText={setBio}
            placeholder="Tell people about your training, goals, etc."
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={4}
          />
        </View>

        <TouchableOpacity
          style={[styles.saveButton, saving && { opacity: 0.7 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.blkText} />
          ) : (
            <Text style={styles.saveButtonText}>Save</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()} disabled={saving}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

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
      backgroundColor: colors.background,
    },
    scrollContent: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 32,
    },
    centerWrapper: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background,
    },
    subtleText: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      marginTop: 8,
      fontSize: 13,
      lineHeight: 17,
    },
    title: {
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 20,
      lineHeight: 24,
      marginBottom: 16,
    },
    errorText: {
      color: colors.danger,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 17,
      marginBottom: 12,
    },
    avatarSection: {
      alignItems: 'center',
      marginBottom: 20,
    },
    avatar: {
      width: 96,
      height: 96,
      borderRadius: 48,
    },
    avatarPlaceholder: {
      width: 96,
      height: 96,
      borderRadius: 48,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.card2,
    },
    avatarPlaceholderText: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 16,
    },
    avatarButtonsRow: {
      flexDirection: 'row',
      marginTop: 12,
      gap: 8,
    },
    smallButton: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: 999,
      paddingVertical: 8,
      paddingHorizontal: 12,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    smallButtonText: {
      color: colors.text,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 16,
    },
    fieldGroup: {
      marginBottom: 14,
    },
    label: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 16,
      marginBottom: 4,
    },
    input: {
      backgroundColor: colors.card,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      color: colors.text,
      fontFamily: fonts.body,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      lineHeight: 18,
    },
    inputMultiline: {
      height: 100,
      textAlignVertical: 'top',
    },
    helperText: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 16,
      marginTop: 6,
    },
    helperSuccess: {
      color: colors.success,
    },
    helperError: {
      color: colors.danger,
    },
    saveButton: {
      backgroundColor: colors.highlight1,
      borderRadius: 999,
      paddingVertical: 12,
      alignItems: 'center',
      marginTop: 12,
    },
    saveButtonText: {
      color: colors.blkText,
      fontFamily: fonts.heading,
      fontSize: 15,
      lineHeight: 18,
    },
    cancelButton: {
      marginTop: 10,
      alignItems: 'center',
    },
    cancelButtonText: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 17,
    },
  });
}
