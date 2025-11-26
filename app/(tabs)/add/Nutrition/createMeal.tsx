import React from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { GlobalStyles } from '@/constants/GlobalStyles';
import { Colors } from '@/constants/Colors';
import LogoHeader from '@/components/my components/logoHeader';

type Ingredient = {
  id: string;
  name: string;
  grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

const MOCK_INGREDIENTS: Ingredient[] = [
  {
    id: '1',
    name: 'Grilled Chicken Breast',
    grams: 150,
    calories: 250,
    protein: 40,
    carbs: 0,
    fat: 7,
  },
  {
    id: '2',
    name: 'Jasmine Rice',
    grams: 180,
    calories: 240,
    protein: 4,
    carbs: 52,
    fat: 2,
  },
  {
    id: '3',
    name: 'Avocado',
    grams: 50,
    calories: 80,
    protein: 1,
    carbs: 4,
    fat: 7,
  },
];

export default function CreateMeal() {
  const router = useRouter();

  // Totals from mock ingredients (replace with real data later)
  const totals = MOCK_INGREDIENTS.reduce(
    (acc, ing) => {
      acc.grams += ing.grams;
      acc.calories += ing.calories;
      acc.protein += ing.protein;
      acc.carbs += ing.carbs;
      acc.fat += ing.fat;
      return acc;
    },
    { grams: 0, calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  return (
    <SafeAreaView style={GlobalStyles.safeArea}>
      <LogoHeader showBackButton />

      <View style={styles.main}>
        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={GlobalStyles.header}>Create Meal</Text>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Meal name input */}
          <View style={styles.card}>
            <Text style={styles.label}>Meal Name</Text>
            <TextInput
              placeholder="e.g. Chicken Rice Bowl"
              placeholderTextColor="#6C768D"
              style={styles.input}
            />
          </View>

          {/* Summary card */}
          <View style={[styles.card, { marginTop: 14 }]}>
            <View style={styles.summaryHeader}>
              <View style={styles.summaryHeaderLeft}>
                <Ionicons name="stats-chart" size={18} color="#15C779" />
                <Text style={styles.summaryTitle}>Meal Summary</Text>
              </View>
            </View>

            <View style={styles.summaryMainRow}>
              <View>
                <Text style={styles.summaryLabel}>Total Calories</Text>
                <Text style={styles.summaryCalories}>
                  {totals.calories.toFixed(0)}
                </Text>
                <Text style={styles.summarySubLabel}>kcal</Text>
              </View>
              <View style={styles.summaryRightBox}>
                <Text style={styles.summaryLabel}>Total Weight</Text>
                <Text style={styles.summaryRightValue}>
                  {totals.grams.toFixed(0)} g
                </Text>
              </View>
            </View>

            {/* Macro totals */}
            <View style={styles.macroRow}>
              <View style={styles.macroItem}>
                <Text style={styles.macroNumber}>{totals.protein.toFixed(0)}g</Text>
                <Text style={styles.macroLabel}>PROTEIN</Text>
              </View>
              <View style={styles.macroItem}>
                <Text style={styles.macroNumber}>{totals.carbs.toFixed(0)}g</Text>
                <Text style={styles.macroLabel}>CARBS</Text>
              </View>
              <View style={styles.macroItem}>
                <Text style={styles.macroNumber}>{totals.fat.toFixed(0)}g</Text>
                <Text style={styles.macroLabel}>FAT</Text>
              </View>
            </View>
          </View>

          {/* Ingredients list */}
          <Text style={styles.sectionLabel}>INGREDIENTS</Text>

          {/* (Later this could be a search/add input) */}
          {MOCK_INGREDIENTS.map(ing => (
            <View key={ing.id} style={styles.ingredientCard}>
              <View style={styles.ingredientLeft}>
                <Text style={styles.ingredientName}>{ing.name}</Text>
                <View style={styles.ingredientMetaRow}>
                  <Text style={styles.ingredientMeta}>
                    {ing.grams}g • {ing.calories} kcal
                  </Text>
                </View>
              </View>

              <View style={styles.ingredientMacros}>
                <MacroBadge label="P" value={`${ing.protein}g`} />
                <MacroBadge label="C" value={`${ing.carbs}g`} />
                <MacroBadge label="F" value={`${ing.fat}g`} />
              </View>
            </View>
          ))}

          {/* Add ingredient button */}
          <TouchableOpacity style={styles.addIngredientBtn} activeOpacity={0.9}>
            <Ionicons name="add-circle" size={20} color="#05101F" />
            <Text style={styles.addIngredientText}>Add Ingredient</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function MacroBadge({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.macroBadge}>
      <Text style={styles.macroBadgeLabel}>{label}</Text>
      <Text style={styles.macroBadgeValue}>{value}</Text>
    </View>
  );
}

/* --- Styles --- */

const CARD = Colors.dark.card;
const PRIMARY_GREEN = '#15C779';
const TEXT_PRIMARY = '#EAF2FF';
const TEXT_MUTED = '#9AA4BF';

const styles = StyleSheet.create({
  main: {
    flex: 1,
    backgroundColor: Colors.dark.background,
    paddingHorizontal: 18,
    paddingTop: 8,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },

  card: {
    backgroundColor: CARD,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  label: {
    color: TEXT_MUTED,
    fontSize: 12,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#0F1728',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: TEXT_PRIMARY,
    fontSize: 14,
  },

  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  summaryHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryTitle: {
    color: TEXT_PRIMARY,
    fontWeight: '700',
    marginLeft: 6,
    fontSize: 13,
  },

  summaryMainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    marginTop: 4,
  },
  summaryLabel: {
    color: TEXT_MUTED,
    fontSize: 11,
    marginBottom: 4,
  },
  summaryCalories: {
    color: TEXT_PRIMARY,
    fontSize: 24,
    fontWeight: '800',
  },
  summarySubLabel: {
    color: TEXT_MUTED,
    fontSize: 11,
  },
  summaryRightBox: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  summaryRightValue: {
    color: TEXT_PRIMARY,
    fontSize: 15,
    fontWeight: '700',
  },

  macroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  macroItem: {
    flex: 1,
    alignItems: 'center',
  },
  macroNumber: {
    color: TEXT_PRIMARY,
    fontWeight: '800',
    fontSize: 13,
  },
  macroLabel: {
    color: TEXT_MUTED,
    fontSize: 10,
    marginTop: 2,
  },

  sectionLabel: {
    color: TEXT_MUTED,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 10,
    marginTop: 18,
  },

  ingredientCard: {
    flexDirection: 'row',
    backgroundColor: CARD,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  ingredientLeft: {
    flex: 1,
  },
  ingredientName: {
    color: TEXT_PRIMARY,
    fontWeight: '600',
    fontSize: 14,
    marginBottom: 4,
  },
  ingredientMetaRow: {
    flexDirection: 'row',
  },
  ingredientMeta: {
    color: TEXT_MUTED,
    fontSize: 11,
  },
  ingredientMacros: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
  },
  macroBadge: {
    backgroundColor: '#101827',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 4,
    alignItems: 'center',
    marginLeft: 4,
  },
  macroBadgeLabel: {
    color: TEXT_MUTED,
    fontSize: 9,
  },
  macroBadgeValue: {
    color: TEXT_PRIMARY,
    fontSize: 11,
    fontWeight: '600',
  },

  addIngredientBtn: {
    marginTop: 12,
    backgroundColor: PRIMARY_GREEN,
    borderRadius: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  addIngredientText: {
    color: '#05101F',
    fontWeight: '800',
    fontSize: 14,
  },
});
