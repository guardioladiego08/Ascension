// assets/data/macrosDataset.tsx
// 400 daily rows ending TODAY, each with: date, macros (carbs), protein, fats, calories.

import moment from 'moment';

export type MacroRow = {
  date: string;    // 'YYYY-MM-DD'
  macros: number;  // carbs (g)
  protein: number; // grams
  fats: number;    // grams
  calories: number;
};

const clamp = (n: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, Math.round(n)));
const rand = (min: number, max: number) => Math.random() * (max - min) + min;
const wobble = (i: number) => Math.sin(i / 9) * 10 + Math.cos(i / 5) * 6;

export const generateMacrosDataset = (days: number = 400): MacroRow[] => {
  const rows: MacroRow[] = [];
  const today = moment();

  for (let i = days - 1; i >= 0; i--) {
    const date = moment(today).subtract(i, 'days').format('YYYY-MM-DD');
    const w = wobble(i);

    const protein = clamp(140 + w + rand(-30, 30), 70, 220);
    const macros  = clamp(230 + w * 1.2 + rand(-70, 70), 100, 380); // carbs
    const fats    = clamp(70 + w * 0.8 + rand(-25, 25), 30, 120);
    const calories = clamp(protein * 4 + macros * 4 + fats * 9, 1200, 4500);

    rows.push({ date, macros, protein, fats, calories });
  }
  return rows;
};

// Ready-to-use dataset
const macrosDataset: MacroRow[] = generateMacrosDataset(400);
export default macrosDataset;
