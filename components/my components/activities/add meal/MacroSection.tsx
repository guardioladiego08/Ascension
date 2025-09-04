// components/addMeal/MacroSection.tsx
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { AM_COLORS as C } from './theme';
import type { DayMealData } from '@/assets/data/addMealData';
import { GlobalStyles } from '@/constants/GlobalStyles';
import { Colors } from '@/constants/Colors';

type Props = { data: DayMealData };
const pct = (value: number, goal: number) => (goal <= 0 ? 0 : Math.max(0, Math.min(1, value / goal)));

const MacroBar: React.FC<{ label: string; value: number; goal: number; style?: any }> = ({ label, value, goal, style }) => {
  const p = pct(value, goal);
  return (
    <View style={[styles.macroBlock, style]}>
      <Text style={[GlobalStyles.text, {marginBottom:5}]}>{label}</Text>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${p * 100}%` }]} />
      </View>
      <Text style={GlobalStyles.subtext}>
        {value}/{goal}
      </Text>
    </View>
  );
};

const CaloriesRing: React.FC<{ value: number; goal: number; size?: number; stroke?: number }> = ({
  value,
  goal,
  size = 72,
  stroke = 8,
}) => {
  const p = pct(value, goal);
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = p * circumference;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={C.barTrack} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={C.orange}
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

const MacroSection: React.FC<Props> = ({ data }) => {
  const { macros, calories } = data;

  return (
    <View style={styles.row}>
      <View style={{ flex: 1, paddingRight: 12 }}>
        <MacroBar label="PROTEIN" value={macros.protein} goal={macros.proteinGoal} style={{ marginTop: 8 }} />
        <MacroBar label="CARBOHYDRATES" value={macros.carbs} goal={macros.carbsGoal} />
        <MacroBar label="FATS" value={macros.fats} goal={macros.fatsGoal} />
      </View>

      <View style={styles.calsRight}>
        <Text style={[GlobalStyles.text,{marginBottom: 5}]}>CALORIES</Text>
        <CaloriesRing value={calories.value} goal={calories.goal} size={70} stroke={7} />
        <Text style={[GlobalStyles.subtext, {marginTop: 8}]}>
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
  macroLabel: { color: C.subText, fontSize: 10, marginBottom: 4 },
  macroValue: { color: C.text, fontSize: 11, marginTop: 4 },
  barTrack: { width: '100%', height: 12, borderRadius: 6, backgroundColor: C.barTrack, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: Colors.dark.highlight1, borderRadius: 6 },
  calsRight: { width: 110, alignItems: 'center', paddingTop: 6 },
});
