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
import { useUnits } from '@/contexts/UnitsContext';
import { supabase } from '@/lib/supabase';
import { useAppTheme } from '@/providers/AppThemeProvider';
import {
  getAuthenticatedUserId,
  type StrengthWorkoutRow,
} from '@/lib/progress/history';
import {
  formatDurationLabel,
  formatHistoryDateLabel,
  formatWeightLabel,
  parseDateEnd,
  parseDateStart,
  parsePositiveNumber,
  weightInputToKg,
} from '@/lib/progress/historyUi';
import HistoryFilterModal from '../components/HistoryFilterModal';
import HistoryListItem from '../components/HistoryListItem';

const DEBUG_QUERY_LIMIT = 5000;

function FilterInput({
  label,
  value,
  onChangeText,
  placeholder,
  styles,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  styles: ReturnType<typeof createStyles>;
}) {
  const { colors } = useAppTheme();

  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textOffSt}
        keyboardType="decimal-pad"
        autoCapitalize="none"
        autoCorrect={false}
        style={styles.input}
      />
    </View>
  );
}

function DateInput({
  label,
  value,
  onChangeText,
  styles,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  styles: ReturnType<typeof createStyles>;
}) {
  const { colors } = useAppTheme();

  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder="YYYY-MM-DD"
        placeholderTextColor={colors.textOffSt}
        autoCapitalize="none"
        autoCorrect={false}
        style={styles.input}
      />
    </View>
  );
}

export default function AllStrengthWorkoutsScreen() {
  const { colors, fonts, globalStyles } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);
  const { weightUnit } = useUnits();

  const [workouts, setWorkouts] = useState<StrengthWorkoutRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [minDuration, setMinDuration] = useState('');
  const [maxDuration, setMaxDuration] = useState('');
  const [minVolume, setMinVolume] = useState('');
  const [maxVolume, setMaxVolume] = useState('');

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const load = async () => {
        try {
          setStartDate('');
          setEndDate('');
          setMinDuration('');
          setMaxDuration('');
          setMinVolume('');
          setMaxVolume('');
          setFilterModalVisible(false);
          setLoading(true);
          const userId = await getAuthenticatedUserId();
          if (!userId) {
            if (isActive) {
              setWorkouts([]);
            }
            return;
          }

          const [rpcRes, directRes] = await Promise.all([
            supabase.rpc('list_strength_workouts_user', {
              p_limit: DEBUG_QUERY_LIMIT,
            }),
            supabase
              .schema('strength')
              .from('strength_workouts')
              .select('id, started_at, ended_at, total_vol, notes, privacy, name')
              .eq('user_id', userId)
              .order('started_at', { ascending: false })
              .limit(DEBUG_QUERY_LIMIT),
          ]);

          const rpcRows = ((rpcRes.data ?? []) as StrengthWorkoutRow[]).filter((row) => !!row?.id);
          const directRows = ((directRes.data ?? []) as StrengthWorkoutRow[]).filter((row) => !!row?.id);

          const mergedMap = new Map<string, StrengthWorkoutRow>();
          for (const row of [...rpcRows, ...directRows]) {
            if (!mergedMap.has(row.id)) mergedMap.set(row.id, row);
          }

          const mergedRows = [...mergedMap.values()].sort(
            (a, b) =>
              new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
          );

          if (isActive) {
            setWorkouts(mergedRows);
          }
        } catch (err) {
          console.warn('Error loading strength workouts', err);
          if (isActive) {
            setWorkouts([]);
          }
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

  const filteredWorkouts = useMemo(() => {
    const startTs = parseDateStart(startDate);
    const endTs = parseDateEnd(endDate);
    const minDurationValue = parsePositiveNumber(minDuration);
    const maxDurationValue = parsePositiveNumber(maxDuration);
    const minVolumeValue = parsePositiveNumber(minVolume);
    const maxVolumeValue = parsePositiveNumber(maxVolume);

    return workouts.filter((workout) => {
      const startedTs = new Date(workout.started_at).getTime();
      if (startTs != null && startedTs < startTs) return false;
      if (endTs != null && startedTs > endTs) return false;

      const durationS = workout.ended_at
        ? Math.max(
            0,
            Math.round(
              (new Date(workout.ended_at).getTime() -
                new Date(workout.started_at).getTime()) /
                1000
            )
          )
        : 0;

      if (minDurationValue != null && durationS < minDurationValue * 60) return false;
      if (maxDurationValue != null && durationS > maxDurationValue * 60) return false;

      const totalVolume = Number(workout.total_vol ?? 0);
      if (
        minVolumeValue != null &&
        totalVolume < weightInputToKg(minVolumeValue, weightUnit)
      ) {
        return false;
      }
      if (
        maxVolumeValue != null &&
        totalVolume > weightInputToKg(maxVolumeValue, weightUnit)
      ) {
        return false;
      }

      return true;
    });
  }, [
    workouts,
    startDate,
    endDate,
    minDuration,
    maxDuration,
    minVolume,
    maxVolume,
    weightUnit,
  ]);

  const activeFilterCount = useMemo(() => {
    return [
      startDate,
      endDate,
      minDuration,
      maxDuration,
      minVolume,
      maxVolume,
    ].filter((value) => value.trim().length > 0).length;
  }, [startDate, endDate, minDuration, maxDuration, minVolume, maxVolume]);

  const resetFilters = () => {
    setStartDate('');
    setEndDate('');
    setMinDuration('');
    setMaxDuration('');
    setMinVolume('');
    setMaxVolume('');
  };

  const listHeader = (
    <View style={styles.headerContent}>
        <View style={styles.headerRow}>
          <View style={styles.headerTextWrap}>
            <Text style={styles.title}>All Strength Workouts</Text>
            <Text style={styles.subtitle}>
              Select a row to open the workout summary.
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
  );

  return (
    <View style={globalStyles.page}>
      <View style={globalStyles.safeArea}>
        <LogoHeader showBackButton />

        <FlatList
          data={filteredWorkouts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              {loading ? (
                <>
                  <ActivityIndicator />
                  <Text style={styles.emptyText}>Loading strength workouts...</Text>
                </>
              ) : (
                <Text style={styles.emptyText}>
                  No strength workouts match your current filters.
                </Text>
              )}
            </View>
          }
          renderItem={({ item }) => {
            const durationS = item.ended_at
              ? Math.max(
                  0,
                  Math.round(
                    (new Date(item.ended_at).getTime() -
                      new Date(item.started_at).getTime()) /
                      1000
                  )
                )
              : 0;

            return (
              <HistoryListItem
                title={formatHistoryDateLabel(item.started_at)}
                subtitle="Strength workout"
                meta={`${formatDurationLabel(durationS)} · ${formatWeightLabel(
                  item.total_vol ?? 0,
                  weightUnit
                )} total volume`}
                onPress={() => router.push(`/add/Strength/${item.id}`)}
              />
            );
          }}
        />

        <HistoryFilterModal
          visible={filterModalVisible}
          title="Filter Strength Workouts"
          onClose={() => setFilterModalVisible(false)}
          onReset={resetFilters}
        >
          <View style={styles.inputRow}>
            <DateInput
              label="Start date"
              value={startDate}
              onChangeText={setStartDate}
              styles={styles}
            />
            <DateInput
              label="End date"
              value={endDate}
              onChangeText={setEndDate}
              styles={styles}
            />
          </View>

          <View style={styles.inputRow}>
            <FilterInput
              label="Min time (min)"
              value={minDuration}
              onChangeText={setMinDuration}
              placeholder="0"
              styles={styles}
            />
            <FilterInput
              label="Max time (min)"
              value={maxDuration}
              onChangeText={setMaxDuration}
              placeholder="Any"
              styles={styles}
            />
          </View>

          <View style={styles.inputRow}>
            <FilterInput
              label={`Min volume (${weightUnit})`}
              value={minVolume}
              onChangeText={setMinVolume}
              placeholder="0"
              styles={styles}
            />
            <FilterInput
              label={`Max volume (${weightUnit})`}
              value={maxVolume}
              onChangeText={setMaxVolume}
              placeholder="Any"
              styles={styles}
            />
          </View>

          <Text style={styles.helperText}>
            Date inputs use `YYYY-MM-DD`. Volume filters follow your current weight unit.
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
      lineHeight: 28,
      color: colors.text,
      fontFamily: fonts.heading,
    },
    subtitle: {
      marginTop: 6,
      fontSize: 13,
      lineHeight: 18,
      color: colors.textMuted,
      fontFamily: fonts.body,
    },
    filterButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: colors.card2,
      borderWidth: 1,
      borderColor: colors.border,
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
      color: colors.blkText,
      fontFamily: fonts.heading,
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
      color: colors.textMuted,
      textAlign: 'center',
      fontFamily: fonts.body,
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
      color: colors.textOffSt,
      fontFamily: fonts.label,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    input: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card2,
      color: colors.text,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 13,
      lineHeight: 17,
      fontFamily: fonts.body,
    },
    helperText: {
      fontSize: 11,
      lineHeight: 16,
      color: colors.textMuted,
      fontFamily: fonts.body,
    },
  });
}
