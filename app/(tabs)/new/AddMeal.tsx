// app/(tabs)/new/add-meal.tsx
import React, { useMemo, useState } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import LogoHeader from '@/components/my components/logoHeader';
import {
  generate30Days,
  getTodayIndex,
  DayMealData,
} from '../../../assets/data/addMealData';
import { AM_COLORS as C } from '@/components/my components/activities/add meal/theme';
import WeekNavigator from '@/components/my components/activities/add meal/WeekNavigator';
import MacroSection from '@/components/my components/activities/add meal/MacroSection';
import MealsActions from '@/components/my components/activities/add meal/MealsActions';
import CreateNewMeal, {
  MealData,
} from '@/components/my components/activities/add meal/CreateNewMeal';
import FromRecipePopup from '@/components/my components/activities/add meal/FromRecipePopup';
import { GlobalStyles } from '@/constants/GlobalStyles';
import { Colors } from '@/constants/Colors';

export default function AddMealScreen() {
  const router = useRouter();

  // ----- 30-day dummy dataset -----
  const days: DayMealData[] = useMemo(() => generate30Days(), []);
  const initialIndex = useMemo(() => getTodayIndex(days), [days]);
  const [selectedIndex, setSelectedIndex] = useState(initialIndex);

  // Popups
  const [fromRecipeOpen, setFromRecipeOpen] = useState(false);
  const [createNewOpen, setCreateNewOpen] = useState(false);

  // Meals per day index
  const [mealsByDay, setMealsByDay] = useState<Record<number, MealData[]>>({});

  const selected = days[selectedIndex];
  const todaysMeals = mealsByDay[selectedIndex] ?? [];

  const addMealToToday = (meal: MealData) => {
    setMealsByDay(prev => ({
      ...prev,
      [selectedIndex]: [meal, ...(prev[selectedIndex] ?? [])],
    }));
  };

  const addManyMealsToToday = (meals: MealData[]) => {
    if (meals.length === 0) return;
    setMealsByDay(prev => ({
      ...prev,
      [selectedIndex]: [...meals, ...(prev[selectedIndex] ?? [])],
    }));
  };

  return (
    <SafeAreaView style={GlobalStyles.safeArea}>
      {/* Logo */}
      <LogoHeader showBackButton />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={GlobalStyles.header}>ADD A MEAL</Text>

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
          <Text
            style={[
              GlobalStyles.subtitle,
              { alignSelf: 'center', marginTop: 12, marginBottom: 12 },
            ]}
          >
            MEALS
          </Text>
          <MealsActions
            onOpenFromRecipe={() => setFromRecipeOpen(true)}
            onOpenCreateNew={() => setCreateNewOpen(true)}
          />
          <View style={[styles.hr, { marginTop: 16 }]} />

          {/* List under MacroSection */}
          {todaysMeals.length === 0 ? (
            <Text
              style={[
                GlobalStyles.text,
                { marginTop: 10, alignSelf: 'center' },
              ]}
            >
              No meals added yet.
            </Text>
          ) : (
            <View style={{ marginTop: 10 }}>
              {todaysMeals.map(m => (
                <View key={m.id} style={{ marginBottom: 12 }}>
                  <View style={styles.mealRowTop}>
                    <Text style={styles.mealName}>{m.name.toUpperCase()}</Text>
                    <Text style={styles.mealCal}>CAL {m.totals.calories}</Text>
                  </View>
                  <View style={styles.pillsRow}>
                    <View
                      style={[
                        styles.pill,
                        { backgroundColor: Colors.dark.macroProtein },
                      ]}
                    >
                      <Text style={styles.pillLabel}>P</Text>
                      <Text style={styles.pillValue}>{m.totals.protein}g</Text>
                    </View>
                    <View
                      style={[
                        styles.pill,
                        { backgroundColor: Colors.dark.macroCarbs },
                      ]}
                    >
                      <Text style={styles.pillLabel}>C</Text>
                      <Text style={styles.pillValue}>{m.totals.carbs}g</Text>
                    </View>
                    <View
                      style={[
                        styles.pill,
                        { backgroundColor: Colors.dark.macroFats },
                      ]}
                    >
                      <Text style={styles.pillLabel}>F</Text>
                      <Text style={styles.pillValue}>{m.totals.fats}g</Text>
                    </View>
                  </View>
                  <View
                    style={[styles.hr, { marginTop: 10, opacity: 0.6 }]}
                  />
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* POPUPS */}
      <CreateNewMeal
        visible={createNewOpen}
        onClose={() => setCreateNewOpen(false)}
        onFinish={addMealToToday}
      />
      <FromRecipePopup
        visible={fromRecipeOpen}
        onClose={() => setFromRecipeOpen(false)}
        onAddMeals={addManyMealsToToday}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  card: { borderRadius: 12, paddingVertical: 10, paddingHorizontal: 10 },
  hr: { height: 1, backgroundColor: C.line, marginTop: 12 },
  mealRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mealName: { color: C.text, fontWeight: '800', letterSpacing: 0.5 },
  mealCal: { color: C.text, fontWeight: '800' },
  pillsRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  pillLabel: { color: '#333', fontWeight: '900', marginRight: 4, fontSize: 12 },
  pillValue: { color: '#333', fontWeight: '700', fontSize: 12 },
});
