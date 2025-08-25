// app/(tabs)/stats/strength/search-exercise.tsx
// Placeholder search page (implementation to come later)

import React from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { Colors } from '@/constants/Colors';
import LogoHeader from '@/components/my components/logoHeader';

const BG = Colors?.dark?.background ?? '#3f3f3f';
const WHITE = Colors?.dark?.text ?? '#ffffff';

export default function SearchExercise() {
  return (
    <SafeAreaView style={styles.safe}>
      <LogoHeader />
      <View style={{ alignItems: 'center', marginTop: 16 }}>
        <Text style={styles.title}>SEARCH EXERCISE</Text>
        <Text style={styles.caption}>Search UI coming soon…</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG, paddingHorizontal: 16 },
  title: { color: WHITE, fontSize: 18, fontWeight: '900' },
  caption: { color: WHITE, opacity: 0.8, marginTop: 6 },
});
