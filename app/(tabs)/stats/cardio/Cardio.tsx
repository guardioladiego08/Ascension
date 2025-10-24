// app/(tabs)/stats/cardio/Cardio.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '@/lib/supabase';
import LogoHeader from '@/components/my components/logoHeader';
import { GlobalStyles } from '@/constants/GlobalStyles';
import { Colors } from '@/constants/Colors';
import ActivityCard from '@/components/my components/cardio/ActivityCard';
import IndoorActivityModal from '@/components/my components/cardio/IndoorActivityModal';

type CardioSession = {
  id: string;
  session_type: number;
  started_at: string;
  total_time: string | null;
  total_distance: number | null;
  avg_pace: number | null;
  avg_incline?: number | null;
  avg_elevation?: number | null;
  type?: string;
};

export default function Cardio({ limit = 10 }: { limit?: number }) {
  const [sessions, setSessions] = useState<CardioSession[]>([]);
  const [selected, setSelected] = useState<CardioSession | null>(null);
  const [loading, setLoading] = useState(true);
  const isMounted = useRef(true);

  const sessionTypeMap: Record<number, string> = {
    1: 'Outdoor Run',
    2: 'Outdoor Walk',
    3: 'Indoor Run',
    4: 'Indoor Walk',
  };

  const fetchRecent = useCallback(async () => {
    if (!isMounted.current) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('cardio_sessions')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error(error);
    } else if (data) {
      const normalized = data.map((s: any) => ({
        ...s,
        type: sessionTypeMap[s.session_type] || 'Other',
      }));
      setSessions(normalized);
    }
    setLoading(false);
  }, [limit]);

  useFocusEffect(
    useCallback(() => {
      fetchRecent();
    }, [fetchRecent])
  );

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const handleDeleted = (id: string) => {
    setSessions(prev => prev.filter(s => s.id !== id));
    setSelected(null);
    fetchRecent();
  };

  // Handle card tap — indoor opens modal, outdoor navigates to map
  const handleSessionPress = (session: CardioSession) => {
    const type = session.session_type;
    if (type === 3 || type === 4) {
      setSelected(session);
    } else if (type === 1 || type === 2) {
      router.push({
        pathname: '/(tabs)/stats/cardio/OutdoorSessionMap',
        params: { session_id: session.id },
      });
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <LogoHeader />
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
        <Text style={GlobalStyles.header}>CARDIO</Text>
        <View style={styles.sectionHeader}>
          <Text style={GlobalStyles.subtitle}>RECENT SESSIONS</Text>
        </View>

        {loading ? (
          <ActivityIndicator color={Colors.dark.highlight1} size="large" />
        ) : (
          <View style={{ gap: 12 }}>
            {sessions.map(session => (
              <ActivityCard
                key={session.id}
                session={session}
                onPress={() => handleSessionPress(session)}
                style={{ backgroundColor: '#5a5a5a' }}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.allBtn}
          onPress={() => router.push('/(tabs)/stats/cardio/allCardioActivities')}
        >
          <Text style={styles.allBtnText}>View All Activities</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={!!selected} transparent animationType="slide">
        {selected && (
          <IndoorActivityModal
            session={selected}
            onClose={() => setSelected(null)}
            onDeleted={handleDeleted}
          />
        )}
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.dark.background },
  container: { paddingHorizontal: 16 },
  sectionHeader: {
    marginTop: 16,
    marginBottom: 10,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
  },
  allBtn: {
    backgroundColor: Colors.dark.highlight1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  allBtnText: {
    color: Colors.dark.blkText,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
