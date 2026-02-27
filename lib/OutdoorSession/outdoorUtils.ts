export type LatLng = { lat: number; lng: number };
export type DistanceUnit = 'mi' | 'km';

const M_PER_MI = 1609.344;
const M_PER_KM = 1000;

export function haversineMeters(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);

  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);

  const h =
    sinDLat * sinDLat +
    Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;

  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${mm}:${String(ss).padStart(2, '0')}`;
}

export function formatKm(distanceMeters: number): string {
  const km = Math.max(0, distanceMeters) / 1000;
  return km.toFixed(2);
}

export function formatDistance(
  distanceMeters: number,
  unit: DistanceUnit = 'km'
): string {
  const safe = Math.max(0, distanceMeters);
  const value = unit === 'mi' ? safe / M_PER_MI : safe / M_PER_KM;
  return `${value.toFixed(2)} ${unit}`;
}

// pace = seconds per km
export function paceSecPerKm(distanceMeters: number, elapsedSeconds: number): number | null {
  if (distanceMeters < 10 || elapsedSeconds < 5) return null;
  const km = distanceMeters / 1000;
  if (km <= 0) return null;
  return elapsedSeconds / km;
}

export function formatPace(secPerKm: number | null): string {
  if (!secPerKm || !isFinite(secPerKm)) return '--:--/km';
  const mm = Math.floor(secPerKm / 60);
  const ss = Math.round(secPerKm % 60);
  return `${mm}:${String(ss).padStart(2, '0')}/km`;
}

export function paceSecPerUnit(
  distanceMeters: number,
  elapsedSeconds: number,
  unit: DistanceUnit = 'km'
): number | null {
  const secPerKm = paceSecPerKm(distanceMeters, elapsedSeconds);
  if (!secPerKm || !Number.isFinite(secPerKm)) return null;
  return unit === 'mi' ? secPerKm * 1.609344 : secPerKm;
}

export function formatPaceForUnit(
  secPerKm: number | null,
  unit: DistanceUnit = 'km'
): string {
  if (!secPerKm || !Number.isFinite(secPerKm)) return `--:--/${unit}`;
  const secPerUnit = unit === 'mi' ? secPerKm * 1.609344 : secPerKm;
  const mm = Math.floor(secPerUnit / 60);
  const ss = Math.round(secPerUnit % 60);
  return `${mm}:${String(ss).padStart(2, '0')}/${unit}`;
}
