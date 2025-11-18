import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { GlobalStyles } from '@/constants/GlobalStyles';
import LogoHeader from '@/components/my components/logoHeader';

export default function StatsHome() {
  return (
    <View style={GlobalStyles.safeArea}>
      <LogoHeader showBackButton />
      <View style={styles.container}>
        <Text style={styles.title}>Strength Stats</Text>

        <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/(tabs)/progress/strength/by-exercise')}>
          <Text style={styles.primaryBtnText}>View by Exercise</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24 },
  title: { color: Colors.dark.text, fontSize: 20, fontWeight: '700', marginBottom: 16 },
  primaryBtn: {
    backgroundColor: Colors.dark.highlight1,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryBtnText: { color: Colors.dark.blkText, fontSize: 16, fontWeight: '600' },
});
