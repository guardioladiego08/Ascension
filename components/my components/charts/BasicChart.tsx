// components/charts/BasicChart.tsx
// --------------------------------------------------------------------
// BasicChart — shows selected value (from enablePanGesture) at TOP-RIGHT
// outside of <LineGraph/> while scrubbing. Includes a bottom range selector.
//
// Ranges: Week(7), Month(30), 6M(182), Year(365)
// - For all ranges we slice the data so the last point is today's value
//   (if today exists in your dataset), otherwise the latest available.
// - animated={true} for LineGraph
// - No x-axis labels rendered
//
// Deps (current & maintained):
//   npm i react-native-graph @shopify/react-native-skia react-native-reanimated react-native-gesture-handler moment
//   // If using Expo, rebuild dev client for Skia/Reanimated.
// --------------------------------------------------------------------
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import moment from 'moment';
import { LineGraph, type GraphPoint } from 'react-native-graph';

// Import your generated data + type
import {
  weightData as generatedWeightData,
  type WeightPoint,
} from '@/assets/data/home/weightRangeData.tsx';

type RangeKey = 'week' | 'month' | '6m' | 'year';

type Props = {
  title?: string;
  color?: string;
  height?: number;
  data?: WeightPoint[]; // optional override
};

const RANGE_TO_DAYS: Record<RangeKey, number> = {
  week: 7,
  month: 30,
  '6m': 182,
  year: 365,
};

export default function BasicChart({
  title = 'Weight',
  color = '#6AE5E5',
  height = 220,
  data = generatedWeightData,
}: Props) {
  const [range, setRange] = useState<RangeKey>('month');
  const [selected, setSelected] = useState<GraphPoint | null>(null); // <- current pan selection

  // Slice the dataset so it ends at "today" if present, else last point
  const sliced: WeightPoint[] = useMemo(() => {
    if (!data?.length) return [];
    const todayStr = moment().format('YYYY-MM-DD');
    let endIndex = data.findIndex((d) => d.label === todayStr);
    if (endIndex === -1) endIndex = data.length - 1;

    const days = RANGE_TO_DAYS[range];
    const startIndex = Math.max(0, endIndex - (days - 1));
    return data.slice(startIndex, endIndex + 1);
  }, [data, range]);

  // Convert to GraphPoint[]
  const points: GraphPoint[] = useMemo(
    () =>
      sliced.map((pt) => ({
        value: pt.value,
        date: new Date(pt.label), // 'YYYY-MM-DD' -> Date
      })),
    [sliced]
  );

  // Y-range padding ±5 for breathing room
  const yRange = useMemo(() => {
    if (!points.length) return undefined as undefined | { min: number; max: number };
    const vals = points.map((p) => p.value);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const pad = 5;
    let lo = min - pad;
    let hi = max + pad;
    if (lo >= hi) {
      lo -= 0.5;
      hi += 0.5;
    }
    return { min: lo, max: hi };
  }, [points]);

  // Header date range
  const rangeLabel = useMemo(() => {
    if (!sliced.length) return '';
    const first = moment(sliced[0].label).format('MMM D');
    const last = moment(sliced[sliced.length - 1].label).format('MMM D');
    return `${first} – ${last}`;
  }, [sliced]);

  // ✅ What to show at TOP-RIGHT (outside the graph)
  // Show the *selected* value while scrubbing; otherwise show latest value
  const topRightText = useMemo(() => {
    const fmt = (p: GraphPoint) =>
      `${moment(p.date).format('MMM D')}  •  ${p.value}`;
    if (selected) return fmt(selected);
    if (points.length) return fmt(points[points.length - 1]);
    return '—';
  }, [selected, points]);

  return (
    <View style={styles.wrap}>
      {/* Header with top-right selected/last value */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{title.toUpperCase()}</Text>
          <View style={styles.under} />
          <Text style={styles.range}>{rangeLabel}</Text>
        </View>
        <View style={styles.topRightBadge}>
          <Text style={styles.badgeText}>{topRightText}</Text>
        </View>
      </View>

      {/* Graph (no x-axis labels) */}
      <View style={styles.graphBox}>
        <LineGraph
          points={points}
          animated
          color={color}
          style={{ height, width: '100%' }}
          gradientFillColors={[color, color]}
          gradientFillStartOpacity={0.5}
          gradientFillEndOpacity={0.05}
          range={{
            y: yRange,
            x:
              points.length > 0
                ? { min: points[0].date, max: points[points.length - 1].date }
                : undefined,
          }}
          enablePanGesture
          onPointSelected={(p) => setSelected(p)}  // <- update outside badge while panning
          onGestureEnd={() => setSelected(null)}   // <- revert to latest after pan ends
        />
      </View>

      {/* Bottom range selector */}
      <View style={styles.selectorRow}>
        {(['week', 'month', '6m', 'year'] as RangeKey[]).map((key) => {
          const label = key === '6m' ? '6M' : key.charAt(0).toUpperCase() + key.slice(1);
          const active = key === range;
          return (
            <TouchableOpacity
              key={key}
              onPress={() => setRange(key)}
              style={[styles.selBtn, active && styles.selBtnActive]}
              activeOpacity={0.8}
            >
              <Text style={[styles.selText, active && styles.selTextActive]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingBottom: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start' },
  title: { color: 'white', fontSize: 18, fontWeight: '700', letterSpacing: 1 },
  under: { height: 1, backgroundColor: 'white', marginVertical: 8 },
  range: { color: '#fff', fontSize: 14 },

  // ✅ Top-right readout outside the graph
  topRightBadge: {
    marginTop: 2,
    marginLeft: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#333',
    alignSelf: 'flex-start',
  },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  graphBox: {
    width: '100%',
    justifyContent: 'center',
  },

  selectorRow: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  selBtn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#444',
    backgroundColor: 'transparent',
  },
  selBtnActive: {
    backgroundColor: '#C2C2C2',
    borderColor: '#C2C2C2',
  },
  selText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  selTextActive: { color: '#000' },
});
