// app/(tabs)/stats/cardio/allCardioActivities.tsx
// Tensr Fitness — AllCardioActivities with optimistic delete, focus refresh, and Realtime fallback
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '@/lib/supabase';
import LogoHeader from '@/components/my components/logoHeader';
import ActivityCard from '@/components/my components/cardio/ActivityCard';
import IndoorActivityModal from '@/components/my components/cardio/IndoorActivityModal';
import OutdoorActivityModal from '@/components/my components/cardio/OutdoorActivityModal';
import { GlobalStyles } from '@/constants/GlobalStyles';
import { Colors } from '@/constants/Colors';

const WHITE = '#FFFFFF';
const ORANGE = Colors.dark.highlight1;
const CARD = '#5a5a5a';

export default function AllCardioActivities() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any | null>(null);
  const [showFilter, setShowFilter] = useState(false);

  // --- Filter inputs ---
  const [minDistance, setMinDistance] = useState('');
  const [maxDistance, setMaxDistance] = useState('');
  const [minTime, setMinTime] = useState('');
  const [maxTime, setMaxTime] = useState('');
  const [minPace, setMinPace] = useState('');
  const [maxPace, setMaxPace] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const fetchSessions = useCallback(async (filters?: {
    minDistance?: number;
    maxDistance?: number;
    minTime?: number;
    maxTime?: number;
    minPace?: number;
    maxPace?: number;
    startDate?: string;
    endDate?: string;
  }) => {
    if (!isMounted.current) return;
    setLoading(true);

    try {
      let query = supabase
        .from('cardio_sessions')
        .select('*')
        .order('started_at', { ascending: false });

      if (filters?.minDistance != null) query = query.gte('total_distance', filters.minDistance);
      if (filters?.maxDistance != null) query = query.lte('total_distance', filters.maxDistance);
      if (filters?.minTime != null) query = query.gte('total_time', `${filters.minTime} minutes`);
      if (filters?.maxTime != null) query = query.lte('total_time', `${filters.maxTime} minutes`);
      if (filters?.minPace != null) query = query.gte('avg_pace', filters.minPace);
      if (filters?.maxPace != null) query = query.lte('avg_pace', filters.maxPace);
      if (filters?.startDate) query = query.gte('started_at', filters.startDate);
      if (filters?.endDate) query = query.lte('started_at', filters.endDate);

      const { data, error } = await query;
      if (error) {
        console.error('Error fetching sessions:', error);
      } else if (isMounted.current) {
        setSessions(data || []);
      }
    } catch (err) {
      console.error('Unexpected error fetching sessions:', err);
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // 🔁 Auto-refresh on screen focus (covers back button navigation)
  useFocusEffect(
    useCallback(() => {
      fetchSessions();
    }, [fetchSessions])
  );

  // 🔁 Realtime fallback: refresh when any row in cardio_sessions changes
  useEffect(() => {
    // Ensure Realtime is enabled for the table in Supabase
    const channel = supabase
      .channel('cardio_sessions_live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cardio_sessions' },
        () => fetchSessions()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchSessions]);

  const applyFilters = () => {
    const filters = {
      minDistance: minDistance ? Number(minDistance) : undefined,
      maxDistance: maxDistance ? Number(maxDistance) : undefined,
      minTime: minTime ? Number(minTime) : undefined,
      maxTime: maxTime ? Number(maxTime) : undefined,
      minPace: minPace ? Number(minPace) : undefined,
      maxPace: maxPace ? Number(maxPace) : undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    };
    fetchSessions(filters);
    setShowFilter(false);
  };

  // 🔥 Optimistic removal: instant UI update when modal reports deletion
  const handleDeleted = (id: string) => {
    setSessions(prev => prev.filter(s => s.id !== id));
    setSelected(null);
    // Safety re-fetch to stay in sync with backend
    fetchSessions();
  };

  return (
    <SafeAreaView style={GlobalStyles.safeArea}>
      <LogoHeader showBackButton />
      <View style={styles.header}>
        <Text style={GlobalStyles.header}>All Cardio Sessions</Text>
        <TouchableOpacity onPress={() => setShowFilter(true)}>
          <Text style={styles.filterText}>Filter</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={ORANGE} style={{ marginTop: 20 }} />
      ) : sessions.length > 0 ? (
        <FlatList
          data={sessions}
          keyExtractor={(it) => it.id}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          renderItem={({ item }) => (
            <ActivityCard
              session={item}
              onPress={() => setSelected(item)}
              style={{ backgroundColor: CARD }}
            />
          )}
        />
      ) : (
        <Text style={styles.noDataText}>No cardio sessions found.</Text>
      )}

      {/* --- Filter Modal --- */}
      <Modal visible={showFilter} animationType="slide" transparent>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <Text style={styles.title}>Filter Cardio Sessions</Text>

            {/* Distance */}
            <Text style={styles.label}>Distance (mi)</Text>
            <View style={styles.row}>
              <TextInput
                placeholder="Min"
                keyboardType="numeric"
                value={minDistance}
                onChangeText={setMinDistance}
                style={styles.input}
                placeholderTextColor="#aaa"
              />
              <TextInput
                placeholder="Max"
                keyboardType="numeric"
                value={maxDistance}
                onChangeText={setMaxDistance}
                style={styles.input}
                placeholderTextColor="#aaa"
              />
            </View>

            {/* Time */}
            <Text style={styles.label}>Total Time (minutes)</Text>
            <View style={styles.row}>
              <TextInput
                placeholder="Min"
                keyboardType="numeric"
                value={minTime}
                onChangeText={setMinTime}
                style={styles.input}
                placeholderTextColor="#aaa"
              />
              <TextInput
                placeholder="Max"
                keyboardType="numeric"
                value={maxTime}
                onChangeText={setMaxTime}
                style={styles.input}
                placeholderTextColor="#aaa"
              />
            </View>

            {/* Pace */}
            <Text style={styles.label}>Average Pace (min/mi)</Text>
            <View style={styles.row}>
              <TextInput
                placeholder="Min"
                keyboardType="numeric"
                value={minPace}
                onChangeText={setMinPace}
                style={styles.input}
                placeholderTextColor="#aaa"
              />
              <TextInput
                placeholder="Max"
                keyboardType="numeric"
                value={maxPace}
                onChangeText={setMaxPace}
                style={styles.input}
                placeholderTextColor="#aaa"
              />
            </View>

            {/* Date Range */}
            <Text style={styles.label}>Date Range</Text>
            <View style={styles.row}>
              <TextInput
                placeholder="Start Date (YYYY-MM-DD)"
                value={startDate}
                onChangeText={setStartDate}
                style={styles.input}
                placeholderTextColor="#aaa"
              />
              <TextInput
                placeholder="End Date (YYYY-MM-DD)"
                value={endDate}
                onChangeText={setEndDate}
                style={styles.input}
                placeholderTextColor="#aaa"
              />
            </View>

            <TouchableOpacity style={styles.applyBtn} onPress={applyFilters}>
              <Text style={styles.applyText}>Apply Filters</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.applyBtn, { backgroundColor: '#555' }]}
              onPress={() => setShowFilter(false)}
            >
              <Text style={styles.applyText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* --- Session Details Modals --- */}
      <Modal visible={!!selected && selected?.type === 'indoor'} animationType="slide" transparent>
        <IndoorActivityModal
          session={selected!}
          onClose={() => setSelected(null)}
          onDeleted={handleDeleted}
        />
      </Modal>

      <Modal visible={!!selected && selected?.type === 'outdoor'} animationType="slide" transparent>
        <OutdoorActivityModal
          session={selected!}
          onClose={() => setSelected(null)}
          // If you add delete to OutdoorActivityModal, pass: onDeleted={handleDeleted}
        />
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  filterText: { color: WHITE, fontWeight: '700' },
  noDataText: {
    color: WHITE,
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
    fontWeight: '600',
    opacity: 0.8,
  },
  backdrop: { flex: 1, backgroundColor: '#0009', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#2f2f2f',
    padding: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  title: { color: WHITE, fontSize: 18, fontWeight: '800', marginBottom: 8 },
  label: { color: WHITE, fontWeight: '600', marginTop: 12, marginBottom: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  input: {
    backgroundColor: '#444',
    borderRadius: 8,
    padding: 10,
    color: WHITE,
    flex: 1,
  },
  applyBtn: {
    backgroundColor: ORANGE,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 16,
  },
  applyText: { color: WHITE, textAlign: 'center', fontWeight: '800' },
});
