import moment from 'moment';
import React, { useState } from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';

const screenWidth = Dimensions.get('window').width;

type RangeType = 'week' | 'month' | 'year';

type DataPoint = {
  label: string;
  value: number;
};

type Props = {
  dataset: {
    dailyData: DataPoint[]; // 7 items
    monthlyData: DataPoint[]; // ~30 items
    yearlyData: DataPoint[]; // 12 items
  };
  chartColor?: string;
  chartHeight?: number;
  initialRange?: RangeType;
  title?: string;
};

const RangeChart: React.FC<Props> = ({
  dataset,
  chartColor = '#6AE5E5',
  chartHeight = 200,
  initialRange = 'month',
  title = 'Chart',
}) => {
  const [selectedRange, setSelectedRange] = useState<RangeType>(initialRange);
  const [rangeIndex, setRangeIndex] = useState(0);

  const getChartData = () => {
    let dataSet: DataPoint[] = [];

    if (selectedRange === 'week') {
        // Calculate start of the week based on current rangeIndex
        const startOfWeek = moment().startOf('isoWeek').subtract(rangeIndex, 'weeks');
        const endOfWeek = moment(startOfWeek).add(6, 'days');

        // Match 7 days from Monday to Sunday
        dataSet = dataset.dailyData.filter((entry) => {
        const date = moment(entry.label, 'YYYY-MM-DD');
        return date.isSameOrAfter(startOfWeek, 'day') && date.isSameOrBefore(endOfWeek, 'day');
        });
    } else if (selectedRange === 'month') {
        const chunkSize = 30;
        const start = rangeIndex * chunkSize;
        dataSet = dataset.monthlyData.slice(start, start + chunkSize);
    } else if (selectedRange === 'year') {
        dataSet = dataset.yearlyData;
    }

    return dataSet.map((item, index) => ({
        label:
        selectedRange === 'year'
            ? moment().month(index).format('MMM')
            : selectedRange === 'month'
            ? moment(item.label, 'YYYY-MM-DD').format('D')
            : moment(item.label, 'YYYY-MM-DD').format('ddd'), // Weekday
        value: item.value,
        dataPointText: String(item.value),
        index,
    }));
    };

    const getRangeLabel = () => {
    if (selectedRange === 'week') {
        const startOfWeek = moment().startOf('isoWeek').subtract(rangeIndex, 'weeks');
        const endOfWeek = moment(startOfWeek).add(6, 'days');
        return `${startOfWeek.format('MMM D')} - ${endOfWeek.format('MMM D')}`;
    }

    if (selectedRange === 'month') {
        const firstDay = dataset.monthlyData[rangeIndex * 30];
        if (firstDay) return moment(firstDay.label, 'YYYY-MM-DD').format('MMMM');
        return 'Month';
    }

    if (selectedRange === 'year') {
        const year = moment().format('YYYY');
        return year;
    }

    return '';
};


  const handleNext = () => {
    if (selectedRange === 'month') {
      const maxIndex = Math.floor(dataset.monthlyData.length / 30);
      setRangeIndex(prev => Math.min(prev + 1, maxIndex));
    }
  };

  const handlePrev = () => {
    if (selectedRange === 'month') {
      setRangeIndex(prev => Math.max(prev - 1, 0));
    }
  };

  const chartDataSet = getChartData();
  const xAxisInterval = Math.ceil(chartDataSet.length / 12);
  const yValues = chartDataSet.map(d => d.value);
  const minY = Math.min(...yValues);
  const maxY = Math.max(...yValues);
  const sectionCount = 4;

  const renderToggle = () => (
    <View style={styles.toggleContainer}>
      {(['week', 'month', 'year'] as RangeType[]).map(range => (
        <TouchableOpacity
          key={range}
          style={[styles.toggleButton, selectedRange === range && styles.toggleSelected]}
          onPress={() => {
            setSelectedRange(range);
            setRangeIndex(0);
          }}>
          <Text style={styles.toggleText}>
            {range.charAt(0).toUpperCase() + range.slice(1).toLowerCase()}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <View style={[styles.container, { height: chartHeight + 120 }]}>
      <Text style={styles.title}>{title.toUpperCase()}</Text>
      <View style={styles.underline} />
      {renderToggle()}
      {selectedRange === 'month' && (
        <View style={styles.rangeContainer}>
          <TouchableOpacity onPress={handlePrev}>
            <Text style={styles.arrow}>{'<'}</Text>
          </TouchableOpacity>
          <Text style={styles.rangeLabel}>Month {rangeIndex + 1}</Text>
          <TouchableOpacity onPress={handleNext}>
            <Text style={styles.arrow}>{'>'}</Text>
          </TouchableOpacity>
        </View>
      )}
      <LineChart
        data={chartDataSet}
        spacing={screenWidth / chartDataSet.length}
        noOfSections={sectionCount}
        xAxisColor="grey"
        yAxisColor="white"
        backgroundColor="transparent"
        hideDataPoints
        xAxisTextNumberOfLines={0}
        yAxisThickness={0}
        rulesType="solid"
        rulesColor="gray"
        yAxisTextStyle={{ color: 'white' }}
        color={chartColor}
        thickness={2}
        areaChart
        startFillColor={chartColor}
        endFillColor={chartColor}
        startOpacity={0.5}
        endOpacity={0.05}
        overflowTop={10}
        pointerConfig={{
          pointerStripHeight: 160,
          pointerStripColor: 'lightgray',
          pointerStripWidth: 2,
          pointerColor: 'lightgray',
          radius: 6,
          pointerLabelWidth: 100,
          pointerLabelHeight: 90,
          activatePointersOnLongPress: true,
          autoAdjustPointerLabelPosition: false,
          pointerLabelComponent: items => {
            if (!items?.[0]) return null;
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
                  {chartDataSet[items[0].index]?.label}
                </Text>
                <View
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 6,
                    borderRadius: 16,
                    backgroundColor: 'white',
                  }}>
                  <Text style={{ fontWeight: 'bold', textAlign: 'center' }}>
                    {items[0].value}
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
    backgroundColor: 'transparent',
    marginTop: 20,
    marginBottom: 20
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
    marginTop: 4,
    marginBottom: 16,
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    borderRadius: 20,
    padding: 4,
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
    fontWeight: '500',
    fontSize: 13,
  },
  rangeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  rangeLabel: {
    color: '#fff',
    fontSize: 14,
  },
  arrow: {
    color: '#fff',
    fontSize: 18,
    paddingHorizontal: 12,
  },
});

export default RangeChart;
