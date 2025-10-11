// components/my components/cardio/IndoorActivityModal.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { supabase } from '@/lib/supabase';
import CardioSummaryChart from '../charts/CardioSummaryChart';
import { Colors } from '@/constants/Colors';

const ORANGE = Colors.dark.highlight1;
const BLUE = '#4DD0E1';
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
  const [paceData, setPaceData] = useState<{ label: string; value: number }[]>([]);
  const [elevationData, setElevationData] = useState<{ label: string; value: number }[]>([]);
  const [loading, setLoading] = useState(true);

  // 🔹 Fetch all sample data for this session
  useEffect(() => {
    const fetchSamples = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('cardio_samples')
        .select('recorded_at, pace, elevation')
        .eq('session_id', session.id)
        .order('recorded_at', { ascending: true });

      if (error) {
        console.error('Error loading cardio_samples:', error);
      } else if (data && data.length) {
        const pace = data
          .filter((d: any) => d.pace !== null)
          .map((d: any) => ({
            label: d.recorded_at,
            value: Number(d.pace),
          }));

        const elevation = data
          .filter((d: any) => d.elevation !== null)
          .map((d: any) => ({
            label: d.recorded_at,
            value: Number(d.elevation),
          }));

        setPaceData(pace);
        setElevationData(elevation);
      } else {
        setPaceData([]);
        setElevationData([]);
      }
      setLoading(false);
    };

    fetchSamples();
  }, [session.id]);

  // 🔹 Safe value formatting
  const safe = (val: number | null | undefined, unit = '', digits = 2) =>
    val === null || val === undefined || isNaN(Number(val))
      ? '—'
      : `${Number(val).toFixed(digits)}${unit}`;

  return (
    <View style={styles.backdrop}>
      <View style={styles.sheet}>
        <Text style={styles.title}>Indoor Run Summary</Text>

        {/* --- Summary metrics --- */}
        <View style={styles.row}>
          <Metric label="Distance" value={`${safe(session.total_distance, ' mi')}`} />
          <Metric label="Time" value={session.total_time ?? '—'} />
          <Metric label="Avg Pace" value={`${safe(session.avg_pace, ' /mi')}`} />
        </View>

        {/* --- Charts --- */}
        {loading ? (
          <ActivityIndicator color={ORANGE} style={{ marginTop: 16 }} />
        ) : (
          <>
            {paceData.length > 0 ? (
              <CardioSummaryChart
                title="Pace Over Time"
                color="#4DD0E1"
                data={paceData}
                height={180}
              />
            ) : (
              <Text style={styles.noData}>No pace data available</Text>
            )}

            {elevationData.length > 0 ? (
              <CardioSummaryChart
                title="Elevation Over Time"
                color="#FF950A"
                data={elevationData}
                height={180}
              />
            ) : (
              <Text style={styles.noData}>No elevation data available</Text>
            )}
          </>
        )}

        {/* --- Close button --- */}
        <TouchableOpacity style={styles.btn} onPress={onClose}>
          <Text style={styles.btnText}>Close</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ---------- Subcomponents ----------
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricVal}>{value}</Text>
    </View>
  );
}

// ---------- Styles ----------
const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: '#0009',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#2f2f2f',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    gap: 8,
  },
  title: { color: WHITE, fontWeight: '800', fontSize: 16, marginBottom: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 8 },
  metricLabel: { color: WHITE, opacity: 0.9, fontSize: 12 },
  metricVal: { color: WHITE, fontWeight: '800', marginTop: 2 },
  noData: { color: '#bbb', textAlign: 'center', marginTop: 12 },
  btn: {
    backgroundColor: ORANGE,
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 12,
  },
  btnText: { color: WHITE, textAlign: 'center', fontWeight: '800' },
});
