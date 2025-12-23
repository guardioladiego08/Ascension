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
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/Colors';
import LogoHeader from '@/components/my components/logoHeader';
import { LinearGradient } from 'expo-linear-gradient';

const BG = Colors.dark.background;
const CARD = Colors.dark.card;
const PRIMARY = Colors.dark.highlight1;
const TEXT_PRIMARY = Colors.dark.text;
const TEXT_MUTED = '#9AA4BF';

type Gender = 'male' | 'female' | 'non_binary' | 'prefer_not_to_say' | 'other';

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

export default function UserInfo() {
  const router = useRouter();
  const params = useLocalSearchParams<{ authUserId?: string }>();
  const paramAuthUserId = Array.isArray(params.authUserId)
    ? params.authUserId[0]
    : params.authUserId;

  // ── Section 1: basic info ────────────────────────────────────────────────
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dob, setDob] = useState(''); // YYYY-MM-DD
  const [gender, setGender] = useState<Gender | null>(null);

  // ── Section 2: body stats (IMPERIAL on UI) ───────────────────────────────
  const [heightFt, setHeightFt] = useState('');
  const [heightIn, setHeightIn] = useState('');
  const [weightLbs, setWeightLbs] = useState('');

  // ── Section 3: goals & journey ───────────────────────────────────────────
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [journeyStage, setJourneyStage] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);

  const toggleReason = (value: string) => {
    setSelectedReasons((prev) =>
      prev.includes(value) ? prev.filter((r) => r !== value) : [...prev, value],
    );
  };

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
    if (!journeyStage) {
      Alert.alert('Your journey', 'Where are you on your fitness journey?');
      return;
    }

    setSaving(true);

    let authUserId = paramAuthUserId;

    // Fallback if user reaches here with an active session but no param
    if (!authUserId) {
      const { data: authData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !authData.user) {
        setSaving(false);
        Alert.alert('Error', 'No authenticated user.');
        return;
      }
      authUserId = authData.user.id;
    }

    // ── Convert imperial → metric for storage ──────────────────────────────
    let height_cm: number | null = null;
    let weight_kg: number | null = null;

    const ftNum = parseInt(heightFt, 10);
    const inNum = parseInt(heightIn, 10);

    if (!Number.isNaN(ftNum) || !Number.isNaN(inNum)) {
      const safeFt = Number.isNaN(ftNum) ? 0 : ftNum;
      const safeIn = Number.isNaN(inNum) ? 0 : inNum;
      const totalInches = safeFt * 12 + safeIn;
      if (totalInches > 0) {
        height_cm = totalInches * 2.54; // store as cm
      }
    }

    const lbsNum = parseFloat(weightLbs);
    if (!Number.isNaN(lbsNum) && lbsNum > 0) {
      weight_kg = lbsNum * 0.45359237; // store as kg
    }

    const { error } = await supabase
      .schema('user')
      .from('profiles')
      .update({
        // basic info
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        date_of_birth: dob.trim(),
        gender,
        // body stats (metric in DB)
        height_cm,
        weight_kg,
        // goals
        app_reasons: selectedReasons,
        journey_stage: journeyStage,
        onboarding_completed: false,
      })
      .eq('auth_user_id', authUserId);

    setSaving(false);

    if (error) {
      console.log('save onboarding info error', error);
      Alert.alert('Error', error.message);
      return;
    }

    // Continue to next onboarding step (Privacy)
    router.push({
      pathname: './Privacy',
      params: { authUserId },
    });
  };

  const niceLabel = (value: string) =>
    value
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <LinearGradient
      colors={['#3a3a3bff', '#1e1e1eff', BG]} // darker -> lighter (adjust to taste)
      start={{ x: 0.2, y: 0 }}
      end={{ x: 0.8, y: 1 }}
      style={{ flex: 1 }}
    >
      <View style={styles.container}>
        <LogoHeader></LogoHeader>
        {/* Top header */}
        <View style={styles.mainHeader}>
          <Text style={styles.mainTitle}>Complete Your Profile</Text>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Section 1: Personal Info */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.iconCircle}>
                <Ionicons
                  name="person-circle-outline"
                  size={20}
                  color={PRIMARY}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionTitle}>About you</Text>
                <Text style={styles.sectionSubtitle}>
                  Name, birthday, and how you identify.
                </Text>
              </View>
            </View>

            <Text style={styles.label}>First name</Text>
            <TextInput
              value={firstName}
              onChangeText={setFirstName}
              placeholderTextColor={TEXT_MUTED}
              style={styles.input}
            />

            <Text style={styles.label}>Last name</Text>
            <TextInput
              value={lastName}
              onChangeText={setLastName}
              placeholderTextColor={TEXT_MUTED}
              style={styles.input}
            />

            <Text style={styles.label}>Date of birth (YYYY-MM-DD)</Text>
            <TextInput
              value={dob}
              onChangeText={setDob}
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
                        selected && styles.pillTextSelected,
                      ]}
                    >
                      {g.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Section 2: Body stats (imperial inputs) */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.iconCircle}>
                <Ionicons name="body-outline" size={20} color={PRIMARY} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionTitle}>Body stats</Text>
                <Text style={styles.sectionSubtitle}>
                  These help calculate pace, effort, and recommendations.
                </Text>
              </View>
            </View>

            <Text style={styles.label}>Height</Text>
            <View style={styles.row}>
              <View style={[styles.flexItem, { marginRight: 6 }]}>
                <Text style={styles.smallLabel}>Feet</Text>
                <TextInput
                  value={heightFt}
                  onChangeText={setHeightFt}
                  keyboardType="numeric"
                  placeholderTextColor={TEXT_MUTED}
                  style={styles.input}
                />
              </View>
              <View style={[styles.flexItem, { marginLeft: 6 }]}>
                <Text style={styles.smallLabel}>Inches</Text>
                <TextInput
                  value={heightIn}
                  onChangeText={setHeightIn}
                  keyboardType="numeric"
                  placeholderTextColor={TEXT_MUTED}
                  style={styles.input}
                />
              </View>
            </View>
            <Text style={styles.helperText}>
              Stored as centimeters. You can change units later in settings.
            </Text>

            <Text style={[styles.label, { marginTop: 14 }]}>Weight (lbs)</Text>
            <TextInput
              value={weightLbs}
              onChangeText={setWeightLbs}
              keyboardType="numeric"
              placeholderTextColor={TEXT_MUTED}
              style={styles.input}
            />
            <Text style={styles.helperText}>
              We’ll store this as kilograms to keep your stats consistent.
            </Text>
          </View>

          {/* Section 3: Goals & journey */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.iconCircle}>
                <Ionicons name="flag-outline" size={20} color={PRIMARY} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionTitle}>Your goals</Text>
                <Text style={styles.sectionSubtitle}>
                  Tell us why you’re here and how hard you’re going.
                </Text>
              </View>

            </View>

            <Text style={styles.label}>What will you use TENSR for?</Text>
            <View style={styles.pillRow}>
              {REASONS.map((r) => {
                const selected = selectedReasons.includes(r);
                return (
                  <TouchableOpacity
                    key={r}
                    style={[styles.pill, selected && styles.pillSelected]}
                    onPress={() => toggleReason(r)}
                  >
                    <Text
                      style={[
                        styles.pillText,
                        selected && styles.pillTextSelected,
                      ]}
                    >
                      {niceLabel(r)}
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
                return (
                  <TouchableOpacity
                    key={j}
                    style={[styles.pill, selected && styles.pillSelected]}
                    onPress={() => setJourneyStage(j)}
                  >
                    <Text
                      style={[
                        styles.pillText,
                        selected && styles.pillTextSelected,
                      ]}
                    >
                      {niceLabel(j)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </ScrollView>

        {/* Bottom CTA */}
        <TouchableOpacity
          style={[styles.primaryButton, saving && { opacity: 0.7 }]}
          onPress={handleContinue}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#020817" />
          ) : (
            <Text style={styles.primaryText2}>Continue</Text>
          )}
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20 },
  scroll: {
    flex: 1,
    marginTop: 8,
  },
  // Top header
  mainHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    justifyContent: 'space-between',
  },
  mainTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 24,
    color: TEXT_PRIMARY,
    fontWeight: '600',
  },
  stepPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#101827',
    borderWidth: 1,
    borderColor: '#273347',
  },
  stepPillText: {
    color: TEXT_MUTED,
    fontSize: 11,
    fontWeight: '500',
  },

  // Section card styling
  sectionCard: {

    borderRadius: 20,
    padding: 18,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#616161b6',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#151B28',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    color: TEXT_PRIMARY,
    fontWeight: '600',
  },
  sectionSubtitle: {
    color: TEXT_MUTED,
    fontSize: 12,
    marginTop: 2,
  },

  label: {
    fontSize: 13,
    color: TEXT_PRIMARY,
    marginTop: 10,
    marginBottom: 4,
  },
  smallLabel: {
    fontSize: 11,
    color: TEXT_MUTED,
    marginBottom: 2,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#7b7b7bff',
    backgroundColor: '#b0b0b050',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: TEXT_PRIMARY,
    fontSize: 15,
  },
  helperText: {
    fontSize: 11,
    color: TEXT_MUTED,
    marginTop: 4,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  flexItem: {
    flex: 1,
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
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: '#050816',
  },
  pillSelected: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
  },
  pillText: {
    color: TEXT_MUTED,
    fontSize: 12,
  },
  pillTextSelected: {
    color: '#020817',
    fontWeight: '600',
  },

  primaryButton: {
    marginTop: 8,
    marginBottom: 15,
    backgroundColor: PRIMARY,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryText: {
    color: Colors.dark.text,
    fontWeight: '600',
    fontSize: 15,
  },
    primaryText2: {
    color: Colors.dark.blkText,
    fontWeight: '600',
    fontSize: 15,
  },
});
