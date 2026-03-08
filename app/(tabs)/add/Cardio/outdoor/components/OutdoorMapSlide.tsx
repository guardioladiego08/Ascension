import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MapView, { Marker, Polyline, type LatLng } from 'react-native-maps';

import { useAppTheme } from '@/providers/AppThemeProvider';

type Props = {
  coords: LatLng[];
};

export default function OutdoorMapSlide({ coords }: Props) {
  const { colors, fonts } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);
  const mapRef = useRef<MapView | null>(null);

  const hasCoords = coords.length > 0;

  const initialRegion = useMemo(() => {
    const last = coords[coords.length - 1];
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
    mapRef.current?.fitToCoordinates(coords, {
      edgePadding: { top: 60, right: 40, bottom: 60, left: 40 },
      animated: true,
    });
  }, [hasCoords, coords]);

  return (
    <View style={styles.wrap}>
      {!hasCoords ? (
        <View style={styles.placeholder}>
          <View style={styles.placeholderBadge}>
            <Text style={styles.placeholderBadgeText}>GPS</Text>
          </View>
          <Text style={styles.placeholderTitle}>Waiting for route data</Text>
          <Text style={styles.placeholderBody}>
            Start moving to see your path appear on the map.
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
          <Polyline
            coordinates={coords}
            strokeWidth={4}
            strokeColor={colors.highlight1}
          />
          {coords[0] ? (
            <Marker coordinate={coords[0]} title="Start" pinColor={colors.highlight3} />
          ) : null}
          {coords[coords.length - 1] ? (
            <Marker
              coordinate={coords[coords.length - 1]}
              title="Current"
              pinColor={colors.highlight1}
            />
          ) : null}
        </MapView>
      )}
    </View>
  );
}

function createStyles(
  colors: ReturnType<typeof useAppTheme>['colors'],
  fonts: ReturnType<typeof useAppTheme>['fonts']
) {
  return StyleSheet.create({
    wrap: {
      flex: 1,
      borderRadius: 24,
      overflow: 'hidden',
      backgroundColor: colors.card2,
      borderWidth: 1,
      borderColor: colors.border,
    },
    placeholder: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 22,
    },
    placeholderBadge: {
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 6,
      backgroundColor: colors.accentSoft,
      borderWidth: 1,
      borderColor: colors.glowPrimary,
      marginBottom: 14,
    },
    placeholderBadgeText: {
      color: colors.highlight1,
      fontFamily: fonts.label,
      fontSize: 11,
      lineHeight: 14,
      letterSpacing: 0.7,
      textTransform: 'uppercase',
    },
    placeholderTitle: {
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 18,
      lineHeight: 22,
      marginBottom: 6,
    },
    placeholderBody: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 19,
      textAlign: 'center',
    },
  });
}
