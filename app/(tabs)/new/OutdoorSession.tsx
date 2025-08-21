// ✅ FIX #1 — app/(tabs)/new/OutdoorSession.tsx
// The file must export a React component as the **default** export.
// This minimal screen renders and keeps your tab bar visible.

import React from 'react';
import { SafeAreaView, Text, StyleSheet } from 'react-native';

const OutdoorSession: React.FC = () => {
  return (
    <SafeAreaView style={styles.safe}>
      <Text style={styles.text}>Outdoor Session (WIP)</Text>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#222', alignItems: 'center', justifyContent: 'center' },
  text: { color: 'white', fontSize: 18, fontWeight: '700' },
});

export default OutdoorSession;
