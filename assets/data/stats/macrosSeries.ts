// assets/data/macrosSeries.tsx
// Derive the three (or four) series your *unchanged* BasicChart expects (WeightPoint[])

import type { MacroRow } from './macrosDataset';
export type WeightPoint = { label: string; value: number };

export const toProteinSeries = (data: MacroRow[]): WeightPoint[] =>
  data.map((r) => ({ label: r.date, value: r.protein }));

export const toCarbsSeries = (data: MacroRow[]): WeightPoint[] =>
  data.map((r) => ({ label: r.date, value: r.macros }));

export const toFatsSeries = (data: MacroRow[]): WeightPoint[] =>
  data.map((r) => ({ label: r.date, value: r.fats }));

export const toCaloriesSeries = (data: MacroRow[]): WeightPoint[] =>
  data.map((r) => ({ label: r.date, value: r.calories }));
