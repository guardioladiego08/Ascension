import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  View,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  Text,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useLocalSearchParams, useRouter } from 'expo-router';
import MapboxGL from '@rnmapbox/maps';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/Colors';

export default function OutdoorSessionMap() {
  const { session_id } = useLocalSearchParams<{ session_id: string }>();
  const [coords, setCoords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const router = useRouter();
  const sheetRef = useRef<BottomSheet>(null);

  // Bottom sheet snap points (percentage of screen height)
  const snapPoints = useMemo(() => ['20%', '40%', '75%'], []);

  // Fetch route coordinates + session summary
  useEffect(() => {
    (async () => {
      const [{ data: coordData, error: coordError }, { data: sessionData, error: sessionError }] =
        await Promise.all([
          supabase
            .from('cardio_coordinates')
            .select('latitude, longitude')
            .eq('session_id', session_id)
            .order('timestamp', { ascending: true }),
          supabase
            .from('cardio_sessions')
            .select('*')
            .eq('id', session_id)
            .single(),
        ]);

      if (!coordError && coordData) setCoords(coordData);
      if (!sessionError && sessionData) setSession(sessionData);
      setLoading(false);
    })();
  }, [session_id]);

  // Basic loaders
  if (loading)
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={Colors.dark.highlight1} size="large" />
      </View>
    );

  if (!coords.length)
    return (
      <View style={styles.loader}>
        <Text style={{ color: '#fff' }}>No GPS data for this session.</Text>
      </View>
    );

  // Construct GeoJSON line
  const lineString = {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: coords.map(c => [c.longitude, c.latitude]),
    },
  };

  const start = coords[0];

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* Map Section */}
      <View style={styles.container}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <MapboxGL.MapView
          style={StyleSheet.absoluteFill}
          styleURL={MapboxGL.StyleURL.Dark}
        >
          <MapboxGL.Camera
            zoomLevel={13}
            centerCoordinate={[start.longitude, start.latitude]}
          />
          <MapboxGL.ShapeSource id="route" shape={lineString}>
            <MapboxGL.LineLayer
              id="line"
              style={{
                lineColor: '#FF950A',
                lineWidth: 4,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
          </MapboxGL.ShapeSource>
        </MapboxGL.MapView>
      </View>

      {/* Draggable Summary Panel */}
      <BottomSheet
        ref={sheetRef}
        index={0}
        snapPoints={snapPoints}
        backgroundStyle={styles.sheetBg}
        handleIndicatorStyle={styles.sheetHandle}
      >
        <BottomSheetScrollView
          style={styles.sheetContent}
          contentContainerStyle={{ paddingBottom: 60 }}
        >
          <Text style={styles.summaryTitle}>RUN SUMMARY</Text>

          <View style={styles.metricsRow}>
            <Metric label="TOTAL TIME" value={session?.total_time || '--'} />
            <Metric
              label="DISTANCE"
              value={session?.total_distance ? `${session.total_distance.toFixed(2)} mi` : '--'}
            />
            <Metric
              label="AVG PACE"
              value={session?.avg_pace ? `${session.avg_pace.toFixed(2)} /mi` : '--'}
            />
          </View>

          <View style={styles.metricsRow}>
            <Metric
              label="ELEVATION"
              value={session?.avg_elevation ? `${session.avg_elevation.toFixed(0)} ft` : '--'}
            />
            <Metric
              label="INCLINE"
              value={session?.avg_incline ? `${session.avg_incline.toFixed(1)}°` : '--'}
            />
          </View>

          <Text style={styles.notesHeader}>Notes</Text>
          <Text style={styles.notesText}>
            This summary reflects your recorded GPS track and average metrics from this outdoor
            session. Future updates will include heart rate, splits, and weather.
          </Text>
        </BottomSheetScrollView>
      </BottomSheet>
    </GestureHandlerRootView>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
  },
  backBtn: {
    position: 'absolute',
    top: 40,
    left: 16,
    zIndex: 10,
    backgroundColor: '#222',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  backText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  sheetBg: { backgroundColor: '#1E1E1E' },
  sheetHandle: { backgroundColor: '#555', width: 50 },
  sheetContent: { paddingHorizontal: 20 },
  summaryTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    marginVertical: 10,
    letterSpacing: 0.5,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 8,
  },
  metric: { alignItems: 'flex-start', flex: 1 },
  metricLabel: { color: '#bbb', fontSize: 12, marginBottom: 4 },
  metricValue: { color: '#fff', fontSize: 16, fontWeight: '700' },
  notesHeader: {
    color: '#fff',
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 6,
  },
  notesText: { color: '#aaa', fontSize: 13, lineHeight: 18 },
});
