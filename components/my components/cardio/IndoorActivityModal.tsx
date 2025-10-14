// components/my components/cardio/IndoorActivityModal.tsx
// Tensr Fitness — IndoorActivityModal with reliable delete + parent refresh
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Animated,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import CardioSummaryChart from '../charts/CardioSummaryChart';
import { Colors } from '@/constants/Colors';

const ORANGE = Colors.dark.highlight1;
const BLUE = '#4DD0E1';
const WHITE = '#FFFFFF';

type Session = {
  id: string;
  type: 'indoor' | 'outdoor';
  started_at: string;
  total_distance: number | null;
  total_time: string | null;
  avg_pace: number | null;
  avg_incline?: number | null;
  avg_elevation?: number | null;
};

type Props = {
  session: Session;
  onClose: () => void;
  /** parent uses this to optimistically remove + refetch */
  onDeleted?: (id: string) => void;
};

export default function IndoorActivityModal({ session, onClose, onDeleted }: Props) {
  const [paceData, setPaceData] = useState<{ label: string; value: number }[]>([]);
  const [elevationData, setElevationData] = useState<{ label: string; value: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);
  const fadeAnim = useState(new Animated.Value(0))[0];

  const fetchSamples = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('cardio_samples')
      .select('recorded_at, pace, elevation')
      .eq('session_id', session.id)
      .order('recorded_at', { ascending: true });

    if (!error && data) {
      setPaceData(
        data.filter((d) => d.pace != null).map((d) => ({ label: d.recorded_at, value: Number(d.pace) }))
      );
      setElevationData(
        data.filter((d) => d.elevation != null).map((d) => ({ label: d.recorded_at, value: Number(d.elevation) }))
      );
    } else {
      setPaceData([]);
      setElevationData([]);
    }
    setLoading(false);
  }, [session.id]);

  useEffect(() => {
    fetchSamples();
  }, [fetchSamples]);

  const handleDelete = () => {
    Alert.alert(
      'Delete Session?',
      'This will permanently remove this session and all related samples.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            // If your FK on cardio_samples(session_id) has ON DELETE CASCADE, this one delete is enough.
            const { error } = await supabase.from('cardio_sessions').delete().eq('id', session.id);
            if (error) {
              console.error('Delete failed:', error);
              Alert.alert('Error', 'Could not delete session. Check RLS & FK cascade.');
              return;
            }

            // 🔑 notify parent BEFORE closing to avoid race on unmount
            onDeleted?.(session.id);

            // success banner for UX
            setShowSuccess(true);
            Animated.timing(fadeAnim, { toValue: 1, duration: 180, useNativeDriver: true }).start();
            setTimeout(() => {
              Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => {
                setShowSuccess(false);
                onClose();
              });
            }, 900);
          },
        },
      ]
    );
  };

  const safe = (val: number | null | undefined, unit = '', digits = 2) =>
    val == null || Number.isNaN(Number(val)) ? '—' : `${Number(val).toFixed(digits)}${unit}`;

  return (
    <View style={styles.backdrop}>
      <View style={styles.sheet}>
        <Text style={styles.title}>Indoor Run Summary</Text>

        <View style={styles.row}>
          <Metric label="Distance" value={`${safe(session.total_distance, ' mi')}`} />
          <Metric label="Time" value={session.total_time ?? '—'} />
          <Metric label="Avg Pace" value={`${safe(session.avg_pace, ' /mi')}`} />
        </View>

        {loading ? (
          <ActivityIndicator color={ORANGE} style={{ marginTop: 16 }} />
        ) : (
          <>
            {paceData.length ? (
              <CardioSummaryChart title="Pace Over Time" color={BLUE} data={paceData} height={180} />
            ) : (
              <Text style={styles.noData}>No pace data</Text>
            )}
            {elevationData.length ? (
              <CardioSummaryChart title="Elevation Over Time" color={ORANGE} data={elevationData} height={180} />
            ) : (
              <Text style={styles.noData}>No elevation data</Text>
            )}
          </>
        )}

        <View style={styles.buttonRow}>
          <TouchableOpacity style={[styles.btn, styles.deleteBtn]} onPress={handleDelete}>
            <Text style={styles.btnText}>Delete</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btn} onPress={onClose}>
            <Text style={styles.btnText}>Close</Text>
          </TouchableOpacity>
        </View>

        {showSuccess && (
          <Animated.View style={[styles.successPopup, { opacity: fadeAnim }]}>
            <Text style={styles.successText}>Session deleted</Text>
          </Animated.View>
        )}
      </View>
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricVal}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#0009', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#2f2f2f',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    gap: 8,
    position: 'relative',
  },
  title: { color: WHITE, fontWeight: '800', fontSize: 16, marginBottom: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 8 },
  metricLabel: { color: WHITE, opacity: 0.9, fontSize: 12 },
  metricVal: { color: WHITE, fontWeight: '800', marginTop: 2 },
  noData: { color: '#bbb', textAlign: 'center', marginTop: 12 },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, gap: 10 },
  btn: { flex: 1, backgroundColor: ORANGE, borderRadius: 10, paddingVertical: 12 },
  deleteBtn: { backgroundColor: '#D9534F' },
  btnText: { color: WHITE, textAlign: 'center', fontWeight: '800' },
  successPopup: {
    position: 'absolute',
    top: '40%',
    left: 0,
    right: 0,
    backgroundColor: '#28a745',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    alignSelf: 'center',
    marginHorizontal: 20,
  },
  successText: { color: 'white', fontWeight: '700', fontSize: 15 },
});
