import type { Href } from 'expo-router';

export const NUTRITION_ROUTES = {
  logHub: '/add/Nutrition/logMeal',
  logFood: '/add/Nutrition/logFood',
  createFood: '/add/Nutrition/createFood',
  scanFood: '/add/Nutrition/scanFood',
  scanFoodFallback: '/add/Nutrition/scanFoodFallback',
  scanFoodConfirm: '/add/Nutrition/scanFoodConfirm',
  createMeal: '/add/Nutrition/createMeal',
  dailySummary: '/progress/nutrition/dailyNutritionSummary',
} as const;

export function nutritionDailySummaryHref(date: string): Href {
  return {
    pathname: NUTRITION_ROUTES.dailySummary,
    params: { date },
  };
}
