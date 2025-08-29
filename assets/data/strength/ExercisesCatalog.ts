// assets/data/ExercisesCatalog.ts
// Central data source for the Search Exercise page and its modals.
// - EXERCISES drives the visible list (alphabetized and searchable).
// - EXERCISE_STATS populates the "Stats" modal when a row is tapped.
//
// You can freely add/edit these entries; IDs are referenced by EXERCISE_STATS.

export type Exercise = {
  id: string;
  name: string;
  aliases?: string[];
  primaryMuscles: string[];
  secondaryMuscles?: string[];
  equipment?: string[];
  description: string;
  tips?: string[];
};

export type ExerciseStats = {
  exerciseId: string;
  lastDate?: string; // YYYY-MM-DD
  sessions?: number; // past 90d
  best1RM?: number; // lbs
  bestVolume?: number; // one-session total
  avgVolume?: number; // average per session
  recentPRs?: { date: string; weight: number; reps: number }[];
};

export const EXERCISES: Exercise[] = [
  {
    id: 'box_jumps',
    name: 'Box Jumps',
    aliases: ['Plyo Box Jump'],
    primaryMuscles: ['Quadriceps', 'Glutes', 'Calves'],
    secondaryMuscles: ['Hamstrings', 'Core'],
    equipment: ['Plyo Box'],
    description:
      'Explosive jump from the floor to a box. Land softly with knees tracking over toes and step down to reset.',
    tips: [
      'Start with a box height you can land safely.',
      'Absorb impact by hinging hips and bending knees.',
    ],
  },
  {
    id: 'box_squat_barbell',
    name: 'Box Squat (Barbell)',
    aliases: ['Barbell Box Squat'],
    primaryMuscles: ['Quadriceps', 'Glutes'],
    secondaryMuscles: ['Hamstrings', 'Core'],
    equipment: ['Barbell', 'Rack', 'Box'],
    description:
      'Back squat variation sitting back to a box to control depth and reinforce hip hinge mechanics.',
    tips: [
      'Keep shins vertical as you sit back.',
      'Lightly touch the box; do not fully relax.',
    ],
  },
  {
    id: 'bulgarian_split_squat',
    name: 'Bulgarian Split Squat',
    primaryMuscles: ['Quadriceps', 'Glutes'],
    secondaryMuscles: ['Hamstrings', 'Core'],
    equipment: ['Bench', 'Dumbbells (optional)'],
    description:
      'Rear-foot elevated split squat emphasizing front-leg drive and balance.',
    tips: [
      'Keep torso upright; slight forward lean is ok.',
      'Knee tracks in line with toes.',
    ],
  },
  {
    id: 'burpee',
    name: 'Burpee',
    primaryMuscles: ['Full Body'],
    equipment: [],
    description:
      'From standing to plank, push-up (optional), jump feet under hips and explode vertically.',
    tips: ['Maintain a tight core in the plank.', 'Find a sustainable rhythm.'],
  },
  {
    id: 'cable_crossover',
    name: 'Cable Crossover',
    primaryMuscles: ['Chest'],
    secondaryMuscles: ['Shoulders', 'Triceps'],
    equipment: ['Cable Machine'],
    description:
      'Flye motion with cables emphasizing chest contraction through horizontal adduction.',
    tips: ['Slight elbow bend; avoid shrugging.', 'Squeeze at midline briefly.'],
  },
  {
    id: 'cable_crunch',
    name: 'Cable Crunch',
    primaryMuscles: ['Abdominals'],
    equipment: ['Cable Machine', 'Rope'],
    description:
      'Kneeling or standing crunch pulling cable down by flexing the spine, not just the hips.',
    tips: ['Keep hips stacked; curl ribs to pelvis.', 'Exhale during the crunch.'],
  },
  {
    id: 'cable_kickback',
    name: 'Cable Kickback',
    primaryMuscles: ['Glutes'],
    secondaryMuscles: ['Hamstrings'],
    equipment: ['Cable Machine', 'Ankle Strap'],
    description:
      'Hip extension using cable resistance to target the glute max.',
    tips: ['Lock the knee softly; move through the hip.', 'Pause at peak squeeze.'],
  },
  {
    id: 'cable_pull_through',
    name: 'Cable Pull Through',
    aliases: ['Pull-Through'],
    primaryMuscles: ['Glutes', 'Hamstrings'],
    secondaryMuscles: ['Lower Back'],
    equipment: ['Cable Machine', 'Rope'],
    description:
      'Hip-hinge pattern pulling cable between the legs, focusing on posterior chain.',
    tips: ['Neutral spine; push hips back.', 'Drive hips forward to stand tall.'],
  },
  {
    id: 'bench_press_barbell',
    name: 'Bench Press (Barbell)',
    primaryMuscles: ['Chest'],
    secondaryMuscles: ['Triceps', 'Shoulders'],
    equipment: ['Barbell', 'Bench', 'Rack'],
    description:
      'Press barbell from the chest while maintaining scapular retraction and stable lower body.',
    tips: ['Feet planted, slight arch.', 'Control descent; press explosively.'],
  },
  {
    id: 'deadlift',
    name: 'Deadlift',
    primaryMuscles: ['Glutes', 'Hamstrings', 'Back'],
    secondaryMuscles: ['Core', 'Forearms'],
    equipment: ['Barbell', 'Plates'],
    description:
      'Hip hinge to lift the bar from floor to lockout while maintaining a neutral spine.',
    tips: ['Keep bar close; engage lats.', 'Push floor away; don’t yank.'],
  },
  {
    id: 'squat_barbell',
    name: 'Squat (Barbell)',
    primaryMuscles: ['Quadriceps', 'Glutes'],
    secondaryMuscles: ['Hamstrings', 'Core'],
    equipment: ['Barbell', 'Rack'],
    description:
      'Back squat to full depth under control with braced trunk and stable feet.',
    tips: ['Brace before descent.', 'Drive knees out; keep chest proud.'],
  },
  {
    id: 'ohp_barbell',
    name: 'Overhead Press (Barbell)',
    primaryMuscles: ['Shoulders'],
    secondaryMuscles: ['Triceps', 'Upper Back', 'Core'],
    equipment: ['Barbell', 'Rack'],
    description:
      'Press the barbell overhead from the shoulders, finishing with elbows locked and biceps near ears.',
    tips: ['Squeeze glutes and abs.', 'Head moves through at the top.'],
  },
];

export const EXERCISE_STATS: Record<string, ExerciseStats> = {
  box_squat_barbell: {
    exerciseId: 'box_squat_barbell',
    lastDate: '2025-08-20',
    sessions: 6,
    best1RM: 315,
    bestVolume: 14250,
    avgVolume: 11800,
    recentPRs: [
      { date: '2025-08-10', weight: 295, reps: 3 },
      { date: '2025-08-20', weight: 315, reps: 1 },
    ],
  },
  squat_barbell: {
    exerciseId: 'squat_barbell',
    lastDate: '2025-08-18',
    sessions: 8,
    best1RM: 365,
    bestVolume: 16500,
    avgVolume: 13400,
    recentPRs: [{ date: '2025-08-18', weight: 335, reps: 2 }],
  },
  bench_press_barbell: {
    exerciseId: 'bench_press_barbell',
    lastDate: '2025-08-17',
    sessions: 9,
    best1RM: 265,
    bestVolume: 12400,
    avgVolume: 9800,
    recentPRs: [{ date: '2025-08-12', weight: 245, reps: 2 }],
  },
  deadlift: {
    exerciseId: 'deadlift',
    lastDate: '2025-08-14',
    sessions: 7,
    best1RM: 455,
    bestVolume: 18200,
    avgVolume: 15000,
    recentPRs: [{ date: '2025-08-14', weight: 405, reps: 3 }],
  },
  ohp_barbell: {
    exerciseId: 'ohp_barbell',
    lastDate: '2025-08-13',
    sessions: 5,
    best1RM: 165,
    bestVolume: 6200,
    avgVolume: 5200,
  },
  // Plyo/isolation examples without stats yet:
  box_jumps: { exerciseId: 'box_jumps' },
  bulgarian_split_squat: { exerciseId: 'bulgarian_split_squat' },
  burpee: { exerciseId: 'burpee' },
  cable_crossover: { exerciseId: 'cable_crossover' },
  cable_crunch: { exerciseId: 'cable_crunch' },
  cable_kickback: { exerciseId: 'cable_kickback' },
  cable_pull_through: { exerciseId: 'cable_pull_through' },
};

export default EXERCISES;
