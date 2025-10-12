// app/(tabs)/stats/cardio/allCardioActivities.tsx
import React, { useEffect, useState } from 'react';
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
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');

  // --- Fetch sessions from Supabase ---
  const fetchSessions = async (filters?: {
    minDistance?: number;
    maxDistance?: number;
    minTime?: number;
    maxTime?: number;
    minPace?: number;
    maxPace?: number;
    startDate?: string;
    endDate?: string;
  }) => {
    setLoading(true);

    let query = supabase
      .from('cardio_sessions')
      .select('*')
      .order('started_at', { ascending: false });

    if (filters?.minDistance) query = query.gte('total_distance', filters.minDistance);
    if (filters?.maxDistance) query = query.lte('total_distance', filters.maxDistance);
    if (filters?.minTime) query = query.gte('total_time', `${filters.minTime} minutes`);
    if (filters?.maxTime) query = query.lte('total_time', `${filters.maxTime} minutes`);
    if (filters?.minPace) query = query.gte('avg_pace', filters.minPace);
    if (filters?.maxPace) query = query.lte('avg_pace', filters.maxPace);
    if (filters?.startDate) query = query.gte('started_at', filters.startDate);
    if (filters?.endDate) query = query.lte('started_at', filters.endDate);

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching sessions:', error);
    } else {
      setSessions(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSessions();
  }, []);

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
      ) : (
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
              />
              <TextInput
                placeholder="Max"
                keyboardType="numeric"
                value={maxDistance}
                onChangeText={setMaxDistance}
                style={styles.input}
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
              />
              <TextInput
                placeholder="Max"
                keyboardType="numeric"
                value={maxTime}
                onChangeText={setMaxTime}
                style={styles.input}
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
              />
              <TextInput
                placeholder="Max"
                keyboardType="numeric"
                value={maxPace}
                onChangeText={setMaxPace}
                style={styles.input}
              />
            </View>

            {/* Coordinates */}
            <Text style={styles.label}>Coordinates (for outdoor runs)</Text>
            <View style={styles.row}>
              <TextInput
                placeholder="Latitude"
                keyboardType="numeric"
                value={latitude}
                onChangeText={setLatitude}
                style={styles.input}
              />
              <TextInput
                placeholder="Longitude"
                keyboardType="numeric"
                value={longitude}
                onChangeText={setLongitude}
                style={styles.input}
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
              />
              <TextInput
                placeholder="End Date (YYYY-MM-DD)"
                value={endDate}
                onChangeText={setEndDate}
                style={styles.input}
              />
            </View>

            <TouchableOpacity style={styles.applyBtn} onPress={applyFilters}>
              <Text style={styles.applyText}>Find</Text>
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

      {/* --- Session Details Modal --- */}
      <Modal visible={!!selected && selected?.type === 'indoor'} animationType="slide" transparent>
        <IndoorActivityModal session={selected!} onClose={() => setSelected(null)} />
      </Modal>

      <Modal visible={!!selected && selected?.type === 'outdoor'} animationType="slide" transparent>
        <OutdoorActivityModal session={selected!} onClose={() => setSelected(null)} />
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
