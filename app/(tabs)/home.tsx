// Home.js
import MacrosChart from '@/components/MacrosPieChart';
import { Colors } from '@/constants/Colors';
import React from 'react';
import { StyleSheet, View } from 'react-native';

export default function Home() {
  const macroData = [
    { label: 'Protein', value: 40, color: '#b0b0b0' },
    { label: 'Carbs',   value: 35, color: '#f5c100' },
    { label: 'Fats',    value: 25, color: '#d98c30' },
  ];

  return (
    <View style={styles.container}>
      <MacrosChart data={macroData} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
  },
});
