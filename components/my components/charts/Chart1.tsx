// components/TotalWeightChart.tsx
// deps (up to date & not deprecated):
//   yarn add react-native-gifted-charts@^0.6.10 moment@^2.29.4
//
// This version reads FOUR explicit datasets from chartData.json:
// 1) dailyData   -> 2 separate days, each with intraday points
// 2) weeklyData  -> 3 separate weeks, each with 7 daily points
// 3) monthlyData -> 12 months (relative to the current year)
// 4) yearlyData  -> 2 years (yearly totals)
//
// It defaults to the CURRENT DAY if found in dailyData; otherwise it selects the last day entry.

import chartData from '@/assets/data/chartData.json';
import { Colors } from '@/constants/Colors';
import moment from 'moment';
import React, { useMemo, useState } from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';

const screenWidth = Dimensions.get('window').width;

type RangeKey = 'Day' | 'Week' | 'Month' | 'Year';

type Point = {
  label: string;
  value: number;
  // optional helper for tooltips
  subLabel?: string; // e.g., full date for weekly
};

type DailySeries = {
  date: string;              // YYYY-MM-DD
  points: { label: string; value: number }[]; // e.g., hh:mm labels
};

type WeeklySeries = {
  weekLabel: string;         // e.g., "Aug 11–17, 2025"
  points: { label: string; value: number; subLabel?: string }[]; // labels "Mon..Sun"
};

type MonthlySeries = {
  year: string;              // e.g., "2025"
  points: { label: string; value: number }[]; // 12 items "Jan..Dec"
};

type YearlySeries = {
  points: { label: string; value: number }[]; // e.g., "2024","2025"
};

const sectionCount = 4;
const maxXAxisLabels = 12;

const TotalWeightChart: React.FC = () => {
  // pick default index to TODAY if present in dailyData
  const defaultDayIndex = useMemo(() => {
    const today = moment().format('YYYY-MM-DD');
    const idx = (chartData.dailyData as DailySeries[]).findIndex(d => d.date === today);
    return idx >= 0 ? idx : Math.max(0, (chartData.dailyData as DailySeries[]).length - 1);
  }, []);

  const [selectedRange, setSelectedRange] = useState<RangeKey>('Day');
  const [rangeIndex, setRangeIndex] = useState<number>(defaultDayIndex);

  // Build the plotted dataset based on the active range + index
  const series = useMemo<Point[]>(() => {
    switch (selectedRange) {
      case 'Day': {
        const days = (chartData.dailyData as DailySeries[]) ?? [];
        const safeIdx = Math.max(0, Math.min(rangeIndex, Math.max(0, days.length - 1)));
        const chosen = days[safeIdx];
        if (!chosen) return [];
        return chosen.points.map(p => ({ label: p.label, value: p.value }));
      }
      case 'Week': {
        const weeks = (chartData.weeklyData as WeeklySeries[]) ?? [];
        const safeIdx = Math.max(0, Math.min(rangeIndex, Math.max(0, weeks.length - 1)));
        const chosen = weeks[safeIdx];
        if (!chosen) return [];
        return chosen.points.map(p => ({ label: p.label, value: p.value, subLabel: p.subLabel }));
      }
      case 'Month': {
        const months = (chartData.monthlyData as MonthlySeries) ?? null;
        if (!months) return [];
        return months.points.map(p => ({ label: p.label, value: p.value }));
      }
      case 'Year': {
        const years = (chartData.yearlyData as YearlySeries) ?? null;
        if (!years) return [];
        return years.points.map(p => ({ label: p.label, value: p.value }));
      }
      default:
        return [];
    }
  }, [selectedRange, rangeIndex]);

  // Range label above the chart
  const rangeLabel = useMemo(() => {
    if (selectedRange === 'Day') {
      const days = (chartData.dailyData as DailySeries[]) ?? [];
      const safeIdx = Math.max(0, Math.min(rangeIndex, Math.max(0, days.length - 1)));
      const d = days[safeIdx]?.date;
      return d ? moment(d, 'YYYY-MM-DD').format('MMMM D, YYYY') : '';
    }
    if (selectedRange === 'Week') {
      const weeks = (chartData.weeklyData as WeeklySeries[]) ?? [];
      const safeIdx = Math.max(0, Math.min(rangeIndex, Math.max(0, weeks.length - 1)));
      return weeks[safeIdx]?.weekLabel ?? '';
    }
    if (selectedRange === 'Month') {
      const months = (chartData.monthlyData as MonthlySeries) ?? null;
      return months ? months.year : '';
    }
    // Year
    return 'Yearly';
  }, [selectedRange, rangeIndex]);

  // paging
  const canPage = (dir: 'prev' | 'next') => {
    if (selectedRange === 'Day') {
      const n = ((chartData.dailyData as DailySeries[]) ?? []).length;
      return dir === 'prev' ? rangeIndex > 0 : rangeIndex < n - 1;
    }
    if (selectedRange === 'Week') {
      const n = ((chartData.weeklyData as WeeklySeries[]) ?? []).length;
      return dir === 'prev' ? rangeIndex > 0 : rangeIndex < n - 1;
    }
    // Month & Year don't page—single series each
    return false;
  };

  const handlePrev = () => {
    if (selectedRange === 'Day' || selectedRange === 'Week') {
      setRangeIndex(i => Math.max(0, i - 1));
    }
  };

  const handleNext = () => {
    if (selectedRange === 'Day') {
      const n = ((chartData.dailyData as DailySeries[]) ?? []).length;
      setRangeIndex(i => Math.min(n - 1, i + 1));
    } else if (selectedRange === 'Week') {
      const n = ((chartData.weeklyData as WeeklySeries[]) ?? []).length;
      setRangeIndex(i => Math.min(n - 1, i + 1));
    }
  };

  // y-axis labels
  const yValues = series.map(p => p.value);
  const minY = yValues.length ? Math.min(...yValues) : 0;
  const maxY = yValues.length ? Math.max(...yValues) : 1;

  const yAxisLabelTexts: string[] = [];
  for (let i = 0; i <= sectionCount; i++) {
    const y = Math.round(minY + ((maxY - minY) / sectionCount) * i);
    yAxisLabelTexts.push(y.toString());
  }

  const spacing =
    series.length > 0
      ? Math.max(18, screenWidth / Math.min(series.length, maxXAxisLabels))
      : 24;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>CALORIES</Text>
      <View style={styles.underline} />

      {/* Toggle */}
      <View style={styles.toggleContainer}>
        {(['Day', 'Week', 'Month', 'Year'] as RangeKey[]).map(r => (
          <TouchableOpacity
            key={r}
            style={[styles.toggleButton, selectedRange === r && styles.toggleSelected]}
            onPress={() => {
              setSelectedRange(r);
              // when returning to Day, attempt to default to Today again
              if (r === 'Day') setRangeIndex(defaultDayIndex);
              else setRangeIndex(0);
            }}
          >
            <Text style={styles.toggleText}>{r}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Range header & arrows */}
      <View style={styles.rangeContainer}>
        <TouchableOpacity onPress={handlePrev} disabled={!canPage('prev')}>
          <Text style={[styles.arrow, !canPage('prev') && { opacity: 0.3 }]}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.monthLabel}>{rangeLabel}</Text>
        <TouchableOpacity onPress={handleNext} disabled={!canPage('next')}>
          <Text style={[styles.arrow, !canPage('next') && { opacity: 0.3 }]}>{'>'}</Text>
        </TouchableOpacity>
      </View>

      {/* Chart */}
      <View style={styles.chart}>
        <LineChart
          data={series}
          xAxisTextNumberOfLines={0}
          xAxisColor={'white'}
          backgroundColor="transparent"
          hideDataPoints
          spacing={spacing}
          noOfSections={sectionCount}
          yAxisColor="white"
          yAxisThickness={0}
          rulesType="solid"
          rulesColor="gray"
          yAxisTextStyle={{ color: 'white' }}
          color="#6AE5E5"
          thickness={2}
          areaChart
          startFillColor="#6AE5E5"
          endFillColor="#6AE5E5"
          startOpacity={0.5}
          endOpacity={0.05}
          overflowTop={10}
          pointerConfig={{
            pointerStripHeight: 160,
            pointerStripColor: 'lightgray',
            pointerStripWidth: 2,
            pointerColor: 'lightgray',
            radius: 6,
            pointerLabelWidth: 120,
            pointerLabelHeight: 90,
            activatePointersOnLongPress: true,
            autoAdjustPointerLabelPosition: false,
            pointerLabelComponent: items => {
              const it = items?.[0];
              if (!it) return null;

              // Build a friendly label per range
              let top = '';
              if (selectedRange === 'Day') {
                // use intraday label, plus the date
                const days = (chartData.dailyData as DailySeries[]) ?? [];
                const dIdx = Math.max(0, Math.min(rangeIndex, Math.max(0, days.length - 1)));
                top = `${days[dIdx]?.date ?? ''} ${series[it.index]?.label ?? ''}`;
              } else if (selectedRange === 'Week') {
                // label (Mon..Sun) + subLabel full date if provided
                const p = series[it.index];
                top = p?.subLabel ? `${p.label} ${p.subLabel}` : p?.label ?? '';
              } else if (selectedRange === 'Month') {
                const months = (chartData.monthlyData as MonthlySeries) ?? null;
                top = `${months?.year ?? ''} ${series[it.index]?.label ?? ''}`;
              } else {
                top = series[it.index]?.label ?? '';
              }

              return (
                <View
                  style={{
                    height: 90,
                    width: 120,
                    justifyContent: 'center',
                    marginTop: -30,
                    marginLeft: -50,
                  }}>
                  <Text style={{ color: 'white', fontSize: 12, marginBottom: 6, textAlign: 'center' }}>
                    {top}
                  </Text>
                  <View
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 6,
                      borderRadius: 16,
                      backgroundColor: 'white',
                    }}>
                    <Text style={{ fontWeight: 'bold', textAlign: 'center' }}>{it.value}</Text>
                  </View>
                </View>
              );
            },
          }}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
    width: '100%',
    backgroundColor: 'transparent',
  },
  title: {
    color: Colors.dark.text,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1,
  },
  underline: {
    height: 1,
    backgroundColor: Colors.dark.text,
    marginTop: 4,
    marginBottom: 16,
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    borderRadius: 20,
    padding: 4,
    marginBottom: 8,
    gap: 6,
  },
  toggleButton: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 16,
  },
  toggleSelected: {
    backgroundColor: '#C2C2C2',
  },
  toggleText: {
    color: '#fff',
    fontWeight: '500',
    fontSize: 13,
  },
  rangeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  monthLabel: {
    color: '#fff',
    fontSize: 14,
  },
  arrow: {
    color: '#fff',
    fontSize: 18,
    paddingHorizontal: 12,
  },
  chart: {
    paddingVertical: 15,
  },
});

export default TotalWeightChart;
