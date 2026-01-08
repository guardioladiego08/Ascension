import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import { Colors } from '@/constants/Colors';

const BORDER = Colors.dark.border ?? '#1F2937';

export default function OutdoorMap(props: {
  routeLonLat: number[][]; // [[lon,lat], ...]
}) {
  const geojson = useMemo(() => {
    return {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: props.routeLonLat },
          properties: {},
        },
      ],
    };
  }, [props.routeLonLat]);

  return (
    <View style={styles.wrap}>
      <MapboxGL.MapView style={styles.map} styleURL={MapboxGL.StyleURL.Dark}>
        <MapboxGL.Camera
          zoomLevel={15}
          followUserLocation={props.routeLonLat.length === 0}
          followUserMode="normal"
        />

        <MapboxGL.UserLocation visible />

        {props.routeLonLat.length > 1 && (
          <MapboxGL.ShapeSource id="route" shape={geojson as any}>
            <MapboxGL.LineLayer
              id="route-line"
              style={{
                lineWidth: 4,
                lineJoin: 'round',
                lineCap: 'round',
              }}
            />
          </MapboxGL.ShapeSource>
        )}
      </MapboxGL.MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: 320,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: BORDER,
  },
  map: { flex: 1 },
});
