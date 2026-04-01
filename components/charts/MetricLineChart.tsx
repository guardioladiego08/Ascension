import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';

import ExpandableGraphSurface from './ExpandableGraphSurface';

export type SamplePoint = {
  t: number;
  v: number;
};

type Props = {
  title: string;
  color: string;
  points: SamplePoint[];
  cardBg: string;
  textColor: string;
  height?: number;
  valueFormatter?: (v: number) => string;
  xLabelFormatter?: (t: number) => string;
  yClampMin?: number;
  yClampMax?: number;
  yPaddingRatio?: number;
  yPaddingAbs?: number;
  noOfSections?: number;
  curved?: boolean;
  thickness?: number;
  hideDataPoints?: boolean;
  showGrid?: boolean;
  unitSuffix?: string;
  yAxisSuffix?: string;
  showYAxisIndices?: boolean;
  showXAxisIndices?: boolean;
};

const X_LABEL_PAD = 24;
const INLINE_PADDING = 14;
const EXPANDED_PADDING = 22;

function clamp(n: number, min?: number, max?: number) {
  if (min != null && n < min) return min;
  if (max != null && n > max) return max;
  return n;
}

export default function MetricLineChart({
  title,
  color,
  points,
  cardBg,
  textColor,
  height = 180,
  valueFormatter,
  xLabelFormatter,
  yClampMin,
  yClampMax,
  yPaddingRatio = 0.08,
  yPaddingAbs,
  noOfSections = 5,
  curved = true,
  thickness = 2,
  hideDataPoints = true,
  showGrid = false,
  unitSuffix,
  yAxisSuffix,
  showYAxisIndices = false,
  showXAxisIndices = false,
}: Props) {
  const sorted = useMemo(() => {
    const arr = [...(points ?? [])].filter(
      (p) => Number.isFinite(p?.t) && Number.isFinite(p?.v)
    );
    arr.sort((a, b) => a.t - b.t);
    return arr;
  }, [points]);

  const { yMin, yMax } = useMemo(() => {
    if (!sorted.length) return { yMin: 0, yMax: 1 };

    let minV = sorted[0].v;
    let maxV = sorted[0].v;

    for (const p of sorted) {
      if (p.v < minV) minV = p.v;
      if (p.v > maxV) maxV = p.v;
    }

    minV = clamp(minV, yClampMin, yClampMax);
    maxV = clamp(maxV, yClampMin, yClampMax);

    if (minV === maxV) {
      const bump = Math.max(Math.abs(minV) * 0.02, 1e-3);
      minV -= bump;
      maxV += bump;
    }

    const range = maxV - minV;
    const pad =
      yPaddingAbs != null
        ? Math.abs(yPaddingAbs)
        : Math.max(range * yPaddingRatio, Math.abs(maxV) * 0.02, 1e-3);

    const paddedMin = clamp(minV - pad, yClampMin, yClampMax);
    const paddedMax = clamp(maxV + pad, yClampMin, yClampMax);

    return {
      yMin: paddedMin,
      yMax: paddedMin === paddedMax ? paddedMin + 1 : paddedMax,
    };
  }, [sorted, yClampMin, yClampMax, yPaddingRatio, yPaddingAbs]);

  const labelEvery = useMemo(() => {
    if (sorted.length <= 1) return 1;
    return Math.max(1, Math.ceil(sorted.length / 6));
  }, [sorted.length]);

  const chartData = useMemo(
    () =>
      sorted.map((p, idx) => ({
        value: p.v,
        label:
          xLabelFormatter && (idx % labelEvery === 0 || idx === sorted.length - 1)
            ? xLabelFormatter(p.t)
            : '',
      })),
    [labelEvery, sorted, xLabelFormatter]
  );

  const yAxisLabelTexts = useMemo(() => {
    const fmt =
      valueFormatter ??
      ((v: number) => (Number.isFinite(v) ? v.toFixed(1) : '—'));

    const step = (yMax - yMin) / Math.max(1, noOfSections);

    return Array.from({ length: noOfSections + 1 }, (_, index) =>
      fmt(yMin + step * index)
    );
  }, [noOfSections, valueFormatter, yMax, yMin]);

  const pointerLabelText = (val: number) => {
    const fmt =
      valueFormatter ??
      ((v: number) => (Number.isFinite(v) ? v.toFixed(1) : '—'));
    const base = fmt(val);
    return unitSuffix ? `${base} ${unitSuffix}` : base;
  };

  const negativeMin = yMin < 0;

  const axisProps = useMemo(() => {
    if (!negativeMin) {
      const offset = yMin;
      const range = yMax - yMin;

      return {
        yAxisOffset: offset,
        maxValue: range,
        mostNegativeValue: 0,
      };
    }

    return {
      yAxisOffset: 0,
      maxValue: yMax,
      mostNegativeValue: Math.abs(yMin),
    };
  }, [negativeMin, yMax, yMin]);

  return (
    <ExpandableGraphSurface
      actionBackgroundColor="rgba(255,255,255,0.1)"
      actionIconColor={textColor}
      actionPosition="top-right"
      expandedActionPosition="rotated-top-right"
      expandedSurfaceStyle={{ backgroundColor: cardBg }}
      rotateExpandedContent
      surfaceStyle={[styles.card, { backgroundColor: cardBg }]}
    >
      {({ width, height: surfaceHeight, mode }) => {
        const shellPadding = mode === 'expanded' ? EXPANDED_PADDING : INLINE_PADDING;
        const contentWidth = Math.max(width - shellPadding * 2, 0);
        const chartWidth = Math.max(0, contentWidth - 44 + X_LABEL_PAD);
        const chartHeight =
          mode === 'expanded'
            ? Math.max(height, Math.min(Math.max(surfaceHeight - 92, height + 96), 360))
            : height;
        const spacing =
          !chartWidth || chartData.length <= 1
            ? 44
            : Math.max(3, Math.min(120, chartWidth / (chartData.length - 1)));

        return (
          <View style={[styles.content, { padding: shellPadding }]}>
            <Text style={[styles.title, { color: textColor, paddingRight: 56 }]}>
              {title}
            </Text>

            {chartData.length < 2 ? (
              <View
                style={[
                  styles.empty,
                  { borderColor: 'rgba(255,255,255,0.10)', minHeight: chartHeight },
                ]}
              >
                <Text style={[styles.emptyText, { color: textColor, opacity: 0.65 }]}>
                  Not enough data to chart.
                </Text>
              </View>
            ) : !chartWidth ? (
              <View
                style={[
                  styles.empty,
                  { borderColor: 'rgba(255,255,255,0.10)', minHeight: chartHeight },
                ]}
              >
                <Text style={[styles.emptyText, { color: textColor, opacity: 0.65 }]}>
                  Measuring chart…
                </Text>
              </View>
            ) : (
              <LineChart
                data={chartData}
                height={chartHeight}
                width={chartWidth}
                parentWidth={chartWidth}
                initialSpacing={0}
                spacing={spacing}
                endSpacing={spacing}
                curved={curved}
                thickness={thickness}
                color={color}
                hideDataPoints={hideDataPoints}
                {...axisProps}
                noOfSections={noOfSections}
                yAxisLabelTexts={yAxisLabelTexts}
                yAxisLabelWidth={44}
                yAxisTextStyle={{
                  color: textColor,
                  opacity: 0.65,
                  fontSize: mode === 'expanded' ? 11 : 10,
                  fontWeight: '700',
                }}
                xAxisLabelTextStyle={{
                  color: textColor,
                  opacity: 0.55,
                  fontSize: mode === 'expanded' ? 11 : 10,
                  fontWeight: '700',
                  textAlign: 'center',
                  marginLeft: -40,
                }}
                yAxisLabelSuffix={yAxisSuffix ?? ''}
                rulesColor={showGrid ? 'rgba(255,255,255,0.10)' : 'transparent'}
                hideRules={!showGrid}
                showVerticalLines={false}
                xAxisColor={showXAxisIndices ? 'rgba(255,255,255,0.18)' : 'transparent'}
                yAxisColor={showYAxisIndices ? 'rgba(255,255,255,0.18)' : 'transparent'}
                yAxisThickness={0}
                xAxisThickness={0}
                pointerConfig={{
                  pointerStripHeight: chartHeight,
                  pointerStripColor: 'rgba(255,255,255,0.12)',
                  pointerStripWidth: 2,
                  pointerColor: color,
                  radius: mode === 'expanded' ? 5 : 4,
                  pointerLabelWidth: 140,
                  pointerLabelHeight: 44,
                  activatePointersOnLongPress: true,
                  autoAdjustPointerLabelPosition: true,
                  pointerLabelComponent: (items: Array<{ value?: number }>) => {
                    const v = items?.[0]?.value;
                    return (
                      <View style={[styles.pointerLabel, { backgroundColor: cardBg }]}>
                        <Text style={[styles.pointerText, { color: textColor }]}>
                          {pointerLabelText(Number(v))}
                        </Text>
                      </View>
                    );
                  },
                }}
              />
            )}
          </View>
        );
      }}
    </ExpandableGraphSurface>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    width: '100%',
  },
  content: {
    width: '100%',
  },
  title: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.6,
    marginBottom: 10,
    opacity: 0.9,
  },
  empty: {
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  pointerLabel: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  pointerText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
});
