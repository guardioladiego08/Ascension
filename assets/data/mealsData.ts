// assets/data/mealsData.ts
// Manually generated dataset to populate the Meals screen.
export type MealItem = {
  id: string;
  title: string;      // e.g., "Monday Breakfast"
  subtitle: string;   // e.g., "Chicken and Egg Scramble"
  date: string;       // "2025-06-16"
  time: string;       // "8:10 AM"
  calories: number;   // total kcal
  protein: number;    // grams
  carbs: number;      // grams
  fat: number;        // grams
};

const mealsData: MealItem[] = [
  {
    id: 'm1',
    title: 'Monday Breakfast',
    subtitle: 'Chicken and Egg Scramble',
    date: '2025-06-16',
    time: '8:10 AM',
    calories: 450,
    protein: 40,
    carbs: 35,
    fat: 15,
  },
  {
    id: 'm2',
    title: 'Monday Lunch',
    subtitle: 'Turkey Bowl w/ Quinoa',
    date: '2025-06-16',
    time: '12:42 PM',
    calories: 640,
    protein: 48,
    carbs: 65,
    fat: 18,
  },
  {
    id: 'm3',
    title: 'Monday Dinner',
    subtitle: 'Salmon, Rice & Greens',
    date: '2025-06-16',
    time: '7:25 PM',
    calories: 720,
    protein: 44,
    carbs: 70,
    fat: 26,
  },
  {
    id: 'm4',
    title: 'Tuesday Breakfast',
    subtitle: 'Greek Yogurt w/ Granola',
    date: '2025-06-17',
    time: '8:05 AM',
    calories: 410,
    protein: 28,
    carbs: 48,
    fat: 10,
  },
  {
    id: 'm5',
    title: 'Tuesday Lunch',
    subtitle: 'Chicken Burrito Bowl',
    date: '2025-06-17',
    time: '12:33 PM',
    calories: 690,
    protein: 52,
    carbs: 68,
    fat: 20,
  },
  {
    id: 'm6',
    title: 'Tuesday Dinner',
    subtitle: 'Beef Stir Fry',
    date: '2025-06-17',
    time: '7:08 PM',
    calories: 730,
    protein: 45,
    carbs: 66,
    fat: 27,
  },
  {
    id: 'm7',
    title: 'Wednesday Breakfast',
    subtitle: 'Oats, Banana, Whey',
    date: '2025-06-18',
    time: '7:55 AM',
    calories: 520,
    protein: 36,
    carbs: 68,
    fat: 12,
  },
  {
    id: 'm8',
    title: 'Wednesday Lunch',
    subtitle: 'Chicken Caesar Wrap',
    date: '2025-06-18',
    time: '12:21 PM',
    calories: 610,
    protein: 42,
    carbs: 55,
    fat: 20,
  },
  {
    id: 'm9',
    title: 'Wednesday Dinner',
    subtitle: 'Shrimp Pasta',
    date: '2025-06-18',
    time: '7:17 PM',
    calories: 740,
    protein: 38,
    carbs: 92,
    fat: 18,
  },
  {
    id: 'm10',
    title: 'Thursday Breakfast',
    subtitle: 'Egg & Avocado Toast',
    date: '2025-06-19',
    time: '8:14 AM',
    calories: 480,
    protein: 24,
    carbs: 44,
    fat: 22,
  },
  {
    id: 'm11',
    title: 'Thursday Lunch',
    subtitle: 'Sushi Plate',
    date: '2025-06-19',
    time: '1:06 PM',
    calories: 620,
    protein: 34,
    carbs: 82,
    fat: 12,
  },
  {
    id: 'm12',
    title: 'Thursday Dinner',
    subtitle: 'Chicken Alfredo',
    date: '2025-06-19',
    time: '7:38 PM',
    calories: 760,
    protein: 40,
    carbs: 86,
    fat: 24,
  },
];

export default mealsData;
