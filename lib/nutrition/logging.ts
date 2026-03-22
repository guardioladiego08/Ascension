import type { MealSlot } from '@/lib/nutrition/dataAccess';

export type MealSlotOption = {
  value: MealSlot;
  label: string;
};

const BREAKFAST_START_HOUR = 5;
const LUNCH_START_HOUR = 11;
const AFTERNOON_START_HOUR = 15;
const DINNER_START_HOUR = 18;

export const FOOD_LOG_MEAL_SLOTS: MealSlotOption[] = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snack' },
  { value: 'pre-workout', label: 'Pre-workout' },
  { value: 'post-workout', label: 'Post-workout' },
  { value: 'custom', label: 'Other' },
];

export function getDefaultMealSlotForNow(now = new Date()): MealSlot {
  const hours = now.getHours();

  if (hours >= DINNER_START_HOUR) return 'dinner';
  if (hours >= AFTERNOON_START_HOUR) return 'snack';
  if (hours >= LUNCH_START_HOUR) return 'lunch';
  if (hours >= BREAKFAST_START_HOUR) return 'breakfast';
  return 'snack';
}

export function mealSlotToMealType(slot: MealSlot) {
  return slot === 'custom' ? 'other' : slot;
}

export function mealSlotLabel(slot: MealSlot) {
  if (slot === 'pre-workout') return 'Pre-workout';
  if (slot === 'post-workout') return 'Post-workout';
  if (slot === 'custom') return 'Other';
  return slot.charAt(0).toUpperCase() + slot.slice(1);
}
