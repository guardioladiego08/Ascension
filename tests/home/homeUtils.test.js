import {
  cardioTargetMeters,
  clamp01,
  combineProgress,
  formatDistanceValue,
  formatMinutes,
  formatWeightValue,
  friendlyDateLabel,
  getDaySegment,
  isRunWalkType,
  strengthTargetKg,
  toProgress,
} from '@/app/(tabs)/home/utils';

describe('home utils', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('clamps progress values and handles invalid numbers', () => {
    expect(clamp01(-1)).toBe(0);
    expect(clamp01(0.35)).toBe(0.35);
    expect(clamp01(3)).toBe(1);
    expect(clamp01(Number.NaN)).toBe(0);
  });

  it('formats minutes, distance, and weight for the home cards', () => {
    expect(formatMinutes(0)).toBe('0 min');
    expect(formatMinutes(45)).toBe('45 min');
    expect(formatMinutes(130)).toBe('2h 10m');

    expect(formatDistanceValue(3218.688, 'mi')).toBe('2.0 mi');
    expect(formatDistanceValue(2500, 'km')).toBe('2.5 km');

    expect(formatWeightValue(100, 'kg')).toBe('100 kg');
    expect(formatWeightValue(100, 'lb')).toBe('220 lb');
  });

  it('derives the day segment from local time', () => {
    jest.useFakeTimers();

    jest.setSystemTime(new Date('2025-04-02T09:00:00'));
    expect(getDaySegment()).toBe('morning');

    jest.setSystemTime(new Date('2025-04-02T15:00:00'));
    expect(getDaySegment()).toBe('afternoon');

    jest.setSystemTime(new Date('2025-04-02T20:00:00'));
    expect(getDaySegment()).toBe('evening');
  });

  it('combines goal progress and converts configured targets', () => {
    expect(toProgress(40, 80)).toBe(0.5);
    expect(toProgress(40, 0)).toBeNull();

    expect(combineProgress([0.2, null, 0.8], 'and')).toBeCloseTo(0.5);
    expect(combineProgress([0.2, null, 0.8], 'or')).toBe(0.8);
    expect(combineProgress([null, null], 'and')).toBe(0);

    expect(cardioTargetMeters({ cardio_distance: 5, cardio_distance_unit: 'km' })).toBe(5000);
    expect(cardioTargetMeters({ cardio_distance: 3, cardio_distance_unit: 'mi' })).toBeCloseTo(
      4828.032
    );

    expect(strengthTargetKg({ strength_volume_min: 220, strength_volume_unit: 'lb' })).toBeCloseTo(
      99.7903,
      3
    );
    expect(strengthTargetKg({ strength_volume_min: 150, strength_volume_unit: 'kg' })).toBe(150);
  });

  it('recognizes run and walk activity types and formats friendly dates', () => {
    expect(isRunWalkType('outdoor_run')).toBe(true);
    expect(isRunWalkType('Walk')).toBe(true);
    expect(isRunWalkType('elliptical')).toBe(false);

    expect(friendlyDateLabel('not-a-date')).toBe('not-a-date');
    expect(friendlyDateLabel('2025-04-02')).toContain('Apr');
  });
});
