import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
} from 'react-native';
import { Colors } from '@/constants/Colors';

const CARD_SOFT = '#202B42';
const TEXT_PRIMARY = Colors.dark.text;
const TEXT_MUTED = Colors.dark.textMuted;
const ACCENT_BLUE = '#4E8BFF';
const PRIMARY = Colors.dark.highlight1;

type Ingredient = {
  food_id: string;
  description: string;
  baseKcal: number;
  baseProtein: number;
  baseCarbs: number;
  baseFat: number;
  serving_size: number | null;
  serving_unit: string | null;
  quantity: number;
};


type Props = {
  ingredients: Ingredient[];
  onChangeQuantity: (index: number, value: string) => void;
};

const IngredientsList: React.FC<Props> = ({ ingredients, onChangeQuantity }) => {
  if (!ingredients || ingredients.length === 0) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.emptyText}>
          No ingredients added yet. Tap &quot;Add Ingredient&quot; to get started.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={ingredients}
      keyExtractor={(item, index) => `${item.food_id}-${index}`}
      renderItem={({ item, index }) => {
        const q = item.quantity || 0;
        const kcal = item.baseKcal * q;
        const protein = item.baseProtein * q;
        const carbs = item.baseCarbs * q;
        const fat = item.baseFat * q;

        const defaultServing =
          item.serving_size && item.serving_unit
            ? `${item.serving_size}${item.serving_unit}`
            : null;

        return (
          <View style={styles.row}>
            {/* Color strip on the left */}
            <View style={styles.leftAccent} />

            {/* Middle content */}
            <View style={styles.rowContent}>
              <Text style={styles.title} numberOfLines={2}>
                {item.description}
              </Text>

              {defaultServing && (
                <Text style={styles.servingText}>Default: {defaultServing}</Text>
              )}

              <View style={styles.macroChipsRow}>
                <View style={[styles.chip, { borderColor: '#fffffff3' }]}>
                  <Text style={styles.chipLabel}>kcal</Text>
                  <Text style={styles.chipValue}>{Math.round(kcal)}</Text>
                </View>
                <View style={styles.chip}>
                  <Text style={styles.chipLabel}>P</Text>
                  <Text style={styles.chipValue}>{protein.toFixed(1)}</Text>
                </View>
                <View style={styles.chip}>
                  <Text style={styles.chipLabel}>C</Text>
                  <Text style={styles.chipValue}>{carbs.toFixed(1)}</Text>
                </View>
                <View style={styles.chip}>
                  <Text style={styles.chipLabel}>F</Text>
                  <Text style={styles.chipValue}>{fat.toFixed(1)}</Text>
                </View>
              </View>
            </View>

            {/* Portion input on the right */}
            <View style={styles.portionBox}>
              <Text style={styles.portionLabel}>Portion</Text>
              <TextInput
                style={styles.portionInput}
                value={
                  item.quantity === 0 || Number.isNaN(item.quantity)
                    ? ''
                    : String(item.quantity)
                }
                onChangeText={val => onChangeQuantity(index, val)}
                keyboardType="decimal-pad"
                placeholder="1.0"
                placeholderTextColor={TEXT_MUTED}
              />
              <Text style={styles.portionUnit}>
                x {defaultServing ? 'serving' : 'unit'}
              </Text>
            </View>
          </View>
        );
      }}
      ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      scrollEnabled={false}
    />
  );
};

export default IngredientsList;

const styles = StyleSheet.create({
  emptyWrap: {
    paddingVertical: 12,
  },
  emptyText: {
    color: TEXT_MUTED,
    fontSize: 12,
  },
  row: {
    flexDirection: 'row',
    borderRadius: 16,
    overflow: 'hidden',
    paddingRight: 10,
  },
  leftAccent: {
    width: 4,
    backgroundColor: PRIMARY,
  },
  rowContent: {
    flex: 1,
    paddingHorizontal: 5,
    paddingVertical: 10,
  },
  title: {
    color: TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: '600',
  },
  servingText: {
    color: TEXT_MUTED,
    fontSize: 11,
    marginTop: 2,
  },
  macroChipsRow: {
    flexDirection: 'row',
    marginTop: 6,
  },
  chip: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ffffff9c',
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginRight: 6,
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  chipLabel: {
    color: TEXT_MUTED,
    fontSize: 10,
    marginRight: 3,
  },
  chipValue: {
    color: TEXT_PRIMARY,
    fontSize: 12,
    fontWeight: '600',
  },
  portionBox: {
    width: 80,
    paddingLeft: 35,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  portionLabel: {
    color: TEXT_MUTED,
    fontSize: 10,
  },
  portionInput: {
    marginTop: 3,
    backgroundColor: Colors.dark.card2,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 4,
    color: TEXT_PRIMARY,
    fontSize: 13,
    textAlign: 'center',
    minWidth: 60,
  },
  portionUnit: {
    marginTop: 2,
    color: TEXT_MUTED,
    fontSize: 10,
  },
});
