// components/my components/strength/EmptyState.tsx
// -----------------------------------------------------------------------------
// Shown when there are no exercises yet
// -----------------------------------------------------------------------------

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const EmptyState: React.FC = () => (
  <View style={styles.noExercise}>
    <Text style={styles.noExerciseText}>No exercises yet. Tap below to add.</Text>
  </View>
);

export default EmptyState;

const styles = StyleSheet.create({
  noExercise: { alignItems: 'center', padding: 24 },
  noExerciseText: { color: '#AAA' },
});
