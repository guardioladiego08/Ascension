export type LatLng = { lat: number; lng: number };

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
