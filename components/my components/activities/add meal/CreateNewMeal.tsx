// components/my components/activities/add meal/CreateNewMeal.tsx
// FIXED & HARDENED:
// - Guarded + disabled FINISH until mealName + at least 1 ingredient
// - Stronger numeric parsing + validation (rejects NaN/empty/negative)
// - Defensive try/catch around savedMealsStore.add so UI still updates
// - Small UX: shows inline validation hints and prevents silent no-ops
// - Minor perf: useCallback for handlers

import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View, FlatList } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Popup from './Popup';
import { AM_COLORS as C } from './theme';
import { GlobalStyles } from '@/constants/GlobalStyles';
import { Colors } from '@/constants/Colors';
import { savedMealsStore } from '../../../../assets/data/savedMealStore';

export type Macro = { protein: number; carbs: number; fats: number };
export type Ingredient = { id: string; name: string; macros: Macro; calories: number };
export type MealData = {
  id: string;
  name: string;
  ingredients: Ingredient[];
  totals: { protein: number; carbs: number; fats: number; calories: number };
};

const calcCalories = (m: Macro) => Math.round(m.protein * 4 + m.carbs * 4 + m.fats * 9);

type Props = {
  visible: boolean;
  onClose: () => void;
  onFinish: (meal: MealData) => void;
};

const toNum = (s: string) => {
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
};

const CreateNewMeal: React.FC<Props> = ({ visible, onClose, onFinish }) => {
  const [mealName, setMealName] = useState('');
  const [ingredientName, setIngredientName] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fats, setFats] = useState('');
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [error, setError] = useState<string | null>(null);

  const p = toNum(protein);
  const c = toNum(carbs);
  const f = toNum(fats);

  const validNumbers = Number.isFinite(p) && Number.isFinite(c) && Number.isFinite(f) && p >= 0 && c >= 0 && f >= 0;

  const canQueue =
    ingredientName.trim().length > 0 &&
    protein.trim() !== '' &&
    carbs.trim() !== '' &&
    fats.trim() !== '' &&
    validNumbers;

  const totals = useMemo(() => {
    const sum = ingredients.reduce(
      (acc, i) => {
        acc.protein += i.macros.protein;
        acc.carbs += i.macros.carbs;
        acc.fats += i.macros.fats;
        return acc;
      },
      { protein: 0, carbs: 0, fats: 0 }
    );
    return { ...sum, calories: calcCalories(sum) };
  }, [ingredients]);

  const queueIngredient = useCallback(() => {
    setError(null);
    if (!canQueue) {
      setError('Fill ingredient + valid macros (non-negative numbers).');
      return;
    }
    const macros = { protein: p, carbs: c, fats: f };
    setIngredients(prev => [
      ...prev,
      { id: `${Date.now()}`, name: ingredientName.trim(), macros, calories: calcCalories(macros) },
    ]);
    setIngredientName('');
    setProtein('');
    setCarbs('');
    setFats('');
  }, [canQueue, c, f, p, ingredientName]);

  const canFinish = mealName.trim().length > 0 && ingredients.length > 0;

  const finish = useCallback(() => {
    setError(null);
    if (!canFinish) {
      setError('Add a meal name and at least one ingredient.');
      return;
    }
    const meal: MealData = {
      id: `${Date.now()}`,
      name: mealName.trim(),
      ingredients,
      totals,
    };

    // 1) Update today list in parent immediately
    onFinish(meal);

    // 2) Save to global recipes (best-effort; do not block UI)
    try {
      if (savedMealsStore?.add) {
        savedMealsStore.add(meal);
      }
    } catch (e) {
      console.warn('savedMealsStore.add failed:', e);
      // non-fatal: user still sees meal added today
    }

    // 3) Reset + close popup
    setMealName('');
    setIngredientName('');
    setProtein('');
    setCarbs('');
    setFats('');
    setIngredients([]);
    onClose();
  }, [canFinish, ingredients, mealName, onClose, onFinish, totals]);

  return (
    <Popup visible={visible} onClose={onClose} title="Create a New Meal">
      <View style={styles.container}>
        <TextInput
          placeholder="Enter a Meal Name.."
          placeholderTextColor={C.muted}
          value={mealName}
          onChangeText={setMealName}
          style={GlobalStyles.textInput}
          autoCapitalize="words"
        />

        {ingredients.length > 0 && (
          <FlatList
            data={ingredients}
            keyExtractor={i => i.id}
            ItemSeparatorComponent={() => <View style={styles.sep} />}
            style={{ marginTop: 8, maxHeight: 220 }}
            renderItem={({ item, index }) => (
              <View style={styles.row}>
                <Text style={[GlobalStyles.text, { textAlign: 'center', marginRight: 8 }]}>{index + 1}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={GlobalStyles.text}>{item.name.toUpperCase()}</Text>
                  <View style={styles.pillsRow}>
                    <View style={[styles.pill, { backgroundColor: Colors.dark.macroProtein }]}>
                      <Text style={styles.pillLabel}>P</Text>
                      <Text style={styles.pillValue}>{item.macros.protein}g</Text>
                    </View>
                    <View style={[styles.pill, { backgroundColor: Colors.dark.macroCarbs }]}>
                      <Text style={styles.pillLabel}>C</Text>
                      <Text style={styles.pillValue}>{item.macros.carbs}g</Text>
                    </View>
                    <View style={[styles.pill, { backgroundColor: Colors.dark.macroFats }]}>
                      <Text style={styles.pillLabel}>F</Text>
                      <Text style={styles.pillValue}>{item.macros.fats}g</Text>
                    </View>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.rightTop}>
                    {item.macros.protein + item.macros.carbs + item.macros.fats} g
                  </Text>
                  <Text style={styles.rightBot}>CAL {item.calories}</Text>
                </View>
              </View>
            )}
          />
        )}

        <View style={{ marginTop: 12 }}>
          <View style={styles.ingredientRow}>
            <TextInput
              placeholder="Ingredient .."
              placeholderTextColor={C.muted}
              value={ingredientName}
              onChangeText={setIngredientName}
              style={[GlobalStyles.textInput, { flex: 1 }]}
              autoCapitalize="words"
              returnKeyType="done"
            />
            <TouchableOpacity
              onPress={queueIngredient}
              disabled={!canQueue}
              style={[styles.checkBtn, !canQueue && { opacity: 0.5 }]}
            >
              <MaterialIcons name="check" size={22} color="#333" />
            </TouchableOpacity>
          </View>

          <View style={styles.macroRow}>
            <TextInput
              placeholder="Protein.."
              placeholderTextColor={C.muted}
              keyboardType="numeric"
              inputMode="decimal"
              value={protein}
              onChangeText={setProtein}
              style={[GlobalStyles.textInput, styles.small]}
            />
            <TextInput
              placeholder="Carbs.."
              placeholderTextColor={C.muted}
              keyboardType="numeric"
              inputMode="decimal"
              value={carbs}
              onChangeText={setCarbs}
              style={[GlobalStyles.textInput, styles.small]}
            />
            <TextInput
              placeholder="Fats.."
              placeholderTextColor={C.muted}
              keyboardType="numeric"
              inputMode="decimal"
              value={fats}
              onChangeText={setFats}
              style={[GlobalStyles.textInput, styles.small]}
            />
          </View>
        </View>

        <View style={styles.totalsRow}>
          <Text style={GlobalStyles.textBold}>P {totals.protein}g   C {totals.carbs}g   F {totals.fats}g</Text>
          <Text style={GlobalStyles.textBold}>CAL {totals.calories}</Text>
        </View>

        {!!error && <Text style={styles.errorText}>{error}</Text>}

        <TouchableOpacity
          onPress={finish}
          disabled={!canFinish}
          style={[styles.finishBtn, !canFinish && { opacity: 0.5 }]}
        >
          <Text style={styles.finishText}>FINISH</Text>
        </TouchableOpacity>
      </View>
    </Popup>
  );
};

export default CreateNewMeal;

const styles = StyleSheet.create({
  container: { paddingHorizontal: 12 },
  sep: { height: 1, backgroundColor: C.line, opacity: 0.7, marginVertical: 8 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  pillsRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  pill: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  pillLabel: { color: '#333', fontWeight: '900', marginRight: 4, fontSize: 12 },
  pillValue: { color: '#333', fontWeight: '700', fontSize: 12 },
  rightTop: { color: C.text, fontWeight: '700' },
  rightBot: { color: C.text, fontWeight: '700', opacity: 0.9 },
  ingredientRow: { flexDirection: 'row', alignItems: 'center' },
  small: { flex: 1, marginTop: 8, marginRight: 8 },
  checkBtn: { marginLeft: 10, backgroundColor: '#D2D2D2', borderRadius: 999, padding: 10 },
  macroRow: { flexDirection: 'row', alignItems: 'center' },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  finishBtn: { marginTop: 16, backgroundColor: Colors.dark.highlight1, paddingVertical: 12, borderRadius: 18, alignItems: 'center' },
  finishText: { color: '#2D2D2D', fontWeight: '900', letterSpacing: 1, fontSize: 16 },
  errorText: { color: '#ff7676', marginTop: 8, fontWeight: '600' },
});
