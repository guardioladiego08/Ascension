// app/(tabs)/stats/strength/all-activities.tsx
// Strength – All Activities
// - LogoHeader at the top
// - Header row with Back button and a Filter button (opens date filter modal)
// - Search bar to filter by exercise/session title
// - Lists ALL sessions from StrengthProgressList (sorted newest → oldest)
//
// No new npm packages required. Everything here uses RN core + your existing Expo Router stack.
// If you later want native date pickers, I can wire in `@react-native-community/datetimepicker`
// (kept out for now to avoid extra deps).

import React, { useMemo, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Modal,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import LogoHeader from '@/components/my components/logoHeader';
import sessions, { StrengthSession } from '@/assets/data/strength/StrengthProgressList';
import { Colors } from '@/constants/Colors';
import { GlobalStyles } from '@/constants/GlobalStyles';

const BG = Colors?.dark?.background ?? '#3f3f3f';
const ORANGE = '#FF950A';

type DateRange = { from: string | null; to: string | null };

// --- Helpers ---
const parseISO = (iso: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return isNaN(d.getTime()) ? null : d;
};

const inRange = (iso: string, range: DateRange | null) => {
  if (!range) return true;
  const d = parseISO(iso);
  if (!d) return true;
  const from = range.from ? parseISO(range.from) : null;
  const to = range.to ? parseISO(range.to) : null;
  if (from && d < from) return false;
  if (to) {
    // include end date
    const end = new Date(to);
    end.setHours(23, 59, 59, 999);
    if (d > end) return false;
  }
  return true;
};

// --- Date Filter Modal (inline component) ---
const DateFilterModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  onApply: (range: DateRange | null) => void;
  current: DateRange | null;
}> = ({ visible, onClose, onApply, current }) => {
  const [from, setFrom] = useState<string>(current?.from ?? '');
  const [to, setTo] = useState<string>(current?.to ?? '');

  // quick presets
  const applyPreset = (days: number) => {
    const today = new Date();
    const start = new Date();
    start.setDate(today.getDate() - (days - 1));
    const iso = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate()
      ).padStart(2, '0')}`;
    setFrom(iso(start));
    setTo(iso(today));
  };

  const thisMonth = () => {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    const iso = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate()
      ).padStart(2, '0')}`;
    setFrom(iso(start));
    setTo(iso(today));
  };

  const clear = () => {
    setFrom('');
    setTo('');
  };

  const apply = () => {
    const range: DateRange = {
      from: from.trim() ? from.trim() : null,
      to: to.trim() ? to.trim() : null,
    };
    // If both empty -> clear filter
    if (!range.from && !range.to) {
      onApply(null);
    } else {
      onApply(range);
    }
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: 'padding', android: undefined })}
        style={styles.modalWrap}
      >
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filter by Date</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Presets */}
          <View style={styles.presetRow}>
            <TouchableOpacity style={styles.presetBtn} onPress={() => applyPreset(7)}>
              <Text style={styles.presetTxt}>Last 7 days</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.presetBtn} onPress={() => applyPreset(14)}>
              <Text style={styles.presetTxt}>Last 14</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.presetBtn} onPress={() => applyPreset(30)}>
              <Text style={styles.presetTxt}>Last 30</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.presetBtn} onPress={thisMonth}>
              <Text style={styles.presetTxt}>This Month</Text>
            </TouchableOpacity>
          </View>

          {/* Custom range */}
          <View style={{ marginTop: 12 }}>
            <Text style={styles.modalLabel}>From (YYYY-MM-DD)</Text>
            <TextInput
              value={from}
              onChangeText={setFrom}
              placeholder="e.g., 2025-07-01"
              placeholderTextColor="#9a9a9a"
              style={styles.input}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={[styles.modalLabel, { marginTop: 10 }]}>To (YYYY-MM-DD)</Text>
            <TextInput
              value={to}
              onChangeText={setTo}
              placeholder="e.g., 2025-08-31"
              placeholderTextColor="#9a9a9a"
              style={styles.input}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#444' }]} onPress={clear}>
              <Text style={styles.modalBtnTxt}>Clear</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalBtn, { backgroundColor: ORANGE }]} onPress={apply}>
              <Text style={[styles.modalBtnTxt, { color: '#111' }]}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const AllActivities: React.FC = () => {
  const router = useRouter();

  const [query, setQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | null>(null);

  const data = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...sessions]
      .filter((s) => (q ? s.title.toLowerCase().includes(q) : true))
      .filter((s) => inRange(s.date, dateRange))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [query, dateRange]);

  return (
    <SafeAreaView style={GlobalStyles.safeArea}>
      {/* Logo + top header row */}
      <LogoHeader  showBackButton/>

      <View style={styles.topRow}>


        <View style={{ flex: 1 }} />

        <TouchableOpacity
          style={styles.filterBtn}
          onPress={() => setModalOpen(true)}
          accessibilityLabel="Open date filter"
        >
          <MaterialCommunityIcons name="filter-variant" size={20} color={ORANGE} />
          <Text style={styles.filterTxt}>Filter</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color="#CFCFCF" style={{ marginLeft: 10 }} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search exercise"
          placeholderTextColor="#AFAFAF"
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')} style={{ paddingHorizontal: 10 }}>
            <Ionicons name="close-circle" size={18} color="#CFCFCF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Active filter pill (if any) */}
      {dateRange && (
        <View style={styles.activeFilterRow}>
          <Text style={styles.activeFilterTxt}>
            {`Date: ${dateRange.from ?? '…'} → ${dateRange.to ?? '…'}`}
          </Text>
          <TouchableOpacity onPress={() => setDateRange(null)}>
            <Text style={[styles.activeFilterTxt, { textDecorationLine: 'underline' }]}>Clear</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* List */}
      <FlatList
        data={data}
        keyExtractor={(i: StrengthSession) => i.id}
        contentContainerStyle={{ paddingBottom: 22, gap: 10 }}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.rowHeader}>
              <Text style={styles.rowTitle}>{item.title}</Text>
              <Text style={styles.rowDate}>
                {new Date(item.date).toLocaleDateString('en-CA')}
              </Text>
            </View>

            <View style={styles.metaRow}>
              <View style={styles.metaPill}>
                <Text style={styles.metaLabel}>EXERCISES</Text>
                <Text style={styles.metaValue}>{item.exercisesCount}</Text>
              </View>
              <View style={styles.metaPill}>
                <Text style={styles.metaLabel}>TIME</Text>
                <Text style={styles.metaValue}>{item.durationLabel}</Text>
              </View>
              <View style={styles.metaPill}>
                <Text style={styles.metaLabel}>VOLUME</Text>
                <Text style={styles.metaValue}>
                  {item.volumeLbs.toLocaleString()}lbs
                </Text>
              </View>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={{ padding: 24, alignItems: 'center' }}>
            <Text style={{ color: '#CFCFCF' }}>No activities match your filters.</Text>
          </View>
        }
      />

      <DateFilterModal
        visible={modalOpen}
        onClose={() => setModalOpen(false)}
        onApply={setDateRange}
        current={dateRange}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 8,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1f1f1f',
    backgroundColor: '#2a2a2a',
  },
  filterTxt: { color: ORANGE, fontWeight: '900', fontSize: 12 },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2b2b2b',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1b1b1b',
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 10,
    fontSize: 14,
  },

  activeFilterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#2b2b2b',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1b1b1b',
  },
  activeFilterTxt: { color: '#eaeaea', fontSize: 12, fontWeight: '700' },

  row: {
    backgroundColor: '#2f2f2f',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1d1d1d',
  },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  rowTitle: { color: '#fff', fontWeight: '900', fontSize: 14, flex: 1, paddingRight: 12 },
  rowDate: { color: '#CFCFCF', fontWeight: '700', fontSize: 11 },

  metaRow: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  metaPill: {
    flex: 1,
    backgroundColor: '#5a5a5a',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  metaLabel: { color: '#EAEAEA', fontSize: 9, fontWeight: '700', letterSpacing: 0.4 },
  metaValue: { color: '#fff', marginTop: 2, fontWeight: '800', fontSize: 12 },

  // Modal styles
  modalWrap: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#262626',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    borderTopWidth: 1,
    borderColor: '#1b1b1b',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: { color: '#fff', fontWeight: '900', fontSize: 16 },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  presetBtn: {
    backgroundColor: '#333',
    borderColor: '#1b1b1b',
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  presetTxt: { color: '#eaeaea', fontWeight: '800', fontSize: 12 },

  modalLabel: { color: '#cfcfcf', fontWeight: '700', fontSize: 12 },
  input: {
    backgroundColor: '#1f1f1f',
    borderColor: '#111',
    borderWidth: 1,
    borderRadius: 8,
    color: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 6,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 14,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalBtnTxt: { color: '#fff', fontWeight: '900', fontSize: 13 },
});

export default AllActivities;
