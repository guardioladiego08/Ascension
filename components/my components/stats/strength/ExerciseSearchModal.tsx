import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/Colors';
import { useRouter } from 'expo-router';

const ORANGE = '#FF950A';
const BG = Colors?.dark?.background ?? '#121212';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelectExercise?: (exerciseId: string, name: string) => void;
};

interface Exercise {
  id: string;
  exercise_name: string;
  workout_type: string;
  body_parts: number[];
  info?: string | null;
}

const ExerciseSearchModal: React.FC<Props> = ({ visible, onClose, onSelectExercise }) => {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [filtered, setFiltered] = useState<Exercise[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (visible) fetchExercises();
  }, [visible]);

  const fetchExercises = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('exercises')
      .select('id, exercise_name, workout_type, body_parts, info')
      .order('exercise_name', { ascending: true });

    if (error) {
      console.error('Error fetching exercises:', error);
      setLoading(false);
      return;
    }

    setExercises(data || []);
    setFiltered(data || []);
    setLoading(false);
  };

  const handleSearch = (text: string) => {
    setSearch(text);
    const lower = text.toLowerCase();
    setFiltered(
      exercises.filter((e) => e.exercise_name.toLowerCase().includes(lower))
    );
  };

    const renderExercise = ({ item }: { item: Exercise }) => (
    <TouchableOpacity
        style={styles.exerciseCard}
        activeOpacity={0.8}
        onPress={() => {
        onClose();
        router.push({
            pathname: '/stats/strength/ExerciseDetail',
            params: { id: item.id, name: item.exercise_name },
        });
        }}
    >
        <Text style={styles.exerciseName}>{item.exercise_name}</Text>
        <Text style={styles.exerciseDetail}>{item.workout_type.toUpperCase()}</Text>
    </TouchableOpacity>
    );

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modalBox}>
          <View style={styles.headerRow}>
            <Text style={styles.headerText}>SEARCH EXERCISE</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          <TextInput
            placeholder="Search by name..."
            placeholderTextColor="#aaa"
            value={search}
            onChangeText={handleSearch}
            style={styles.input}
          />

          {loading ? (
            <ActivityIndicator color={ORANGE} style={{ marginTop: 20 }} />
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.id}
              renderItem={renderExercise}
              style={{ marginTop: 10 }}
              contentContainerStyle={{ paddingBottom: 20 }}
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalBox: {
    backgroundColor: BG,
    width: '100%',
    maxHeight: '80%',
    borderRadius: 12,
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerText: {
    color: ORANGE,
    fontWeight: '800',
    fontSize: 16,
  },
  closeBtn: {
    color: '#fff',
    fontSize: 18,
  },
  input: {
    backgroundColor: '#2b2b2b',
    color: '#fff',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 13,
  },
  exerciseCard: {
    backgroundColor: '#333',
    borderRadius: 8,
    padding: 10,
    marginVertical: 4,
  },
  exerciseName: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  exerciseDetail: {
    color: '#ccc',
    fontSize: 12,
  },
});

export default ExerciseSearchModal;
