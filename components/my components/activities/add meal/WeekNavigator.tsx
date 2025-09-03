// components/addMeal/WeekNavigator.tsx
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { AM_COLORS as C } from './theme';
import type { DayMealData } from '@/assets/data/addMealData';

const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

type Props = {
  days: DayMealData[];
  selectedIndex: number;
  onSelectDay: (index: number) => void;
};

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

const WeekNavigator: React.FC<Props> = ({ days, selectedIndex, onSelectDay }) => {
  const weekStart = Math.floor(selectedIndex / 7) * 7;
  const weekEnd = Math.min(weekStart + 6, days.length - 1);
  const visible = days.slice(weekStart, weekEnd + 1);

  const monthLabel = new Date(days[selectedIndex].dateISO).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });

  const goPrevWeek = () => onSelectDay(clamp(selectedIndex - 7, 0, days.length - 1));
  const goNextWeek = () => onSelectDay(clamp(selectedIndex + 7, 0, days.length - 1));

  return (
    <View style={styles.container}>
      {/* Month + arrows */}
      <View style={styles.monthRow}>
        <TouchableOpacity onPress={goPrevWeek} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialIcons name="chevron-left" size={28} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.monthText}>{monthLabel}</Text>
        <TouchableOpacity onPress={goNextWeek} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialIcons name="chevron-right" size={28} color={C.text} />
        </TouchableOpacity>
      </View>

      {/* DOW labels */}
      <View style={styles.weekRow}>
        {DOW.map((label, i) => (
          <Text key={`dow-${i}`} style={styles.dow}>
            {label}
          </Text>
        ))}
      </View>

      {/* Day chips */}
      <View style={[styles.weekRow, { marginTop: 4 }]}>
        {visible.map((d, i) => {
          const index = weekStart + i;
          const selected = index === selectedIndex;
          return (
            <TouchableOpacity
              key={d.dateISO}
              style={[styles.dayChip, selected && { backgroundColor: C.orange }]}
              onPress={() => onSelectDay(index)}
              accessibilityRole="button"
              accessibilityLabel={`Select day ${d.dayNum}`}
            >
              <Text style={[styles.dayChipText, selected && { color: C.chipSelectedText }]}>{d.dayNum}</Text>
            </TouchableOpacity>
          );
        })}
        {/* Pad to 7 columns if last week is short */}
        {Array.from({ length: 7 - visible.length }).map((_, i) => (
          <View key={`pad-${i}`} style={[styles.dayChip, { backgroundColor: 'transparent' }]} />
        ))}
      </View>
    </View>
  );
};

export default WeekNavigator;

const styles = StyleSheet.create({
  container: { marginBottom: 6 },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
    marginBottom: 6,
  },
  monthText: { color: C.text, fontSize: 14, fontWeight: '600', letterSpacing: 0.5 },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 8 },
  dow: { color: C.subText, fontSize: 12 },
  dayChip: {
    height: 34,
    minWidth: 34,
    paddingHorizontal: 6,
    borderRadius: 17,
    backgroundColor: C.chip,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayChipText: { color: C.chipText, fontWeight: 'bold', fontSize: 12 },
});
