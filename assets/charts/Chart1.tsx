import React, { useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { dailyData, historicalData } from '../data/calorieData';

const screenWidth = Dimensions.get('window').width;

const Chart = () => {
  const [selectedRange, setSelectedRange] = useState<'day' | 'week' | 'month'>('day');

  const getDataSet = () => {
    if (selectedRange === 'day') {
      return dailyData;
    }
    if (selectedRange === 'week') {
      return historicalData.slice(0, 7);
    }
    return historicalData;
  };

  const formatXAxisLabel = (value: number) => {
    const date = new Date(value);
    if (selectedRange === 'day') {
      const hrs = date.getHours();
      const mins = date.getMinutes();
      return `${hrs}:${mins.toString().padStart(2, '0')}`;
    }
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>CALORIES</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ width: screenWidth * 1.5, height: 300 }}>
          <LineChart
            data={getDataSet()}
            height={250}
            width={screenWidth * 1.5}
            xAxisLabelTextStyle={{ color: '#fff' }}
            yAxisTextStyle={{ color: '#fff' }}
            xAxisLabelTexts={getDataSet().map((d) => formatXAxisLabel(d.timestamp))}
            yAxisLabelTexts={['0', '1000', '2000', '3000']}
            spacing={50}
            color="#FF950A"
            hideDataPoints={false}
            hideRules={false}
            yAxisThickness={1}
            xAxisThickness={1}
            showVerticalLines
            verticalLinesColor="#444"
            rulesColor="#444"
            backgroundColor="#2f2f2f"
            initialSpacing={10}
            curved
            areaChart
            noOfSections={5}
          />
        </View>
      </ScrollView>

      <View style={styles.selectorContainer}>
        {['day', 'week', 'month'].map((range) => (
          <TouchableOpacity
            key={range}
            onPress={() => setSelectedRange(range as 'day' | 'week' | 'month')}
            style={[styles.selectorButton, selectedRange === range && styles.selectedButton]}
          >
            <Text style={styles.selectorText}>{range.charAt(0).toUpperCase() + range.slice(1)}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#2f2f2f',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5
  },
  title: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8
  },
  selectorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16
  },
  selectorButton: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    marginHorizontal: 8,
    borderRadius: 20,
    backgroundColor: '#525252'
  },
  selectedButton: {
    backgroundColor: '#FF950A'
  },
  selectorText: {
    color: '#fff',
    fontWeight: '500'
  }
});

export default Chart;
