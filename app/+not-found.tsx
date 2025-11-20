// ✅ app/+not-found.tsx
// Safe NotFound screen to prevent “TypeError: Cannot convert undefined value to object”
// Causes of your error:
// 1) Navigating to a path that doesn’t exist (e.g., typo like “strenght” vs “strength”) sends you here.
// 2) Your previous +not-found likely dereferenced/spread something undefined.
// This implementation is defensive and won’t crash.

import * as React from 'react';
import { SafeAreaView, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter, useSegments } from 'expo-router';

export default function NotFoundScreen() {
  const router = useRouter();
  const segments = useSegments(); // purely informational

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.card}>
        <Text style={styles.title}>Page Not Found</Text>
        <Text style={styles.sub}>The route you tried to open doesn’t exist.</Text>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>Debug Info</Text>
          <Text style={styles.infoText}>Segments: {Array.isArray(segments) ? segments.join(' / ') : 'n/a'}</Text>
        </View>

        <TouchableOpacity style={styles.btn} onPress={() => router.back()}>
          <Text style={styles.btnText}>Go Back</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.btn, styles.btnAlt]} onPress={() => router.replace('/(tabs)/home')}>
          <Text style={styles.btnText}>Go to Strength</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#3f3f3f', padding: 16, justifyContent: 'center' },
  card: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#000',
  },
  title: { color: '#fff', fontSize: 20, fontWeight: '900', marginBottom: 6, textAlign: 'center' },
  sub: { color: '#fff', opacity: 0.8, textAlign: 'center', marginBottom: 12 },
  infoBox: { backgroundColor: '#3a3a3a', borderRadius: 8, padding: 10, marginBottom: 14 },
  infoTitle: { color: '#fff', fontWeight: '800', marginBottom: 4, fontSize: 12 },
  infoText: { color: '#fff', fontSize: 12 },
  btn: {
    backgroundColor: '#222',
    borderColor: '#000',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  btnAlt: { marginTop: 8 },
  btnText: { color: '#FF950A', fontWeight: '900', letterSpacing: 0.6 },
});
