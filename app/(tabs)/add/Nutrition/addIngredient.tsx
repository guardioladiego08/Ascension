// app/(tabs)/nutrition/addIngredient.tsx
import React, { useState, useCallback, useMemo } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { GlobalStyles } from '@/constants/GlobalStyles';
import { Colors } from '@/constants/Colors';
import LogoHeader from '@/components/my components/logoHeader';
import { supabase } from '@/lib/supabase';
import { PieChart } from 'react-native-gifted-charts';
import { LinearGradient } from 'expo-linear-gradient';

const BG = Colors.dark.background;
const CARD = Colors.dark.card;
const TEXT_PRIMARY = Colors.dark.text;
const TEXT_MUTED = Colors.dark.textMuted;
const PRIMARY = Colors.dark.highlight1;

type JsonValue = any;

type FoodRow = {
  id: string;
  name: string | null;
  description: string | null;
  type: string | null;
  serving: JsonValue | null;
  nutrition_100g: JsonValue | null;
};

type UnitKey = 'common' | 'metric';

type MacrosPreview = {
  gramsPerUnit: number;
  kcalPerUnit: number;
  proteinPerUnit: number;
  carbsPerUnit: number;
  fatPerUnit: number;
  kcalPortion: number;
  proteinPortion: number;
  carbsPortion: number;
  fatPortion: number;
};

export default function AddIngredient() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FoodRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Portion popup state
  const [selectedFood, setSelectedFood] = useState<FoodRow | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedUnitKey, setSelectedUnitKey] = useState<UnitKey>('common');
  const [amount, setAmount] = useState<string>('1');

  // Clear last search whenever this screen gains focus
  useFocusEffect(
    useCallback(() => {
      setQuery('');
      setResults([]);
      setErrorText(null);
      setHasSearched(false);

      setSelectedFood(null);
      setModalVisible(false);
      setSelectedUnitKey('common');
      setAmount('1');
    }, [])
  );

  const handleSearch = async () => {
    const trimmed = query.trim();

    if (!trimmed) {
      setErrorText('Type something to search.');
      setResults([]);
      setHasSearched(true);
      return;
    }

    setLoading(true);
    setErrorText(null);
    setHasSearched(true);

    try {
      // 1) everyday foods
      // 2) everything else
      const [everydayRes, othersRes] = await Promise.all([
        supabase
          .from('foods')
          .select('id, name, description, type, serving, nutrition_100g')
          .eq('type', 'everyday')
          .ilike('name', `%${trimmed}%`)
          .order('name', { ascending: true })
          .limit(50),
        supabase
          .from('foods')
          .select('id, name, description, type, serving, nutrition_100g')
          .neq('type', 'everyday')
          .ilike('name', `%${trimmed}%`)
          .order('name', { ascending: true })
          .limit(50),
      ]);

      if (everydayRes.error) {
        console.error('Error searching everyday foods:', everydayRes.error);
      }
      if (othersRes.error) {
        console.error('Error searching non-everyday foods:', othersRes.error);
      }

      if (everydayRes.error && othersRes.error) {
        setErrorText('Something went wrong searching foods.');
        setResults([]);
        setLoading(false);
        return;
      }

      const everydayData = everydayRes.data ?? [];
      const otherData = othersRes.data ?? [];

      setResults([...everydayData, ...otherData]);
    } catch (err) {
      console.error('Unexpected search error:', err);
      setErrorText('Something went wrong searching foods.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const openPortionModal = (item: FoodRow) => {
    setSelectedFood(item);
    setSelectedUnitKey('common');
    setAmount('1');
    setModalVisible(true);
  };

  // Helpers for serving + macros
  const getServingObjects = (food: FoodRow | null) => {
    const s = (food?.serving as any) || {};
    return {
      common: s?.common || null,
      metric: s?.metric || null,
    };
  };

  const getUnitOptions = (food: FoodRow | null) => {
    const { common, metric } = getServingObjects(food);
    const options: { key: UnitKey; label: string }[] = [];

    if (common) {
      options.push({
        key: 'common',
        label: common.unit || 'serving',
      });
    }
    if (metric) {
      const unitLabel =
        metric.unit === 'g'
          ? 'grams (g)'
          : metric.unit === 'ml'
          ? 'milliliters (ml)'
          : metric.unit || 'g';
      options.push({
        key: 'metric',
        label: unitLabel,
      });
    }

    if (options.length === 0) {
      options.push({ key: 'metric', label: 'grams (g)' });
    }

    return options;
  };

  const parseAmount = (raw: string) => {
    const cleaned = raw.replace(',', '.');
    const num = parseFloat(cleaned);
    if (Number.isNaN(num) || num <= 0) return 0;
    return num;
  };

  const macrosPreview: MacrosPreview | null = useMemo(() => {
    if (!selectedFood || !selectedFood.nutrition_100g) return null;

    const amountNum = parseAmount(amount);
    if (!amountNum) return null;

    const nutrition = (selectedFood.nutrition_100g as any) || {};
    const { common, metric } = getServingObjects(selectedFood);

    let gramsPerUnit = 1;

    if (selectedUnitKey === 'common' && common && metric) {
      const commonQty = Number(common.quantity) || 1;
      const metricQty = Number(metric.quantity) || 0;
      if (metricQty > 0 && commonQty > 0) {
        gramsPerUnit = metricQty / commonQty; // grams per ONE common unit
      }
    } else {
      // metric path: treat 1 unit as ~1 g (or 1 ml ≈ 1 g)
      gramsPerUnit = 1;
    }

    const factorPerUnit = gramsPerUnit / 100;

    const kcalPerUnit = (nutrition.calories ?? 0) * factorPerUnit;
    const proteinPerUnit = (nutrition.protein ?? 0) * factorPerUnit;
    const carbsPerUnit = (nutrition.carbohydrates ?? 0) * factorPerUnit;
    const fatPerUnit = (nutrition.total_fat ?? 0) * factorPerUnit;

    const kcalPortion = kcalPerUnit * amountNum;
    const proteinPortion = proteinPerUnit * amountNum;
    const carbsPortion = carbsPerUnit * amountNum;
    const fatPortion = fatPerUnit * amountNum;

    return {
      gramsPerUnit,
      kcalPerUnit,
      proteinPerUnit,
      carbsPerUnit,
      fatPerUnit,
      kcalPortion,
      proteinPortion,
      carbsPortion,
      fatPortion,
    };
  }, [selectedFood, selectedUnitKey, amount]);

  const handleConfirmPortion = () => {
    if (!selectedFood || !macrosPreview) {
      setModalVisible(false);
      return;
    }

    const amountNum = parseAmount(amount);
    if (!amountNum) {
      Alert.alert('Invalid amount', 'Please enter a positive number.');
      return;
    }

    const {
      gramsPerUnit,
      kcalPerUnit,
      proteinPerUnit,
      carbsPerUnit,
      fatPerUnit,
    } = macrosPreview;

    router.replace({
      pathname: './createMeal',
      params: {
        foodId: selectedFood.id,
        description:
          selectedFood.name || selectedFood.description || 'Ingredient',
        kcal: String(kcalPerUnit),
        protein: String(proteinPerUnit),
        carbs: String(carbsPerUnit),
        fat: String(fatPerUnit),
        serving_size: String(gramsPerUnit),
        serving_unit:
          selectedUnitKey === 'common'
            ? (getServingObjects(selectedFood).common?.unit || 'serving')
            : (getServingObjects(selectedFood).metric?.unit || 'g'),
        quantity: String(amountNum),
      },
    });

    setModalVisible(false);
  };

  const renderItem = ({ item }: { item: FoodRow }) => (
    <FoodSearchRow item={item} onPress={() => openPortionModal(item)} />
  );

  return (
    <LinearGradient
      colors={['#3a3a3bff', '#1e1e1eff', BG]}
      start={{ x: 0.2, y: 0 }}
      end={{ x: 0.8, y: 1 }}
      style={{ flex: 1 }}
    >
      <View style={GlobalStyles.safeArea}>
        <LogoHeader showBackButton />
        <View style={styles.main}>
          {/* Header */}
          <View style={styles.headerRow}>
            <Text style={GlobalStyles.header}>Add Ingredient</Text>
          </View>

          {/* Search bar */}
          <View style={styles.searchCard}>
            <View style={styles.searchRow}>
              <Ionicons name="search" size={18} color={TEXT_MUTED} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search foods…"
                placeholderTextColor={TEXT_MUTED}
                value={query}
                onChangeText={setQuery}
                returnKeyType="search"
                onSubmitEditing={handleSearch}
              />
              <TouchableOpacity
                style={styles.searchBtn}
                onPress={handleSearch}
                activeOpacity={0.9}
              >
                <Text style={styles.searchBtnText}>Search</Text>
              </TouchableOpacity>
            </View>
            {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}
          </View>

          {/* Results */}
          <View style={styles.listContainer}>
            {loading && (
              <View style={styles.center}>
                <ActivityIndicator size="small" color={PRIMARY} />
                <Text style={styles.loadingText}>Searching foods.</Text>
              </View>
            )}

            {!loading && hasSearched && results.length === 0 && !errorText && (
              <View style={styles.center}>
                <Text style={styles.emptyText}>No foods found.</Text>
              </View>
            )}

            {!loading && results.length > 0 && (
              <FlatList
                data={results}
                keyExtractor={item => item.id}
                renderItem={renderItem}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>

          {/* Portion selection modal (separate component) */}
          <IngredientPortionModal
            visible={modalVisible}
            onClose={() => setModalVisible(false)}
            onConfirm={handleConfirmPortion}
            food={selectedFood}
            unitKey={selectedUnitKey}
            setUnitKey={setSelectedUnitKey}
            amount={amount}
            setAmount={setAmount}
            macrosPreview={macrosPreview}
            getUnitOptions={getUnitOptions}
          />
        </View>
      </View>
    </LinearGradient>
  );
}

/* ---- Donut chart for macro distribution ---- */

type MacroDonutProps = {
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

const MacroDonut: React.FC<MacroDonutProps> = ({
  kcal,
  proteinG,
  carbsG,
  fatG,
}) => {
  const proteinKcal = proteinG * 4;
  const carbsKcal = carbsG * 4;
  const fatKcal = fatG * 9;

  const totalMacroKcal = proteinKcal + carbsKcal + fatKcal || 1;

  const data = [
    { value: proteinKcal, label: 'P', color: Colors.dark.macroProtein},
    { value: carbsKcal, label: 'C', color: Colors.dark.macroCarbs },
    { value: fatKcal, label: 'F', color: Colors.dark.macroFats},
  ];

  const pct = (part: number) =>
    Math.round((part / totalMacroKcal) * 100);

  return (
    <View style={styles.macroDonutContainer}>
      <PieChart
        data={data}
        donut
        radius={60}
        innerRadius={38}
        showText={false}
        strokeWidth={0}
        centerLabelComponent={() => (
          <View style={styles.macroCenterLabel}>
            <Text style={styles.macroCenterKcal}>
              {Math.round(kcal)}
            </Text>
            <Text style={styles.macroCenterKcalLabel}>kcal</Text>
          </View>
        )}
      />

      <View style={styles.macroLegend}>
        <View style={styles.macroLegendRow}>
          <View
            style={[styles.macroDot, { backgroundColor: '#4FD1C5' }]}
          />
          <Text style={styles.macroLegendText}>
            Protein · {proteinG.toFixed(1)} g ({pct(proteinKcal)}%)
          </Text>
        </View>
        <View style={styles.macroLegendRow}>
          <View
            style={[styles.macroDot, { backgroundColor: '#F6AD55' }]}
          />
          <Text style={styles.macroLegendText}>
            Carbs · {carbsG.toFixed(1)} g ({pct(carbsKcal)}%)
          </Text>
        </View>
        <View style={styles.macroLegendRow}>
          <View
            style={[styles.macroDot, { backgroundColor: '#F56565' }]}
          />
          <Text style={styles.macroLegendText}>
            Fat · {fatG.toFixed(1)} g ({pct(fatKcal)}%)
          </Text>
        </View>
      </View>
    </View>
  );
};

/* ---- Portion modal component ---- */

type IngredientPortionModalProps = {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  food: FoodRow | null;
  unitKey: UnitKey;
  setUnitKey: (key: UnitKey) => void;
  amount: string;
  setAmount: (value: string) => void;
  macrosPreview: MacrosPreview | null;
  getUnitOptions: (food: FoodRow | null) => { key: UnitKey; label: string }[];
};

const IngredientPortionModal: React.FC<IngredientPortionModalProps> = ({
  visible,
  onClose,
  onConfirm,
  food,
  unitKey,
  setUnitKey,
  amount,
  setAmount,
  macrosPreview,
  getUnitOptions,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          {/* Name + calories */}
          <Text style={styles.modalTitle}>
            {food?.name || food?.description || 'Ingredient'}
          </Text>

          {/* Unit picker + amount */}
          <View style={styles.modalRow}>
            <View style={styles.wheelContainer}>
              <Picker
                selectedValue={unitKey}
                onValueChange={val => setUnitKey(val as UnitKey)}
                itemStyle={{ color: TEXT_PRIMARY }}
              >
                {getUnitOptions(food).map(opt => (
                  <Picker.Item
                    key={opt.key}
                    label={opt.label}
                    value={opt.key}
                  />
                ))}
              </Picker>
            </View>

            <View style={styles.amountContainer}>
              <Text style={styles.amountLabel}>Amount</Text>
              <TextInput
                style={styles.amountInput}
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
              />
            </View>
          </View>

          {/* Donut chart + macros */}
          {macrosPreview && (
            <View style={styles.previewRow}>
              <MacroDonut
                kcal={macrosPreview.kcalPortion}
                proteinG={macrosPreview.proteinPortion}
                carbsG={macrosPreview.carbsPortion}
                fatG={macrosPreview.fatPortion}
              />
            </View>
          )}

          {/* Buttons */}
          <View style={styles.modalButtonsRow}>
            <TouchableOpacity
              style={[styles.modalBtn, styles.modalCancelBtn]}
              onPress={onClose}
              activeOpacity={0.9}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalBtn, styles.modalConfirmBtn]}
              onPress={onConfirm}
              activeOpacity={0.9}
            >
              <Text style={styles.modalConfirmText}>Add</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

/* ---- Row component for search results ---- */

type FoodSearchRowProps = {
  item: FoodRow;
  onPress?: () => void;
};

function FoodSearchRow({ item, onPress }: FoodSearchRowProps) {
  const nutrition = (item.nutrition_100g as any) || {};
  const kcal100 = nutrition.calories ?? null;
  const protein100 = nutrition.protein ?? null;
  const carbs100 = nutrition.carbohydrates ?? null;
  const fat100 = nutrition.total_fat ?? null;

  const macroText =
    kcal100 != null
      ? `${Math.round(kcal100)} kcal · ${protein100 ?? 0}P ${
          carbs100 ?? 0
        }C ${fat100 ?? 0}F`
      : '-- kcal';

  return (
    <TouchableOpacity
      style={styles.foodRow}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.foodTitle}>
          {item.name || item.description || 'Unknown food'}
        </Text>
        <Text style={styles.foodSubtitle}>{macroText}</Text>
        <Text style={styles.foodServing}>per 100g</Text>
      </View>
      <Ionicons name="add-circle-outline" size={22} color={PRIMARY} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  main: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  searchCard: {
    backgroundColor: CARD,
    borderRadius: 18,
    padding: 12,
    marginBottom: 12,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    marginRight: 8,
    paddingVertical: 6,
    color: TEXT_PRIMARY,
    fontSize: 14,
  },
  searchBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,

  },
  searchBtnText: {
    color: PRIMARY,
    fontWeight: '700',
    fontSize: 12,
  },
  errorText: {
    marginTop: 6,
    color: '#FF7676',
    fontSize: 12,
  },
  listContainer: {
    flex: 1,
    marginTop: 4,
  },
  center: {
    alignItems: 'center',
    marginTop: 30,
  },
  loadingText: {
    marginTop: 8,
    color: TEXT_MUTED,
    fontSize: 12,
  },
  emptyText: {
    color: TEXT_MUTED,
    fontSize: 13,
  },
  separator: {
    height: 8,
  },
  foodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  foodTitle: {
    color: TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: '600',
  },
  foodSubtitle: {
    color: TEXT_MUTED,
    fontSize: 12,
    marginTop: 2,
  },
  foodServing: {
    color: TEXT_MUTED,
    fontSize: 11,
    marginTop: 2,
  },

  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: Colors.dark.popUpCard,
    borderRadius: 20,
    padding: 16,
  },
  modalTitle: {
    color: TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  wheelContainer: {
    flex: 1,
    height: 140,
    justifyContent: 'center',
  },
  amountContainer: {
    marginLeft: 12,
    width: 90,
  },
  amountLabel: {
    color: TEXT_MUTED,
    fontSize: 12,
    marginBottom: 4,
  },
  amountInput: {
    backgroundColor: Colors.dark.background,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: TEXT_PRIMARY,
    fontSize: 16,
    textAlign: 'center',
  },
  previewRow: {
    marginTop: 12,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    marginTop: 16,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelBtn: {
    borderWidth: 1,
    borderColor: TEXT_MUTED,
    marginRight: 8,
  },
  modalConfirmBtn: {
    backgroundColor: PRIMARY,
    marginLeft: 8,
  },
  modalCancelText: {
    color: TEXT_MUTED,
    fontSize: 13,
    fontWeight: '500',
  },
  modalConfirmText: {
    color: '#05101F',
    fontSize: 13,
    fontWeight: '700',
  },

  // Donut styles
  macroDonutContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  macroCenterLabel: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  macroCenterKcal: {
    color: TEXT_PRIMARY,
    fontSize: 18,
    fontWeight: '700',
  },
  macroCenterKcalLabel: {
    color: TEXT_MUTED,
    fontSize: 11,
    marginTop: -2,
  },
  macroLegend: {
    marginLeft: 16,
    flex: 1,
    justifyContent: 'center',
  },
  macroLegendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  macroDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  macroLegendText: {
    color: TEXT_PRIMARY,
    fontSize: 12,
  },
});
