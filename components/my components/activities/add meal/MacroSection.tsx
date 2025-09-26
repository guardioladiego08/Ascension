// components/my components/activities/add meal/MacroSection.tsx
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { AM_COLORS as C } from './theme';
import { GlobalStyles } from '@/constants/GlobalStyles';
import { Colors } from '@/constants/Colors';

export type MacroTotals = {
  protein: number;
  carbs: number;
  fats: number;
  calories: number;
  goals: {
    protein: number;
    carbs: number;
    fats: number;
    calories: number;
  };
};

const pct = (value: number, goal: number) =>
  goal <= 0 ? 0 : Math.max(0, Math.min(1, value / goal));

const MacroBar: React.FC<{
  label: string;
  value: number;
  goal: number;
  color: string;
}> = ({ label, value, goal, color }) => {
  const p = pct(value, goal);
  return (
    <View style={styles.macroBlock}>
      <Text style={[GlobalStyles.text, { marginBottom: 5 }]}>{label}</Text>
      <View style={styles.barTrack}>
        <View
          style={[
            styles.barFill,
            { width: `${p * 100}%`, backgroundColor: color },
          ]}
        />
      </View>
      <Text style={GlobalStyles.subtext}>
        {value}/{goal}
      </Text>
    </View>
  );
};

const CaloriesRing: React.FC<{ value: number; goal: number }> = ({
  value,
  goal,
}) => {
  const p = pct(value, goal);
  const size = 70;
  const stroke = 7;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = p * circumference;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#fff"
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={Colors.dark.highlight2}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash}, ${circumference}`}
          rotation={-90}
          originX={size / 2}
          originY={size / 2}
          fill="none"
        />
      </Svg>
    </View>
  );
};

const MacroSection: React.FC<{ totals: MacroTotals }> = ({ totals }) => {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1, paddingRight: 12 }}>
        <MacroBar
          label="PROTEIN"
          value={totals.protein}
          goal={totals.goals.protein}
          color={Colors.dark.macroProtein}
        />
        <MacroBar
          label="CARBOHYDRATES"
          value={totals.carbs}
          goal={totals.goals.carbs}
          color={Colors.dark.macroCarbs}
        />
        <MacroBar
          label="FATS"
          value={totals.fats}
          goal={totals.goals.fats}
          color={Colors.dark.macroFats}
        />
      </View>

      <View style={styles.calsRight}>
        <Text style={[GlobalStyles.text, { marginBottom: 5 }]}>CALORIES</Text>
        <CaloriesRing value={totals.calories} goal={totals.goals.calories} />
        <Text style={[GlobalStyles.subtext, { marginTop: 8 }]}>
          {totals.calories}/{totals.goals.calories}
        </Text>
      </View>
    </View>
  );
};

export default MacroSection;

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  macroBlock: { marginBottom: 12 },
  barTrack: {
    width: '100%',
    height: 12,
    borderRadius: 6,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 6 },
  calsRight: { width: 110, alignItems: 'center', paddingTop: 6 },
});
