// components/my components/meals/MacroBar.tsx
import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MacroPill from './MacroPill';
import { useAppTheme } from '@/providers/AppThemeProvider';

type Props = { protein: number; carbs: number; fat: number };

const MacroBar: React.FC<Props> = ({ protein, carbs, fat }) => {
  const { colors, fonts } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);

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
        <Text style={styles.macroLabel}>P</Text>
        <View style={styles.barTrack}>
          <View style={[styles.barFill, { width: `${pPct}%`, backgroundColor: colors.macroProtein }]} />
        </View>
        <MacroPill label={`${protein}g`} />
      </View>

      <View style={styles.macroCol}>
        <Text style={styles.macroLabel}>C</Text>
        <View style={styles.barTrack}>
          <View style={[styles.barFill, { width: `${cPct}%`, backgroundColor: colors.macroCarbs }]} />
        </View>
        <MacroPill label={`${carbs}g`} />
      </View>

      <View style={styles.macroCol}>
        <Text style={styles.macroLabel}>F</Text>
        <View style={styles.barTrack}>
          <View style={[styles.barFill, { width: `${fPct}%`, backgroundColor: colors.macroFats }]} />
        </View>
        <MacroPill label={`${fat}g`} />
      </View>
    </View>
  );
};

export default MacroBar;

function createStyles(
  colors: ReturnType<typeof useAppTheme>['colors'],
  fonts: ReturnType<typeof useAppTheme>['fonts']
) {
  return StyleSheet.create({
    macroRow: { flexDirection: 'row', gap: 12 },
    macroCol: { width: 88, alignItems: 'center' },
    macroLabel: {
      color: colors.text,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 17,
      marginBottom: 4,
    },
    barTrack: {
      width: '100%',
      height: 12,
      borderRadius: 10,
      backgroundColor: colors.card3,
      overflow: 'hidden',
    },
    barFill: { height: '100%' },
  });
}
