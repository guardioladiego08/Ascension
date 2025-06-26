// components/MacrosPieChart.tsx
import { Colors } from '@/constants/Colors';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import PieChart, { Slice } from 'react-native-pie-chart';

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
  size = 160,
}) => {
  const total = protein + carbs + fats;

  // Early-out if nothing to draw
  if (total === 0) {
    return (
      <View style={[styles.card, styles.center]}>
        <Text style={styles.title}>MACROS</Text>
        <View style={styles.underline} />
        <Text style={styles.noData}>No data yet</Text>
      </View>
    );
  }

  /** Pie-chart data (new API) */
  const series: Slice[] = [
    { value: carbs,   color: Colors.macroCarbs   },
    { value: fats,    color: Colors.macroFats    },
    { value: protein, color: Colors.macroProtein },
  ];

  return (
    <View style={styles.card}>
      {/* Header */}
      <Text style={styles.title}>MACROS</Text>
      <View style={styles.underline} />

      {/* Body */}
      <View style={styles.row}>
        <PieChart
          widthAndHeight={size}
          series={series}
          /** 0.6 = 60 % inner hole radius, colour matches card */
          cover={{ radius: 0.6, color: Colors.cardBackground }}
          padAngle={0.002}   // very thin gap between slices
        />

        {/* Legend */}
        <View style={styles.legend}>
          <LegendItem label="Protein" color={Colors.macroProtein} />
          <LegendItem label="Carbs"   color={Colors.macroCarbs}   />
          <LegendItem label="Fats"    color={Colors.macroFats}    />
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
    <Text style={styles.legendText}>{label}</Text>
  </View>
);

/* ---------- styles ---------- */
const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.cardBackground, // dark grey block
    padding: 20,
    borderRadius: 8,
    width: '90%',
    alignSelf: 'center',
  },
  center: { alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: Colors.text, fontSize: 18, fontWeight: '700', letterSpacing: 1 },
  underline: { height: 1, backgroundColor: Colors.text, marginTop: 4, marginBottom: 16 },
  legend: { marginLeft: 24 },
  legendRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  colorBox: { width: 10, height: 10, borderRadius: 2, marginRight: 8 },
  legendText: { color: Colors.text, fontSize: 14 },
  noData: { color: Colors.text, fontSize: 14 },
});

export default MacroTracker;
