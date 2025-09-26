// components/my components/activities/add meal/WeekNavigator.tsx

import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { GlobalStyles } from '@/constants/GlobalStyles';

// Labels for days of the week, abbreviated
const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

type Props = {
  selectedDate: Date; // currently selected day
  onSelectDate: (date: Date) => void;
};

// Utility: clamp between two dates
const addDays = (date: Date, days: number) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

const startOfWeek = (date: Date) => {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
};

const WeekNavigator: React.FC<Props> = ({ selectedDate, onSelectDate }) => {
  // find start of current week
  const weekStart = startOfWeek(selectedDate);
  const visible: Date[] = Array.from({ length: 7 }).map((_, i) =>
    addDays(weekStart, i)
  );

  // month label
  const monthLabel = selectedDate.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });

  const goPrevWeek = () => onSelectDate(addDays(selectedDate, -7));
  const goNextWeek = () => onSelectDate(addDays(selectedDate, 7));

  return (
    <View style={styles.container}>
      {/* Month + arrows */}
      <View style={styles.monthRow}>
        <TouchableOpacity
          onPress={goPrevWeek}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
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

      {/* DOW header */}
      <View style={styles.weekRow}>
        {DOW.map((label, i) => (
          <Text key={`dow-${i}`} style={GlobalStyles.text}>
            {label}
          </Text>
        ))}
      </View>

      {/* day chips */}
      <View style={[styles.weekRow2, { marginTop: 4 }]}>
        {visible.map((d) => {
          const selected =
            d.toDateString() === selectedDate.toDateString();

          return (
            <TouchableOpacity
              key={d.toISOString()}
              style={[
                styles.dayChip,
                selected && { backgroundColor: Colors.dark.highlight1 },
              ]}
              onPress={() => onSelectDate(d)}
            >
              <Text
                style={[
                  styles.dayChipText,
                  selected && { color: Colors.dark.blkText },
                ]}
              >
                {d.getDate()}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

export default WeekNavigator;

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
    borderRadius: 17,
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
