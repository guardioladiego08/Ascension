// app/SignInLogin/onboarding/Paywall.tsx
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

export default function Paywall() {
  const router = useRouter();
  const params = useLocalSearchParams<{ authUserId?: string }>();
  const authUserId = Array.isArray(params.authUserId)
    ? params.authUserId[0]
    : params.authUserId;

  const [finishing, setFinishing] = useState(false);

  const finishOnboarding = async () => {
    if (!authUserId) {
      // Fallback: if user came here later with a session
      const { data: authData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !authData.user) {
        Alert.alert('Error', 'Could not find your account. Please log in again.');
        return;
      }
      const fallbackId = authData.user.id;

      await supabase
        .schema('public')
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', fallbackId);

      router.replace('/SignInLogin/Login');
      return;
    }

    setFinishing(true);

    const { error } = await supabase
      .schema('public')
      .from('profiles')
      .update({ onboarding_completed: true })
      .eq('id', authUserId);

    setFinishing(false);

    if (error) {
      console.log('finish onboarding error', error);
      Alert.alert('Error', error.message);
      return;
    }

    router.replace('/SignInLogin/Login');
  };

  const handleSkip = async () => {
    await finishOnboarding();
  };

  const handleSubscribe = async () => {
    // TODO: hook into your subscription / IAP flow later.
    await finishOnboarding();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View />
        <Text style={styles.stepText}>Step 5 of 5</Text>
        <TouchableOpacity onPress={handleSkip} disabled={finishing}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="star-outline" size={24} color={PRIMARY} />
          <Text style={styles.headerTitle}>Unlock Tensr Premium</Text>
        </View>

        <Text style={[styles.bodyText, { marginTop: 12 }]}>
          Get deeper insights into your hybrid training: advanced strength analytics, GPS run
          breakdowns, and personalized performance recommendations.
        </Text>

        <View style={{ marginTop: 16 }}>
          <Text style={styles.bullet}>• Unlimited workout & run history</Text>
          <Text style={styles.bullet}>• Advanced performance charts</Text>
          <Text style={styles.bullet}>• Social leaderboards & badges</Text>
          <Text style={styles.bullet}>• Priority feature access</Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.primaryButton, finishing && { opacity: 0.7 }]}
        onPress={handleSubscribe}
        disabled={finishing}
      >
        {finishing ? (
          <ActivityIndicator color="#020817" />
        ) : (
          <Text style={styles.primaryText}>Continue with Premium</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryButton} onPress={handleSkip} disabled={finishing}>
        <Text style={styles.secondaryText}>Continue with free plan</Text>
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
  stepText: { fontSize: 12, color: TEXT_MUTED },
  skipText: { color: TEXT_MUTED, fontSize: 13 },
  card: { backgroundColor: CARD, borderRadius: 18, padding: 18, marginTop: 8 },
  headerTitle: { fontSize: 22, color: TEXT_PRIMARY, fontWeight: '700' },
  bodyText: { color: TEXT_PRIMARY, fontSize: 14, lineHeight: 20 },
  bullet: { color: TEXT_MUTED, fontSize: 13, marginTop: 4 },
  primaryButton: {
    marginTop: 18,
    backgroundColor: PRIMARY,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryText: { color: '#020817', fontWeight: '600', fontSize: 15 },
  secondaryButton: {
    marginTop: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#3A465E',
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryText: { color: TEXT_MUTED, fontSize: 14 },
});
