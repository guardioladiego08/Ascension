import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useLocalSearchParams, useRouter } from 'expo-router';
import MapboxGL from '@rnmapbox/maps';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/Colors';
import { TouchableOpacity, Text } from 'react-native';

export default function OutdoorSessionMap() {
  const { session_id } = useLocalSearchParams<{ session_id: string }>();
  const [coords, setCoords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('cardio_coordinates')
        .select('latitude, longitude')
        .eq('session_id', session_id)
        .order('timestamp', { ascending: true });

      if (!error && data) setCoords(data);
      setLoading(false);
    })();
  }, [session_id]);

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={Colors.dark.highlight1} size="large" />
      </View>
    );
  }

  if (!coords.length) {
    return (
      <View style={styles.loader}>
        <MapboxGL.MapView style={{ flex: 1 }} />
      </View>
    );
  }

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
      <View style={styles.container}>
        {/* 🔙 Simple back button */}
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <MapboxGL.MapView style={StyleSheet.absoluteFill} styleURL={MapboxGL.StyleURL.Dark}>
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
    </GestureHandlerRootView>
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
  backText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
});
