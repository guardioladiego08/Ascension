import React, { useMemo, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { AM_COLORS as C } from './theme';
import Popup from './Popup';
import { MaterialIcons } from '@expo/vector-icons';
import { GlobalStyles } from '@/constants/GlobalStyles';
import { Colors } from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import { MealData } from './CreateNewMeal';

type Props = {
  visible: boolean;
  onClose: () => void;
  onAddMeals: (meals: MealData[]) => void;
  selectedDate: Date;
  onAfterAdd?: () => void;   // ❇️ parent refetch hook
};

const FromRecipePopup: React.FC<Props> = ({ visible, onClose, onAddMeals, selectedDate, onAfterAdd }) => {
  const [q, setQ] = useState('');
  const [savedMeals, setSavedMeals] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});

  React.useEffect(() => {
    const fetchMeals = async () => {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) return;

      const { data, error } = await supabase
        .from('meals')
        .select('id, name, total_protein, total_carbs, total_fats, total_calories')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) setSavedMeals(data);
    };

    if (visible) fetchMeals();
  }, [visible]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return savedMeals;
    return savedMeals.filter((m) => m.name.toLowerCase().includes(needle));
  }, [q, savedMeals]);

  const toggle = (id: string) =>
    setSelectedIds((prev) => ({ ...prev, [id]: !prev[id] }));

  const selectedMeals = useMemo(
    () => filtered.filter((m) => selectedIds[m.id]),
    [filtered, selectedIds]
  );

  const addSelected = async () => {
    if (selectedMeals.length === 0) return;

    const normalized: MealData[] = selectedMeals.map((m) => ({
      id: m.id,
      name: m.name,
      ingredients: [],
      totals: {
        protein: m.total_protein,
        carbs: m.total_carbs,
        fats: m.total_fats,
        calories: m.total_calories,
      },
    }));

    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('Not logged in');

      const consumedAt = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate()
      ).toISOString();

      const logRows = normalized.map((m) => ({
        user_id: user.id,
        meal_id: m.id,
        consumed_at: consumedAt,
      }));

      const { error } = await supabase.from('meals_log').insert(logRows);
      if (error) console.error('Error inserting into meals_log:', error);

      // ❇️ trigger parent refetch of totals + list
      onAfterAdd?.();
    } catch (err) {
      console.error(err);
    }

    onAddMeals(normalized);
    setSelectedIds({});
    onClose();
  };

  return (
    <Popup visible={visible} onClose={onClose} title="ADD NEW MEAL">
      <View style={styles.container}>
        <View style={styles.searchRow}>
          <MaterialIcons
            name="search"
            size={18}
            color="#333"
            style={{ marginRight: 6 }}
          />
          <TextInput
            placeholder="SEARCH"
            placeholderTextColor="#777"
            value={q}
            onChangeText={setQ}
            style={styles.searchInput}
          />
        </View>

        <FlatList
          nestedScrollEnabled
          data={filtered}
          keyExtractor={(m) => m.id}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          style={{ marginTop: 8 }}
          renderItem={({ item }) => {
            const checked = !!selectedIds[item.id];
            return (
              <TouchableOpacity
                style={styles.mealRow}
                onPress={() => toggle(item.id)}
                activeOpacity={0.8}
              >
                <View style={{ flex: 1 }}>
                  <Text style={GlobalStyles.textBold}>
                    {item.name.toUpperCase()}
                  </Text>
                  <Text style={GlobalStyles.subtext}>
                    P {item.total_protein}G   C {item.total_carbs}G   F {item.total_fats}G
                  </Text>
                </View>

                <View style={styles.circle}>
                  <MaterialIcons
                    name={checked ? 'check' : undefined}
                    size={16}
                    color={checked ? '#2d2d2d' : '#ddd'}
                  />
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <Text style={styles.empty}>No saved meals yet. Create one first!</Text>
          }
        />

        <TouchableOpacity
          style={[
            styles.addBtn,
            selectedMeals.length === 0 && { opacity: 0.5 },
          ]}
          onPress={addSelected}
          disabled={selectedMeals.length === 0}
        >
          <Text style={styles.addText}>ADD</Text>
        </TouchableOpacity>
      </View>
    </Popup>
  );
};

export default FromRecipePopup;

const styles = StyleSheet.create({
  container: { paddingHorizontal: 6, paddingBottom: 8 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E9E9E9',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  searchInput: { flex: 1, color: '#222', fontSize: 14 },
  sep: { height: 8 },
  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6E6E6E',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  circle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#CFCFCF',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    backgroundColor: '#FF950A20',
  },
  addBtn: {
    marginTop: 10,
    backgroundColor: Colors.dark.highlight1,
    borderRadius: 14,
    alignSelf: 'center',
    paddingHorizontal: 26,
    paddingVertical: 8,
  },
  addText: { color: '#2d2d2d', fontWeight: '900', letterSpacing: 1 },
  empty: { color: C.muted, alignSelf: 'center', marginTop: 16 },
});
