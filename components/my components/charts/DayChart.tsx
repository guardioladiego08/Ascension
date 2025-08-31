// components/charts/DayChart.tsx
// ------------------------------------------------------
// Day view: expects intraday points (e.g., 24-48 pts).
// Renders in step style by default.
// ------------------------------------------------------
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import moment from 'moment';
import { LineChart } from 'react-native-gifted-charts';

const { width: screenWidth } = Dimensions.get('window');

export type DayPoint = { label: string; value: number }; // label like 'HH:mm' or ISO

type Props = {
  data: DayPoint[];                 // intraday series (ordered)
  title?: string;
  color?: string;
  height?: number;
  stepStyle?: boolean;              // default true
};

type ChartItem = {
  index: number;
  value: number;
  label?: string;
  __orig?: { srcIndex: number; isStepInsert?: boolean };
};

export default function DayChart({
  data,
  title = 'Day',
  color = '#6AE5E5',
  height = 200,
  stepStyle = true,
}: Props) {
  // build base array with readable labels
  const base: ChartItem[] = useMemo(
    () =>
      data.map((pt, i) => ({
        index: i,
        value: pt.value,
        label: moment(pt.label, ['HH:mm', moment.ISO_8601]).format('HH:mm'),
        __orig: { srcIndex: i },
      })),
    [data]
  );

  // transform to "step" staircase by inserting flat segments
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

  return (
    <View style={{ paddingHorizontal: 16 }}>
      <Text style={styles.title}>{title.toUpperCase()}</Text>
      <View style={styles.under} />

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
