// components/MacrosChart.js
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PieChart } from 'react-native-svg-charts';

const MacrosChart = ({ data }) => {
  const pieData = data
    .filter(item => item.value > 0)
    .map((item, index) => ({
      value: item.value,
      svg: {
        fill: item.color,
      },
      key: `pie-${index}`,
    }));

  return (
    <View style={styles.container}>
      <Text style={styles.title}>MACROS</Text>
      <View style={styles.separator} />
      <View style={styles.chartRow}>
        <PieChart
          style={{ height: 150, width: 150 }}
          data={pieData}
          innerRadius={50}
          padAngle={0}
        />
        <View style={styles.legend}>
          {data.map((item, index) => (
            <View key={index} style={styles.legendItem}>
              <View style={[styles.colorBox, { backgroundColor: item.color }]} />
              <Text style={styles.label}>{item.label}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#444',
    padding: 20,
    borderRadius: 12,
    margin: 16,
  },
  title: {
    fontFamily: 'Koulen-Regular',
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 1,
    marginBottom: 6,
  },
  separator: {
    height: 1,
    backgroundColor: '#ccc',
    marginBottom: 16,
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legend: {
    marginLeft: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  colorBox: {
    width: 12,
    height: 12,
    marginRight: 8,
    borderRadius: 2,
  },
  label: {
    color: '#fff',
  },
});

export default MacrosChart;
