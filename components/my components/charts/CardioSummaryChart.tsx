// components/my componentscharts/CardioSummaryChart.tsx
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import moment from 'moment';
import { LineGraph, type GraphPoint } from 'react-native-graph';
import { GlobalStyles } from '@/constants/GlobalStyles';
import { SelectionDot } from './CustomSelectionDot'; // ✅ same as BasicChart

export type WeightPoint = { label: string; value: number };

type Props = {
  title: string;
  color: string;
  height?: number;
  data: WeightPoint[];
};

const screenWidth = Dimensions.get('window').width;

export default function CardioSummaryChart({
  title,
  color,
  height = 220,
  data,
}: Props) {
  const [selected, setSelected] = useState<GraphPoint | null>(null);

  // --- Sort by timestamp
  const sorted = useMemo(() => {
    if (!data?.length) return [];
    return [...data].sort((a, b) => (a.label < b.label ? -1 : 1));
  }, [data]);

  // --- Convert to GraphPoints
  const points: GraphPoint[] = useMemo(
    () =>
      sorted.map((pt) => ({
        value: pt.value,
        date: new Date(pt.label),
      })),
    [sorted]
  );

  // --- Compute ranges
  const yRange = useMemo(() => {
    if (!points.length) return undefined;
    const vals = points.map((p) => p.value);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const pad = 5;
    return { min: min - pad, max: max + pad };
  }, [points]);

  // --- Header date range
  const rangeLabel = useMemo(() => {
    if (!sorted.length) return '';
    const first = moment(sorted[0].label).format('MMM D, h:mm a');
    const last = moment(sorted[sorted.length - 1].label).format('h:mm a');
    return `${first} – ${last}`;
  }, [sorted]);

  // --- Top-right value label
  const topRightText = useMemo(() => {
    const fmt = (p: GraphPoint) =>
      `${moment(p.date).format('h:mm a')}  •  ${p.value.toFixed(2)}`;
    if (selected) return fmt(selected);
    if (points.length) return fmt(points[points.length - 1]);
    return '—';
  }, [selected, points]);

  return (
    <View style={[GlobalStyles.Chart.wrap, { marginTop: 12 }]}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={GlobalStyles.subtitle}>{title.toUpperCase()}</Text>
          <Text style={GlobalStyles.text}>{rangeLabel}</Text>
        </View>
        <View style={GlobalStyles.Chart.badge}>
          <Text style={GlobalStyles.Chart.text}>{topRightText}</Text>
        </View>
      </View>

      {/* Chart */}
      <View style={[styles.graphBox, { height }]}>
        {points.length > 1 ? (
          <LineGraph
            points={points}
            animated
            color={color}
            style={{ height, width: screenWidth * 0.9 }}
            gradientFillColors={[color, 'rgba(255,255,255,0.26)']}
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
            // ✅ Add SelectionDot renderer
            SelectionDot={({ isActive }) =>
              isActive && <SelectionDot color={color} />
            }
          />
        ) : (
          <Text style={styles.noData}>Not enough data</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  graphBox: {
    width: '100%',
    justifyContent: 'center',
    marginTop: 4,
  },
  noData: {
    textAlign: 'center',
    color: '#aaa',
    marginTop: 24,
  },
});
