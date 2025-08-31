// components/charts/RangeDrivenChart.tsx
// ------------------------------------------------------
// Thin wrapper that composes the 5 components you asked for:
//  - RangeSelector (selects the view)
//  - DayChart / WeekChart / MonthChart / YearChart (render based on selection)
// Keep using up-to-date deps:
//   yarn add react-native-gifted-charts@^0.6.10 moment@^2.29.4
// ------------------------------------------------------
import React, { useState } from 'react';
import { View } from 'react-native';
import RangeSelector, { RangeKey } from './RangeSelector';
import WeekChart, { WeekPoint } from './WeekChart';
import MonthChart, { MonthPoint } from './MonthChart';
import YearChart, { YearPoint, YearSeriesEntry } from './YearChart';

export type DataPoint = { label: string; value: number };

type Props = {
  title?: string;
  color?: string;
  height?: number;
  // Provide whatever you have; components gracefully use what they need.
  weekData: WeekPoint[];             // 7 points required
  monthData: MonthPoint[];           // long list (will paginate 30/day)
  yearData?: YearPoint[];            // 12 points (single-year)
  yearSeries?: YearSeriesEntry[];    // optional multi-year
  initial?: RangeKey;                // default 'month'
};

export default function RangeDrivenChart({
  title = 'Chart',
  color = '#6AE5E5',
  height = 200,
  weekData,
  monthData,
  yearData,
  yearSeries,
  initial = 'month',
}: Props) {
  const [range, setRange] = useState<RangeKey>(initial);

  return (
    <View>
      <RangeSelector value={range} onChange={setRange} />

      {range === 'week' && (
        <WeekChart title={title} color={color} height={height} data={weekData} />
      )}

      {range === 'month' && (
        <MonthChart title={title} color={color} height={height} data={monthData} />
      )}

      {range === 'year' && (
        <YearChart
          title={title}
          color={color}
          height={height}
          data={yearData}
          series={yearSeries}
        />
      )}
    </View>
  );
}
