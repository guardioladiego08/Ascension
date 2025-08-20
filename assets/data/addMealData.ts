// components/addMeal/data.ts
export type DayMealData = {
  dateISO: string; // e.g., '2025-08-19'
  dayNum: number;  // 1..31
  macros: {
    protein: number; proteinGoal: number;
    carbs: number; carbsGoal: number;
    fats: number; fatsGoal: number;
  };
  calories: { value: number; goal: number };
};

/** Build 30 consecutive days starting from the first day of the current month */
export const generate30Days = (): DayMealData[] => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1); // start of month
  const days: DayMealData[] = [];

  for (let i = 0; i < 30; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);

    // deterministic-but-varied dummy data
    const proteinGoal = 200;
    const carbsGoal = 400;
    const fatsGoal = 30;
    const caloriesGoal = 3000;

    const protein = 160 + ((i * 13) % 61); // 160..220
    const carbs = 240 + ((i * 37) % 221);  // 240..460
    const fats = 18 + ((i * 5) % 20);      // 18..38
    const calories = 1800 + ((i * 190) % 1400); // 1800..3200

    days.push({
      dateISO: d.toISOString().slice(0, 10),
      dayNum: d.getDate(),
      macros: { protein, proteinGoal, carbs, carbsGoal, fats, fatsGoal },
      calories: { value: calories, goal: caloriesGoal },
    });
  }

  return days;
};

/** Highlight today's index if it exists in the dataset; else fallback to 0 */
export const getTodayIndex = (days: DayMealData[]): number => {
  const todayISO = new Date().toISOString().slice(0, 10);
  const idx = days.findIndex(d => d.dateISO === todayISO);
  return idx >= 0 ? idx : 0;
};
