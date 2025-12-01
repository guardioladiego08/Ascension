// app/SignInLogin/onboarding/UserInfo.tsx
import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/Colors';

const BG = Colors.dark.background;
const CARD = Colors.dark.card;
const PRIMARY = Colors.dark.tint;
const TEXT_PRIMARY = '#EAF2FF';
const TEXT_MUTED = '#9AA4BF';

type Gender = 'male' | 'female' | 'non_binary' | 'prefer_not_to_say' | 'other';

export default function UserInfo() {
  const router = useRouter();
  const params = useLocalSearchParams<{ authUserId?: string }>();
  const paramAuthUserId = Array.isArray(params.authUserId)
    ? params.authUserId[0]
    : params.authUserId;

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dob, setDob] = useState(''); // YYYY-MM-DD
  const [gender, setGender] = useState<Gender | null>(null);
  const [saving, setSaving] = useState(false);

  const handleContinue = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Missing info', 'Please fill first name and last name.');
      return;
    }
    if (!dob.trim()) {
      Alert.alert('Date of birth', 'Please enter your date of birth.');
      return;
    }
    if (!gender) {
      Alert.alert('Gender', 'Please select a gender.');
      return;
    }

    setSaving(true);

    let authUserId = paramAuthUserId;

    // Fallback for future: if user reaches here AFTER logging in (with a session)
    if (!authUserId) {
      const { data: authData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !authData.user) {
        setSaving(false);
        Alert.alert('Error', 'No authenticated user.');
        return;
      }
      authUserId = authData.user.id;
    }

    const { error } = await supabase
    .schema('user')
    .from('profiles')
    .update({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      date_of_birth: dob.trim(),
      gender,
      onboarding_completed: false,
    })
    .eq('auth_user_id', authUserId);

    setSaving(false);

    if (error) {
      console.log('save user info error', error);
      Alert.alert('Error', error.message);
      return;
    }

    router.push({
      pathname: './BodyInfo',
      params: { authUserId },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="person-circle-outline" size={24} color={TEXT_MUTED} />
          <Text style={styles.headerTitle}>Tell us about you</Text>
        </View>
        <Text style={styles.stepText}>Step 1 of 5</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>First name</Text>
        <TextInput
          value={firstName}
          onChangeText={setFirstName}
          placeholder="Diego"
          placeholderTextColor={TEXT_MUTED}
          style={styles.input}
        />

        <Text style={styles.label}>Last name</Text>
        <TextInput
          value={lastName}
          onChangeText={setLastName}
          placeholder="Guardiola"
          placeholderTextColor={TEXT_MUTED}
          style={styles.input}
        />

        <Text style={styles.label}>Date of birth (YYYY-MM-DD)</Text>
        <TextInput
          value={dob}
          onChangeText={setDob}
          placeholder="1996-04-08"
          placeholderTextColor={TEXT_MUTED}
          style={styles.input}
        />

        <Text style={styles.label}>Gender</Text>
        <View style={styles.pillRow}>
          {[
            { value: 'male', label: 'Male' },
            { value: 'female', label: 'Female' },
            { value: 'non_binary', label: 'Non-binary' },
            { value: 'prefer_not_to_say', label: 'Prefer not to say' },
            { value: 'other', label: 'Other' },
          ].map((g) => {
            const selected = gender === g.value;
            return (
              <TouchableOpacity
                key={g.value}
                style={[styles.pill, selected && styles.pillSelected]}
                onPress={() => setGender(g.value as Gender)}
              >
                <Text
                  style={[
                    styles.pillText,
                    selected && { color: '#020817', fontWeight: '600' },
                  ]}
                >
                  {g.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <TouchableOpacity
        style={[styles.primaryButton, saving && { opacity: 0.7 }]}
        onPress={handleContinue}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="#020817" />
        ) : (
          <Text style={styles.primaryText}>Continue</Text>
        )}
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG, paddingHorizontal: 20, paddingTop: 8 },
  header: {
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 22, color: TEXT_PRIMARY, fontWeight: '700' },
  stepText: { fontSize: 12, color: TEXT_MUTED, marginTop: 4 },
  card: { backgroundColor: CARD, borderRadius: 18, padding: 18 },
  label: { fontSize: 13, color: TEXT_MUTED, marginTop: 10, marginBottom: 4 },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2C3648',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: TEXT_PRIMARY,
    fontSize: 15,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  pill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#3A465E',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  pillSelected: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  pillText: { color: TEXT_MUTED, fontSize: 12 },
  primaryButton: {
    marginTop: 18,
    backgroundColor: PRIMARY,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryText: { color: '#020817', fontWeight: '600', fontSize: 15 },
});
