import { supabase } from '@/lib/supabase';

export type RoutePreviewPoint = {
  x: number;
  y: number;
};

type OutdoorSampleRow = {
  session_id: string;
  lat: number | null;
  lon: number | null;
  ts: string | null;
};

type RawRoutePoint = {
  lat: number;
  lon: number;
};

const DEFAULT_MAX_POINTS = 48;
const PREVIEW_INSET = 0.1;

const routePreviewCache = new Map<string, RoutePreviewPoint[] | null>();

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function dedupeConsecutive(points: RawRoutePoint[]) {
  if (points.length < 2) return points;

  const out: RawRoutePoint[] = [points[0]];

  for (let index = 1; index < points.length; index += 1) {
    const point = points[index];
    const prev = out[out.length - 1];
    if (point.lat === prev.lat && point.lon === prev.lon) continue;
    out.push(point);
  }

  return out;
}

function downsamplePoints(points: RawRoutePoint[], maxPoints: number) {
  if (points.length <= maxPoints) return points;
  if (maxPoints <= 2) return [points[0], points[points.length - 1]];

  const sampled: RawRoutePoint[] = [];
  const lastIndex = points.length - 1;
  const step = lastIndex / (maxPoints - 1);

  for (let index = 0; index < maxPoints; index += 1) {
    const sampleIndex = Math.round(index * step);
    sampled.push(points[clamp(sampleIndex, 0, lastIndex)]);
  }

  return dedupeConsecutive(sampled);
}

export function buildRoutePreviewPoints(
  rawPoints: RawRoutePoint[],
  maxPoints = DEFAULT_MAX_POINTS
): RoutePreviewPoint[] | null {
  const cleaned = dedupeConsecutive(
    rawPoints.filter((point) => isFiniteNumber(point.lat) && isFiniteNumber(point.lon))
  );

  if (cleaned.length < 2) return null;

  const sampled = downsamplePoints(cleaned, Math.max(8, maxPoints));

  let minLat = sampled[0].lat;
  let maxLat = sampled[0].lat;
  let minLon = sampled[0].lon;
  let maxLon = sampled[0].lon;

  for (const point of sampled) {
    if (point.lat < minLat) minLat = point.lat;
    if (point.lat > maxLat) maxLat = point.lat;
    if (point.lon < minLon) minLon = point.lon;
    if (point.lon > maxLon) maxLon = point.lon;
  }

  const centerLat = (minLat + maxLat) / 2;
  const centerLon = (minLon + maxLon) / 2;
  const spanLat = maxLat - minLat;
  const spanLon = maxLon - minLon;
  const span = Math.max(spanLat, spanLon, Number.EPSILON);
  const usable = 1 - PREVIEW_INSET * 2;

  const normalized = sampled.map((point) => ({
    x: clamp(0.5 + ((point.lon - centerLon) / span) * usable, PREVIEW_INSET, 1 - PREVIEW_INSET),
    y: clamp(0.5 - ((point.lat - centerLat) / span) * usable, PREVIEW_INSET, 1 - PREVIEW_INSET),
  }));

  return dedupeConsecutive(
    normalized.map((point) => ({
      lat: Number(point.y.toFixed(4)),
      lon: Number(point.x.toFixed(4)),
    }))
  ).map((point) => ({ x: point.lon, y: point.lat }));
}

async function loadRoutePreviewMap(sessionIds: string[]) {
  if (sessionIds.length === 0) return new Map<string, RoutePreviewPoint[] | null>();

  const uniqueSessionIds = Array.from(new Set(sessionIds.map((value) => String(value ?? '').trim()).filter(Boolean)));
  const missing = uniqueSessionIds.filter((sessionId) => !routePreviewCache.has(sessionId));

  if (missing.length > 0) {
    const { data, error } = await supabase
      .schema('run_walk')
      .from('outdoor_samples')
      .select('session_id, lat, lon, ts')
      .in('session_id', missing)
      .order('session_id', { ascending: true })
      .order('ts', { ascending: true });

    if (error) {
      console.warn('[routePreview] failed to load outdoor samples', error);
      for (const sessionId of missing) {
        routePreviewCache.set(sessionId, null);
      }
    } else {
      const rows = (data ?? []) as OutdoorSampleRow[];
      const rowsBySession = new Map<string, RawRoutePoint[]>();

      for (const row of rows) {
        const sessionId = String(row.session_id ?? '').trim();
        if (!sessionId || !isFiniteNumber(row.lat) || !isFiniteNumber(row.lon)) continue;
        const bucket = rowsBySession.get(sessionId) ?? [];
        bucket.push({ lat: row.lat, lon: row.lon });
        rowsBySession.set(sessionId, bucket);
      }

      for (const sessionId of missing) {
        routePreviewCache.set(sessionId, buildRoutePreviewPoints(rowsBySession.get(sessionId) ?? []));
      }
    }
  }

  const previews = new Map<string, RoutePreviewPoint[] | null>();
  for (const sessionId of uniqueSessionIds) {
    previews.set(sessionId, routePreviewCache.get(sessionId) ?? null);
  }
  return previews;
}

export async function fetchOutdoorRoutePreview(sessionId: string) {
  const previewMap = await loadRoutePreviewMap([sessionId]);
  return previewMap.get(sessionId) ?? null;
}

export async function fetchOutdoorRoutePreviewMap(sessionIds: string[]) {
  return loadRoutePreviewMap(sessionIds);
}
