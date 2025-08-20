// components/my components/activities/add meal/FromRecipePopup.tsx
// Popup that matches your mock: search, alpha underline, list of saved meals,
// select one or multiple, and "ADD" to the current day’s list.

import React, { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { AM_COLORS as C } from './theme';
import Popup from './Popup';
import { MaterialIcons } from '@expo/vector-icons';
import { MealData, useSavedMeals } from '../../../../assets/data/savedMealStore';

type Props = {
  visible: boolean;
  onClose: () => void;
  onAddMeals: (meals: MealData[]) => void; // parent will add them to "meals per day index"
};

const FromRecipePopup: React.FC<Props> = ({ visible, onClose, onAddMeals }) => {
  const savedMeals = useSavedMeals();
  const [q, setQ] = useState('');
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return savedMeals;
    return savedMeals.filter(m => m.name.toLowerCase().includes(needle));
  }, [q, savedMeals]);

  const toggle = (id: string) =>
    setSelectedIds(prev => ({ ...prev, [id]: !prev[id] }));

  const selectedMeals = useMemo(
    () => filtered.filter(m => selectedIds[m.id]),
    [filtered, selectedIds]
  );

  const addSelected = () => {
    if (selectedMeals.length === 0) return;
    onAddMeals(selectedMeals);
    setSelectedIds({});
    onClose();
  };

  return (
    <Popup visible={visible} onClose={onClose} title="ADD NEW MEAL">
      <View style={styles.container}>
        {/* Search Bar */}
        <View style={styles.searchRow}>
          <MaterialIcons name="search" size={18} color="#333" style={{ marginRight: 6 }} />
          <TextInput
            placeholder="SEARCH"
            placeholderTextColor="#777"
            value={q}
            onChangeText={setQ}
            style={styles.searchInput}
          />
        </View>

        {/* Alpha hint + underline (to match your mock’s small 'B' + line) */}
        <View style={styles.alphaRow}>
          <Text style={styles.alphaChar}>B</Text>
          <View style={styles.alphaLine} />
        </View>

        {/* List */}
        <FlatList
          data={filtered}
          keyExtractor={m => m.id}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          style={{ marginTop: 8 }}
          renderItem={({ item }) => {
            const checked = !!selectedIds[item.id];
            return (
              <TouchableOpacity style={styles.mealRow} onPress={() => toggle(item.id)}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.mealName}>{item.name.toUpperCase()}</Text>
                  <Text style={styles.subMacros}>
                    P {item.totals.protein}G   C {item.totals.carbs}G   F {item.totals.fats}G
                  </Text>
                </View>
                <View style={styles.circle}>
                  <MaterialIcons
                    name={checked ? 'check' : 'info-outline'}
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

        {/* ADD button */}
        <TouchableOpacity style={[styles.addBtn, selectedMeals.length === 0 && { opacity: 0.5 }]} onPress={addSelected} disabled={selectedMeals.length === 0}>
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
  alphaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  alphaChar: { color: C.highlight1, fontWeight: '900', marginRight: 8 },
  alphaLine: { flex: 1, height: 1, backgroundColor: C.line },
  sep: { height: 8 },
  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6E6E6E',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  mealName: { color: C.text, fontWeight: '800', letterSpacing: 0.5 },
  subMacros: { color: C.text, opacity: 0.9, marginTop: 4, fontSize: 12 },
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
    backgroundColor: '#FF950A',
    borderRadius: 14,
    alignSelf: 'center',
    paddingHorizontal: 26,
    paddingVertical: 8,
  },
  addText: { color: '#2d2d2d', fontWeight: '900', letterSpacing: 1 },
  empty: { color: C.muted, alignSelf: 'center', marginTop: 16 },
});
