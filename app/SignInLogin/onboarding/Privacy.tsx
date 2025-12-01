// app/SignInLogin/onboarding/Privacy.tsx
import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
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

export default function Privacy() {
  const router = useRouter();
  const params = useLocalSearchParams<{ authUserId?: string }>();
  const authUserId = Array.isArray(params.authUserId)
    ? params.authUserId[0]
    : params.authUserId;

  const [accepted, setAccepted] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleContinue = async () => {
    if (!authUserId) {
      Alert.alert('Error', 'No user ID found. Please log in again.');
      return;
    }
    if (!accepted) {
      Alert.alert('Please confirm', 'You must acknowledge our privacy policy to continue.');
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .schema('user')
      .from('profiles')
      .update({
        privacy_accepted: true,
      })
      .eq('auth_user_id', authUserId);

    setSaving(false);

    if (error) {
      console.log('save privacy error', error);
      Alert.alert('Error', error.message);
      return;
    }

    router.push({
      pathname: './Paywall',
      params: { authUserId },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="shield-checkmark-outline" size={24} color={TEXT_MUTED} />
          <Text style={styles.headerTitle}>Your privacy</Text>
        </View>
        <Text style={styles.stepText}>Step 4 of 5</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.bodyText}>
          We take your data privacy seriously. Tensr only uses your data to help you track your
          training, understand your performance, and connect with friends if you choose.
        </Text>
        <Text style={[styles.bodyText, { marginTop: 8 }]}>
          You can adjust what you share at any time in Settings. Please review our full Privacy
          Policy in the app.
        </Text>

        <TouchableOpacity
          style={[styles.checkboxRow]}
          onPress={() => setAccepted((x) => !x)}
        >
          <View style={[styles.checkbox, accepted && styles.checkboxChecked]}>
            {accepted && <Ionicons name="checkmark" size={14} color="#020817" />}
          </View>
          <Text style={styles.checkboxLabel}>
            I understand how my data is used and agree to the Privacy Policy.
          </Text>
        </TouchableOpacity>
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
  bodyText: { color: TEXT_PRIMARY, fontSize: 14, lineHeight: 20 },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    gap: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#3A465E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
  },
  checkboxLabel: {
    flex: 1,
    color: TEXT_MUTED,
    fontSize: 13,
  },
  primaryButton: {
    marginTop: 18,
    backgroundColor: PRIMARY,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryText: { color: '#020817', fontWeight: '600', fontSize: 15 },
});
