// app/(tabs)/stats/index.tsx

import React from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';
import LogoHeader from '@/components/my components/logoHeader';

export default function Stats() {
  const router = useRouter();

  const go = (path: string) => router.push(`/stats/${path}`);

  return (
    <SafeAreaView style={styles.safe}>
      <LogoHeader />

      <View style={styles.headerBlock}>
        <Text style={styles.headerLine}>CHECK YOUR</Text>
        <Text style={styles.headerLine}>PROGRESS</Text>
      </View>

      <View style={styles.buttons}>
        <TouchableOpacity style={styles.card} onPress={() => go('strength')}>
          <Text style={styles.cardText}>STRENGTH</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} onPress={() => go('cardio')}>
          <Text style={styles.cardText}>CARDIO</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} onPress={() => go('nutrition')}>
          <Text style={styles.cardText}>NUTRITION</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} onPress={() => go('BodyComposition')}>
          <Text style={styles.cardText}>BODY{"\n"}COMPOSITION</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const ORANGE = '#FF950A';

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors?.dark?.background ?? '#3f3f3f',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  headerBlock: {
    marginTop: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  headerLine: {
    color: '#fff',
    fontSize: 20,
    letterSpacing: 1,
    fontWeight: '800',
  },
  buttons: {
    marginTop: 8,
    gap: 12,
  },
  card: {
    backgroundColor: '#222',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#000',
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  cardText: {
    color: ORANGE,
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
});
