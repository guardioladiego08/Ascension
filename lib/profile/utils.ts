import type { Profile } from './types';

export function getBestDisplayName(p: Profile): string {
  const preferred = (p.preferred_name ?? '').trim();
  if (preferred) return preferred;

  const display = (p.display_name ?? '').trim();
  if (display) return display;

  const firstLast = [p.first_name, p.last_name].filter(Boolean).join(' ').trim();
  if (firstLast) return firstLast;

  return p.username;
}
