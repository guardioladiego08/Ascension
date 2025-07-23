// RangeChart.tsx

// Install these up-to-date deps before using:
//   yarn add react-native-gifted-charts@^0.6.10 moment@^2.29.4

import moment from 'moment';
import React, { useState } from 'react';
import {
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LineChart } from 'react-native-gifted-charts';

const { width: screenWidth } = Dimensions.get('window');

type RangeType = 'week' | 'month' | 'year';

interface DataPoint {
  label: string; // 'YYYY-MM-DD' for daily/monthly, ignored for yearly
  value: number;
}

interface Props {
  dataset: {
    dailyData: DataPoint[];    // exactly 7 points
    monthlyData: DataPoint[];  // ~30 points
    yearlyData: DataPoint[];   // 12 points
  };
  chartColor?: string;
  chartHeight?: number;
  initialRange?: RangeType;
  title?: string;
}

const RangeChart: React.FC<Props> = ({
  dataset,
  chartColor = '#6AE5E5',
  chartHeight = 200,
  initialRange = 'month',
  title = 'Chart',
}) => {
  const [selectedRange, setSelectedRange] = useState<RangeType>(initialRange);
  const [pageIndex, setPageIndex] = useState(0);

  /** 1. Select raw slice based on range */
  const getRawSlice = (): DataPoint[] => {
    if (selectedRange === 'week') {
      return dataset.dailyData;
    }
    if (selectedRange === 'month') {
      const start = pageIndex * 30;
      return dataset.monthlyData.slice(start, start + 30);
    }
    return dataset.yearlyData;
  };

  /** 2. Map to gifted-charts format + labels */
  const chartData = getRawSlice().map((pt, i) => ({
    index: i,
    value: pt.value,
    dataPointText: String(pt.value),
    label:
      selectedRange === 'year'
        ? moment().month(i).format('MMM')
        : selectedRange === 'month'
        ? moment(pt.label, 'YYYY-MM-DD').format('D')
        : moment(pt.label, 'YYYY-MM-DD').format('ddd'),
  }));

  /** 3. Compute spacing with a sensible minimum */
  const rawSpacing = screenWidth / (chartData.length || 1);
  const spacing = Math.max(rawSpacing, 30);

  /** 4. Generate the text for the current range */
  const getRangeLabel = () => {
    if (selectedRange === 'week') {
      const dates = dataset.dailyData.map(d => moment(d.label, 'YYYY-MM-DD'));
      return `${moment.min(dates).format('MMM D')} – ${moment
        .max(dates)
        .format('MMM D')}`;
    }
    if (selectedRange === 'month') {
      const first = dataset.monthlyData[pageIndex * 30];
      return first
        ? moment(first.label, 'YYYY-MM-DD').format('MMMM')
        : '';
    }
    return moment().format('YYYY');
  };

  /** 5. Handlers for month pagination */
  const prevPage = () => setPageIndex(i => Math.max(i - 1, 0));
  const nextPage = () => {
    const maxPage = Math.floor(dataset.monthlyData.length / 30);
    setPageIndex(i => Math.min(i + 1, maxPage));
  };

  return (
    <View style={[styles.container, { height: chartHeight + 120 }]}>
      {/* Title */}
      <Text style={styles.title}>{title.toUpperCase()}</Text>
      <View style={styles.underline} />

      {/* Range toggles */}
      <View style={styles.toggleContainer}>
        {(['week', 'month', 'year'] as RangeType[]).map(r => (
          <TouchableOpacity
            key={r}
            style={[
              styles.toggleButton,
              selectedRange === r && styles.toggleSelected,
            ]}
            onPress={() => {
              setSelectedRange(r);
              setPageIndex(0);
            }}
          >
            <Text style={styles.toggleText}>
              {r.charAt(0).toUpperCase() + r.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Range label / month nav */}
      {selectedRange === 'month' ? (
        <View style={styles.navContainer}>
          <TouchableOpacity onPress={prevPage}>
            <Text style={styles.arrow}>{'<'}</Text>
          </TouchableOpacity>
          <Text style={styles.rangeLabel}>{getRangeLabel()}</Text>
          <TouchableOpacity onPress={nextPage}>
            <Text style={styles.arrow}>{'>'}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Text style={[styles.rangeLabel, { textAlign: 'center' }]}>
          {getRangeLabel()}
        </Text>
      )}

      {/* LineChart */}
      <LineChart

        data={chartData}
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
        color={chartColor}
        thickness={2}
        areaChart
        startFillColor={chartColor}
        endFillColor={chartColor}
        startOpacity={0.5}
        endOpacity={0.05}
        overflowTop={30}
        pointerConfig={{
          pointerStripHeight: chartHeight,
          pointerStripColor: 'lightgray',
          pointerStripWidth: 2,
          pointerColor: 'lightgray',
          radius: 6,
          activatePointersOnLongPress: true,
          autoAdjustPointerLabelPosition: false,
          pointerLabelComponent: pts => {
            const pt = pts?.[0];
            if (!pt) return null;
             return (
              <View
                style={{
                  height: 90,
                  width: 100,
                  justifyContent: 'center',
                  marginTop: -30,
                  marginLeft: -40,
                }}>
                <Text style={{ color: 'white', fontSize: 14, marginBottom: 6, textAlign: 'center' }}>
                  {chartData[pt.index].label}
                </Text>
                <View
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 6,
                    borderRadius: 16,
                    backgroundColor: 'white',
                  }}>
                  <Text style={{ fontWeight: 'bold', textAlign: 'center' }}>
                    {pt.value}
                  </Text>
                </View>
              </View>
            );
          },
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    width: '100%',
    marginVertical: 20,
  },
  title: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1,
  },
  underline: {
    height: 1,
    backgroundColor: 'white',
    marginVertical: 8,
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 8,
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
    fontSize: 13,
    fontWeight: '500',
  },
  navContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  rangeLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  arrow: {
    color: '#fff',
    fontSize: 18,
    paddingHorizontal: 12,
  },
  pointer: {
    position: 'absolute',
    top: -100,
    left: -40,
    alignItems: 'center',
  },
  pointerLabel: {
    color: 'white',
    fontSize: 14,
    marginBottom: 6,
  },
  pointerBubble: {
    backgroundColor: 'white',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  pointerValue: {
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default RangeChart;
