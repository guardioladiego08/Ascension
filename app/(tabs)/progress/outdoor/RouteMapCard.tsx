import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import { Colors } from '@/constants/Colors';

type Coord = { lat: number; lon: number };

type Props = {
  title?: string;
  coords: Coord[];
  height?: number;
};

const CARD = Colors.dark.card;
const TEXT = Colors.dark.text;
const MUTED = Colors.dark.textMuted ?? '#9AA4BF';
const ACCENT = Colors.dark.highlight1;

function computeBounds(coords: Coord[]) {
  let minLat = coords[0].lat;
  let maxLat = coords[0].lat;
  let minLon = coords[0].lon;
  let maxLon = coords[0].lon;

  for (const c of coords) {
    if (c.lat < minLat) minLat = c.lat;
    if (c.lat > maxLat) maxLat = c.lat;
    if (c.lon < minLon) minLon = c.lon;
    if (c.lon > maxLon) maxLon = c.lon;
  }

  return {
    ne: [maxLon, maxLat] as [number, number],
    sw: [minLon, minLat] as [number, number],
  };
}

export default function RouteMapCard({ title = 'Route', coords, height = 420 }: Props) {
  const lineFeature = useMemo(() => {
    if (!coords || coords.length < 2) return null;
    return {
      type: 'Feature' as const,
      geometry: {
        type: 'LineString' as const,
        coordinates: coords.map((c) => [c.lon, c.lat]),
      },
      properties: {},
    };
  }, [coords]);

  const startFeature = useMemo(() => {
    if (!coords || coords.length < 1) return null;
    const c = coords[0];
    return {
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [c.lon, c.lat] },
      properties: { kind: 'start' },
    };
  }, [coords]);

  const endFeature = useMemo(() => {
    if (!coords || coords.length < 2) return null;
    const c = coords[coords.length - 1];
    return {
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [c.lon, c.lat] },
      properties: { kind: 'end' },
    };
  }, [coords]);

  const bounds = useMemo(() => {
    if (!coords || coords.length < 2) return null;
    return computeBounds(coords);
  }, [coords]);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>

      {!lineFeature || !bounds ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Not enough route data.</Text>
        </View>
      ) : (
        <View style={[styles.mapWrap, { height }]}>
          <MapboxGL.MapView
            style={StyleSheet.absoluteFill}
            styleURL={MapboxGL.StyleURL.Dark}
            logoEnabled={false}
            compassEnabled
            attributionEnabled={false}
          >
            <MapboxGL.Camera
              bounds={{
                ne: bounds.ne,
                sw: bounds.sw,
                paddingLeft: 40,
                paddingRight: 40,
                paddingTop: 40,
                paddingBottom: 40,
              }}
              animationDuration={0}
            />

            <MapboxGL.ShapeSource id="routeSource" shape={lineFeature}>
              <MapboxGL.LineLayer
                id="routeLine"
                style={{
                  lineColor: ACCENT,
                  lineWidth: 4,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />
            </MapboxGL.ShapeSource>

            {startFeature && (
              <MapboxGL.ShapeSource id="startSource" shape={startFeature}>
                <MapboxGL.CircleLayer
                  id="startCircle"
                  style={{ circleRadius: 6, circleColor: '#7BE495' }}
                />
              </MapboxGL.ShapeSource>
            )}

            {endFeature && (
              <MapboxGL.ShapeSource id="endSource" shape={endFeature}>
                <MapboxGL.CircleLayer
                  id="endCircle"
                  style={{ circleRadius: 6, circleColor: '#FF6B6B' }}
                />
              </MapboxGL.ShapeSource>
            )}
          </MapboxGL.MapView>
        </View>
      )}

      <Text style={styles.note}>Route is based on stored GPS samples.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: CARD,
    borderRadius: 18,
    padding: 12,
    overflow: 'hidden',
  },
  title: {
    color: TEXT,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.6,
    marginBottom: 10,
    opacity: 0.9,
  },
  mapWrap: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  empty: {
    height: 180,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: TEXT,
    opacity: 0.65,
    fontSize: 12,
    fontWeight: '800',
  },
  note: {
    marginTop: 10,
    color: MUTED,
    fontSize: 11,
    fontWeight: '600',
  },
});
