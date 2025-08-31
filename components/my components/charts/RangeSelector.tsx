// components/charts/RangeSelector.tsx
// ------------------------------------------------------
// Segmented control to choose Day/Week/Month/Year
// ------------------------------------------------------
import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';

export type RangeKey =  'week' | 'month' | 'year';

type Props = {
  value: RangeKey;
  onChange: (next: RangeKey) => void;
};

const ALL: RangeKey[] = ['week', 'month', 'year'];

export default function RangeSelector({ value, onChange }: Props) {
  return (
    <View style={styles.wrap}>
      {ALL.map((rk) => (
        <TouchableOpacity
          key={rk}
          style={[styles.chip, value === rk && styles.chipActive]}
          onPress={() => onChange(rk)}
        >
          <Text style={styles.text}>
            {rk.charAt(0).toUpperCase() + rk.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: '#2a2a2a',
    borderWidth: 1,
    borderColor: '#3a3a3a',
  },
  chipActive: {
    backgroundColor: '#C2C2C2',
  },
  text: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});
