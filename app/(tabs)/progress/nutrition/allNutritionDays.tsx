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
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';

import LogoHeader from '@/components/my components/logoHeader';
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
import { useAppTheme } from '@/providers/AppThemeProvider';
import { HOME_TONES } from '../../home/tokens';

function FilterInput({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'decimal-pad',
  styles,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'decimal-pad' | 'number-pad';
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={HOME_TONES.textTertiary}
        keyboardType={keyboardType}
        autoCapitalize="none"
        autoCorrect={false}
        style={styles.input}
      />
    </View>
  );
}

export default function AllNutritionDaysScreen() {
  const { colors, fonts, globalStyles } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);

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
    <View style={styles.listHeader}>
      <View style={styles.hero}>
        <View style={styles.heroRow}>
          <View style={styles.heroCopy}>
            <Text style={styles.eyebrow}>Nutrition History</Text>
            <Text style={styles.header}>All nutrition days</Text>
            <Text style={styles.heroText}>
              Review logged calorie and macro totals, then drill into any day for the
              full nutrition summary.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.filterButton}
            activeOpacity={0.88}
            onPress={() => setFilterModalVisible(true)}
          >
            <Ionicons name="funnel-outline" size={16} color={colors.text} />
            {activeFilterCount > 0 ? (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.page}>
      <View style={globalStyles.safeArea}>
        <LogoHeader showBackButton />

        <FlatList
          data={filteredDays}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={
            <View style={[styles.panelSoft, styles.emptyState]}>
              {loading ? (
                <>
                  <ActivityIndicator color={colors.highlight1} />
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
              styles={styles}
            />
            <FilterInput
              label="End date"
              value={endDate}
              onChangeText={setEndDate}
              placeholder="YYYY-MM-DD"
              keyboardType="default"
              styles={styles}
            />
          </View>

          <View style={styles.inputRow}>
            <FilterInput
              label="Min calories"
              value={minCalories}
              onChangeText={setMinCalories}
              placeholder="0"
              styles={styles}
            />
            <FilterInput
              label="Max calories"
              value={maxCalories}
              onChangeText={setMaxCalories}
              placeholder="Any"
              styles={styles}
            />
          </View>

          <View style={styles.inputRow}>
            <FilterInput
              label="Min protein (g)"
              value={minProtein}
              onChangeText={setMinProtein}
              placeholder="0"
              styles={styles}
            />
            <FilterInput
              label="Max protein (g)"
              value={maxProtein}
              onChangeText={setMaxProtein}
              placeholder="Any"
              styles={styles}
            />
          </View>

          <View style={styles.inputRow}>
            <FilterInput
              label="Min carbs (g)"
              value={minCarbs}
              onChangeText={setMinCarbs}
              placeholder="0"
              styles={styles}
            />
            <FilterInput
              label="Max carbs (g)"
              value={maxCarbs}
              onChangeText={setMaxCarbs}
              placeholder="Any"
              styles={styles}
            />
          </View>

          <View style={styles.inputRow}>
            <FilterInput
              label="Min fat (g)"
              value={minFat}
              onChangeText={setMinFat}
              placeholder="0"
              styles={styles}
            />
            <FilterInput
              label="Max fat (g)"
              value={maxFat}
              onChangeText={setMaxFat}
              placeholder="Any"
              styles={styles}
            />
          </View>

          <Text style={styles.helperText}>
            Date inputs use `YYYY-MM-DD`. Macro filters use grams.
          </Text>
        </HistoryFilterModal>
      </View>
    </View>
  );
}

function createStyles(
  colors: ReturnType<typeof useAppTheme>['colors'],
  fonts: ReturnType<typeof useAppTheme>['fonts']
) {
  return StyleSheet.create({
    page: {
      flex: 1,
      backgroundColor: HOME_TONES.background,
    },
    panelSoft: {
      backgroundColor: HOME_TONES.surface2,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      padding: 18,
    },
    eyebrow: {
      color: HOME_TONES.textTertiary,
      fontFamily: fonts.label,
      fontSize: 11,
      lineHeight: 14,
      letterSpacing: 0.9,
      textTransform: 'uppercase',
    },
    header: {
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.display,
      fontSize: 32,
      lineHeight: 36,
      letterSpacing: -0.8,
    },
    listHeader: {
      paddingTop: 8,
      paddingBottom: 14,
    },
    hero: {
      borderRadius: 28,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      backgroundColor: HOME_TONES.surface1,
      padding: 22,
    },
    heroRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
    },
    heroCopy: {
      flex: 1,
      gap: 8,
    },
    heroText: {
      color: HOME_TONES.textSecondary,
      fontFamily: fonts.body,
      fontSize: 14,
      lineHeight: 20,
    },
    filterButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: HOME_TONES.surface2,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
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
      backgroundColor: colors.highlight1,
      paddingHorizontal: 4,
    },
    filterBadgeText: {
      fontSize: 10,
      lineHeight: 12,
      fontFamily: fonts.label,
      color: colors.blkText,
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
      lineHeight: 18,
      color: HOME_TONES.textSecondary,
      fontFamily: fonts.body,
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
      lineHeight: 14,
      color: HOME_TONES.textTertiary,
      fontFamily: fonts.label,
    },
    input: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      backgroundColor: HOME_TONES.surface2,
      color: HOME_TONES.textPrimary,
      paddingHorizontal: 12,
      paddingVertical: 11,
      fontSize: 13,
      fontFamily: fonts.body,
    },
    helperText: {
      fontSize: 11,
      lineHeight: 16,
      color: HOME_TONES.textTertiary,
      fontFamily: fonts.body,
    },
  });
}
