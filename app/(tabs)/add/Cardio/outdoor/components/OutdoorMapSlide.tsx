import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MapView, { Marker, Polyline, type LatLng } from 'react-native-maps';
import { Colors } from '@/constants/Colors';

type Props = {
  coords: LatLng[]; // [{ latitude, longitude }, ...]
};

const CARD = Colors.dark.card;
const TEXT = Colors.dark.text;

export default function OutdoorMapSlide({ coords }: Props) {
  const mapRef = useRef<MapView | null>(null);

  const hasCoords = coords.length > 0;

  const initialRegion = useMemo(() => {
    const last = coords[coords.length - 1];
    // Fallback region if no coords yet (will rarely be used since slide only appears after start)
    if (!last) {
      return {
        latitude: 37.7749,
        longitude: -122.4194,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      };
    }
    return {
      latitude: last.latitude,
      longitude: last.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };
  }, [coords]);

  useEffect(() => {
    if (!hasCoords) return;
    // Fit route in view (best-effort)
    mapRef.current?.fitToCoordinates(coords, {
      edgePadding: { top: 60, right: 40, bottom: 60, left: 40 },
      animated: true,
    });
  }, [hasCoords, coords]);

  return (
    <View style={styles.wrap}>
      {!hasCoords ? (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderTitle}>Waiting for GPS…</Text>
          <Text style={styles.placeholderBody}>
            Start moving to see your route appear on the map.
          </Text>
        </View>
      ) : (
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          initialRegion={initialRegion}
          showsUserLocation
          showsMyLocationButton={false}
          rotateEnabled={false}
        >
          <Polyline coordinates={coords} strokeWidth={4} />
          {coords[0] && <Marker coordinate={coords[0]} title="Start" />}
          {coords[coords.length - 1] && <Marker coordinate={coords[coords.length - 1]} title="Current" />}
        </MapView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: CARD,
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  placeholderTitle: {
    color: TEXT,
    fontWeight: '900',
    fontSize: 16,
    marginBottom: 6,
  },
  placeholderBody: {
    color: TEXT,
    opacity: 0.75,
    fontWeight: '700',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
});
