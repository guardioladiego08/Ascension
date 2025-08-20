// app/(tabs)/new/add-meal.tsx
import React, { useMemo, useState } from 'react';
import { SafeAreaView, StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

import { generate30Days, getTodayIndex, DayMealData } from '../../../assets/data/addMealData'
import { AM_COLORS as C } from '@/components/my components/activities/add meal/theme';
import WeekNavigator from '@/components/my components/activities/add meal/WeekNavigator';
import MacroSection from '@/components/my components/activities/add meal/MacroSection';
import MealsActions from '@/components/my components/activities/add meal/MealsActions';
import Popup from '@/components/my components/activities/add meal/Popup';
import LogoHeader from '@/components/my components/logoHeader';

export default function AddMealScreen() {
  const router = useRouter();

  // ----- Dummy 30-day dataset -----
  const days: DayMealData[] = useMemo(() => generate30Days(), []);
  const initialIndex = useMemo(() => getTodayIndex(days), [days]);
  const [selectedIndex, setSelectedIndex] = useState(initialIndex);

  // Popups (placeholders for later work)
  const [fromRecipeOpen, setFromRecipeOpen] = useState(false);
  const [createNewOpen, setCreateNewOpen] = useState(false);

  const selected = days[selectedIndex];

  return (
    <SafeAreaView style={styles.safe}>
      {/* Top bar */}
      <LogoHeader></LogoHeader>
      

      <Text style={styles.title}>ADD A MEAL</Text>

      {/* Month + Week chips with arrows */}
      <WeekNavigator
        days={days}
        selectedIndex={selectedIndex}
        onSelectDay={setSelectedIndex}
      />

      {/* Macros + Calories */}
      <View style={styles.card}>
        <MacroSection data={selected} />

        {/* Divider */}
        <View style={styles.hr} />

        {/* Meals header and action buttons */}
        <Text style={styles.sectionTitle}>MEALS</Text>
        <MealsActions
          onOpenFromRecipe={() => setFromRecipeOpen(true)}
          onOpenCreateNew={() => setCreateNewOpen(true)}
        />
        <View style={[styles.hr, { marginTop: 16 }]} />
      </View>

      {/* POPUPS (placeholder components) */}
      <Popup visible={fromRecipeOpen} onClose={() => setFromRecipeOpen(false)} title="From Recipe">
        <Text style={styles.popupText}>This popup will list recipes to add from. (WIP)</Text>
      </Popup>

      <Popup visible={createNewOpen} onClose={() => setCreateNewOpen(false)} title="Create New Meal">
        <Text style={styles.popupText}>This popup will let you build a meal from scratch. (WIP)</Text>
      </Popup>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg, paddingHorizontal: 16 },
  headerRow: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: { paddingHorizontal: 6, height: 44, justifyContent: 'center', width: 32 },
  title: {
    alignSelf: 'center',
    color: C.text,
    fontSize: 26,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginTop: 2,
    marginBottom: 10,
  },
  card: { backgroundColor: C.bg, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 10 },
  hr: { height: 1, backgroundColor: C.line, marginTop: 12 },
  sectionTitle: {
    color: C.text,
    fontWeight: 'bold',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 12,
    letterSpacing: 1,
  },
  popupText: { color: C.text },
});
