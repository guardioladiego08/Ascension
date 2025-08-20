// components/addMeal/MealsActions.tsx
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AM_COLORS as C } from './theme';

type Props = { onOpenFromRecipe: () => void; onOpenCreateNew: () => void };

const MealsActions: React.FC<Props> = ({ onOpenFromRecipe, onOpenCreateNew }) => {
  return (
    <View style={styles.row}>
      <TouchableOpacity style={styles.btn} onPress={onOpenFromRecipe}>
        <Text style={styles.btnText}>FROM RECIPE</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.btn} onPress={onOpenCreateNew}>
        <Text style={styles.btnText}>CREATE NEW</Text>
      </TouchableOpacity>
    </View>
  );
};

export default MealsActions;

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12, justifyContent: 'center' },
  btn: {
    backgroundColor: C.darkBtn,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 140,
    alignItems: 'center',
  },
  btnText: { color: C.text, fontWeight: 'bold' },
});
