import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';

export default function StrengthPlaceholder() {
  const router = useRouter();
  useKeepAwake();
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Strength Workout</Text>
      <Text style={styles.subtitle}>Placeholder screen</Text>
      <TouchableOpacity style={styles.btn} onPress={() => router.back()}>
        <Text style={styles.btnText}>Go Back</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0B111A', padding: 16 },
  title: { color: '#FFFFFF', fontSize: 22, fontWeight: '700' },
  subtitle: { color: '#AAB2C5', marginTop: 8 },
  btn: { marginTop: 18, backgroundColor: '#6EA8FF', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  btnText: { color: '#0B111A', fontWeight: '700' },
});
