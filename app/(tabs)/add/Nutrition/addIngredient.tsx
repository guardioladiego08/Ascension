// app/(tabs)/nutrition/addIngredient.tsx
import React, { useState, useCallback } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { GlobalStyles } from '@/constants/GlobalStyles';
import { Colors } from '@/constants/Colors';
import LogoHeader from '@/components/my components/logoHeader';
import { supabase } from '@/lib/supabase';

const CARD = Colors.dark.card;
const TEXT_PRIMARY = '#EAF2FF';
const TEXT_MUTED = '#9AA4BF';
const PRIMARY_GREEN = '#15C779';

type FoodRow = {
  id: number;
  description: string;
  serving_size: number | null;
  serving_unit: string | null;
  kcal: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
};

export default function AddIngredient() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FoodRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Clear last search whenever this screen gains focus
  useFocusEffect(
    useCallback(() => {
      setQuery('');
      setResults([]);
      setErrorText(null);
      setHasSearched(false);
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

    const { data, error } = await supabase
      .from('foods')
      .select(
        'id, description, serving_size, serving_unit, kcal, protein, carbs, fat'
      )
      .ilike('description', `%${trimmed}%`)
      .limit(30);

    setLoading(false);

    if (error) {
      console.error('Food search error', error);
      setErrorText('Something went wrong while searching.');
      setResults([]);
      return;
    }

    setResults((data as FoodRow[]) || []);
  };

  const handleSelectFood = (item: FoodRow) => {
    // Send selected food back to CreateMeal with its basic stats
    router.replace({
      pathname: './createMeal', // adjust if your path is different
      params: {
        foodId: item.id.toString(),
        description: item.description,
        kcal: item.kcal != null ? String(item.kcal) : '',
        protein: item.protein != null ? String(item.protein) : '',
        carbs: item.carbs != null ? String(item.carbs) : '',
        fat: item.fat != null ? String(item.fat) : '',
        serving_size:
          item.serving_size != null ? String(item.serving_size) : '',
        serving_unit: item.serving_unit ?? '',
      },
    });
  };

  const renderItem = ({ item }: { item: FoodRow }) => (
    <FoodSearchRow item={item} onPress={() => handleSelectFood(item)} />
  );

  return (
    <SafeAreaView style={GlobalStyles.safeArea}>
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
              placeholder="Search foods..."
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
              <ActivityIndicator size="small" color={PRIMARY_GREEN} />
              <Text style={styles.loadingText}>Searching foods...</Text>
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
              keyExtractor={item => item.id.toString()}
              renderItem={renderItem}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

/* ---- Row component for search results ---- */

type FoodSearchRowProps = {
  item: FoodRow;
  onPress?: () => void;
};

function FoodSearchRow({ item, onPress }: FoodSearchRowProps) {
  const kcal = item.kcal ?? 0;
  const protein = item.protein ?? 0;
  const carbs = item.carbs ?? 0;
  const fat = item.fat ?? 0;

  const servingLabel =
    item.serving_size && item.serving_unit
      ? `per ${item.serving_size}${item.serving_unit}`
      : 'per serving';

  return (
    <TouchableOpacity
      style={styles.foodRow}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.foodTitle}>{item.description}</Text>
        <Text style={styles.foodSubtitle}>
          {kcal ? `${kcal} kcal` : '-- kcal'} · {`${protein}P ${carbs}C ${fat}F`}
        </Text>
        <Text style={styles.foodServing}>{servingLabel}</Text>
      </View>
      <Ionicons name="add-circle-outline" size={22} color={PRIMARY_GREEN} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  main: {
    flex: 1,
    backgroundColor: Colors.dark.background,
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
    borderRadius: 999,
    backgroundColor: PRIMARY_GREEN,
  },
  searchBtnText: {
    color: '#05101F',
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
    fontSize: 11,
    marginTop: 2,
  },
  foodServing: {
    color: TEXT_MUTED,
    fontSize: 10,
    marginTop: 2,
  },
});
