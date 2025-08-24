// assets/data/macrosData.ts
// Manually generated dataset with 2 separate arrays: caloriesData and macrosData.
// Ratios hover around 50% protein, 30% carbs, 20% fat with small realistic variance.

import type { MacroDataset } from '@/components/my components/charts/StepRangeChart';

export const caloriesData = [
  { label: '2025-07-01', calories: 2400 },
  { label: '2025-07-02', calories: 2450 },
  { label: '2025-07-03', calories: 2350 },
  { label: '2025-07-04', calories: 2500 },
  { label: '2025-07-05', calories: 2420 },
  { label: '2025-07-06', calories: 2380 },
  { label: '2025-07-07', calories: 2475 },
  { label: '2025-07-08', calories: 2410 },
  { label: '2025-07-09', calories: 2390 },
  { label: '2025-07-10', calories: 2440 },
  { label: '2025-07-11', calories: 2480 },
  { label: '2025-07-12', calories: 2360 },
  { label: '2025-07-13', calories: 2430 },
  { label: '2025-07-14', calories: 2490 },
  { label: '2025-07-15', calories: 2415 },
  { label: '2025-07-16', calories: 2460 },
  { label: '2025-07-17', calories: 2395 },
  { label: '2025-07-18', calories: 2505 },
  { label: '2025-07-19', calories: 2370 },
  { label: '2025-07-20', calories: 2435 },
  { label: '2025-07-21', calories: 2465 },
  { label: '2025-07-22', calories: 2385 },
  { label: '2025-07-23', calories: 2425 },
  { label: '2025-07-24', calories: 2470 },
  { label: '2025-07-25', calories: 2405 },
  { label: '2025-07-26', calories: 2365 },
  { label: '2025-07-27', calories: 2495 },
  { label: '2025-07-28', calories: 2418 },
  { label: '2025-07-29', calories: 2398 },
  { label: '2025-07-30', calories: 2455 },
];

// matching macros data — keep grams aligned to calories (approx. ratio 50/30/20)
export const macrosData = [
  { label: '2025-07-01', protein: 300, carbs: 180, fat: 53 },
  { label: '2025-07-02', protein: 305, carbs: 184, fat: 55 },
  { label: '2025-07-03', protein: 292, carbs: 176, fat: 52 },
  { label: '2025-07-04', protein: 312, carbs: 188, fat: 56 },
  { label: '2025-07-05', protein: 298, carbs: 181, fat: 54 },
  { label: '2025-07-06', protein: 289, carbs: 174, fat: 51 },
  { label: '2025-07-07', protein: 308, carbs: 186, fat: 55 },
  { label: '2025-07-08', protein: 297, carbs: 180, fat: 53 },
  { label: '2025-07-09', protein: 294, carbs: 178, fat: 52 },
  { label: '2025-07-10', protein: 302, carbs: 182, fat: 54 },
  { label: '2025-07-11', protein: 308, carbs: 185, fat: 56 },
  { label: '2025-07-12', protein: 293, carbs: 177, fat: 52 },
  { label: '2025-07-13', protein: 300, carbs: 182, fat: 53 },
  { label: '2025-07-14', protein: 310, carbs: 187, fat: 55 },
  { label: '2025-07-15', protein: 298, carbs: 181, fat: 53 },
  { label: '2025-07-16', protein: 304, carbs: 183, fat: 54 },
  { label: '2025-07-17', protein: 295, carbs: 179, fat: 52 },
  { label: '2025-07-18', protein: 312, carbs: 188, fat: 57 },
  { label: '2025-07-19', protein: 290, carbs: 175, fat: 51 },
  { label: '2025-07-20', protein: 301, carbs: 182, fat: 53 },
  { label: '2025-07-21', protein: 305, carbs: 184, fat: 54 },
  { label: '2025-07-22', protein: 292, carbs: 176, fat: 52 },
  { label: '2025-07-23', protein: 300, carbs: 181, fat: 53 },
  { label: '2025-07-24', protein: 307, carbs: 185, fat: 55 },
  { label: '2025-07-25', protein: 296, carbs: 180, fat: 53 },
  { label: '2025-07-26', protein: 289, carbs: 174, fat: 51 },
  { label: '2025-07-27', protein: 311, carbs: 187, fat: 56 },
  { label: '2025-07-28', protein: 298, carbs: 181, fat: 54 },
  { label: '2025-07-29', protein: 294, carbs: 178, fat: 52 },
  { label: '2025-07-30', protein: 303, carbs: 183, fat: 54 },
];

// Wrap them into the MacroDataset shape for the chart
const macrosDataset: MacroDataset = {
  dailyData: macrosData.slice(-7), // last 7 days
  monthlyData: macrosData,         // full July month
  yearlyData: [
    { label: '2025-01-01', protein: 280, carbs: 170, fat: 50 },
    { label: '2025-02-01', protein: 285, carbs: 175, fat: 52 },
    { label: '2025-03-01', protein: 290, carbs: 178, fat: 53 },
    { label: '2025-04-01', protein: 295, carbs: 180, fat: 54 },
    { label: '2025-05-01', protein: 300, carbs: 182, fat: 55 },
    { label: '2025-06-01', protein: 305, carbs: 185, fat: 55 },
    { label: '2025-07-01', protein: 300, carbs: 180, fat: 53 },
    { label: '2025-08-01', protein: 310, carbs: 187, fat: 56 },
    { label: '2025-09-01', protein: 295, carbs: 179, fat: 52 },
    { label: '2025-10-01', protein: 302, carbs: 182, fat: 54 },
    { label: '2025-11-01', protein: 298, carbs: 181, fat: 53 },
    { label: '2025-12-01', protein: 305, carbs: 184, fat: 55 },
  ],
};

export default macrosDataset;
