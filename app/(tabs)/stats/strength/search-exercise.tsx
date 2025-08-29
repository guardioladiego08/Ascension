// app/(tabs)/stats/strength/search-exercise.tsx
// Ascension — Strength → Search Exercise
// Matches the mock: top search bar, alphabetized list with letter headers,
// each row has an info icon; tapping a row opens a "Stats" modal,
// tapping the info icon opens an "Exercise Info" modal.
// Both modals are templates that populate from a shared data file.
//
// No new packages required (uses @expo/vector-icons which you already use).

import React, { useMemo, useState, useCallback } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TextInput,
  SectionList,
  TouchableOpacity,
  Modal,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

import LogoHeader from '@/components/my components/logoHeader';
import {
  EXERCISES,
  EXERCISE_STATS,
  Exercise,
  ExerciseStats,
} from '@/assets/data/strength/ExercisesCatalog';

const BG = '#3f3f3f';
const ORANGE = '#FF950A';
const ROW_BG = '#8B8B8B';
const ROW_BG_ALT = '#A1A1A1';

// ---------- helpers ----------
type Section = { title: string; data: Exercise[] };

const buildSections = (list: Exercise[]): Section[] => {
  const grouped: Record<string, Exercise[]> = {};
  list.forEach((e) => {
    const key = (e.name[0] || '#').toUpperCase();
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(e);
  });
  const letters = Object.keys(grouped).sort();
  return letters.map((l) => ({
    title: l,
    data: grouped[l].sort((a, b) => a.name.localeCompare(b.name)),
  }));
};

const match = (q: string, e: Exercise) => {
  if (!q) return true;
  const t = q.toLowerCase();
  if (e.name.toLowerCase().includes(t)) return true;
  return (e.aliases ?? []).some((a) => a.toLowerCase().includes(t));
};

// ---------- Modals ----------
const ModalHeader: React.FC<{ title: string; onClose: () => void }> = ({
  title,
  onClose,
}) => (
  <View style={styles.modalHeader}>
    <Text style={styles.modalTitle}>{title}</Text>
    <TouchableOpacity onPress={onClose} accessibilityLabel="Close">
      <Ionicons name="close" size={22} color="#fff" />
    </TouchableOpacity>
  </View>
);

const InfoModal: React.FC<{
  visible: boolean;
  exercise: Exercise | null;
  onClose: () => void;
}> = ({ visible, exercise, onClose }) => {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <ModalHeader title={exercise?.name ?? 'Exercise'} onClose={onClose} />

          <View style={styles.modalRow}>
            <Text style={styles.modalLabel}>Primary:</Text>
            <Text style={styles.modalValue}>
              {exercise?.primaryMuscles.join(', ') || '—'}
            </Text>
          </View>
          {exercise?.secondaryMuscles?.length ? (
            <View style={styles.modalRow}>
              <Text style={styles.modalLabel}>Secondary:</Text>
              <Text style={styles.modalValue}>
                {exercise.secondaryMuscles.join(', ')}
              </Text>
            </View>
          ) : null}
          {exercise?.equipment?.length ? (
            <View style={styles.modalRow}>
              <Text style={styles.modalLabel}>Equipment:</Text>
              <Text style={styles.modalValue}>
                {exercise.equipment.join(', ')}
              </Text>
            </View>
          ) : null}

          <Text style={[styles.modalLabel, { marginTop: 10 }]}>Description</Text>
          <Text style={styles.modalBody}>{exercise?.description ?? '—'}</Text>

          {exercise?.tips?.length ? (
            <>
              <Text style={[styles.modalLabel, { marginTop: 10 }]}>Tips</Text>
              {exercise.tips.map((t, i) => (
                <Text key={i} style={styles.modalBody}>{`\u2022 ${t}`}</Text>
              ))}
            </>
          ) : null}
        </View>
      </View>
    </Modal>
  );
};

const StatsModal: React.FC<{
  visible: boolean;
  exercise: Exercise | null;
  onClose: () => void;
}> = ({ visible, exercise, onClose }) => {
  const stats: ExerciseStats | undefined = exercise
    ? EXERCISE_STATS[exercise.id]
    : undefined;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <ModalHeader
            title={`${exercise?.name ?? 'Exercise'} — Stats`}
            onClose={onClose}
          />

          {stats ? (
            <>
              <View style={styles.modalRow}>
                <Text style={styles.modalLabel}>Last Performed:</Text>
                <Text style={styles.modalValue}>{stats.lastDate}</Text>
              </View>
              <View style={styles.modalRow}>
                <Text style={styles.modalLabel}>Sessions (90d):</Text>
                <Text style={styles.modalValue}>{stats.sessions}</Text>
              </View>
              <View style={styles.modalRow}>
                <Text style={styles.modalLabel}>Best 1RM:</Text>
                <Text style={styles.modalValue}>
                  {stats.best1RM ? `${stats.best1RM} lbs` : '—'}
                </Text>
              </View>
              <View style={styles.modalRow}>
                <Text style={styles.modalLabel}>Best Volume (Session):</Text>
                <Text style={styles.modalValue}>
                  {stats.bestVolume
                    ? `${stats.bestVolume.toLocaleString()} lbs`
                    : '—'}
                </Text>
              </View>
              <View style={styles.modalRow}>
                <Text style={styles.modalLabel}>Avg Volume:</Text>
                <Text style={styles.modalValue}>
                  {stats.avgVolume
                    ? `${stats.avgVolume.toLocaleString()} lbs`
                    : '—'}
                </Text>
              </View>

              {stats.recentPRs?.length ? (
                <>
                  <Text style={[styles.modalLabel, { marginTop: 10 }]}>
                    Recent PRs
                  </Text>
                  {stats.recentPRs.map((r, i) => (
                    <Text key={i} style={styles.modalBody}>
                      {`${r.date} — ${r.weight} lbs x${r.reps}`}
                    </Text>
                  ))}
                </>
              ) : null}
            </>
          ) : (
            <Text style={styles.modalBody}>
              No stats yet for this exercise. Log a session to see trends here.
            </Text>
          )}
        </View>
      </View>
    </Modal>
  );
};

// ---------- Row + Section Header ----------
const ExerciseRow: React.FC<{
  item: Exercise;
  index: number;
  onPress: (e: Exercise) => void;
  onInfo: (e: Exercise) => void;
}> = ({ item, index, onPress, onInfo }) => {
  const bg = index % 2 === 0 ? ROW_BG : ROW_BG_ALT;
  return (
    <View style={[styles.rowWrap]}>
      <TouchableOpacity
        style={[styles.row, { backgroundColor: bg }]}
        onPress={() => onPress(item)}
      >
        <Text numberOfLines={1} style={styles.rowText}>
          {item.name.toUpperCase()}
        </Text>

        <TouchableOpacity
          style={styles.infoBtn}
          onPress={() => onInfo(item)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialIcons name="info-outline" size={18} color="#fff" />
        </TouchableOpacity>
      </TouchableOpacity>
    </View>
  );
};

const LetterHeader: React.FC<{ letter: string }> = ({ letter }) => (
  <View style={styles.letterHeader}>
    <Text style={styles.letter}>{letter}</Text>
    <View style={styles.letterRule} />
  </View>
);

// ---------- Main ----------
const SearchExercise: React.FC = () => {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [infoOpen, setInfoOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [selected, setSelected] = useState<Exercise | null>(null);

  const filtered = useMemo(
    () => EXERCISES.filter((e) => match(query, e)),
    [query]
  );
  const sections = useMemo(() => buildSections(filtered), [filtered]);

  const openInfo = useCallback((e: Exercise) => {
    setSelected(e);
    setInfoOpen(true);
  }, []);

  const openStats = useCallback((e: Exercise) => {
    setSelected(e);
    setStatsOpen(true);
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <LogoHeader />

      {/* Top bar: search input */}
      <View style={styles.searchWrap}>
        <Ionicons
          name="search"
          size={16}
          color="#404040"
          style={{ marginLeft: 10 }}
        />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="SEARCH"
          placeholderTextColor="#404040"
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity
            onPress={() => setQuery('')}
            style={{ paddingHorizontal: 10 }}
          >
            <Ionicons name="close-circle" size={18} color="#6a6a6a" />
          </TouchableOpacity>
        )}
      </View>

      {/* A small hairline in orange to mimic the mock under the search bar */}
      <View style={styles.orangeHairline} />

      {/* Alphabetized list */}
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => (
          <LetterHeader letter={section.title} />
        )}
        renderItem={({ item, index }) => (
          <ExerciseRow
            item={item}
            index={index}
            onPress={openStats}
            onInfo={openInfo}
          />
        )}
        contentContainerStyle={{ paddingBottom: 80 }}
      />

      {/* Add New — center-bottom (template for future) */}
      <TouchableOpacity
        style={styles.addNew}
        onPress={() => router.push('/stats/strength/new-exercise')}
      >
        <Text style={styles.addNewText}>ADD NEW</Text>
      </TouchableOpacity>

      <InfoModal
        visible={infoOpen}
        exercise={selected}
        onClose={() => setInfoOpen(false)}
      />
      <StatsModal
        visible={statsOpen}
        exercise={selected}
        onClose={() => setStatsOpen(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BG,
    paddingHorizontal: 14,
    paddingTop: 6,
  },

  // Search
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D9D9D9',
    borderRadius: 12,
    paddingVertical: Platform.select({ ios: 10, android: 6 }),
    marginTop: 6,
  },
  searchInput: {
    flex: 1,
    color: '#1a1a1a',
    paddingHorizontal: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  orangeHairline: {
    height: 3,
    backgroundColor: ORANGE,
    borderRadius: 3,
    marginTop: 8,
    marginBottom: 6,
  },

  // Section header
  letterHeader: {
    paddingTop: 12,
    paddingBottom: 6,
  },
  letter: {
    color: '#D9D9D9',
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 6,
  },
  letterRule: {
    height: 2,
    backgroundColor: ORANGE,
    borderRadius: 2,
  },

  // Rows
  rowWrap: { marginTop: 6 },
  row: {
    borderRadius: 6,
    paddingVertical: 12,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  rowText: {
    color: '#fff',
    fontWeight: '900',
    letterSpacing: 0.4,
    paddingRight: 28,
  },
  infoBtn: {
    position: 'absolute',
    right: 8,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    width: 28,
  },

  // Add New
  addNew: {
    position: 'absolute',
    bottom: 16,
    alignSelf: 'center',
    backgroundColor: ORANGE,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 18,
    elevation: 2,
  },
  addNewText: {
    color: '#111',
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  // Modals
  modalBackdrop: {
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

  modalRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    alignItems: 'baseline',
  },
  modalLabel: { color: '#cfcfcf', fontWeight: '800', fontSize: 12 },
  modalValue: { color: '#fff', fontWeight: '700', fontSize: 12 },
  modalBody: { color: '#eaeaea', marginTop: 6, lineHeight: 18 },
});

export default SearchExercise;
