import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';

import ExpandableGraphSurface from '@/components/charts/ExpandableGraphSurface';
import { useAppTheme } from '@/providers/AppThemeProvider';
import { HOME_TONES } from '../../../home/tokens';

type Props = {
  totalKcal: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
};

const CHART_SIZE = 132;
const EXPANDED_CHART_MAX = 260;

const MealSummaryCard: React.FC<Props> = ({
  totalKcal,
  totalProtein,
  totalCarbs,
  totalFat,
}) => {
  const { colors, fonts } = useAppTheme();
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
    <View style={[styles.panel, styles.card]}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.eyebrow}>Nutrition Summary</Text>
          <Text style={styles.title}>Recipe breakdown</Text>
        </View>
        <View style={styles.totalPill}>
          <Text style={styles.totalPillLabel}>Total</Text>
          <Text style={styles.totalPillValue}>{Math.round(totalKcal)} kcal</Text>
        </View>
      </View>
      <ExpandableGraphSurface
        actionBackgroundColor={HOME_TONES.surface1}
        actionIconColor={HOME_TONES.textPrimary}
        surfaceStyle={styles.graphSurface}
      >
        {({ width, mode }) => {
          const isExpanded = mode === 'expanded';
          const useColumnLayout = isExpanded && width < 520;
          const chartSize = isExpanded
            ? Math.min(Math.max(width * 0.44, 188), EXPANDED_CHART_MAX)
            : CHART_SIZE;
          const radius = Math.round(chartSize * 0.48);
          const innerRadius = Math.round(radius * 0.66);
          const innerCircleColor = HOME_TONES.surface2;

          return (
            <View
              style={[
                styles.graphContent,
                isExpanded ? styles.graphContentExpanded : null,
              ]}
            >
              <View
                style={[
                  styles.row,
                  isExpanded ? styles.rowExpanded : null,
                  useColumnLayout ? styles.rowExpandedColumn : null,
                ]}
              >
                <View style={[styles.chartWrap, { width: chartSize, minHeight: chartSize }]}>
                  {hasData ? (
                    <PieChart
                      data={data}
                      donut
                      showText={false}
                      innerCircleColor={innerCircleColor}
                      innerRadius={innerRadius}
                      radius={radius}
                      centerLabelComponent={() => (
                        <View style={styles.centerLabelWrap}>
                          <Text
                            style={[
                              styles.centerLabel,
                              isExpanded ? styles.centerLabelExpanded : null,
                            ]}
                          >
                            {Math.round(totalKcal)}
                          </Text>
                          <Text
                            style={[
                              styles.centerSubLabel,
                              isExpanded ? styles.centerSubLabelExpanded : null,
                            ]}
                          >
                            kcal
                          </Text>
                        </View>
                      )}
                    />
                  ) : (
                    <View
                      style={[
                        styles.emptyChart,
                        {
                          width: chartSize,
                          minHeight: chartSize,
                          borderRadius: chartSize / 2,
                        },
                      ]}
                    >
                      <Text style={styles.emptyTitle}>No ingredients yet</Text>
                      <Text style={styles.emptyText}>
                        Add foods to preview calories and macros.
                      </Text>
                    </View>
                  )}
                </View>

                <View
                  style={[
                    styles.metricCol,
                    isExpanded ? styles.metricColExpanded : null,
                    useColumnLayout ? styles.metricColExpandedColumn : null,
                  ]}
                >
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
        }}
      </ExpandableGraphSurface>
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
    panel: {
      backgroundColor: HOME_TONES.surface1,
      borderRadius: 28,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      padding: 22,
    },
    eyebrow: {
      color: HOME_TONES.textTertiary,
      fontFamily: fonts.label,
      fontSize: 11,
      lineHeight: 14,
      letterSpacing: 0.9,
      textTransform: 'uppercase',
    },
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
      color: HOME_TONES.textPrimary,
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
      borderColor: HOME_TONES.borderSoft,
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
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.heading,
      fontSize: 14,
      lineHeight: 18,
    },
    row: {
      flexDirection: 'row',
      gap: 18,
      alignItems: 'center',
    },
    rowExpanded: {
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    rowExpandedColumn: {
      flexDirection: 'column',
      alignItems: 'stretch',
    },
    graphSurface: {
      borderRadius: 24,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      backgroundColor: HOME_TONES.surface2,
    },
    graphContent: {
      padding: 18,
    },
    graphContentExpanded: {
      paddingHorizontal: 22,
      paddingVertical: 24,
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
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.display,
      fontSize: 22,
      lineHeight: 24,
      letterSpacing: -0.7,
    },
    centerLabelExpanded: {
      fontSize: 32,
      lineHeight: 34,
    },
    centerSubLabel: {
      marginTop: 2,
      color: HOME_TONES.textSecondary,
      fontFamily: fonts.body,
      fontSize: 11,
      lineHeight: 14,
    },
    centerSubLabelExpanded: {
      fontSize: 13,
      lineHeight: 16,
    },
    emptyChart: {
      width: CHART_SIZE,
      minHeight: CHART_SIZE,
      borderRadius: CHART_SIZE / 2,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      backgroundColor: HOME_TONES.surface2,
      paddingHorizontal: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyTitle: {
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.heading,
      fontSize: 14,
      lineHeight: 18,
      textAlign: 'center',
    },
    emptyText: {
      marginTop: 6,
      color: HOME_TONES.textSecondary,
      fontFamily: fonts.body,
      fontSize: 11,
      lineHeight: 15,
      textAlign: 'center',
    },
    metricCol: {
      flex: 1,
      gap: 10,
    },
    metricColExpanded: {
      minWidth: 220,
    },
    metricColExpandedColumn: {
      minWidth: 0,
      width: '100%',
    },
    metricRow: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 16,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      backgroundColor: HOME_TONES.surface2,
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
      color: HOME_TONES.textSecondary,
      fontFamily: fonts.body,
      fontSize: 11,
      lineHeight: 14,
    },
    metricValue: {
      marginTop: 4,
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.heading,
      fontSize: 15,
      lineHeight: 18,
    },
  });
}

export default MealSummaryCard;
