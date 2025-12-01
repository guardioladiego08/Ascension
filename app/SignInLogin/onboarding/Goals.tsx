// app/SignInLogin/onboarding/Goals.tsx
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

const REASONS = [
  'track_fitness_health',
  'compete_with_friends',
  'train_for_personal_goal',
  'connect_with_friends',
  'improve_performance',
];

const JOURNEY = [
  'just_getting_started',
  'getting_back_into_it',
  'training_consistently',
  'competing_regularly',
];

export default function Goals() {
  const router = useRouter();
  const params = useLocalSearchParams<{ authUserId?: string }>();
  const authUserId = Array.isArray(params.authUserId)
    ? params.authUserId[0]
    : params.authUserId;

  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [journeyStage, setJourneyStage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const toggleReason = (value: string) => {
    setSelectedReasons((prev) =>
      prev.includes(value) ? prev.filter((r) => r !== value) : [...prev, value],
    );
  };

  const handleContinue = async () => {
    if (!authUserId) {
      Alert.alert('Error', 'No user ID found. Please log in again.');
      return;
    }

    if (!journeyStage) {
      Alert.alert('Choose one', 'Where are you on your fitness journey?');
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .schema('user')
      .from('profiles')
      .update({
        app_reasons: selectedReasons, // assuming this is a text[] column
        journey_stage: journeyStage,
      })
      .eq('auth_user_id', authUserId);

    setSaving(false);

    if (error) {
      console.log('save goals error', error);
      Alert.alert('Error', error.message);
      return;
    }

    router.push({
      pathname: './Privacy',
      params: { authUserId },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="flag-outline" size={24} color={TEXT_MUTED} />
          <Text style={styles.headerTitle}>Your goals</Text>
        </View>
        <Text style={styles.stepText}>Step 3 of 5</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>What will you use Tensr for?</Text>
        <View style={styles.pillRow}>
          {REASONS.map((r) => {
            const selected = selectedReasons.includes(r);
            const niceLabel = r
              .replace(/_/g, ' ')
              .replace(/\b\w/g, (c) => c.toUpperCase());
            return (
              <TouchableOpacity
                key={r}
                style={[styles.pill, selected && styles.pillSelected]}
                onPress={() => toggleReason(r)}
              >
                <Text
                  style={[
                    styles.pillText,
                    selected && { color: '#020817', fontWeight: '600' },
                  ]}
                >
                  {niceLabel}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.label, { marginTop: 16 }]}>
          Where are you on your fitness journey?
        </Text>
        <View style={styles.pillRow}>
          {JOURNEY.map((j) => {
            const selected = journeyStage === j;
            const niceLabel = j
              .replace(/_/g, ' ')
              .replace(/\b\w/g, (c) => c.toUpperCase());
            return (
              <TouchableOpacity
                key={j}
                style={[styles.pill, selected && styles.pillSelected]}
                onPress={() => setJourneyStage(j)}
              >
                <Text
                  style={[
                    styles.pillText,
                    selected && { color: '#020817', fontWeight: '600' },
                  ]}
                >
                  {niceLabel}
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
