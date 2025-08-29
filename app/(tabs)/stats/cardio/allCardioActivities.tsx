// app/(tabs)/stats/cardio/all-activities.tsx
// "View All Activities" screen with search + filter (date & type), like your search-exercise UX.
// - Filters by text (activity name) and type (indoor/outdoor) and optional date range.
// - Tapping an item opens the same modals used on Cardio.tsx.

import React, { useMemo, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { isWithinInterval, parseISO } from 'date-fns';

import activitiesData, { CardioActivity, CardioType } from '@/assets/data/cardio/cardioActivities';
import ActivityCard from '@/components/my components/cardio/ActivityCard';
import IndoorActivityModal from '@/components/my components/cardio/IndoorActivityModal';
import OutdoorActivityModal from '@/components/my components/cardio/OutdoorActivityModal';

const BG = '#3f3f3f';
const WHITE = '#FFFFFF';
const CARD = '#5a5a5a';
const ORANGE = '#f58025';

export default function CardioAllActivities() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [type, setType] = useState<CardioType | 'all'>('all');
  const [dateFrom, setDateFrom] = useState<string | null>(null);
  const [dateTo, setDateTo] = useState<string | null>(null);
  const [showFilter, setShowFilter] = useState(false);
  const [selected, setSelected] = useState<CardioActivity | null>(null);

  const data = useMemo(() => {
    return activitiesData
      .filter((a) => (type === 'all' ? true : a.type === type))
      .filter((a) =>
        query.trim().length ? a.name.toLowerCase().includes(query.trim().toLowerCase()) : true
      )
      .filter((a) => {
        if (dateFrom && dateTo) {
          return isWithinInterval(parseISO(a.date), {
            start: parseISO(dateFrom),
            end: parseISO(dateTo),
          });
        }
        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [query, type, dateFrom, dateTo]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>{'‹'}</Text>
        </TouchableOpacity>
        <Text style={styles.h1}>All Activities</Text>
        <TouchableOpacity onPress={() => setShowFilter(true)}>
          <Text style={styles.filter}>Filter</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchWrap}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search by activity name"
          placeholderTextColor="#cfcfcf"
          style={styles.search}
        />
      </View>

      <FlatList
        data={data}
        keyExtractor={(it) => it.id}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        renderItem={({ item }) => (
          <ActivityCard activity={item} onPress={() => setSelected(item)} style={{ backgroundColor: CARD }} />
        )}
      />

      {/* Filter Modal (simple template to mirror your search-exercise feel) */}
      <Modal visible={showFilter} animationType="slide" transparent>
        <View style={styles.sheetBackdrop}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Filters</Text>

            <View style={{ height: 12 }} />
            <View style={styles.row}>
              {(['all', 'indoor', 'outdoor'] as const).map((t) => (
                <TouchableOpacity
                  key={t}
                  onPress={() => setType(t)}
                  style={[styles.pill, type === t && styles.pillActive]}
                >
                  <Text style={[styles.pillText, type === t && styles.pillTextActive]}>
                    {t.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* For simplicity, quick date presets; wire up to a proper picker if you prefer */}
            <View style={{ height: 16 }} />
            <View style={styles.row}>
              <TouchableOpacity
                style={styles.preset}
                onPress={() => {
                  const end = new Date();
                  const start = new Date();
                  start.setDate(end.getDate() - 7);
                  setDateFrom(start.toISOString().slice(0, 10));
                  setDateTo(end.toISOString().slice(0, 10));
                }}
              >
                <Text style={styles.presetText}>Last 7 days</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.preset}
                onPress={() => {
                  const end = new Date();
                  const start = new Date();
                  start.setMonth(end.getMonth() - 1);
                  setDateFrom(start.toISOString().slice(0, 10));
                  setDateTo(end.toISOString().slice(0, 10));
                }}
              >
                <Text style={styles.presetText}>Last 30 days</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.preset}
                onPress={() => {
                  setDateFrom(null);
                  setDateTo(null);
                }}
              >
                <Text style={styles.presetText}>Clear dates</Text>
              </TouchableOpacity>
            </View>

            <View style={{ height: 16 }} />
            <TouchableOpacity style={styles.applyBtn} onPress={() => setShowFilter(false)}>
              <Text style={styles.applyText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Detail Modals */}
      <Modal visible={!!selected && selected?.type === 'indoor'} transparent animationType="slide">
        <IndoorActivityModal activity={selected!} onClose={() => setSelected(null)} />
      </Modal>
      <Modal visible={!!selected && selected?.type === 'outdoor'} transparent animationType="slide">
        <OutdoorActivityModal activity={selected!} onClose={() => setSelected(null)} />
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  back: { color: WHITE, fontSize: 24, padding: 4 },
  h1: { color: WHITE, fontSize: 18, fontWeight: '800' },
  filter: { color: WHITE, opacity: 0.9 },
  searchWrap: { paddingHorizontal: 16, paddingBottom: 8 },
  search: {
    backgroundColor: '#505050',
    color: WHITE,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: '#0009',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#2f2f2f',
    padding: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  sheetTitle: { color: WHITE, fontSize: 16, fontWeight: '800' },
  row: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  pill: {
    borderWidth: 1,
    borderColor: '#888',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  pillActive: { backgroundColor: ORANGE, borderColor: ORANGE },
  pillText: { color: WHITE, fontWeight: '700' },
  pillTextActive: { color: WHITE },
  preset: {
    backgroundColor: '#494949',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  presetText: { color: WHITE },
  applyBtn: {
    backgroundColor: ORANGE,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 8,
  },
  applyText: { color: WHITE, textAlign: 'center', fontWeight: '800' },
});
