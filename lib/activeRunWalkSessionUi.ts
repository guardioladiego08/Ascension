import type { ActiveRunWalkSession } from '@/lib/activeRunWalkSessionStore';
import {
  getSessionLabelFromMode,
  isCyclingActivity,
} from '@/lib/cardio/activityTypes';
import { getRunWalkElapsedSeconds } from '@/lib/runWalkSessionClock';

export type ActiveSessionIconName =
  | 'barbell-outline'
  | 'map-outline'
  | 'walk-outline'
  | 'bicycle-outline';

export function getActiveSessionElapsedSeconds(
  session: ActiveRunWalkSession,
  nowMs = Date.now()
): number {
  if (session.phase === 'running' && session.clock) {
    return getRunWalkElapsedSeconds(session.clock, nowMs);
  }

  if (session.kind === 'outdoor') {
    return session.elapsedSeconds;
  }

  if (session.kind === 'indoor') {
    return session.elapsedS;
  }

  return session.seconds;
}

export function getActiveSessionDistanceMeters(
  session: ActiveRunWalkSession
): number | null {
  if (session.kind === 'strength') {
    return null;
  }

  return session.kind === 'outdoor' ? session.distanceMeters : session.distanceM;
}

export function getActiveSessionStatusText(session: ActiveRunWalkSession): string {
  return session.phase === 'running' ? 'Live session' : 'Paused session';
}

export function getActiveSessionActivityLabel(session: ActiveRunWalkSession): string {
  if (session.kind === 'strength') {
    return 'Strength Workout';
  }

  if (session.kind === 'outdoor') {
    if (session.sessionVariant === 'interval') {
      return 'Interval Run';
    }
    return titleCaseLabel(getSessionLabelFromMode(session.mode));
  }

  if (session.sessionVariant === 'interval') {
    return 'Indoor Interval Run';
  }

  return titleCaseLabel(getSessionLabelFromMode(session.mode));
}

export function getActiveSessionIconName(
  session: ActiveRunWalkSession
): ActiveSessionIconName {
  if (session.kind === 'strength') {
    return 'barbell-outline';
  }

  if (isCyclingActivity(session.mode)) {
    return 'bicycle-outline';
  }

  return session.kind === 'outdoor' ? 'map-outline' : 'walk-outline';
}

function titleCaseLabel(value: string) {
  return value.replace(/\b\w/g, (char) => char.toUpperCase());
}
