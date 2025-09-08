// app/(tabs)/stats/index.tsx

import React from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { GlobalStyles } from '@/constants/GlobalStyles';
import { Colors } from '@/constants/Colors';
import LogoHeader from '@/components/my components/logoHeader';

export default function Stats() {
  const router = useRouter();

  const go = (path: string) => router.push(`/stats/${path}`);

  return (
    <SafeAreaView style={GlobalStyles.safeArea}>
      <LogoHeader />

      <View style={styles.headerBlock}>
        <Text style={GlobalStyles.header}>CHECK YOUR</Text>
        <Text style={GlobalStyles.header}>PROGRESS</Text>
      </View>

      <View style={styles.buttons}>
        <TouchableOpacity style={styles.card} onPress={() => go('strength/Strength')}>
          <Text style={styles.cardText}>STRENGTH</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} onPress={() => go('cardio/Cardio')}>
          <Text style={styles.cardText}>CARDIO</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} onPress={() => go('nutrition/MacrosTracking')}>
          <Text style={styles.cardText}>NUTRITION</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} onPress={() => go('BodyComposition')}>
          <Text style={styles.cardText}>BODY{"\n"}COMPOSITION</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({

  headerBlock: {
    marginBottom: 12,
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
    color: Colors.dark.highlight1,
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
});
