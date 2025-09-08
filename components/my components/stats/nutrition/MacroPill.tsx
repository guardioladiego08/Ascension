// components/my components/meals/MacroPill.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type Props = { label: string };

const MacroPill: React.FC<Props> = ({ label }) => {
  return (
    <View style={styles.macroPill}>
      <Text style={styles.macroPillText}>{label}</Text>
    </View>
  );
};

export default MacroPill;

const styles = StyleSheet.create({
  macroPill: {
    backgroundColor: '#D9D9D9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 6,
  },
  macroPillText: { fontSize: 11, fontWeight: '700', color: '#111' },
});
