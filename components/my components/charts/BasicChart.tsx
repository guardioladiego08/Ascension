// components/charts/BasicChart.tsx
// --------------------------------------------------------------------
// BasicChart — receives props from parent (home.tsx):
//   - title (chart name)
//   - color (line + fill color)
//   - data  (array of { label: 'YYYY-MM-DD', value: number })
// Includes a bottom range selector (Week / Month / 6M / Year).
// When range is Week/Month/6M/Year, the slice ends on “today” if present,
// otherwise ends on the latest available point. animated={true}.
// No x-axis labels are rendered.
// --------------------------------------------------------------------
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import moment from 'moment';
import { LineGraph, type GraphPoint } from 'react-native-graph';

export type WeightPoint = { label: string; value: number };

type RangeKey = 'week' | 'month' | '6m' | 'year';

type Props = {
  /** Header title shown above the chart */
  title: string;
  /** Line/fill color for the chart */
  color: string;
  /** Chart height (px) */
  height?: number;
  /** Data to plot (must be YYYY-MM-DD ascending ideally) */
  data: WeightPoint[];
};

const RANGE_TO_DAYS: Record<RangeKey, number> = {
  week: 7,
  month: 30,
  '6m': 182,
  year: 365,
};

export default function BasicChart({
  title,
  color,
  height = 220,
  data,
}: Props) {
  const [range, setRange] = useState<RangeKey>('month');
  const [selected, setSelected] = useState<GraphPoint | null>(null);

  // Ensure we’re working with a stable ascending list by date (safety)
  const sorted = useMemo<WeightPoint[]>(() => {
    if (!data?.length) return [];
    return [...data].sort((a, b) =>
      a.label < b.label ? -1 : a.label > b.label ? 1 : 0
    );
  }, [data]);

  // Slice the dataset so it ends at "today" if present, else last point
  const sliced: WeightPoint[] = useMemo(() => {
    if (!sorted.length) return [];
    const todayStr = moment().format('YYYY-MM-DD');

    let endIndex = sorted.findIndex((d) => d.label === todayStr);
    if (endIndex === -1) endIndex = sorted.length - 1;

    const days = RANGE_TO_DAYS[range];
    const startIndex = Math.max(0, endIndex - (days - 1));
    return sorted.slice(startIndex, endIndex + 1);
  }, [sorted, range]);

  // Convert to react-native-graph points
  const points: GraphPoint[] = useMemo(
    () =>
      sliced.map((pt) => ({
        value: pt.value,
        date: new Date(pt.label), // 'YYYY-MM-DD' -> Date
      })),
    [sliced]
  );

  // Padded y-range (±5)
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

  // Header’s date range text
  const rangeLabel = useMemo(() => {
    if (!sliced.length) return '';
    const first = moment(sliced[0].label).format('MMM D');
    const last = moment(sliced[sliced.length - 1].label).format('MMM D');
    return `${first} – ${last}`;
  }, [sliced]);

  // Top-right badge text (outside graph). Shows selected while scrubbing,
  // otherwise shows the latest value in the current slice.
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
          gradientFillColors={[color, 'rgba(255, 255, 255, 0.26)']} 

          range={{
            y: yRange,
            x:
              points.length > 0
                ? { min: points[0].date, max: points[points.length - 1].date }
                : undefined,
          }}
          enablePanGesture
          onPointSelected={(p) => setSelected(p)}
          onGestureEnd={() => setSelected(null)}
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
  wrap: { paddingHorizontal: 16, paddingTop: 100 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start' },
  title: { color: 'white', fontSize: 18, fontWeight: '700', letterSpacing: 1 },
  under: { height: 1, backgroundColor: 'white', marginVertical: 8 },
  range: { color: '#fff', fontSize: 14 },

  // Top-right readout outside the graph
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
