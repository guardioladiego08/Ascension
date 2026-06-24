export type IndoorCardioMode = 'indoor_run' | 'indoor_walk' | 'indoor_cycle';
export type OutdoorCardioMode = 'outdoor_run' | 'outdoor_walk' | 'outdoor_cycle';
export type CardioMode = IndoorCardioMode | OutdoorCardioMode;

export type OutdoorCardioActivityType = 'run' | 'walk' | 'ride';
export type SocialCardioActivityType = 'run' | 'walk' | 'ride' | 'other';
export type CardioActivityKind = 'run' | 'walk' | 'cycle' | 'other';
export type CardioSource = 'indoor' | 'outdoor';

export function getCardioActivityKind(value?: string | null): CardioActivityKind {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (!normalized) return 'other';
  if (normalized.includes('walk')) return 'walk';
  if (normalized.includes('run')) return 'run';
  if (
    normalized.includes('cycle') ||
    normalized.includes('ride') ||
    normalized.includes('bike')
  ) {
    return 'cycle';
  }
  return 'other';
}

export function isSupportedCardioActivity(value?: string | null) {
  return getCardioActivityKind(value) !== 'other';
}

export function isRunningActivity(value?: string | null) {
  return getCardioActivityKind(value) === 'run';
}

export function isWalkingActivity(value?: string | null) {
  return getCardioActivityKind(value) === 'walk';
}

export function isCyclingActivity(value?: string | null) {
  return getCardioActivityKind(value) === 'cycle';
}

export function getIndoorCardioTitle(mode: IndoorCardioMode) {
  switch (mode) {
    case 'indoor_walk':
      return 'INDOOR WALK';
    case 'indoor_cycle':
      return 'INDOOR CYCLING';
    case 'indoor_run':
    default:
      return 'INDOOR RUN';
  }
}

export function getIndoorCardioSummaryTitle(mode: IndoorCardioMode) {
  switch (mode) {
    case 'indoor_walk':
      return 'INDOOR WALK SUMMARY';
    case 'indoor_cycle':
      return 'INDOOR CYCLING SUMMARY';
    case 'indoor_run':
    default:
      return 'INDOOR RUN SUMMARY';
  }
}

export function getOutdoorCardioTitle(activityType: OutdoorCardioActivityType) {
  switch (activityType) {
    case 'walk':
      return 'Outdoor Walk';
    case 'ride':
      return 'Outdoor Cycling';
    case 'run':
    default:
      return 'Outdoor Run';
  }
}

export function getOutdoorModeFromActivityType(
  activityType: OutdoorCardioActivityType
): OutdoorCardioMode {
  switch (activityType) {
    case 'walk':
      return 'outdoor_walk';
    case 'ride':
      return 'outdoor_cycle';
    case 'run':
    default:
      return 'outdoor_run';
  }
}

export function getOutdoorActivityTypeFromMode(
  mode: OutdoorCardioMode
): OutdoorCardioActivityType {
  switch (mode) {
    case 'outdoor_walk':
      return 'walk';
    case 'outdoor_cycle':
      return 'ride';
    case 'outdoor_run':
    default:
      return 'run';
  }
}

export function getSessionLabelFromMode(mode: CardioMode) {
  switch (mode) {
    case 'indoor_walk':
      return 'indoor walk';
    case 'indoor_cycle':
      return 'indoor cycling';
    case 'indoor_run':
      return 'indoor run';
    case 'outdoor_walk':
      return 'outdoor walk';
    case 'outdoor_cycle':
      return 'outdoor cycling';
    case 'outdoor_run':
    default:
      return 'outdoor run';
  }
}

export function formatCardioActivityTypeLabel(
  activityType: string,
  source: CardioSource
) {
  const prefix = source === 'indoor' ? 'Indoor' : 'Outdoor';
  const kind = getCardioActivityKind(activityType);

  if (kind === 'walk') return `${prefix} walk`;
  if (kind === 'run') return `${prefix} run`;
  if (kind === 'cycle') return `${prefix} cycling`;
  return `${prefix} session`;
}

export function toSocialCardioActivityType(value?: string | null): SocialCardioActivityType {
  const kind = getCardioActivityKind(value);
  if (kind === 'walk') return 'walk';
  if (kind === 'run') return 'run';
  if (kind === 'cycle') return 'ride';
  return 'other';
}
