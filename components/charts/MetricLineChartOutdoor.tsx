// components/charts/MetricLineChartOutdoor.tsx
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, LayoutChangeEvent } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';

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

  /**
   * Dynamic range controls (display-domain, BEFORE transform):
   * - yRangePadSeconds: only meaningful for pace (min/mi etc) if your formatter expects that domain.
   * - yMaxExtra: add headroom above the max (e.g., elevation +2m)
   */
  yRangePadSeconds?: number; // e.g., 10 for pace
  yMaxExtra?: number;        // e.g., 2 for elevation
  yMinExtra?: number;        // optional if you want extra below min

  /**
   * Optional hard clamps (display-domain, BEFORE transform)
   * If set, clamps win over computed.
   */
  yClampMin?: number;
  yClampMax?: number;

  noOfSections?: number;
  curved?: boolean;
  thickness?: number;
  hideDataPoints?: boolean;

  /** Downsample for performance (default 320) */
  maxPoints?: number;

  /** Control x-axis label density (default ~6 labels). */
  targetXLabels?: number; // e.g., 6
};

function downsample<T>(arr: T[], max: number): T[] {
  if (arr.length <= max) return arr;
  const stride = Math.ceil(arr.length / max);
  const out: T[] = [];
  for (let i = 0; i < arr.length; i += stride) out.push(arr[i]);
  if (out[out.length - 1] !== arr[arr.length - 1]) out.push(arr[arr.length - 1]);
  return out;
}

function isFiniteNumber(n: any): n is number {
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
  const [w, setW] = useState(0);

  const onLayout = (e: LayoutChangeEvent) => {
    const width = Math.floor(e.nativeEvent.layout.width);
    if (width && width !== w) setW(width);
  };

  const tf = valueTransform ?? ((v: number) => v);
  const inv = valueInverseTransform ?? ((v: number) => v);

  // Clean + downsample + transform values
  const cleaned = useMemo(() => {
    const arr = (points ?? [])
      .filter((p) => isFiniteNumber(p?.t) && isFiniteNumber(p?.v))
      .map((p) => ({ t: p.t, v: tf(p.v) }))
      .sort((a, b) => a.t - b.t);

    return downsample(arr, maxPoints);
  }, [points, tf, maxPoints]);

  // X labels: only show ~targetXLabels total, plus last point
  const labelEvery = useMemo(() => {
    const n = cleaned.length;
    if (n <= 1) return 1;
    return Math.max(1, Math.round(n / targetXLabels));
  }, [cleaned.length, targetXLabels]);

  const chartData = useMemo(() => {
    return cleaned.map((p, idx) => {
      const label =
        xLabelFormatter && (idx % labelEvery === 0 || idx === cleaned.length - 1)
          ? xLabelFormatter(p.t)
          : '';
      return { value: p.v, label };
    });
  }, [cleaned, xLabelFormatter, labelEvery]);

  // Dynamic y-window computed in DISPLAY DOMAIN, then transformed
  const { yMinT, yMaxT, yAxisOffset, maxValue } = useMemo(() => {
    if (cleaned.length < 2) {
      return { yMinT: 0, yMaxT: 1, yAxisOffset: 0, maxValue: 1 };
    }

    // We currently have values in TRANSFORM domain (cleaned.v).
    // To compute the display-domain window rules (± seconds, +2m), we invert first.
    let minD = inv(cleaned[0].v);
    let maxD = inv(cleaned[0].v);

    for (const p of cleaned) {
      const d = inv(p.v);
      if (d < minD) minD = d;
      if (d > maxD) maxD = d;
    }

    // Apply requested dynamic rules (display-domain)
    // Pace: pad by seconds => convert seconds to minutes (assuming v is minutes/unit)
    // If your pace is minutes per mile, 10s = 10/60 minutes.
    const padMinutes = yRangePadSeconds != null ? yRangePadSeconds / 60 : 0;

    let yMinD = minD - padMinutes - (yMinExtra ?? 0);
    let yMaxD = maxD + padMinutes + (yMaxExtra ?? 0);

    // Optional clamps override dynamic
    if (isFiniteNumber(yClampMin)) yMinD = yClampMin;
    if (isFiniteNumber(yClampMax)) yMaxD = yClampMax;

    // Avoid zero-range
    if (yMinD === yMaxD) {
      yMinD -= 0.001;
      yMaxD += 0.001;
    }

    // Transform back to chart domain
    const minT = tf(yMinD);
    const maxT = tf(yMaxD);

    // Ensure ordering in transform domain
    const lowT = Math.min(minT, maxT);
    const highT = Math.max(minT, maxT);

    const offset = lowT;
    const range = highT - lowT;

    return { yMinT: lowT, yMaxT: highT, yAxisOffset: offset, maxValue: range };
  }, [cleaned, inv, tf, yRangePadSeconds, yMaxExtra, yMinExtra, yClampMin, yClampMax]);

  // Y labels: must display DISPLAY-DOMAIN (so no negative pace labels)
  const yAxisLabelTexts = useMemo(() => {
    const fmt = valueFormatter ?? ((v: number) => `${v.toFixed(1)}`);
    const step = (yMaxT - yMinT) / Math.max(1, noOfSections);

    const labels: string[] = [];
    for (let i = 0; i <= noOfSections; i++) {
      const vT = yMinT + step * i;
      labels.push(fmt(inv(vT))); // ✅ inverse transform before formatting
    }
    return labels;
  }, [yMinT, yMaxT, noOfSections, valueFormatter, inv]);

  const pointerLabelText = (valT: number) => {
    const fmt = valueFormatter ?? ((v: number) => `${v.toFixed(1)}`);
    return fmt(inv(valT)); // ✅ inverse transform before formatting
  };

  const spacing = useMemo(() => {
    const n = chartData.length;
    if (!w || n <= 1) return 40;
    const raw = w / (n - 1);
    return Math.max(3, Math.min(120, raw));
  }, [w, chartData.length]);

  const hasData = chartData.length >= 2;

  return (
    <View onLayout={onLayout} style={[styles.card, { backgroundColor: cardBg }]}>
      <Text style={[styles.title, { color: textColor }]}>{title}</Text>

      {!hasData ? (
        <View style={styles.empty}>
          <Text style={[styles.emptyText, { color: textColor, opacity: 0.65 }]}>
            Not enough data to chart.
          </Text>
        </View>
      ) : (
        <LineChart
          data={chartData}
          height={height}
          width={w}
          parentWidth={w}
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
            fontSize: 10,
            fontWeight: '800',
          }}
          xAxisLabelTextStyle={{
            color: textColor,
            opacity: 0.55,
            fontSize: 10,
            fontWeight: '700',
            textAlign: 'center',
            marginLeft: -18,
          }}
          // ✅ Tight dynamic y-window
          yAxisOffset={yAxisOffset}
          maxValue={maxValue}
          // Clean look
          hideRules
          xAxisColor="transparent"
          yAxisColor="transparent"
          xAxisThickness={0}
          yAxisThickness={0}
          pointerConfig={{
            pointerStripHeight: height,
            pointerStripColor: 'rgba(255,255,255,0.12)',
            pointerStripWidth: 2,
            pointerColor: color,
            radius: 4,
            pointerLabelWidth: 140,
            pointerLabelHeight: 44,
            activatePointersOnLongPress: false,
            autoAdjustPointerLabelPosition: true,
            pointerLabelComponent: (items: any[]) => {
              const vT = Number(items?.[0]?.value);
              return (
                <View style={[styles.pointerLabel, { backgroundColor: cardBg }]}>
                  <Text style={[styles.pointerText, { color: textColor }]}>
                    {pointerLabelText(vT)}
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
