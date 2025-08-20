// components/my components/activities/add meal/savedMealsStore.tsx
// Tiny in‑memory store for saved meals (used by the "From Recipe" popup).
// - Any newly created meal is pushed here
// - Screens/components can subscribe to updates

import { useEffect, useSyncExternalStore } from 'react';

export type Macro = { protein: number; carbs: number; fats: number };
export type Ingredient = { id: string; name: string; macros: Macro; calories: number };
export type MealData = {
  id: string;
  name: string;
  ingredients: Ingredient[];
  totals: { protein: number; carbs: number; fats: number; calories: number };
};

type Listener = () => void;

let SAVED_MEALS: MealData[] = [];
const listeners = new Set<Listener>();

const emit = () => listeners.forEach(l => l());

export const savedMealsStore = {
  get(): MealData[] {
    return SAVED_MEALS;
  },
  add(meal: MealData) {
    // if same name+totals already exists, keep latest first
    SAVED_MEALS = [meal, ...SAVED_MEALS.filter(m => m.id !== meal.id)];
    emit();
  },
  subscribe(cb: Listener) {
    listeners.add(cb);
    return () => listeners.delete(cb);
  },
};

// Hook so components can reactively read the list
export function useSavedMeals() {
  const meals = useSyncExternalStore(savedMealsStore.subscribe, savedMealsStore.get, savedMealsStore.get);
  // ensure array identity is stable across renders if unchanged
  useEffect(() => {}, [meals]);
  return meals;
}
