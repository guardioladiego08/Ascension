// components/addMeal/MacroSection.tsx
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { AM_COLORS as C } from './theme';
import type { DayMealData } from '@/assets/data/addMealData';
import { GlobalStyles } from '@/constants/GlobalStyles';
import { Colors } from '@/constants/Colors';

type Props = { data: DayMealData };

// helper: clamp percentage between 0–1
const pct = (value: number, goal: number) =>
  goal <= 0 ? 0 : Math.max(0, Math.min(1, value / goal));

/**
 * MacroBar
 * A labeled horizontal bar with a colored fill.
 * Pass in a color prop to differentiate each macro.
 */
const MacroBar: React.FC<{
  label: string;
  value: number;
  goal: number;
  color: string;
  style?: any;
}> = ({ label, value, goal, color, style }) => {
  const p = pct(value, goal);
  return (
    <View style={[styles.macroBlock, style]}>
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

/**
 * CaloriesRing
 * Circular progress ring with customizable stroke color.
 */
const CaloriesRing: React.FC<{
  value: number;
  goal: number;
  size?: number;
  stroke?: number;
  color?: string;
}> = ({ value, goal, size = 72, stroke = 8, color = C.orange }) => {
  const p = pct(value, goal);
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = p * circumference;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke='#fff'
          strokeWidth={stroke}
          fill="none"
        />
        {/* Progress */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
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

/**
 * MacroSection
 * Combines 3 macro bars and 1 calories ring with distinct colors.
 */
const MacroSection: React.FC<Props> = ({ data }) => {
  const { macros, calories } = data;

  return (
    <View style={styles.row}>
      <View style={{ flex: 1, paddingRight: 12 }}>
        <MacroBar
          label="PROTEIN"
          value={macros.protein}
          goal={macros.proteinGoal}
          color= {Colors.dark.macroProtein}
          style={{ marginTop: 8 }}
        />
        <MacroBar
          label="CARBOHYDRATES"
          value={macros.carbs}
          goal={macros.carbsGoal}
          color= {Colors.dark.macroCarbs}
        />
        <MacroBar
          label="FATS"
          value={macros.fats}
          goal={macros.fatsGoal}
          color={Colors.dark.macroFats}
        />
      </View>

      <View style={styles.calsRight}>
        <Text style={[GlobalStyles.text, { marginBottom: 5 }]}>CALORIES</Text>
        <CaloriesRing
          value={calories.value}
          goal={calories.goal}
          size={70}
          stroke={7}
          color={Colors.dark.highlight2}
        />
        <Text style={[GlobalStyles.subtext, { marginTop: 8 }]}>
          {calories.value}/{calories.goal}
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
