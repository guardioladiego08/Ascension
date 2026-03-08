import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { PieChart } from 'react-native-gifted-charts';
import { LinearGradient } from 'expo-linear-gradient';

import LogoHeader from '@/components/my components/logoHeader';
import AppPopup from '@/components/ui/AppPopup';
import { supabase } from '@/lib/supabase';
import { useAppTheme } from '@/providers/AppThemeProvider';

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
  const { colors, fonts, globalStyles } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FoodRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedFood, setSelectedFood] = useState<FoodRow | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedUnitKey, setSelectedUnitKey] = useState<UnitKey>('common');
  const [amount, setAmount] = useState<string>('1');

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

      setResults([...(everydayRes.data ?? []), ...(othersRes.data ?? [])]);
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

  const getServingObjects = (food: FoodRow | null) => {
    const serving = (food?.serving as any) || {};
    return {
      common: serving?.common || null,
      metric: serving?.metric || null,
    };
  };

  const getUnitOptions = (food: FoodRow | null) => {
    const { common, metric } = getServingObjects(food);
    const options: { key: UnitKey; label: string }[] = [];

    if (common) {
      options.push({ key: 'common', label: common.unit || 'serving' });
    }

    if (metric) {
      const unitLabel =
        metric.unit === 'g'
          ? 'grams (g)'
          : metric.unit === 'ml'
            ? 'milliliters (ml)'
            : metric.unit || 'g';
      options.push({ key: 'metric', label: unitLabel });
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
        gramsPerUnit = metricQty / commonQty;
      }
    }

    const factorPerUnit = gramsPerUnit / 100;
    const kcalPerUnit = (nutrition.calories ?? 0) * factorPerUnit;
    const proteinPerUnit = (nutrition.protein ?? 0) * factorPerUnit;
    const carbsPerUnit = (nutrition.carbohydrates ?? 0) * factorPerUnit;
    const fatPerUnit = (nutrition.total_fat ?? 0) * factorPerUnit;

    return {
      gramsPerUnit,
      kcalPerUnit,
      proteinPerUnit,
      carbsPerUnit,
      fatPerUnit,
      kcalPortion: kcalPerUnit * amountNum,
      proteinPortion: proteinPerUnit * amountNum,
      carbsPortion: carbsPerUnit * amountNum,
      fatPortion: fatPerUnit * amountNum,
    };
  }, [amount, selectedFood, selectedUnitKey]);

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
        description: selectedFood.name || selectedFood.description || 'Ingredient',
        kcal: String(kcalPerUnit),
        protein: String(proteinPerUnit),
        carbs: String(carbsPerUnit),
        fat: String(fatPerUnit),
        serving_size: String(gramsPerUnit),
        serving_unit:
          selectedUnitKey === 'common'
            ? getServingObjects(selectedFood).common?.unit || 'serving'
            : getServingObjects(selectedFood).metric?.unit || 'g',
        quantity: String(amountNum),
      },
    });

    setModalVisible(false);
  };

  const renderItem = ({ item }: { item: FoodRow }) => (
    <FoodSearchRow item={item} onPress={() => openPortionModal(item)} styles={styles} />
  );

  return (
    <LinearGradient
      colors={[colors.gradientTop, colors.gradientMid, colors.gradientBottom]}
      start={{ x: 0.2, y: 0 }}
      end={{ x: 0.8, y: 1 }}
      style={globalStyles.page}
    >
      <View style={globalStyles.safeArea}>
        <LogoHeader showBackButton />

        <View style={styles.main}>
          <View style={styles.hero}>
            <Text style={globalStyles.eyebrow}>Ingredient Search</Text>
            <Text style={globalStyles.header}>Add ingredient</Text>
            <Text style={styles.heroText}>
              Search the food database, preview portion-based macros, and push the
              selected ingredient back into the meal builder.
            </Text>
          </View>

          <View style={styles.searchCard}>
            <View style={styles.searchRow}>
              <Ionicons name="search" size={18} color={colors.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search foods"
                placeholderTextColor={colors.textOffSt}
                value={query}
                onChangeText={setQuery}
                returnKeyType="search"
                onSubmitEditing={handleSearch}
              />
              <TouchableOpacity
                style={[globalStyles.buttonPrimary, styles.searchButton]}
                onPress={handleSearch}
                activeOpacity={0.9}
              >
                <Text style={globalStyles.buttonTextPrimary}>Search</Text>
              </TouchableOpacity>
            </View>
            {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}
          </View>

          <View style={styles.listContainer}>
            {loading ? (
              <View style={[globalStyles.panelSoft, styles.center]}>
                <ActivityIndicator size="small" color={colors.highlight1} />
                <Text style={styles.loadingText}>Searching foods...</Text>
              </View>
            ) : null}

            {!loading && hasSearched && results.length === 0 && !errorText ? (
              <View style={[globalStyles.panelSoft, styles.center]}>
                <Text style={styles.emptyText}>No foods found.</Text>
              </View>
            ) : null}

            {!loading && results.length > 0 ? (
              <FlatList
                data={results}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.resultsContent}
              />
            ) : null}
          </View>

          <IngredientPortionPopup
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
            styles={styles}
          />
        </View>
      </View>
    </LinearGradient>
  );
}

type MacroDonutProps = {
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  styles: ReturnType<typeof createStyles>;
};

const MacroDonut: React.FC<MacroDonutProps> = ({
  kcal,
  proteinG,
  carbsG,
  fatG,
  styles,
}) => {
  const { colors } = useAppTheme();

  const proteinKcal = proteinG * 4;
  const carbsKcal = carbsG * 4;
  const fatKcal = fatG * 9;
  const totalMacroKcal = proteinKcal + carbsKcal + fatKcal || 1;

  const data = [
    { value: proteinKcal, label: 'P', color: colors.macroProtein },
    { value: carbsKcal, label: 'C', color: colors.macroCarbs },
    { value: fatKcal, label: 'F', color: colors.macroFats },
  ];

  const pct = (part: number) => Math.round((part / totalMacroKcal) * 100);

  return (
    <View style={styles.macroDonutContainer}>
      <PieChart
        data={data}
        donut
        radius={62}
        innerRadius={40}
        innerCircleColor={colors.cardDark}
        showText={false}
        strokeWidth={0}
        centerLabelComponent={() => (
          <View style={styles.macroCenterLabel}>
            <Text style={styles.macroCenterKcal}>{Math.round(kcal)}</Text>
            <Text style={styles.macroCenterKcalLabel}>kcal</Text>
          </View>
        )}
      />

      <View style={styles.macroLegend}>
        <LegendRow
          color={colors.macroProtein}
          label={`Protein · ${proteinG.toFixed(1)} g (${pct(proteinKcal)}%)`}
          styles={styles}
        />
        <LegendRow
          color={colors.macroCarbs}
          label={`Carbs · ${carbsG.toFixed(1)} g (${pct(carbsKcal)}%)`}
          styles={styles}
        />
        <LegendRow
          color={colors.macroFats}
          label={`Fat · ${fatG.toFixed(1)} g (${pct(fatKcal)}%)`}
          styles={styles}
        />
      </View>
    </View>
  );
};

function LegendRow({
  color,
  label,
  styles,
}: {
  color: string;
  label: string;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.macroLegendRow}>
      <View style={[styles.macroDot, { backgroundColor: color }]} />
      <Text style={styles.macroLegendText}>{label}</Text>
    </View>
  );
}

type IngredientPortionPopupProps = {
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
  styles: ReturnType<typeof createStyles>;
};

const IngredientPortionPopup: React.FC<IngredientPortionPopupProps> = ({
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
  styles,
}) => {
  const { colors, globalStyles } = useAppTheme();

  return (
    <AppPopup
      visible={visible}
      onClose={onClose}
      align="bottom"
      animationType="slide"
      eyebrow="Portion Setup"
      title={food?.name || food?.description || 'Ingredient'}
      subtitle="Choose the serving unit and amount before sending it back to the recipe."
      showCloseButton
      bodyStyle={styles.popupBody}
      footer={
        <View style={styles.modalButtonsRow}>
          <TouchableOpacity
            style={[globalStyles.buttonSecondary, styles.modalButton]}
            onPress={onClose}
            activeOpacity={0.9}
          >
            <Text style={globalStyles.buttonTextSecondary}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[globalStyles.buttonPrimary, styles.modalButton]}
            onPress={onConfirm}
            activeOpacity={0.9}
          >
            <Text style={globalStyles.buttonTextPrimary}>Add</Text>
          </TouchableOpacity>
        </View>
      }
    >
      <View style={styles.modalRow}>
        <View style={styles.wheelContainer}>
          <Text style={styles.amountLabel}>Serving Unit</Text>
          <Picker
            selectedValue={unitKey}
            onValueChange={(value) => setUnitKey(value as UnitKey)}
            itemStyle={{ color: colors.text }}
          >
            {getUnitOptions(food).map((option) => (
              <Picker.Item key={option.key} label={option.label} value={option.key} />
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
            placeholder="1"
            placeholderTextColor={colors.textOffSt}
          />
        </View>
      </View>

      {macrosPreview ? (
        <View style={styles.previewRow}>
          <MacroDonut
            kcal={macrosPreview.kcalPortion}
            proteinG={macrosPreview.proteinPortion}
            carbsG={macrosPreview.carbsPortion}
            fatG={macrosPreview.fatPortion}
            styles={styles}
          />
        </View>
      ) : null}
    </AppPopup>
  );
};

type FoodSearchRowProps = {
  item: FoodRow;
  onPress?: () => void;
  styles: ReturnType<typeof createStyles>;
};

function FoodSearchRow({ item, onPress, styles }: FoodSearchRowProps) {
  const { colors } = useAppTheme();

  const nutrition = (item.nutrition_100g as any) || {};
  const kcal100 = nutrition.calories ?? null;
  const protein100 = nutrition.protein ?? null;
  const carbs100 = nutrition.carbohydrates ?? null;
  const fat100 = nutrition.total_fat ?? null;

  const macroText =
    kcal100 != null
      ? `${Math.round(kcal100)} kcal · ${protein100 ?? 0}P ${carbs100 ?? 0}C ${fat100 ?? 0}F`
      : '-- kcal';

  return (
    <TouchableOpacity style={styles.foodRow} onPress={onPress} activeOpacity={0.9}>
      <View style={styles.foodRowCopy}>
        <Text style={styles.foodTitle}>{item.name || item.description || 'Unknown food'}</Text>
        <Text style={styles.foodSubtitle}>{macroText}</Text>
        <Text style={styles.foodServing}>per 100g</Text>
      </View>
      <View style={styles.foodAction}>
        <Ionicons name="add-circle-outline" size={22} color={colors.highlight1} />
      </View>
    </TouchableOpacity>
  );
}

function createStyles(
  colors: ReturnType<typeof useAppTheme>['colors'],
  fonts: ReturnType<typeof useAppTheme>['fonts']
) {
  return StyleSheet.create({
    main: {
      flex: 1,
      paddingTop: 8,
      gap: 14,
    },
    hero: {
      borderRadius: 28,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      padding: 20,
      gap: 8,
    },
    heroText: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 14,
      lineHeight: 20,
    },
    searchCard: {
      borderRadius: 24,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card2,
      padding: 12,
      gap: 8,
    },
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    searchInput: {
      flex: 1,
      color: colors.text,
      fontFamily: fonts.body,
      fontSize: 15,
    },
    searchButton: {
      minWidth: 92,
      height: 42,
      paddingHorizontal: 14,
    },
    errorText: {
      color: colors.danger,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 17,
    },
    listContainer: {
      flex: 1,
    },
    resultsContent: {
      paddingBottom: 8,
    },
    center: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 28,
      gap: 6,
    },
    loadingText: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 18,
    },
    emptyText: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 18,
    },
    foodRow: {
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card2,
      paddingHorizontal: 15,
      paddingVertical: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    foodRowCopy: {
      flex: 1,
    },
    foodTitle: {
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 15,
      lineHeight: 20,
    },
    foodSubtitle: {
      marginTop: 5,
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 17,
    },
    foodServing: {
      marginTop: 4,
      color: colors.textOffSt,
      fontFamily: fonts.body,
      fontSize: 11,
      lineHeight: 15,
    },
    foodAction: {
      width: 28,
      alignItems: 'center',
    },
    popupBody: {
      gap: 18,
    },
    modalRow: {
      flexDirection: 'row',
      gap: 12,
      alignItems: 'flex-start',
    },
    wheelContainer: {
      flex: 1,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card2,
      paddingTop: 10,
      overflow: 'hidden',
    },
    amountContainer: {
      width: 110,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card2,
      padding: 12,
      gap: 8,
    },
    amountLabel: {
      color: colors.textMuted,
      fontFamily: fonts.label,
      fontSize: 10,
      lineHeight: 12,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
      paddingHorizontal: 12,
    },
    amountInput: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
      paddingHorizontal: 12,
      paddingVertical: 12,
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 16,
      textAlign: 'center',
    },
    previewRow: {
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card2,
      padding: 16,
    },
    macroDonutContainer: {
      gap: 16,
      alignItems: 'center',
    },
    macroCenterLabel: {
      alignItems: 'center',
    },
    macroCenterKcal: {
      color: colors.text,
      fontFamily: fonts.display,
      fontSize: 22,
      lineHeight: 24,
      letterSpacing: -0.6,
    },
    macroCenterKcalLabel: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 11,
      lineHeight: 14,
    },
    macroLegend: {
      width: '100%',
      gap: 8,
    },
    macroLegendRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    macroDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    macroLegendText: {
      flex: 1,
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 16,
    },
    modalButtonsRow: {
      flexDirection: 'row',
      gap: 10,
    },
    modalButton: {
      flex: 1,
    },
  });
}
