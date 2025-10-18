// app/(tabs)/stats/cardio/Cardio.tsx
// Tensr Fitness — Cardio (dashboard) with optimistic delete, focus refresh, and Realtime fallback

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
  type: string; // normalized string (e.g. "Indoor Run", "Outdoor Walk")
  started_at: string;
  total_time: string | null;
  total_distance: number | null;
  avg_pace: number | null;
  avg_incline?: number | null;
  avg_elevation?: number | null;
};

export default function Cardio({ limit = 10 }: { limit?: number }) {
  const [sessions, setSessions] = useState<CardioSession[]>([]);
  const [selected, setSelected] = useState<CardioSession | null>(null);
  const [loading, setLoading] = useState(true);
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // ✅ Fetch + map numeric session_type → descriptive type string
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
    } else if (isMounted.current) {
      const normalized = (data || []).map((s: any) => ({
        ...s,
        type:
          s.session_type === 1
            ? 'Outdoor Walk'
            : s.session_type === 2
            ? 'Outdoor Run'
            : s.session_type === 3
            ? 'Indoor Walk'
            : s.session_type === 4
            ? 'Indoor Run'
            : 'Unknown',
      }));
      setSessions(normalized);
    }

    if (isMounted.current) setLoading(false);
  }, [limit]);

  // 🔁 Initial + focus + realtime refreshes
  useEffect(() => {
    fetchRecent();
  }, [fetchRecent]);

  useFocusEffect(
    useCallback(() => {
      fetchRecent();
    }, [fetchRecent])
  );

  useEffect(() => {
    const channel = supabase
      .channel('cardio_sessions_live_cardio')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cardio_sessions' },
        () => fetchRecent()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchRecent]);

  const handleDeleted = (id: string) => {
    setSessions(prev => prev.filter(s => s.id !== id));
    setSelected(null);
    fetchRecent();
  };

  // ✅ Detect any indoor activity (either walk or run)
  const isIndoor = selected?.type?.toLowerCase().includes('indoor');

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
                onPress={() => setSelected(session)}
                style={{ backgroundColor: '#5a5a5a' }}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* --- Bottom Button --- */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.allBtn}
          onPress={() => router.push('/(tabs)/stats/cardio/allCardioActivities')}
        >
          <Text style={styles.allBtnText}>View All Activities</Text>
        </TouchableOpacity>
      </View>

      {/* --- Indoor Activity Modal --- */}
      <Modal visible={!!selected && isIndoor} transparent animationType="slide">
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
