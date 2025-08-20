// components/my components/activities/add meal/CreateNewMeal.tsx
// UPDATED: onFinish now also saves the meal into the global savedMealsStore.

import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View, FlatList } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Popup from './Popup';
import { AM_COLORS as C } from './theme';
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

const CreateNewMeal: React.FC<Props> = ({ visible, onClose, onFinish }) => {
  const [mealName, setMealName] = useState('');
  const [ingredientName, setIngredientName] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fats, setFats] = useState('');
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);

  const canQueue =
    ingredientName.trim().length > 0 &&
    protein !== '' && carbs !== '' && fats !== '' &&
    !Number.isNaN(Number(protein)) && !Number.isNaN(Number(carbs)) && !Number.isNaN(Number(fats));

  const totals = useMemo(() => {
    const p = ingredients.reduce((s, i) => s + i.macros.protein, 0);
    const c = ingredients.reduce((s, i) => s + i.macros.carbs, 0);
    const f = ingredients.reduce((s, i) => s + i.macros.fats, 0);
    return { protein: p, carbs: c, fats: f, calories: calcCalories({ protein: p, carbs: c, fats: f }) };
  }, [ingredients]);

  const queueIngredient = () => {
    if (!canQueue) return;
    const macros = { protein: Number(protein), carbs: Number(carbs), fats: Number(fats) };
    setIngredients(prev => [
      ...prev,
      { id: `${Date.now()}`, name: ingredientName.trim(), macros, calories: calcCalories(macros) },
    ]);
    setIngredientName(''); setProtein(''); setCarbs(''); setFats('');
  };

  const finish = () => {
    if (!mealName.trim() || ingredients.length === 0) return;
    const meal: MealData = {
      id: `${Date.now()}`,
      name: mealName.trim(),
      ingredients,
      totals,
    };
    // 1) Return to the day list
    onFinish(meal);
    // 2) Save globally for "From Recipe"
    savedMealsStore.add(meal);

    // Reset and close
    setMealName(''); setIngredientName(''); setProtein(''); setCarbs(''); setFats(''); setIngredients([]);
    onClose();
  };

  return (
    <Popup visible={visible} onClose={onClose} title="Create a New Meal">
      <View style={styles.container}>
        <TextInput
          placeholder="ENTER MEAL NAME.."
          placeholderTextColor={C.muted}
          value={mealName}
          onChangeText={setMealName}
          style={styles.mealName}
        />

        {ingredients.length > 0 && (
          <FlatList
            data={ingredients}
            keyExtractor={i => i.id}
            ItemSeparatorComponent={() => <View style={styles.sep} />}
            style={{ marginTop: 8 }}
            renderItem={({ item, index }) => (
              <View style={styles.row}>
                <Text style={styles.index}>{index + 1}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.ingName}>{item.name.toUpperCase()}</Text>
                  <View style={styles.pillsRow}>
                    <View style={[styles.pill, { backgroundColor: '#6AE5E5' }]}>
                      <Text style={styles.pillLabel}>P</Text><Text style={styles.pillValue}>{item.macros.protein}g</Text>
                    </View>
                    <View style={[styles.pill, { backgroundColor: '#FFD400' }]}>
                      <Text style={styles.pillLabel}>C</Text><Text style={styles.pillValue}>{item.macros.carbs}g</Text>
                    </View>
                    <View style={[styles.pill, { backgroundColor: '#F79E1B' }]}>
                      <Text style={styles.pillLabel}>F</Text><Text style={styles.pillValue}>{item.macros.fats}g</Text>
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
              placeholder="INGREDIENT .."
              placeholderTextColor={C.muted}
              value={ingredientName}
              onChangeText={setIngredientName}
              style={[styles.input, { flex: 1 }]}
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
            <TextInput placeholder="PROTEIN.." placeholderTextColor={C.muted} keyboardType="numeric"
              value={protein} onChangeText={setProtein} style={[styles.input, styles.small]} />
            <TextInput placeholder="CARBS.." placeholderTextColor={C.muted} keyboardType="numeric"
              value={carbs} onChangeText={setCarbs} style={[styles.input, styles.small]} />
            <TextInput placeholder="FATS.." placeholderTextColor={C.muted} keyboardType="numeric"
              value={fats} onChangeText={setFats} style={[styles.input, styles.small]} />
          </View>
        </View>

        <View style={styles.totalsRow}>
          <Text style={styles.totalsText}>P {totals.protein}g   C {totals.carbs}g   F {totals.fats}g</Text>
          <Text style={styles.totalsText}>CAL {totals.calories}</Text>
        </View>

        <TouchableOpacity onPress={finish} style={styles.finishBtn}>
          <Text style={styles.finishText}>FINISH</Text>
        </TouchableOpacity>
      </View>
    </Popup>
  );
};

export default CreateNewMeal;

const styles = StyleSheet.create({
  container: { paddingHorizontal: 12 },
  mealName: { backgroundColor: '#E9E9E9', color: '#333', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 16 },
  sep: { height: 1, backgroundColor: C.line, opacity: 0.7, marginVertical: 8 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  index: { color: C.text, width: 18, fontWeight: '800', textAlign: 'center', marginRight: 8 },
  ingName: { color: C.text, fontWeight: '800', letterSpacing: 0.5 },
  pillsRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  pill: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  pillLabel: { color: '#333', fontWeight: '900', marginRight: 4, fontSize: 12 },
  pillValue: { color: '#333', fontWeight: '700', fontSize: 12 },
  rightTop: { color: C.text, fontWeight: '700' },
  rightBot: { color: C.text, fontWeight: '700', opacity: 0.9 },
  ingredientRow: { flexDirection: 'row', alignItems: 'center' },
  input: { backgroundColor: '#E9E9E9', color: '#333', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  small: { flex: 1, marginTop: 8, marginRight: 8 },
  checkBtn: { marginLeft: 10, backgroundColor: '#D2D2D2', borderRadius: 999, padding: 10 },
  macroRow: { flexDirection: 'row', alignItems: 'center' },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  totalsText: { color: C.text, fontWeight: '900', letterSpacing: 0.5 },
  finishBtn: { marginTop: 16, backgroundColor: '#FF950A', paddingVertical: 12, borderRadius: 18, alignItems: 'center' },
  finishText: { color: '#2D2D2D', fontWeight: '900', letterSpacing: 1, fontSize: 16 },
});
