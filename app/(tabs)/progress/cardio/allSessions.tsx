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
import {
  fetchCardioSessions,
  formatCardioActivityTypeLabel,
  getAuthenticatedUserId,
  type CardioSessionItem,
} from '@/lib/progress/history';
import {
  distanceInputToMeters,
  formatDistanceLabel,
  formatDurationLabel,
  formatHistoryDateLabel,
  parseDateEnd,
  parseDateStart,
  parsePositiveNumber,
} from '@/lib/progress/historyUi';
import HistoryFilterModal from '../components/HistoryFilterModal';
import HistoryListItem from '../components/HistoryListItem';

type ActivityFilter = 'all' | 'run' | 'walk';
type SourceFilter = 'all' | 'indoor' | 'outdoor';

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

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      style={[styles.filterChip, active && styles.filterChipActive]}
      onPress={onPress}
    >
      <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function AllCardioSessionsScreen() {
  const { distanceUnit } = useUnits();

  const [sessions, setSessions] = useState<CardioSessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>('all');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [minDistance, setMinDistance] = useState('');
  const [maxDistance, setMaxDistance] = useState('');
  const [minDuration, setMinDuration] = useState('');
  const [maxDuration, setMaxDuration] = useState('');

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const load = async () => {
        try {
          setActivityFilter('all');
          setSourceFilter('all');
          setStartDate('');
          setEndDate('');
          setMinDistance('');
          setMaxDistance('');
          setMinDuration('');
          setMaxDuration('');
          setFilterModalVisible(false);
          setLoading(true);
          const userId = await getAuthenticatedUserId();
          if (!userId) {
            if (isActive) setSessions([]);
            return;
          }

          const rows = await fetchCardioSessions(userId);
          if (isActive) setSessions(rows);
        } catch (err) {
          console.warn('Error loading cardio sessions', err);
          if (isActive) setSessions([]);
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

  const filteredSessions = useMemo(() => {
    const startTs = parseDateStart(startDate);
    const endTs = parseDateEnd(endDate);
    const minDistanceValue = parsePositiveNumber(minDistance);
    const maxDistanceValue = parsePositiveNumber(maxDistance);
    const minDurationValue = parsePositiveNumber(minDuration);
    const maxDurationValue = parsePositiveNumber(maxDuration);

    return sessions.filter((session) => {
      const activityValue = session.activityType.toLowerCase();
      if (activityFilter === 'run' && !activityValue.includes('run')) return false;
      if (activityFilter === 'walk' && !activityValue.includes('walk')) return false;

      if (sourceFilter !== 'all' && session.source !== sourceFilter) return false;

      const sessionTs = new Date(session.endedAt ?? session.startedAt ?? 0).getTime();
      if (startTs != null && sessionTs < startTs) return false;
      if (endTs != null && sessionTs > endTs) return false;

      const distanceM = Number(session.distanceM ?? 0);
      if (
        minDistanceValue != null &&
        distanceM < distanceInputToMeters(minDistanceValue, distanceUnit)
      ) {
        return false;
      }
      if (
        maxDistanceValue != null &&
        distanceM > distanceInputToMeters(maxDistanceValue, distanceUnit)
      ) {
        return false;
      }

      const durationS = Number(session.durationS ?? 0);
      if (minDurationValue != null && durationS < minDurationValue * 60) return false;
      if (maxDurationValue != null && durationS > maxDurationValue * 60) return false;

      return true;
    });
  }, [
    activityFilter,
    sourceFilter,
    startDate,
    endDate,
    minDistance,
    maxDistance,
    minDuration,
    maxDuration,
    distanceUnit,
    sessions,
  ]);

  const activeFilterCount = useMemo(() => {
    return [
      activityFilter !== 'all' ? activityFilter : '',
      sourceFilter !== 'all' ? sourceFilter : '',
      startDate,
      endDate,
      minDistance,
      maxDistance,
      minDuration,
      maxDuration,
    ].filter((value) => value.trim().length > 0).length;
  }, [
    activityFilter,
    sourceFilter,
    startDate,
    endDate,
    minDistance,
    maxDistance,
    minDuration,
    maxDuration,
  ]);

  const resetFilters = () => {
    setActivityFilter('all');
    setSourceFilter('all');
    setStartDate('');
    setEndDate('');
    setMinDistance('');
    setMaxDistance('');
    setMinDuration('');
    setMaxDuration('');
  };

  const listHeader = (
    <View style={styles.headerContent}>
      <View style={styles.headerRow}>
        <View style={styles.headerTextWrap}>
          <Text style={styles.title}>All Cardio Sessions</Text>
          <Text style={styles.subtitle}>
            Select a row to open the session summary.
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
          data={filteredSessions}
          keyExtractor={(item) => `${item.source}:${item.id}`}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              {loading ? (
                <>
                  <ActivityIndicator />
                  <Text style={styles.emptyText}>Loading cardio sessions...</Text>
                </>
              ) : (
                <Text style={styles.emptyText}>
                  No cardio sessions match your current filters.
                </Text>
              )}
            </View>
          }
          renderItem={({ item }) => (
            <HistoryListItem
              title={formatHistoryDateLabel(item.endedAt ?? item.startedAt)}
              subtitle={formatCardioActivityTypeLabel(item.activityType, item.source)}
              meta={`${formatDurationLabel(item.durationS)} · ${formatDistanceLabel(
                item.distanceM,
                distanceUnit
              )}`}
              badgeText={item.source === 'indoor' ? 'Indoor' : 'Outdoor'}
              badgeTone="accent"
              onPress={() => {
                if (item.source === 'indoor') {
                  router.push({
                    pathname: '/progress/run_walk/[sessionId]',
                    params: { sessionId: item.id },
                  });
                  return;
                }

                router.push({
                  pathname: '/progress/outdoor/[id]',
                  params: { id: item.id },
                });
              }}
            />
          )}
        />

        <HistoryFilterModal
          visible={filterModalVisible}
          title="Filter Cardio Sessions"
          onClose={() => setFilterModalVisible(false)}
          onReset={resetFilters}
        >
          <View style={styles.filterSection}>
            <Text style={styles.sectionLabel}>Activity</Text>
            <View style={styles.filterRow}>
              <FilterChip
                label="All"
                active={activityFilter === 'all'}
                onPress={() => setActivityFilter('all')}
              />
              <FilterChip
                label="Run"
                active={activityFilter === 'run'}
                onPress={() => setActivityFilter('run')}
              />
              <FilterChip
                label="Walk"
                active={activityFilter === 'walk'}
                onPress={() => setActivityFilter('walk')}
              />
            </View>
          </View>

          <View style={styles.filterSection}>
            <Text style={styles.sectionLabel}>Source</Text>
            <View style={styles.filterRow}>
              <FilterChip
                label="All"
                active={sourceFilter === 'all'}
                onPress={() => setSourceFilter('all')}
              />
              <FilterChip
                label="Indoor"
                active={sourceFilter === 'indoor'}
                onPress={() => setSourceFilter('indoor')}
              />
              <FilterChip
                label="Outdoor"
                active={sourceFilter === 'outdoor'}
                onPress={() => setSourceFilter('outdoor')}
              />
            </View>
          </View>

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
              label={`Min distance (${distanceUnit})`}
              value={minDistance}
              onChangeText={setMinDistance}
              placeholder="0"
            />
            <FilterInput
              label={`Max distance (${distanceUnit})`}
              value={maxDistance}
              onChangeText={setMaxDistance}
              placeholder="Any"
            />
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

          <Text style={styles.helperText}>
            Date inputs use `YYYY-MM-DD`. Distance filters follow your current unit.
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
  filterSection: {
    gap: 8,
  },
  sectionLabel: {
    fontSize: 12,
    letterSpacing: 0.8,
    color: '#CBD5E1',
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#111827',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterChipActive: {
    backgroundColor: '#312E81',
    borderColor: '#6366F1',
  },
  filterChipText: {
    fontSize: 12,
    color: '#CBD5E1',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
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
