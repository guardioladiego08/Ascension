// components/my components/meals/MacroBar.tsx
import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/Colors';
import MacroPill from './MacroPill';
import { GlobalStyles } from '@/constants/GlobalStyles';

type Props = { protein: number; carbs: number; fat: number };

const MacroBar: React.FC<Props> = ({ protein, carbs, fat }) => {
  const { pPct, cPct, fPct } = useMemo(() => {
    const pCal = protein * 4;
    const cCal = carbs * 4;
    const fCal = fat * 9;
    const total = Math.max(pCal + cCal + fCal, 1);
    return {
      pPct: (pCal / total) * 100,
      cPct: (cCal / total) * 100,
      fPct: (fCal / total) * 100,
    };
  }, [protein, carbs, fat]);

  return (
    <View style={styles.macroRow}>
      <View style={styles.macroCol}>
        <Text style={GlobalStyles.text}>P</Text>
        <View style={styles.barTrack}>
          <View style={[styles.barFill, { width: `${pPct}%`, backgroundColor: Colors.dark.macroProtein }]} />
        </View>
        <MacroPill label={`${protein}g`} />
      </View>

      <View style={styles.macroCol}>
        <Text style={GlobalStyles.text}>C</Text>
        <View style={styles.barTrack}>
          <View style={[styles.barFill, { width: `${cPct}%`, backgroundColor: Colors.dark.macroCarbs }]} />
        </View>
        <MacroPill label={`${carbs}g`} />
      </View>

      <View style={styles.macroCol}>
        <Text style={GlobalStyles.text}>F</Text>
        <View style={styles.barTrack}>
          <View style={[styles.barFill, { width: `${fPct}%`, backgroundColor: Colors.dark.macroFats }]} />
        </View>
        <MacroPill label={`${fat}g`} />
      </View>
    </View>
  );
};

export default MacroBar;

const styles = StyleSheet.create({
  macroRow: { flexDirection: 'row', gap: 12 },
  macroCol: { width: 88, alignItems: 'center' },
  barTrack: {
    width: '100%',
    height: 12,
    borderRadius: 10,
    backgroundColor: '#808080',
    overflow: 'hidden',
  },
  barFill: { height: '100%' },
});
