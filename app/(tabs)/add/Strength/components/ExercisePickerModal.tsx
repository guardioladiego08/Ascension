// app/(tabs)/add/Strength/components/ExercisePickerModal.tsx
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
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';

type ExerciseRow = {
  id: string;
  exercise_name: string;
  info: string | null;
};

type Props = {
  visible: boolean;
  onPick: (ex: { id: string; exercise_name: string }) => void;
  onClose: () => void;
  tableName?: string; // defaults to 'exercises'
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
          .select('id, exercise_name, info')
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allItems;
    return allItems.filter(x => x.exercise_name.toLowerCase().includes(q));
  }, [allItems, query]);

  const clearSearch = () => setQuery('');

  const showInfo = (exercise: ExerciseRow) => {
    Alert.alert(exercise.exercise_name, exercise.info || 'No details available');
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.container}>
          <Text style={styles.title}>Select Exercise</Text>

          {/* Search bar */}
          <View style={styles.searchWrap}>
            <MaterialIcons name="search" size={20} color="#ddd" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search exercises..."
              placeholderTextColor="#888"
              value={query}
              onChangeText={setQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={clearSearch}>
                <MaterialIcons name="close" size={18} color="#ccc" />
              </TouchableOpacity>
            )}
          </View>

          {/* Content */}
          {loading ? (
            <View style={styles.loader}>
              <ActivityIndicator />
              <Text style={styles.loaderText}>Loading exercises…</Text>
            </View>
          ) : fetchError ? (
            <View style={styles.loader}>
              <Text style={[styles.loaderText, { color: '#ff9b9b' }]}>{fetchError}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={fetchAllExercises}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={item => item.id}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <View style={styles.row}>
                  <TouchableOpacity
                    style={styles.rowMain}
                    onPress={() =>
                      onPick({
                        id: item.id,
                        exercise_name: item.exercise_name,
                      })
                    }
                  >
                    <Text style={styles.rowText}>{item.exercise_name}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => showInfo(item)} style={styles.infoBtn}>
                    <MaterialIcons name="info-outline" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
              )}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Text style={styles.loaderText}>
                    {query ? 'No matches for your search.' : 'No exercises found.'}
                  </Text>
                </View>
              }
            />
          )}

          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default ExercisePickerModal;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#121827',
    borderRadius: 12,
    maxHeight: '80%',
    padding: 16,
  },
  title: {
    color: '#e7ecff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1b2337',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#2a3350',
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    color: '#f3f4ff',
    paddingVertical: 0,
    fontSize: 14,
  },
  loader: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loaderText: {
    color: '#dde2ff',
    marginTop: 8,
    fontSize: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: '#222b46',
  },
  rowMain: { flex: 1, paddingVertical: 12 },
  rowText: { color: '#f3f4ff', fontSize: 14 },
  infoBtn: { paddingHorizontal: 8, paddingVertical: 12 },
  empty: { paddingVertical: 24, alignItems: 'center' },
  closeBtn: { marginTop: 12, alignItems: 'center' },
  closeText: { color: '#e7ecff', fontSize: 16 },
  retryBtn: {
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#555e8a',
  },
  retryText: { color: '#dde2ff' },
});
