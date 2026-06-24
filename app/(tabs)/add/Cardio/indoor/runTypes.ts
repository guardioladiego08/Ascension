import { Ionicons } from '@expo/vector-icons';

export type IndoorRunSubtype = 'open' | 'interval';

export type IndoorRunTypeOption = {
  key: IndoorRunSubtype;
  label: string;
  detail: string;
  icon: keyof typeof Ionicons.glyphMap;
  accentTone: 'primary' | 'secondary';
};

export const INDOOR_RUN_TYPES: IndoorRunTypeOption[] = [
  {
    key: 'open',
    label: 'Open',
    detail: 'Standard treadmill-style indoor run with manual speed, incline, and live pace.',
    icon: 'speedometer-outline',
    accentTone: 'primary',
  },
  {
    key: 'interval',
    label: 'Interval',
    detail: 'Preset and custom interval workouts with timed cues and a dedicated indoor summary.',
    icon: 'repeat-outline',
    accentTone: 'secondary',
  },
];
