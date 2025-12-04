// app/(tabs)/progress/strength/exercises.tsx
import React, { useEffect, useMemo, useState } from 'react';
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
import { Colors } from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import LogoHeader from '@/components/my components/logoHeader';
import { GlobalStyles } from '@/constants/GlobalStyles';

// We don't assume exact column names – we try common variants and fall back to id
type ExerciseRow = {
  id: string;
  name?: string;
  exercise_name?: string;
  title?: string;
  display_name?: string;
  body_parts?: string[] | string;
  body_part?: string;
  primary_body_part?: string;
  workout_category?: string;
  category?: string;
  exercise_category?: string;
  [key: string]: any;
};

const PAGE_SIZE = 40;

const getLabel = (ex: ExerciseRow): string => {
  return (
    ex.exercise_name ||
    ex.name ||
    ex.title ||
    (typeof ex.display_name === 'string' ? ex.display_name : '') ||
    ex.id
  );
};

const getBodyParts = (ex: ExerciseRow): string[] => {
  const raw =
    ex.body_parts ??
    ex.body_part ??
    ex.primary_body_part;

  if (!raw) return [];

  if (Array.isArray(raw)) return raw.map(String);

  if (typeof raw === 'string') {
    // handle comma-separated or JSON-ish strings
    if (raw.trim().startsWith('[')) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed.map(String);
      } catch {
        // fall through to comma split
      }
    }
    return raw
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
  }

  return [];
};

const getCategory = (ex: ExerciseRow): string | null => {
  return (
    ex.workout_category ||
    ex.category ||
    ex.exercise_category ||
    null
  );
};

const ExercisesScreen: React.FC = () => {
  const [exercises, setExercises] = useState<ExerciseRow[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [selectedBodyParts, setSelectedBodyParts] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [filterVisible, setFilterVisible] = useState(false);

  // ------------------------ DATA LOADING -------------------------------------

  const fetchPage = async (pageIndex: number) => {
    try {
      if (pageIndex === 0) {
        setLoadingInitial(true);
        setErrorMsg(null);
      } else {
        setLoadingMore(true);
      }

      const from = pageIndex * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) {
        setErrorMsg('Not signed in.');
        setHasMore(false);
        return;
      }

      const { data, error } = await supabase
        .schema('strength')
        .from('exercises')
        .select('*')
        .or(`user_id.is.null,user_id.eq.${user.id}`)
        .order('exercise_name', { ascending: true })
        .range(from, to);

      if (error) {
        console.warn('Error loading exercises', error);
        setErrorMsg(error.message ?? 'Failed to load exercises.');
        setHasMore(false);
        return;
      }

      const rows = (data ?? []) as ExerciseRow[];

      setHasMore(rows.length === PAGE_SIZE);

      setExercises(prev => {
        if (pageIndex === 0) {
          return rows;
        }
        const ids = new Set(prev.map(p => p.id));
        const merged = [...prev];
        rows.forEach(r => {
          if (!ids.has(r.id)) merged.push(r);
        });
        return merged;
      });

      setPage(pageIndex);
    } catch (err) {
      console.warn('Error loading exercises', err);
      setErrorMsg('Unexpected error while loading exercises.');
      setHasMore(false);
    } finally {
      setLoadingInitial(false);
      setLoadingMore(false);
    }
  };


  useEffect(() => {
    fetchPage(0);
  }, []);

  const handleLoadMore = () => {
    if (!hasMore || loadingMore || loadingInitial) return;
    fetchPage(page + 1);
  };

  // ------------------------ FILTERS / SORT -----------------------------------

  const allBodyParts = useMemo(() => {
    const set = new Set<string>();
    exercises.forEach(ex => {
      getBodyParts(ex).forEach(bp => {
        if (bp) set.add(bp);
      });
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [exercises]);

  const allCategories = useMemo(() => {
    const set = new Set<string>();
    exercises.forEach(ex => {
      const cat = getCategory(ex);
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
        getLabel(ex).toLowerCase().includes(q),
      );
    }

    // body part filter
    if (selectedBodyParts.length > 0) {
      list = list.filter(ex => {
        const parts = getBodyParts(ex);
        return parts.some(p => selectedBodyParts.includes(p));
      });
    }

    // category filter
    if (selectedCategory) {
      list = list.filter(ex => getCategory(ex) === selectedCategory);
    }

    // sort
    list.sort((a, b) => {
      const la = getLabel(a).toLowerCase();
      const lb = getLabel(b).toLowerCase();
      const cmp = la.localeCompare(lb);
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [exercises, search, selectedBodyParts, selectedCategory, sortDir]);

  // ------------------------ RENDER -------------------------------------------

    const renderItem = ({ item, index }: { item: ExerciseRow; index: number }) => {
    const label = getLabel(item);

    const handlePress = () => {
    router.push({
        pathname: '/progress/strength/[id]',
        params: {
        id: item.id,
        name: label, // optional, for header
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
    <View style={GlobalStyles.container}>
      <LogoHeader showBackButton />
      {/* Top bar (back + title) */}
      <View style={styles.headerRow}>
        <Text style={GlobalStyles.title}>Exercises</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Static control row: search + filter button */}
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

      {/* List */}
      <FlatList
        data={filteredExercises}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={listHeaderComponent}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.4}
        showsVerticalScrollIndicator={false}
      />

      {/* FILTER MODAL */}
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

            {/* Sort */}
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

            {/* Body parts */}
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

            {/* Workout category */}
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
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#050816',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Colors.dark.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  searchWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.dark.card,
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

  listContent: {
    paddingHorizontal: 20,
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
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#111827',
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
    backgroundColor: Colors.dark.background,
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
