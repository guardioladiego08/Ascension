// components/my components/strength/ExerciseCard.tsx
// -----------------------------------------------------------------------------
// A single exercise card showing:
// - Title + delete
// - Column header (Set/Weight/Reps)
// - Rows for each set with numeric inputs
// - Add Set button
// -----------------------------------------------------------------------------

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import type { ExerciseType } from './types';

type Props = {
  ex: ExerciseType;
  index: number;
  onDelete: (exerciseId: string) => void;
  onAddSet: (exerciseId: string) => void;
  onUpdateSet: (exId: string, idx: number, field: 'weight' | 'reps', val: string) => void;
};

const ExerciseCard: React.FC<Props> = ({ ex, index, onDelete, onAddSet, onUpdateSet }) => {
  return (
    <View style={styles.section}>
      {/* Header: Title + trash */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          {index + 1}. {ex.name}
        </Text>
        <TouchableOpacity onPress={() => onDelete(ex.id)} accessibilityLabel="Remove exercise">
          <MaterialIcons name="delete" size={20} color="#FF6B6B" />
        </TouchableOpacity>
      </View>

      {/* Column header */}
      <View style={styles.headerRow}>
        <Text style={styles.headerCell}>SET</Text>
        <Text style={styles.headerCell}>WEIGHT</Text>
        <Text style={styles.headerCell}>REPS</Text>
      </View>

      {/* Set rows */}
      {ex.sets.map((st, i) => (
        <View key={`${ex.id}-${i}`} style={styles.dataRow}>
          <Text style={styles.cell}>{i + 1}</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor="#888"
            value={st.weight}
            onChangeText={(v) => onUpdateSet(ex.id, i, 'weight', v)}
          />
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor="#888"
            value={st.reps}
            onChangeText={(v) => onUpdateSet(ex.id, i, 'reps', v)}
          />
        </View>
      ))}

      {/* Add set */}
      <TouchableOpacity style={styles.addSetBtn} onPress={() => onAddSet(ex.id)}>
        <MaterialIcons name="add-circle-outline" size={20} color="#fff" />
        <Text style={styles.addSetText}>Add Set</Text>
      </TouchableOpacity>
    </View>
  );
};

export default ExerciseCard;

const styles = StyleSheet.create({
  section: { backgroundColor: '#2A2A2A', borderRadius: 12, padding: 12, marginBottom: 12 },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8,
  },
  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  headerRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#666', paddingBottom: 6,
  },
  headerCell: { flex: 1, textAlign: 'center', color: '#AAA' },
  dataRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, alignItems: 'center' },
  cell: { flex: 1, textAlign: 'center', color: 'white' },
  input: {
    flex: 1, borderBottomWidth: 1, borderColor: '#888',
    color: 'white', textAlign: 'center', paddingVertical: 2, marginHorizontal: 4,
  },
  addSetBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  addSetText: { color: 'white', marginLeft: 6, fontSize: 14 },
});
