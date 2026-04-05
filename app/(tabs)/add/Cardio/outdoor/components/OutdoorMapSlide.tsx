import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MapView, { Marker, Polyline, type LatLng } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';

import { useAppTheme } from '@/providers/AppThemeProvider';

type Props = {
  coords: LatLng[];
  isRunning: boolean;
};

const MAX_MAP_ZOOM = 20;
const MIN_MAP_ZOOM = 10;
const AUTO_CENTER_THROTTLE_MS = 1200;

export default function OutdoorMapSlide({ coords, isRunning }: Props) {
  const { colors, fonts } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);
  const mapRef = useRef<MapView | null>(null);
  const [followUser, setFollowUser] = useState(true);
  const lastAutoCenterAtRef = useRef(0);

  const hasCoords = coords.length > 0;
  const lastCoord = coords[coords.length - 1] ?? null;

  const initialRegion = useMemo(() => {
    if (!lastCoord) {
      return {
        latitude: 37.7749,
        longitude: -122.4194,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      };
    }
    return {
      latitude: lastCoord.latitude,
      longitude: lastCoord.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };
  }, [lastCoord]);

  const centerOnLatest = useCallback((animated: boolean) => {
    if (!mapRef.current || !lastCoord) return;
    mapRef.current.animateCamera(
      {
        center: {
          latitude: lastCoord.latitude,
          longitude: lastCoord.longitude,
        },
      },
      { duration: animated ? 380 : 0 }
    );
    lastAutoCenterAtRef.current = Date.now();
  }, [lastCoord]);

  useEffect(() => {
    if (!hasCoords || !followUser) return;
    const nowMs = Date.now();
    if (nowMs - lastAutoCenterAtRef.current < AUTO_CENTER_THROTTLE_MS) {
      return;
    }
    centerOnLatest(true);
  }, [centerOnLatest, followUser, hasCoords, lastCoord]);

  useEffect(() => {
    if (!isRunning) {
      setFollowUser(true);
    }
  }, [isRunning]);

  async function adjustZoom(delta: number) {
    if (!mapRef.current) return;
    try {
      const camera = await mapRef.current.getCamera();
      const nextZoom = Math.max(
        MIN_MAP_ZOOM,
        Math.min(MAX_MAP_ZOOM, (camera.zoom ?? 15) + delta)
      );
      mapRef.current.animateCamera({ ...camera, zoom: nextZoom }, { duration: 220 });
      setFollowUser(false);
    } catch {
      // ignore camera read failures
    }
  }

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
          zoomEnabled
          scrollEnabled
          pitchEnabled={false}
          toolbarEnabled={false}
          onTouchStart={() => {
            setFollowUser(false);
          }}
          onMapReady={() => {
            centerOnLatest(false);
          }}
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

      {hasCoords ? (
        <View style={styles.mapControls}>
          <TouchableOpacity
            style={styles.controlPill}
            onPress={() => {
              void adjustZoom(1);
            }}
          >
            <Ionicons name="add" size={18} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.controlPill}
            onPress={() => {
              void adjustZoom(-1);
            }}
          >
            <Ionicons name="remove" size={18} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.recenterBtn}
            onPress={() => {
              setFollowUser(true);
              centerOnLatest(true);
            }}
          >
            <Ionicons name="locate" size={16} color={colors.blkText} />
            <Text style={styles.recenterText}>
              {followUser ? 'Following' : 'Recenter'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}
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
    mapControls: {
      position: 'absolute',
      right: 12,
      bottom: 12,
      alignItems: 'flex-end',
      gap: 8,
    },
    controlPill: {
      width: 36,
      height: 36,
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.card3,
      borderWidth: 1,
      borderColor: colors.border,
    },
    recenterBtn: {
      minHeight: 36,
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.highlight1,
      borderWidth: 1,
      borderColor: colors.highlight1,
      flexDirection: 'row',
      gap: 6,
      paddingHorizontal: 12,
    },
    recenterText: {
      color: colors.blkText,
      fontFamily: fonts.heading,
      fontSize: 12,
      lineHeight: 14,
    },
  });
}
