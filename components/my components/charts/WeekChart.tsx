// components/charts/WeekChart.tsx
// ------------------------------------------------------
// Pan-to-read: show the currently selected value at the
// TOP-RIGHT *outside* of <LineGraph/> while scrubbing.
// Also keeps your vertical Y-axis title on the left.
// ------------------------------------------------------
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import moment from 'moment';
import { LineGraph, type GraphPoint } from 'react-native-graph';

export type WeekPoint = { label: string; value: number }; // label: 'YYYY-MM-DD'

type Props = {
  data: WeekPoint[];
  title?: string;
  color?: string;
  height?: number;
  /** Text to show as the vertical Y-axis label (e.g., "Calories") */
  yAxisLabel?: string;
};

export default function WeekChart({
  data,
  title = 'Week',
  color = '#4484B2',
  height = 220,
  yAxisLabel = 'Value',
}: Props) {
  // Convert incoming data to GraphPoint (value + Date)
  const points: GraphPoint[] = useMemo(
    () =>
      data.map((pt) => ({
        value: pt.value,
        date: moment(pt.label, 'YYYY-MM-DD').toDate(),
      })),
    [data]
  );

  // Selected point while panning
  const [selected, setSelected] = useState<GraphPoint | null>(null);

  // Header label range
  const dates = data.map((d) => moment(d.label, 'YYYY-MM-DD'));
  const rangeLabel =
    dates.length > 0
      ? `${moment.min(dates).format('MMM D')} – ${moment.max(dates).format('MMM D')}`
      : '';

  // What to show in the top-right badge
  const topRightText = selected
    ? `${moment(selected.date).format('MMM D')}  •  ${selected.value}`
    : '—';

  return (
    <View style={styles.wrap}>
      {/* Title + date range */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{title.toUpperCase()}</Text>
          <View style={styles.under} />
          <Text style={styles.range}>{rangeLabel}</Text>
        </View>

        {/* ✅ This is OUTSIDE <LineGraph/> and sits top-right */}
        <View style={styles.topRightBadge}>
          <Text style={styles.badgeText}>{topRightText}</Text>
        </View>
      </View>

      {/* Chart row: Y-axis label (rotated) + graph */}
      <View style={styles.chartRow}>
        <View style={styles.graphBox}>
          <LineGraph
            points={points}
            animated
            color={color}
            style={{ height, flex: 1 }}
            // ✅ Enable pan gesture + update our top-right readout
            enablePanGesture
            onPointSelected={(p) => setSelected(p)}
            onGestureEnd={() => setSelected(null)}
          />
        </View>
      </View>

      {/* Simple weekday labels under the chart */}
      <View style={styles.xLabels}>
        {data.map((pt, i) => (
          <Text key={i} style={styles.xLabel}>
            {moment(pt.label, 'YYYY-MM-DD').format('ddd')}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16 },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  title: { color: 'white', fontSize: 18, fontWeight: '700', letterSpacing: 1 },
  under: { height: 1, backgroundColor: 'white', marginVertical: 8 },
  range: { color: '#fff', fontSize: 14 },

  // ✅ Top-right readout that lives OUTSIDE the graph
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

  chartRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  yAxisLabelBox: {
    width: 30,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    marginRight: 6,
  },

  graphBox: { flex: 1 },

  xLabels: {
    marginTop: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  xLabel: { color: 'white', fontSize: 12, width: 36, textAlign: 'center' },
});
