// components/charts/StepLayeredCompositionChart.tsx
// Step-style, multi-layer (macros) chart like your screenshot.
// Renders 3 macro series (protein, carbs, fat) as step lines + optional total calories line.
// We overlay 3 LineCharts so we control each fill/line style independently.

import moment from 'moment';
import React, { useMemo, useState } from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';

type Range = 'week' | 'month' | 'year';

export type MacroPoint = {
  /** ISO like 'YYYY-MM-DD' for week/month. For year, any month anchor date. */
  label: string;
  protein: number; // grams
  carbs: number;   // grams
  fat: number;     // grams
  /** If not provided we compute 4p+4c+9f */
  calories?: number;
};

export interface MacroDataset {
  dailyData: MacroPoint[];   // 7 pts (Mon–Sun)
  monthlyData: MacroPoint[]; // ~30 pts; we page by 30
  yearlyData: MacroPoint[];  // 12 pts (months)
}

interface Props {
  dataset: MacroDataset;
  initialRange?: Range;
  height?: number;
  /** Colors that match your mock */
  colors?: {
    caloriesLine: string; // top grey
    carbs: string;        // bright yellow
    protein: string;      // darker yellow
    fat: string;          // base amber
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

  // --- Helpers ---
  const slice = useMemo(() => {
    if (range === 'week') return dataset.dailyData;
    if (range === 'year') return dataset.yearlyData;
    const start = page * 30;
    return dataset.monthlyData.slice(start, start + 30);
  }, [dataset, page, range]);

  // Create step-series from a numeric array
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
      out.push({ value: vals[i - 1], index: i, label: '' }); // horizontal
      out.push({ value: vals[i], index: i, label: lab(i) });  // vertical
    }
    return out;
  };

  // Base labels and macro arrays
  const labels = slice.map(p => p.label);
  const protein = slice.map(p => p.protein);
  const carbs = slice.map(p => p.carbs);
  const fat = slice.map(p => p.fat);
  const calories = slice.map(p => (p.calories ?? (p.protein * 4 + p.carbs * 4 + p.fat * 9)));

  const proteinStep = useMemo(() => toStep(protein, labels), [protein, labels]);
  const carbsStep   = useMemo(() => toStep(carbs, labels), [carbs, labels]);
  const fatStep     = useMemo(() => toStep(fat, labels), [fat, labels]);
  const calStep     = useMemo(() => toStep(calories, labels), [calories, labels]);

  // Axis spacing
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

  // One shared pointer config for the bottom-most chart; we’ll reuse indices to show labels
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
      // Find the closest "labeled" index for x (skip our blank duplicates).
      const lbl = series[p.index]?.label ?? '';
      if (!lbl) return null;
      // Compose macro values for that x index (original index before step-doubling)
      const origIndex = series[p.index].index; // we set index == x in gift chart; here it already is the same
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

  // Render
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

      {/* Chart stack: render FAT first (bottom), then PROTEIN, then CARBS, then CALORIES line on top */}
      <View style={{ height, position: 'relative' }}>
        {/* BASE AXES chart (fat) */}
        <LineChart
          data={fatStep}
          areaChart
          dataPointsColor="transparent"
          hideDataPoints
          color={colors.fat}
          startFillColor={colors.fat}
          endFillColor={colors.fat}
          startOpacity={0.3}
          endOpacity={0.06}
          thickness={2}
          spacing={spacing}
          noOfSections={5}
          textColor="white"
          xAxisTextNumberOfLines={0}
          yAxisTextStyle={{ color: 'white' }}
          xAxisColor="grey"
          yAxisColor="white"
          rulesType="solid"
          rulesColor="gray"
          backgroundColor="transparent"
          pointerConfig={pointerCfg(fatStep)}
          overflowTop={24}
        />

        {/* Overlay protein */}
        <View style={StyleSheet.absoluteFill}>
          <LineChart
            data={proteinStep}
            areaChart
            hideDataPoints
            color={colors.protein}
            startFillColor={colors.protein}
            endFillColor={colors.protein}
            startOpacity={0.3}
            endOpacity={0.05}
            thickness={2}
            spacing={spacing}
            noOfSections={5}
            xAxisColor="transparent"
            yAxisColor="transparent"
            rulesColor="transparent"
            backgroundColor="transparent"
            overflowTop={24}
          />
        </View>

        {/* Overlay carbs */}
        <View style={StyleSheet.absoluteFill}>
          <LineChart
            data={carbsStep}
            areaChart
            hideDataPoints
            color={colors.carbs}
            startFillColor={colors.carbs}
            endFillColor={colors.carbs}
            startOpacity={0.35}
            endOpacity={0.08}
            thickness={2}
            spacing={spacing}
            noOfSections={5}
            xAxisColor="transparent"
            yAxisColor="transparent"
            rulesColor="transparent"
            backgroundColor="transparent"
            overflowTop={24}
          />
        </View>

        {/* Top calories line only (no area) */}
        <View style={StyleSheet.absoluteFill}>
          <LineChart
            data={calStep}
            hideDataPoints
            color={colors.caloriesLine}
            thickness={2}
            spacing={spacing}
            noOfSections={5}
            xAxisColor="transparent"
            yAxisColor="transparent"
            rulesColor="transparent"
            backgroundColor="transparent"
            overflowTop={24}
          />
        </View>
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
  legendRow: { flexDirection: 'row', marginTop: 8 },
});

export default StepLayeredCompositionChart;
