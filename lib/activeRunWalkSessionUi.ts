import type { ActiveRunWalkSession } from '@/lib/activeRunWalkSessionStore';
import { getRunWalkElapsedSeconds } from '@/lib/runWalkSessionClock';

export type ActiveSessionIconName = 'barbell-outline' | 'map-outline' | 'walk-outline';

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
    return session.mode === 'outdoor_walk' ? 'Outdoor Walk' : 'Outdoor Run';
  }

  return session.mode === 'indoor_walk' ? 'Indoor Walk' : 'Indoor Run';
}

export function getActiveSessionIconName(
  session: ActiveRunWalkSession
): ActiveSessionIconName {
  if (session.kind === 'strength') {
    return 'barbell-outline';
  }

  return session.kind === 'outdoor' ? 'map-outline' : 'walk-outline';
}
