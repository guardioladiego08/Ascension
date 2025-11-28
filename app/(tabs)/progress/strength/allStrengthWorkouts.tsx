// app/(tabs)/progress/strength/allStrengthWorkouts.tsx
import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { GlobalStyles } from '@/constants/GlobalStyles';
import LogoHeader from '@/components/my components/logoHeader';
import StrengthWorkoutCard, {
  StrengthWorkoutRow,
} from './StrengthWorkoutCard';
import { supabase } from '@/lib/supabase';
import { router, useFocusEffect } from 'expo-router'; // 👈 add useFocusEffect

type FilterKey = 'all' | '7d' | '30d';

const AllStrengthWorkoutsScreen: React.FC = () => {
  const [workouts, setWorkouts] = useState<StrengthWorkoutRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  // 🔁 Fetch function reused on focus
  const fetchAllWorkouts = useCallback(async () => {
    try {
      setLoading(true);

      const { data: authData, error: userError } = await supabase.auth.getUser();
      console.log(
        'auth user in allStrengthWorkouts:',
        authData?.user?.id,
        userError
      );

      const { data, error } = await supabase
        .from('strength_workouts')
        .select('id, started_at, ended_at, total_vol, notes')
        .order('started_at', { ascending: false });

      console.log('strength_workouts rows:', data?.length, 'error:', error);

      if (error) throw error;

      setWorkouts((data ?? []) as StrengthWorkoutRow[]);
    } catch (err) {
      console.warn('Error loading all strength workouts', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // ✅ Run fetch whenever this screen becomes focused (including after delete)
  useFocusEffect(
    useCallback(() => {
      fetchAllWorkouts();
    }, [fetchAllWorkouts])
  );

  // (You can delete the old useEffect(() => { fetchAllWorkouts(); }, []) if you had it)

  const filteredWorkouts = useMemo(() => {
    if (filter === 'all') return workouts;

    const days = filter === '7d' ? 7 : 30;
    const now = new Date();
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    return workouts.filter(w => new Date(w.started_at) >= cutoff);
  }, [workouts, filter]);

  const handleFilterSelect = (key: FilterKey) => {
    setFilter(key);
    setFilterModalVisible(false);
  };

  const getFilterLabel = () => {
    switch (filter) {
      case '7d':
        return 'Last 7 days';
      case '30d':
        return 'Last 30 days';
      default:
        return 'All workouts';
    }
  };

  return (
    <View style={styles.container}>
      <LogoHeader />

      <View style={styles.headerRow}>
        <Text style={styles.heading}>All Strength Workouts</Text>
        <TouchableOpacity
          style={styles.filterButton}
          activeOpacity={0.8}
          onPress={() => setFilterModalVisible(true)}
        >
          <Ionicons name="funnel-outline" size={16} color="#E5E7F5" />
          <Text style={styles.filterText}>{getFilterLabel()}</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator />
          <Text style={styles.loadingText}>Loading workouts...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
        >
          {filteredWorkouts.length === 0 ? (
            <Text style={styles.emptyText}>
              No strength workouts found for this range.
            </Text>
          ) : (
            filteredWorkouts.map(workout => (
              <StrengthWorkoutCard
                key={workout.id}
                workout={workout}
                onPress={() => router.push(`/add/Strength/${workout.id}`)}
              />
            ))
          )}
        </ScrollView>
      )}

      {/* modal code unchanged... */}
    </View>
  );
};

export default AllStrengthWorkoutsScreen;


// styles same as before
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
    paddingHorizontal: 16,
  },
  headerRow: {
    marginTop: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heading: {
    fontSize: 18,
    color: '#E5E7F5',
    fontWeight: '700',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.card,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  filterText: {
    marginLeft: 6,
    fontSize: 12,
    color: '#E5E7F5',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 12,
    color: '#9DA4C4',
  },
  emptyText: {
    fontSize: 13,
    color: '#9DA4C4',
    marginTop: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCard: {
    width: '80%',
    backgroundColor: Colors.dark.card,
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  modalTitle: {
    fontSize: 15,
    color: '#E5E7F5',
    fontWeight: '600',
    marginBottom: 10,
  },
  modalOption: {
    paddingVertical: 8,
  },
  modalOptionText: {
    fontSize: 13,
    color: '#9DA4C4',
  },
  modalOptionTextActive: {
    color: '#A5B4FC',
    fontWeight: '600',
  },
  modalClose: {
    marginTop: 12,
    alignSelf: 'flex-end',
  },
  modalCloseText: {
    fontSize: 13,
    color: '#E5E7F5',
  },
});
