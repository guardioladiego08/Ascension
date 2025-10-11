// components/my components/cardio/IndoorActivityModal.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { supabase } from '@/lib/supabase';
import BasicChart, { WeightPoint } from '@/components/my componentscharts/BasicChart';
import { Colors } from '@/constants/Colors';

const ORANGE = Colors.dark.highlight1;
const WHITE = '#FFFFFF';

type Session = {
  id: string;
  started_at: string;
  total_distance: number | null;
  total_time: string | null;
  avg_pace: number | null;
  avg_incline?: number | null;
  avg_elevation?: number | null;
};

export default function IndoorActivityModal({
  session,
  onClose,
}: {
  session: Session;
  onClose: () => void;
}) {
  const [chartData, setChartData] = useState<WeightPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSamples = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('cardio_samples')
        .select('recorded_at, distance')
        .eq('session_id', session.id)
        .order('recorded_at', { ascending: true });

      if (error) {
        console.error(error);
      } else {
        const formatted = data.map((d: any) => ({
          label: d.recorded_at.split('T')[0],
          value: Number(d.distance),
        }));
        setChartData(formatted);
      }
      setLoading(false);
    };

    fetchSamples();
  }, [session.id]);

  // Helper to format safely
  const safe = (val: number | null | undefined, unit = '', digits = 2) =>
    val === null || val === undefined || isNaN(Number(val))
      ? '—'
      : `${Number(val).toFixed(digits)}${unit}`;

  return (
    <View style={styles.backdrop}>
      <View style={styles.sheet}>
        <Text style={styles.title}>Indoor Run Summary</Text>

        <View style={styles.row}>
          <Metric label="Distance" value={`${safe(session.total_distance, ' mi')}`} />
          <Metric label="Time" value={session.total_time ?? '—'} />
          <Metric label="Pace" value={`${safe(session.avg_pace, ' /mi')}`} />
        </View>

        {loading ? (
          <ActivityIndicator color={ORANGE} style={{ marginTop: 16 }} />
        ) : chartData.length > 0 ? (
          <BasicChart title="Distance Over Time" color={ORANGE} data={chartData} />
        ) : (
          <Text style={styles.noData}>No sample data available</Text>
        )}

        <TouchableOpacity style={styles.btn} onPress={onClose}>
          <Text style={styles.btnText}>Close</Text>
        </TouchableOpacity>
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
  },
  title: { color: WHITE, fontWeight: '800', fontSize: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 8 },
  metricLabel: { color: WHITE, opacity: 0.9, fontSize: 12 },
  metricVal: { color: WHITE, fontWeight: '800', marginTop: 2 },
  btn: {
    backgroundColor: ORANGE,
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 10,
  },
  btnText: { color: WHITE, textAlign: 'center', fontWeight: '800' },
  noData: { color: '#bbb', textAlign: 'center', marginTop: 12 },
});
