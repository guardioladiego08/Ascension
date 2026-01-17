// app/profile/edit.tsx  (or app/(tabs)/profile/edit.tsx depending on routes)
import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
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

import { Colors } from '@/constants/Colors';
import {
  getMyProfile,
  updateMyProfile,
  uploadMyProfilePhotoFromUri,
  type Profile,
} from '@/lib/profile';

const BG = Colors.dark?.background ?? '#050816';
const CARD = Colors.dark?.card ?? '#13182B';
const BORDER = Colors.dark?.border ?? '#1F2937';
const TEXT_PRIMARY = Colors.dark.text
const TEXT_MUTED = Colors.dark?.textMuted ?? '#9AA4BF';
const ACCENT = Colors.dark.highlight1

export default function EditProfileScreen() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const [profile, setProfile] = useState<Profile | null>(null);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [localImageUri, setLocalImageUri] = useState<string | null>(null);

  // ---------------- LOAD PROFILE ----------------
  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        setLoading(true);
        setErrorText(null);

        const p = await getMyProfile(); // always public.profiles

        if (!isMounted) return;
        setProfile(p);

        setFirstName(p.first_name ?? '');
        setLastName(p.last_name ?? '');
        setUsername(p.username ?? '');
        setBio(p.bio ?? '');
        setProfileImageUrl(p.profile_image_url ?? null);
      } catch (err: any) {
        console.error('[EditProfile] loadProfile failed', err);
        if (isMounted) setErrorText(err?.message ?? 'Failed to load profile');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    load();
    return () => {
      isMounted = false;
    };
  }, []);

  // ---------------- IMAGE PICKERS ----------------
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

  // ---------------- SAVE PROFILE ----------------
  const handleSave = async () => {
    try {
      if (!profile) return;

      if (!username.trim()) {
        Alert.alert('Username required', 'Please enter a username.');
        return;
      }

      setSaving(true);
      setErrorText(null);

      let newProfileImageUrl = profileImageUrl;

      if (localImageUri) {
        newProfileImageUrl = await uploadMyProfilePhotoFromUri(localImageUri);
      }

      const updated = await updateMyProfile({
        first_name: firstName.trim() || null,
        last_name: lastName.trim() || null,
        username: username.trim(),
        bio: bio.trim() || null,
        profile_image_url: newProfileImageUrl ?? null,
      });

      setProfile(updated);
      setProfileImageUrl(updated.profile_image_url ?? null);
      setLocalImageUri(null);

      Alert.alert('Profile updated', 'Your profile has been saved.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      console.error('[EditProfile] handleSave failed', err);

      // If you still get a unique constraint message, surface a friendly error.
      const msg = err?.message ?? 'Failed to save profile';
      if (msg.toLowerCase().includes('duplicate') || msg.toLowerCase().includes('unique')) {
        setErrorText('That username is already taken.');
      } else {
        setErrorText(msg);
      }
    } finally {
      setSaving(false);
    }
  };

  const displayImageUri = localImageUri || profileImageUrl;

  // ---------------- RENDER ----------------
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerWrapper}>
          <ActivityIndicator size="small" color={ACCENT} />
          <Text style={styles.subtleText}>Loading profile…</Text>
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

        {/* Avatar */}
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

        {/* Form fields */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>First name</Text>
          <TextInput
            style={styles.input}
            value={firstName}
            onChangeText={setFirstName}
            placeholder="First name"
            placeholderTextColor={TEXT_MUTED}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Last name</Text>
          <TextInput
            style={styles.input}
            value={lastName}
            onChangeText={setLastName}
            placeholder="Last name"
            placeholderTextColor={TEXT_MUTED}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Username</Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="username"
            placeholderTextColor={TEXT_MUTED}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Bio</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            value={bio}
            onChangeText={setBio}
            placeholder="Tell people about your training, goals, etc."
            placeholderTextColor={TEXT_MUTED}
            multiline
            numberOfLines={4}
          />
        </View>

        <TouchableOpacity
          style={[styles.saveButton, saving && { opacity: 0.7 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.saveButtonText}>Save</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()} disabled={saving}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------- STYLES ----------------
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BG },
  container: { flex: 1, backgroundColor: BG },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32 },
  centerWrapper: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: BG },
  subtleText: { color: TEXT_MUTED, marginTop: 8, fontSize: 13 },
  title: { color: TEXT_PRIMARY, fontSize: 20, fontWeight: '700', marginBottom: 16 },
  errorText: { color: '#FCA5A5', fontSize: 13, marginBottom: 12 },

  avatarSection: { alignItems: 'center', marginBottom: 20 },
  avatar: { width: 96, height: 96, borderRadius: 48 },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPlaceholderText: { color: TEXT_MUTED, fontSize: 12 },
  avatarButtonsRow: { flexDirection: 'row', marginTop: 12, gap: 8 },

  smallButton: {
    flex: 1,
    backgroundColor: CARD,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BORDER,
  },
  smallButtonText: { color: TEXT_PRIMARY, fontSize: 12, fontWeight: '500' },

  fieldGroup: { marginBottom: 14 },
  label: { color: TEXT_MUTED, fontSize: 12, marginBottom: 4 },
  input: {
    backgroundColor: CARD,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    color: TEXT_PRIMARY,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  inputMultiline: { height: 100, textAlignVertical: 'top' },

  saveButton: { backgroundColor: ACCENT, borderRadius: 999, paddingVertical: 12, alignItems: 'center', marginTop: 12 },
  saveButtonText: { color: '#FFFFFF', fontWeight: '600', fontSize: 15 },

  cancelButton: { marginTop: 10, alignItems: 'center' },
  cancelButtonText: { color: TEXT_MUTED, fontSize: 13 },
});
