import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, LayoutChangeEvent } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';

export type SamplePoint = {
  t: number; // x-axis in seconds (or any monotonic unit)
  v: number; // y-axis value
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

  // Auto Y-axis from metric min/max + padding
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
  const [containerW, setContainerW] = useState<number>(0);

  const onLayout = (e: LayoutChangeEvent) => {
    const w = Math.floor(e.nativeEvent.layout.width);
    if (w && w !== containerW) setContainerW(w);
  };

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

    let paddedMin = clamp(minV - pad, yClampMin, yClampMax);
    let paddedMax = clamp(maxV + pad, yClampMin, yClampMax);

    if (paddedMin === paddedMax) paddedMax = paddedMin + 1;

    return { yMin: paddedMin, yMax: paddedMax };
  }, [sorted, yClampMin, yClampMax, yPaddingRatio, yPaddingAbs]);

  const labelEvery = useMemo(() => {
    const n = sorted.length;
    if (n <= 1) return 1;
    return Math.max(1, Math.ceil(n / 6));
  }, [sorted.length]);

  const chartData = useMemo(() => {
    return sorted.map((p, idx) => {
      const label =
        xLabelFormatter && (idx % labelEvery === 0 || idx === sorted.length - 1)
          ? xLabelFormatter(p.t)
          : '';
      return { value: p.v, label };
    });
  }, [sorted, xLabelFormatter, labelEvery]);

  const yAxisLabelTexts = useMemo(() => {
    const fmt =
      valueFormatter ??
      ((v: number) => (Number.isFinite(v) ? v.toFixed(1) : '—'));

    const start = yMin;
    const end = yMax;
    const step = (end - start) / Math.max(1, noOfSections);

    const arr: string[] = [];
    for (let i = 0; i <= noOfSections; i++) {
      arr.push(fmt(start + step * i));
    }
    return arr;
  }, [yMin, yMax, noOfSections, valueFormatter]);

  const pointerLabelText = (val: number) => {
    const fmt =
      valueFormatter ??
      ((v: number) => (Number.isFinite(v) ? v.toFixed(1) : '—'));
    const base = fmt(val);
    return unitSuffix ? `${base} ${unitSuffix}` : base;
  };

  // ---- Width / spacing (critical inside ScrollView) ----
const X_LABEL_PAD = 24; // half-ish label width

const chartWidth = useMemo(() => {
  if (!containerW) return 0;
  return Math.max(0, containerW - 44 + X_LABEL_PAD);
}, [containerW]);


  const spacing = useMemo(() => {
    const n = chartData.length;
    if (!chartWidth || n <= 1) return 44;
    // Fit points across available width
    const raw = chartWidth / (n - 1);
    return Math.max(3, Math.min(120, raw));
  }, [chartWidth, chartData.length]);

  // ---- Axis windowing (fix): if using yAxisOffset, maxValue should be range ----
  const negativeMin = yMin < 0;

  const axisProps = useMemo(() => {
    if (!negativeMin) {
      const offset = yMin;
      const range = yMax - yMin;
      return {
        yAxisOffset: offset,
        maxValue: range,         // <-- range, not absolute
        mostNegativeValue: 0,
      };
    }

    // For negative series, avoid yAxisOffset; use mostNegativeValue
    return {
      yAxisOffset: 0,
      maxValue: yMax,            // absolute max
      mostNegativeValue: Math.abs(yMin),
    };
  }, [negativeMin, yMin, yMax]);

  const contentWidth = useMemo(() => {
    const n = chartData.length;
    const desiredSpacing = 18; // your preferred spacing
    return Math.max(chartWidth, (n - 1) * desiredSpacing);
    }, [chartWidth, chartData.length]);



  return (
    <View onLayout={onLayout} style={[styles.card, { backgroundColor: cardBg }]}>
      <Text style={[styles.title, { color: textColor }]}>{title}</Text>

      {chartData.length < 2 ? (
        <View style={[styles.empty, { borderColor: 'rgba(255,255,255,0.10)' }]}>
          <Text style={[styles.emptyText, { color: textColor, opacity: 0.65 }]}>
            Not enough data to chart.
          </Text>
        </View>
      ) : !chartWidth ? (
        <View style={[styles.empty, { borderColor: 'rgba(255,255,255,0.10)' }]}>
          <Text style={[styles.emptyText, { color: textColor, opacity: 0.65 }]}>
            Measuring chart…
          </Text>
        </View>
      ) : (
        <LineChart
          data={chartData}
          height={height}
          width={chartWidth}
          parentWidth={chartWidth}
          initialSpacing={0}
          spacing={spacing}
          endSpacing={spacing}
          curved={curved}
          thickness={thickness}
          color={color}
          hideDataPoints={hideDataPoints}

          // Axis
          {...axisProps}
          noOfSections={noOfSections}
          yAxisLabelTexts={yAxisLabelTexts}
          yAxisLabelWidth={44}
          yAxisTextStyle={{ color: textColor, opacity: 0.65, fontSize: 10, fontWeight: '700' }}
          xAxisLabelTextStyle={{
        color: textColor,
        opacity: 0.55,
        fontSize: 10,
        fontWeight: '700',
        textAlign: 'center',
        marginLeft: -40, // subtle inward nudge
}}
          yAxisLabelSuffix={yAxisSuffix ?? ''}

          // Lines / rules
          rulesColor={showGrid ? 'rgba(255,255,255,0.10)' : 'transparent'}
          hideRules={!showGrid}
          showVerticalLines={false}

          // Hide axes unless you explicitly want them
          xAxisColor={showXAxisIndices ? 'rgba(255,255,255,0.18)' : 'transparent'}
          yAxisColor={showYAxisIndices ? 'rgba(255,255,255,0.18)' : 'transparent'}
          yAxisThickness={0}
          xAxisThickness={0}

          pointerConfig={{
            pointerStripHeight: height,
            pointerStripColor: 'rgba(255,255,255,0.12)',
            pointerStripWidth: 2,
            pointerColor: color,
            radius: 4,
            pointerLabelWidth: 140,
            pointerLabelHeight: 44,
            activatePointersOnLongPress: true,
            autoAdjustPointerLabelPosition: true,
            pointerLabelComponent: (items: any[]) => {
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
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    padding: 14,
    overflow: 'hidden',
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
    height: 160,
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
