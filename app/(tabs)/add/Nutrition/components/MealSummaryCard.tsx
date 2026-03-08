import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';

import { useAppTheme } from '@/providers/AppThemeProvider';

type Props = {
  totalKcal: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
};

const CHART_SIZE = 132;

const MealSummaryCard: React.FC<Props> = ({
  totalKcal,
  totalProtein,
  totalCarbs,
  totalFat,
}) => {
  const { colors, fonts, globalStyles } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);

  const macroSum = totalProtein + totalCarbs + totalFat;
  const hasData = macroSum > 0;

  const data = hasData
    ? [
        { value: totalProtein, color: colors.macroProtein },
        { value: totalCarbs, color: colors.macroCarbs },
        { value: totalFat, color: colors.macroFats },
      ]
    : [];

  return (
    <View style={[globalStyles.panel, styles.card]}>
      <View style={styles.headerRow}>
        <View>
          <Text style={globalStyles.eyebrow}>Nutrition Summary</Text>
          <Text style={styles.title}>Recipe breakdown</Text>
        </View>
        <View style={styles.totalPill}>
          <Text style={styles.totalPillLabel}>Total</Text>
          <Text style={styles.totalPillValue}>{Math.round(totalKcal)} kcal</Text>
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.chartWrap}>
          {hasData ? (
            <PieChart
              data={data}
              donut
              showText={false}
              innerCircleColor={colors.cardDark}
              innerRadius={42}
              radius={64}
              centerLabelComponent={() => (
                <View style={styles.centerLabelWrap}>
                  <Text style={styles.centerLabel}>{Math.round(totalKcal)}</Text>
                  <Text style={styles.centerSubLabel}>kcal</Text>
                </View>
              )}
            />
          ) : (
            <View style={styles.emptyChart}>
              <Text style={styles.emptyTitle}>No ingredients yet</Text>
              <Text style={styles.emptyText}>Add foods to preview calories and macros.</Text>
            </View>
          )}
        </View>

        <View style={styles.metricCol}>
          <MacroRow
            label="Protein"
            value={`${totalProtein.toFixed(1)} g`}
            color={colors.macroProtein}
            styles={styles}
          />
          <MacroRow
            label="Carbs"
            value={`${totalCarbs.toFixed(1)} g`}
            color={colors.macroCarbs}
            styles={styles}
          />
          <MacroRow
            label="Fat"
            value={`${totalFat.toFixed(1)} g`}
            color={colors.macroFats}
            styles={styles}
          />
        </View>
      </View>
    </View>
  );
};

function MacroRow({
  label,
  value,
  color,
  styles,
}: {
  label: string;
  value: string;
  color: string;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.metricRow}>
      <View style={[styles.metricDot, { backgroundColor: color }]} />
      <View style={styles.metricCopy}>
        <Text style={styles.metricLabel}>{label}</Text>
        <Text style={styles.metricValue}>{value}</Text>
      </View>
    </View>
  );
}

function createStyles(
  colors: ReturnType<typeof useAppTheme>['colors'],
  fonts: ReturnType<typeof useAppTheme>['fonts']
) {
  return StyleSheet.create({
    card: {
      gap: 18,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
    },
    title: {
      marginTop: 8,
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 22,
      lineHeight: 26,
      letterSpacing: -0.5,
    },
    totalPill: {
      minWidth: 88,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.accentSoft,
      alignItems: 'flex-end',
    },
    totalPillLabel: {
      color: colors.highlight1,
      fontFamily: fonts.label,
      fontSize: 10,
      lineHeight: 12,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    totalPillValue: {
      marginTop: 4,
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 14,
      lineHeight: 18,
    },
    row: {
      flexDirection: 'row',
      gap: 18,
      alignItems: 'center',
    },
    chartWrap: {
      width: CHART_SIZE,
      minHeight: CHART_SIZE,
      alignItems: 'center',
      justifyContent: 'center',
    },
    centerLabelWrap: {
      alignItems: 'center',
    },
    centerLabel: {
      color: colors.text,
      fontFamily: fonts.display,
      fontSize: 22,
      lineHeight: 24,
      letterSpacing: -0.7,
    },
    centerSubLabel: {
      marginTop: 2,
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 11,
      lineHeight: 14,
    },
    emptyChart: {
      width: CHART_SIZE,
      minHeight: CHART_SIZE,
      borderRadius: CHART_SIZE / 2,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card2,
      paddingHorizontal: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyTitle: {
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 14,
      lineHeight: 18,
      textAlign: 'center',
    },
    emptyText: {
      marginTop: 6,
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 11,
      lineHeight: 15,
      textAlign: 'center',
    },
    metricCol: {
      flex: 1,
      gap: 10,
    },
    metricRow: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card2,
      paddingHorizontal: 12,
      paddingVertical: 11,
    },
    metricDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      marginRight: 10,
    },
    metricCopy: {
      flex: 1,
    },
    metricLabel: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 11,
      lineHeight: 14,
    },
    metricValue: {
      marginTop: 4,
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 15,
      lineHeight: 18,
    },
  });
}

export default MealSummaryCard;
