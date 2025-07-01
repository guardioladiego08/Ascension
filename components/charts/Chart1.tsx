import chartData from '@/assets/data/chartData.json';
import moment from 'moment';
import React, { useState } from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';

const screenWidth = Dimensions.get('window').width;

const TotalWeightChart = () => {
  const [selectedRange, setSelectedRange] = useState<'Day' | 'Week' | 'Month'>('Month');
  const [rangeIndex, setRangeIndex] = useState(0);

  const maxXAxisLabels = 12;

  const getCumulativeDayData = () => {
    let cumulative = 0;
    return chartData.dailyData.map((item, index) => {
      cumulative += item.value;
      return {
        label: item.label,
        value: cumulative,
        dataPointText: String(cumulative),
      };
    });
  };

  const getChartData = () => {
  const labels = chartData.historicalLabels;
  const values = chartData.historicalValues;

  if (selectedRange === 'Day') {
    return getCumulativeDayData();
  }

  const chunkSize = selectedRange === 'Week' ? 7 : 30;
  const totalChunks = Math.ceil(labels.length / chunkSize);
  const safeIndex = Math.max(0, Math.min(rangeIndex, totalChunks - 1));

  const start = safeIndex * chunkSize;
  const end = Math.min(start + chunkSize, labels.length);

  return labels.slice(start, end).map((label, i) => ({
    label: i % 2 === 0 ? moment(label, 'YY-MM-DD').format('D') : '', // 👈 every other
    value: values[start + i],
    dataPointText: String(values[start + i]),
}));

};


  const getRangeLabel = () => {
    if (selectedRange === 'Day') {
      return moment().format('MMMM D, YYYY');
    }

    const labels = chartData.historicalLabels;
    const chunkSize = selectedRange === 'Week' ? 7 : 30;
    const totalChunks = Math.ceil(labels.length / chunkSize);
    const safeIndex = Math.max(0, Math.min(rangeIndex, totalChunks - 1));

    const start = safeIndex * chunkSize;
    const end = Math.min(start + chunkSize, labels.length - 1);

    const startDate = moment(labels[start], 'YY-MM-DD').format('MMM D');
    const endDate = moment(labels[end], 'YY-MM-DD').format('MMM D');

    return selectedRange === 'Week'
      ? `${startDate} - ${endDate}`
      : moment(labels[start], 'YY-MM-DD').format('MMMM');
  };

  const handleNext = () => {
    const maxIndex = Math.floor(chartData.historicalLabels.length / (selectedRange === 'Week' ? 7 : 30));
    setRangeIndex(prev => Math.min(prev + 1, maxIndex));
  };

  const handlePrev = () => {
    setRangeIndex(prev => Math.max(prev - 1, 0));
  };

  const renderToggle = () => (
    <View style={styles.toggleContainer}>
      {['Day', 'Week', 'Month'].map(range => (
        <TouchableOpacity
          key={range}
          style={[
            styles.toggleButton,
            selectedRange === range && styles.toggleSelected,
          ]}
          onPress={() => {
            setSelectedRange(range as any);
            setRangeIndex(0);
          }}>
          <Text style={styles.toggleText}>{range}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const chartDataSet = getChartData();
  const xAxisInterval = Math.ceil(chartDataSet.length / maxXAxisLabels);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>TOTAL WEIGHT</Text>
      {renderToggle()}
      <View style={styles.rangeContainer}>
        <TouchableOpacity onPress={handlePrev}>
          <Text style={styles.arrow}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.monthLabel}>{getRangeLabel()}</Text>
        <TouchableOpacity onPress={handleNext}>
          <Text style={styles.arrow}>{'>'}</Text>
        </TouchableOpacity>
      </View>
      <LineChart
        data={chartDataSet}
        spacing={screenWidth / chartDataSet.length}
        xAxisLabelTextStyle={{ color: 'white', fontSize: 10 }}
        yAxisTextStyle={{ color: 'white' }}
        showVerticalLines
        showYAxis
        showXAxis
        xAxisColor="gray"
        yAxisColor="gray"
        noOfSections={5}
        yAxisLabelTexts={['2000', '2400', '2800', '3200', '3600']}
        xAxisIndicesHeight={2}
        yAxisThickness={1}
        xAxisIndicesWidth={1}
        xAxisLabelWidth={screenWidth / maxXAxisLabels}
        color="#6AE5E5"
        thickness={2}
        dataPointsColor="#ffffff"
        showDataPoint
        hideDataPointsText={false}
        initialSpacing={0}
        areaChart
        startFillColor="#6AE5E5"
        endFillColor="#6AE5E5"
        startOpacity={0.3}
        endOpacity={0.1}
        xAxisLabelTexts={chartDataSet.map((item, i) =>
         i % xAxisInterval === 0 ? item.label : ''
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
    width: '100%',
    marginTop: 16,

  },
  title: {
    textAlign: 'center',
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
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
  monthLabel: {
    color: '#fff',
    fontSize: 12,
  },
  arrow: {
    color: '#fff',
    fontSize: 18,
    paddingHorizontal: 12,
  },
});

export default TotalWeightChart;
