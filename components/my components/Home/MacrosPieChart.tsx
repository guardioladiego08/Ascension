// components/MacrosPieChart.tsx
import { Colors } from '@/constants/Colors';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import PieChart, { Slice } from 'react-native-pie-chart';
import { GlobalStyles } from '@/constants/GlobalStyles';

type Props = {
  protein: number;
  carbs: number;
  fats: number;
  /**
   * Diameter of the chart (px).  Feel free to tweak.
   */
  size?: number;
};

const MacroTracker: React.FC<Props> = ({
  protein,
  carbs,
  fats,
  size = 150,
}) => {
  const total = protein + carbs + fats;

  // Early-out if nothing to draw
  if (total === 0) {
    return (
      <View style={[styles.center]}>
        <Text style={GlobalStyles.subtitle}>MACROS</Text>
        <View style={GlobalStyles.underline} />
        <Text style={GlobalStyles.text}>No data yet</Text>
      </View>
    );
  }

  /** Pie-chart data (new API) */
  const series: Slice[] = [
    { value: carbs,   color: Colors.dark.macroCarbs   },
    { value: fats,    color: Colors.dark.macroFats    },
    { value: protein, color: Colors.dark.macroProtein },
  ];

  return (
    <View style={GlobalStyles.container}>
      {/* Header */}
      <Text style={GlobalStyles.subtitle}>MACROS</Text>
      <View style={GlobalStyles.underline} />

      {/* Body */}
      <View style={styles.row}>
        <PieChart
          widthAndHeight={size}
          series={series}
          /** 0.6 = 60 % inner hole radius, colour matches container */
          cover={{ radius: 0.6, color: Colors.dark.background }}
          padAngle={0.002}   // very thin gap between slices
        />

        {/* Legend */}
        <View style={styles.legend}>
          <LegendItem label="Protein" color={Colors.dark.macroProtein} />
          <LegendItem label="Carbs"   color={Colors.dark.macroCarbs}   />
          <LegendItem label="Fats"    color={Colors.dark.macroFats}    />
        </View>
      </View>
    </View>
  );
};

/* ---------- helper: legend row ---------- */
const LegendItem: React.FC<{ label: string; color: string }> = ({
  label,
  color,
}) => (
  <View style={styles.legendRow}>
    <View style={[styles.colorBox, { backgroundColor: color }]} />
    <Text style={GlobalStyles.text}>{label}</Text>
  </View>
);

/* ---------- styles ---------- */
const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly' },
  legend: { marginLeft: 24 },
  legendRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  colorBox: { width: 10, height: 10, borderRadius: 2, marginRight: 8 },
});

export default MacroTracker;
