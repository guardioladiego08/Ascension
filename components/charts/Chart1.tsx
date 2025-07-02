import chartData from '@/assets/data/chartData.json';
import { Colors } from '@/constants/Colors';
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
    return chartData.dailyData.map((item) => {
      cumulative += item.value;
      return {
        label: item.label,
        value: cumulative,
        dataPointText: String(cumulative),
      };
    });
  };

  const getChartData = () => {
    if (!chartData?.historicalLabels || !chartData?.historicalValues) {
      return [];
    }

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
      label: i % 2 === 0 ? moment(label, 'YY-MM-DD').format('D') : '',
      value: values[start + i],
      dataPointText: String(values[start + i]),
      index: start + i,
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
          style={[styles.toggleButton, selectedRange === range && styles.toggleSelected]}
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
  const yValues = chartDataSet.map(d => d.value);
  const minY = Math.min(...yValues);
  const maxY = Math.max(...yValues);

  const sectionCount = 4;
  const yAxisLabelTexts = [];
  for (let i = 0; i <= sectionCount; i++) {
    const y = Math.round(minY + ((maxY - minY) / sectionCount) * i);
    yAxisLabelTexts.push(y.toString());
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>CALORIES</Text>
      <View style={styles.underline} />
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
        <View style={styles.chart}>
        <LineChart
          
          data={chartDataSet}
          backgroundColor="transparent"
          hideDataPoints
          spacing={screenWidth / (chartDataSet.length + 2)}
          noOfSections={4}
          yAxisColor="white"
          yAxisThickness={0}
          rulesType="solid"
          rulesColor="gray"
          yAxisTextStyle={{color: 'white'}}
          //yAxisLabelSuffix="cal"
          xAxisColor="white"
          //showVerticalLines={false}
          //noOfSections={sectionCount}
          //yAxisLabelTexts={yAxisLabelTexts}
          //xAxisLabelTexts={chartDataSet.map((item, i) =>
          //  i % xAxisInterval === 0 ? item.label : ''
          //)}
          //xAxisLabelTextStyle={{ color: 'white', fontSize: 10 }}
          //yAxisTextStyle={{ color: 'white' }}
          color="#6AE5E5"
          thickness={2}
          areaChart
          startFillColor="#6AE5E5"
          endFillColor="#6AE5E5"
          startOpacity={0.5}
          endOpacity={0.05}
          overflowTop={10}
          pointerConfig={{
            pointerStripUptoDataPoint: true,
            pointerStripColor: 'lightgray',
            pointerStripWidth: 2,
            strokeDashArray: [2, 5],
            pointerColor: 'lightgray',
            radius: 4,
            pointerLabelWidth: 85,
            pointerLabelHeight: 120,  
            pointerLabelComponent: (items) => {
              if (!items?.[0]) return null;

              const rawDate = chartData.historicalLabels[items[0].index];
              const formattedDate = moment(rawDate, 'YY-MM-DD').format('MM/DD');

              return (
                <View 
                  style={{ 
                    alignItems: 'center', 
                    backgroundColor: '#282C3E', 
                  }}>
                  <Text style={{ color: 'white', fontSize: 12, marginBottom: 1 }}>
                    {formattedDate}
                  </Text>
                  <View
                    style={{
                      height: 40,
                      paddingHorizontal: 12,
                      backgroundColor: '#282C3E',
                      borderRadius: 20,
                      justifyContent: 'center',
                      alignItems: 'center',
                      flexDirection: 'row',
                    }}
                  >
                    <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 13 }}>
                      {items[0].value}
                    </Text>
                    <Text style={{ color: 'lightgray', fontSize: 13, marginLeft: 4 }}>
                      cal
                    </Text>
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
    color: Colors.text,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1,
  },
  underline: {
    height: 1,
    backgroundColor: Colors.text,
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
  monthLabel: {
    color: '#fff',
    fontSize: 12,
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
