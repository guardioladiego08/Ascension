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
import { useUnits } from '@/contexts/UnitsContext';
import { supabase } from '@/lib/supabase';
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

const BG = Colors.dark.background;
const TEXT = Colors.dark.text;
const MUTED = Colors.dark.textMuted ?? '#9AA4BF';
const DEBUG_QUERY_LIMIT = 5000;

function FilterInput({
  label,
  value,
  onChangeText,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
}) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#6B7280"
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
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
}) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder="YYYY-MM-DD"
        placeholderTextColor="#6B7280"
        autoCapitalize="none"
        autoCorrect={false}
        style={styles.input}
      />
    </View>
  );
}

export default function AllStrengthWorkoutsScreen() {
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
        <LogoHeader showBackButton usePreviousRoute />

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
            <DateInput label="Start date" value={startDate} onChangeText={setStartDate} />
            <DateInput label="End date" value={endDate} onChangeText={setEndDate} />
          </View>

          <View style={styles.inputRow}>
            <FilterInput
              label="Min time (min)"
              value={minDuration}
              onChangeText={setMinDuration}
              placeholder="0"
            />
            <FilterInput
              label="Max time (min)"
              value={maxDuration}
              onChangeText={setMaxDuration}
              placeholder="Any"
            />
          </View>

          <View style={styles.inputRow}>
            <FilterInput
              label={`Min volume (${weightUnit})`}
              value={minVolume}
              onChangeText={setMinVolume}
              placeholder="0"
            />
            <FilterInput
              label={`Max volume (${weightUnit})`}
              value={maxVolume}
              onChangeText={setMaxVolume}
              placeholder="Any"
            />
          </View>

          <Text style={styles.helperText}>
            Date inputs use `YYYY-MM-DD`. Volume filters follow your current weight unit.
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
