// app/(tabs)/stats/meals.tsx
// NEW SCREEN: "Meals" — list of meal activity with a search bar (non-functional for now)
import React from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';
import LogoHeader from '@/components/my components/logoHeader';
import mealsData, { MealItem } from '@/assets/data/mealsData';

const BG_CARD = '#4A4A4A';
const TEXT = '#FFFFFF';
const ACCENT = '#FF950A';
const PILL = '#D9D9D9';
const CARBS = '#F3C969';
const PROTEIN = '#E0B64F';
const FAT = '#B5892E';

const MacroPill = ({ label }: { label: string }) => (
  <View style={styles.macroPill}>
    <Text style={styles.macroPillText}>{label}</Text>
  </View>
);

const MacroBar = ({ protein, carbs, fat }: { protein: number; carbs: number; fat: number }) => {
  // Convert grams to calories to get realistic ratio bars.
  const pCal = protein * 4;
  const cCal = carbs * 4;
  const fCal = fat * 9;
  const total = Math.max(pCal + cCal + fCal, 1);

  const pPct = (pCal / total) * 100;
  const cPct = (cCal / total) * 100;
  const fPct = (fCal / total) * 100;

  return (
    <View style={styles.macroRow}>
      <View style={styles.macroCol}>
        <Text style={styles.macroLabel}>P</Text>
        <View style={styles.barTrack}>
          <View style={[styles.barFill, { width: `${pPct}%`, backgroundColor: PROTEIN }]} />
        </View>
        <MacroPill label={`${protein}g`} />
      </View>

      <View style={styles.macroCol}>
        <Text style={styles.macroLabel}>C</Text>
        <View style={styles.barTrack}>
          <View style={[styles.barFill, { width: `${cPct}%`, backgroundColor: CARBS }]} />
        </View>
        <MacroPill label={`${carbs}g`} />
      </View>

      <View style={styles.macroCol}>
        <Text style={styles.macroLabel}>F</Text>
        <View style={styles.barTrack}>
          <View style={[styles.barFill, { width: `${fPct}%`, backgroundColor: FAT }]} />
        </View>
        <MacroPill label={`${fat}g`} />
      </View>
    </View>
  );
};

const MealCard = ({ item }: { item: MealItem }) => (
  <View style={styles.card}>
    <View style={{ flex: 1 }}>
      <Text style={styles.mealTitle}>{item.title.toUpperCase()}</Text>
      <Text style={styles.mealSubtitle}>{item.subtitle}</Text>

      <MacroBar protein={item.protein} carbs={item.carbs} fat={item.fat} />
    </View>

    <View style={styles.rightCol}>
      <Text style={styles.dateTxt}>{item.date}</Text>
      <Text style={styles.dateTxt}>{item.time}</Text>

      <View style={{ marginTop: 8, alignItems: 'center' }}>
        <Text style={styles.calLabel}>CAL</Text>
        <Text style={styles.calories}>{item.calories}</Text>
      </View>
    </View>
  </View>
);

export default function MealsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      <LogoHeader />

      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backTxt}>{'‹'}</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>MEAL ACTIVITY</Text>
      </View>

      {/* Search (UI only, no functionality yet) */}
      <View style={styles.searchBox}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          placeholder="Search"
          placeholderTextColor="#9B9B9B"
          style={styles.searchInput}
        />
      </View>

      <FlatList
        data={mealsData}
        keyExtractor={(it) => it.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 28 }}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={({ item }) => <MealCard item={item} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.dark.background },
  headerRow: {
    paddingHorizontal: 16,
    paddingTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 10,
  },
  backTxt: { color: TEXT, fontSize: 26, fontWeight: '800' },
  screenTitle: { color: TEXT, fontSize: 20, fontWeight: '800', letterSpacing: 1 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EDEDED',
    marginHorizontal: 16,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 16,
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, color: '#111' },

  card: {
    flexDirection: 'row',
    backgroundColor: BG_CARD,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  mealTitle: {
    color: TEXT,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  mealSubtitle: {
    color: TEXT,
    opacity: 0.9,
    marginTop: 4,
    marginBottom: 10,
    fontSize: 12,
    letterSpacing: 0.3,
  },

  rightCol: { marginLeft: 16, alignItems: 'flex-end', justifyContent: 'space-between' },
  dateTxt: { color: TEXT, fontSize: 12, fontWeight: '700' },
  calLabel: { color: TEXT, fontSize: 12, fontWeight: '700', opacity: 0.9 },
  calories: { color: ACCENT, fontSize: 18, fontWeight: '900' },

  macroRow: { flexDirection: 'row', gap: 12 },
  macroCol: { width: 88, alignItems: 'center' },
  macroLabel: { color: TEXT, fontSize: 12, fontWeight: '700', marginBottom: 6 },
  barTrack: {
    width: '100%',
    height: 12,
    borderRadius: 10,
    backgroundColor: '#808080',
    overflow: 'hidden',
  },
  barFill: { height: '100%' },
  macroPill: {
    backgroundColor: PILL,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 6,
  },
  macroPillText: { fontSize: 11, fontWeight: '700', color: '#111' },
});
