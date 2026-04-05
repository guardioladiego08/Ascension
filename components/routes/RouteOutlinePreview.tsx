import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import type { RoutePreviewPoint } from '@/lib/OutdoorSession/routePreview';

type Props = {
  points: RoutePreviewPoint[] | null | undefined;
  strokeColor: string;
  glowColor: string;
  startColor: string;
  endColor: string;
  backgroundColor: string;
  accentColor: string;
  strokeWidth?: number;
  showEndpoints?: boolean;
};

const VIEWBOX = 100;
const INNER_SIZE = 84;
const OFFSET = (VIEWBOX - INNER_SIZE) / 2;

function buildPath(points: RoutePreviewPoint[]) {
  return points
    .map((point, index) => {
      const x = OFFSET + point.x * INNER_SIZE;
      const y = OFFSET + point.y * INNER_SIZE;
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
}

export default function RouteOutlinePreview({
  points,
  strokeColor,
  glowColor,
  startColor,
  endColor,
  backgroundColor,
  accentColor,
  strokeWidth = 4,
  showEndpoints = true,
}: Props) {
  const validPoints = points ?? [];
  const path = useMemo(
    () => (validPoints.length >= 2 ? buildPath(validPoints) : null),
    [validPoints]
  );

  const startPoint = validPoints[0] ?? null;
  const endPoint = validPoints[validPoints.length - 1] ?? null;

  return (
    <View style={styles.container}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}>
        <Defs>
          <LinearGradient id="routePreviewGlow" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor={accentColor} stopOpacity="0.24" />
            <Stop offset="100%" stopColor={backgroundColor} stopOpacity="0" />
          </LinearGradient>
        </Defs>

        <Rect
          x="0"
          y="0"
          width={VIEWBOX}
          height={VIEWBOX}
          rx="20"
          fill={backgroundColor}
        />
        <Rect
          x="8"
          y="8"
          width={VIEWBOX - 16}
          height={VIEWBOX - 16}
          rx="16"
          fill="url(#routePreviewGlow)"
        />

        {path ? (
          <>
            <Path
              d={path}
              stroke={glowColor}
              strokeWidth={strokeWidth + 4}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.2}
              fill="none"
            />
            <Path
              d={path}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </>
        ) : null}

        {showEndpoints && startPoint && endPoint ? (
          <>
            <Circle
              cx={OFFSET + startPoint.x * INNER_SIZE}
              cy={OFFSET + startPoint.y * INNER_SIZE}
              r="4.5"
              fill={startColor}
            />
            <Circle
              cx={OFFSET + endPoint.x * INNER_SIZE}
              cy={OFFSET + endPoint.y * INNER_SIZE}
              r="4.5"
              fill={endColor}
            />
          </>
        ) : null}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignSelf: 'stretch',
  },
});
