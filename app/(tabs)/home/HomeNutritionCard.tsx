import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Text, TouchableOpacity, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import type { useAppTheme } from '@/providers/AppThemeProvider';
import type { HomeStyles } from './styles';
import type { MacroRow } from './types';

function CalorieDonut({
  progress,
  valueLabel,
  secondaryLabel,
  accentColor,
  trackColor,
  styles,
}: {
  progress: number;
  valueLabel: string;
  secondaryLabel: string;
  accentColor: string;
  trackColor: string;
  styles: HomeStyles;
}) {
  const size = 150;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashLength = Math.max(progress * circumference, 0);
  const shouldRenderProgress = dashLength > 0.5;

  return (
    <View style={styles.donutWrap}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {shouldRenderProgress ? (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={accentColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${dashLength} ${circumference}`}
            rotation={-90}
            originX={size / 2}
            originY={size / 2}
          />
        ) : null}
      </Svg>

      <View style={styles.donutCenter}>
        <Text style={styles.donutValue}>{valueLabel}</Text>
        <Text style={styles.donutLabel}>kcal</Text>
        <Text style={styles.donutSubtext}>{secondaryLabel}</Text>
      </View>
    </View>
  );
}

function MacroComparisonRow({
  label,
  actual,
  goal,
  color,
  styles,
}: {
  label: string;
  actual: number;
  goal: number;
  color: string;
  styles: HomeStyles;
}) {
  const progress = goal > 0 ? Math.max(0, Math.min(1, actual / goal)) : 0;

  return (
    <View style={styles.macroRow}>
      <View style={styles.macroRowTop}>
        <Text style={styles.macroLabel}>{label}</Text>
        <Text style={styles.macroValue}>
          {`${Math.round(actual)}g`}
          {goal > 0 ? ` / ${Math.round(goal)}g` : ' / goal off'}
        </Text>
      </View>

      <View style={styles.macroTrack}>
        <View
          style={[
            styles.macroFill,
            { width: `${progress * 100}%`, backgroundColor: color },
          ]}
        />
      </View>
    </View>
  );
}

export function HomeNutritionCard({
  todayLabel,
  caloriesActual,
  caloriesGoal,
  macroRows,
  styles,
  colors,
  globalStyles,
  onOpenSummary,
}: {
  todayLabel: string;
  caloriesActual: number;
  caloriesGoal: number;
  macroRows: MacroRow[];
  styles: HomeStyles;
  colors: ReturnType<typeof useAppTheme>['colors'];
  globalStyles: ReturnType<typeof useAppTheme>['globalStyles'];
  onOpenSummary: () => void;
}) {
  return (
    <View style={[globalStyles.panel, styles.nutritionCard]}>
      <View style={styles.nutritionBackdropFrame} />
      <View style={styles.nutritionBackdropStripe} />

      <View style={styles.nutritionHeader}>
        <View>
          <Text style={globalStyles.eyebrow}>Daily fuel</Text>
          <Text style={styles.cardTitle}>Nutrition for {todayLabel}</Text>
        </View>
      </View>

      <View style={styles.nutritionRow}>
        <View style={styles.calorieDialBlock}>
          <CalorieDonut
            progress={caloriesGoal ? Math.max(0, Math.min(1, caloriesActual / caloriesGoal)) : 0}
            valueLabel={Math.round(caloriesActual).toLocaleString()}
            secondaryLabel={caloriesGoal ? `${Math.round(caloriesGoal).toLocaleString()} goal` : 'No goal'}
            accentColor={colors.highlight1}
            trackColor={colors.card3}
            styles={styles}
          />
        </View>

        <View style={styles.macroPanel}>
          {macroRows.map((macro) => (
            <MacroComparisonRow
              key={macro.key}
              label={macro.label}
              actual={macro.actual}
              goal={macro.goal}
              color={macro.color}
              styles={styles}
            />
          ))}
        </View>
      </View>

      <View style={styles.nutritionActions}>
        <TouchableOpacity
          activeOpacity={0.92}
          style={[globalStyles.buttonPrimary, styles.nutritionButton, styles.nutritionButtonFull]}
          onPress={onOpenSummary}
        >
          <Ionicons name="analytics-outline" size={16} color={colors.blkText} />
          <Text style={globalStyles.buttonTextPrimary}>Daily summary</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
