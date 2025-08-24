// components/my components/charts/StepRangeChart.tsx
// Step-style layered composition chart (Protein, Carbs, Fat + Calories line).
// ✔ Only ONE Y-AXIS is rendered (on the base chart). All overlays hide their y-axis.
//    - Base (fat) shows the y-axis + grid.
//    - Protein/Carbs/Calories overlays: yAxisThickness=0, x/y axes transparent.
// Data shape: MacroDataset { dailyData[7], monthlyData[~60], yearlyData[12] }
// Labels: Week=ddd, Month=day of month, Year=MMM.
//
// Usage:
//   <StepLayeredCompositionChart dataset={macrosDataset} initialRange="month" />
//
import moment from 'moment';
import React, { useMemo, useState } from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';

type Range = 'week' | 'month' | 'year';

export type MacroPoint = {
  label: string;   // YYYY-MM-DD
  protein: number; // g
  carbs: number;   // g
  fat: number;     // g
  calories?: number; // optional; will be computed if missing
};

export interface MacroDataset {
  dailyData: MacroPoint[];
  monthlyData: MacroPoint[];
  yearlyData: MacroPoint[];
}

interface Props {
  dataset: MacroDataset;
  initialRange?: Range;
  height?: number;
  colors?: {
    caloriesLine: string;
    carbs: string;
    protein: string;
    fat: string;
  };
  title?: string;
}

const { width: W } = Dimensions.get('window');

const StepLayeredCompositionChart: React.FC<Props> = ({
  dataset,
  initialRange = 'week',
  height = 180,
  title = 'Composition',
  colors = {
    caloriesLine: '#CFCFCF',
    carbs: '#F3C969',
    protein: '#E0B64F',
    fat: '#C79E38',
  },
}) => {
  const [range, setRange] = useState<Range>(initialRange);
  const [page, setPage] = useState(0);

  const slice = useMemo(() => {
    if (range === 'week') return dataset.dailyData;
    if (range === 'year') return dataset.yearlyData;
    const start = page * 30;
    return dataset.monthlyData.slice(start, start + 30);
  }, [dataset, page, range]);

  type StepDatum = { value: number; index: number; label: string };
  const toStep = (vals: number[], labels: string[]): StepDatum[] => {
    if (!vals.length) return [];
    const out: StepDatum[] = [];
    const lab = (i: number) =>
      range === 'year'
        ? moment().month(i).format('MMM')
        : range === 'month'
        ? moment(labels[i], 'YYYY-MM-DD').format('D')
        : moment(labels[i], 'YYYY-MM-DD').format('ddd');

    out.push({ value: vals[0], index: 0, label: lab(0) });
    for (let i = 1; i < vals.length; i++) {
      out.push({ value: vals[i - 1], index: i, label: '' });
      out.push({ value: vals[i], index: i, label: lab(i) });
    }
    return out;
  };

  const labels = slice.map(p => p.label);
  const protein = slice.map(p => p.protein);
  const carbs = slice.map(p => p.carbs);
  const fat = slice.map(p => p.fat);
  const calories = slice.map(p => p.calories ?? (p.protein * 4 + p.carbs * 4 + p.fat * 9));

  const proteinStep = useMemo(() => toStep(protein, labels), [protein, labels]);
  const carbsStep   = useMemo(() => toStep(carbs, labels), [carbs, labels]);
  const fatStep     = useMemo(() => toStep(fat, labels), [fat, labels]);
  const calStep     = useMemo(() => toStep(calories, labels), [calories, labels]);

  const count = Math.max(proteinStep.length, carbsStep.length, fatStep.length, calStep.length);
  const spacing = Math.max(W / Math.max(1, count), 18);

  const rangeLabel = useMemo(() => {
    if (range === 'year') return moment().format('YYYY');
    if (range === 'week') {
      const ms = dataset.dailyData.map(d => moment(d.label, 'YYYY-MM-DD'));
      return `${moment.min(ms).format('M/D')} - ${moment.max(ms).format('M/D')}`;
    }
    const first = dataset.monthlyData[page * 30];
    return first ? moment(first.label, 'YYYY-MM-DD').format('MMMM') : '';
  }, [dataset, page, range]);

  const prev = () => setPage(p => Math.max(0, p - 1));
  const next = () => {
    const max = Math.floor(dataset.monthlyData.length / 30);
    setPage(p => Math.min(max, p + 1));
  };

  const pointerCfg = (series: StepDatum[]) => ({
    pointerStripHeight: height,
    pointerStripColor: 'lightgray',
    pointerStripWidth: 2,
    radius: 6,
    activatePointersOnLongPress: true,
    autoAdjustPointerLabelPosition: false as const,
    pointerLabelComponent: (pts: any[]) => {
      const p = pts?.[0];
      if (!p) return null;
      const lbl = series[p.index]?.label ?? '';
      if (!lbl) return null;
      const origIndex = series[p.index].index;
      const macroIdx = Math.min(origIndex, labels.length - 1);
      const pr = protein[macroIdx] ?? 0;
      const cb = carbs[macroIdx] ?? 0;
      const ft = fat[macroIdx] ?? 0;
      const kc = calories[macroIdx] ?? 0;

      return (
        <View style={{ width: 130, height: 98, marginTop: -34, marginLeft: -52, justifyContent: 'center' }}>
          <Text style={{ color: 'white', fontSize: 12, marginBottom: 6, textAlign: 'center' }}>{lbl}</Text>
          <View style={{ backgroundColor: 'white', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8 }}>
            <Text style={{ fontWeight: '700', textAlign: 'center' }}>{kc} kcal</Text>
            <Text style={{ fontSize: 12, textAlign: 'center' }}>
              P {pr}g • C {cb}g • F {ft}g
            </Text>
          </View>
        </View>
      );
    },
  });

  return (
    <View style={[styles.wrap, { height: height + 120 }]}>
      <Text style={styles.title}>{title.toUpperCase()}</Text>
      <View style={styles.hr} />

      <View style={styles.toggleRow}>
        {(['week', 'month', 'year'] as Range[]).map(r => (
          <TouchableOpacity
            key={r}
            style={[styles.toggle, range === r && styles.toggleOn]}
            onPress={() => { setRange(r); setPage(0); }}
          >
            <Text style={styles.toggleTxt}>{r[0].toUpperCase() + r.slice(1)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {range === 'month' ? (
        <View style={styles.nav}>
          <TouchableOpacity onPress={prev}><Text style={styles.arrow}>{'<'}</Text></TouchableOpacity>
          <Text style={styles.rangeTxt}>{rangeLabel}</Text>
          <TouchableOpacity onPress={next}><Text style={styles.arrow}>{'>'}</Text></TouchableOpacity>
        </View>
      ) : (
        <Text style={[styles.rangeTxt, { textAlign: 'center' }]}>{rangeLabel}</Text>
      )}

      {/* Chart stack: only the base chart shows the Y axis */}
      <View style={{ height, position: 'relative' }}>
        {/* BASE: FAT (area) — SHOWS Y-AXIS */}
        <LineChart
          data={proteinStep}
          data2={fatStep}
          data3={carbsStep}
          height={250}
          areaChart
          hideDataPoints
          color1="#FF7D0A"
          color2='#FFAF0A'
          color3='#f1ed00ff'
          startFillColor={colors.fat}
          endFillColor={colors.fat}
          startOpacity={0.06}
          endOpacity={0.3}
          thickness={2}
          spacing={spacing}
          noOfSections={5}
          textColor="white"
          xAxisTextNumberOfLines={0}
          yAxisTextStyle={{ color: 'white' }}
          xAxisColor="grey"
          yAxisColor="white"
          yAxisThickness={1}
          rulesType="solid"
          rulesColor="gray"
          backgroundColor="transparent"
          pointerConfig={pointerCfg(fatStep)}
          overflowTop={24}
        />


      </View>

      {/* Legend */}
      <View style={styles.legendRow}>
        <LegendDot color={colors.caloriesLine} label="Calories" />
        <LegendDot color={colors.carbs} label="Carbs" />
        <LegendDot color={colors.protein} label="Protein" />
        <LegendDot color={colors.fat} label="Fat" />
      </View>
    </View>
  );
};

const LegendDot = ({ color, label }: { color: string; label: string }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 12 }}>
    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color, marginRight: 6 }} />
    <Text style={{ color: 'white', fontSize: 12 }}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  wrap: { padding: 16 },
  title: { color: 'white', fontSize: 18, fontWeight: '700', letterSpacing: 1 },
  hr: { height: 1, backgroundColor: 'white', marginVertical: 8, opacity: 0.9 },
  toggleRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 8 },
  toggle: { paddingVertical: 6, paddingHorizontal: 16, borderRadius: 16 },
  toggleOn: { backgroundColor: '#C2C2C2' },
  toggleTxt: { color: 'white', fontSize: 13, fontWeight: '500' },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  arrow: { color: 'white', fontSize: 18, paddingHorizontal: 12 },
  rangeTxt: { color: 'white', fontSize: 14, fontWeight: '500' },
  legendRow: { flexDirection: 'row', marginTop: 80 },
});

export default StepLayeredCompositionChart;
