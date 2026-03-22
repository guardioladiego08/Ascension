import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAppTheme } from '@/providers/AppThemeProvider';
import { HOME_TONES } from '../../../home/tokens';
import type { MealDraftIngredientComputed } from '@/lib/nutrition/mealBuilder';

type Props = {
  ingredients: MealDraftIngredientComputed[];
  onChangeQuantity: (ingredientId: string, value: string) => void;
  onIncrementQuantity: (ingredientId: string, delta: number) => void;
  onChangeUnit: (ingredientId: string, value: string) => void;
  onChangeGramsPerUnit: (ingredientId: string, value: string) => void;
  onMoveUp: (ingredientId: string) => void;
  onMoveDown: (ingredientId: string) => void;
  onRemove: (ingredientId: string) => void;
};

const IngredientsList: React.FC<Props> = ({
  ingredients,
  onChangeQuantity,
  onIncrementQuantity,
  onChangeUnit,
  onChangeGramsPerUnit,
  onMoveUp,
  onMoveDown,
  onRemove,
}) => {
  const { colors, fonts } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);

  if (!ingredients || ingredients.length === 0) {
    return (
      <View style={[styles.panelSoft, styles.emptyWrap]}>
        <Text style={styles.emptyTitle}>No ingredients added</Text>
        <Text style={styles.emptyText}>Search foods below to build your meal.</Text>
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {ingredients.map((item, index) => {
        const isFirst = index === 0;
        const isLast = index === ingredients.length - 1;

        return (
          <View key={item.id} style={styles.row}>
            <View style={styles.rowHeader}>
              <View style={styles.titleWrap}>
                <Text style={styles.title} numberOfLines={2}>
                  {item.name}
                </Text>
                {item.brand ? <Text style={styles.brand}>{item.brand}</Text> : null}
              </View>

              <View style={styles.iconActions}>
                <TouchableOpacity
                  style={styles.iconButton}
                  activeOpacity={0.85}
                  onPress={() => onMoveUp(item.id)}
                  disabled={isFirst}
                >
                  <Ionicons
                    name="arrow-up"
                    size={14}
                    color={isFirst ? HOME_TONES.textTertiary : HOME_TONES.textPrimary}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.iconButton}
                  activeOpacity={0.85}
                  onPress={() => onMoveDown(item.id)}
                  disabled={isLast}
                >
                  <Ionicons
                    name="arrow-down"
                    size={14}
                    color={isLast ? HOME_TONES.textTertiary : HOME_TONES.textPrimary}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.iconButton}
                  activeOpacity={0.85}
                  onPress={() => onRemove(item.id)}
                >
                  <Ionicons name="trash-outline" size={14} color={colors.danger} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.controlsRow}>
              <View style={styles.quantityWrap}>
                <Text style={styles.controlLabel}>Qty</Text>
                <View style={styles.stepper}>
                  <TouchableOpacity
                    style={styles.stepperButton}
                    activeOpacity={0.9}
                    onPress={() => onIncrementQuantity(item.id, -0.5)}
                  >
                    <Ionicons name="remove" size={14} color={HOME_TONES.textPrimary} />
                  </TouchableOpacity>
                  <TextInput
                    style={styles.quantityInput}
                    value={item.quantityInput}
                    onChangeText={(value) => onChangeQuantity(item.id, value)}
                    keyboardType="decimal-pad"
                    placeholder="1"
                    placeholderTextColor={HOME_TONES.textTertiary}
                  />
                  <TouchableOpacity
                    style={styles.stepperButton}
                    activeOpacity={0.9}
                    onPress={() => onIncrementQuantity(item.id, 0.5)}
                  >
                    <Ionicons name="add" size={14} color={HOME_TONES.textPrimary} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.unitWrap}>
                <Text style={styles.controlLabel}>Unit</Text>
                <TextInput
                  style={styles.controlInput}
                  value={item.unit}
                  onChangeText={(value) => onChangeUnit(item.id, value)}
                  placeholder="serving"
                  placeholderTextColor={HOME_TONES.textTertiary}
                />
              </View>

              <View style={styles.gramsWrap}>
                <Text style={styles.controlLabel}>g / unit</Text>
                <TextInput
                  style={styles.controlInput}
                  value={item.gramsPerUnitInput}
                  onChangeText={(value) => onChangeGramsPerUnit(item.id, value)}
                  keyboardType="decimal-pad"
                  placeholder="100"
                  placeholderTextColor={HOME_TONES.textTertiary}
                />
              </View>
            </View>

            <Text style={styles.servingText}>
              {item.totalGrams.toFixed(1)}g total ({item.quantity.toFixed(2)} {item.unit})
            </Text>

            <View style={styles.chipRow}>
              <MetricChip label="kcal" value={String(Math.round(item.kcal))} styles={styles} />
              <MetricChip label="P" value={item.protein.toFixed(1)} styles={styles} />
              <MetricChip label="C" value={item.carbs.toFixed(1)} styles={styles} />
              <MetricChip label="F" value={item.fat.toFixed(1)} styles={styles} />
            </View>
          </View>
        );
      })}
    </View>
  );
};

function MetricChip({
  label,
  value,
  styles,
}: {
  label: string;
  value: string;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipLabel}>{label}</Text>
      <Text style={styles.chipValue}>{value}</Text>
    </View>
  );
}

function createStyles(
  colors: ReturnType<typeof useAppTheme>['colors'],
  fonts: ReturnType<typeof useAppTheme>['fonts']
) {
  return StyleSheet.create({
    panelSoft: {
      backgroundColor: HOME_TONES.surface2,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      padding: 18,
    },
    emptyWrap: {
      alignItems: 'flex-start',
      gap: 6,
    },
    emptyTitle: {
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.heading,
      fontSize: 16,
      lineHeight: 20,
    },
    emptyText: {
      color: HOME_TONES.textSecondary,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 18,
    },
    list: {
      gap: 12,
    },
    row: {
      borderRadius: 22,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      backgroundColor: HOME_TONES.surface2,
      padding: 14,
      gap: 12,
    },
    rowHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
    },
    titleWrap: {
      flex: 1,
    },
    title: {
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.heading,
      fontSize: 15,
      lineHeight: 20,
    },
    brand: {
      marginTop: 3,
      color: HOME_TONES.textSecondary,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 16,
    },
    iconActions: {
      flexDirection: 'row',
      gap: 6,
    },
    iconButton: {
      width: 30,
      height: 30,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      backgroundColor: HOME_TONES.surface3,
      alignItems: 'center',
      justifyContent: 'center',
    },
    controlsRow: {
      flexDirection: 'row',
      gap: 8,
      alignItems: 'flex-end',
    },
    quantityWrap: {
      flex: 1.3,
      gap: 5,
    },
    unitWrap: {
      flex: 1,
      gap: 5,
    },
    gramsWrap: {
      flex: 1,
      gap: 5,
    },
    controlLabel: {
      color: HOME_TONES.textTertiary,
      fontFamily: fonts.label,
      fontSize: 10,
      lineHeight: 12,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    },
    controlInput: {
      height: 38,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      backgroundColor: HOME_TONES.surface3,
      paddingHorizontal: 10,
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.body,
      fontSize: 13,
    },
    stepper: {
      height: 38,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      backgroundColor: HOME_TONES.surface3,
      flexDirection: 'row',
      alignItems: 'center',
      overflow: 'hidden',
    },
    stepperButton: {
      width: 30,
      height: '100%',
      alignItems: 'center',
      justifyContent: 'center',
    },
    quantityInput: {
      flex: 1,
      height: '100%',
      borderLeftWidth: 1,
      borderRightWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.heading,
      fontSize: 13,
      paddingHorizontal: 8,
      textAlign: 'center',
      backgroundColor: HOME_TONES.surface3,
    },
    servingText: {
      marginTop: 2,
      color: HOME_TONES.textSecondary,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 16,
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    chip: {
      minWidth: 62,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      backgroundColor: HOME_TONES.surface3,
      paddingHorizontal: 10,
      paddingVertical: 7,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    chipLabel: {
      color: HOME_TONES.textTertiary,
      fontFamily: fonts.label,
      fontSize: 10,
      lineHeight: 12,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    },
    chipValue: {
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.heading,
      fontSize: 12,
      lineHeight: 14,
    },
  });
}

export default IngredientsList;
