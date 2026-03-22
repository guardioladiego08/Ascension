import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { useAppTheme } from '@/providers/AppThemeProvider';
import { HOME_TONES } from '../../../home/tokens';

type Props = {
  dateLabel: string;
  totalKcal: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  kcalTarget?: number | null;
  proteinTarget?: number | null;
  carbsTarget?: number | null;
  fatTarget?: number | null;
};

type MacroBarProps = {
  label: string;
  total: number;
  target: number | null | undefined;
  unit: string;
  fillColor: string;
  styles: ReturnType<typeof createStyles>;
};

const DailyStatsCard: React.FC<Props> = ({
  dateLabel,
  totalKcal,
  totalProtein,
  totalCarbs,
  totalFat,
  kcalTarget,
  proteinTarget,
  carbsTarget,
  fatTarget,
}) => {
  const { colors, fonts } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);

  const safeTotalKcal = totalKcal || 0;
  const safeKcalTarget = kcalTarget && kcalTarget > 0 ? kcalTarget : null;
  const calorieRatio =
    safeKcalTarget && safeKcalTarget > 0
      ? Math.min(safeTotalKcal / safeKcalTarget, 1)
      : 0;

  return (
    <View style={[styles.panel, styles.card]}>
      <View style={styles.summaryCard}>
        <Text style={styles.dateText}>{dateLabel}</Text>
        <Text style={styles.kcalLabel}>Calories logged</Text>
        <Text style={styles.kcalValue}>{Math.round(safeTotalKcal)} kcal</Text>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${Math.max(calorieRatio * 100, safeTotalKcal > 0 ? 12 : 0)}%` },
            ]}
          />
        </View>
        <Text style={styles.kcalTargetText}>
          {safeKcalTarget
            ? `Target ${Math.round(safeKcalTarget)} kcal`
            : 'No calorie target set'}
        </Text>
      </View>

      <View style={styles.rightCol}>
        <MacroBar
          label="Protein"
          total={totalProtein}
          target={proteinTarget}
          unit="g"
          fillColor={colors.macroProtein}
          styles={styles}
        />
        <MacroBar
          label="Carbs"
          total={totalCarbs}
          target={carbsTarget}
          unit="g"
          fillColor={colors.macroCarbs}
          styles={styles}
        />
        <MacroBar
          label="Fat"
          total={totalFat}
          target={fatTarget}
          unit="g"
          fillColor={colors.macroFats}
          styles={styles}
        />
      </View>
    </View>
  );
};

const MacroBar: React.FC<MacroBarProps> = ({
  label,
  total,
  target,
  unit,
  fillColor,
  styles,
}) => {
  const safeTotal = total || 0;
  const safeTarget = target && target > 0 ? target : null;
  const ratio =
    safeTarget && safeTarget > 0
      ? Math.min(safeTotal / safeTarget, 1)
      : 0;

  return (
    <View style={styles.macroCard}>
      <View style={styles.macroLabelRow}>
        <Text style={styles.macroLabel}>{label}</Text>
        <Text style={styles.macroValue}>
          {safeTotal.toFixed(1)}
          {unit}
          {safeTarget ? ` / ${safeTarget.toFixed(0)}${unit}` : ''}
        </Text>
      </View>
      <View style={styles.macroBarOuter}>
        <View
          style={[
            styles.macroBarInner,
            {
              backgroundColor: fillColor,
              width: `${Math.max(ratio * 100, safeTotal > 0 ? 10 : 0)}%`,
            },
          ]}
        />
      </View>
    </View>
  );
};

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
    card: {
      gap: 16,
    },
    summaryCard: {
      borderRadius: 20,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      backgroundColor: HOME_TONES.surface2,
      padding: 16,
    },
    dateText: {
      color: HOME_TONES.textTertiary,
      fontFamily: fonts.label,
      fontSize: 11,
      lineHeight: 13,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    },
    kcalLabel: {
      marginTop: 12,
      color: HOME_TONES.textSecondary,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 17,
    },
    kcalValue: {
      marginTop: 4,
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.display,
      fontSize: 30,
      lineHeight: 34,
      letterSpacing: -0.8,
    },
    progressTrack: {
      marginTop: 16,
      height: 10,
      borderRadius: 999,
      backgroundColor: HOME_TONES.surface3,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: 999,
      backgroundColor: colors.highlight1,
    },
    kcalTargetText: {
      marginTop: 10,
      color: HOME_TONES.textTertiary,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 16,
    },
    rightCol: {
      gap: 10,
    },
    macroCard: {
      borderRadius: 18,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      backgroundColor: HOME_TONES.surface2,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    macroLabelRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 12,
    },
    macroLabel: {
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.heading,
      fontSize: 14,
      lineHeight: 18,
    },
    macroValue: {
      color: HOME_TONES.textSecondary,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 16,
    },
    macroBarOuter: {
      marginTop: 12,
      height: 8,
      borderRadius: 999,
      backgroundColor: HOME_TONES.surface3,
      overflow: 'hidden',
    },
    macroBarInner: {
      height: '100%',
      borderRadius: 999,
    },
  });
}

export default DailyStatsCard;
