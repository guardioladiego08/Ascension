// app/SignInLogin/onboarding/BodyInfo.tsx
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

export default function BodyInfo() {
  const router = useRouter();
  const params = useLocalSearchParams<{ authUserId?: string }>();
  const authUserId = Array.isArray(params.authUserId)
    ? params.authUserId[0]
    : params.authUserId;

  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [saving, setSaving] = useState(false);

  const handleContinue = async () => {
    if (!authUserId) {
      Alert.alert('Error', 'No user ID found. Please log in again.');
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .schema('user')
      .from('profiles')
      .update({
        height_cm: heightCm ? Number(heightCm) : null,
        weight_kg: weightKg ? Number(weightKg) : null,
      })
      .eq('auth_user_id', authUserId);

    setSaving(false);

    if (error) {
      console.log('save body info error', error);
      Alert.alert('Error', error.message);
      return;
    }

    router.push({
      pathname: './Goals',
      params: { authUserId },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="body-outline" size={24} color={TEXT_MUTED} />
          <Text style={styles.headerTitle}>Body stats</Text>
        </View>
        <Text style={styles.stepText}>Step 2 of 5</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Height (cm)</Text>
        <TextInput
          value={heightCm}
          onChangeText={setHeightCm}
          keyboardType="numeric"
          placeholder="Optional"
          placeholderTextColor={TEXT_MUTED}
          style={styles.input}
        />

        <Text style={styles.label}>Weight (kg)</Text>
        <TextInput
          value={weightKg}
          onChangeText={setWeightKg}
          keyboardType="numeric"
          placeholder="Optional"
          placeholderTextColor={TEXT_MUTED}
          style={styles.input}
        />
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
  primaryButton: {
    marginTop: 18,
    backgroundColor: PRIMARY,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryText: { color: '#020817', fontWeight: '600', fontSize: 15 },
});
