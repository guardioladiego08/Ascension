import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList } from 'react-native';

import { useAppTheme } from '@/providers/AppThemeProvider';

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
  const { colors, fonts, globalStyles } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);

  if (!ingredients || ingredients.length === 0) {
    return (
      <View style={[globalStyles.panelSoft, styles.emptyWrap]}>
        <Text style={styles.emptyTitle}>No ingredients added</Text>
        <Text style={styles.emptyText}>Use “Add Ingredient” to build the meal and preview macros.</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={ingredients}
      keyExtractor={(item, index) => `${item.food_id}-${index}`}
      renderItem={({ item, index }) => {
        const quantity = item.quantity || 0;
        const kcal = item.baseKcal * quantity;
        const protein = item.baseProtein * quantity;
        const carbs = item.baseCarbs * quantity;
        const fat = item.baseFat * quantity;

        const defaultServing =
          item.serving_size && item.serving_unit
            ? `${item.serving_size}${item.serving_unit}`
            : null;

        return (
          <View style={styles.row}>
            <View style={styles.rowHeader}>
              <View style={styles.titleWrap}>
                <Text style={styles.title} numberOfLines={2}>
                  {item.description}
                </Text>
                <Text style={styles.servingText}>
                  {defaultServing ? `Default serving: ${defaultServing}` : 'No default serving provided'}
                </Text>
              </View>

              <View style={styles.portionBox}>
                <Text style={styles.portionLabel}>Portion</Text>
                <TextInput
                  style={styles.portionInput}
                  value={
                    item.quantity === 0 || Number.isNaN(item.quantity)
                      ? ''
                      : String(item.quantity)
                  }
                  onChangeText={(value) => onChangeQuantity(index, value)}
                  keyboardType="decimal-pad"
                  placeholder="1.0"
                  placeholderTextColor={colors.textOffSt}
                />
                <Text style={styles.portionUnit}>x serving</Text>
              </View>
            </View>

            <View style={styles.chipRow}>
              <MetricChip label="kcal" value={String(Math.round(kcal))} styles={styles} />
              <MetricChip label="P" value={protein.toFixed(1)} styles={styles} />
              <MetricChip label="C" value={carbs.toFixed(1)} styles={styles} />
              <MetricChip label="F" value={fat.toFixed(1)} styles={styles} />
            </View>
          </View>
        );
      }}
      ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      scrollEnabled={false}
    />
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
    emptyWrap: {
      alignItems: 'flex-start',
      gap: 6,
    },
    emptyTitle: {
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 16,
      lineHeight: 20,
    },
    emptyText: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 18,
    },
    row: {
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card2,
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
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 15,
      lineHeight: 20,
    },
    servingText: {
      marginTop: 4,
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 16,
    },
    portionBox: {
      width: 86,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card3,
      paddingHorizontal: 10,
      paddingVertical: 10,
      alignItems: 'center',
    },
    portionLabel: {
      color: colors.textMuted,
      fontFamily: fonts.label,
      fontSize: 10,
      lineHeight: 12,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    portionInput: {
      width: '100%',
      marginTop: 8,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.borderStrong,
      backgroundColor: colors.background,
      paddingHorizontal: 8,
      paddingVertical: 8,
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 14,
      textAlign: 'center',
    },
    portionUnit: {
      marginTop: 6,
      color: colors.textOffSt,
      fontFamily: fonts.body,
      fontSize: 10,
      lineHeight: 12,
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
      borderColor: colors.border,
      backgroundColor: colors.card3,
      paddingHorizontal: 10,
      paddingVertical: 7,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    chipLabel: {
      color: colors.textMuted,
      fontFamily: fonts.label,
      fontSize: 10,
      lineHeight: 12,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    },
    chipValue: {
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 12,
      lineHeight: 14,
    },
  });
}

export default IngredientsList;
