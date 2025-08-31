// components/charts/MonthChart.tsx
// ------------------------------------------------------
// Month view: accepts a long daily series (many months)
// and paginates in 30-day chunks. Step style by default.
// ------------------------------------------------------
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import moment from 'moment';
import { LineChart } from 'react-native-gifted-charts';

const { width: screenWidth } = Dimensions.get('window');

export type MonthPoint = { label: string; value: number }; // label 'YYYY-MM-DD'

type Props = {
  data: MonthPoint[];            // long array; component will chunk by 30
  title?: string;
  color?: string;
  height?: number;
  stepStyle?: boolean;
};

type ChartItem = {
  index: number;
  value: number;
  label?: string;
  __orig?: { srcIndex: number; isStepInsert?: boolean };
};

export default function MonthChart({
  data,
  title = 'Month',
  color = '#6AE5E5',
  height = 200,
  stepStyle = true,
}: Props) {
  const [page, setPage] = useState(0);

  // Build a 30-day slice
  const slice = useMemo(() => {
    const chunk = 30;
    const total = Math.ceil(data.length / chunk);
    const safe = Math.max(0, Math.min(page, Math.max(total - 1, 0)));
    const start = safe * chunk;
    return data.slice(start, start + chunk);
  }, [data, page]);

  const base: ChartItem[] = useMemo(
    () =>
      slice.map((pt, i) => ({
        index: i,
        value: pt.value,
        label: moment(pt.label, 'YYYY-MM-DD').format('D'),
        __orig: { srcIndex: i },
      })),
    [slice]
  );

  const stepped: ChartItem[] = useMemo(() => {
    if (!stepStyle || base.length <= 1) return base;
    const out: ChartItem[] = [base[0]];
    for (let i = 1; i < base.length; i++) {
      const prev = base[i - 1];
      const curr = base[i];
      out.push({
        index: out.length,
        value: prev.value,
        label: '',
        __orig: { srcIndex: i - 1, isStepInsert: true },
      });
      out.push({ ...curr, index: out.length + 1 });
    }
    return out.map((p, i) => ({ ...p, index: i }));
  }, [base, stepStyle]);

  const chartData = stepStyle ? stepped : base;
  const spacing = Math.max(screenWidth / Math.max(chartData.length, 1), 24);

  const first = slice[0];
  const headerLabel = first
    ? moment(first.label, 'YYYY-MM-DD').format('MMMM YYYY')
    : '';

  const canPrev = page > 0;
  const canNext = (page + 1) * 30 < data.length;

  return (
    <View style={{ paddingHorizontal: 16 }}>
      <Text style={styles.title}>{title.toUpperCase()}</Text>
      <View style={styles.under} />

      <View style={styles.nav}>
        <TouchableOpacity disabled={!canPrev} onPress={() => setPage((p) => Math.max(p - 1, 0))}>
          <Text style={[styles.arrow, !canPrev && styles.arrowDisabled]}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.range}>{headerLabel}</Text>
        <TouchableOpacity disabled={!canNext} onPress={() => setPage((p) => p + 1)}>
          <Text style={[styles.arrow, !canNext && styles.arrowDisabled]}>{'>'}</Text>
        </TouchableOpacity>
      </View>

      <LineChart
        data={chartData as any}
        spacing={spacing}
        textColor="white"
        noOfSections={4}
        xAxisColor="grey"
        yAxisColor="white"
        backgroundColor="transparent"
        hideDataPoints
        xAxisTextNumberOfLines={0}
        yAxisTextStyle={{ color: 'white' }}
        rulesType="solid"
        rulesColor="gray"
        color={color}
        thickness={2}
        areaChart
        startFillColor={color}
        endFillColor={color}
        startOpacity={0.5}
        endOpacity={0.05}
        overflowTop={24}
        curved={false}
        pointerConfig={{
          pointerStripHeight: height,
          pointerStripColor: 'lightgray',
          pointerStripWidth: 2,
          pointerColor: 'lightgray',
          radius: 6,
          activatePointersOnLongPress: true,
          autoAdjustPointerLabelPosition: false,
          pointerLabelComponent: (pts: any[]) => {
            const pt = pts?.[0];
            if (!pt) return null;
            const srcIndex =
              (chartData[pt.index] as any)?.__orig?.srcIndex ?? pt.index;
            const src = base[srcIndex];
            return (
              <View
                style={{
                  height: 90,
                  width: 110,
                  justifyContent: 'center',
                  marginTop: -30,
                  marginLeft: -45,
                }}
              >
                <Text style={styles.pointerTitle}>{src?.label ?? ''}</Text>
                <View style={styles.pointerBubble}>
                  <Text style={styles.pointerValue}>{pt.value}</Text>
                </View>
              </View>
            );
          },
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  title: { color: 'white', fontSize: 18, fontWeight: '700', letterSpacing: 1 },
  under: { height: 1, backgroundColor: 'white', marginVertical: 8 },
  nav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  range: { color: '#fff', fontSize: 14, fontWeight: '500' },
  arrow: { color: '#fff', fontSize: 18, paddingHorizontal: 12 },
  arrowDisabled: { color: '#808080' },
  pointerTitle: {
    color: 'white',
    fontSize: 14,
    marginBottom: 6,
    textAlign: 'center',
  },
  pointerBubble: {
    backgroundColor: 'white',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  pointerValue: { fontWeight: 'bold', textAlign: 'center' },
});
