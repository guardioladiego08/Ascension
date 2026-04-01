import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapboxGL from '@rnmapbox/maps';

import { useAppTheme } from '@/providers/AppThemeProvider';

type Coord = {
  lat: number;
  lon: number;
};

type Props = {
  coords: Coord[];
  title?: string;
  subtitle?: string;
  height?: number;
};

function computeBounds(coords: Coord[]) {
  let minLat = coords[0].lat;
  let maxLat = coords[0].lat;
  let minLon = coords[0].lon;
  let maxLon = coords[0].lon;

  for (const coord of coords) {
    if (coord.lat < minLat) minLat = coord.lat;
    if (coord.lat > maxLat) maxLat = coord.lat;
    if (coord.lon < minLon) minLon = coord.lon;
    if (coord.lon > maxLon) maxLon = coord.lon;
  }

  return {
    ne: [maxLon, maxLat] as [number, number],
    sw: [minLon, minLat] as [number, number],
  };
}

export default function OutdoorSummaryRouteCard({
  coords,
  title = 'Route map',
  subtitle = 'Your recorded path from start to finish.',
  height = 248,
}: Props) {
  const { colors, fonts, globalStyles } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);

  const lineFeature = useMemo(() => {
    if (coords.length < 2) return null;

    return {
      type: 'Feature' as const,
      geometry: {
        type: 'LineString' as const,
        coordinates: coords.map((coord) => [coord.lon, coord.lat]),
      },
      properties: {},
    };
  }, [coords]);

  const startFeature = useMemo(() => {
    if (coords.length < 1) return null;
    const first = coords[0];
    return {
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [first.lon, first.lat],
      },
      properties: { kind: 'start' },
    };
  }, [coords]);

  const endFeature = useMemo(() => {
    if (coords.length < 2) return null;
    const last = coords[coords.length - 1];
    return {
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [last.lon, last.lat],
      },
      properties: { kind: 'end' },
    };
  }, [coords]);

  const bounds = useMemo(() => {
    if (coords.length < 2) return null;
    return computeBounds(coords);
  }, [coords]);

  return (
    <View style={[globalStyles.panelSoft, styles.card]}>
      <Text style={globalStyles.eyebrow}>Route replay</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>

      {!lineFeature || !bounds ? (
        <View style={[styles.emptyState, { height }]}>
          <Text style={styles.emptyTitle}>Route data unavailable</Text>
          <Text style={styles.emptySubtitle}>
            This session did not capture enough GPS points to draw the path.
          </Text>
        </View>
      ) : (
        <View style={[styles.mapWrap, { height }]}>
          <MapboxGL.MapView
            style={StyleSheet.absoluteFill}
            styleURL={MapboxGL.StyleURL.Dark}
            logoEnabled={false}
            attributionEnabled={false}
            compassEnabled={false}
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

            <MapboxGL.ShapeSource id="outdoorSummaryRoute" shape={lineFeature}>
              <MapboxGL.LineLayer
                id="outdoorSummaryRouteLine"
                style={{
                  lineColor: colors.highlight2,
                  lineWidth: 4,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />
            </MapboxGL.ShapeSource>

            {startFeature ? (
              <MapboxGL.ShapeSource id="outdoorSummaryRouteStart" shape={startFeature}>
                <MapboxGL.CircleLayer
                  id="outdoorSummaryRouteStartCircle"
                  style={{
                    circleRadius: 6,
                    circleColor: colors.highlight3,
                    circleStrokeWidth: 2,
                    circleStrokeColor: colors.blkText,
                  }}
                />
              </MapboxGL.ShapeSource>
            ) : null}

            {endFeature ? (
              <MapboxGL.ShapeSource id="outdoorSummaryRouteEnd" shape={endFeature}>
                <MapboxGL.CircleLayer
                  id="outdoorSummaryRouteEndCircle"
                  style={{
                    circleRadius: 6,
                    circleColor: colors.danger,
                    circleStrokeWidth: 2,
                    circleStrokeColor: colors.blkText,
                  }}
                />
              </MapboxGL.ShapeSource>
            ) : null}
          </MapboxGL.MapView>
        </View>
      )}

      <Text style={styles.note}>
        {coords.length >= 2
          ? `${coords.length} GPS points captured for this route.`
          : 'GPS-based route previews appear when at least two points are recorded.'}
      </Text>
    </View>
  );
}

function createStyles(
  colors: ReturnType<typeof useAppTheme>['colors'],
  fonts: ReturnType<typeof useAppTheme>['fonts']
) {
  return StyleSheet.create({
    card: {
      gap: 8,
      padding: 16,
    },
    title: {
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 22,
      lineHeight: 26,
    },
    subtitle: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 18,
    },
    mapWrap: {
      marginTop: 8,
      overflow: 'hidden',
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card2,
    },
    emptyState: {
      marginTop: 8,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card2,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
      gap: 6,
    },
    emptyTitle: {
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 16,
      lineHeight: 20,
      textAlign: 'center',
    },
    emptySubtitle: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 17,
      textAlign: 'center',
    },
    note: {
      color: colors.textOffSt,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 16,
    },
  });
}
