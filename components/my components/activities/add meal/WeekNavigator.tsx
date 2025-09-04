// components/my components/activities/add meal/WeekNavigator.tsx

import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import type { DayMealData } from '@/assets/data/addMealData';
import { GlobalStyles } from '@/constants/GlobalStyles';

// Labels for days of the week, abbreviated
const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

// Props expected by this component
type Props = {
  days: DayMealData[];             // Array of days with meal data
  selectedIndex: number;           // Index of the currently selected day
  onSelectDay: (index: number) => void; // Callback when a day is selected
};

// Utility function: keeps a number within min/max bounds
const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));

const WeekNavigator: React.FC<Props> = ({ days, selectedIndex, onSelectDay }) => {
  // Calculate which week the selected day belongs to
  const weekStart = Math.floor(selectedIndex / 7) * 7;     // first index of current week
  const weekEnd = Math.min(weekStart + 6, days.length - 1); // last index of current week
  const visible = days.slice(weekStart, weekEnd + 1);       // subset of days to show in UI

  // Generate a label for the month/year of the selected day
  const monthLabel = new Date(days[selectedIndex].dateISO).toLocaleDateString(
    undefined,
    {
      month: 'long', // e.g. "September"
      year: 'numeric', // e.g. "2025"
    }
  );

  // Navigation handlers: move by week while staying in range
  const goPrevWeek = () =>
    onSelectDay(clamp(selectedIndex - 7, 0, days.length - 1));
  const goNextWeek = () =>
    onSelectDay(clamp(selectedIndex + 7, 0, days.length - 1));

  return (
    <View style={styles.container}>
      {/* Row with month label and left/right arrows */}
      <View style={styles.monthRow}>
        <TouchableOpacity
          onPress={goPrevWeek}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} // easier to tap
        >
          <MaterialIcons name="chevron-left" size={28} color={Colors.dark.text} />
        </TouchableOpacity>

        <Text style={GlobalStyles.textBold}>{monthLabel}</Text>

        <TouchableOpacity
          onPress={goNextWeek}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialIcons name="chevron-right" size={28} color={Colors.dark.text} />
        </TouchableOpacity>
      </View>

      {/* Row with day-of-week letters (S M T W T F S) */}
      <View style={styles.weekRow}>
        {DOW.map((label, i) => (
          <Text key={`dow-${i}`} style={GlobalStyles.text}>
            {label}
          </Text>
        ))}
      </View>

      {/* Row with clickable day chips (numbers) */}
      <View style={[styles.weekRow2, { marginTop: 4 }]}>
        {visible.map((d, i) => {
          const index = weekStart + i;              // absolute index in days array
          const selected = index === selectedIndex; // check if this is the chosen day
          return (
            <TouchableOpacity
              key={d.dateISO}
              style={[
                styles.dayChip,
                selected && { backgroundColor: Colors.dark.highlight1 }, // highlight selected
              ]}
              onPress={() => onSelectDay(index)}          // callback on select
              accessibilityRole="button"                  // for screen readers
              accessibilityLabel={`Select day ${d.dayNum}`} // accessibility label
            >
              <Text
                style={[
                  styles.dayChipText,
                  selected && { color: Colors.dark.blkText }, // text color for selected
                ]}
              >
                {d.dayNum}
              </Text>
            </TouchableOpacity>
          );
        })}

        {/* If the last week doesn't have 7 days, pad with empty chips to align layout */}
        {Array.from({ length: 7 - visible.length }).map((_, i) => (
          <View
            key={`pad-${i}`}
            style={[styles.dayChip, { backgroundColor: 'transparent' }]}
          />
        ))}
      </View>
    </View>
  );
};

export default WeekNavigator;

// Styles for layout, spacing, and colors
const styles = StyleSheet.create({
  container: { marginBottom: 10 },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
    marginBottom: 6,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
    weekRow2: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 0,
  },
  dayChip: {
    height: 36,
    minWidth: 36,
    borderRadius: 17, // makes it circular-ish
    backgroundColor: Colors.dark.offset1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayChipText: {
    color: Colors.dark.text,
    fontWeight: 'bold',
    fontSize: 12,
  },
});
