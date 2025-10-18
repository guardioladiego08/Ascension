// app/(tabs)/stats/strength/Strength.tsx
import React, { useState } from 'react';
import { SafeAreaView, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import LogoHeader from '@/components/my components/logoHeader';
import { Colors } from '@/constants/Colors';
import { GlobalStyles } from '@/constants/GlobalStyles';
import RecentStrengthWorkouts from '@/components/my components/stats/strength/RecentStrengthWorkouts';
import ExerciseSearchModal from '@/components/my components/stats/strength/ExerciseSearchModal';

const ORANGE = '#FF950A';

export default function StrengthStats() {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);

  return (
    <SafeAreaView style={GlobalStyles.safeArea}>
      <LogoHeader showBackButton />
      <Text style={GlobalStyles.header}>STRENGTH</Text>

      <Text style={styles.activityHeader}>RECENT WORKOUTS</Text>

      <RecentStrengthWorkouts
        limit={8}
        onPressWorkout={(id) => router.push(`/stats/strength/session/${id}`)}
      />

      <TouchableOpacity style={styles.searchBtn} onPress={() => setShowModal(true)}>
        <Text style={styles.searchText}>SEARCH BY EXERCISE</Text>
      </TouchableOpacity>

      <ExerciseSearchModal visible={showModal} onClose={() => setShowModal(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  activityHeader: {
    color: '#CFCFCF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.7,
    marginTop: 6,
    marginBottom: 8,
  },
  searchBtn: {
    backgroundColor: '#222',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#000',
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
    marginTop: 16,
    marginBottom: 24,
  },
  searchText: {
    color: ORANGE,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
