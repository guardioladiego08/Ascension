import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';

import LogoHeader from '@/components/my components/logoHeader';
import { Colors } from '@/constants/Colors';
import { GlobalStyles } from '@/constants/GlobalStyles';
import {
  fetchNutritionDays,
  getAuthenticatedUserId,
  type NutritionDayItem,
} from '@/lib/progress/history';
import {
  formatHistoryDateLabel,
  parseIsoDateFilter,
  parsePositiveNumber,
} from '@/lib/progress/historyUi';
import HistoryFilterModal from '../components/HistoryFilterModal';
import HistoryListItem from '../components/HistoryListItem';

const BG = Colors.dark.background;
const TEXT = Colors.dark.text;
const MUTED = Colors.dark.textMuted ?? '#9AA4BF';

function FilterInput({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'decimal-pad',
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'decimal-pad' | 'number-pad';
}) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#6B7280"
        keyboardType={keyboardType}
        autoCapitalize="none"
        autoCorrect={false}
        style={styles.input}
      />
    </View>
  );
}

export default function AllNutritionDaysScreen() {
  const [days, setDays] = useState<NutritionDayItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [minCalories, setMinCalories] = useState('');
  const [maxCalories, setMaxCalories] = useState('');
  const [minProtein, setMinProtein] = useState('');
  const [maxProtein, setMaxProtein] = useState('');
  const [minCarbs, setMinCarbs] = useState('');
  const [maxCarbs, setMaxCarbs] = useState('');
  const [minFat, setMinFat] = useState('');
  const [maxFat, setMaxFat] = useState('');

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const load = async () => {
        try {
          setStartDate('');
          setEndDate('');
          setMinCalories('');
          setMaxCalories('');
          setMinProtein('');
          setMaxProtein('');
          setMinCarbs('');
          setMaxCarbs('');
          setMinFat('');
          setMaxFat('');
          setFilterModalVisible(false);
          setLoading(true);
          const userId = await getAuthenticatedUserId();
          if (!userId) {
            if (isActive) setDays([]);
            return;
          }

          const rows = await fetchNutritionDays(userId);
          if (isActive) setDays(rows);
        } catch (err) {
          console.warn('Error loading nutrition days', err);
          if (isActive) setDays([]);
        } finally {
          if (isActive) setLoading(false);
        }
      };

      load();

      return () => {
        isActive = false;
      };
    }, [])
  );

  const filteredDays = useMemo(() => {
    const startDateValue = parseIsoDateFilter(startDate);
    const endDateValue = parseIsoDateFilter(endDate);
    const minCaloriesValue = parsePositiveNumber(minCalories);
    const maxCaloriesValue = parsePositiveNumber(maxCalories);
    const minProteinValue = parsePositiveNumber(minProtein);
    const maxProteinValue = parsePositiveNumber(maxProtein);
    const minCarbsValue = parsePositiveNumber(minCarbs);
    const maxCarbsValue = parsePositiveNumber(maxCarbs);
    const minFatValue = parsePositiveNumber(minFat);
    const maxFatValue = parsePositiveNumber(maxFat);

    return days.filter((day) => {
      if (startDateValue != null && day.date < startDateValue) return false;
      if (endDateValue != null && day.date > endDateValue) return false;

      if (minCaloriesValue != null && day.kcalTotal < minCaloriesValue) return false;
      if (maxCaloriesValue != null && day.kcalTotal > maxCaloriesValue) return false;
      if (minProteinValue != null && day.proteinGTotal < minProteinValue) return false;
      if (maxProteinValue != null && day.proteinGTotal > maxProteinValue) return false;
      if (minCarbsValue != null && day.carbsGTotal < minCarbsValue) return false;
      if (maxCarbsValue != null && day.carbsGTotal > maxCarbsValue) return false;
      if (minFatValue != null && day.fatGTotal < minFatValue) return false;
      if (maxFatValue != null && day.fatGTotal > maxFatValue) return false;

      return true;
    });
  }, [
    days,
    startDate,
    endDate,
    minCalories,
    maxCalories,
    minProtein,
    maxProtein,
    minCarbs,
    maxCarbs,
    minFat,
    maxFat,
  ]);

  const activeFilterCount = useMemo(() => {
    return [
      startDate,
      endDate,
      minCalories,
      maxCalories,
      minProtein,
      maxProtein,
      minCarbs,
      maxCarbs,
      minFat,
      maxFat,
    ].filter((value) => value.trim().length > 0).length;
  }, [
    startDate,
    endDate,
    minCalories,
    maxCalories,
    minProtein,
    maxProtein,
    minCarbs,
    maxCarbs,
    minFat,
    maxFat,
  ]);

  const resetFilters = () => {
    setStartDate('');
    setEndDate('');
    setMinCalories('');
    setMaxCalories('');
    setMinProtein('');
    setMaxProtein('');
    setMinCarbs('');
    setMaxCarbs('');
    setMinFat('');
    setMaxFat('');
  };

  const listHeader = (
    <View style={styles.headerContent}>
      <View style={styles.headerRow}>
        <View style={styles.headerTextWrap}>
          <Text style={styles.title}>All Nutrition Days</Text>
          <Text style={styles.subtitle}>
            Select a row to open the daily nutrition summary.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.filterButton}
          activeOpacity={0.88}
          onPress={() => setFilterModalVisible(true)}
        >
          <Ionicons name="funnel-outline" size={16} color="#E5E7F5" />
          {activeFilterCount > 0 ? (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          ) : null}
        </TouchableOpacity>
      </View>
    </View>
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

        <FlatList
          data={filteredDays}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              {loading ? (
                <>
                  <ActivityIndicator />
                  <Text style={styles.emptyText}>Loading nutrition days...</Text>
                </>
              ) : (
                <Text style={styles.emptyText}>
                  No nutrition days match your current filters.
                </Text>
              )}
            </View>
          }
          renderItem={({ item }) => (
            <HistoryListItem
              title={formatHistoryDateLabel(`${item.date}T00:00:00`)}
              subtitle={`${Math.round(item.kcalTotal)} kcal`}
              meta={`P ${Math.round(item.proteinGTotal)}g · C ${Math.round(
                item.carbsGTotal
              )}g · F ${Math.round(item.fatGTotal)}g`}
              badgeText={item.goalHit ? 'Goal hit' : undefined}
              badgeTone="success"
              onPress={() =>
                router.push({
                  pathname: '/progress/nutrition/dailyNutritionSummary',
                  params: { date: item.date },
                })
              }
            />
          )}
        />

        <HistoryFilterModal
          visible={filterModalVisible}
          title="Filter Nutrition Days"
          onClose={() => setFilterModalVisible(false)}
          onReset={resetFilters}
        >
          <View style={styles.inputRow}>
            <FilterInput
              label="Start date"
              value={startDate}
              onChangeText={setStartDate}
              placeholder="YYYY-MM-DD"
              keyboardType="default"
            />
            <FilterInput
              label="End date"
              value={endDate}
              onChangeText={setEndDate}
              placeholder="YYYY-MM-DD"
              keyboardType="default"
            />
          </View>

          <View style={styles.inputRow}>
            <FilterInput
              label="Min calories"
              value={minCalories}
              onChangeText={setMinCalories}
              placeholder="0"
            />
            <FilterInput
              label="Max calories"
              value={maxCalories}
              onChangeText={setMaxCalories}
              placeholder="Any"
            />
          </View>

          <View style={styles.inputRow}>
            <FilterInput
              label="Min protein (g)"
              value={minProtein}
              onChangeText={setMinProtein}
              placeholder="0"
            />
            <FilterInput
              label="Max protein (g)"
              value={maxProtein}
              onChangeText={setMaxProtein}
              placeholder="Any"
            />
          </View>

          <View style={styles.inputRow}>
            <FilterInput
              label="Min carbs (g)"
              value={minCarbs}
              onChangeText={setMinCarbs}
              placeholder="0"
            />
            <FilterInput
              label="Max carbs (g)"
              value={maxCarbs}
              onChangeText={setMaxCarbs}
              placeholder="Any"
            />
          </View>

          <View style={styles.inputRow}>
            <FilterInput
              label="Min fat (g)"
              value={minFat}
              onChangeText={setMinFat}
              placeholder="0"
            />
            <FilterInput
              label="Max fat (g)"
              value={maxFat}
              onChangeText={setMaxFat}
              placeholder="Any"
            />
          </View>

          <Text style={styles.helperText}>
            Date inputs use `YYYY-MM-DD`. Macro filters use grams.
          </Text>
        </HistoryFilterModal>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  headerContent: {
    paddingTop: 6,
    paddingBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerTextWrap: {
    flex: 1,
    paddingRight: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: TEXT,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    color: MUTED,
  },
  filterButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.dark.card,
    borderWidth: 1,
    borderColor: '#1F2937',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadge: {
    position: 'absolute',
    right: -2,
    top: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4F46E5',
    paddingHorizontal: 4,
  },
  filterBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  listContent: {
    paddingBottom: 28,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    color: MUTED,
    textAlign: 'center',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    marginBottom: 6,
    fontSize: 11,
    color: '#9CA3AF',
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
    backgroundColor: '#111827',
    color: TEXT,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
  },
  helperText: {
    fontSize: 11,
    lineHeight: 16,
    color: '#94A3B8',
  },
});
