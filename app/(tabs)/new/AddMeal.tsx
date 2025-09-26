import React, { useCallback, useEffect, useState } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import LogoHeader from '@/components/my components/logoHeader';
import { AM_COLORS as C } from '@/components/my components/activities/add meal/theme';
import WeekNavigator from '@/components/my components/activities/add meal/WeekNavigator';
import MacroSection, { MacroTotals } from '@/components/my components/activities/add meal/MacroSection';
import MealsActions from '@/components/my components/activities/add meal/MealsActions';
import CreateNewMeal, { MealData } from '@/components/my components/activities/add meal/CreateNewMeal';
import FromRecipePopup from '@/components/my components/activities/add meal/FromRecipePopup';
import { GlobalStyles } from '@/constants/GlobalStyles';
import { Colors } from '@/constants/Colors';
import { supabase } from '@/lib/supabase';

export default function AddMealScreen() {
  const router = useRouter();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [fromRecipeOpen, setFromRecipeOpen] = useState(false);
  const [createNewOpen, setCreateNewOpen] = useState(false);
  const [todaysMeals, setTodaysMeals] = useState<MealData[]>([]);
  const [totals, setTotals] = useState<MacroTotals>({
    protein: 0,
    carbs: 0,
    fats: 0,
    calories: 0,
    goals: { protein: 150, carbs: 250, fats: 70, calories: 2200 },
  });

  const getDateRange = (date: Date) => {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  };

  // ❇️ Centralized refetch used by effects and popups (passed as onAfterAdd)
  const fetchMealsForSelectedDate = useCallback(async () => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;

    const { start, end } = getDateRange(selectedDate);

    const { data, error } = await supabase
      .from('meals_log')
      .select(`
        id,
        consumed_at,
        meal:meals (
          id,
          name,
          total_protein,
          total_carbs,
          total_fats,
          total_calories
        )
      `)
      .eq('user_id', user.id)
      .gte('consumed_at', start.toISOString())
      .lte('consumed_at', end.toISOString())
      .order('consumed_at', { ascending: false });

    if (error) {
      console.error('Error fetching meals_log:', error);
      return;
    }

    const normalized: MealData[] = (data ?? []).map((row: any) => ({
      id: row.meal.id,
      name: row.meal.name,
      ingredients: [],
      totals: {
        protein: row.meal.total_protein,
        carbs: row.meal.total_carbs,
        fats: row.meal.total_fats,
        calories: row.meal.total_calories,
      },
    }));

    setTodaysMeals(normalized);

    const agg = normalized.reduce(
      (acc, m) => {
        acc.protein += m.totals.protein;
        acc.carbs += m.totals.carbs;
        acc.fats += m.totals.fats;
        acc.calories += m.totals.calories;
        return acc;
      },
      { protein: 0, carbs: 0, fats: 0, calories: 0 }
    );

    setTotals(prev => ({ ...prev, ...agg }));
  }, [selectedDate]);

  // Fetch on selectedDate change
  useEffect(() => {
    fetchMealsForSelectedDate();
  }, [selectedDate, fetchMealsForSelectedDate]);

  return (
    <SafeAreaView style={GlobalStyles.safeArea}>
      <LogoHeader showBackButton />

      <FlatList
        data={[{ key: 'content' }]}
        keyExtractor={(item) => item.key}
        renderItem={() => (
          <View style={{ flex: 1 }}>
            <Text style={GlobalStyles.header}>ADD A MEAL</Text>

            <WeekNavigator
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
            />

            <View style={styles.card}>
              <MacroSection totals={totals} />

              <View style={styles.hr} />

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
                  {todaysMeals.map((m, index) => (
                    <View key={`${m.id}-${index}`} style={{ marginBottom: 12 }}>
                      <View style={styles.mealRowTop}>
                        <Text style={styles.mealName}>
                          {m.name.toUpperCase()}
                        </Text>
                        <Text style={styles.mealCal}>
                          CAL {m.totals.calories}
                        </Text>
                      </View>
                      <View style={styles.pillsRow}>
                        <View
                          style={[
                            styles.pill,
                            { backgroundColor: Colors.dark.macroProtein },
                          ]}
                        >
                          <Text style={styles.pillLabel}>P</Text>
                          <Text style={styles.pillValue}>
                            {m.totals.protein}g
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.pill,
                            { backgroundColor: Colors.dark.macroCarbs },
                          ]}
                        >
                          <Text style={styles.pillLabel}>C</Text>
                          <Text style={styles.pillValue}>
                            {m.totals.carbs}g
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.pill,
                            { backgroundColor: Colors.dark.macroFats },
                          ]}
                        >
                          <Text style={styles.pillLabel}>F</Text>
                          <Text style={styles.pillValue}>
                            {m.totals.fats}g
                          </Text>
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
          </View>
        )}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      />

      {/* POPUPS */}
      <CreateNewMeal
        visible={createNewOpen}
        onClose={() => setCreateNewOpen(false)}
        onFinish={() => { /* UI already updates via refetch */ }}
        selectedDate={selectedDate}
        onAfterAdd={fetchMealsForSelectedDate}  // ❇️ trigger refetch after finishing
      />
      <FromRecipePopup
        visible={fromRecipeOpen}
        onClose={() => setFromRecipeOpen(false)}
        onAddMeals={() => { /* UI already updates via refetch */ }}
        selectedDate={selectedDate}
        onAfterAdd={fetchMealsForSelectedDate}  // ❇️ trigger refetch after adding
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
