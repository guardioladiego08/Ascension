// app/(tabs)/nutrition/add/Nutrition/components/DailyStatsCard.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/Colors';

const CARD = Colors.dark.card;
const TEXT_PRIMARY = '#EAF2FF';
const TEXT_MUTED = '#9AA4BF';
const PRIMARY_GREEN = '#15C779';
const BAR_BG = '#1E293B';

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
};

const MacroBar: React.FC<MacroBarProps> = ({ label, total, target, unit }) => {
  const safeTotal = total || 0;
  const safeTarget = target && target > 0 ? target : null;
  const ratio =
    safeTarget && safeTarget > 0
      ? Math.min(safeTotal / safeTarget, 1)
      : 0;

  return (
    <View style={styles.macroRow}>
      <View style={styles.macroLabelCol}>
        <Text style={styles.macroLabel}>{label}</Text>
        <Text style={styles.macroValue}>
          {safeTotal.toFixed(1)}
          {unit}
          {safeTarget ? ` / ${safeTarget.toFixed(0)}${unit}` : ''}
        </Text>
      </View>
      <View style={styles.macroBarOuter}>
        <View style={[styles.macroBarInner, { flex: ratio }]} />
        <View style={{ flex: 1 - ratio }} />
      </View>
    </View>
  );
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
  const safeTotalKcal = totalKcal || 0;
  const safeKcalTarget = kcalTarget && kcalTarget > 0 ? kcalTarget : null;

  return (
    <View style={styles.card}>
      {/* Left: Calories summary */}
      <View style={styles.leftCol}>
        <Text style={styles.dateText}>{dateLabel}</Text>
        <Text style={styles.kcalLabel}>Calories</Text>
        <Text style={styles.kcalValue}>
          {Math.round(safeTotalKcal)} kcal
        </Text>
        {safeKcalTarget ? (
          <Text style={styles.kcalTargetText}>
            of {Math.round(safeKcalTarget)} kcal target
          </Text>
        ) : (
          <Text style={styles.kcalTargetText}>
            No calorie target set
          </Text>
        )}
      </View>

      {/* Right: Macro bars */}
      <View style={styles.rightCol}>
        <MacroBar
          label="Protein"
          total={totalProtein}
          target={proteinTarget}
          unit="g"
        />
        <MacroBar
          label="Carbs"
          total={totalCarbs}
          target={carbsTarget}
          unit="g"
        />
        <MacroBar
          label="Fat"
          total={totalFat}
          target={fatTarget}
          unit="g"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: CARD,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  leftCol: {
    flex: 0.9,
    marginRight: 10,
  },
  rightCol: {
    flex: 1.1,
    justifyContent: 'center',
  },
  dateText: {
    color: TEXT_MUTED,
    fontSize: 11,
    marginBottom: 4,
  },
  kcalLabel: {
    color: TEXT_MUTED,
    fontSize: 12,
    fontWeight: '600',
  },
  kcalValue: {
    color: TEXT_PRIMARY,
    fontSize: 22,
    fontWeight: '700',
    marginTop: 2,
  },
  kcalTargetText: {
    color: TEXT_MUTED,
    fontSize: 11,
    marginTop: 4,
  },
  macroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  macroLabelCol: {
    width: 70,
  },
  macroLabel: {
    color: TEXT_PRIMARY,
    fontSize: 11,
    fontWeight: '600',
  },
  macroValue: {
    color: TEXT_MUTED,
    fontSize: 10,
  },
  macroBarOuter: {
    flex: 1,
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: BAR_BG,
    flexDirection: 'row',
  },
  macroBarInner: {
    backgroundColor: PRIMARY_GREEN,
    borderRadius: 999,
  },
});

export default DailyStatsCard;
