import React from 'react';
import { SafeAreaView, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';
import LogoHeader from '@/components/my components/logoHeader';

const BG = Colors.dark.background;
const PRIMARY = Colors.dark.tint;
const TEXT_PRIMARY = '#EAF2FF';
const TEXT_MUTED = '#9AA4BF';

export default function FirstPage() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <LogoHeader showBackButton/>

      <View style={styles.center}>
        <Text style={styles.title}>Welcome to Tensr</Text>
        <Text style={styles.subtitle}>
          Track strength, endurance, and nutrition in one hybrid-athlete platform.
        </Text>
      </View>

      <View style={styles.bottomButtons}>
        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={() => router.push('./Login')}
        >
          <Text style={styles.secondaryText}>Log in</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={() => router.push('./SignupEmail')}
        >
          <Text style={styles.primaryText}>Sign up</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG, paddingHorizontal: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: {
    fontSize: 28,
    color: TEXT_PRIMARY,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: TEXT_MUTED,
    textAlign: 'center',
    maxWidth: 280,
  },
  bottomButtons: {
    paddingBottom: 32,
    gap: 10,
  },
  button: {
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: 'center',
  },
  primaryButton: { backgroundColor: PRIMARY },
  secondaryButton: { borderWidth: 1, borderColor: '#3A465E' },
  primaryText: { color: '#020817', fontWeight: '600' },
  secondaryText: { color: TEXT_PRIMARY, fontWeight: '600' },
});
