// app/(tabs)/stats/meals.tsx
// Screen: "Meals" — now with a WORKING search that filters the list.

import React, { useMemo, useState } from 'react';
import { SafeAreaView, FlatList, View, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { GlobalStyles } from '@/constants/GlobalStyles';
import { Colors } from '@/constants/Colors';
import LogoHeader from '@/components/my components/logoHeader';
import mealsData, { MealItem } from '@/assets/data/mealsData';

// Components
import SearchBar from '@/components/my components/stats/nutrition/SearchBar';
import MealCard from '@/components/my components/stats/nutrition/MealCard';

export default function MealsScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');

  // Case-insensitive filter across several fields
  const filtered = useMemo<MealItem[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return mealsData;

    return mealsData.filter((m) => {
      const haystack = [
        m.title,
        m.subtitle,
        m.date,
        m.time,
        String(m.calories),
        `${m.protein}g`,
        `${m.carbs}g`,
        `${m.fat}g`,
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [query]);

  return (
    <SafeAreaView style={GlobalStyles.safeArea}>
      <LogoHeader showBackButton />

      <Text style={[GlobalStyles.header, styles.headerText]}>MEAL ACTIVITY</Text>

      <SearchBar
        placeholder="Search meals, macros, dates…"
        value={query}
        onChangeText={setQuery}
        onClear={() => setQuery('')}
      />

      {/* Optional helper text showing results count */}
      <View style={styles.resultMeta}>
        <Text style={styles.resultMetaText}>
          {filtered.length} result{filtered.length === 1 ? '' : 's'}
        </Text>
      </View>

      <FlatList<MealItem>
        data={filtered}
        keyExtractor={(it) => it.id}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={({ item }) => <MealCard item={item} />}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>No meals match “{query}”.</Text>
            <Text style={styles.emptySub}>Try a title, date, or a macro like “protein”.</Text>
          </View>
        }
        keyboardShouldPersistTaps="handled"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  headerText: { marginHorizontal: 16, marginBottom: 8 },
  listContent: { paddingHorizontal: 16, paddingBottom: 28 },
  resultMeta: { marginHorizontal: 16, marginBottom: 8 },
  resultMetaText: { color: Colors.dark.text, opacity: 0.6, fontSize: 12, letterSpacing: 0.3 },
  emptyWrap: { alignItems: 'center', paddingTop: 32 },
  emptyText: { color: Colors.dark.text, fontWeight: '700', fontSize: 16 },
  emptySub: { color: Colors.dark.text, opacity: 0.7, marginTop: 6 },
});
