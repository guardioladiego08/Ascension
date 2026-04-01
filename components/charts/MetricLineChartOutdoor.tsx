import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';

import ExpandableGraphSurface from './ExpandableGraphSurface';

export type SamplePoint = { t: number; v: number };

type Props = {
  title: string;
  color: string;
  points: SamplePoint[];
  cardBg: string;
  textColor: string;
  height?: number;
  valueFormatter?: (v: number) => string;
  xLabelFormatter?: (t: number) => string;
  valueTransform?: (v: number) => number;
  valueInverseTransform?: (v: number) => number;
  yRangePadSeconds?: number;
  yMaxExtra?: number;
  yMinExtra?: number;
  yClampMin?: number;
  yClampMax?: number;
  noOfSections?: number;
  curved?: boolean;
  thickness?: number;
  hideDataPoints?: boolean;
  maxPoints?: number;
  targetXLabels?: number;
};

const INLINE_PADDING = 14;
const EXPANDED_PADDING = 22;

function downsample<T>(arr: T[], max: number): T[] {
  if (arr.length <= max) return arr;
  const stride = Math.ceil(arr.length / max);
  const out: T[] = [];
  for (let i = 0; i < arr.length; i += stride) out.push(arr[i]);
  if (out[out.length - 1] !== arr[arr.length - 1]) out.push(arr[arr.length - 1]);
  return out;
}

function isFiniteNumber(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n);
}

export default function MetricLineChartOutdoor({
  title,
  color,
  points,
  cardBg,
  textColor,
  height = 180,
  valueFormatter,
  xLabelFormatter,
  valueTransform,
  valueInverseTransform,
  yRangePadSeconds,
  yMaxExtra,
  yMinExtra,
  yClampMin,
  yClampMax,
  noOfSections = 5,
  curved = true,
  thickness = 2,
  hideDataPoints = true,
  maxPoints = 320,
  targetXLabels = 6,
}: Props) {
  const tf = valueTransform ?? ((v: number) => v);
  const inv = valueInverseTransform ?? ((v: number) => v);

  const cleaned = useMemo(() => {
    const arr = (points ?? [])
      .filter((p) => isFiniteNumber(p?.t) && isFiniteNumber(p?.v))
      .map((p) => ({ t: p.t, v: tf(p.v) }))
      .sort((a, b) => a.t - b.t);

    return downsample(arr, maxPoints);
  }, [maxPoints, points, tf]);

  const labelEvery = useMemo(() => {
    if (cleaned.length <= 1) return 1;
    return Math.max(1, Math.round(cleaned.length / targetXLabels));
  }, [cleaned.length, targetXLabels]);

  const chartData = useMemo(
    () =>
      cleaned.map((p, idx) => ({
        value: p.v,
        label:
          xLabelFormatter && (idx % labelEvery === 0 || idx === cleaned.length - 1)
            ? xLabelFormatter(p.t)
            : '',
      })),
    [cleaned, labelEvery, xLabelFormatter]
  );

  const { yMinT, yMaxT, yAxisOffset, maxValue } = useMemo(() => {
    if (cleaned.length < 2) {
      return { yMinT: 0, yMaxT: 1, yAxisOffset: 0, maxValue: 1 };
    }

    let minD = inv(cleaned[0].v);
    let maxD = inv(cleaned[0].v);

    for (const p of cleaned) {
      const displayValue = inv(p.v);
      if (displayValue < minD) minD = displayValue;
      if (displayValue > maxD) maxD = displayValue;
    }

    const padMinutes = yRangePadSeconds != null ? yRangePadSeconds / 60 : 0;

    let yMinD = minD - padMinutes - (yMinExtra ?? 0);
    let yMaxD = maxD + padMinutes + (yMaxExtra ?? 0);

    if (isFiniteNumber(yClampMin)) yMinD = yClampMin;
    if (isFiniteNumber(yClampMax)) yMaxD = yClampMax;

    if (yMinD === yMaxD) {
      yMinD -= 0.001;
      yMaxD += 0.001;
    }

    const minT = tf(yMinD);
    const maxT = tf(yMaxD);
    const lowT = Math.min(minT, maxT);
    const highT = Math.max(minT, maxT);

    return {
      yMinT: lowT,
      yMaxT: highT,
      yAxisOffset: lowT,
      maxValue: highT - lowT,
    };
  }, [cleaned, inv, tf, yClampMax, yClampMin, yMaxExtra, yMinExtra, yRangePadSeconds]);

  const yAxisLabelTexts = useMemo(() => {
    const fmt = valueFormatter ?? ((v: number) => `${v.toFixed(1)}`);
    const step = (yMaxT - yMinT) / Math.max(1, noOfSections);

    return Array.from({ length: noOfSections + 1 }, (_, index) =>
      fmt(inv(yMinT + step * index))
    );
  }, [inv, noOfSections, valueFormatter, yMaxT, yMinT]);

  const pointerLabelText = (valT: number) => {
    const fmt = valueFormatter ?? ((v: number) => `${v.toFixed(1)}`);
    return fmt(inv(valT));
  };

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
        const chartHeight =
          mode === 'expanded'
            ? Math.max(height, Math.min(Math.max(surfaceHeight - 92, height + 96), 360))
            : height;
        const spacing =
          !contentWidth || chartData.length <= 1
            ? 40
            : Math.max(3, Math.min(120, contentWidth / (chartData.length - 1)));
        const hasData = chartData.length >= 2;

        return (
          <View style={{ padding: shellPadding }}>
            <Text style={[styles.title, { color: textColor, paddingRight: 56 }]}>
              {title}
            </Text>

            {!hasData ? (
              <View style={[styles.empty, { minHeight: chartHeight }]}>
                <Text style={[styles.emptyText, { color: textColor, opacity: 0.65 }]}>
                  Not enough data to chart.
                </Text>
              </View>
            ) : !contentWidth ? (
              <View style={[styles.empty, { minHeight: chartHeight }]}>
                <Text style={[styles.emptyText, { color: textColor, opacity: 0.65 }]}>
                  Measuring chart…
                </Text>
              </View>
            ) : (
              <LineChart
                data={chartData}
                height={chartHeight}
                width={contentWidth}
                parentWidth={contentWidth}
                initialSpacing={0}
                spacing={spacing}
                endSpacing={spacing}
                curved={curved}
                thickness={thickness}
                color={color}
                hideDataPoints={hideDataPoints}
                noOfSections={noOfSections}
                yAxisLabelTexts={yAxisLabelTexts}
                yAxisLabelWidth={56}
                yAxisTextStyle={{
                  color: textColor,
                  opacity: 0.75,
                  fontSize: mode === 'expanded' ? 11 : 10,
                  fontWeight: '800',
                }}
                xAxisLabelTextStyle={{
                  color: textColor,
                  opacity: 0.55,
                  fontSize: mode === 'expanded' ? 11 : 10,
                  fontWeight: '700',
                  textAlign: 'center',
                  marginLeft: -18,
                }}
                yAxisOffset={yAxisOffset}
                maxValue={maxValue}
                hideRules
                xAxisColor="transparent"
                yAxisColor="transparent"
                xAxisThickness={0}
                yAxisThickness={0}
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
    borderColor: 'rgba(255,255,255,0.10)',
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
