import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, {
  Defs,
  LinearGradient,
  Line,
  Polygon,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';

import {
  STRENGTH_MUSCLE_LABELS,
  STRENGTH_MUSCLE_RADAR_AXES,
  type StrengthMuscleRadarAxis,
  type StrengthMuscleProfile,
} from '@/lib/strength/muscleProfile';

type Props = {
  profile: StrengthMuscleProfile | null | undefined;
  backgroundColor: string;
  accentColor: string;
  glowColor: string;
  gridColor: string;
  strokeColor: string;
  variant?: 'compact' | 'detailed';
  showAxisLabels?: boolean;
  labelColor?: string;
  labelFontSize?: number;
  minimumValue?: number;
};

const GRID_LEVELS = 4;

const VARIANT_CONFIG = {
  compact: {
    viewBox: 100,
    center: 50,
    radius: 34,
    cornerRadius: 20,
    innerInset: 10,
    labelRadius: 0,
  },
  detailed: {
    viewBox: 176,
    center: 88,
    radius: 48,
    cornerRadius: 26,
    innerInset: 18,
    labelRadius: 72,
  },
} as const;

const AXIS_LABELS: Record<StrengthMuscleRadarAxis, string> = {
  chest: STRENGTH_MUSCLE_LABELS.chest,
  shoulders: STRENGTH_MUSCLE_LABELS.shoulders,
  arms: STRENGTH_MUSCLE_LABELS.arms,
  quads: STRENGTH_MUSCLE_LABELS.quads,
  posterior_chain: 'Posterior',
  calves: STRENGTH_MUSCLE_LABELS.calves,
  core: STRENGTH_MUSCLE_LABELS.core,
  back: STRENGTH_MUSCLE_LABELS.back,
};

function pointAt(index: number, total: number, radius: number, center: number) {
  const angle = -Math.PI / 2 + (index / total) * Math.PI * 2;
  return {
    x: center + Math.cos(angle) * radius,
    y: center + Math.sin(angle) * radius,
  };
}

function pointsToString(points: Array<{ x: number; y: number }>) {
  return points.map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(' ');
}

export default function StrengthRadarPreview({
  profile,
  backgroundColor,
  accentColor,
  glowColor,
  gridColor,
  strokeColor,
  variant = 'compact',
  showAxisLabels = false,
  labelColor,
  labelFontSize,
  minimumValue,
}: Props) {
  const config = VARIANT_CONFIG[variant];
  const minFillValue = minimumValue ?? (variant === 'detailed' ? 0.02 : 0.08);

  const vertexPoints = useMemo(
    () =>
      STRENGTH_MUSCLE_RADAR_AXES.map((_, index) =>
        pointAt(index, STRENGTH_MUSCLE_RADAR_AXES.length, config.radius, config.center)
      ),
    [config.center, config.radius]
  );

  const rings = useMemo(
    () =>
      Array.from({ length: GRID_LEVELS }, (_, index) => {
        const level = (index + 1) / GRID_LEVELS;
        return pointsToString(
          STRENGTH_MUSCLE_RADAR_AXES.map((_, axisIndex) =>
            pointAt(
              axisIndex,
              STRENGTH_MUSCLE_RADAR_AXES.length,
              config.radius * level,
              config.center
            )
          )
        );
      }),
    [config.center, config.radius]
  );

  const fillPoints = useMemo(() => {
    const values = STRENGTH_MUSCLE_RADAR_AXES.map((axisKey, index) =>
      pointAt(
        index,
        STRENGTH_MUSCLE_RADAR_AXES.length,
        config.radius * Math.max(minFillValue, profile?.[axisKey] ?? 0),
        config.center
      )
    );
    return pointsToString(values);
  }, [config.center, config.radius, minFillValue, profile]);

  const labelPoints = useMemo(
    () =>
      STRENGTH_MUSCLE_RADAR_AXES.map((axisKey, index) => ({
        axisKey,
        point: pointAt(
          index,
          STRENGTH_MUSCLE_RADAR_AXES.length,
          config.labelRadius,
          config.center
        ),
      })),
    [config.center, config.labelRadius]
  );

  return (
    <View style={styles.container}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${config.viewBox} ${config.viewBox}`}>
        <Defs>
          <LinearGradient id="strengthRadarGlow" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor={accentColor} stopOpacity="0.28" />
            <Stop offset="100%" stopColor={backgroundColor} stopOpacity="0" />
          </LinearGradient>
          <LinearGradient id="strengthRadarFill" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor={accentColor} stopOpacity="0.44" />
            <Stop offset="100%" stopColor={glowColor} stopOpacity="0.12" />
          </LinearGradient>
        </Defs>

        <Rect
          x="0"
          y="0"
          width={config.viewBox}
          height={config.viewBox}
          rx={config.cornerRadius}
          fill={backgroundColor}
        />
        <Rect
          x={config.innerInset}
          y={config.innerInset}
          width={config.viewBox - config.innerInset * 2}
          height={config.viewBox - config.innerInset * 2}
          rx={Math.max(14, config.cornerRadius - 4)}
          fill="url(#strengthRadarGlow)"
        />

        {vertexPoints.map((point, index) => (
          <Line
            key={`axis-${index}`}
            x1={config.center}
            y1={config.center}
            x2={point.x}
            y2={point.y}
            stroke={gridColor}
            strokeOpacity={0.22}
            strokeWidth="1"
          />
        ))}

        {rings.map((points, index) => (
          <Polygon
            key={`ring-${index}`}
            points={points}
            fill="none"
            stroke={gridColor}
            strokeOpacity={0.16 + index * 0.06}
            strokeWidth="1"
          />
        ))}

        <Polygon points={fillPoints} fill="url(#strengthRadarFill)" stroke={glowColor} strokeOpacity={0.35} strokeWidth="2.6" />
        <Polygon points={fillPoints} fill="none" stroke={strokeColor} strokeWidth="1.4" />

        {showAxisLabels
          ? labelPoints.map(({ axisKey, point }) => {
              const dx = point.x - config.center;
              const textAnchor =
                Math.abs(dx) < 10 ? 'middle' : dx > 0 ? 'start' : 'end';

              return (
                <SvgText
                  key={`label-${axisKey}`}
                  x={point.x}
                  y={point.y}
                  fill={labelColor ?? strokeColor}
                  fontSize={labelFontSize ?? 9.5}
                  fontWeight="600"
                  textAnchor={textAnchor}
                  alignmentBaseline="middle"
                >
                  {AXIS_LABELS[axisKey]}
                </SvgText>
              );
            })
          : null}
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
