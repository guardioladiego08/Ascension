// components/my componentscharts/CustomSelectionDot.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

/**
 * A safe selection dot renderer compatible with react-native-graph.
 * Protects against undefined point values and shows a small highlight circle.
 */
export const SelectionDot = ({
  color = '#FF950A',
  point,
}: {
  color?: string;
  point?: { value?: number; date?: Date };
}) => {
  if (!point || typeof point.value !== 'number') {
    return null; // gracefully skip until a valid point exists
  }

  return (
    <View style={[styles.container]}>
      <View style={[styles.dot, { borderColor: color }]} />
      <View style={styles.labelContainer}>
        <Text style={styles.labelText}>
          {point.value.toFixed(2)}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    backgroundColor: '#fff',
  },
  labelContainer: {
    marginTop: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: '#333',
    borderRadius: 8,
  },
  labelText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
});
