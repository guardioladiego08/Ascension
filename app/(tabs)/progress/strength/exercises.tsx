// app/(tabs)/progress/strength/exercises.tsx
import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Modal,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/Colors';
import LogoHeader from '@/components/my components/logoHeader';
import { GlobalStyles } from '@/constants/GlobalStyles';
import {
  fetchVisibleExercises,
  getAuthenticatedUserId,
  getExerciseBodyParts,
  type ExerciseRecord,
} from '@/lib/strength/exercises';

type ExerciseRow = ExerciseRecord;
const BG = Colors.dark.background;

const ExercisesScreen: React.FC = () => {
  const [exercises, setExercises] = useState<ExerciseRow[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [selectedBodyParts, setSelectedBodyParts] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [filterVisible, setFilterVisible] = useState(false);

  // ------------------------ DATA LOADING -------------------------------------

  const loadExercises = useCallback(async () => {
    try {
      setLoadingInitial(true);
      setErrorMsg(null);

      const userId = await getAuthenticatedUserId();
      if (!userId) {
        setExercises([]);
        setErrorMsg('Not signed in.');
        return;
      }

      setExercises(await fetchVisibleExercises(userId));
    } catch (err) {
      console.warn('Error loading exercises', err);
      setExercises([]);
      setErrorMsg('Unexpected error while loading exercises.');
    } finally {
      setLoadingInitial(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadExercises();
    }, [loadExercises])
  );

  // ------------------------ FILTERS / SORT -----------------------------------

  const allBodyParts = useMemo(() => {
    const set = new Set<string>();
    exercises.forEach(ex => {
      getExerciseBodyParts(ex).forEach(bp => {
        if (bp) set.add(bp);
      });
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [exercises]);

  const allCategories = useMemo(() => {
    const set = new Set<string>();
    exercises.forEach(ex => {
      const cat = ex.workout_category || null;
      if (cat) set.add(cat);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [exercises]);

  const toggleBodyPart = (bp: string) => {
    setSelectedBodyParts(prev =>
      prev.includes(bp)
        ? prev.filter(v => v !== bp)
        : [...prev, bp],
    );
  };

  const clearFilters = () => {
    setSelectedBodyParts([]);
    setSelectedCategory(null);
    setSortDir('asc');
  };

  const filteredExercises = useMemo(() => {
    let list = [...exercises];

    // search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(ex =>
        ex.exercise_name.toLowerCase().includes(q),
      );
    }

    // body part filter
    if (selectedBodyParts.length > 0) {
      list = list.filter(ex => {
        const parts = getExerciseBodyParts(ex);
        return parts.some(p => selectedBodyParts.includes(p));
      });
    }

    // category filter
    if (selectedCategory) {
      list = list.filter(ex => ex.workout_category === selectedCategory);
    }

    // sort
    list.sort((a, b) => {
      const la = a.exercise_name.toLowerCase();
      const lb = b.exercise_name.toLowerCase();
      const cmp = la.localeCompare(lb);
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [exercises, search, selectedBodyParts, selectedCategory, sortDir]);

  // ------------------------ RENDER -------------------------------------------
  const renderItem = ({ item, index }: { item: ExerciseRow; index: number }) => {
    const label = item.exercise_name;

    const handlePress = () => {
      router.push({
        pathname: '/progress/strength/[id]',
        params: {
          id: item.id,
          name: label,
        },
      });
    };

    return (
      <TouchableOpacity
        style={[
          styles.item,
          index === filteredExercises.length - 1 && { borderBottomWidth: 0 },
        ]}
        activeOpacity={0.85}
        onPress={handlePress}
      >
        <View style={styles.bullet} />
        <Text style={styles.itemText}>{label}</Text>
      </TouchableOpacity>
    );
  };

  const listHeaderComponent = () => {
    if (loadingInitial) {
      return (
        <View style={styles.listState}>
          <ActivityIndicator size="small" color={Colors.dark.highlight1} />
          <Text style={styles.muted}>Loading exercises…</Text>
        </View>
      );
    }

    if (errorMsg) {
      return (
        <View style={styles.listState}>
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      );
    }

    if (!filteredExercises.length) {
      return (
        <View style={styles.listState}>
          <Text style={styles.muted}>No exercises found.</Text>
        </View>
      );
    }

    return null;
  };

  return (
    <LinearGradient
      colors={['#3a3a3bff', '#1e1e1eff', BG]}
      start={{ x: 0.2, y: 0 }}
      end={{ x: 0.8, y: 1 }}
      style={{ flex: 1 }}
    >
      <View style={[GlobalStyles.container, styles.screen]}>
        <LogoHeader showBackButton usePreviousRoute />
        <View style={styles.headerRow}>
          <Text style={GlobalStyles.title}>Exercises</Text>
          <View style={{ width: 32 }} />
        </View>

        <View style={styles.controlsCard}>
          <View style={styles.controlsRow}>
            <View style={styles.searchWrapper}>
              <Ionicons name="search-outline" size={16} color="#9DA4C4" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search exercises"
                placeholderTextColor="#6B7280"
                value={search}
                onChangeText={setSearch}
              />
              {search.length > 0 && (
                <Ionicons
                  name="close-circle"
                  size={16}
                  color="#9DA4C4"
                  onPress={() => setSearch('')}
                />
              )}
            </View>

            <TouchableOpacity
              style={styles.filterBtn}
              onPress={() => setFilterVisible(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="options-outline" size={16} color="#FFFFFF" />
              <Text style={styles.filterBtnText}>Filters</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.listCard}>
          <FlatList
            data={filteredExercises}
            keyExtractor={item => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={listHeaderComponent}
            showsVerticalScrollIndicator={false}
          />
        </View>

        <Modal
          visible={filterVisible}
          animationType="fade"
          transparent
          onRequestClose={() => setFilterVisible(false)}
        >
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setFilterVisible(false)}
          >
            <Pressable style={styles.modalCard} onPress={() => {}}>
              <View style={styles.modalHeaderRow}>
                <Text style={styles.modalTitle}>Filters</Text>
                <TouchableOpacity onPress={clearFilters}>
                  <Text style={styles.clearText}>Clear</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.modalSectionTitle}>Sort</Text>
              <View style={styles.chipRow}>
                <TouchableOpacity
                  style={[
                    styles.chip,
                    sortDir === 'asc' && styles.chipActive,
                  ]}
                  onPress={() => setSortDir('asc')}
                >
                  <Text
                    style={[
                      styles.chipText,
                      sortDir === 'asc' && styles.chipTextActive,
                    ]}
                  >
                    A → Z
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.chip,
                    sortDir === 'desc' && styles.chipActive,
                  ]}
                  onPress={() => setSortDir('desc')}
                >
                  <Text
                    style={[
                      styles.chipText,
                      sortDir === 'desc' && styles.chipTextActive,
                    ]}
                  >
                    Z → A
                  </Text>
                </TouchableOpacity>
              </View>

              {allBodyParts.length > 0 && (
                <>
                  <Text style={styles.modalSectionTitle}>Body parts</Text>
                  <View style={styles.chipWrap}>
                    {allBodyParts.map(bp => {
                      const selected = selectedBodyParts.includes(bp);
                      return (
                        <TouchableOpacity
                          key={bp}
                          style={[
                            styles.chip,
                            selected && styles.chipActive,
                            { marginBottom: 6 },
                          ]}
                          onPress={() => toggleBodyPart(bp)}
                        >
                          <Text
                            style={[
                              styles.chipText,
                              selected && styles.chipTextActive,
                            ]}
                          >
                            {bp}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              )}

              {allCategories.length > 0 && (
                <>
                  <Text style={styles.modalSectionTitle}>Workout category</Text>
                  <View style={styles.chipWrap}>
                    {allCategories.map(cat => {
                      const selected = selectedCategory === cat;
                      return (
                        <TouchableOpacity
                          key={cat}
                          style={[
                            styles.chip,
                            selected && styles.chipActive,
                            { marginBottom: 6 },
                          ]}
                          onPress={() =>
                            setSelectedCategory(prev =>
                              prev === cat ? null : cat,
                            )
                          }
                        >
                          <Text
                            style={[
                              styles.chipText,
                              selected && styles.chipTextActive,
                            ]}
                          >
                            {cat}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              )}

              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setFilterVisible(false)}
              >
                <Text style={styles.modalCloseText}>Done</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingTop: 8,
    paddingBottom: 12,
  },
  controlsCard: {
    backgroundColor: Colors.dark.card,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 14,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.dark.offset1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#E5E7F5',
    paddingVertical: 2,
  },
  filterBtn: {
    marginLeft: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: Colors.dark.highlight1,
  },
  filterBtnText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  listCard: {
    flex: 1,
    backgroundColor: Colors.dark.card,
    borderRadius: 18,
    overflow: 'hidden',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  listState: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  muted: {
    marginTop: 4,
    fontSize: 12,
    color: '#9DA4C4',
  },
  errorText: {
    fontSize: 12,
    color: '#F97373',
  },

  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#293042',
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.dark.highlight1,
    marginRight: 10,
  },
  itemText: {
    fontSize: 13,
    color: '#E5E7F5',
  },

  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: Colors.dark.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  clearText: {
    fontSize: 12,
    color: '#F97373',
  },
  modalSectionTitle: {
    marginTop: 8,
    marginBottom: 6,
    fontSize: 12,
    color: Colors.dark.text,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#1F2937',
    backgroundColor: Colors.dark.offset1,
  },
  chipActive: {
    backgroundColor: Colors.dark.highlight1,
    borderColor: Colors.dark.highlight1,
  },
  chipText: {
    fontSize: 11,
    color: Colors.dark.text,
  },
  chipTextActive: {
    color: Colors.dark.text,
  },
  modalCloseBtn: {
    marginTop: 16,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: Colors.dark.highlight1,
  },
  modalCloseText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#FFFFFF',
  },
});

export default ExercisesScreen;
