import { createIntervalPlan } from '@/lib/intervals/plans';
import type { IntervalPlan } from '@/lib/intervals/types';

export const INTERVAL_PRESETS: IntervalPlan[] = [
  createIntervalPlan({
    id: 'preset-30-60-speed-builder',
    source: 'preset',
    name: '30/60 Speed Builder',
    description:
      'A classic short-repeat workout with quick 30-second surges and full one-minute resets.',
    benefit:
      'Sharpens turnover and speed without forcing a long redline effort, which makes it approachable for early speed phases.',
    originLabel: 'Inspired by common short-interval workouts from Verywell Fit and Nike training plans.',
    tags: ['speed', '5k', 'starter'],
    steps: [
      { kind: 'warmup', label: 'Warm-up', durationSeconds: 300, cue: 'Ease in and get your stride open.' },
      ...Array.from({ length: 10 }, (_, index) => [
        {
          kind: 'work' as const,
          label: `Work ${index + 1}`,
          durationSeconds: 30,
          cue: `Quick turnover for rep ${index + 1}.`,
          intervalIndex: index + 1,
        },
        {
          kind: 'recovery' as const,
          label: `Break ${index + 1}`,
          durationSeconds: 60,
          cue: 'Jog easy and let your breathing reset.',
          intervalIndex: index + 1,
        },
      ]).flat(),
    ],
  }),
  createIntervalPlan({
    id: 'preset-2-minute-vo2-builder',
    source: 'preset',
    name: '2-Minute VO2 Builder',
    description:
      'Longer work reps with equal recovery to sit near your hard 5K effort without sprinting.',
    benefit:
      'Builds aerobic power and improves how long you can hold a fast effort before your form fades.',
    originLabel: 'Inspired by Runner’s World VO2 max interval sessions.',
    tags: ['vo2', 'speed-endurance', 'race'],
    steps: [
      { kind: 'warmup', label: 'Warm-up', durationSeconds: 480, cue: 'Settle into rhythm before the first hard rep.' },
      ...Array.from({ length: 6 }, (_, index) => [
        {
          kind: 'work' as const,
          label: `Work ${index + 1}`,
          durationSeconds: 120,
          cue: `Hold a strong 5K-style effort for rep ${index + 1}.`,
          intervalIndex: index + 1,
        },
        {
          kind: 'recovery' as const,
          label: `Break ${index + 1}`,
          durationSeconds: 120,
          cue: 'Recover with a light jog before going again.',
          intervalIndex: index + 1,
        },
      ]).flat(),
    ],
  }),
  createIntervalPlan({
    id: 'preset-tempo-float',
    source: 'preset',
    name: 'Tempo Float',
    description:
      'Threshold-style repeats with short float recoveries to keep pressure on while staying controlled.',
    benefit:
      'Raises lactate-threshold control so steady hard pace starts to feel smoother and more repeatable.',
    originLabel: 'Inspired by REI tempo-run guidance and Nike tempo training recommendations.',
    tags: ['tempo', 'threshold', 'half-marathon'],
    steps: [
      { kind: 'warmup', label: 'Warm-up', durationSeconds: 480, cue: 'Build to a steady warm rhythm.' },
      ...Array.from({ length: 4 }, (_, index) => [
        {
          kind: 'work' as const,
          label: `Tempo ${index + 1}`,
          durationSeconds: 240,
          cue: 'Settle into a strong but sustainable threshold pace.',
          intervalIndex: index + 1,
        },
        {
          kind: 'recovery' as const,
          label: `Float ${index + 1}`,
          durationSeconds: 90,
          cue: 'Back off just enough to reset without stopping the flow.',
          intervalIndex: index + 1,
        },
      ]).flat(),
    ],
  }),
  createIntervalPlan({
    id: 'preset-hill-repeat-power',
    source: 'preset',
    name: 'Hill Repeat Power',
    description:
      'Short uphill efforts with generous recovery so you can keep posture, power, and drive clean.',
    benefit:
      'Improves power, running economy, and form under load without requiring maximal sprint speed.',
    originLabel: 'Inspired by Nike and Verywell Fit hill-repeat recommendations.',
    tags: ['hill', 'power', 'economy'],
    steps: [
      { kind: 'warmup', label: 'Warm-up', durationSeconds: 600, cue: 'Find your hill and get fully loose before climbing.' },
      ...Array.from({ length: 6 }, (_, index) => [
        {
          kind: 'work' as const,
          label: `Hill ${index + 1}`,
          durationSeconds: 45,
          cue: 'Drive up the hill with quick steps and tall posture.',
          intervalIndex: index + 1,
        },
        {
          kind: 'recovery' as const,
          label: `Walk/Jog ${index + 1}`,
          durationSeconds: 90,
          cue: 'Recover on the way down before the next climb.',
          intervalIndex: index + 1,
        },
      ]).flat(),
    ],
  }),
  createIntervalPlan({
    id: 'preset-ladder-builder',
    source: 'preset',
    name: 'Ladder Builder',
    description:
      'A climb-and-descend ladder that teaches pace control as the reps lengthen and then tighten back up.',
    benefit:
      'Blends speed control and endurance by forcing you to change gears without losing composure.',
    originLabel: 'Inspired by Runner’s World ladder sessions and common track pyramids.',
    tags: ['ladder', 'pace-control', 'endurance'],
    steps: [
      { kind: 'warmup', label: 'Warm-up', durationSeconds: 480, cue: 'Open the legs before the ladder begins.' },
      {
        kind: 'work',
        label: 'Work 1',
        durationSeconds: 60,
        cue: 'Start controlled and quick.',
        intervalIndex: 1,
      },
      {
        kind: 'recovery',
        label: 'Break 1',
        durationSeconds: 60,
        cue: 'Reset for the next step up.',
        intervalIndex: 1,
      },
      {
        kind: 'work',
        label: 'Work 2',
        durationSeconds: 120,
        cue: 'Hold the effort a little longer.',
        intervalIndex: 2,
      },
      {
        kind: 'recovery',
        label: 'Break 2',
        durationSeconds: 90,
        cue: 'Stay relaxed while the pace comes back down.',
        intervalIndex: 2,
      },
      {
        kind: 'work',
        label: 'Work 3',
        durationSeconds: 180,
        cue: 'This is the longest rep. Stay smooth, not frantic.',
        intervalIndex: 3,
      },
      {
        kind: 'recovery',
        label: 'Break 3',
        durationSeconds: 120,
        cue: 'Recover enough to hit the way back down with quality.',
        intervalIndex: 3,
      },
      {
        kind: 'work',
        label: 'Work 4',
        durationSeconds: 120,
        cue: 'Shorter again. Let the cadence rise.',
        intervalIndex: 4,
      },
      {
        kind: 'recovery',
        label: 'Break 4',
        durationSeconds: 90,
        cue: 'One more controlled reset.',
        intervalIndex: 4,
      },
      {
        kind: 'work',
        label: 'Work 5',
        durationSeconds: 60,
        cue: 'Finish sharp and clean.',
        intervalIndex: 5,
      },
    ],
  }),
];
