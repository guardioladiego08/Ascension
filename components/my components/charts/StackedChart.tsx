// components/my components/charts/BasicChart.tsx
// STACKED MACROS CHART (Protein + Carbs + Fat) using react-native-graph
// FIX: react-native-graph requires HEX colors -> converted palette + gradients to HEX (#RRGGBB / #RRGGBBAA)

import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import moment from 'moment';
import { LineGraph, type GraphPoint } from 'react-native-graph';
import { SelectionDot } from './CustomSelectionDot';
import { GlobalStyles } from '@/constants/GlobalStyles';

export type MacroPoint = {
  label: string; // 'YYYY-MM-DD'
  protein: number; // grams per day
  carbs: number;
  fat: number;
};

type RangeKey = 'week' | 'month' | '6m' | 'year';

type Props = {
  title: string;
  height?: number;
  data: MacroPoint[];
  colors?: {
    protein?: string; // accepts hex or rgba; we normalize to hex internally
    carbs?: string;
    fat?: string;
  };
};

const RANGE_TO_DAYS: Record<RangeKey, number> = {
  week: 7,
  month: 30,
  '6m': 182,
  year: 365,
};

/** ----- Color helpers (normalize to HEX) ----- **/
const clamp255 = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
const to2 = (n: number) => n.toString(16).padStart(2, '0').toUpperCase();

const rgbaToHex = (rgba: string): string | null => {
  // supports rgb(r,g,b) and rgba(r,g,b,a)
  const m = rgba
    .replace(/\s+/g, '')
    .match(/^rgba?\((\d{1,3}),(\d{1,3}),(\d{1,3})(?:,([0-9]*\.?[0-9]+))?\)$/i);
  if (!m) return null;
  const r = clamp255(parseFloat(m[1]));
  const g = clamp255(parseFloat(m[2]));
  const b = clamp255(parseFloat(m[3]));
  const a = m[4] === undefined ? 1 : Math.max(0, Math.min(1, parseFloat(m[4])));
  const base = `#${to2(r)}${to2(g)}${to2(b)}`;
  return a === 1 ? base : `${base}${to2(Math.round(a * 255))}`;
};

const isHex = (s: string) => /^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(s);

const normalizeToHex = (color: string, fallback: string): string => {
  if (!color) return fallback;
  if (isHex(color)) return color.toUpperCase();
  const asHex = rgbaToHex(color);
  return asHex ? asHex : fallback;
};

const withAlpha = (hex: string, alpha: number): string => {
  // ensure #RRGGBB -> #RRGGBBAA
  const base = hex.length === 7 ? hex : hex.slice(0, 7);
  const aa = to2(Math.round(Math.max(0, Math.min(1, alpha)) * 255));
  return `${base}${aa}`;
};

/** Default palette in HEX */
const DEFAULTS = {
  protein: '#5887FF', // blue
  carbs: '#FF950A',   // orange
  fat: '#2ECC71',     // green
};

export default function StackedChart({
  title,
  height = 220,
  data,
  colors,
}: Props) {
  const [range, setRange] = useState<RangeKey>('month');
  const [selected, setSelected] = useState<GraphPoint | null>(null);

  // Merge + normalize to HEX for react-native-graph
  const palette = useMemo(() => {
    const protein = normalizeToHex(colors?.protein ?? DEFAULTS.protein, DEFAULTS.protein);
    const carbs = normalizeToHex(colors?.carbs ?? DEFAULTS.carbs, DEFAULTS.carbs);
    const fat = normalizeToHex(colors?.fat ?? DEFAULTS.fat, DEFAULTS.fat);

    return {
      protein,
      carbs,
      fat,
      proteinFill: [withAlpha(protein, 0.35), withAlpha(protein, 0.05)],
      carbsFill: [withAlpha(carbs, 0.35), withAlpha(carbs, 0.05)],
      fatFill: [withAlpha(fat, 0.35), withAlpha(fat, 0.05)],
    };
  }, [colors]);

  // Ascending by date (safety)
  const sorted = useMemo<MacroPoint[]>(() => {
    if (!data?.length) return [];
    return [...data].sort((a, b) => (a.label < b.label ? -1 : a.label > b.label ? 1 : 0));
  }, [data]);

  // End the slice at "today" if present; else the last point
  const sliced: MacroPoint[] = useMemo(() => {
    if (!sorted.length) return [];
    const todayStr = moment().format('YYYY-MM-DD');

    let endIndex = sorted.findIndex((d) => d.label === todayStr);
    if (endIndex === -1) endIndex = sorted.length - 1;

    const days = RANGE_TO_DAYS[range];
    const startIndex = Math.max(0, endIndex - (days - 1));
    return sorted.slice(startIndex, endIndex + 1);
  }, [sorted, range]);

  // Build three series (cumulative stack)
  const { proteinPts, carbsCumPts, fatCumPts } = useMemo(() => {
    const proteinPts: GraphPoint[] = [];
    const carbsCumPts: GraphPoint[] = [];
    const fatCumPts: GraphPoint[] = [];

    for (const d of sliced) {
      const date = new Date(d.label);
      const protein = d.protein;
      const carbsCum = d.protein + d.carbs;
      const fatCum = d.protein + d.carbs + d.fat;

      proteinPts.push({ value: protein, date });
      carbsCumPts.push({ value: carbsCum, date });
      fatCumPts.push({ value: fatCum, date });
    }

    return { proteinPts, carbsCumPts, fatCumPts };
  }, [sliced]);

  // x-range from first to last available point
  const xRange = useMemo(() => {
    if (!fatCumPts.length) return undefined as undefined | { min: Date; max: Date };
    return { min: fatCumPts[0].date, max: fatCumPts[fatCumPts.length - 1].date };
  }, [fatCumPts]);

  // y-range based on TOP stack (total grams)
  const yRange = useMemo(() => {
    if (!fatCumPts.length) return undefined as undefined | { min: number; max: number };
    const vals = fatCumPts.map((p) => p.value);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const pad = Math.max(10, Math.round((max - min) * 0.08));
    let lo = Math.max(0, min - pad);
    let hi = max + pad;
    if (lo >= hi) {
      lo = Math.max(0, lo - 0.5);
      hi += 0.5;
    }
    return { min: lo, max: hi };
  }, [fatCumPts]);

  // Header date range
  const rangeLabel = useMemo(() => {
    if (!sliced.length) return '';
    const first = moment(sliced[0].label).format('MMM D');
    const last = moment(sliced[sliced.length - 1].label).format('MMM D');
    return `${first} – ${last}`;
  }, [sliced]);

  // Selected day's macros for readout
  const selectedMacro = useMemo(() => {
    if (!selected) return null;
    const key = moment(selected.date).format('YYYY-MM-DD');
    return sliced.find((d) => d.label === key) ?? null;
  }, [selected, sliced]);

  // Top-right badge content
  const topRightText = useMemo(() => {
    const format = (d: MacroPoint) => {
      const total = d.protein + d.carbs + d.fat;
      const day = moment(d.label).format('MMM D');
      return `${day}  •  ${total}g (P${d.protein} / C${d.carbs} / F${d.fat})`;
    };
    if (selectedMacro) return format(selectedMacro);
    if (sliced.length) return format(sliced[sliced.length - 1]);
    return '—';
  }, [selectedMacro, sliced]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={GlobalStyles.subtitle}>{title.toUpperCase()}</Text>
          <Text style={GlobalStyles.text}>{rangeLabel}</Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{topRightText}</Text>
        </View>
      </View>

      {/* Graph box: overlay THREE LineGraph layers to simulate a stacked area */}
      <View style={[styles.graphBox, { height }]}>
        {/* BASE LAYER: Protein */}
        <LineGraph
          points={proteinPts}
          animated
          color={palette.protein}
          style={StyleSheet.absoluteFill}
          gradientFillColors={palette.proteinFill}
          range={{ y: yRange, x: xRange }}
          enablePanGesture={false}
          SelectionDot={SelectionDot}
        />

        {/* MIDDLE LAYER: Protein + Carbs (cumulative) */}
        <LineGraph
          points={carbsCumPts}
          animated
          color={palette.carbs}
          style={StyleSheet.absoluteFill}
          gradientFillColors={palette.carbsFill}
          range={{ y: yRange, x: xRange }}
          enablePanGesture={false}
          SelectionDot={SelectionDot}
        />

        {/* TOP LAYER: Protein + Carbs + Fat (cumulative) — gestures attached here */}
        <LineGraph
          points={fatCumPts}
          animated
          color={palette.fat}
          style={{ height, width: '100%' }}
          gradientFillColors={palette.fatFill}
          range={{ y: yRange, x: xRange }}
          enablePanGesture
          onPointSelected={(p) => setSelected(p)}
          onGestureEnd={() => setSelected(null)}
          SelectionDot={SelectionDot}
        />
      </View>

      {/* Bottom range selector */}
      <View style={styles.selectorRow}>
        {(['week', 'month', '6m', 'year'] as RangeKey[]).map((key) => {
          const label = key === '6m' ? '6M' : key.charAt(0).toUpperCase() + key.slice(1);
          const active = key === range;
          return (
            <TouchableOpacity
              key={key}
              onPress={() => setRange(key)}
              style={[styles.selBtn, active && styles.selBtnActive]}
              activeOpacity={0.8}
            >
              <Text style={[styles.selText, active && styles.selTextActive]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Local replacements for any GlobalStyles.Chart.* usage
  container: {
    width: '100%',
    paddingVertical: 8,
  },
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },

  headerRow: { flexDirection: 'row', alignItems: 'flex-start' },

  graphBox: {
    width: '100%',
    justifyContent: 'center',
    position: 'relative',
  },

  selectorRow: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  selBtn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#C2C2C2',
    backgroundColor: 'transparent',
  },
  selBtnActive: {
    backgroundColor: '#C2C2C2',
    borderColor: '#C2C2C2',
  },
  selText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  selTextActive: { color: '#000000' },
});
