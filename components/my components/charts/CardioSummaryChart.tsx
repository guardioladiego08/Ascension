import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import moment from 'moment';
import { LineGraph, type GraphPoint } from 'react-native-graph';

import ExpandableGraphSurface from '@/components/charts/ExpandableGraphSurface';
import { GlobalStyles } from '@/constants/GlobalStyles';

import { SelectionDot } from './CustomSelectionDot';

export type WeightPoint = { label: string; value: number };

type Props = {
  title: string;
  color: string;
  height?: number;
  data: WeightPoint[];
};

const CARD_PADDING = 18;

export default function CardioSummaryChart({
  title,
  color,
  height = 220,
  data,
}: Props) {
  const [selected, setSelected] = useState<GraphPoint | null>(null);

  const sorted = useMemo(() => {
    if (!data?.length) return [];
    return [...data].sort((a, b) => (a.label < b.label ? -1 : 1));
  }, [data]);

  const points: GraphPoint[] = useMemo(
    () =>
      sorted.map((pt) => ({
        value: pt.value,
        date: new Date(pt.label),
      })),
    [sorted]
  );

  const yRange = useMemo(() => {
    if (!points.length) return undefined;
    const values = points.map((p) => p.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    return { min: min - 5, max: max + 5 };
  }, [points]);

  const rangeLabel = useMemo(() => {
    if (!sorted.length) return '';
    const first = moment(sorted[0].label).format('MMM D, h:mm a');
    const last = moment(sorted[sorted.length - 1].label).format('h:mm a');
    return `${first} - ${last}`;
  }, [sorted]);

  const topRightText = useMemo(() => {
    const fmt = (point: GraphPoint) =>
      `${moment(point.date).format('h:mm a')}  •  ${point.value.toFixed(2)}`;
    if (selected) return fmt(selected);
    if (points.length) return fmt(points[points.length - 1]);
    return '—';
  }, [points, selected]);

  return (
    <ExpandableGraphSurface
      actionBackgroundColor="rgba(255,255,255,0.12)"
      actionIconColor="#F8FAFC"
      style={{ marginTop: 12 }}
      surfaceStyle={GlobalStyles.Chart.wrap}
    >
      {({ width, height: surfaceHeight, mode }) => {
        const chartWidth = Math.max(width - CARD_PADDING * 2, 0);
        const chartHeight =
          mode === 'expanded'
            ? Math.max(height, Math.min(Math.max(surfaceHeight - 110, height + 120), 380))
            : height;

        return (
          <View style={styles.content}>
            <View style={styles.headerRow}>
              <View style={{ flex: 1 }}>
                <Text style={GlobalStyles.subtitle}>{title.toUpperCase()}</Text>
                <Text style={GlobalStyles.text}>{rangeLabel}</Text>
              </View>
              <View style={GlobalStyles.Chart.badge}>
                <Text style={GlobalStyles.Chart.text}>{topRightText}</Text>
              </View>
            </View>

            <View style={[styles.graphBox, { height: chartHeight }]}>
              {points.length > 1 && chartWidth > 0 ? (
                <LineGraph
                  points={points}
                  animated
                  color={color}
                  style={{ height: chartHeight, width: chartWidth }}
                  gradientFillColors={[color, 'rgba(255,255,255,0.26)']}
                  range={{
                    y: yRange,
                    x:
                      points.length > 0
                        ? { min: points[0].date, max: points[points.length - 1].date }
                        : undefined,
                  }}
                  enablePanGesture
                  onPointSelected={(point) => setSelected(point)}
                  onGestureEnd={() => setSelected(null)}
                  SelectionDot={({ isActive }) =>
                    isActive ? <SelectionDot color={color} /> : null
                  }
                />
              ) : points.length > 1 ? (
                <Text style={styles.noData}>Measuring chart…</Text>
              ) : (
                <Text style={styles.noData}>Not enough data</Text>
              )}
            </View>
          </View>
        );
      }}
    </ExpandableGraphSurface>
  );
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
  },
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
