import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { ClipPath, Defs, Line, Path, Rect, Text as SvgText } from 'react-native-svg';

import type { SamplePoint } from '@/components/charts/MetricLineChart';
import ExpandableGraphSurface from '@/components/charts/ExpandableGraphSurface';
import { withAlpha } from '@/constants/Colors';
import type { IntervalStepTimelineItem } from '@/lib/intervals/summary';

type Props = {
  title: string;
  subtitle?: string | null;
  points: SamplePoint[];
  steps: IntervalStepTimelineItem[];
  cardBg: string;
  textColor: string;
  accentColor: string;
  height?: number;
  xLabelFormatter?: (seconds: number) => string;
};

const DEFAULT_HEIGHT = 220;
const PHASE_COLOR_OPACITY = 0.22;

const PHASE_COLORS = {
  warmup: '#2EC4B6',
  work: '#FF7A18',
  recovery: '#4CC9F0',
  rest: '#A78BFA',
  cooldown: '#8DE7C1',
} as const;

function clamp(n: number, min: number, max: number) {
  return Math.min(Math.max(n, min), max);
}

function buildPath(points: Array<{ x: number; y: number }>) {
  if (points.length < 2) {
    return null;
  }

  return points.reduce((path, point, index) => {
    const command = index === 0 ? 'M' : 'L';
    return `${path}${command}${point.x.toFixed(2)} ${point.y.toFixed(2)} `;
  }, '');
}

export default function IntervalHeartRateOverlayChart({
  title,
  subtitle,
  points,
  steps,
  cardBg,
  textColor,
  accentColor,
  height = DEFAULT_HEIGHT,
  xLabelFormatter,
}: Props) {
  const sortedPoints = useMemo(() => {
    const next = [...points].filter(
      (point) => Number.isFinite(point.t) && Number.isFinite(point.v)
    );
    next.sort((a, b) => a.t - b.t);
    return next;
  }, [points]);

  const resolvedSteps = useMemo(
    () =>
      [...steps]
        .filter((step) => step.ended_elapsed_s > step.started_elapsed_s)
        .sort((a, b) => a.sequence_index - b.sequence_index),
    [steps]
  );

  const totalDurationSeconds = useMemo(() => {
    const fromSteps = resolvedSteps.reduce(
      (maxSeconds, step) => Math.max(maxSeconds, step.ended_elapsed_s),
      0
    );
    const fromPoints = sortedPoints.reduce(
      (maxSeconds, point) => Math.max(maxSeconds, point.t),
      0
    );
    return Math.max(1, fromSteps, fromPoints);
  }, [resolvedSteps, sortedPoints]);

  const { yMin, yMax, gridValues } = useMemo(() => {
    if (sortedPoints.length === 0) {
      return {
        yMin: 60,
        yMax: 190,
        gridValues: [60, 100, 140, 180],
      };
    }

    const values = sortedPoints.map((point) => point.v);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const paddedMin = clamp(Math.floor((minValue - 10) / 5) * 5, 40, 210);
    const paddedMax = clamp(Math.ceil((maxValue + 10) / 5) * 5, paddedMin + 20, 220);
    const sectionCount = 4;
    const interval = (paddedMax - paddedMin) / (sectionCount - 1);
    const nextGrid = Array.from({ length: sectionCount }, (_, index) =>
      Math.round(paddedMin + interval * index)
    );

    return {
      yMin: paddedMin,
      yMax: paddedMax,
      gridValues: nextGrid,
    };
  }, [sortedPoints]);

  const phaseLegend = useMemo(
    () => [
      { key: 'warmup', label: 'Warm-up', color: PHASE_COLORS.warmup },
      { key: 'work', label: 'Work', color: PHASE_COLORS.work },
      { key: 'recovery', label: 'Break', color: PHASE_COLORS.recovery },
      { key: 'rest', label: 'Rest', color: PHASE_COLORS.rest },
      { key: 'cooldown', label: 'Cooldown', color: PHASE_COLORS.cooldown },
    ],
    []
  );

  const labelFormatter =
    xLabelFormatter ??
    ((seconds: number) => {
      const bounded = Math.max(0, Math.floor(seconds));
      const mins = Math.floor(bounded / 60);
      const rem = bounded % 60;
      return `${mins}:${String(rem).padStart(2, '0')}`;
    });

  return (
    <ExpandableGraphSurface
      actionBackgroundColor="rgba(255,255,255,0.10)"
      actionIconColor={textColor}
      actionPosition="top-right"
      expandedActionPosition="rotated-top-right"
      expandedSurfaceStyle={{ backgroundColor: cardBg }}
      rotateExpandedContent
      surfaceStyle={[styles.card, { backgroundColor: cardBg }]}
    >
      {({ width, height: surfaceHeight, mode }) => {
        const shellPadding = mode === 'expanded' ? 22 : 14;
        const contentWidth = Math.max(width - shellPadding * 2, 0);
        const chartHeight =
          mode === 'expanded'
            ? Math.max(height, Math.min(Math.max(surfaceHeight - 170, height + 120), 420))
            : height;
        const chartWidth = contentWidth;
        const leftPad = 42;
        const rightPad = 12;
        const topPad = 18;
        const bottomPad = 28;
        const plotWidth = Math.max(chartWidth - leftPad - rightPad, 0);
        const plotHeight = Math.max(chartHeight - topPad - bottomPad, 0);

        const xForSeconds = (seconds: number) =>
          leftPad + (seconds / totalDurationSeconds) * plotWidth;
        const yForBpm = (bpm: number) => {
          const ratio = (bpm - yMin) / Math.max(1, yMax - yMin);
          return topPad + plotHeight - ratio * plotHeight;
        };

        const linePoints = sortedPoints.map((point) => ({
          x: xForSeconds(point.t),
          y: yForBpm(point.v),
        }));
        const pathData = buildPath(linePoints);
        const xLabels = [
          { value: 0, label: labelFormatter(0) },
          {
            value: totalDurationSeconds / 2,
            label: labelFormatter(totalDurationSeconds / 2),
          },
          {
            value: totalDurationSeconds,
            label: labelFormatter(totalDurationSeconds),
          },
        ];

        return (
          <View style={[styles.content, { padding: shellPadding }]}>
            <Text style={[styles.title, { color: textColor, paddingRight: 56 }]}>
              {title}
            </Text>
            {subtitle ? (
              <Text style={[styles.subtitle, { color: withAlpha(textColor, 0.72) }]}>
                {subtitle}
              </Text>
            ) : null}

            {chartWidth <= 0 || plotHeight <= 0 ? (
              <View
                style={[
                  styles.emptyState,
                  { borderColor: withAlpha(textColor, 0.12), minHeight: chartHeight },
                ]}
              >
                <Text style={[styles.emptyText, { color: withAlpha(textColor, 0.65) }]}>
                  Measuring chart…
                </Text>
              </View>
            ) : (
              <View style={styles.chartWrap}>
                <Svg width={chartWidth} height={chartHeight}>
                  <Defs>
                    <ClipPath id="interval-hr-clip">
                      <Rect x={leftPad} y={topPad} width={plotWidth} height={plotHeight} />
                    </ClipPath>
                  </Defs>

                  <Rect
                    x={leftPad}
                    y={topPad}
                    width={plotWidth}
                    height={plotHeight}
                    rx={18}
                    fill={withAlpha('#FFFFFF', 0.03)}
                  />

                  {gridValues.map((value) => {
                    const y = yForBpm(value);
                    return (
                      <React.Fragment key={value}>
                        <Line
                          x1={leftPad}
                          y1={y}
                          x2={leftPad + plotWidth}
                          y2={y}
                          stroke={withAlpha(textColor, 0.10)}
                          strokeWidth={1}
                        />
                        <SvgText
                          x={leftPad - 8}
                          y={y + 4}
                          fill={withAlpha(textColor, 0.68)}
                          fontSize={10}
                          fontWeight="700"
                          textAnchor="end"
                        >
                          {`${value}`}
                        </SvgText>
                      </React.Fragment>
                    );
                  })}

                  <Rect
                    x={leftPad}
                    y={topPad}
                    width={plotWidth}
                    height={plotHeight}
                    rx={18}
                    fill="transparent"
                    stroke={withAlpha(textColor, 0.10)}
                    strokeWidth={1}
                  />

                  <Rect
                    x={leftPad}
                    y={topPad}
                    width={plotWidth}
                    height={plotHeight}
                    rx={18}
                    fill="transparent"
                    clipPath="url(#interval-hr-clip)"
                  />

                  {resolvedSteps.map((step) => {
                    const segmentX = xForSeconds(step.started_elapsed_s);
                    const segmentWidth =
                      xForSeconds(step.ended_elapsed_s) - segmentX;
                    const fill =
                      PHASE_COLORS[step.phase_kind] ?? PHASE_COLORS.recovery;

                    return (
                      <Rect
                        key={`${step.phase_kind}-${step.sequence_index}`}
                        x={segmentX}
                        y={topPad}
                        width={Math.max(1, segmentWidth)}
                        height={plotHeight}
                        fill={withAlpha(fill, PHASE_COLOR_OPACITY)}
                        clipPath="url(#interval-hr-clip)"
                      />
                    );
                  })}

                  {pathData ? (
                    <Path
                      d={pathData}
                      clipPath="url(#interval-hr-clip)"
                      stroke={accentColor}
                      strokeWidth={3}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                  ) : null}
                </Svg>

                <View style={styles.xAxisLabelsRow}>
                  {xLabels.map((item, index) => (
                    <Text
                      key={`${item.value}-${index}`}
                      style={[styles.axisLabel, { color: withAlpha(textColor, 0.65) }]}
                    >
                      {item.label}
                    </Text>
                  ))}
                </View>
              </View>
            )}

            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View
                  style={[
                    styles.legendDot,
                    { backgroundColor: accentColor, borderColor: accentColor },
                  ]}
                />
                <Text style={[styles.legendLabel, { color: textColor }]}>Heart rate</Text>
              </View>

              {phaseLegend.map((item) => (
                <View key={item.key} style={styles.legendItem}>
                  <View
                    style={[
                      styles.legendDot,
                      {
                        backgroundColor: withAlpha(item.color, PHASE_COLOR_OPACITY + 0.08),
                        borderColor: withAlpha(item.color, 0.85),
                      },
                    ]}
                  />
                  <Text style={[styles.legendLabel, { color: textColor }]}>
                    {item.label}
                  </Text>
                </View>
              ))}
            </View>

            {sortedPoints.length === 0 ? (
              <Text style={[styles.emptyText, { color: withAlpha(textColor, 0.7) }]}>
                Heart-rate samples have not synced yet. Interval bands are shown so you can compare once Apple Health data arrives.
              </Text>
            ) : null}
          </View>
        );
      }}
    </ExpandableGraphSurface>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
  },
  content: {
    gap: 10,
  },
  title: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: -4,
  },
  chartWrap: {
    gap: 8,
  },
  xAxisLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginTop: -4,
  },
  axisLabel: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  legendLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  emptyState: {
    borderWidth: 1,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 12,
    lineHeight: 18,
  },
});
