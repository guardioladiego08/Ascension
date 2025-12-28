import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';
import { Colors } from '@/constants/Colors';

const CARD = Colors.dark.card;
const TEXT_PRIMARY = Colors.dark.text;
const TEXT_MUTED = Colors.dark.textMuted;

type Props = {
  totalKcal: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
};

const PROTEIN_COLOR = '#5E8BFF';
const CARB_COLOR = '#FFB347';
const FAT_COLOR = '#FF6B81';

const MealSummaryCard: React.FC<Props> = ({
  totalKcal,
  totalProtein,
  totalCarbs,
  totalFat,
}) => {
  const macroSum = totalProtein + totalCarbs + totalFat;

  const hasData = macroSum > 0;

  const data = hasData
    ? [
        { value: totalProtein, color: PROTEIN_COLOR },
        { value: totalCarbs, color: CARB_COLOR },
        { value: totalFat, color: FAT_COLOR },
      ]
    : [];

  return (
    <View style={styles.card}>
      <Text style={styles.sectionLabel}>MEAL SUMMARY</Text>

      <View style={styles.row}>
        <View style={styles.chartWrap}>
          {hasData ? (
            <PieChart
              data={data}
              donut
              showText
              textColor={TEXT_PRIMARY}
              textSize={12}
              innerRadius={40}
              radius={60}
              centerLabelComponent={() => (
                <View style={{ alignItems: 'center' }}>
                  <Text style={styles.centerLabel}>{Math.round(totalKcal)}</Text>
                  <Text style={styles.centerSubLabel}>kcal</Text>
                </View>
              )}
            />
          ) : (
            <View style={styles.emptyChart}>
              <Text style={styles.emptyChartText}>Add ingredients{'\n'}to see macros</Text>
            </View>
          )}
        </View>

        <View style={styles.macroStats}>
          <View style={styles.macroRow}>
            <View style={[styles.macroDot, { backgroundColor: PROTEIN_COLOR }]} />
            <View>
              <Text style={styles.macroLabel}>Protein</Text>
              <Text style={styles.macroValue}>
                {totalProtein.toFixed(1)} g
              </Text>
            </View>
          </View>

          <View style={styles.macroRow}>
            <View style={[styles.macroDot, { backgroundColor: CARB_COLOR }]} />
            <View>
              <Text style={styles.macroLabel}>Carbs</Text>
              <Text style={styles.macroValue}>{totalCarbs.toFixed(1)} g</Text>
            </View>
          </View>

          <View style={styles.macroRow}>
            <View style={[styles.macroDot, { backgroundColor: FAT_COLOR }]} />
            <View>
              <Text style={styles.macroLabel}>Fat</Text>
              <Text style={styles.macroValue}>{totalFat.toFixed(1)} g</Text>
            </View>
          </View>

          <View style={styles.kcalRow}>
            <Text style={styles.kcalLabel}>Total</Text>
            <Text style={styles.kcalValue}>{Math.round(totalKcal)} kcal</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

export default MealSummaryCard;

const styles = StyleSheet.create({
  card: {
    backgroundColor: CARD,
    borderRadius: 18,
    padding: 16,
  },
  sectionLabel: {
    color: TEXT_MUTED,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
  },
  chartWrap: {
    width: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyChart: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 1,
    borderColor: '#3A4763',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  emptyChartText: {
    color: TEXT_MUTED,
    fontSize: 11,
    textAlign: 'center',
  },
  centerLabel: {
    color: TEXT_PRIMARY,
    fontWeight: '800',
    fontSize: 18,
  },
  centerSubLabel: {
    color: TEXT_MUTED,
    fontSize: 11,
  },
  macroStats: {
    flex: 1,
    paddingLeft: 12,
    justifyContent: 'space-between',
  },
  macroRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  macroDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  macroLabel: {
    color: TEXT_MUTED,
    fontSize: 11,
  },
  macroValue: {
    color: TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: '600',
  },
  kcalRow: {
    marginTop: 8,
  },
  kcalLabel: {
    color: TEXT_MUTED,
    fontSize: 11,
  },
  kcalValue: {
    color: TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: '700',
  },
});
