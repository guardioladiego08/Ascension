import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Alert,
  Pressable,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/Colors';
import CustomExerciseModal from './CustomExerciseModal';

/* -------------------------------------------------------
   TYPES
------------------------------------------------------- */
type ExerciseRow = {
  id: string;
  exercise_name: string;
  info: string | null;
  body_parts?: string[] | string;
  workout_category?: string | null;
};

/* -------------------------------------------------------
   HELPERS
------------------------------------------------------- */
const getBodyParts = (ex: ExerciseRow): string[] => {
  const raw = ex.body_parts;
  if (!raw) return [];

  if (Array.isArray(raw)) return raw;

  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return raw.split(',').map(s => s.trim());
    }
  }

  return [];
};

const getCategory = (ex: ExerciseRow): string | null => {
  return ex.workout_category || null;
};

/* -------------------------------------------------------
   COMPONENT
------------------------------------------------------- */
type Props = {
  visible: boolean;
  onPick: (ex: { id: string; exercise_name: string }) => void;
  onClose: () => void;
  tableName?: string;
};

const PAGE_SIZE = 1000;

const ExercisePickerModal: React.FC<Props> = ({
  visible,
  onPick,
  onClose,
  tableName = 'exercises',
}) => {
  const [allItems, setAllItems] = useState<ExerciseRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [filterVisible, setFilterVisible] = useState(false);

  // filter state
  const [selectedBodyParts, setSelectedBodyParts] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  /* -------------------------------------------------------
     FETCH ALL EXERCISES
  ------------------------------------------------------- */
  const resetState = useCallback(() => {
    setAllItems([]);
    setLoading(false);
    setFetchError(null);
    setQuery('');
  }, []);

  const fetchAllExercises = useCallback(async () => {
    setLoading(true);
    setFetchError(null);

    try {
      const rows: ExerciseRow[] = [];
      let offset = 0;

      while (true) {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .order('exercise_name', { ascending: true })
          .range(offset, offset + PAGE_SIZE - 1);

        if (error) throw error;

        const batch = (data ?? []) as ExerciseRow[];
        rows.push(...batch);

        if (batch.length < PAGE_SIZE) break;
        offset += PAGE_SIZE;
      }

      setAllItems(rows);
    } catch (e: any) {
      setFetchError(e?.message || 'Failed to fetch exercises.');
    } finally {
      setLoading(false);
    }
  }, [tableName]);

  useEffect(() => {
    if (visible) {
      resetState();
      fetchAllExercises();
    } else {
      resetState();
    }
  }, [visible, fetchAllExercises, resetState]);

  /* -------------------------------------------------------
     DERIVED FILTER OPTIONS
  ------------------------------------------------------- */
  const allBodyParts = useMemo(() => {
    const set = new Set<string>();
    allItems.forEach(ex => {
      getBodyParts(ex).forEach(bp => set.add(bp));
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [allItems]);

  const allCategories = useMemo(() => {
    const set = new Set<string>();
    allItems.forEach(ex => {
      const cat = getCategory(ex);
      if (cat) set.add(cat);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [allItems]);

  const clearFilters = () => {
    setSelectedBodyParts([]);
    setSelectedCategory(null);
    setSortDir('asc');
  };

  /* -------------------------------------------------------
     FILTER + SEARCH + SORT
  ------------------------------------------------------- */
  const filtered = useMemo(() => {
    let list = [...allItems];

    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(ex =>
        ex.exercise_name.toLowerCase().includes(q),
      );
    }

    if (selectedBodyParts.length > 0) {
      list = list.filter(ex => {
        const parts = getBodyParts(ex);
        return parts.some(p => selectedBodyParts.includes(p));
      });
    }

    if (selectedCategory) {
      list = list.filter(ex => getCategory(ex) === selectedCategory);
    }

    list.sort((a, b) => {
      const la = a.exercise_name.toLowerCase();
      const lb = b.exercise_name.toLowerCase();
      return sortDir === 'asc' ? la.localeCompare(lb) : lb.localeCompare(la);
    });

    return list;
  }, [allItems, query, selectedBodyParts, selectedCategory, sortDir]);

  const clearSearch = () => setQuery('');

  const showInfo = (exercise: ExerciseRow) => {
    Alert.alert(exercise.exercise_name, exercise.info || 'No details available');
  };

  /* -------------------------------------------------------
     RENDER ITEM
  ------------------------------------------------------- */
  const renderItem = ({ item }: { item: ExerciseRow }) => (
    <View style={styles.row}>
      <TouchableOpacity
        style={styles.rowMain}
        onPress={() => onPick({ id: item.id, exercise_name: item.exercise_name })}
      >
        <Text style={styles.rowText}>{item.exercise_name}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => showInfo(item)} style={styles.infoBtn}>
        <MaterialIcons name="info-outline" size={20} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  /* -------------------------------------------------------
     MAIN RETURN
  ------------------------------------------------------- */
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.container}>

          {/* Header Row */}
          <View style={styles.headerRow}>
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => setShowCustomModal(true)}
            >
              <MaterialIcons name="add" size={20} color="#fff" />
              <Text style={styles.addBtnText}>Add</Text>
            </TouchableOpacity>

            <Text style={styles.title}>Select Exercise</Text>
            <View style={{ width: 50 }} />
            {/* Filter Button */}
            <TouchableOpacity
              style={styles.filterBtn}
              onPress={() => setFilterVisible(true)}
            >
              <MaterialIcons name="filter-list" size={18} color="#fff" />
              <Text style={styles.filterBtnText}>Filters</Text>
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={styles.searchWrap}>
            <MaterialIcons name="search" size={20} color="#ddd" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search exercises..."
              placeholderTextColor="#888"
              value={query}
              onChangeText={setQuery}
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={clearSearch}>
                <MaterialIcons name="close" size={18} color="#ccc" />
              </TouchableOpacity>
            )}
          </View>

          {/* List */}
          {loading ? (
            <View style={styles.loader}>
              <ActivityIndicator />
              <Text style={styles.loaderText}>Loading exercises…</Text>
            </View>
          ) : fetchError ? (
            <View style={styles.loader}>
              <Text style={[styles.loaderText, { color: '#ff9b9b' }]}>
                {fetchError}
              </Text>
              <TouchableOpacity style={styles.retryBtn} onPress={fetchAllExercises}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={item => item.id}
              renderItem={renderItem}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Text style={styles.loaderText}>
                    {query ? 'No matches found.' : 'No exercises found.'}
                  </Text>
                </View>
              }
            />
          )}

          {/* Cancel Btn */}
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ---------------- FILTER MODAL ---------------- */}
      <Modal
        visible={filterVisible}
        transparent
        animationType="fade"
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
                style={[styles.chip, sortDir === 'asc' && styles.chipActive]}
                onPress={() => setSortDir('asc')}
              >
                <Text style={styles.chipText}>A → Z</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.chip, sortDir === 'desc' && styles.chipActive]}
                onPress={() => setSortDir('desc')}
              >
                <Text style={styles.chipText}>Z → A</Text>
              </TouchableOpacity>
            </View>

            {/* Body Parts */}
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
                        ]}
                        onPress={() =>
                          setSelectedBodyParts(prev =>
                            prev.includes(bp)
                              ? prev.filter(x => x !== bp)
                              : [...prev, bp]
                          )
                        }
                      >
                        <Text style={styles.chipText}>{bp}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}

            {/* Categories */}
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
                        ]}
                        onPress={() =>
                          setSelectedCategory(prev => (prev === cat ? null : cat))
                        }
                      >
                        <Text style={styles.chipText}>{cat}</Text>
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

      {/* Custom Exercise Modal */}
      <CustomExerciseModal
        visible={showCustomModal}
        onClose={() => setShowCustomModal(false)}
        onSuccess={() => {
          setShowCustomModal(false);
          fetchAllExercises();
        }}
      />
    </Modal>
  );
};

/* -------------------------------------------------------
   STYLES
------------------------------------------------------- */

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    maxHeight: '80%',
    padding: 16,
  },

  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    alignItems: 'center',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a3350',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  addBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  title: { color: '#fff', fontSize: 16, fontWeight: '700' },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1b2337',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderColor: '#2a3350',
    borderWidth: 1,
    gap: 8,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
  },

  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    backgroundColor: '#2a3350',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 6,
    marginBottom: 8,
  },
  filterBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: '#222b46',
  },
  rowMain: {
    flex: 1,
    paddingVertical: 12,
  },
  rowText: {
    color: '#fff',
    fontSize: 14,
  },
  infoBtn: {
    paddingHorizontal: 8,
    paddingVertical: 12,
  },

  empty: {
    paddingVertical: 24,
    alignItems: 'center',
  },

  loader: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  loaderText: {
    color: '#dde2ff',
    marginTop: 8,
  },
  retryBtn: {
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#555e8a',
    borderRadius: 6,
  },
  retryText: { color: '#dde2ff' },

  closeBtn: {
    marginTop: 12,
    alignItems: 'center',
  },
  closeText: {
    color: '#e7ecff',
    fontSize: 16,
  },

  /* Filter Modal */
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  modalCard: {
    backgroundColor: Colors.dark.card,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 20,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  clearText: {
    color: '#F97373',
    fontSize: 12,
  },
  modalSectionTitle: {
    marginTop: 12,
    marginBottom: 6,
    color: '#ccc',
    fontSize: 13,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#1b2337',
  },
  chipActive: {
    backgroundColor: Colors.dark.highlight1,
  },
  chipText: { color: '#fff', fontSize: 12 },

  modalCloseBtn: {
    marginTop: 20,
    alignSelf: 'center',
    backgroundColor: Colors.dark.highlight1,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 22,
  },
  modalCloseText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});

export default ExercisePickerModal;
