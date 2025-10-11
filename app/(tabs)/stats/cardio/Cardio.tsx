// app/(tabs)/stats/cardio/Cardio.tsx
import React, { useEffect, useState } from 'react';
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
import { supabase } from '@/lib/supabase';
import LogoHeader from '@/components/my components/logoHeader';
import { GlobalStyles } from '@/constants/GlobalStyles';
import { Colors } from '@/constants/Colors';
import ActivityCard from '@/components/my components/cardio/ActivityCard';
import IndoorActivityModal from '@/components/my components/cardio/IndoorActivityModal';

type CardioSession = {
  id: string;
  type: 'indoor' | 'outdoor';
  started_at: string;
  total_time: string;
  total_distance: number;
  avg_pace: number;
  avg_incline?: number;
  avg_elevation?: number;
};

export default function Cardio({ limit = 10 }: { limit?: number }) {
  const [sessions, setSessions] = useState<CardioSession[]>([]);
  const [selected, setSelected] = useState<CardioSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSessions = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('cardio_sessions')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(limit);
      if (error) console.error(error);
      else setSessions(data || []);
      setLoading(false);
    };
    fetchSessions();
  }, [limit]);

  return (
    <SafeAreaView style={styles.safe}>
      <LogoHeader showBackButton />
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 24 }}>
        <Text style={GlobalStyles.header}>CARDIO</Text>

        <View style={styles.sectionHeader}>
          <Text style={GlobalStyles.subtitle}>RECENT SESSIONS</Text>
        </View>

        {loading ? (
          <ActivityIndicator color={Colors.dark.highlight1} size="large" />
        ) : (
          <View style={{ gap: 12 }}>
            {sessions.map((session) => (
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

      {/* Modal for Indoor Sessions */}
      <Modal visible={!!selected && selected.type === 'indoor'} transparent animationType="slide">
        <IndoorActivityModal session={selected!} onClose={() => setSelected(null)} />
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
});
