import { Ionicons } from '@expo/vector-icons';

export type OutdoorRunSubtype =
  | 'open'
  | 'easy_run'
  | 'long_run'
  | 'five_k'
  | 'ten_k'
  | 'half_marathon'
  | 'full_marathon'
  | 'tempo_run'
  | 'recovery_run'
  | 'hill_repeats'
  | 'interval';

export type OutdoorRunTypeOption = {
  key: OutdoorRunSubtype;
  label: string;
  detail: string;
  icon: keyof typeof Ionicons.glyphMap;
  accentTone: 'primary' | 'secondary' | 'tertiary';
};

export const OUTDOOR_RUN_TYPES: OutdoorRunTypeOption[] = [
  {
    key: 'open',
    label: 'Open',
    detail: 'Free-form outdoor run with the standard live stats screen.',
    icon: 'navigate-outline',
    accentTone: 'primary',
  },
  {
    key: 'easy_run',
    label: 'Easy Run',
    detail: 'A lighter aerobic session when you want distance without pressure.',
    icon: 'leaf-outline',
    accentTone: 'secondary',
  },
  {
    key: 'long_run',
    label: 'Long Run',
    detail: 'Steady endurance miles with the same live outdoor tracking flow.',
    icon: 'trail-sign-outline',
    accentTone: 'tertiary',
  },
  {
    key: 'five_k',
    label: '5K',
    detail: 'Use the open screen for a focused short-race effort or time trial.',
    icon: 'flash-outline',
    accentTone: 'primary',
  },
  {
    key: 'ten_k',
    label: '10K',
    detail: 'A medium-distance session with the standard outdoor run screen.',
    icon: 'timer-outline',
    accentTone: 'secondary',
  },
  {
    key: 'half_marathon',
    label: '1/2 Marathon',
    detail: 'Track a longer race-specific effort with the open outdoor layout.',
    icon: 'speedometer-outline',
    accentTone: 'tertiary',
  },
  {
    key: 'full_marathon',
    label: 'Full Marathon',
    detail: 'Use the open run screen for long race-day or simulation efforts.',
    icon: 'medal-outline',
    accentTone: 'primary',
  },
  {
    key: 'tempo_run',
    label: 'Tempo Run',
    detail: 'Threshold-focused pacing while still using the open outdoor tracker.',
    icon: 'pulse-outline',
    accentTone: 'secondary',
  },
  {
    key: 'recovery_run',
    label: 'Recovery Run',
    detail: 'An easy flush-out day with the standard outdoor run session flow.',
    icon: 'water-outline',
    accentTone: 'tertiary',
  },
  {
    key: 'hill_repeats',
    label: 'Hill Repeats',
    detail: 'A route-focused hill session using the open run tracker for now.',
    icon: 'trending-up-outline',
    accentTone: 'primary',
  },
  {
    key: 'interval',
    label: 'Interval',
    detail: 'Preset and custom interval workouts with cues, lock-screen alerts, and saved templates.',
    icon: 'repeat-outline',
    accentTone: 'primary',
  },
];

const OUTDOOR_RUN_TITLES: Record<OutdoorRunSubtype, string> = {
  open: 'Open Run',
  easy_run: 'Easy Run',
  long_run: 'Long Run',
  five_k: '5K Run',
  ten_k: '10K Run',
  half_marathon: 'Half Marathon Run',
  full_marathon: 'Full Marathon Run',
  tempo_run: 'Tempo Run',
  recovery_run: 'Recovery Run',
  hill_repeats: 'Hill Repeats',
  interval: 'Interval Run',
};

export function getOutdoorRunTitle(subtype: OutdoorRunSubtype | null | undefined) {
  if (!subtype) return OUTDOOR_RUN_TITLES.open;
  return OUTDOOR_RUN_TITLES[subtype] ?? OUTDOOR_RUN_TITLES.open;
}
