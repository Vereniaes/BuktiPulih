// Todo:
// -> Read mapped cover and nearby building geometry from loaded vector tiles.
// -> Bound geometry work and keep missing map data unknown.

// --- Loaded map context ---
import type { Geometry, Position } from "geojson";
import type { ExplorerPoint } from "@/types/explorer-map";

export interface ContextFeature { id?: string | number; geometry: Geometry; properties: Record<string, unknown> | null; }
export interface MappedContext {
  cover: string | null;
  residential: boolean;
  buildingDistance: number | null;
  limited: boolean;
}
interface Budget { remaining: number; limited: boolean; }
const MAX_FEATURES = 3000, MAX_VERTICES = 60000;
const metres = 111320;

function ringsOf(feature: ContextFeature): Position[][][] {
  return feature.geometry.type === "Polygon" ? [feature.geometry.coordinates]
    : feature.geometry.type === "MultiPolygon" ? feature.geometry.coordinates : [];
}
function consume(budget: Budget) {
  if (budget.remaining-- > 0) return true;
  budget.limited = true; return false;
}
function inRing(point: ExplorerPoint, ring: Position[], budget: Budget): boolean | null {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    if (!consume(budget)) return null;
    const a = ring[i], b = ring[j];
    if ((a[1] > point[1]) !== (b[1] > point[1]) && point[0] < (b[0] - a[0]) * (point[1] - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside;
}
/** Check physical containment, including holes, within a finite vertex budget. */
export function containsLocation(point: ExplorerPoint, polygons: Position[][][], budget: Budget = { remaining: MAX_VERTICES, limited: false }): boolean | null {
  for (const polygon of polygons) {
    const outer = polygon[0] ? inRing(point, polygon[0], budget) : false;
    if (outer === null) return null;
    if (!outer) continue;
    let hole = false;
    for (const ring of polygon.slice(1)) {
      const inner = inRing(point, ring, budget);
      if (inner === null) return null;
      if (inner) { hole = true; break; }
    }
    if (!hole) return true;
  }
  return false;
}
function footprintDistance(point: ExplorerPoint, polygons: Position[][][], budget: Budget): number | null {
  const inside = containsLocation(point, polygons, budget);
  if (inside === null) return null;
  if (inside) return 0;
  const longitudeScale = metres * Math.cos(point[1] * Math.PI / 180);
  let nearest = Infinity;
  for (const polygon of polygons) for (const ring of polygon) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      if (!consume(budget)) return Number.isFinite(nearest) ? nearest : null;
      const ax = (ring[j][0] - point[0]) * longitudeScale, ay = (ring[j][1] - point[1]) * metres;
      const bx = (ring[i][0] - point[0]) * longitudeScale, by = (ring[i][1] - point[1]) * metres;
      const dx = bx - ax, dy = by - ay, length = dx * dx + dy * dy;
      const t = length ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / length)) : 0;
      nearest = Math.min(nearest, Math.hypot(ax + t * dx, ay + t * dy));
    }
  }
  return Number.isFinite(nearest) ? nearest : null;
}
function unique(features: ContextFeature[], budget: Budget): ContextFeature[] {
  if (features.length > MAX_FEATURES) budget.limited = true;
  const seen = new Set<string>();
  return features.slice(0, MAX_FEATURES).filter(feature => {
    const polygons = ringsOf(feature), ring = polygons[0]?.[0];
    if (!ring?.length) return false;
    const key = [feature.id ?? feature.properties?.osm_id ?? "", feature.properties?.class ?? "", ring.length, ring[0].join(","), ring.at(-2)?.join(",")].join(":");
    if (seen.has(key)) return false;
    seen.add(key); return true;
  });
}

/** Purpose: Summarize loaded OSM geometry. Input: point and tile features. Output: mapped context, with unknown values kept null. */
export function getTerrainContext(point: ExplorerPoint, features: { landcover: ContextFeature[]; landuse: ContextFeature[]; building: ContextFeature[] }): MappedContext {
  const budget: Budget = { remaining: MAX_VERTICES, limited: false };
  const result: MappedContext = { cover: null, residential: false, buildingDistance: null, limited: false };
  for (const feature of unique(features.landcover, budget)) {
    if (containsLocation(point, ringsOf(feature), budget)) {
      result.cover = String(feature.properties?.subclass || feature.properties?.class || ""); break;
    }
  }
  for (const feature of unique(features.landuse, budget)) {
    if (feature.properties?.class === "residential" && containsLocation(point, ringsOf(feature), budget)) { result.residential = true; break; }
  }
  for (const feature of unique(features.building, budget)) {
    if (budget.remaining <= 0) { budget.limited = true; break; }
    const distance = footprintDistance(point, ringsOf(feature), budget);
    if (distance !== null && distance <= 5000) result.buildingDistance = Math.min(result.buildingDistance ?? Infinity, distance);
  }
  result.limited = budget.limited;
  return result;
}
// --- end of Loaded map context ---
